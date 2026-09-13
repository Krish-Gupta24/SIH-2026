"""EnergyPlus IDF generator deriving 3D building geometry and multi-layer constructions from canonical ShelterModel."""

import math
import re
from typing import Dict, Any, List, Tuple, Optional, Union
from pathlib import Path

from simulation.materials.material import (
    Material,
    Construction,
    ConstructionLayer,
    MaterialStatus,
)
from simulation.materials.database import material_db
from simulation.materials.glazing import glazing_db, GlazingDefinition, FrameDefinition
from simulation.validation.opening_validator import OpeningValidator
from simulation.validation.ventilation_validator import VentilationValidator
from simulation.validation.thermal_mass_validator import ThermalMassValidator
from simulation.results.output_registry import OutputVariableRegistry


class EnergyPlusIDFGenerator:
    """Generates valid, syntax-compliant EnergyPlus IDF models from canonical ShelterModel representations."""

    def __init__(self, engine_version: str = "24.1"):
        parts = engine_version.split(".")
        self.version_str = f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else "24.1"
        self.last_envelope_constructions: Dict[str, Construction] = {}
        self.fallback_warnings: List[str] = []
        self.envelope_construction_metadata: Dict[str, Any] = {}

    def generate(
        self,
        shelter_model: Optional[Dict[str, Any]] = None,
        run_period_days: Optional[int] = 1,
        start_month: int = 1,
        start_day: int = 1,
        timesteps_per_hour: int = 4,
        *args,
        **kwargs,
    ) -> str:
        """Generate and return raw EnergyPlus IDF content string."""
        import tempfile
        import os

        # Support positional arguments if passed
        model = shelter_model
        if model is None and len(args) > 0:
            model = args[0]
        if len(args) > 1:
            run_period_days = args[1]
        if len(args) > 2:
            start_month = args[2]
        if len(args) > 3:
            start_day = args[3]
        if len(args) > 4:
            timesteps_per_hour = args[4]

        fd, temp_path = tempfile.mkstemp(suffix=".idf")
        os.close(fd)
        try:
            self.generate_idf(
                shelter=model,
                output_path=temp_path,
                run_period_days=run_period_days,
                start_month=start_month,
                start_day=start_day,
                timestep=timesteps_per_hour,
            )
            with open(temp_path, "r", encoding="utf-8") as f:
                return f.read()
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    @staticmethod
    def calculate_geometry_properties(
        length: float,
        width: float,
        height: float,
        roof_type: str = "Flat",
        roof_angle: float = 0.0,
    ) -> Dict[str, float]:
        """Compute exact theoretical geometry attributes for verification."""
        roof_type_norm = roof_type.strip().capitalize()
        rad = math.radians(roof_angle)

        floor_area = length * width
        base_wall_area = 2 * (length * height) + 2 * (width * height)

        if roof_type_norm == "Flat" or roof_angle <= 0.0:
            roof_area = length * width
            wall_area = base_wall_area
            volume = length * width * height
            peak_height = height
        elif roof_type_norm == "Shed":
            delta_h = width * math.tan(rad)
            slope_len = width / math.cos(rad)
            roof_area = length * slope_len
            # North wall rises by delta_h, two side walls are trapezoids with avg rise delta_h / 2
            wall_area = (
                (length * height)  # South wall
                + (length * (height + delta_h))  # North wall
                + 2 * (width * (height + 0.5 * delta_h))  # East & West walls
            )
            volume = length * width * (height + 0.5 * delta_h)
            peak_height = height + delta_h
        elif roof_type_norm == "Gable":
            delta_h = 0.5 * width * math.tan(rad)
            slope_len = (0.5 * width) / math.cos(rad)
            roof_area = 2 * (length * slope_len)
            # North & South walls height = H; East & West walls have gable triangles added
            wall_area = (
                2 * (length * height)
                + 2 * (width * height + 0.5 * width * delta_h)
            )
            volume = length * width * (height + 0.5 * delta_h)
            peak_height = height + delta_h
        else:
            raise ValueError(f"Unsupported roof type: '{roof_type}'. Must be 'Flat', 'Shed', or 'Gable'.")

        mean_ceiling_height = volume / max(0.001, floor_area)

        return {
            "floor_area": round(floor_area, 4),
            "roof_area": round(roof_area, 4),
            "wall_area": round(wall_area, 4),
            "total_envelope_area": round(floor_area + roof_area + wall_area, 4),
            "volume": round(volume, 4),
            "peak_height": round(peak_height, 4),
            "mean_ceiling_height": round(mean_ceiling_height, 4),
        }

    def _parse_construction(
        self,
        raw_val: Any,
        surface_type: str,
        default_id: str,
        default_name: str,
        surface_key: str = "surface",
    ) -> Tuple[Construction, bool]:
        """Parse or construct a Construction object with zero silent fallback.

        Fallback is ONLY allowed when no user value (None or empty dict) was provided.
        Returns a tuple of (Construction, is_fallback: bool).
        """
        stype_upper = surface_type.upper()

        def _get_fallback_default() -> Construction:
            if stype_upper == "WALL":
                return material_db.build_construction(
                    construction_id="default-insulated-earth-wall",
                    name="Default Insulated Rammed Earth Wall",
                    surface_type="WALL",
                    layer_specs=[
                        ("mat-eps-insulation", 0.10),
                        ("mat-rammed-earth", 0.30),
                    ],
                )
            elif stype_upper == "ROOF":
                return material_db.build_construction(
                    construction_id="default-insulated-metal-roof",
                    name="Default Insulated Metal Roof",
                    surface_type="ROOF",
                    layer_specs=[
                        ("mat-galvanized-steel", 0.005),
                        ("mat-eps-insulation", 0.12),
                    ],
                )
            elif stype_upper == "FLOOR":
                return material_db.build_construction(
                    construction_id="default-concrete-floor",
                    name="Default Concrete Floor Slab",
                    surface_type="FLOOR",
                    layer_specs=[
                        ("mat-concrete-slab", 0.15),
                    ],
                )
            elif stype_upper == "DOOR":
                return material_db.build_construction(
                    construction_id="default-insulated-door",
                    name="Default Insulated Alpine Shelter Door",
                    surface_type="DOOR",
                    layer_specs=[
                        ("mat-himalayan-timber", 0.025),
                        ("mat-eps-insulation", 0.040),
                        ("mat-himalayan-timber", 0.025),
                    ],
                )
            else:
                raise ValueError(f"Unknown surface type: '{surface_type}'")

        # Case 1: No user value provided (None or empty dictionary)
        if raw_val is None or (isinstance(raw_val, dict) and not raw_val):
            warning = f"No user construction provided for surface '{surface_key}'; using fallback default '{default_id}' ({default_name})."
            self.fallback_warnings.append(warning)
            return _get_fallback_default(), True

        # Case 2: Already a Construction instance
        if isinstance(raw_val, Construction):
            return raw_val, False

        # Case 3: String reference (Preset construction name, ID, or single Material ID)
        if isinstance(raw_val, str):
            preset = material_db.get_preset_construction(raw_val, surface_type)
            if preset:
                return preset, False
            # Check if it is a single material ID
            try:
                mat = material_db.get(raw_val)
                th = 0.005 if stype_upper == "ROOF" else 0.15
                return material_db.build_construction(
                    construction_id=f"const-{raw_val}",
                    name=f"Monolithic {mat.name}",
                    surface_type=surface_type,
                    layer_specs=[(mat, th)],
                ), False
            except KeyError:
                raise ValueError(
                    f"Unknown construction or material ID '{raw_val}' specified for '{surface_key}'. "
                    "Silent fallback is prohibited."
                )

        # Case 4: Dictionary specification
        if isinstance(raw_val, dict):
            cid = raw_val.get("id") or raw_val.get("construction_id") or raw_val.get("constructionId")
            cname = raw_val.get("name") or cid or default_name
            stype = raw_val.get("surface_type") or surface_type

            # 4a. Explicit layers list
            if "layers" in raw_val and isinstance(raw_val["layers"], list) and len(raw_val["layers"]) > 0:
                layer_specs: List[Tuple[Union[str, Material], float]] = []
                for idx, lyr in enumerate(raw_val["layers"]):
                    if isinstance(lyr, ConstructionLayer):
                        layer_specs.append((lyr.material, lyr.thickness))
                    elif isinstance(lyr, dict):
                        mat_spec = lyr.get("material") or lyr.get("material_id") or lyr.get("materialId")
                        if not mat_spec:
                            raise ValueError(
                                f"Layer {idx + 1} of '{surface_key}' is missing material specification. "
                                "Silent fallback is prohibited."
                            )
                        thickness = float(lyr.get("thickness", 0.1))
                        if thickness <= 0.0:
                            raise ValueError(
                                f"Layer {idx + 1} of '{surface_key}' specifies non-positive thickness {thickness}m."
                            )

                        if isinstance(mat_spec, dict):
                            m_name = mat_spec.get("name", f"CustomMat_{cid or surface_key}_{idx + 1}")
                            m_id = mat_spec.get("id") or f"mat-custom-{re.sub(r'[^a-zA-Z0-9_]', '_', m_name.lower())}"
                            m_obj = material_db.create_custom_material(
                                name=m_name,
                                density=float(mat_spec["density"]),
                                thermal_conductivity=float(mat_spec.get("thermal_conductivity") or mat_spec.get("conductivity")),
                                specific_heat=float(mat_spec.get("specific_heat")),
                                source=mat_spec.get("source", "User Specification"),
                                provenance=mat_spec.get("provenance", "User Defined"),
                                material_id=m_id,
                                thermal_absorptance=float(mat_spec.get("thermal_absorptance", 0.9)),
                                solar_absorptance=float(mat_spec.get("solar_absorptance", 0.7)),
                                visible_absorptance=float(mat_spec.get("visible_absorptance", 0.7)),
                                status=MaterialStatus.USER_DEFINED,
                            )
                            layer_specs.append((m_obj, thickness))
                        elif isinstance(mat_spec, Material):
                            layer_specs.append((mat_spec, thickness))
                        elif isinstance(mat_spec, str):
                            try:
                                m_obj = material_db.get(mat_spec)
                                layer_specs.append((m_obj, thickness))
                            except KeyError:
                                raise ValueError(
                                    f"Material '{mat_spec}' in layer {idx + 1} of '{surface_key}' not found in database. "
                                    "Silent fallback is prohibited."
                                )
                        else:
                            raise ValueError(f"Unrecognized material specification in layer {idx + 1} of '{surface_key}': {lyr}")
                    else:
                        raise ValueError(f"Invalid layer specification in '{surface_key}': {lyr}")

                return material_db.build_construction(
                    construction_id=cid or default_id,
                    name=cname,
                    surface_type=stype,
                    layer_specs=layer_specs,
                ), False

            # 4b. Named preset ID in dictionary without inline layers list
            elif cid:
                preset = material_db.get_preset_construction(cid, surface_type)
                if preset:
                    return preset, False
                # Try single material lookup
                try:
                    mat = material_db.get(cid)
                    th = 0.005 if stype_upper == "ROOF" else 0.15
                    return material_db.build_construction(
                        construction_id=f"const-{cid}",
                        name=f"Monolithic {mat.name}",
                        surface_type=surface_type,
                        layer_specs=[(mat, th)],
                    ), False
                except KeyError:
                    raise ValueError(
                        f"Unrecognized construction ID '{cid}' for '{surface_key}'. "
                        "Silent fallback is prohibited."
                    )
            else:
                warning = f"Empty construction dictionary provided for surface '{surface_key}'; using fallback default '{default_id}' ({default_name})."
                self.fallback_warnings.append(warning)
                return _get_fallback_default(), True

        # Case 5: Direct list of layers
        if isinstance(raw_val, list):
            return self._parse_construction(
                raw_val={"layers": raw_val},
                surface_type=surface_type,
                default_id=default_id,
                default_name=default_name,
                surface_key=surface_key,
            )

        raise ValueError(f"Invalid construction data type '{type(raw_val)}' for '{surface_key}'.")

    def resolve_envelope_constructions(
        self,
        shelter: Dict[str, Any],
        custom_constructions: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Construction]:
        """Resolve multi-layer constructions for all 6 envelope surfaces:
        north_wall, south_wall, east_wall, west_wall, roof, floor.
        Guarantees strict layer ordering outside-to-inside, supports per-wall
        distinct assemblies, and stores provenance and fallback warnings.
        """
        env = shelter.get("envelope", {})
        custom = custom_constructions or {}

        # Look for general or orientation-specific wall specifications
        general_wall_spec = (
            custom.get("walls")
            or env.get("walls")
            or shelter.get("envelopeWalls")
            or shelter.get("walls")
        )
        if isinstance(general_wall_spec, dict) and any(k in general_wall_spec for k in ("north", "south", "east", "west")):
            north_spec = custom.get("north_wall") or custom.get("north") or env.get("north_wall") or general_wall_spec.get("north")
            south_spec = custom.get("south_wall") or custom.get("south") or env.get("south_wall") or general_wall_spec.get("south")
            east_spec = custom.get("east_wall") or custom.get("east") or env.get("east_wall") or general_wall_spec.get("east")
            west_spec = custom.get("west_wall") or custom.get("west") or env.get("west_wall") or general_wall_spec.get("west")
        else:
            north_spec = custom.get("north_wall") or custom.get("north") or env.get("north_wall") or general_wall_spec
            south_spec = custom.get("south_wall") or custom.get("south") or env.get("south_wall") or general_wall_spec
            east_spec = custom.get("east_wall") or custom.get("east") or env.get("east_wall") or general_wall_spec
            west_spec = custom.get("west_wall") or custom.get("west") or env.get("west_wall") or general_wall_spec

        roof_spec = custom.get("roof") or env.get("roof") or shelter.get("roof")
        floor_spec = custom.get("floor") or env.get("floor") or shelter.get("floor")

        surface_specs = [
            ("north_wall", "NorthWall", "WALL", north_spec, "north-wall-const", "North Wall Construction"),
            ("south_wall", "SouthWall", "WALL", south_spec, "south-wall-const", "South Wall Construction"),
            ("east_wall", "EastWall", "WALL", east_spec, "east-wall-const", "East Wall Construction"),
            ("west_wall", "WestWall", "WALL", west_spec, "west-wall-const", "West Wall Construction"),
            ("roof", "RoofSurface", "ROOF", roof_spec, "roof-const", "Roof Construction"),
            ("floor", "FloorSurface", "FLOOR", floor_spec, "floor-const", "Floor Construction"),
        ]

        resolved: Dict[str, Construction] = {}
        self.envelope_construction_metadata = {}

        for role, surface_name, stype, spec, def_id, def_name in surface_specs:
            const, is_fallback = self._parse_construction(
                raw_val=spec,
                surface_type=stype,
                default_id=def_id,
                default_name=def_name,
                surface_key=role,
            )
            resolved[role] = const

            self.envelope_construction_metadata[role] = {
                "surface_role": role,
                "surface_name": surface_name,
                "surface_type": stype,
                "construction_id": const.id,
                "construction_name": const.name,
                "is_fallback": is_fallback,
                "total_thickness_m": round(const.total_thickness, 4),
                "u_value_w_m2k": round(const.u_value, 4),
                "r_value_m2k_w": round(const.total_r_value, 4),
                "layer_count": len(const.layers),
                "layers": [
                    {
                        "order": idx,
                        "position": "OUTSIDE" if idx == 0 else ("INSIDE" if idx == len(const.layers) - 1 else f"MIDDLE_{idx}"),
                        "material_id": lyr.material.id,
                        "material_name": lyr.material.name,
                        "category": lyr.material.category,
                        "thickness_m": round(lyr.thickness, 4),
                        "thermal_conductivity": round(lyr.material.thermal_conductivity, 4),
                        "density": round(lyr.material.density, 1),
                        "specific_heat": round(lyr.material.specific_heat, 1),
                        "thermal_absorptance": round(lyr.material.thermal_absorptance, 3),
                        "solar_absorptance": round(lyr.material.solar_absorptance, 3),
                        "source": lyr.material.source,
                        "provenance": lyr.material.provenance,
                        "status": lyr.material.status.value,
                    }
                    for idx, lyr in enumerate(const.layers)
                ],
            }

        # Resolve door constructions dynamically
        doors = (
            shelter.get("doors", [])
            or shelter.get("openings", {}).get("doors", [])
            or env.get("doors", [])
        )
        for idx, door in enumerate(doors):
            raw_wall = str(door.get("wall") or door.get("wall_id", "north")).strip().lower()
            wall_key = raw_wall.replace("wall_", "").replace("_wall", "")
            d_id = str(door.get("id") or f"Door_{wall_key}_{idx + 1}")
            sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', d_id)
            d_role = f"door_{sanitized_id}"
            d_spec = (
                door.get("construction")
                or door.get("construction_id")
                or door.get("layers")
                or custom.get("door")
                or custom.get("doors")
            )
            const, is_fallback = self._parse_construction(
                raw_val=d_spec,
                surface_type="DOOR",
                default_id="default_insulated_door",
                default_name="Default Insulated Alpine Shelter Door",
                surface_key=d_role,
            )
            resolved[d_role] = const
            self.envelope_construction_metadata[d_role] = {
                "surface_role": d_role,
                "surface_name": f"Door '{d_id}' ({host_wall_name if 'host_wall_name' in locals() else wall_key.capitalize()} Wall)",
                "surface_type": "DOOR",
                "construction_id": const.id,
                "construction_name": const.name,
                "is_fallback": is_fallback,
                "total_thickness_m": round(const.total_thickness, 4),
                "u_value_w_m2k": round(const.u_value, 4),
                "r_value_m2k_w": round(const.total_r_value, 4),
                "layer_count": len(const.layers),
                "layers": [
                    {
                        "order": l_idx,
                        "position": "OUTSIDE" if l_idx == 0 else ("INSIDE" if l_idx == len(const.layers) - 1 else f"MIDDLE_{l_idx}"),
                        "material_id": lyr.material.id,
                        "material_name": lyr.material.name,
                        "category": lyr.material.category,
                        "thickness_m": round(lyr.thickness, 4),
                        "thermal_conductivity": round(lyr.material.thermal_conductivity, 4),
                        "density": round(lyr.material.density, 1),
                        "specific_heat": round(lyr.material.specific_heat, 1),
                        "thermal_absorptance": round(lyr.material.thermal_absorptance, 3),
                        "solar_absorptance": round(lyr.material.solar_absorptance, 3),
                        "source": lyr.material.source,
                        "provenance": lyr.material.provenance,
                        "status": lyr.material.status.value,
                    }
                    for l_idx, lyr in enumerate(const.layers)
                ],
            }

        self.last_envelope_constructions = resolved
        return resolved

    def inspect_envelope(
        self,
        shelter: Dict[str, Any],
        custom_constructions: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Inspect and trace envelope construction mappings across all 6 surfaces."""
        self.resolve_envelope_constructions(shelter, custom_constructions)
        return {
            "surfaces": self.envelope_construction_metadata,
            "fallback_warnings": list(self.fallback_warnings),
            "has_fallbacks": len(self.fallback_warnings) > 0,
            "distinct_wall_constructions": len({
                self.envelope_construction_metadata[k]["construction_id"]
                for k in ("north_wall", "south_wall", "east_wall", "west_wall")
            }) > 1,
        }

    def format_envelope_inspection(
        self,
        shelter: Dict[str, Any],
        custom_constructions: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Format an ASCII engineering report tracing Surface -> Construction -> Layers -> Material properties."""
        data = self.inspect_envelope(shelter, custom_constructions)
        surfaces = data["surfaces"]
        warnings = data["fallback_warnings"]

        lines = [
            "=" * 80,
            "ENVELOPE CONSTRUCTION & THERMOPHYSICAL MATERIAL PROPERTY TRACE",
            "Trace: UI -> ShelterModel -> Construction -> Layer[] -> Material[] -> EnergyPlus",
            "=" * 80,
        ]

        if warnings:
            lines.append("FALLBACK WARNINGS DETECTED:")
            for w in warnings:
                lines.append(f"  [!] {w}")
            lines.append("-" * 80)

        for role, meta in surfaces.items():
            lines.extend([
                f"Surface: {meta['surface_name']} ({role})",
                f"  Construction ID:   {meta['construction_id']}",
                f"  Construction Name: {meta['construction_name']}",
                f"  Surface Type:      {meta['surface_type']}",
                f"  Fallback Applied:  {'YES (Default fallback)' if meta['is_fallback'] else 'NO (User specified)'}",
                f"  Total Thickness:   {meta['total_thickness_m']:.4f} m ({int(meta['total_thickness_m'] * 1000)} mm)",
                f"  Thermal U-Value:   {meta['u_value_w_m2k']:.4f} W/(m2-K)",
                f"  Thermal R-Value:   {meta['r_value_m2k_w']:.4f} (m2-K)/W",
                f"  Layer Count:       {meta['layer_count']} (Ordered Outside to Inside)",
            ])

            for lyr in meta["layers"]:
                pos_tag = f"[{lyr['position']}]"
                lines.extend([
                    f"    {pos_tag} Layer {lyr['order'] + 1}: {lyr['material_name']} ({lyr['material_id']})",
                    f"      Thickness:      {lyr['thickness_m']:.4f} m ({int(lyr['thickness_m'] * 1000)} mm)",
                    f"      Conductivity k: {lyr['thermal_conductivity']:.4f} W/(m-K)",
                    f"      Density rho:    {lyr['density']:.1f} kg/m3",
                    f"      Specific Heat:  {lyr['specific_heat']:.1f} J/(kg-K)",
                    f"      Absorptance:    Solar: {lyr['solar_absorptance']:.3f} | Thermal (Emissivity): {lyr['thermal_absorptance']:.3f}",
                    f"      Category:       {lyr['category']} | Status: {lyr['status']}",
                    f"      Source:         {lyr['source']} ({lyr['provenance']})",
                ])
            lines.append("-" * 80)

        lines.append("=" * 80)
        return "\n".join(lines)

    def generate_idf(
        self,
        shelter: Dict[str, Any],
        output_path: str,
        run_period_days: Optional[int] = None,
        start_month: int = 1,
        start_day: int = 1,
        end_month: Optional[int] = None,
        end_day: Optional[int] = None,
        timestep: int = 4,
        is_annual: bool = False,
        constructions: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Derive 3D geometry and verified multi-layer constructions from canonical ShelterModel and generate valid EnergyPlus IDF."""
        geom = shelter.get("geometry", {})
        length = float(geom.get("length", 6.0))
        width = float(geom.get("width", 4.0))
        height = float(geom.get("height", 3.0))
        orientation = float(geom.get("orientation", 0.0))
        roof_type = geom.get("roof_type", "Flat").strip().capitalize()
        roof_angle = float(geom.get("roof_angle", 0.0))

        loc = shelter.get("location", {})
        lat = float(loc.get("latitude", 34.15))
        lon = float(loc.get("longitude", 77.58))
        elevation = float(loc.get("elevation", 3500.0))
        loc_name = re.sub(r'[^a-zA-Z0-9_-]', '_', str(loc.get("region", "Leh_Ladakh_IND")))

        # Compute geometry properties
        props = self.calculate_geometry_properties(length, width, height, roof_type, roof_angle)
        volume = props["volume"]

        # Validate and resolve ventilation / infiltration parameters from canonical ShelterModel
        is_vent_valid, vent_errors = VentilationValidator.validate_ventilation(shelter)
        if not is_vent_valid:
            raise ValueError(f"Ventilation / Infiltration validation failed: {'; '.join(vent_errors)}")
        vent_params = VentilationValidator.resolve_ventilation(shelter)

        # Resolve multi-layer envelope constructions for all 6 faces and doors
        envelope_constructions = self.resolve_envelope_constructions(shelter, constructions)
        self.last_envelope_constructions = envelope_constructions

        # EnergyPlus construction name mapping
        ep_construction_names = {
            "north_wall": "NorthWall_Const",
            "south_wall": "SouthWall_Const",
            "east_wall": "EastWall_Const",
            "west_wall": "WestWall_Const",
            "roof": "Roof_Const",
            "floor": "Floor_Const",
        }
        for role in envelope_constructions:
            if role.startswith("door_"):
                d_tag = role.replace("door_", "")
                ep_construction_names[role] = f"Door_Const_{d_tag}"

        import datetime
        if is_annual:
            calc_start_month = 1
            calc_start_day = 1
            calc_end_month = 12
            calc_end_day = 31
        elif end_month is not None and end_day is not None:
            calc_start_month = max(1, min(12, start_month))
            calc_start_day = max(1, min(31, start_day))
            calc_end_month = max(1, min(12, end_month))
            calc_end_day = max(1, min(31, end_day))
        else:
            calc_start_month = max(1, min(12, start_month))
            calc_start_day = max(1, min(31, start_day))
            days = run_period_days if run_period_days is not None else 3
            try:
                s_date = datetime.date(2025, calc_start_month, calc_start_day)
                e_date = s_date + datetime.timedelta(days=max(1, days) - 1)
                calc_end_month = e_date.month
                calc_end_day = e_date.day
            except (ValueError, OverflowError):
                calc_end_month = calc_start_month
                calc_end_day = min(31, calc_start_day + days - 1)

        valid_timestep = max(1, min(60, timestep))

        idf_lines = [
            f"!- Generated by SIH 2026 Shelter Simulation Engine (Canonical ShelterModel)",
            f"!- Shelter Model: {shelter.get('name', 'Canonical Shelter')}",
            f"!- Geometry: {length}m x {width}m x {height}m | Orientation: {orientation} deg | Roof: {roof_type} ({roof_angle} deg)",
            f"!- Computed Volume: {volume} m3 | Floor Area: {props['floor_area']} m2",
            f"",
            f"Version, {self.version_str};",
            f"",
            f"Timestep, {valid_timestep};",
            f"",
            f"Building,",
            f"  {shelter.get('id', 'Shelter')}, !- Name",
            f"  {orientation:.2f},              !- North Axis {{deg}} (Orientation mapping)",
            f"  Suburbs,                        !- Terrain",
            f"  0.04,                           !- Loads Convergence Tolerance Value {{W}}",
            f"  0.4,                            !- Temperature Convergence Tolerance Value {{deltaC}}",
            f"  FullExterior,                   !- Solar Distribution",
            f"  25,                             !- Maximum Number of Warmup Days",
            f"  6;                              !- Minimum Number of Warmup Days",
            f"",
            f"SimulationControl,",
            f"  No,                             !- Do Zone Sizing Calculation",
            f"  No,                             !- Do System Sizing Calculation",
            f"  No,                             !- Do Plant Sizing Calculation",
            f"  No,                             !- Run Simulation for Sizing Periods",
            f"  Yes;                            !- Run Simulation for Weather File Run Periods",
            f"",
            f"RunPeriod,",
            f"  SimulationRunPeriod,            !- Name",
            f"  {calc_start_month},             !- Begin Month",
            f"  {calc_start_day},               !- Begin Day of Month",
            f"  ,                               !- Begin Year",
            f"  {calc_end_month},               !- End Month",
            f"  {calc_end_day},                 !- End Day of Month",
            f"  ,                               !- End Year",
            f"  Tuesday,                        !- Day of Week for Start Day",
            f"  Yes,                            !- Use Weather File Holidays and Special Days",
            f"  Yes,                            !- Use Weather File Daylight Saving Period",
            f"  No,                             !- Apply Weekend Holiday Rule",
            f"  Yes,                            !- Use Weather File Rain Indicators",
            f"  Yes;                            !- Use Weather File Snow Indicators",
            f"",
            f"Site:Location,",
            f"  {loc_name},                     !- Name",
            f"  {lat},                          !- Latitude {{deg}}",
            f"  {lon},                          !- Longitude {{deg}}",
            f"  5.5,                            !- Time Zone {{hr}}",
            f"  {elevation};                    !- Elevation {{m}}",
            f"",
            f"SurfaceConvectionAlgorithm:Inside, TARP;",
            f"SurfaceConvectionAlgorithm:Outside, DOE-2;",
            f"HeatBalanceAlgorithm, ConductionTransferFunction;",
            f"",
            f"!- Realistic alpine ground temperatures for high-altitude permafrost regime (Ladakh/Himalayas)",
            f"Site:GroundTemperature:BuildingSurface,",
            f"  -2.0,                           !- January Ground Temperature {{C}}",
            f"  -2.5,                           !- February Ground Temperature {{C}}",
            f"  -1.0,                           !- March Ground Temperature {{C}}",
            f"   2.0,                           !- April Ground Temperature {{C}}",
            f"   6.0,                           !- May Ground Temperature {{C}}",
            f"  10.0,                           !- June Ground Temperature {{C}}",
            f"  12.0,                           !- July Ground Temperature {{C}}",
            f"  11.0,                           !- August Ground Temperature {{C}}",
            f"   7.0,                           !- September Ground Temperature {{C}}",
            f"   3.0,                           !- October Ground Temperature {{C}}",
            f"  -0.5,                           !- November Ground Temperature {{C}}",
            f"  -1.5;                           !- December Ground Temperature {{C}};",
            f"",
            f"!- ==========================================================================",
            f"!- MATERIALS & CONSTRUCTIONS (Verified thermophysical data)",
            f"!- ==========================================================================",
        ]

        # 1. Collect and emit all unique Material definitions across all 6 constructions
        emitted_materials: Dict[str, str] = {}
        const_layer_names: Dict[str, List[str]] = {}

        for role, const in envelope_constructions.items():
            const_layer_names[role] = []
            for layer in const.layers:
                mat = layer.material
                sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', mat.id)
                thick_mm = int(round(layer.thickness * 1000.0))
                mat_name = f"Mat_{sanitized_id}_{thick_mm}mm"
                const_layer_names[role].append(mat_name)

                if mat_name not in emitted_materials:
                    emitted_materials[mat_name] = (
                        f"Material,\n"
                        f"  {mat_name},                     !- Name\n"
                        f"  {mat.roughness},                !- Roughness\n"
                        f"  {layer.thickness:.4f},          !- Thickness {{m}}\n"
                        f"  {mat.thermal_conductivity:.4f}, !- Conductivity {{W/m-K}}\n"
                        f"  {mat.density:.2f},              !- Density {{kg/m3}}\n"
                        f"  {mat.specific_heat:.2f},        !- Specific Heat {{J/kg-K}}\n"
                        f"  {mat.thermal_absorptance:.3f},  !- Thermal Absorptance (Emissivity)\n"
                        f"  {mat.solar_absorptance:.3f},    !- Solar Absorptance\n"
                        f"  {mat.visible_absorptance:.3f};  !- Visible Absorptance"
                    )

        for mat_block in emitted_materials.values():
            idf_lines.append(mat_block)
            idf_lines.append("")

        # 2. Emit EnergyPlus Construction objects (layers ordered outside to inside)
        for role, ep_name in ep_construction_names.items():
            const = envelope_constructions[role]
            layer_names = const_layer_names[role]
            idf_lines.append(f"Construction,")
            idf_lines.append(f"  {ep_name},                     !- Name ({role}: {const.name})")
            for idx, lyr_name in enumerate(layer_names):
                terminator = ";" if idx == len(layer_names) - 1 else ","
                comment = "!- Outside Layer" if idx == 0 else f"!- Layer {idx + 1}"
                idf_lines.append(f"  {lyr_name}{terminator} {comment}")
            idf_lines.append("")

        # Zone and geometry rules
        idf_lines.extend([
            f"!- ==========================================================================",
            f"!- ZONE SPECIFICATION",
            f"!- ==========================================================================",
            f"Zone,",
            f"  MainZone,                       !- Name",
            f"  0.0,                            !- Direction of Relative North {{deg}}",
            f"  0.0,                            !- X Origin {{m}}",
            f"  0.0,                            !- Y Origin {{m}}",
            f"  0.0,                            !- Z Origin {{m}}",
            f"  1,                              !- Type",
            f"  1,                              !- Multiplier",
            f"  {props['mean_ceiling_height']:.2f}, !- Ceiling Height {{m}}",
            f"  {volume:.2f};                   !- Volume {{m3}}",
            f"",
            f"GlobalGeometryRules,",
            f"  UpperLeftCorner,                !- Starting Vertex Position",
            f"  CounterClockWise,               !- Vertex Entry Direction",
            f"  Relative;                       !- Coordinate System (Enables full 3D building rotation & orientation solar response)",
            f"",
        ])

        # Geometry surface generation with dynamic construction mapping
        surfaces = self._build_surfaces(
            length=length,
            width=width,
            height=height,
            roof_type=roof_type,
            roof_angle=roof_angle,
            constructions_map=ep_construction_names,
        )
        idf_lines.extend(surfaces)

        # Fenestration (Windows & Doors) generation from canonical ShelterModel
        windows = (
            shelter.get("windows", [])
            or shelter.get("openings", {}).get("windows", [])
            or shelter.get("envelope", {}).get("windows", [])
        )
        doors = (
            shelter.get("doors", [])
            or shelter.get("openings", {}).get("doors", [])
            or shelter.get("envelope", {}).get("doors", [])
        )
        fenestration_lines = self._build_fenestrations(
            windows=windows,
            doors=doors,
            length=length,
            width=width,
            height=height,
            ep_construction_names=ep_construction_names,
        )
        idf_lines.extend(fenestration_lines)

        # Thermal Mass generation (dynamically resolved from ShelterModel)
        thermal_mass = shelter.get("thermal_mass") or shelter.get("thermalMass")
        if thermal_mass:
            tm_lines = self._build_thermal_mass(thermal_mass, floor_area=props["floor_area"])
            idf_lines.extend(tm_lines)

        # Infiltration & controlled ventilation (Derived directly from ShelterModel)
        infil_ach = vent_params["infiltration_ach"]
        idf_lines.extend([
            f"ScheduleTypeLimits, AnyNumber;",
            f"",
            f"Schedule:Compact,",
            f"  AlwaysOnSchedule,               !- Name",
            f"  AnyNumber,                      !- Schedule Type Limits Name",
            f"  Through: 12/31,                 !- Field 1",
            f"  For: AllDays,                   !- Field 2",
            f"  Until: 24:00, 1.0;              !- Field 3",
            f"",
            f"ZoneInfiltration:DesignFlowRate,",
            f"  MainZone_Infiltration,          !- Name",
            f"  MainZone,                       !- Zone Name",
            f"  AlwaysOnSchedule,               !- Schedule Name",
            f"  AirChanges/Hour,                !- Design Volume Flow Rate Calculation Method",
            f"  ,                               !- Design Volume Flow Rate {{m3/s}}",
            f"  ,                               !- Flow per Zone Floor Area {{m3/s-m2}}",
            f"  ,                               !- Flow per Exterior Surface Area {{m3/s-m2}}",
            f"  {infil_ach:.4f};                !- Air Changes per Hour {{1/hr}} (User Defined)",
            f"",
        ])

        # Occupant internal heat gains (Sensible and latent gains from occupants)
        raw_occupants = (
            shelter.get("occupants")
            or shelter.get("occupancy", {}).get("count")
            or shelter.get("occupancy", {}).get("occupants")
            or shelter.get("internalLoads", {}).get("occupantsCount")
            or shelter.get("internal_loads", {}).get("occupants_count")
            or 0
        )
        try:
            occupant_count = max(0, int(round(float(raw_occupants))))
        except (ValueError, TypeError):
            occupant_count = 0

        activity_watts = float(
            shelter.get("internalLoads", {}).get("activityLevelWatts")
            or shelter.get("internal_loads", {}).get("activity_level_watts")
            or shelter.get("occupancy", {}).get("activity_watts")
            or 120.0
        )

        if occupant_count > 0:
            idf_lines.extend([
                f"Schedule:Compact,",
                f"  OccupantActivitySchedule,       !- Name",
                f"  AnyNumber,                      !- Schedule Type Limits Name",
                f"  Through: 12/31,                 !- Field 1",
                f"  For: AllDays,                   !- Field 2",
                f"  Until: 24:00, {activity_watts:.1f}; !- Field 3 (Metabolic Activity Level {{W/person}})",
                f"",
                f"People,",
                f"  MainZone_Occupants,             !- Name",
                f"  MainZone,                       !- Zone Name",
                f"  AlwaysOnSchedule,               !- Number of People Schedule Name",
                f"  people,                         !- Number of People Calculation Method",
                f"  {occupant_count},               !- Number of People",
                f"  ,                               !- People per Floor Area {{person/m2}}",
                f"  ,                               !- Floor Area per Person {{m2/person}}",
                f"  0.30,                           !- Fraction Radiant",
                f"  AutoCalculate,                  !- Sensible Heat Fraction",
                f"  OccupantActivitySchedule;       !- Activity Level Schedule Name",
                f"",
            ])

        # Optional Natural Ventilation
        if vent_params["natural_ventilation_enabled"]:
            nat_sched = vent_params["natural_schedule"]
            nat_ach = vent_params["natural_ach"]
            nat_sched_name = "NaturalVentSchedule"

            if nat_sched.lower() in ("dayonly", "day_only", "daytime"):
                rules = [
                    "Until: 08:00, 0.0,",
                    "Until: 18:00, 1.0,",
                    "Until: 24:00, 0.0;",
                ]
            elif nat_sched.lower() in ("nightpurge", "night_purge", "night"):
                rules = [
                    "Until: 20:00, 0.0,",
                    "Until: 24:00, 1.0;",
                ]
            else:
                rules = ["Until: 24:00, 1.0;"]

            idf_lines.extend([
                "Schedule:Compact,",
                f"  {nat_sched_name},               !- Name",
                f"  AnyNumber,                      !- Schedule Type Limits Name",
                f"  Through: 12/31,                 !- Field 1",
                f"  For: AllDays,                   !- Field 2",
            ])
            for r in rules:
                idf_lines.append(f"  {r}")
            idf_lines.append("")

            idf_lines.extend([
                "ZoneVentilation:DesignFlowRate,",
                "  MainZone_NaturalVentilation,    !- Name",
                "  MainZone,                       !- Zone Name",
                f"  {nat_sched_name},               !- Schedule Name",
                "  AirChanges/Hour,                !- Design Volume Flow Rate Calculation Method",
                "  ,                               !- Design Volume Flow Rate {m3/s}",
                "  ,                               !- Flow per Zone Floor Area {m3/s-m2}",
                "  ,                               !- Flow per Exterior Surface Area {m3/s-m2}",
                f"  {nat_ach:.4f},                  !- Air Changes per Hour {{1/hr}}",
                "  Natural,                        !- Ventilation Type",
                "  ,                               !- Fan Pressure Rise {Pa}",
                "  ,                               !- Fan Total Efficiency",
                "  1.0,                            !- Constant Term Coefficient",
                "  0.0,                            !- Temperature Term Coefficient",
                "  0.0,                            !- Velocity Term Coefficient",
                "  0.0;                            !- Velocity Squared Term Coefficient",
                "",
            ])

        # Optional Mechanical Ventilation
        if vent_params["mechanical_ventilation_enabled"]:
            flow_m3s = max(0.001, vent_params["mechanical_flow_rate_lps"] / 1000.0)
            idf_lines.extend([
                "ZoneVentilation:DesignFlowRate,",
                "  MainZone_MechanicalVentilation, !- Name",
                "  MainZone,                       !- Zone Name",
                "  AlwaysOnSchedule,               !- Schedule Name",
                "  Flow/Zone,                      !- Design Volume Flow Rate Calculation Method",
                f"  {flow_m3s:.5f},                 !- Design Volume Flow Rate {{m3/s}}",
                "  ,                               !- Flow per Zone Floor Area {m3/s-m2}",
                "  ,                               !- Flow per Exterior Surface Area {m3/s-m2}",
                "  ,                               !- Air Changes per Hour {1/hr}",
                "  Balanced,                       !- Ventilation Type",
                "  ,                               !- Fan Pressure Rise {Pa}",
                "  ,                               !- Fan Total Efficiency",
                "  1.0,                            !- Constant Term Coefficient",
                "  0.0,                            !- Temperature Term Coefficient",
                "  0.0,                            !- Velocity Term Coefficient",
                "  0.0;                            !- Velocity Squared Term Coefficient",
                "",
            ])

        idf_lines.extend([
            "!- ==========================================================================",
            "!- OUTPUT REQUESTS",
            "!- ==========================================================================",
        ])
        # Output requests driven strictly by centralized OutputVariableRegistry
        output_requests = OutputVariableRegistry.get_idf_output_lines()
        idf_lines.extend(output_requests)
        idf_lines.extend([
            "Output:Table:SummaryReports, AllSummary;",
            "OutputControl:Table:Style, HTML;",
            "Output:VariableDictionary, Regular;",
            "",
        ])

        target_file = Path(output_path)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, "w", encoding="utf-8") as f:
            f.write("\n".join(idf_lines))

        return str(target_file.resolve())

    def _build_surfaces(
        self,
        length: float,
        width: float,
        height: float,
        roof_type: str,
        roof_angle: float,
        constructions_map: Optional[Dict[str, str]] = None,
    ) -> List[str]:
        """Construct EnergyPlus BuildingSurface:Detailed records with strict outwards normal order."""
        lines = []
        roof_type_norm = roof_type.strip().capitalize()
        rad = math.radians(roof_angle)

        cmap = constructions_map or {
            "floor": "Floor_Const",
            "roof": "Roof_Const",
            "south_wall": "SouthWall_Const",
            "north_wall": "NorthWall_Const",
            "east_wall": "EastWall_Const",
            "west_wall": "WestWall_Const",
        }

        # 1. Floor (z = 0, outwards facing down: -Z)
        lines.extend([
            f"BuildingSurface:Detailed,",
            f"  FloorSurface,                   !- Name",
            f"  Floor,                          !- Surface Type",
            f"  {cmap['floor']},                !- Construction Name",
            f"  MainZone,                       !- Zone Name",
            f"  ,                               !- Space Name",
            f"  Ground,                         !- Outside Boundary Condition",
            f"  ,                               !- Outside Boundary Condition Object",
            f"  NoSun,                          !- Sun Exposure",
            f"  NoWind,                         !- Wind Exposure",
            f"  0.0,                            !- View Factor to Ground",
            f"  4,                              !- Number of Vertices",
            f"  0.0, 0.0, 0.0,                  !- Vertex 1",
            f"  0.0, {width:.3f}, 0.0,          !- Vertex 2",
            f"  {length:.3f}, {width:.3f}, 0.0, !- Vertex 3",
            f"  {length:.3f}, 0.0, 0.0;         !- Vertex 4",
            f"",
        ])

        if roof_type_norm == "Flat" or roof_angle <= 0.0:
            # 2. Flat Roof (z = height, outwards facing up: +Z)
            lines.extend([
                f"BuildingSurface:Detailed,",
                f"  RoofSurface,                    !- Name",
                f"  Roof,                           !- Surface Type",
                f"  {cmap['roof']},                 !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.0,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, {width:.3f}, {height:.3f}, !- Vertex 1",
                f"  0.0, 0.0, {height:.3f},         !- Vertex 2",
                f"  {length:.3f}, 0.0, {height:.3f},!- Vertex 3",
                f"  {length:.3f}, {width:.3f}, {height:.3f}; !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  SouthWall,                      !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['south_wall']},           !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, 0.0, {height:.3f},         !- Vertex 1",
                f"  0.0, 0.0, 0.0,                  !- Vertex 2",
                f"  {length:.3f}, 0.0, 0.0,         !- Vertex 3",
                f"  {length:.3f}, 0.0, {height:.3f};!- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  NorthWall,                      !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['north_wall']},           !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  {length:.3f}, {width:.3f}, {height:.3f}, !- Vertex 1",
                f"  {length:.3f}, {width:.3f}, 0.0,          !- Vertex 2",
                f"  0.0, {width:.3f}, 0.0,                   !- Vertex 3",
                f"  0.0, {width:.3f}, {height:.3f};          !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  EastWall,                       !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['east_wall']},            !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  {length:.3f}, 0.0, {height:.3f},     !- Vertex 1",
                f"  {length:.3f}, 0.0, 0.0,              !- Vertex 2",
                f"  {length:.3f}, {width:.3f}, 0.0,      !- Vertex 3",
                f"  {length:.3f}, {width:.3f}, {height:.3f}; !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  WestWall,                       !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['west_wall']},            !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, {width:.3f}, {height:.3f}, !- Vertex 1",
                f"  0.0, {width:.3f}, 0.0,          !- Vertex 2",
                f"  0.0, 0.0, 0.0,                  !- Vertex 3",
                f"  0.0, 0.0, {height:.3f};         !- Vertex 4",
                f"",
            ])

        elif roof_type_norm == "Shed":
            # Shed roof: slopes from y = 0 (z = height) up to y = width (z = height + delta_h)
            delta_h = width * math.tan(rad)
            z_back = height + delta_h

            lines.extend([
                f"BuildingSurface:Detailed,",
                f"  RoofSurface,                    !- Name",
                f"  Roof,                           !- Surface Type",
                f"  {cmap['roof']},                 !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.0,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, {width:.3f}, {z_back:.3f}, !- Vertex 1",
                f"  0.0, 0.0, {height:.3f},         !- Vertex 2",
                f"  {length:.3f}, 0.0, {height:.3f},!- Vertex 3",
                f"  {length:.3f}, {width:.3f}, {z_back:.3f}; !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  SouthWall,                      !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['south_wall']},           !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, 0.0, {height:.3f},         !- Vertex 1",
                f"  0.0, 0.0, 0.0,                  !- Vertex 2",
                f"  {length:.3f}, 0.0, 0.0,         !- Vertex 3",
                f"  {length:.3f}, 0.0, {height:.3f};!- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  NorthWall,                      !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['north_wall']},           !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  {length:.3f}, {width:.3f}, {z_back:.3f}, !- Vertex 1",
                f"  {length:.3f}, {width:.3f}, 0.0,          !- Vertex 2",
                f"  0.0, {width:.3f}, 0.0,                   !- Vertex 3",
                f"  0.0, {width:.3f}, {z_back:.3f};          !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  EastWall,                       !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['east_wall']},            !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  {length:.3f}, 0.0, {height:.3f},     !- Vertex 1",
                f"  {length:.3f}, 0.0, 0.0,              !- Vertex 2",
                f"  {length:.3f}, {width:.3f}, 0.0,      !- Vertex 3",
                f"  {length:.3f}, {width:.3f}, {z_back:.3f}; !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  WestWall,                       !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['west_wall']},            !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, {width:.3f}, {z_back:.3f}, !- Vertex 1",
                f"  0.0, {width:.3f}, 0.0,          !- Vertex 2",
                f"  0.0, 0.0, 0.0,                  !- Vertex 3",
                f"  0.0, 0.0, {height:.3f};         !- Vertex 4",
                f"",
            ])

        elif roof_type_norm == "Gable":
            # Gable roof: symmetric dual pitch with ridge along length at y = width / 2
            delta_h = 0.5 * width * math.tan(rad)
            z_ridge = height + delta_h
            y_mid = 0.5 * width

            lines.extend([
                f"!- South Roof Pitch",
                f"BuildingSurface:Detailed,",
                f"  RoofSurface_South,              !- Name",
                f"  Roof,                           !- Surface Type",
                f"  {cmap['roof']},                 !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.0,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 1",
                f"  0.0, 0.0, {height:.3f},          !- Vertex 2",
                f"  {length:.3f}, 0.0, {height:.3f}, !- Vertex 3",
                f"  {length:.3f}, {y_mid:.3f}, {z_ridge:.3f}; !- Vertex 4",
                f"",
                f"!- North Roof Pitch",
                f"BuildingSurface:Detailed,",
                f"  RoofSurface_North,              !- Name",
                f"  Roof,                           !- Surface Type",
                f"  {cmap['roof']},                 !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.0,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, {width:.3f}, {height:.3f},  !- Vertex 1",
                f"  0.0, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 2",
                f"  {length:.3f}, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 3",
                f"  {length:.3f}, {width:.3f}, {height:.3f};  !- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  SouthWall,                      !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['south_wall']},           !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  0.0, 0.0, {height:.3f},         !- Vertex 1",
                f"  0.0, 0.0, 0.0,                  !- Vertex 2",
                f"  {length:.3f}, 0.0, 0.0,         !- Vertex 3",
                f"  {length:.3f}, 0.0, {height:.3f};!- Vertex 4",
                f"",
                f"BuildingSurface:Detailed,",
                f"  NorthWall,                      !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['north_wall']},           !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  4,                              !- Number of Vertices",
                f"  {length:.3f}, {width:.3f}, {height:.3f}, !- Vertex 1",
                f"  {length:.3f}, {width:.3f}, 0.0,          !- Vertex 2",
                f"  0.0, {width:.3f}, 0.0,                   !- Vertex 3",
                f"  0.0, {width:.3f}, {height:.3f};          !- Vertex 4",
                f"",
                f"!- East Wall (5-sided pentagon with gable end, Counter-Clockwise from exterior: normal [+1, 0, 0])",
                f"BuildingSurface:Detailed,",
                f"  EastWall,                       !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['east_wall']},            !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  5,                              !- Number of Vertices",
                f"  {length:.3f}, 0.0, 0.0,                   !- Vertex 1 (South Base)",
                f"  {length:.3f}, {width:.3f}, 0.0,           !- Vertex 2 (North Base)",
                f"  {length:.3f}, {width:.3f}, {height:.3f},  !- Vertex 3 (North Eaves)",
                f"  {length:.3f}, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 4 (Ridge)",
                f"  {length:.3f}, 0.0, {height:.3f};          !- Vertex 5 (South Eaves)",
                f"",
                f"!- West Wall (5-sided pentagon with gable end, Counter-Clockwise from exterior: normal [-1, 0, 0])",
                f"BuildingSurface:Detailed,",
                f"  WestWall,                       !- Name",
                f"  Wall,                           !- Surface Type",
                f"  {cmap['west_wall']},            !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  Outdoors,                       !- Outside Boundary Condition",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  SunExposed,                     !- Sun Exposure",
                f"  WindExposed,                    !- Wind Exposure",
                f"  0.5,                            !- View Factor to Ground",
                f"  5,                              !- Number of Vertices",
                f"  0.0, {width:.3f}, 0.0,           !- Vertex 1 (North Base)",
                f"  0.0, 0.0, 0.0,                   !- Vertex 2 (South Base)",
                f"  0.0, 0.0, {height:.3f},          !- Vertex 3 (South Eaves)",
                f"  0.0, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 4 (Ridge)",
                f"  0.0, {width:.3f}, {height:.3f};  !- Vertex 5 (North Eaves)",
                f"",
            ])

        return lines

    def _build_door_schedule(self, sanitized_door_id: str, sched_spec: Any) -> List[str]:
        """Construct EnergyPlus Schedule:Compact for door opening schedule."""
        sched_name = f"DoorSchedule_{sanitized_door_id}"
        lines = []

        if isinstance(sched_spec, str):
            sched_key = sched_spec.strip().lower().replace("-", "_").replace(" ", "_")
            if sched_key in ("always_open", "open", "alwaysopen"):
                rules = ["Until: 24:00, 1.0;"]
            elif sched_key in ("always_closed", "closed", "alwaysclosed"):
                rules = ["Until: 24:00, 0.0;"]
            elif sched_key in ("day_only", "dayonly", "daytime"):
                rules = [
                    "Until: 08:00, 0.0,",
                    "Until: 18:00, 1.0,",
                    "Until: 24:00, 0.0;",
                ]
            elif sched_key in ("night_purge", "nightpurge", "night"):
                rules = [
                    "Until: 20:00, 0.0,",
                    "Until: 24:00, 1.0;",
                ]
            elif sched_key in ("intermittent", "periodic"):
                rules = [
                    "Until: 07:00, 0.0,",
                    "Until: 09:00, 0.5,",
                    "Until: 12:00, 0.1,",
                    "Until: 14:00, 0.5,",
                    "Until: 18:00, 0.1,",
                    "Until: 24:00, 0.0;",
                ]
            else:
                rules = ["Until: 24:00, 0.0;"]
        elif isinstance(sched_spec, dict):
            custom_rules = sched_spec.get("rules") or sched_spec.get("until")
            if isinstance(custom_rules, list):
                rules = [str(r).rstrip(";") + (";" if idx == len(custom_rules) - 1 else ",") for idx, r in enumerate(custom_rules)]
            else:
                day_val = float(sched_spec.get("day_fraction", 0.5))
                rules = [
                    "Until: 08:00, 0.0,",
                    f"Until: 18:00, {day_val:.2f},",
                    "Until: 24:00, 0.0;",
                ]
        elif isinstance(sched_spec, (int, float)):
            val = max(0.0, min(1.0, float(sched_spec)))
            rules = [f"Until: 24:00, {val:.2f};"]
        else:
            rules = ["Until: 24:00, 0.0;"]

        lines.extend([
            "Schedule:Compact,",
            f"  {sched_name},                   !- Name",
            f"  AnyNumber,                      !- Schedule Type Limits Name",
            f"  Through: 12/31,                 !- Field 1",
            f"  For: AllDays,                   !- Field 2",
        ])
        for r in rules:
            lines.append(f"  {r}")
        lines.append("")
        return lines

    def _build_fenestrations(
        self,
        windows: List[Dict[str, Any]],
        doors: List[Dict[str, Any]],
        length: float,
        width: float,
        height: float,
        ep_construction_names: Optional[Dict[str, str]] = None,
    ) -> List[str]:
        """Construct EnergyPlus fenestration objects (WindowMaterial, Construction, Frame, Shading, FenestrationSurface)."""
        lines: List[str] = []
        if not windows and not doors:
            return lines

        # 0. Strict validation of all openings against wall boundaries, dimensions, and pairwise collision
        geom = {"length": length, "width": width, "height": height}
        is_valid, validation_errors = OpeningValidator.validate_openings(windows, doors, geom)
        if not is_valid:
            raise ValueError(f"Fenestration opening validation failed: {'; '.join(validation_errors)}")

        lines.extend([
            f"!- ==========================================================================",
            f"!- FENESTRATIONS & OPENINGS (Canonical ShelterModel Windows & Doors)",
            f"!- ==========================================================================",
        ])

        # 1. Emit glazing materials and constructions dynamically from canonical glazing_db
        if windows:
            for g in glazing_db.list_glazing():
                lines.extend([
                    "WindowMaterial:SimpleGlazingSystem,",
                    f"  {g.id}_Mat,                     !- Name",
                    f"  {g.u_value:.2f},                           !- U-Factor {{W/m2-K}}",
                    f"  {g.shgc:.2f},                           !- Solar Heat Gain Coefficient",
                    f"  {g.visible_transmittance:.2f};                           !- Visible Transmittance",
                    "",
                    "Construction,",
                    f"  {g.id}_Const,                   !- Name",
                    f"  {g.id}_Mat;                     !- Outside Layer",
                    "",
                ])

            # 1b. Emit unique window frames (defaulting to UPVC_Insulated for realistic alpine edge-of-glass modeling)
            emitted_frames = set()
            for win in windows:
                raw_frame = win.get("frame_type") or win.get("frameType") or win.get("frame") or "UPVC_Insulated"
                frame_def = glazing_db.get_frame(raw_frame) or glazing_db.get_frame("UPVC_Insulated")
                if frame_def and frame_def.id not in emitted_frames:
                    emitted_frames.add(frame_def.id)
                    lines.extend([
                        "WindowProperty:FrameAndDivider,",
                        f"  Frame_{frame_def.id},           !- Name",
                        f"  {frame_def.width_m:.3f},        !- Frame Width {{m}}",
                        f"  0.0,                            !- Frame Outside Projection {{m}}",
                        f"  0.0,                            !- Frame Inside Projection {{m}}",
                        f"  {frame_def.u_value:.2f},        !- Frame Conductance {{W/m2-K}}",
                        f"  1.10,                           !- Ratio of Frame-Edge Glass Conductance to Center-Of-Glass Conductance",
                        f"  0.90,                           !- Frame Solar Absorptance",
                        f"  0.90,                           !- Frame Visible Absorptance",
                        f"  0.90,                           !- Frame Thermal Hemispherical Emissivity",
                        f"  DividedLite;                    !- Frame Type",
                        "",
                    ])

        # 2. Dynamic Door Constructions (if called standalone without pre-resolved ep_construction_names)
        ep_cnames = dict(ep_construction_names) if ep_construction_names else {}
        standalone_door_const_lines: List[str] = []

        if not ep_construction_names and doors:
            emitted_standalone_mats = set()
            for idx, door in enumerate(doors):
                raw_wall = str(door.get("wall") or door.get("wall_id", "north")).strip().lower()
                wall_key = raw_wall.replace("wall_", "").replace("_wall", "")
                d_id = str(door.get("id") or f"Door_{wall_key}_{idx + 1}")
                sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', d_id)
                d_role = f"door_{sanitized_id}"
                c_name = f"Door_Const_{sanitized_id}"
                ep_cnames[d_role] = c_name

                d_spec = door.get("construction") or door.get("construction_id") or door.get("layers")
                d_const, _ = self._parse_construction(
                    raw_val=d_spec,
                    surface_type="DOOR",
                    default_id="default_insulated_door",
                    default_name="Default Insulated Alpine Shelter Door",
                    surface_key=d_role,
                )
                lyr_names = []
                for layer in d_const.layers:
                    mat = layer.material
                    thick_mm = int(round(layer.thickness * 1000.0))
                    mat_name = f"Mat_{re.sub(r'[^a-zA-Z0-9_]', '_', mat.id)}_{thick_mm}mm"
                    lyr_names.append(mat_name)
                    if mat_name not in emitted_standalone_mats:
                        emitted_standalone_mats.add(mat_name)
                        standalone_door_const_lines.extend([
                            "Material,",
                            f"  {mat_name},                     !- Name",
                            f"  {mat.roughness},                !- Roughness",
                            f"  {layer.thickness:.4f},          !- Thickness {{m}}",
                            f"  {mat.thermal_conductivity:.4f}, !- Conductivity {{W/m-K}}",
                            f"  {mat.density:.2f},              !- Density {{kg/m3}}",
                            f"  {mat.specific_heat:.2f},        !- Specific Heat {{J/kg-K}}",
                            f"  {mat.thermal_absorptance:.3f},  !- Thermal Absorptance",
                            f"  {mat.solar_absorptance:.3f},    !- Solar Absorptance",
                            f"  {mat.visible_absorptance:.3f};  !- Visible Absorptance",
                            "",
                        ])
                standalone_door_const_lines.append("Construction,")
                standalone_door_const_lines.append(f"  {c_name},                     !- Name")
                for l_idx, lyr_name in enumerate(lyr_names):
                    term = ";" if l_idx == len(lyr_names) - 1 else ","
                    comm = "!- Outside Layer" if l_idx == 0 else f"!- Layer {l_idx + 1}"
                    standalone_door_const_lines.append(f"  {lyr_name}{term} {comm}")
                standalone_door_const_lines.append("")

        lines.extend(standalone_door_const_lines)

        # 3. Generate FenestrationSurface:Detailed for windows
        wall_name_map = {
            "south": "SouthWall",
            "north": "NorthWall",
            "east": "EastWall",
            "west": "WestWall",
        }

        overhang_lines: List[str] = []

        for idx, win in enumerate(windows):
            raw_wall = str(win.get("wall") or win.get("wall_id", "south")).strip().lower()
            wall_key = raw_wall.replace("wall_", "").replace("_wall", "")
            host_wall = wall_name_map.get(wall_key, "SouthWall")
            win_id = win.get("id") or f"Window_{wall_key}_{idx + 1}"
            sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', str(win_id))

            glaze_type = win.get("glazing_type") or win.get("glazingType") or "Double_LowE_Argon"
            resolved_glazing = glazing_db.get_glazing(glaze_type)
            const_name = f"{resolved_glazing.id}_Const"

            # Frame assignment (defaults to UPVC_Insulated)
            raw_frame = win.get("frame_type") or win.get("frameType") or win.get("frame") or "UPVC_Insulated"
            frame_def = glazing_db.get_frame(raw_frame) or glazing_db.get_frame("UPVC_Insulated")
            frame_field = f"Frame_{frame_def.id}" if frame_def else ""

            pos_x = float(win.get("position_x") if win.get("position_x") is not None else win.get("positionX", 1.0))
            w = float(win.get("width", 1.5))
            h = float(win.get("height", 1.2))
            sill = float(win.get("sill_height") if win.get("sill_height") is not None else win.get("sillHeight", 0.9))

            # Counter-clockwise vertex winding looking from outside
            if wall_key == "south":
                x0, x1 = pos_x, pos_x + w
                z0, z1 = sill, sill + h
                v1 = (x0, 0.0, z1)
                v2 = (x0, 0.0, z0)
                v3 = (x1, 0.0, z0)
                v4 = (x1, 0.0, z1)
            elif wall_key == "north":
                x0 = length - pos_x
                x1 = length - (pos_x + w)
                z0, z1 = sill, sill + h
                v1 = (x0, width, z1)
                v2 = (x0, width, z0)
                v3 = (x1, width, z0)
                v4 = (x1, width, z1)
            elif wall_key == "east":
                y0, y1 = pos_x, pos_x + w
                z0, z1 = sill, sill + h
                v1 = (length, y0, z1)
                v2 = (length, y0, z0)
                v3 = (length, y1, z0)
                v4 = (length, y1, z1)
            else:  # west
                y0 = width - pos_x
                y1 = width - (pos_x + w)
                z0, z1 = sill, sill + h
                v1 = (0.0, y0, z1)
                v2 = (0.0, y0, z0)
                v3 = (0.0, y1, z0)
                v4 = (0.0, y1, z1)

            lines.extend([
                f"FenestrationSurface:Detailed,",
                f"  {sanitized_id},                 !- Name",
                f"  Window,                         !- Surface Type",
                f"  {const_name},                   !- Construction Name",
                f"  {host_wall},                    !- Building Surface Name",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  0.5,                            !- View Factor to Ground",
                f"  {frame_field},                  !- Frame and Divider Name",
                f"  1,                              !- Multiplier",
                f"  4,                              !- Number of Vertices",
                f"  {v1[0]:.3f}, {v1[1]:.3f}, {v1[2]:.3f}, !- Vertex 1",
                f"  {v2[0]:.3f}, {v2[1]:.3f}, {v2[2]:.3f}, !- Vertex 2",
                f"  {v3[0]:.3f}, {v3[1]:.3f}, {v3[2]:.3f}, !- Vertex 3",
                f"  {v4[0]:.3f}, {v4[1]:.3f}, {v4[2]:.3f}; !- Vertex 4",
                f"",
            ])

            # Optional Shading Overhang
            overhang_depth = float(
                win.get("shading_overhang")
                if win.get("shading_overhang") is not None
                else win.get("shadingOverhang")
                if win.get("shadingOverhang") is not None
                else win.get("shading", 0.0)
                or 0.0
            )
            if overhang_depth > 0.0:
                overhang_lines.extend([
                    "Shading:Overhang,",
                    f"  Overhang_{sanitized_id},        !- Name",
                    f"  {sanitized_id},                 !- Window or Door Name",
                    f"  0.05,                           !- Height above Window or Door {{m}}",
                    f"  90.0,                           !- Tilt Angle from Window/Door {{deg}}",
                    f"  0.10,                           !- Left extension from Window/Door {{m}}",
                    f"  0.10,                           !- Right extension from Window/Door {{m}}",
                    f"  {overhang_depth:.3f};           !- Depth {{m}}",
                    "",
                ])

        # 4. Generate FenestrationSurface:Detailed and Schedules for doors
        door_schedule_lines: List[str] = []

        for idx, door in enumerate(doors):
            raw_wall = str(door.get("wall") or door.get("wall_id", "north")).strip().lower()
            wall_key = raw_wall.replace("wall_", "").replace("_wall", "")
            host_wall = wall_name_map.get(wall_key, "NorthWall")
            door_id = door.get("id") or f"Door_{wall_key}_{idx + 1}"
            sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', str(door_id))
            door_role = f"door_{sanitized_id}"
            door_const_name = ep_cnames.get(door_role, f"Door_Const_{sanitized_id}")

            pos_x = float(door.get("position_x") if door.get("position_x") is not None else door.get("positionX", 1.0))
            w = float(door.get("width", 1.0))
            h = float(door.get("height", 2.1))
            sill = float(door.get("sill_height") if door.get("sill_height") is not None else door.get("sillHeight", 0.0))

            if wall_key == "south":
                x0, x1 = pos_x, pos_x + w
                z0, z1 = sill, sill + h
                v1 = (x0, 0.0, z1)
                v2 = (x0, 0.0, z0)
                v3 = (x1, 0.0, z0)
                v4 = (x1, 0.0, z1)
            elif wall_key == "north":
                x0 = length - pos_x
                x1 = length - (pos_x + w)
                z0, z1 = sill, sill + h
                v1 = (x0, width, z1)
                v2 = (x0, width, z0)
                v3 = (x1, width, z0)
                v4 = (x1, width, z1)
            elif wall_key == "east":
                y0, y1 = pos_x, pos_x + w
                z0, z1 = sill, sill + h
                v1 = (length, y0, z1)
                v2 = (length, y0, z0)
                v3 = (length, y1, z0)
                v4 = (length, y1, z1)
            else:  # west
                y0 = width - pos_x
                y1 = width - (pos_x + w)
                z0, z1 = sill, sill + h
                v1 = (0.0, y0, z1)
                v2 = (0.0, y0, z0)
                v3 = (0.0, y1, z0)
                v4 = (0.0, y1, z1)

            lines.extend([
                f"FenestrationSurface:Detailed,",
                f"  {sanitized_id},                 !- Name",
                f"  Door,                           !- Surface Type",
                f"  {door_const_name},              !- Construction Name",
                f"  {host_wall},                    !- Building Surface Name",
                f"  ,                               !- Outside Boundary Condition Object",
                f"  0.5,                            !- View Factor to Ground",
                f"  ,                               !- Frame and Divider Name",
                f"  1,                              !- Multiplier",
                f"  4,                              !- Number of Vertices",
                f"  {v1[0]:.3f}, {v1[1]:.3f}, {v1[2]:.3f}, !- Vertex 1",
                f"  {v2[0]:.3f}, {v2[1]:.3f}, {v2[2]:.3f}, !- Vertex 2",
                f"  {v3[0]:.3f}, {v3[1]:.3f}, {v3[2]:.3f}, !- Vertex 3",
                f"  {v4[0]:.3f}, {v4[1]:.3f}, {v4[2]:.3f}; !- Vertex 4",
                f"",
            ])

            # Door opening schedule support
            sched_spec = door.get("schedule") or door.get("opening_schedule") or door.get("openingSchedule")
            if sched_spec:
                door_schedule_lines.extend(self._build_door_schedule(sanitized_id, sched_spec))

        # Append shading overhang objects and door schedules if any exist
        lines.extend(overhang_lines)
        lines.extend(door_schedule_lines)

        return lines

    def _build_thermal_mass(self, thermal_mass_elements: Any, floor_area: float = 24.0) -> List[str]:
        """Construct EnergyPlus InternalMass objects dynamically for internal thermal buffer storage.

        Respects user-defined materials, thicknesses, areas, and element types (floor slab,
        internal partition wall, thermal core) without hardcoding fallback materials.
        """
        lines: List[str] = []
        normalized = ThermalMassValidator.normalize_thermal_mass(thermal_mass_elements, floor_area=floor_area)
        if not normalized:
            return lines

        lines.extend([
            f"!- ==========================================================================",
            f"!- INTERNAL THERMAL MASS SPECIFICATIONS",
            f"!- ==========================================================================",
        ])

        for idx, tm in enumerate(normalized):
            tm_id = tm.get("id") or f"ThermalMass_{idx + 1}"
            sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', str(tm_id))
            raw_thickness = float(tm.get("thickness") or 0.15)
            # Ensure physical thickness bounds
            thickness = max(0.005, min(1.50, raw_thickness))

            raw_area = float(tm.get("surface_area") or tm.get("surfaceArea") or floor_area)
            exp_frac = float(tm.get("exposed_fraction") or 1.0)
            effective_area = round(raw_area * exp_frac, 2)

            mat_spec = tm.get("material_id") or tm.get("material") or "mat-concrete-slab"

            # Resolve material physical properties
            mat_name = f"Mat_TM_{sanitized_id}"
            const_name = f"Const_TM_{sanitized_id}"

            if isinstance(mat_spec, dict):
                # Custom user-defined material properties
                conductivity = float(mat_spec.get("thermal_conductivity") or 1.40)
                density = float(mat_spec.get("density") or 2200.0)
                specific_heat = float(mat_spec.get("specific_heat") or 880.0)
                roughness = str(mat_spec.get("roughness") or "MediumRough")
                therm_abs = float(mat_spec.get("thermal_absorptance") or 0.90)
                sol_abs = float(mat_spec.get("solar_absorptance") or 0.70)
                vis_abs = float(mat_spec.get("visible_absorptance") or 0.70)
                src_comment = mat_spec.get("name") or "Custom Material"
            else:
                try:
                    db_mat = material_db.get(str(mat_spec))
                    conductivity = db_mat.thermal_conductivity
                    density = db_mat.density
                    specific_heat = db_mat.specific_heat
                    roughness = db_mat.roughness
                    therm_abs = db_mat.thermal_absorptance
                    sol_abs = db_mat.solar_absorptance
                    vis_abs = db_mat.visible_absorptance
                    src_comment = f"{db_mat.name} ({db_mat.id})"
                except KeyError:
                    # Fallback to standard verified concrete slab with warning
                    db_mat = material_db.get("mat-concrete-slab")
                    conductivity = db_mat.thermal_conductivity
                    density = db_mat.density
                    specific_heat = db_mat.specific_heat
                    roughness = db_mat.roughness
                    therm_abs = db_mat.thermal_absorptance
                    sol_abs = db_mat.solar_absorptance
                    vis_abs = db_mat.visible_absorptance
                    src_comment = f"Fallback Concrete ({mat_spec} not found)"
                    self.fallback_warnings.append(
                        f"Thermal mass '{tm_id}' referenced unknown material '{mat_spec}'; using verified concrete slab."
                    )

            # 1. Emit dedicated physical Material object
            lines.extend([
                f"Material,",
                f"  {mat_name},                     !- Name ({src_comment})",
                f"  {roughness},                    !- Roughness",
                f"  {thickness:.4f},                !- Thickness {{m}}",
                f"  {conductivity:.4f},             !- Conductivity {{W/m-K}}",
                f"  {density:.2f},                  !- Density {{kg/m3}}",
                f"  {specific_heat:.2f},            !- Specific Heat {{J/kg-K}}",
                f"  {therm_abs:.3f},                !- Thermal Absorptance",
                f"  {sol_abs:.3f},                  !- Solar Absorptance",
                f"  {vis_abs:.3f};                  !- Visible Absorptance",
                f"",
                # 2. Emit Construction object
                f"Construction,",
                f"  {const_name},                   !- Name",
                f"  {mat_name};                     !- Outside Layer",
                f"",
                # 3. Emit EnergyPlus InternalMass object
                f"InternalMass,",
                f"  {sanitized_id},                 !- Name ({tm.get('name', tm_id)})",
                f"  {const_name},                   !- Construction Name",
                f"  MainZone,                       !- Zone Name",
                f"  ,                               !- Space Name",
                f"  {effective_area:.2f};           !- Surface Area {{m2}}",
                f"",
            ])

        return lines


# Backward compatibility alias
EnergyPlusGenerator = EnergyPlusIDFGenerator
