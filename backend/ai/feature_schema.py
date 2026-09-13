"""Canonical design schema, feature extraction, and target definitions for the AI Engine.

This module acts as the Single Source of Truth synchronizing UI, ShelterModel,
Material Database, EnergyPlus generator, and ML feature representations.
"""

from dataclasses import asdict, dataclass
import math
from typing import Any, Dict, List, Optional, Tuple


# ==============================================================================
# 1. CANONICAL CATEGORICAL OPTIONS & ENCODING MAPS
# ==============================================================================

WALL_CONSTRUCTION_TYPES = [
    "PUF_PANEL",
    "AEROGEL_BLANKET",
    "VACUUM_INSULATION",
    "ROCKWOOL_COMPOSITE",
]

ROOF_CONSTRUCTION_TYPES = [
    "INSULATED_SANDWICH",
    "COMPOSITE_PITCHED",
    "HEAVY_TIMBER_INSULATED",
]

GLAZING_TYPES = [
    "DOUBLE_LOW_E_ARGON",
    "TRIPLE_LOW_E_KRYPTON",
    "VACUUM_INSULATED_GLAZING",
]

THERMAL_MASS_TYPES = [
    "HIGH_DENSITY_CONCRETE",
    "PHASE_CHANGE_MATERIAL",
    "WATER_WALL",
    "NONE",
]

WINDOW_PLACEMENTS = [
    "SOUTH_CONCENTRATED",
    "DISTRIBUTED",
]

# Material density approximations for envelope mass calculation (kg/m3)
MATERIAL_DENSITIES = {
    "PUF_PANEL": 40.0,
    "AEROGEL_BLANKET": 150.0,
    "VACUUM_INSULATION": 180.0,
    "ROCKWOOL_COMPOSITE": 120.0,
    "INSULATED_SANDWICH": 60.0,
    "COMPOSITE_PITCHED": 140.0,
    "HEAVY_TIMBER_INSULATED": 450.0,
    "HIGH_DENSITY_CONCRETE": 2400.0,
    "PHASE_CHANGE_MATERIAL": 900.0,
    "WATER_WALL": 1000.0,
    "NONE": 0.0,
    "STRUCTURAL_STEEL_SKIN": 7850.0,
    "GLAZING_UNIT": 2500.0,
}


# ==============================================================================
# 2. CONTINUOUS DESIGN FEATURE BOUNDS
# ==============================================================================

DESIGN_BOUNDS: Dict[str, Tuple[float, float, float]] = {
    # feature_name: (min_value, max_value, default_value)
    "length": (4.0, 10.0, 6.0),
    "width": (3.0, 7.0, 4.0),
    "height": (2.4, 3.6, 2.8),
    "orientation": (0.0, 355.0, 0.0),
    "wall_insulation_thickness": (0.05, 0.25, 0.12),
    "roof_insulation_thickness": (0.05, 0.30, 0.15),
    "floor_insulation_thickness": (0.05, 0.25, 0.10),
    "thermal_mass_thickness": (0.05, 0.20, 0.10),
    "window_area": (1.0, 5.0, 2.4),
    "infiltration_ach": (0.15, 0.80, 0.35),
    "occupants": (2.0, 8.0, 4.0),
}


# ==============================================================================
# 3. FEATURE NAMES REGISTRY
# ==============================================================================

CONTINUOUS_DESIGN_FEATURES = list(DESIGN_BOUNDS.keys())
CATEGORICAL_DESIGN_FEATURES = [
    "wall_construction",
    "roof_construction",
    "glazing_type",
    "thermal_mass_type",
    "window_placement",
]

DERIVED_PHYSICAL_FEATURES = [
    "floor_area",
    "envelope_area",
    "volume",
    "surface_to_volume_ratio",
    "aspect_ratio",
    "window_to_wall_ratio",
    "south_glazing_ratio",
    "estimated_envelope_mass",
]

