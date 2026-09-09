"""
Tests for the Engineering Validation Framework.

Verifies:
1. Numerical sanity auditing (Thermodynamic consistency, temperature hierarchy, non-negative demand).
2. All 7 controlled qualitative sensitivity tests:
   - TEST-01: Increase insulation
   - TEST-02: Decrease insulation
   - TEST-03: Change orientation
   - TEST-04: Change glazing
   - TEST-05: Change window area
   - TEST-06: Change thermal mass
   - TEST-07: Change ventilation / leakage
3. Reference-case comparison and ASHRAE Guideline 14 metrics (NMBE, CV(RMSE), R², MAE).
4. Strict zero-fabrication policy: no metrics computed when reference data is missing.
"""

import pytest
import math
from backend.validation.engineering_validation_framework import (
    EngineeringValidationFramework,
    NumericalSanityChecker,
    ControlledSensitivityTester,
    ReferenceCaseComparator,
    NumericalSanityAudit,
    ReferenceComparisonResult,
    EngineeringValidationReport,
)
from backend.optimization.parameter_sweep_optimizer import ParameterSweepOptimizer


@pytest.fixture
def sample_shelter_model():
    return {
        "id": "validation-test-shelter",
        "project": {
            "name": "Kargil Outpost Test Cell",
            "version": "1.0.0",
        },
        "location": {
            "region": "Leh Ladakh, India",
            "elevation": 3500.0,
            "latitude": 34.1526,
            "longitude": 77.5771,
            "climateZone": "Cold / Extreme Alpine (ASHRAE Zone 8)",
            "designTempWinter": -20.5,
            "weatherSource": "IND_JK_Leh.420270_ISHRAE.epw",
        },
        "geometry": {
            "length": 6.0,
            "width": 4.0,
            "height": 2.8,
            "orientation": 0.0,
            "roofAngle": 15.0,
        },
        "envelope": {
            "walls": {
                "north": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "south": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "east": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "west": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
            }
        },
        "openings": {
            "windows": [
                {"id": "win-1", "wall": "south", "width": 1.4, "height": 1.0, "glazingType": "Double_LowE_Argon"},
                {"id": "win-2", "wall": "south", "width": 1.4, "height": 1.0, "glazingType": "Double_LowE_Argon"},
            ]
        },
    }


def test_numerical_sanity_checker_valid_metrics():
    """Verify numerical sanity checks pass on valid physical data."""
    metrics = {
        "indoor_min_c": 17.2,
        "indoor_mean_c": 19.8,
        "indoor_max_c": 22.4,
        "heating_demand_kwh_m2": 42.5,
        "total_heat_loss_ua": 28.5,
    }
    audit = NumericalSanityChecker.audit(metrics)
    assert isinstance(audit, NumericalSanityAudit)
    assert audit.passed is True
    assert audit.temperature_hierarchy_passed is True
    assert audit.non_negative_demands_passed is True
    assert audit.energy_conservation_passed is True


def test_numerical_sanity_checker_catches_violations():
    """Verify numerical sanity checks catch inverted temperature hierarchy and negative values."""
    # 1. Inverted temperature hierarchy: T_min > T_max
    bad_temp = {
        "indoor_min_c": 25.0,
        "indoor_mean_c": 19.8,
        "indoor_max_c": 15.0,
        "heating_demand_kwh_m2": 42.5,
        "total_heat_loss_ua": 28.5,
    }
    audit1 = NumericalSanityChecker.audit(bad_temp)
    assert audit1.passed is False
    assert audit1.temperature_hierarchy_passed is False

    # 2. Negative heating demand
    neg_demand = {
        "indoor_min_c": 17.2,
        "indoor_mean_c": 19.8,
        "indoor_max_c": 22.4,
        "heating_demand_kwh_m2": -15.0,
        "total_heat_loss_ua": 28.5,
    }
    audit2 = NumericalSanityChecker.audit(neg_demand)
    assert audit2.passed is False
    assert audit2.non_negative_demands_passed is False


