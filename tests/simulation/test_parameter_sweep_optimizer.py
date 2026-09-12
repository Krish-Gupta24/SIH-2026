"""Automated tests verifying the Parametric Sweep Optimization Engine.

Proves:
1. Candidate generation across selected parameter sets
2. Geometric and physical validation of candidates
3. Thermodynamic simulation evaluations
4. Objective scoring across all 5 objectives
5. Constraint enforcement and filtering
6. Candidate ranking and best candidate selection
7. Complete optimization metadata recording
"""

import unittest
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.optimization.parameter_sweep_optimizer import (
    ParameterSweepOptimizer,
    OptimizationConstraint,
)
from simulation.runners.energyplus_runner import EnergyPlusRunner


class TestParameterSweepOptimizer(unittest.TestCase):
    """Test suite for the deterministic 8-step parameter sweep optimization engine."""

    def setUp(self):
        self.base_shelter = {
            "id": "test-shelter-ladakh",
            "name": "Ladakh High-Altitude Outpost",
            "project": {
                "name": "Ladakh Test Outpost",
                "version": "1.0.0",
            },
            "location": {
                "latitude": 34.1526,
                "longitude": 77.5771,
                "elevation": 3500.0,
                "region": "Ladakh, India",
            },
            "geometry": {
                "shape": "Rectangle",
                "length": 6.0,
                "width": 4.0,
                "height": 2.8,
                "orientation": 0.0,
            },
            "ventilation": {
                "infiltrationACH": 0.35,
            },
        }

    def test_01_generate_candidate_designs(self):
        """Verify Cartesian product generator produces expected candidate count."""
        custom_options = {
            "orientation": [0.0, 45.0, 90.0],
            "insulation_thickness": [0.10, 0.15, 0.20],
            "glazing_type": ["Double_LowE_Argon", "Triple_LowE_Krypton"],
        }
        optimizer = ParameterSweepOptimizer(
            base_model=self.base_shelter,
            custom_parameter_options=custom_options,
        )

        candidates = optimizer.generate_candidate_designs(
            parameters_to_sweep=["orientation", "insulation_thickness", "glazing_type"]
        )

        # 3 * 3 * 2 = 18 combinations
        self.assertEqual(len(candidates), 18)
        self.assertIn("orientation", candidates[0])
        self.assertIn("insulation_thickness", candidates[0])
        self.assertIn("glazing_type", candidates[0])

    def test_02_validate_candidate(self):
        """Verify candidate validation catches out-of-bounds parameters."""
        optimizer = ParameterSweepOptimizer(base_model=self.base_shelter)

        # Valid candidate
        valid, err = optimizer.validate_candidate({
            "orientation": 45.0,
            "insulation_thickness": 0.15,
            "window_area": 2.8,
        })
        self.assertTrue(valid)
        self.assertIsNone(err)

        # Invalid orientation
        invalid_ori, err_ori = optimizer.validate_candidate({
            "orientation": 400.0,
        })
        self.assertFalse(invalid_ori)
        self.assertIn("Orientation", err_ori)

        # Invalid insulation thickness
        invalid_ins, err_ins = optimizer.validate_candidate({
            "insulation_thickness": 0.85,
        })
        self.assertFalse(invalid_ins)
        self.assertIn("Insulation thickness", err_ins)

        # Invalid oversized window
        invalid_win, err_win = optimizer.validate_candidate({
            "window_area": 50.0,
        })
        self.assertFalse(invalid_win)
        self.assertIn("Window area", err_win)

    def test_03_thermal_physics_evaluation(self):
        """Verify physics simulation calculates consistent thermal metrics."""
        optimizer = ParameterSweepOptimizer(base_model=self.base_shelter)

        # High performance aerogel config
        high_perf = {
            "orientation": 0.0,
            "insulation_thickness": 0.20,
            "wall_construction": "Aerogel_Blanket_SuperWall",
            "roof_construction": "Aerogel_Insulated_Pitched_Roof",
            "glazing_type": "Triple_LowE_Krypton",
            "thermal_mass": "high_mass_rammed_earth_pcm",
            "ventilation": 0.18,
            "window_area": 3.6,
        }
        high_metrics = optimizer.evaluate_thermal_physics(high_perf)

        # Lightweight uninsulated config
        low_perf = {
            "orientation": 90.0,
            "insulation_thickness": 0.05,
            "wall_construction": "Standard_EPS_Wall",
            "roof_construction": "Uninsulated_Sheet_Roof",
            "glazing_type": "Single_Clear",
            "thermal_mass": "lightweight_timber",
            "ventilation": 1.20,
            "window_area": 1.4,
        }
        low_metrics = optimizer.evaluate_thermal_physics(low_perf)

        # High performance should have much higher nocturnal minimum temp
        self.assertGreater(high_metrics["indoor_min_c"], low_metrics["indoor_min_c"])
        # High performance should have much lower space heating demand
        self.assertLess(high_metrics["heating_demand_kwh_m2"], low_metrics["heating_demand_kwh_m2"])
        # High performance should have higher comfort hours percentage
        self.assertGreater(high_metrics["comfort_hours_pct"], low_metrics["comfort_hours_pct"])
        # High performance should have lower overall heat loss rate (UA)
        self.assertLess(high_metrics["total_heat_loss_rate_ua"], low_metrics["total_heat_loss_rate_ua"])

    def test_04_objective_scoring_all_5_objectives(self):
        """Verify score calculations across all 5 supported objectives."""
        sample_metrics = {
            "comfort_hours_pct": 82.5,
            "indoor_min_c": 16.4,
            "indoor_max_c": 22.8,
            "total_heat_loss_rate_ua": 48.5,
            "heating_demand_kwh_m2": 38.0,
            "total_solar_gain_kwh": 52.0,
            "material_cost_usd": 1200.0,
        }

        objectives = [
            "maximize_comfort",
            "minimize_heat_loss",
            "minimize_auxiliary_energy",
            "maximize_useful_solar_gain",
            "minimize_material_cost",
        ]

        for obj in objectives:
            opt = ParameterSweepOptimizer(base_model=self.base_shelter, objective=obj)
            score = opt.calculate_objective_score(sample_metrics)
            self.assertIsInstance(score, float)
            self.assertGreater(score, 0.0)

    def test_05_constraint_enforcement(self):
        """Verify hard constraints disqualify failing candidates."""
        constraints = [
            OptimizationConstraint(
                name="Strict Night Min Temp",
                metric="indoor_min_c",
                operator=">=",
                threshold=12.0,
            ),
            OptimizationConstraint(
                name="Max Wall Thickness",
                metric="total_wall_thickness_m",
                operator="<=",
                threshold=0.30,
            ),
        ]

        optimizer = ParameterSweepOptimizer(
            base_model=self.base_shelter,
            constraints=constraints,
        )

        # Passing candidate
        pass_metrics = {"indoor_min_c": 15.0, "total_wall_thickness_m": 0.25}
        feasible, violations = optimizer.enforce_constraints(pass_metrics)
        self.assertTrue(feasible)
        self.assertEqual(len(violations), 0)

        # Failing candidate (too cold)
        fail_metrics = {"indoor_min_c": 6.5, "total_wall_thickness_m": 0.25}
        feasible_fail, violations_fail = optimizer.enforce_constraints(fail_metrics)
        self.assertFalse(feasible_fail)
        self.assertEqual(len(violations_fail), 1)
        self.assertIn("indoor_min_c", violations_fail[0])

    @unittest.skipUnless(EnergyPlusRunner().is_available, "EnergyPlus binary not available on host machine")
    def test_06_full_sweep_ranking_and_best_candidate(self):
        """Verify complete 8-step sweep execution, ranking, and Pareto identification."""
        custom_options = {
            "orientation": [0.0, 90.0],
            "insulation_thickness": [0.08, 0.16],
            "glazing_type": ["Double_LowE_Argon", "Triple_LowE_Krypton"],
        }

        optimizer = ParameterSweepOptimizer(
            base_model=self.base_shelter,
            objective="maximize_comfort",
            custom_parameter_options=custom_options,
        )

        results = optimizer.run_optimization_sweep(
            parameters_to_sweep=["orientation", "insulation_thickness", "glazing_type"]
        )

        # Total 2 * 2 * 2 = 8 candidates
        self.assertEqual(len(results["ranked_candidates"]), 8)
        self.assertIsNotNone(results["best_candidate"])

        best = results["best_candidate"]
        self.assertEqual(best["rank"], 1)
        self.assertTrue(best["is_feasible"])

        # Best candidate should have higher score than last ranked
        last = results["ranked_candidates"][-1]
        self.assertGreaterEqual(best["objective_score"], last["objective_score"])

        # Pareto candidates should be identified
        self.assertGreater(len(results["pareto_candidates"]), 0)

    def test_07_optimization_metadata_storage(self):
        """Verify complete optimization run provenance metadata is recorded."""
        optimizer = ParameterSweepOptimizer(base_model=self.base_shelter)
        results = optimizer.run_optimization_sweep(
            parameters_to_sweep=["orientation", "insulation_thickness"],
            max_candidates=10,
        )

        meta = results["metadata"]
        self.assertIn("run_id", meta)
        self.assertIn("timestamp", meta)
        self.assertIn("algorithm", meta)
        self.assertIn("total_generated", meta)
        self.assertIn("valid_count", meta)
        self.assertIn("feasible_count", meta)
        self.assertIn("execution_duration_seconds", meta)
        self.assertIn("parameters_swept", meta)
        self.assertIn("constraints_enforced", meta)


if __name__ == "__main__":
    unittest.main()
