"""Tests for surrogate training, multi-split evaluation, and model registry governance."""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from backend.ai.dataset_sampler import DesignSpaceSampler
from backend.ai.model_card import ModelCard
from backend.ai.model_registry import ModelNotApprovedError, ModelRegistry
from backend.ai.surrogate_model import MultiTargetSurrogateModel


@pytest.fixture
def synthetic_training_df():
    """Generates a small valid DataFrame for fast unit testing."""
    sampler = DesignSpaceSampler(seed=42)
    samples = sampler.sample(n_samples=30)
    df = pd.DataFrame(samples)

    # Add climate features (mock 2 stations)
    stations = ["leh_ladakh", "dras_kargil"]
    df["weather_id"] = [stations[i % len(stations)] for i in range(len(df))]
    df["latitude"] = 34.15
    df["longitude"] = 77.58
    df["elevation_m"] = 3500.0
    df["outdoor_temp_mean_c"] = -2.5
    df["outdoor_temp_min_c"] = -25.0
    df["outdoor_temp_max_c"] = 15.0
    df["outdoor_temp_diurnal_range_c"] = 14.0
    df["winter_temp_mean_c"] = -12.0
    df["winter_temp_min_c"] = -25.0
    df["global_horizontal_solar_mean_w_m2"] = 180.0
    df["winter_solar_mean_w_m2"] = 120.0
    df["wind_speed_mean_m_s"] = 3.2
    df["relative_humidity_mean_pct"] = 45.0
    df["heating_degree_days_base18"] = 4500.0

    # Physics-consistent synthetic targets:
    # higher insulation -> higher min temp, lower heating
    df["winter_indoor_min_c"] = (
        -15.0
        + df["wall_insulation_thickness"] * 40.0
        + df["roof_insulation_thickness"] * 30.0
        - df["infiltration_ach"] * 10.0
    )
    df["winter_indoor_mean_c"] = df["winter_indoor_min_c"] + 6.0
    df["winter_heating_demand_kwh_m2"] = 120.0 - (df["winter_indoor_min_c"] + 15.0) * 3.0
    df["winter_comfort_hours_pct"] = (df["winter_indoor_min_c"] + 20.0) * 2.5

    return df


def test_surrogate_model_training_and_prediction(synthetic_training_df):
    """Verify fitting, multi-split evaluation, and inference."""
    surrogate = MultiTargetSurrogateModel(model_type="hist_gbr", seed=42)
    eval_results = surrogate.evaluate_splits(synthetic_training_df, test_size=0.20)

    assert "in_domain_metrics" in eval_results
    assert "winter_indoor_min_c" in eval_results["in_domain_metrics"]
    m = eval_results["in_domain_metrics"]["winter_indoor_min_c"]
    assert m["mae"] >= 0.0

    # Fit full model
    surrogate.fit(synthetic_training_df)
    assert surrogate.is_fitted is True

    # Test single prediction
    test_sample = synthetic_training_df.iloc[0].to_dict()
    pred = surrogate.predict_single(test_sample)
    assert pred["is_in_domain"] is True
    assert "predictions" in pred
    assert "winter_indoor_min_c" in pred["predictions"]
    assert isinstance(pred["predictions"]["winter_indoor_min_c"], float)


def test_model_registry_lifecycle(synthetic_training_df, tmp_path):
    """Verify model persistence, approval gates, and ModelNotApprovedError."""
    registry = ModelRegistry(models_dir=tmp_path / "models")
    surrogate = MultiTargetSurrogateModel(model_type="hist_gbr", seed=42)
    surrogate.fit(synthetic_training_df)

    # Initial state: VALIDATED (not approved yet)
    card = ModelCard(
        model_id="test_surrogate",
        version="1",
        created_timestamp="2026-09-13T00:00:00Z",
        model_type="hist_gbr",
        approval_status="VALIDATED",
        simulation_period="winter_peak_3day",
        target_metrics=surrogate.target_names,
        training_dataset_version="dev_v1",
        training_dataset_samples=len(synthetic_training_df),
        training_weather_stations=["leh_ladakh"],
        in_domain_metrics={"winter_indoor_min_c": {"mae": 0.8}},
        leave_one_climate_out_metrics={},
        baseline_comparison={},
        target_engineering_tolerances={"winter_indoor_min_c": "MAE <= 2.0 C"},
        known_limitations=["Test model"],
        out_of_domain_behavior="Warning issued",
    )

    saved_dir = registry.save_model(surrogate, card, version="1")
    assert saved_dir.exists()

    # load_model should succeed
    loaded_model, loaded_card = registry.load_model(version="1")
    assert loaded_card.approval_status == "VALIDATED"

    # load_approved_model should raise ModelNotApprovedError
    with pytest.raises(ModelNotApprovedError):
        registry.load_approved_model(version="1")

    # Approve model
    approved_card = registry.approve_model("1")
    assert approved_card.approval_status == "APPROVED_FOR_SURROGATE_USE"

    # Now load_approved_model should succeed!
    app_model, app_card = registry.load_approved_model(version="1")
    assert app_card.approval_status == "APPROVED_FOR_SURROGATE_USE"
