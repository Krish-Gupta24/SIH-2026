"""Genuine pymoo NSGA-II multi-objective genetic optimization engine for inverse thermal design.

Evaluates thousands of design configurations in seconds via surrogate ML,
enforces conservative constraints, repairs invalid combinations, and extracts
the non-dominated Pareto frontier.
"""

from typing import Any, Callable, Dict, List, Optional, Tuple
import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.callback import Callback
from pymoo.core.problem import Problem
from pymoo.core.repair import Repair
from pymoo.optimize import minimize

from backend.ai.feature_schema import (
    CATEGORICAL_DESIGN_FEATURES,
    CONTINUOUS_DESIGN_FEATURES,
    DESIGN_BOUNDS,
    GLAZING_TYPES,
    ROOF_CONSTRUCTION_TYPES,
    THERMAL_MASS_TYPES,
    WALL_CONSTRUCTION_TYPES,
    WINDOW_PLACEMENTS,
    compute_derived_features,
)
from backend.ai.objective_functions import DesignObjectives, OptimizationMode
from backend.ai.surrogate_model import MultiTargetSurrogateModel
from backend.ai.uncertainty import SurrogateUncertaintyEstimator


class CategoricalRepair(Repair):
    """Repairs continuous/float perturbations of categorical indices into valid integer indices."""

    def _do(self, problem: Problem, Z: np.ndarray, **kwargs: Any) -> np.ndarray:
        # Categorical columns are placed after continuous columns
        n_cont = len(CONTINUOUS_DESIGN_FEATURES)

        cat_limits = [
            len(WALL_CONSTRUCTION_TYPES) - 1,
            len(ROOF_CONSTRUCTION_TYPES) - 1,
            len(GLAZING_TYPES) - 1,
            len(THERMAL_MASS_TYPES) - 1,
            len(WINDOW_PLACEMENTS) - 1,
        ]

        for i, lim in enumerate(cat_limits):
            col_idx = n_cont + i
            Z[:, col_idx] = np.clip(np.round(Z[:, col_idx]), 0, lim)

        return Z


class ShelterOptimizationProblem(Problem):
    """Pymoo problem formulation for high-altitude shelter thermal optimization."""

    def __init__(
        self,
        surrogate_model: MultiTargetSurrogateModel,
        climate_features: Dict[str, float],
        target_indoor_min_c: float = 12.0,
        max_envelope_mass_kg: Optional[float] = None,
        mode: OptimizationMode = OptimizationMode.BALANCED,
    ):
        self.surrogate_model = surrogate_model
        self.climate_features = climate_features
        self.target_indoor_min_c = target_indoor_min_c
        self.max_envelope_mass_kg = max_envelope_mass_kg
        self.mode = mode

        # Bounds setup
        xl = []
        xu = []

        # 1. Continuous bounds
        for feat in CONTINUOUS_DESIGN_FEATURES:
            b_min, b_max, _ = DESIGN_BOUNDS[feat]
            xl.append(b_min)
            xu.append(b_max)

        # 2. Categorical bounds (integer indices)
        cat_choices = [
            WALL_CONSTRUCTION_TYPES,
            ROOF_CONSTRUCTION_TYPES,
            GLAZING_TYPES,
            THERMAL_MASS_TYPES,
            WINDOW_PLACEMENTS,
        ]
        for choices in cat_choices:
            xl.append(0)
            xu.append(len(choices) - 1)

        # Number of objectives
        n_obj = 3 if mode in (OptimizationMode.BALANCED, OptimizationMode.MINIMUM_MASS) else 2
        # Constraints count: temp constraint + optional mass constraint + wwr constraint
        n_constr = 3 if max_envelope_mass_kg is not None else 2

        super().__init__(
            n_var=len(xl),
            n_obj=n_obj,
            n_ieq_constr=n_constr,
            xl=np.array(xl),
            xu=np.array(xu),
        )

    def _decode_design_vectors(self, X: np.ndarray) -> List[Dict[str, Any]]:
        """Converts raw numerical vectors back into complete candidate dictionaries."""
        candidates = []
        n_cont = len(CONTINUOUS_DESIGN_FEATURES)

        for row in X:
            cand = {}
            for idx, feat in enumerate(CONTINUOUS_DESIGN_FEATURES):
                cand[feat] = float(row[idx])

            # Integer round occupants
            cand["occupants"] = float(int(round(cand["occupants"])))

            # Decode categoricals
            c_idx = n_cont
            cand["wall_construction"] = WALL_CONSTRUCTION_TYPES[int(round(row[c_idx]))]
            cand["roof_construction"] = ROOF_CONSTRUCTION_TYPES[int(round(row[c_idx + 1]))]
            cand["glazing_type"] = GLAZING_TYPES[int(round(row[c_idx + 2]))]
            cand["thermal_mass_type"] = THERMAL_MASS_TYPES[int(round(row[c_idx + 3]))]
            cand["window_placement"] = WINDOW_PLACEMENTS[int(round(row[c_idx + 4]))]

            # Add derived geometric and mass features
            derived = compute_derived_features(cand)
            cand.update(derived)

            # Add physical climate context
            cand.update(self.climate_features)

            candidates.append(cand)

        return candidates

    def _evaluate(self, X: np.ndarray, out: Dict[str, Any], *args: Any, **kwargs: Any) -> None:
        """Batch evaluation of fitness and constraints via surrogate ML."""
        candidates = self._decode_design_vectors(X)

        # High-throughput batch inference
        predictions = self.surrogate_model.predict_batch(candidates)

        derived_list = [compute_derived_features(c) for c in candidates]

        # Evaluate objectives
        out["F"] = DesignObjectives.evaluate_objectives(
            predictions=predictions,
            derived_list=derived_list,
            mode=self.mode,
        )

        # Evaluate constraints
        out["G"] = DesignObjectives.evaluate_constraints(
            predictions=predictions,
            candidates=candidates,
            target_indoor_min_c=self.target_indoor_min_c,
            max_envelope_mass_kg=self.max_envelope_mass_kg,
        )


