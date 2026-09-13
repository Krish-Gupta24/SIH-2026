"""Tests for dataset sampling, quality auditing, and Parquet serialization."""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from backend.ai.data_quality import DatasetQualityAuditor, EnergyPlusQualityGate
from backend.ai.dataset_sampler import DesignSpaceSampler
from backend.ai.dataset_schema import DatasetSchema
from backend.ai.feature_schema import CONTINUOUS_DESIGN_FEATURES, CATEGORICAL_DESIGN_FEATURES


def test_design_space_sampler():
    """Verify LHS space-filling sampling, constraint satisfaction, and deduplication."""
    sampler = DesignSpaceSampler(seed=123)
    samples = sampler.sample(n_samples=25, max_aspect_ratio=2.5, max_wwr=0.35)

    assert len(samples) == 25
    seen_hashes = set()
    for s in samples:
        # Check presence of continuous features
        for f in CONTINUOUS_DESIGN_FEATURES:
            assert f in s
            assert isinstance(s[f], float)

        # Check presence of categoricals
        for f in CATEGORICAL_DESIGN_FEATURES:
            assert f in s
            assert isinstance(s[f], str)

        # Check derived features and constraints
        assert s["aspect_ratio"] <= 2.5
        assert s["aspect_ratio"] >= 1.0
        assert s["window_to_wall_ratio"] <= 0.35
        assert s["window_to_wall_ratio"] >= 0.02
        assert s["estimated_envelope_mass"] > 500.0

        # Check deduplication
        h = s["param_hash"]
        assert h not in seen_hashes
        seen_hashes.add(h)


def test_quality_gate_acceptance_and_rejection():
    """Verify quality gate accepts sound thermal metrics and flags invalid values."""
    valid_sim = {
        "success": True,
        "thermal_performance": {
            "indoor_temperature": {"min_c": 12.5, "mean_c": 18.2, "max_c": 22.0},
            "comfort": {"percent_time_comfortable": 68.5},
        },
        "energy": {"heating_demand_kwh_m2": 85.4},
    }

    res = EnergyPlusQualityGate.validate_simulation_result(valid_sim, is_winter_period=True)
    assert res.is_valid is True
    assert res.cleaned_metrics is not None
    assert res.cleaned_metrics["winter_indoor_min_c"] == 12.5
    assert res.cleaned_metrics["winter_indoor_mean_c"] == 18.2
    assert res.cleaned_metrics["winter_heating_demand_kwh_m2"] == 85.4
    assert res.cleaned_metrics["winter_comfort_hours_pct"] == 68.5

    # Test invalid temperature
    invalid_sim = {
        "success": True,
        "thermal_performance": {
            "indoor_temperature": {"min_c": -95.0, "mean_c": 18.2},
        },
    }
    res_bad = EnergyPlusQualityGate.validate_simulation_result(invalid_sim)
    assert res_bad.is_valid is False
    assert any("outside physical bounds" in r for r in res_bad.rejection_reasons)


def test_dataset_schema_parquet_roundtrip(tmp_path):
    """Verify DataFrame serialization to Parquet and metadata recovery."""
    sampler = DesignSpaceSampler(seed=42)
    samples = sampler.sample(n_samples=5)

    df = pd.DataFrame(samples)
    # Add dummy metadata and targets
    df["sample_id"] = [f"SMP_{i}" for i in range(5)]
    df["weather_id"] = "leh_ladakh"
    df["winter_indoor_min_c"] = [10.2, 11.5, 9.8, 14.0, 12.1]
    df["winter_indoor_mean_c"] = [16.5, 17.2, 15.8, 19.1, 18.0]
    df["winter_heating_demand_kwh_m2"] = [95.0, 88.0, 105.0, 72.0, 81.0]
    df["winter_comfort_hours_pct"] = [55.0, 62.0, 48.0, 75.0, 68.0]

    out_file = tmp_path / "test_data.parquet"
    DatasetSchema.save_dataset(df, out_file, dataset_metadata={"stage": "test", "seed": "42"})

    loaded_df, meta = DatasetSchema.load_dataset(out_file)
    assert len(loaded_df) == 5
    assert meta.get("stage") == "test"
    assert "winter_indoor_min_c" in loaded_df.columns
    assert loaded_df["winter_indoor_min_c"].tolist() == [10.2, 11.5, 9.8, 14.0, 12.1]

    # Run auditor on loaded DataFrame
    audit = DatasetQualityAuditor.audit_dataset(loaded_df)
    assert audit["total_rows"] == 5
    assert audit["has_nulls"] is False
    assert audit["status"] == "HEALTHY"