def test_all_7_controlled_qualitative_tests_pass(sample_shelter_model):
    """Verify that all 7 controlled qualitative tests pass against the physical evaluator."""
    optimizer = ParameterSweepOptimizer(base_model=sample_shelter_model)
    tests = ControlledSensitivityTester.run_tests(
        base_model=sample_shelter_model,
        thermal_evaluator=optimizer.evaluate_thermal_physics,
    )

    assert len(tests) == 7, "Must execute all 7 controlled sensitivity tests"

    # Map by test ID
    test_map = {t.test_id: t for t in tests}

    # TEST-01: Increase Insulation
    t1 = test_map["TEST-01"]
    assert t1.passed is True
    assert t1.unexpected_behavior_flag is None

    # TEST-02: Decrease Insulation
    t2 = test_map["TEST-02"]
    assert t2.passed is True
    assert t2.unexpected_behavior_flag is None

    # TEST-03: Change Orientation (South to North)
    t3 = test_map["TEST-03"]
    assert t3.passed is True
    assert t3.unexpected_behavior_flag is None

    # TEST-04: Change Glazing (Upgrade to Triple)
    t4 = test_map["TEST-04"]
    assert t4.passed is True
    assert t4.unexpected_behavior_flag is None

    # TEST-05: Change Window Area (Increase area)
    t5 = test_map["TEST-05"]
    assert t5.passed is True
    assert t5.unexpected_behavior_flag is None

    # TEST-06: Change Thermal Mass (Lightweight to High-Mass)
    t6 = test_map["TEST-06"]
    assert t6.passed is True
    assert t6.unexpected_behavior_flag is None

    # TEST-07: Change Infiltration/Ventilation (Airtight to Leaky)
    t7 = test_map["TEST-07"]
    assert t7.passed is True
    assert t7.unexpected_behavior_flag is None


def test_strict_zero_fabrication_when_reference_data_missing():
    """
    Verify that when reference data is absent, error metrics are strictly REFUSED
    and never artificially invented.
    """
    simulated = [18.5, 19.0, 19.5, 20.0]

    # Test with None
    res_none = ReferenceCaseComparator.compare(simulated, None)
    assert res_none.reference_data_available is False
    assert res_none.nmbe_pct is None
    assert res_none.cv_rmse_pct is None
    assert res_none.r_squared is None
    assert "No empirical or benchmark reference dataset provided" in res_none.message

    # Test with empty list
    res_empty = ReferenceCaseComparator.compare(simulated, [])
    assert res_empty.reference_data_available is False
    assert res_empty.nmbe_pct is None


def test_reference_comparison_computes_accurate_ashrae_metrics():
    """
    Verify mathematical accuracy of NMBE, CV(RMSE), R², and MAE
    when genuine reference data is provided.
    """
    # Monitored reference series (°C)
    measured = [18.0, 19.0, 20.0, 21.0, 22.0]
    # Simulated predictions (slightly biased +0.5°C)
    simulated = [18.5, 19.5, 20.5, 21.5, 22.5]

    res = ReferenceCaseComparator.compare(simulated, measured)
    assert res.reference_data_available is True
    assert res.sample_count == 5

    # Hand calculation:
    # y = [18, 19, 20, 21, 22], y_bar = 20.0
    # diffs = [-0.5, -0.5, -0.5, -0.5, -0.5], sum_diffs = -2.5
    # NMBE = (-2.5 / (4 * 20.0)) * 100 = -3.125% -> rounded -3.12%
    assert abs(res.nmbe_pct - (-3.12)) <= 0.05

    # MAE = 0.5°C
    assert res.mae_c == 0.5

    # R² should be 1.0 because simulated is a perfect linear shift of measured
    assert res.r_squared == 1.0

    # CV(RMSE) should be <= 30%, so ASHRAE Guideline 14 compliant
    assert res.ashrae_14_compliant is True


def test_unified_validation_framework(sample_shelter_model):
    """Verify unified validation report generation."""
    optimizer = ParameterSweepOptimizer(base_model=sample_shelter_model)
    metrics = optimizer.evaluate_thermal_physics({"insulation_thickness": 0.15})

    report = EngineeringValidationFramework.validate_simulation_outputs(
        shelter_model=sample_shelter_model,
        metrics=metrics,
        thermal_evaluator=optimizer.evaluate_thermal_physics,
        reference_data=None,
    )

    assert isinstance(report, EngineeringValidationReport)
    assert report.overall_status == "VALIDATED_PASS"
    assert report.numerical_sanity.passed is True
    assert len(report.controlled_sensitivity_tests) == 7
    assert report.reference_case_comparison.reference_data_available is False