PHYSICAL_CLIMATE_FEATURES = [
    "latitude",
    "longitude",
    "elevation_m",
    "outdoor_temp_mean_c",
    "outdoor_temp_min_c",
    "outdoor_temp_max_c",
    "outdoor_temp_diurnal_range_c",
    "winter_temp_mean_c",
    "winter_temp_min_c",
    "global_horizontal_solar_mean_w_m2",
    "winter_solar_mean_w_m2",
    "wind_speed_mean_m_s",
    "relative_humidity_mean_pct",
    "heating_degree_days_base18",
]

ALL_ML_INPUT_FEATURES = (
    CONTINUOUS_DESIGN_FEATURES
    + CATEGORICAL_DESIGN_FEATURES
    + DERIVED_PHYSICAL_FEATURES
    + PHYSICAL_CLIMATE_FEATURES
)


# ==============================================================================
# 4. REGIME-AWARE TARGET SPECIFICATIONS
# ==============================================================================

WINTER_MODEL_TARGETS = [
    "winter_indoor_min_c",
    "winter_indoor_mean_c",
    "winter_heating_demand_kwh_m2",
    "winter_comfort_hours_pct",
]

ANNUAL_MODEL_TARGETS = [
    "annual_heating_demand_kwh_m2",
    "annual_comfort_hours_pct",
]

ALL_TARGETS = WINTER_MODEL_TARGETS + ANNUAL_MODEL_TARGETS + ["envelope_heat_loss_rate_ua"]


# ==============================================================================
# 5. CONVERSION & DERIVED FEATURE CALCULATION FUNCTIONS
# ==============================================================================

def compute_derived_features(params: Dict[str, Any]) -> Dict[str, float]:
    """Computes deterministic physical geometric and thermal mass properties."""
    length = float(params["length"])
    width = float(params["width"])
    height = float(params["height"])
    window_area = float(params["window_area"])
    wall_thick = float(params["wall_insulation_thickness"])
    roof_thick = float(params["roof_insulation_thickness"])
    floor_thick = float(params["floor_insulation_thickness"])
    tm_thick = float(params.get("thermal_mass_thickness", 0.10))
    tm_type = str(params.get("thermal_mass_type", "HIGH_DENSITY_CONCRETE"))
    wall_type = str(params.get("wall_construction", "PUF_PANEL"))
    roof_type = str(params.get("roof_construction", "INSULATED_SANDWICH"))
    window_placement = str(params.get("window_placement", "SOUTH_CONCENTRATED"))

    floor_area = length * width
    wall_area = 2.0 * (length * height + width * height)
    roof_area = length * width
    envelope_area = wall_area + roof_area + floor_area
    volume = length * width * height

    surface_to_volume = envelope_area / volume if volume > 0 else 0.0
    aspect_ratio = length / width if width > 0 else 1.0
    wwr = window_area / wall_area if wall_area > 0 else 0.0

    south_glazing_ratio = 0.80 if window_placement == "SOUTH_CONCENTRATED" else 0.25

    # Estimated Envelope Mass (kg):
    # Wall mass = wall_area * wall_thick * wall_density + steel skin (0.8mm * 2 * 7850)
    wall_density = MATERIAL_DENSITIES.get(wall_type, 50.0)
    wall_mass = wall_area * (wall_thick * wall_density + 0.0016 * MATERIAL_DENSITIES["STRUCTURAL_STEEL_SKIN"])

    # Roof mass = roof_area * roof_thick * roof_density
    roof_density = MATERIAL_DENSITIES.get(roof_type, 80.0)
    roof_mass = roof_area * (roof_thick * roof_density + 0.0016 * MATERIAL_DENSITIES["STRUCTURAL_STEEL_SKIN"])

    # Floor mass
    floor_mass = floor_area * (floor_thick * 120.0 + 0.003 * MATERIAL_DENSITIES["STRUCTURAL_STEEL_SKIN"])

    # Thermal mass
    tm_density = MATERIAL_DENSITIES.get(tm_type, 0.0)
    tm_mass = (floor_area * 0.5) * tm_thick * tm_density if tm_type != "NONE" else 0.0

    # Glazing mass
    glazing_mass = window_area * 0.012 * MATERIAL_DENSITIES["GLAZING_UNIT"]

    total_envelope_mass = round(wall_mass + roof_mass + floor_mass + tm_mass + glazing_mass, 1)

    return {
        "floor_area": round(floor_area, 2),
        "envelope_area": round(envelope_area, 2),
        "volume": round(volume, 2),
        "surface_to_volume_ratio": round(surface_to_volume, 3),
        "aspect_ratio": round(aspect_ratio, 2),
        "window_to_wall_ratio": round(wwr, 4),
        "south_glazing_ratio": round(south_glazing_ratio, 2),
        "estimated_envelope_mass": total_envelope_mass,
    }


