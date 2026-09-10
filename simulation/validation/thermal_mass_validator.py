"""Physical thermal mass validation module.

Validates that internal thermal mass elements (floor slabs, internal mass partition walls,
Trombe storage, etc.) have valid materials, non-zero positive geometry/areas, physically
sound penetration thicknesses, and zone exposure parameters without arbitrary fabrications.
"""

import math
from typing import Any, Dict, List, Optional, Tuple, Union
from simulation.materials.database import material_db


class ThermalMassValidator:
    """Validates thermal mass representations and inputs for physics engine integrity."""

    MAX_THICKNESS_M = 1.50
    MIN_THICKNESS_M = 0.005
    MAX_SURFACE_AREA_M2 = 1000.0
    MIN_SURFACE_AREA_M2 = 0.05

    KNOWN_MASS_TYPES = {
        "floorslab", "floor_slab", "floor",
        "internalpartition", "internal_partition", "partition", "partition_wall",
        "internalexposedmass", "internal_exposed_mass", "exposed_mass",
        "internal_wall", "mass_wall", "trombe_wall", "core", "internalmass",
    }

    KNOWN_STRING_PRESETS = {
        "medium_concrete_slab", "internal_mass_concrete_slab", "default_concrete_floor",
        "high_mass_rammed_earth", "rammed_earth_300mm", "internal_mass_rammed_earth",
        "internal_mass_brick_wall", "internal_mass_stone_masonry",
        "lightweight_timber", "lightweight_timber_mass", "high_mass_rammed_earth_pcm",
    }

    @classmethod
    def validate_thermal_mass(cls, shelter_model: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate thermal mass elements inside a shelter model.

        Returns (is_valid, list_of_error_messages).
        """
        errors: List[str] = []
        raw_tm = shelter_model.get("thermal_mass") or shelter_model.get("thermalMass")

        # Optional attribute - no mass is physically acceptable (e.g. lightweight tent)
        if raw_tm is None:
            return True, []

        # 1. String Preset specification
        if isinstance(raw_tm, str):
            clean_str = raw_tm.strip().lower().replace("-", "_").replace(" ", "_")
            if not clean_str:
                return True, []
            # Check if recognized preset or known material
            if clean_str in cls.KNOWN_STRING_PRESETS or clean_str in material_db.STANDARD_CONSTRUCTIONS:
                return True, []
            try:
                material_db.get(raw_tm)
                return True, []
            except KeyError:
                errors.append(
                    f"Invalid thermal mass preset or material '{raw_tm}'. "
                    f"Must be a known preset ({sorted(cls.KNOWN_STRING_PRESETS)}) or verified material ID."
                )
            return len(errors) == 0, errors

        # 2. Element list or dictionary
        if isinstance(raw_tm, dict):
            elements = [raw_tm]
        elif isinstance(raw_tm, list):
            elements = raw_tm
        else:
            errors.append(f"Invalid 'thermal_mass' data type: {type(raw_tm).__name__}. Expected list, dict, or string.")
            return False, errors

        for idx, el in enumerate(elements):
            prefix = f"Thermal mass element #{idx + 1}"
            if not isinstance(el, dict):
                errors.append(f"{prefix} must be a dictionary, got {type(el).__name__}.")
                continue

            el_id = el.get("id") or el.get("name") or f"mass_{idx + 1}"
            prefix = f"Thermal mass element '{el_id}'"

            # Validate thickness
            thickness_raw = el.get("thickness")
            if thickness_raw is None:
                errors.append(f"{prefix} is missing required 'thickness' specification.")
            else:
                try:
                    t_val = float(thickness_raw)
                    if math.isnan(t_val) or math.isinf(t_val):
                        errors.append(f"{prefix} has non-finite thickness: {thickness_raw}.")
                    elif t_val < cls.MIN_THICKNESS_M:
                        errors.append(
                            f"{prefix} has non-positive or too thin thickness: {t_val:.4f} m. "
                            f"Must be >= {cls.MIN_THICKNESS_M} m."
                        )
                    elif t_val > cls.MAX_THICKNESS_M:
                        errors.append(
                            f"{prefix} thickness {t_val:.4f} m exceeds maximum physical limit ({cls.MAX_THICKNESS_M} m)."
                        )
                except (ValueError, TypeError):
                    errors.append(f"{prefix} has non-numeric thickness: {thickness_raw}.")

            # Validate surface area
            area_raw = (
                el.get("surfaceArea")
                or el.get("surface_area")
                or el.get("area_m2")
                or el.get("area")
            )
            if area_raw is None:
                # If area is omitted, check if type is FloorSlab where floor area might be inferred
                el_type = str(el.get("type", "")).strip().lower().replace("-", "_")
                if el_type not in ("floorslab", "floor_slab", "floor"):
                    errors.append(f"{prefix} is missing required surface area specification.")
            else:
                try:
                    a_val = float(area_raw)
                    if math.isnan(a_val) or math.isinf(a_val):
                        errors.append(f"{prefix} has non-finite surface area: {area_raw}.")
                    elif a_val < cls.MIN_SURFACE_AREA_M2:
                        errors.append(
                            f"{prefix} has non-positive or zero surface area: {a_val:.4f} m2. "
                            f"Must be >= {cls.MIN_SURFACE_AREA_M2} m2."
                        )
                    elif a_val > cls.MAX_SURFACE_AREA_M2:
                        errors.append(
                            f"{prefix} surface area {a_val:.2f} m2 exceeds maximum limit ({cls.MAX_SURFACE_AREA_M2} m2)."
                        )
                except (ValueError, TypeError):
                    errors.append(f"{prefix} has non-numeric surface area: {area_raw}.")

            # Validate exposed fraction / exposure if provided
            ef_raw = el.get("exposed_fraction")
            if ef_raw is not None:
                try:
                    ef_val = float(ef_raw)
                    if math.isnan(ef_val) or math.isinf(ef_val) or ef_val <= 0.0 or ef_val > 2.0:
                        errors.append(
                            f"{prefix} has invalid exposed_fraction: {ef_raw}. Must be in range (0.0, 2.0]."
                        )
                except (ValueError, TypeError):
                    errors.append(f"{prefix} has non-numeric exposed_fraction: {ef_raw}.")

            # Validate material
            mat_spec = el.get("materialId") or el.get("material_id") or el.get("material") or el.get("materialName")
            if not mat_spec:
                errors.append(f"{prefix} is missing required material specification.")
            elif isinstance(mat_spec, str):
                try:
                    material_db.get(mat_spec)
                except KeyError:
                    errors.append(
                        f"{prefix} references unknown material '{mat_spec}'. "
                        f"Must be a verified material in material database."
                    )
            elif isinstance(mat_spec, dict):
                # Custom material dictionary
                for prop in ("density", "thermal_conductivity", "specific_heat"):
                    pval = mat_spec.get(prop)
                    if pval is None:
                        errors.append(f"{prefix} custom material is missing required property '{prop}'.")
                    else:
                        try:
                            f_pval = float(pval)
                            if math.isnan(f_pval) or math.isinf(f_pval) or f_pval <= 0.0:
                                errors.append(f"{prefix} custom material property '{prop}' must be > 0.")
                        except (ValueError, TypeError):
                            errors.append(f"{prefix} custom material property '{prop}' must be numeric.")
            else:
                errors.append(f"{prefix} has invalid material type {type(mat_spec).__name__}.")

            # Validate type / location if provided
            type_raw = el.get("type") or el.get("location")
            if type_raw and isinstance(type_raw, str):
                cleaned_type = type_raw.strip().lower().replace("-", "_")
                # We allow known types or any reasonable custom identifier, but reject nonsense
                if len(cleaned_type) < 2:
                    errors.append(f"{prefix} has invalid type/location identifier: '{type_raw}'.")

        return len(errors) == 0, errors

    @classmethod
    def normalize_thermal_mass(
        cls,
        raw_tm: Any,
        floor_area: float = 24.0,
    ) -> List[Dict[str, Any]]:
        """Normalize various thermal mass input schemas into uniform dictionaries."""
        if not raw_tm:
            return []

        # String preset conversion
        if isinstance(raw_tm, str):
            preset_key = raw_tm.strip().lower().replace("-", "_").replace(" ", "_")
            if preset_key in ("medium_concrete_slab", "internal_mass_concrete_slab", "default_concrete_floor"):
                return [{
                    "id": "tmass_concrete_slab",
                    "name": "Medium Concrete Floor Slab Mass",
                    "type": "FloorSlab",
                    "material_id": "mat-concrete-slab",
                    "thickness": 0.15,
                    "surface_area": floor_area,
                    "exposed_fraction": 1.0,
                }]
            elif preset_key in ("high_mass_rammed_earth", "rammed_earth_300mm", "internal_mass_rammed_earth", "high_mass_rammed_earth_pcm"):
                return [
                    {
                        "id": "tmass_floor_slab",
                        "name": "Heavy Concrete Sub-Slab",
                        "type": "FloorSlab",
                        "material_id": "mat-concrete-slab",
                        "thickness": 0.15,
                        "surface_area": floor_area,
                        "exposed_fraction": 1.0,
                    },
                    {
                        "id": "tmass_rammed_earth_partition",
                        "name": "Heavy Rammed Earth Internal Partition",
                        "type": "InternalPartition",
                        "material_id": "mat-rammed-earth",
                        "thickness": 0.30,
                        "surface_area": round(floor_area * 0.8, 2),
                        "exposed_fraction": 1.0,
                    }
                ]
            elif preset_key in ("internal_mass_brick_wall",):
                return [{
                    "id": "tmass_brick_partition",
                    "name": "Internal Dense Brick Mass Wall",
                    "type": "InternalPartition",
                    "material_id": "mat-dense-brick",
                    "thickness": 0.20,
                    "surface_area": round(floor_area * 0.6, 2),
                    "exposed_fraction": 1.0,
                }]
            elif preset_key in ("internal_mass_stone_masonry",):
                return [{
                    "id": "tmass_stone_wall",
                    "name": "Internal Granite Stone Mass Wall",
                    "type": "InternalPartition",
                    "material_id": "mat-granite-stone",
                    "thickness": 0.25,
                    "surface_area": round(floor_area * 0.6, 2),
                    "exposed_fraction": 1.0,
                }]
            elif preset_key in ("lightweight_timber", "lightweight_timber_mass"):
                return [{
                    "id": "tmass_lightweight_timber",
                    "name": "Lightweight Timber Internal Mass",
                    "type": "InternalPartition",
                    "material_id": "mat-himalayan-timber",
                    "thickness": 0.025,
                    "surface_area": floor_area,
                    "exposed_fraction": 1.0,
                }]
            else:
                # Direct material lookup
                try:
                    mat = material_db.get(raw_tm)
                    return [{
                        "id": f"tmass_{mat.id}",
                        "name": f"Thermal Mass ({mat.name})",
                        "type": "InternalPartition",
                        "material_id": mat.id,
                        "thickness": 0.15,
                        "surface_area": floor_area,
                        "exposed_fraction": 1.0,
                    }]
                except KeyError:
                    return []

        raw_list = [raw_tm] if isinstance(raw_tm, dict) else raw_tm
        normalized: List[Dict[str, Any]] = []

        for idx, item in enumerate(raw_list):
            if not isinstance(item, dict):
                continue
            item_id = item.get("id") or item.get("name") or f"tmass_{idx + 1}"
            mat_id = (
                item.get("materialId")
                or item.get("material_id")
                or item.get("material")
                or item.get("materialName")
                or "mat-concrete-slab"
            )
            thickness = float(item.get("thickness") or 0.15)
            area = float(
                item.get("surfaceArea")
                or item.get("surface_area")
                or item.get("area_m2")
                or item.get("area")
                or floor_area
            )
            exp_frac = float(item.get("exposed_fraction") or 1.0)
            mtype = item.get("type") or item.get("location") or "InternalPartition"

            normalized.append({
                "id": str(item_id),
                "name": item.get("name") or f"Thermal Mass #{idx + 1}",
                "type": str(mtype),
                "material_id": mat_id,
                "thickness": thickness,
                "surface_area": area,
                "exposed_fraction": exp_frac,
            })

        return normalized
