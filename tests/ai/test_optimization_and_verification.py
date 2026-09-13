"""Tests for genuine NSGA-II optimizer, diverse candidate selection, and SHAP explainability."""

from pathlib import Path
import pytest

from backend.ai.explainability import ModelExplainer
from backend.ai.nsga2_optimizer import NSGA2ThermalOptimizer
from backend.ai.objective_functions import OptimizationMode
from backend.ai.surrogate_model import MultiTargetSurrogateModel
from backend.ai.verification_service import VerificationService
from tests.ai.test_surrogate_pipeline import synthetic_training_df


def test_nsga2_optimization_execution(synthetic_training_df):
    """Verify that NSGA-II executes genetic optimization and returns Pareto candidates."""
    surrogate = MultiTargetSurrogateModel(model_type="hist_gbr", seed=42)
    surrogate.fit(synthetic_training_df)

    climate = {
        "latitude": 34.15,
        "longitude": 77.58,
        "elevation_m": 3500.0,
        "outdoor_temp_mean_c": -2.5,
        "outdoor_temp_min_c": -25.0,
        "outdoor_temp_max_c": 15.0,
        "outdoor_temp_diurnal_range_c": 14.0,
        "winter_temp_mean_c": -12.0,
        "winter_temp_min_c": -25.0,
        "global_horizontal_solar_mean_w_m2": 180.0,
        "winter_solar_mean_w_m2": 120.0,
        "wind_speed_mean_m_s": 3.2,
        "relative_humidity_mean_pct": 45.0,
        "heating_degree_days_base18": 4500.0,
    }

    optimizer = NSGA2ThermalOptimizer(surrogate_model=surrogate, climate_features=climate, seed=42)

    progress_calls = []
    def on_prog(gen, max_gen, evals):
        progress_calls.append(gen)

    pareto_candidates = optimizer.optimize(
        target_indoor_min_c=-12.0,
        max_envelope_mass_kg=3500.0,
        mode=OptimizationMode.BALANCED,
        population_size=20,
        generations=5,
        progress_callback=on_prog,
    )

    assert len(pareto_candidates) > 0
    assert len(progress_calls) > 0

    first = pareto_candidates[0]
    assert "candidate_id" in first
    assert "parameters" in first
    assert "surrogate_predictions" in first
    assert "winter_indoor_min_c" in first["surrogate_predictions"]
    assert "objective_values" in first
    assert len(first["objective_values"]) == 3  # Balanced: 3 objectives


def test_diverse_top_k_candidate_selection():
    """Verify diverse candidate selection logic (knee point, min heating, min mass, high unc)."""
    vs = VerificationService(epw_path=Path("storage/weather/IND_JK_Leh.427053_TMYx.epw"))

    mock_candidates = [
        {
            "candidate_id": f"C_{i}",
            "parameters": {"estimated_envelope_mass": 1000.0 + i * 200.0},
            "surrogate_predictions": {
                "winter_heating_demand_kwh_m2": 150.0 - i * 15.0,
                "winter_comfort_hours_pct": 40.0 + i * 5.0,
            },
            "uncertainty_margin_c": 1.0 + (i % 3) * 0.8,
        }
        for i in range(10)
    ]

    selected = vs.select_diverse_top_k(mock_candidates, k=4)
    assert len(selected) == 4
    # The minimum heating candidate should be C_9
    assert any(c["candidate_id"] == "C_9" for c in selected)
    # The minimum mass candidate should be C_0
    assert any(c["candidate_id"] == "C_0" for c in selected)


def test_shap_model_explainer(synthetic_training_df):
    """Verify target-specific SHAP attribution without hardcoded values."""
    surrogate = MultiTargetSurrogateModel(model_type="hist_gbr", seed=42)
    surrogate.fit(synthetic_training_df)

    explainer = ModelExplainer(surrogate)
    sample = synthetic_training_df.iloc[0].to_dict()

    rep = explainer.explain_candidate(sample, target_name="winter_indoor_min_c", top_k=5)
    assert rep.target_name == "winter_indoor_min_c"
    assert isinstance(rep.predicted_value, float)
    assert len(rep.top_contributors) <= 5
    assert len(rep.all_attributions) > 0
    assert "Shapley" in rep.disclaimer