def shelter_model_to_design_dict(shelter: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts design features from canonical ShelterModel dictionary."""
    geom = shelter.get("geometry", {})
    materials = shelter.get("materials", {})
    layers = materials.get("layers", {})
    doors = shelter.get("doors", [])
    vent = shelter.get("ventilation", {})
    occ = shelter.get("occupancy", {})

    # Dimensions
    length = float(geom.get("length", 6.0))
    width = float(geom.get("width", 4.0))
    height = float(geom.get("height", 2.8))
    orientation = float(geom.get("orientation", 0.0))

    # Insulation thicknesses
    env = shelter.get("envelope", {})
    env_walls = env.get("walls", {})
    env_roof = env.get("roof", {})
    env_floor = env.get("floor", {})

    # Extract wall thickness
    if env_walls and "layers" in env_walls and len(env_walls["layers"]) >= 2:
        wall_thick = float(env_walls["layers"][1].get("thickness", 0.12))
    else:
        wall_layer = layers.get("wall", [{}])
        wall_thick = float(wall_layer[0].get("thickness", 0.12)) if wall_layer else 0.12

    # Extract roof thickness
    if env_roof and "layers" in env_roof and len(env_roof["layers"]) >= 2:
        roof_thick = float(env_roof["layers"][1].get("thickness", 0.15))
    else:
        roof_layer = layers.get("roof", [{}])
        roof_thick = float(roof_layer[0].get("thickness", 0.15)) if roof_layer else 0.15

    # Extract floor thickness
    if env_floor and "layers" in env_floor and len(env_floor["layers"]) >= 2:
        floor_thick = float(env_floor["layers"][1].get("thickness", 0.10))
    else:
        floor_layer = layers.get("floor", [{}])
        floor_thick = float(floor_layer[0].get("thickness", 0.10)) if floor_layer else 0.10

    # Thermal mass
    tm = shelter.get("thermal_mass") or shelter.get("thermalMass") or {}
    tm_type = tm.get("type", "HIGH_DENSITY_CONCRETE")
    if tm_type not in THERMAL_MASS_TYPES:
        tm_type = "HIGH_DENSITY_CONCRETE"
    tm_thick = float(tm.get("thickness", 0.10))

    # Windows
    windows = shelter.get("windows", [])
    total_window_area = sum(float(w.get("width", 1.2)) * float(w.get("height", 1.0)) for w in windows)
    if total_window_area <= 0:
        total_window_area = 2.4

    # Check window placement: mostly south?
    south_windows = [w for w in windows if w.get("wall", "south").lower() in ("south", "s")]
    window_placement = "SOUTH_CONCENTRATED" if len(south_windows) >= len(windows) / 2 else "DISTRIBUTED"

    # Infiltration
    ach = float(vent.get("infiltration_ach", vent.get("infiltrationACH", 0.35)))

    # Construction types
    wall_type = materials.get("wall_construction", "PUF_PANEL")
    if wall_type not in WALL_CONSTRUCTION_TYPES:
        wall_type = "PUF_PANEL"

    roof_type = materials.get("roof_construction", "INSULATED_SANDWICH")
    if roof_type not in ROOF_CONSTRUCTION_TYPES:
        roof_type = "INSULATED_SANDWICH"

    glazing_type = materials.get("glazing_type", "DOUBLE_LOW_E_ARGON")
    if glazing_type not in GLAZING_TYPES:
        glazing_type = "DOUBLE_LOW_E_ARGON"

    occupants = float(occ.get("count", 4.0))

    params = {
        "length": length,
        "width": width,
        "height": height,
        "orientation": orientation,
        "wall_insulation_thickness": wall_thick,
        "roof_insulation_thickness": roof_thick,
        "floor_insulation_thickness": floor_thick,
        "thermal_mass_thickness": tm_thick,
        "window_area": total_window_area,
        "infiltration_ach": ach,
        "occupants": occupants,
        "wall_construction": wall_type,
        "roof_construction": roof_type,
        "glazing_type": glazing_type,
        "thermal_mass_type": tm_type,
        "window_placement": window_placement,
    }

    derived = compute_derived_features(params)
    params.update(derived)
    return params


def design_dict_to_shelter_model(params: Dict[str, Any], base_name: str = "AI_Generated_Shelter") -> Dict[str, Any]:
    """Decodes design parameters back into a canonical ShelterModel dictionary."""
    length = float(params["length"])
    width = float(params["width"])
    height = float(params["height"])
    orientation = float(params["orientation"])
    wall_thick = float(params["wall_insulation_thickness"])
    roof_thick = float(params["roof_insulation_thickness"])
    floor_thick = float(params["floor_insulation_thickness"])
    tm_thick = float(params.get("thermal_mass_thickness", 0.10))
    window_area = float(params["window_area"])
    ach = float(params["infiltration_ach"])
    occupants = int(round(float(params.get("occupants", 4.0))))

    wall_type = str(params.get("wall_construction", "PUF_PANEL"))
    roof_type = str(params.get("roof_construction", "INSULATED_SANDWICH"))
    glazing_type = str(params.get("glazing_type", "DOUBLE_LOW_E_ARGON"))
    tm_type = str(params.get("thermal_mass_type", "HIGH_DENSITY_CONCRETE"))
    window_placement = str(params.get("window_placement", "SOUTH_CONCENTRATED"))

    # Create window list matching target window_area
    # Constrain window dimensions to safely fit inside wall geometry
    max_h = max(0.8, min(1.2, height - 1.2))
    win_w = 1.0
    win_h = max_h
    num_windows = max(1, int(round(window_area / (win_w * win_h))))

    windows = []
    if window_placement == "SOUTH_CONCENTRATED":
        # Distribute along south wall (length)
        avail_len = length - 1.0  # 0.5m margin on both ends
        effective_w = min(win_w, avail_len / num_windows - 0.2)
        spacing = (avail_len - num_windows * effective_w) / (num_windows + 1)
        for i in range(num_windows):
            pos_x = 0.5 + (i + 1) * spacing + i * effective_w
            windows.append({
                "id": f"win_south_{i+1}",
                "wall": "south",
                "width": round(effective_w, 2),
                "height": round(win_h, 2),
                "position_x": round(pos_x, 2),
                "sill_height": 0.9,
                "glazing_type": glazing_type,
            })
    else:
        # Distributed across south, north, west (leaving east for door)
        candidate_walls = ["south", "north", "west"]
        for i in range(num_windows):
            wall_target = candidate_walls[i % len(candidate_walls)]
            wall_len = length if wall_target in ("south", "north") else width
            pos_x = max(0.5, (wall_len - win_w) / 2.0)
            windows.append({
                "id": f"win_{wall_target}_{i+1}",
                "wall": wall_target,
                "width": round(min(win_w, wall_len - 1.0), 2),
                "height": round(win_h, 2),
                "position_x": round(pos_x, 2),
                "sill_height": 0.9,
                "glazing_type": glazing_type,
            })

    # Map construction categories to authentic material IDs from material_db
    wall_mat_map = {
        "PUF_PANEL": "mat-polyurethane-foam",
        "AEROGEL_BLANKET": "mat-aerogel-blanket",
        "VACUUM_INSULATION": "mat-vip-panel",
        "ROCKWOOL_COMPOSITE": "mat-mineral-wool",
    }
    wall_mat_id = wall_mat_map.get(wall_type, "mat-polyurethane-foam")

    roof_mat_map = {
        "INSULATED_SANDWICH": "mat-polyurethane-foam",
        "COMPOSITE_PITCHED": "mat-mineral-wool",
        "HEAVY_TIMBER_INSULATED": "mat-eps-insulation",
    }
    roof_mat_id = roof_mat_map.get(roof_type, "mat-polyurethane-foam")

    shelter_model = {
        "id": f"shelter_{abs(hash(str(params))) % 1000000}",
        "name": base_name,
        "geometry": {
            "length": length,
            "width": width,
            "height": height,
            "orientation": orientation,
            "roof_type": "flat",
            "roof_angle": 0.0,
        },
        "envelope": {
            "walls": {
                "id": f"const_wall_{wall_type.lower()}",
                "name": f"{wall_type} Wall Construction",
                "layers": [
                    {"material_id": "mat-galvanized-steel", "thickness": 0.002},
                    {"material_id": wall_mat_id, "thickness": wall_thick},
                    {"material_id": "mat-gypsum-board", "thickness": 0.012},
                ],
            },
            "roof": {
                "id": f"const_roof_{roof_type.lower()}",
                "name": f"{roof_type} Roof Construction",
                "layers": [
                    {"material_id": "mat-galvanized-steel", "thickness": 0.002},
                    {"material_id": roof_mat_id, "thickness": roof_thick},
                    {"material_id": "mat-timber-deck", "thickness": 0.020},
                ],
            },
            "floor": {
                "id": "const_floor_insulated",
                "name": "Insulated Foundation Slab",
                "layers": [
                    {"material_id": "mat-concrete-slab", "thickness": 0.12},
                    {"material_id": "mat-xps-insulation", "thickness": floor_thick},
                ],
            },
        },
        "materials": {
            "wall_construction": wall_type,
            "roof_construction": roof_type,
            "glazing_type": glazing_type,
        },
        "thermal_mass": {
            "type": tm_type,
            "thickness": tm_thick,
            "surface": "floor",
        },
        "windows": windows,
        "doors": [
            {
                "id": "door_main",
                "wall": "east",
                "width": 0.9,
                "height": 2.0,
                "position_x": 0.5,
                "construction": "insulated_door",
            }
        ],
        "ventilation": {
            "infiltration_ach": ach,
            "natural_ventilation_enabled": False,
            "mechanical_ventilation_enabled": False,
        },
        "occupancy": {
            "count": occupants,
            "activity": "Sedentary",
        },
    }

    return shelter_model


def check_domain_bounds(params: Dict[str, Any]) -> Tuple[bool, float, List[str]]:
    """Checks whether a parameter dictionary is within the valid training domain.

    Returns:
        (is_in_domain, confidence_score, warnings)
    """
    warnings = []
    penalty = 0.0

    for feat, (b_min, b_max, _) in DESIGN_BOUNDS.items():
        if feat in params:
            val = float(params[feat])
            if val < b_min:
                warnings.append(f"{feat} ({val}) is below minimum training bound ({b_min})")
                penalty += (b_min - val) / (b_max - b_min)
            elif val > b_max:
                warnings.append(f"{feat} ({val}) exceeds maximum training bound ({b_max})")
                penalty += (val - b_max) / (b_max - b_min)

    # Check categoricals
    if params.get("wall_construction") not in WALL_CONSTRUCTION_TYPES:
        warnings.append(f"wall_construction '{params.get('wall_construction')}' not in recognized set")
        penalty += 0.2
    if params.get("roof_construction") not in ROOF_CONSTRUCTION_TYPES:
        warnings.append(f"roof_construction '{params.get('roof_construction')}' not in recognized set")
        penalty += 0.2
    if params.get("glazing_type") not in GLAZING_TYPES:
        warnings.append(f"glazing_type '{params.get('glazing_type')}' not in recognized set")
        penalty += 0.2

    confidence = max(0.0, min(1.0, 1.0 - penalty))
    is_in_domain = len(warnings) == 0

    return is_in_domain, round(confidence, 3), warnings
