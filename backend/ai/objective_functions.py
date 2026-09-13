"""Mathematical formulations of multi-objective functions and conservative constraints."""

from enum import Enum
from typing import Any, Dict, List, Tuple
import numpy as np

from backend.ai.uncertainty import SurrogateUncertaintyEstimator


class OptimizationMode(str, Enum):
    BALANCED = "BALANCED"
    MINIMUM_HEATING = "MINIMUM_HEATING"
    MAXIMUM_COMFORT = "MAXIMUM_COMFORT"
    MINIMUM_MASS = "MINIMUM_MASS"


class DesignObjectives:
    """Evaluates multi-objective fitness and conservative constraints."""

    @staticmethod
    def evaluate_heating_demand(predictions: Dict[str, np.ndarray]) -> np.ndarray:
        """Objective: Minimize Heating Demand (kWh/m2)."""
        if "winter_heating_demand_kwh_m2" in predictions:
            return predictions["winter_heating_demand_kwh_m2"]
        elif "annual_heating_demand_kwh_m2" in predictions:
            return predictions["annual_heating_demand_kwh_m2"]
        return np.zeros(len(next(iter(predictions.values()))))

    @staticmethod
    def evaluate_discomfort(predictions: Dict[str, np.ndarray]) -> np.ndarray:
        """Objective: Minimize Discomfort percentage (100 - comfort_hours_pct)."""
        if "winter_comfort_hours_pct" in predictions:
            comfort = predictions["winter_comfort_hours_pct"]
        elif "annual_comfort_hours_pct" in predictions:
            comfort = predictions["annual_comfort_hours_pct"]
        else:
            comfort = np.zeros(len(next(iter(predictions.values()))))
        return 100.0 - np.clip(comfort, 0.0, 100.0)

    @staticmethod
    def evaluate_envelope_mass(derived_features_list: List[Dict[str, float]]) -> np.ndarray:
        """Objective: Minimize Envelope Mass (kg)."""
        return np.array([d.get("estimated_envelope_mass", 1500.0) for d in derived_features_list])

    @classmethod
    def evaluate_objectives(
        cls,
        predictions: Dict[str, np.ndarray],
        derived_list: List[Dict[str, float]],
        mode: OptimizationMode = OptimizationMode.BALANCED,
    ) -> np.ndarray:
        """Assembles fitness matrix F of shape (N_candidates, N_objectives)."""
        f_heating = cls.evaluate_heating_demand(predictions)
        f_discomfort = cls.evaluate_discomfort(predictions)
        f_mass = cls.evaluate_envelope_mass(derived_list)

        if mode == OptimizationMode.BALANCED:
            return np.column_stack([f_heating, f_discomfort, f_mass])
        elif mode == OptimizationMode.MINIMUM_HEATING:
            return np.column_stack([f_heating, f_discomfort])
        elif mode == OptimizationMode.MAXIMUM_COMFORT:
            return np.column_stack([f_discomfort, f_heating])
        elif mode == OptimizationMode.MINIMUM_MASS:
            return np.column_stack([f_mass, f_heating, f_discomfort])
        else:
            return np.column_stack([f_heating, f_discomfort, f_mass])

    @classmethod
    def evaluate_constraints(
        cls,
        predictions: Dict[str, np.ndarray],
        candidates: List[Dict[str, Any]],
        target_indoor_min_c: float = 12.0,
        max_envelope_mass_kg: Optional[float] = None,
        max_wwr: float = 0.30,
    ) -> np.ndarray:
        """Evaluates conservative constraint matrix G where g_i(x) <= 0 indicates feasibility.

        Constraints:
        g1: Target min temp - (predicted_min - uncertainty_margin) <= 0
        g2: Envelope mass - max_envelope_mass <= 0 (if user-defined)
        g3: WWR - max_wwr <= 0
        """
        n = len(candidates)
        constraints = []

        # 1. Conservative minimum indoor temperature constraint
        pred_min = predictions.get("winter_indoor_min_c", predictions.get("indoor_min_c", np.zeros(n)))
        uncertainty_margins = np.array([
            SurrogateUncertaintyEstimator.assess_candidate(cand).uncertainty_margin_c
            for cand in candidates
        ])
        conservative_min = pred_min - uncertainty_margins
        g_temp = target_indoor_min_c - conservative_min
        constraints.append(g_temp)

        # 2. Maximum deployment / airlift envelope mass constraint
        if max_envelope_mass_kg is not None and max_envelope_mass_kg > 0:
            masses = np.array([c.get("estimated_envelope_mass", 1500.0) for c in candidates])
            g_mass = masses - max_envelope_mass_kg
            constraints.append(g_mass)

        # 3. Window-to-wall ratio constraint
        wwrs = np.array([c.get("window_to_wall_ratio", 0.15) for c in candidates])
        g_wwr = wwrs - max_wwr
        constraints.append(g_wwr)

        return np.column_stack(constraints)
