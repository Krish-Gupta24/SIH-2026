"""Tests for feature schema, design encoding, and domain validation."""

import pytest
from backend.ai.feature_schema import (
    DESIGN_BOUNDS,
    WALL_CONSTRUCTION_TYPES,
    ROOF_CONSTRUCTION_TYPES,
    GLAZING_TYPES,
    compute_derived_features,
    shelter_model_to_design_dict,
    design_dict_to_shelter_model,
    check_domain_bounds,
)


def test_design_bounds_integrity():
    """Verify that all continuous bounds have min < max and positive values."""
    for feat, (b_min, b_max, default_val) in DESIGN_BOUNDS.items():
        assert b_min < b_max, f"Invalid bounds for {feat}: {b_min} >= {b_max}"
        assert b_min <= default_val <= b_max, f"Default for {feat} out of range"


def test_derived_features_computation():
    """Test deterministic derived geometric and mass calculations."""
    params = {
        "length": 6.0,
        "width": 4.0,
        "height": 3.0,
        "orientation": 0.0,
        "wall_insulation_thickness": 0.10,
        "roof_insulation_thickness": 0.15,
        "floor_insulation_thickness": 0.10,
        "thermal_mass_thickness": 0.10,
        "window_area": 3.0,
        "infiltration_ach": 0.35,
        "occupants": 4.0,
        "wall_construction": "PUF_PANEL",
        "roof_construction": "INSULATED_SANDWICH",
        "glazing_type": "DOUBLE_LOW_E_ARGON",
        "thermal_mass_type": "HIGH_DENSITY_CONCRETE",
        "window_placement": "SOUTH_CONCENTRATED",
    }

    derived = compute_derived_features(params)
    assert derived["floor_area"] == 24.0  # 6 * 4
    assert derived["volume"] == 72.0  # 6 * 4 * 3
    # Wall area = 2*(6*3 + 4*3) = 60. Roof = 24. Floor = 24. Envelope = 108
    assert derived["envelope_area"] == 108.0
    assert derived["aspect_ratio"] == 1.5  # 6 / 4
    assert derived["window_to_wall_ratio"] == round(3.0 / 60.0, 4)
    assert derived["south_glazing_ratio"] == 0.80
    assert derived["estimated_envelope_mass"] > 0.0


def test_shelter_model_roundtrip_conversion():
    """Verify parameter preservation across ShelterModel <-> design dict."""
    original_params = {
        "length": 7.0,
        "width": 5.0,
        "height": 2.8,
        "orientation": 90.0,
        "wall_insulation_thickness": 0.15,
        "roof_insulation_thickness": 0.20,
        "floor_insulation_thickness": 0.12,
        "thermal_mass_thickness": 0.10,
        "window_area": 3.6,
        "infiltration_ach": 0.25,
        "occupants": 6.0,
        "wall_construction": "AEROGEL_BLANKET",
        "roof_construction": "COMPOSITE_PITCHED",
        "glazing_type": "TRIPLE_LOW_E_KRYPTON",
        "thermal_mass_type": "PHASE_CHANGE_MATERIAL",
        "window_placement": "SOUTH_CONCENTRATED",
    }

    shelter = design_dict_to_shelter_model(original_params)

    # Check top-level structures in shelter dict
    assert shelter["geometry"]["length"] == 7.0
    assert shelter["geometry"]["width"] == 5.0
    assert shelter["geometry"]["height"] == 2.8
    assert shelter["geometry"]["orientation"] == 90.0
    assert shelter["materials"]["wall_construction"] == "AEROGEL_BLANKET"
    assert shelter["materials"]["glazing_type"] == "TRIPLE_LOW_E_KRYPTON"
    assert shelter["ventilation"]["infiltration_ach"] == 0.25

    # Reverse convert
    recovered = shelter_model_to_design_dict(shelter)
    assert recovered["length"] == 7.0
    assert recovered["width"] == 5.0
    assert recovered["height"] == 2.8
    assert recovered["orientation"] == 90.0
    assert recovered["infiltration_ach"] == 0.25
    assert recovered["wall_construction"] == "AEROGEL_BLANKET"
    assert recovered["glazing_type"] == "TRIPLE_LOW_E_KRYPTON"


def test_domain_bounds_checking():
    """Verify boundary enforcement and warning generation for out-of-domain inputs."""
    in_domain_params = {
        "length": 6.0,
        "width": 4.0,
        "height": 2.8,
        "wall_construction": "PUF_PANEL",
        "roof_construction": "INSULATED_SANDWICH",
        "glazing_type": "DOUBLE_LOW_E_ARGON",
    }
    is_valid, conf, warnings = check_domain_bounds(in_domain_params)
    assert is_valid is True
    assert conf == 1.0
    assert len(warnings) == 0

    # Test out-of-bounds parameter
    out_of_bounds = {
        "length": 15.0,  # Max is 10.0
        "width": 2.0,   # Min is 3.0
        "wall_construction": "UNKNOWN_MATERIAL",
    }
    is_valid_ood, conf_ood, warnings_ood = check_domain_bounds(out_of_bounds)
    assert is_valid_ood is False
    assert conf_ood < 1.0
    assert any("length" in w for w in warnings_ood)
    assert any("width" in w for w in warnings_ood)
    assert any("UNKNOWN_MATERIAL" in w for w in warnings_ood)
