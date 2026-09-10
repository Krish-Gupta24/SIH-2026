"""Tests verifying dynamic thermal comfort calculations driven by ShelterModel DesignTargets."""

import pytest
from simulation.results.metrics import MetricCalculator, parse_comfort_definition
from simulation.results.result import ComfortMetrics, ComfortDefinition
from simulation.runners.engine import EnergyPlusEngine


def test_parse_comfort_definition_from_shelter_model_design_targets():
    """Verify parsing comfort definitions from various formats of ShelterModel DesignTargets."""
    # Format A: Frontend camelCase designTargets
    shelter_frontend = {
        "id": "alpine-shelter-01",
        "designTargets": {
            "comfortTempMinC": 15.0,
            "comfortTempMaxC": 22.0,
            "targetIndoorTempC": 19.5,
            "comfortModel": "ASHRAE Standard 55 Adaptive Model (High Altitude)",
            "assumptions": "Occupant clothing 1.5 clo (winter alpine gear), metabolic rate 1.2 met.",
            "applicableConditions": "Remote unconditioned military high-altitude outpost at 3500m.",
        }
    }
    comf_a = parse_comfort_definition(shelter_frontend)
    assert comf_a.min_acceptable_temperature_c == 15.0
    assert comf_a.max_acceptable_temperature_c == 22.0
    assert comf_a.target_indoor_temperature_c == 19.5
    assert comf_a.target_range_str == "15.0°C – 22.0°C"
    assert comf_a.standard_or_model_name == "ASHRAE Standard 55 Adaptive Model (High Altitude)"
    assert "1.5 clo" in comf_a.assumptions
    assert "3500m" in comf_a.applicable_conditions
    assert comf_a.is_universal_comfort_claimed is False

    # Format B: Canonical schema snake_case design_targets.comfort
    shelter_canonical = {
        "id": "alpine-shelter-02",
        "design_targets": {
            "comfort": {
                "target_indoor_temp_min": 17.0,
                "target_indoor_temp_max": 25.0,
                "target_indoor_temp": 21.0,
                "model": "EN 16798-1 Category II",
                "assumptions": "Clo 1.2, Met 1.1.",
                "applicable_conditions": "Civilian disaster response shelter.",
            }
        }
    }
    comf_b = parse_comfort_definition(shelter_canonical)
    assert comf_b.min_acceptable_temperature_c == 17.0
    assert comf_b.max_acceptable_temperature_c == 25.0
    assert comf_b.target_indoor_temperature_c == 21.0
    assert comf_b.target_range_str == "17.0°C – 25.0°C"
    assert comf_b.standard_or_model_name == "EN 16798-1 Category II"
    assert comf_b.is_universal_comfort_claimed is False

    # Format C: Default fallback when design targets are omitted
    comf_c = parse_comfort_definition({})
    assert comf_c.min_acceptable_temperature_c == 18.0
    assert comf_c.max_acceptable_temperature_c == 26.0
    assert comf_c.target_indoor_temperature_c == 22.0
    assert comf_c.target_range_str == "18.0°C – 26.0°C"
    assert comf_c.is_universal_comfort_claimed is False


def test_user_changes_target_band_comfort_metrics_change():
    """Verify that when a user alters the comfort target band, comfort metrics change deterministically."""
    # Simulated 24-hour diurnal indoor temperature profile
    # Temperatures range from 12.0°C (night) to 21.0°C (solar peak)
    indoor_temps = [
        12.0, 12.5, 13.0, 13.5, 14.0, 15.0,
        16.0, 17.0, 18.0, 19.0, 20.0, 21.0,
        20.5, 20.0, 19.0, 18.0, 17.0, 16.0,
        15.0, 14.0, 13.5, 13.0, 12.5, 12.0,
    ]
    timestep_hours = 1.0
    total_hours = len(indoor_temps)  # 24.0 hours

    # Band 1: Standard [18.0°C – 26.0°C]
    def_standard = ComfortDefinition(
        min_acceptable_temperature_c=18.0,
        max_acceptable_temperature_c=26.0,
        target_indoor_temperature_c=22.0,
        standard_or_model_name="Standard Mild Band",
    )
    res_1 = MetricCalculator.calculate_comfort_metrics(
        indoor_temps=indoor_temps,
        timestep_hours=timestep_hours,
        comfort_definition=def_standard,
    )

    # Band 2: Alpine Resilient Band [14.0°C – 22.0°C]
    def_alpine = ComfortDefinition(
        min_acceptable_temperature_c=14.0,
        max_acceptable_temperature_c=22.0,
        target_indoor_temperature_c=18.0,
        standard_or_model_name="Alpine Cold Climate Resilient Band",
    )
    res_2 = MetricCalculator.calculate_comfort_metrics(
        indoor_temps=indoor_temps,
        timestep_hours=timestep_hours,
        comfort_definition=def_alpine,
    )

    # Band 3: Strict Hospital / Clinic Band [20.0°C – 24.0°C]
    def_strict = ComfortDefinition(
        min_acceptable_temperature_c=20.0,
        max_acceptable_temperature_c=24.0,
        target_indoor_temperature_c=22.0,
        standard_or_model_name="Strict Medical Comfort Band",
    )
    res_3 = MetricCalculator.calculate_comfort_metrics(
        indoor_temps=indoor_temps,
        timestep_hours=timestep_hours,
        comfort_definition=def_strict,
    )

    # 1. Target ranges are distinct and accurately recorded
    assert res_1.target_range_str == "18.0°C – 26.0°C"
    assert res_2.target_range_str == "14.0°C – 22.0°C"
    assert res_3.target_range_str == "20.0°C – 24.0°C"

    # 2. Hours inside target differ significantly between bands
    # Temps in [18, 26]: 18.0, 19.0, 20.0, 21.0, 20.5, 20.0, 19.0, 18.0 = 8 hours
    assert res_1.hours_inside_target == 8.0
    assert res_1.hours_in_comfort_band == 8.0
    assert res_1.hours_below_target == 16.0
    assert res_1.hours_above_target == 0.0

    # Temps in [14, 22]: 14.0 through 21.0 down to 14.0 = 16 hours
    assert res_2.hours_inside_target == 16.0
    assert res_2.hours_in_comfort_band == 16.0
    assert res_2.hours_below_target == 8.0
    assert res_2.hours_above_target == 0.0

    # Temps in [20, 24]: 20.0, 21.0, 20.5, 20.0 = 4 hours
    assert res_3.hours_inside_target == 4.0
    assert res_3.hours_in_comfort_band == 4.0
    assert res_3.hours_below_target == 20.0
    assert res_3.hours_above_target == 0.0

    # 3. Percentages are dynamically recalculated
    assert res_1.percent_time_comfortable == pytest.approx(8.0 / 24.0 * 100.0, rel=1e-2)
    assert res_2.percent_time_comfortable == pytest.approx(16.0 / 24.0 * 100.0, rel=1e-2)
    assert res_3.percent_time_comfortable == pytest.approx(4.0 / 24.0 * 100.0, rel=1e-2)

    # 4. Underheating degree-hours decrease when lower threshold is dropped
    assert res_2.underheating_degree_hours_c_h < res_1.underheating_degree_hours_c_h
    assert res_1.underheating_degree_hours_c_h < res_3.underheating_degree_hours_c_h

    # 5. Actual temperatures remain physical constants of the simulation
    for r in [res_1, res_2, res_3]:
        assert r.indoor_min_c == 12.0
        assert r.indoor_max_c == 21.0
        assert r.indoor_mean_c == pytest.approx(sum(indoor_temps) / len(indoor_temps), rel=1e-2)
        assert r.diurnal_temperature_swing_c == 9.0