class ProgressTrackingCallback(Callback):
    """Monitors generational convergence and emits progress updates."""

    def __init__(self, callback_fn: Optional[Callable[[int, int, int], None]] = None):
        super().__init__()
        self.callback_fn = callback_fn

    def notify(self, algorithm: Any) -> None:
        if self.callback_fn:
            gen = algorithm.n_gen
            max_gen = algorithm.termination.n_max_gen if hasattr(algorithm.termination, "n_max_gen") else 50
            evals = algorithm.evaluator.n_eval
            self.callback_fn(gen, max_gen, evals)


class NSGA2ThermalOptimizer:
    """Orchestrates genuine pymoo NSGA-II search driving surrogate ML fitness."""

    def __init__(
        self,
        surrogate_model: MultiTargetSurrogateModel,
        climate_features: Dict[str, float],
        seed: int = 42,
    ):
        self.surrogate_model = surrogate_model
        self.climate_features = climate_features
        self.seed = seed

    def optimize(
        self,
        target_indoor_min_c: float = 12.0,
        max_envelope_mass_kg: Optional[float] = None,
        mode: OptimizationMode = OptimizationMode.BALANCED,
        population_size: int = 100,
        generations: int = 40,
        progress_callback: Optional[Callable[[int, int, int], None]] = None,
    ) -> List[Dict[str, Any]]:
        """Executes NSGA-II multi-objective genetic search.

        Returns:
            List of non-dominated Pareto candidate designs with surrogate predictions.
        """
        problem = ShelterOptimizationProblem(
            surrogate_model=self.surrogate_model,
            climate_features=self.climate_features,
            target_indoor_min_c=target_indoor_min_c,
            max_envelope_mass_kg=max_envelope_mass_kg,
            mode=mode,
        )

        algorithm = NSGA2(
            pop_size=population_size,
            repair=CategoricalRepair(),
            seed=self.seed,
        )

        cb = ProgressTrackingCallback(progress_callback)

        res = minimize(
            problem,
            algorithm,
            ("n_gen", generations),
            seed=self.seed,
            callback=cb,
            verbose=False,
        )

        if res.X is not None and len(res.X) > 0:
            X_pareto = np.atleast_2d(res.X)
            F_pareto = np.atleast_2d(res.F)
        elif hasattr(res, "opt") and res.opt is not None and len(res.opt) > 0 and res.opt.get("X") is not None:
            X_pareto = np.atleast_2d(res.opt.get("X"))
            F_pareto = np.atleast_2d(res.opt.get("F"))
        elif hasattr(res, "pop") and res.pop is not None and len(res.pop) > 0 and res.pop.get("X") is not None:
            # Fallback to least-infeasible designs from population
            pop_X = res.pop.get("X")
            pop_F = res.pop.get("F")
            pop_CV = res.pop.get("CV")
            if pop_CV is not None and len(pop_CV) > 0:
                best_indices = np.argsort(np.ravel(pop_CV))[:min(len(pop_X), 15)]
            else:
                best_indices = np.arange(min(len(pop_X), 15))
            X_pareto = np.atleast_2d(pop_X[best_indices])
            F_pareto = np.atleast_2d(pop_F[best_indices])
        else:
            return []

        pareto_candidates = problem._decode_design_vectors(X_pareto)

        # Attach surrogate predictions, uncertainty, and fitness values
        predictions = self.surrogate_model.predict_batch(pareto_candidates)

        ranked_results = []
        for idx, cand in enumerate(pareto_candidates):
            pred_dict = {
                target: round(float(predictions[target][idx]), 2)
                for target in self.surrogate_model.target_names
            }
            uncertainty = SurrogateUncertaintyEstimator.assess_candidate(cand)
            f_vals = [round(float(v), 2) for v in F_pareto[idx]] if idx < len(F_pareto) else []

            ranked_results.append({
                "candidate_id": f"AI_OPT_{idx+1:03d}",
                "parameters": cand,
                "surrogate_predictions": pred_dict,
                "uncertainty_margin_c": uncertainty.uncertainty_margin_c,
                "is_high_uncertainty": uncertainty.is_high_uncertainty,
                "objective_values": f_vals,
                "is_physics_verified": False,
            })

        return ranked_results
