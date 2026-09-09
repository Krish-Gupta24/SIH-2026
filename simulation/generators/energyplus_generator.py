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


class EnergyPlusIDFGenerator:
    """Generates valid, syntax-compliant EnergyPlus IDF models from canonical ShelterModel representations."""

    def __init__(self, engine_version: str = "24.1"):
        parts = engine_version.split(".")
        self.version_str = f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else "24.1"
        self.last_envelope_constructions: Dict[str, Construction] = {}

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

        return {
            "floor_area": round(floor_area, 4),
            "roof_area": round(roof_area, 4),
            "wall_area": round(wall_area, 4),
            "total_envelope_area": round(floor_area + roof_area + wall_area, 4),
            "volume": round(volume, 4),
            "peak_height": round(peak_height, 4),
        }

    def _parse_construction(
        self,
        raw_val: Any,
        surface_type: str,
        default_id: str,
        default_name: str,
    ) -> Construction:
        """Parse or construct a Construction object from a Construction instance, dictionary, or fallback default."""
        if isinstance(raw_val, Construction):
            return raw_val

        if isinstance(raw_val, dict):
            cid = raw_val.get("id") or raw_val.get("construction_id") or default_id
            cname = raw_val.get("name") or cid
            stype = raw_val.get("surface_type") or surface_type

            if "layers" in raw_val and isinstance(raw_val["layers"], list) and raw_val["layers"]:
                layer_specs: List[Tuple[Union[str, Material], float]] = []
                for lyr in raw_val["layers"]:
                    if isinstance(lyr, ConstructionLayer):
                        layer_specs.append((lyr.material, lyr.thickness))
                    elif isinstance(lyr, dict):
                        mat_spec = lyr.get("material") or lyr.get("material_id")
                        thickness = float(lyr.get("thickness", 0.1))
                        if isinstance(mat_spec, dict):
                            m_obj = material_db.create_custom_material(
                                name=mat_spec.get("name", f"CustomMat_{cid}"),
                                density=float(mat_spec["density"]),
                                thermal_conductivity=float(mat_spec.get("thermal_conductivity") or mat_spec.get("conductivity")),
                                specific_heat=float(mat_spec.get("specific_heat")),
                                source=mat_spec.get("source", "User Specification"),
                                provenance=mat_spec.get("provenance", "User Defined"),
                                material_id=mat_spec.get("id"),
                                thermal_absorptance=float(mat_spec.get("thermal_absorptance", 0.9)),
                                solar_absorptance=float(mat_spec.get("solar_absorptance", 0.7)),
                                visible_absorptance=float(mat_spec.get("visible_absorptance", 0.7)),
                                status=MaterialStatus.USER_DEFINED,
                            )
                            layer_specs.append((m_obj, thickness))
                        elif isinstance(mat_spec, Material):
                            layer_specs.append((mat_spec, thickness))
                        elif isinstance(mat_spec, str):
                            m_obj = material_db.get(mat_spec)
                            layer_specs.append((m_obj, thickness))
                        else:
                            raise ValueError(f"Unrecognized material specification in layer: {lyr}")
                    else:
                        raise ValueError(f"Invalid layer specification: {lyr}")

                return material_db.build_construction(
                    construction_id=cid,
                    name=cname,
                    surface_type=stype,
                    layer_specs=layer_specs,
                )

        # Fallback defaults based on surface type
        stype_upper = surface_type.upper()
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
        else:
            raise ValueError(f"Unknown surface type: '{surface_type}'")

    def resolve_envelope_constructions(
        self,
        shelter: Dict[str, Any],
        custom_constructions: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Construction]:
        """Resolve multi-layer constructions for all 6 envelope surfaces:
        north_wall, south_wall, east_wall, west_wall, roof, floor.
        """
        env = shelter.get("envelope", {})
        custom = custom_constructions or {}

        # Look for general wall specification
        general_wall_spec = custom.get("walls") or env.get("walls")
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

        roof_spec = custom.get("roof") or env.get("roof")
        floor_spec = custom.get("floor") or env.get("floor")

        return {
            "north_wall": self._parse_construction(north_spec, "WALL", "north-wall-const", "North Wall Construction"),
            "south_wall": self._parse_construction(south_spec, "WALL", "south-wall-const", "South Wall Construction"),
            "east_wall": self._parse_construction(east_spec, "WALL", "east-wall-const", "East Wall Construction"),
            "west_wall": self._parse_construction(west_spec, "WALL", "west-wall-const", "West Wall Construction"),
            "roof": self._parse_construction(roof_spec, "ROOF", "roof-const", "Roof Construction"),
            "floor": self._parse_construction(floor_spec, "FLOOR", "floor-const", "Floor Construction"),
        }

    def generate_idf(
        self,
        shelter: Dict[str, Any],
        output_path: str,
        run_period_days: int = 3,
        start_month: int = 1,
        start_day: int = 1,
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
        loc_name = loc.get("region", "Leh_Ladakh_IND").replace(" ", "_")

        # Compute geometry properties
        props = self.calculate_geometry_properties(length, width, height, roof_type, roof_angle)
        volume = props["volume"]

        # Resolve multi-layer envelope constructions for all 6 faces
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

        end_day = min(31, start_day + run_period_days - 1)

        idf_lines = [
            f"!- Generated by SIH 2026 Shelter Simulation Engine (Canonical ShelterModel)",
            f"!- Shelter Model: {shelter.get('name', 'Canonical Shelter')}",
            f"!- Geometry: {length}m x {width}m x {height}m | Orientation: {orientation} deg | Roof: {roof_type} ({roof_angle} deg)",
            f"!- Computed Volume: {volume} m3 | Floor Area: {props['floor_area']} m2",
            f"",
            f"Version, {self.version_str};",
            f"",
            f"Timestep, 4;",
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
            f"  AnnualSimulation,               !- Name",
            f"  {start_month},                  !- Begin Month",
            f"  {start_day},                    !- Begin Day of Month",
            f"  ,                               !- Begin Year",
            f"  {start_month},                  !- End Month",
            f"  {end_day},                      !- End Day of Month",
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
            f"  {props['peak_height']:.2f},     !- Ceiling Height {{m}}",
            f"  {volume:.2f};                   !- Volume {{m3}}",
            f"",
            f"GlobalGeometryRules,",
            f"  UpperLeftCorner,                !- Starting Vertex Position",
            f"  CounterClockWise,               !- Vertex Entry Direction",
            f"  World;                          !- Coordinate System",
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

        # Infiltration & internal gains
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
            f"  ,                               !- Flow per Zone Floor Area {{m3/s-m2}}",
            f"  ,                               !- Flow per Exterior Surface Area {{m3/s-m2}}",
            f"  0.5;                            !- Air Changes per Hour {{1/hr}}",
            f"",
            f"!- ==========================================================================",
            f"!- OUTPUT REQUESTS",
            f"!- ==========================================================================",
            f"Output:Variable, *, Zone Mean Air Temperature, Hourly;",
            f"Output:Variable, *, Site Outdoor Air Drybulb Temperature, Hourly;",
            f"Output:Variable, *, Site Direct Solar Radiation Rate per Area, Hourly;",
            f"Output:Variable, *, Site Diffuse Solar Radiation Rate per Area, Hourly;",
            f"Output:Variable, *, Surface Inside Face Conduction Heat Transfer Rate, Hourly;",
            f"Output:Variable, *, Surface Outside Face Conduction Heat Transfer Rate, Hourly;",
            f"Output:Table:SummaryReports, AllSummary;",
            f"OutputControl:Table:Style, HTML;",
            f"Output:VariableDictionary, Regular;",
            f"",
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
                f"!- East Wall (5-sided pentagon with gable end)",
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
                f"  {length:.3f}, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 1 (Ridge)",
                f"  {length:.3f}, 0.0, {height:.3f},          !- Vertex 2 (South Eaves)",
                f"  {length:.3f}, 0.0, 0.0,                   !- Vertex 3 (South Base)",
                f"  {length:.3f}, {width:.3f}, 0.0,           !- Vertex 4 (North Base)",
                f"  {length:.3f}, {width:.3f}, {height:.3f};  !- Vertex 5 (North Eaves)",
                f"",
                f"!- West Wall (5-sided pentagon with gable end)",
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
                f"  0.0, {y_mid:.3f}, {z_ridge:.3f}, !- Vertex 1 (Ridge)",
                f"  0.0, {width:.3f}, {height:.3f},  !- Vertex 2 (North Eaves)",
                f"  0.0, {width:.3f}, 0.0,           !- Vertex 3 (North Base)",
                f"  0.0, 0.0, 0.0,                   !- Vertex 4 (South Base)",
                f"  0.0, 0.0, {height:.3f};         !- Vertex 5 (South Eaves)",
                f"",
            ])

        return lines