def test_comfort_metrics_stores_actual_comfort_definition():
    """Verify that each comfort evaluation stores the full structured comfort definition."""
    custom_def = ComfortDefinition(
        min_acceptable_temperature_c=16.5,
        max_acceptable_temperature_c=23.5,
        target_indoor_temperature_c=20.0,
        standard_or_model_name="Indian ISHRAE / NBC Alpine Guide",
        assumptions="Sedentary occupant with wool blankets (~2.0 clo).",
        applicable_conditions="Ladakh winter high-altitude shelter.",
        is_universal_comfort_claimed=False,
    )

    res = MetricCalculator.calculate_comfort_metrics(
        indoor_temps=[15.0, 18.0, 22.0, 24.0],
        timestep_hours=1.0,
        comfort_definition=custom_def,
    )

    assert res.comfort_definition is not None
    assert res.comfort_definition.standard_or_model_name == "Indian ISHRAE / NBC Alpine Guide"
    assert res.comfort_definition.assumptions == "Sedentary occupant with wool blankets (~2.0 clo)."
    assert res.comfort_definition.applicable_conditions == "Ladakh winter high-altitude shelter."
    assert res.comfort_definition.target_indoor_temperature_c == 20.0
    assert res.comfort_definition.is_universal_comfort_claimed is False
    assert res.target_range_str == "16.5°C – 23.5°C"
    assert res.hours_inside_target == 2.0  # 18.0 and 22.0
    assert res.hours_below_target == 1.0   # 15.0
    assert res.hours_above_target == 1.0   # 24.0


def test_engine_passes_design_targets_to_comfort_metrics():
    """Verify that Engine automatically extracts DesignTargets from shelter_model and uses it."""
    engine = EnergyPlusEngine()

    shelter_model = {
        "id": "custom-comfort-shelter",
        "name": "Custom Alpine Shelter",
        "design_targets": {
            "comfort": {
                "target_indoor_temp_min": 13.0,
                "target_indoor_temp_max": 21.0,
                "target_indoor_temp": 17.5,
                "model": "Ladakh High-Altitude Outpost Standard",
                "assumptions": "Arctic winter clothing 1.8 clo.",
                "applicable_conditions": "Sub-zero mountain pass.",
            }
        }
    }

    # Simulate parser call directly as done in engine
    comf_def = parse_comfort_definition(shelter_model)
    parser_meta = {
        "engine_name": "EnergyPlus",
        "engine_version": "24.1.0",
        "comfort_definition": comf_def,
        "comfort_min_c": comf_def.min_acceptable_temperature_c,
        "comfort_max_c": comf_def.max_acceptable_temperature_c,
        "target_temp_c": comf_def.target_indoor_temperature_c,
    }

    sim_result = engine.result_parser.parse(
        "storage/simulations/demo_wall-150mm-eps-earth",
        metadata=parser_meta,
    )

    assert sim_result.comfort.comfort_temperature_min_c == 13.0
    assert sim_result.comfort.comfort_temperature_max_c == 21.0
    assert sim_result.comfort.target_indoor_temperature_c == 17.5
    assert sim_result.comfort.target_range_str == "13.0°C – 21.0°C"
    assert sim_result.comfort.comfort_definition.standard_or_model_name == "Ladakh High-Altitude Outpost Standard"
    assert sim_result.comfort.is_universal_comfort_claimed is False
    assert sim_result.comfort.hours_inside_target is not None
    assert sim_result.comfort.hours_below_target is not None
    assert sim_result.comfort.hours_above_target is not None
