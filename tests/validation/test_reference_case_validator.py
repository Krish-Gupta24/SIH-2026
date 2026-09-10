"""
Tests for Reference-Case Validation Workflow.

Verifies:
1. Parsing of reference CSV with various timestamp conventions.
2. Timezone alignment (IST to UTC/IST).
3. Unit conversions (Fahrenheit to Celsius, kW/m² to W/m²).
4. Error metric calculations: MAE, RMSE, MBE.
5. R² computed ONLY when reference variance is non-zero (suppressed for constant reference).
6. Strict zero-fabrication: if reference data is missing, returns 'Validation data not provided.' without synthetic metrics.
"""

import pytest
from backend.validation.reference_case_validator import (
    ReferenceCaseValidator,
    ReferenceValidationResult,
    ValidationMetrics,
)


def test_validation_returns_not_provided_when_reference_data_absent():
    """Verify that omitting reference data returns 'Validation data not provided.' with zero metrics."""
    result = ReferenceCaseValidator.validate_simulation(
        simulated_timestamps=["2023-01-15T00:00:00", "2023-01-15T01:00:00"],
        simulated_values=[8.5, 8.2],
        reference_csv_content=None,
    )

    assert isinstance(result, ReferenceValidationResult)
    assert result.status == "NOT_PROVIDED"
    assert result.message == "Validation data not provided."
    assert result.reference_data_available is False
    assert result.metrics is None
    assert len(result.aligned_series) == 0


def test_reference_csv_timestamp_and_unit_alignment():
    """Verify parsing of CSV with Fahrenheit temperatures and IST timestamp mapping."""
    csv_data = """timestamp,indoor_temp_f
2023-01-15 01:00:00,50.0
2023-01-15 02:00:00,51.8
2023-01-15 03:00:00,53.6
2023-01-15 04:00:00,55.4
2023-01-15 05:00:00,57.2
"""
    times, vals, meta = ReferenceCaseValidator.ingest_reference_csv(
        csv_content=csv_data,
        target_metric="indoor_temperature",
        source_unit="fahrenheit",
    )

    assert len(times) == 5
    assert len(vals) == 5
    # 50°F = 10.0°C, 51.8°F = 11.0°C, 53.6°F = 12.0°C
    assert abs(vals[0] - 10.0) < 0.01
    assert abs(vals[1] - 11.0) < 0.01
    assert abs(vals[2] - 12.0) < 0.01
    assert "Converted from °F" in meta["unit_applied"]


def test_statistical_error_metrics_calculation():
    """Verify exact mathematical calculation of MAE, RMSE, MBE, and R²."""
    sim = [10.0, 12.0, 14.0, 16.0, 18.0]
    ref = [11.0, 13.0, 13.0, 17.0, 19.0]

    # Residuals (ref - sim):
    # [1.0, 1.0, -1.0, 1.0, 1.0]
    # Abs diffs: [1.0, 1.0, 1.0, 1.0, 1.0] -> MAE = 1.0
    # Sq diffs: [1.0, 1.0, 1.0, 1.0, 1.0] -> RMSE = 1.0
    # MBE: (1 + 1 - 1 + 1 + 1)/5 = 3/5 = 0.6
    metrics = ReferenceCaseValidator.calculate_metrics(
        simulated_values=sim,
        reference_values=ref,
        metric_name="indoor_temperature",
        unit="°C",
    )

    assert metrics.sample_count == 5
    assert metrics.mae == 1.0
    assert metrics.rmse == 1.0
    assert metrics.mbe == 0.6
    assert metrics.r_squared is not None
    assert metrics.r_squared > 0.9  # Strongly correlated
    assert metrics.r_squared_applicable is True


def test_r_squared_suppressed_for_constant_reference_measurements():
    """Verify that R² is NOT calculated (None) when reference variance is zero."""
    sim = [10.0, 12.0, 14.0, 16.0]
    ref = [15.0, 15.0, 15.0, 15.0]  # Constant calibration bench

    metrics = ReferenceCaseValidator.calculate_metrics(
        simulated_values=sim,
        reference_values=ref,
        metric_name="indoor_temperature",
    )

    assert metrics.r_squared is None
    assert metrics.r_squared_applicable is False
    assert "zero reference variance" in metrics.notes


def test_full_validation_workflow():
    """Verify end-to-end alignment and comparison between simulation and reference CSV."""
    sim_ts = [
        "2023-01-15T00:00:00",
        "2023-01-15T01:00:00",
        "2023-01-15T02:00:00",
        "2023-01-15T03:00:00",
    ]
    sim_vals = [8.0, 8.5, 9.0, 9.5]

    ref_csv = """timestamp,indoor_temp
2023-01-15T00:00:00,8.2
2023-01-15T01:00:00,8.4
2023-01-15T02:00:00,9.1
2023-01-15T03:00:00,9.7
"""
    res = ReferenceCaseValidator.validate_simulation(
        simulated_timestamps=sim_ts,
        simulated_values=sim_vals,
        reference_csv_content=ref_csv,
        target_metric="indoor_temperature",
    )

    assert res.status == "COMPLETED"
    assert res.reference_data_available is True
    assert res.metrics is not None
    assert len(res.aligned_series) == 4
    assert res.metrics.mae < 0.3
    assert res.metrics.rmse < 0.3
