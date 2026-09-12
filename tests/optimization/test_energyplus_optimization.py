"""Automated test suite verifying EnergyPlus-backed candidate evaluation in optimization."""

import copy
import unittest
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.optimization.parameter_sweep_optimizer import (
    ParameterSweepOptimizer,
    OptimizationConstraint,
    CandidateEvaluation,
)
from simulation.runners.energyplus_runner import EnergyPlusRunner


class TestEnergyPlusOptimization(unittest.TestCase):
    """Test suite verifying EnergyPlus-backed candidate evaluation pipeline."""

    def setUp(self):
        self.base_shelter = {
            "id": "opt-test-shelter",
            "name": "High-Altitude Defense Outpost",
            "project": {"name": "Defense Shelter", "version": "1.0.0"},
            "location": {
                "latitude": 34.1526,
                "longitude": 77.5771,
                "elevation": 3500.0,
                "region": "Leh_Ladakh",
                "weather_source": "test_weather.epw",
            },
            "geometry": {
                "shape": "Rectangle",
                "length": 6.0,
                "width": 4.0,
                "height": 2.8,
                "orientation": 0.0,
            },
            "design_targets": {
                "comfort": {
                    "min_acceptable_temperature_c": 16.0,
                    "max_acceptable_temperature_c": 25.0,
                    "target_indoor_temperature_c": 20.0,
                    "standard_or_model_name": "Project Specific Cold-Climate Standard",
                    "assumptions": "Active outpost deployment",
                }
            },
            "ventilation": {"infiltrationACH": 0.35},
        }

    def test_01_candidate_model_generation_all_9_parameters(self):
        """Verify create_candidate_shelter_model properly mutates all 9 optimization parameters."""
        opt = ParameterSweepOptimizer(base_model=self.base_shelter)
        params = {
            "orientation": 45.0,
            "insulation_thickness": 0.20,
            "wall_construction": "Aerogel_Blanket_SuperWall",
            "roof_construction": "Aerogel_Insulated_Pitched_Roof",
            "window_area": 4.2,
            "glazing_type": "Triple_LowE_Krypton",
            "window_placement": "south_dominant",
            "thermal_mass": "high_mass_rammed_earth_pcm",
            "ventilation": 0.18,
        }
        cand_model = opt.create_candidate_shelter_model(self.base_shelter, params)

        # 1. Orientation
        self.assertEqual(cand_model["geometry"]["orientation"], 45.0)

        # 2 & 3. Wall Construction and Insulation Thickness
        wall_layers = cand_model["envelope"]["walls"]["layers"]
        self.assertTrue(any(l["material"] == "mat-aerogel-blanket" and l["thickness"] == 0.20 for l in wall_layers))

        # 4. Roof Construction
        roof_layers = cand_model["envelope"]["roof"]["layers"]
        self.assertTrue(any("aerogel" in l["material"] for l in roof_layers))

        # 5, 6 & 7. Window Area, Glazing, Placement
        windows = cand_model["envelope"]["windows"]
        self.assertGreater(len(windows), 0)
        total_win_area = sum(w["width"] * w["height"] for w in windows)
        self.assertAlmostEqual(total_win_area, 4.2, places=1)
        self.assertEqual(windows[0]["glazing_id"], "Triple_LowE_Krypton")
        self.assertEqual(windows[0]["wall"], "SOUTH")

        # 8. Thermal Mass
        self.assertEqual(cand_model["thermal_mass"], "high_mass_rammed_earth_pcm")

        # 9. Ventilation
        self.assertEqual(cand_model["ventilation"]["infiltrationACH"], 0.18)

    def test_02_candidate_validation_catches_invalid_geometry(self):
        """Verify validate_candidate_model flags impossible configurations."""
        opt = ParameterSweepOptimizer(base_model=self.base_shelter)

        # Invalid orientation > 360
        valid, err = opt.validate_candidate({"orientation": 450.0})
        self.assertFalse(valid)
        self.assertIn("Orientation", err)

        # Invalid oversized window
        valid, err = opt.validate_candidate({"window_area": 80.0})
        self.assertFalse(valid)
        self.assertIn("Window area", err)

        # Invalid excessive insulation thickness
        valid, err = opt.validate_candidate({"insulation_thickness": 0.95})
        self.assertFalse(valid)
        self.assertIn("Insulation thickness", err)

    @unittest.skipUnless(EnergyPlusRunner().is_available, "EnergyPlus binary not installed on host machine")
    def test_03_energyplus_candidate_evaluation_records_all_fields(self):
        """Verify candidate evaluation uses real EnergyPlus and records all 8 mandatory fields."""
        opt = ParameterSweepOptimizer(base_model=self.base_shelter, run_period_days=2)
        res = opt.run_optimization_sweep(
            parameters_to_sweep=["orientation", "insulation_thickness"],
            max_candidates=2,
        )

        candidates = res["ranked_candidates"]
        self.assertEqual(len(candidates), 2)
        c0 = candidates[0]

        # 8 Mandatory stored fields:
        # 1. Candidate ShelterModel
        self.assertIn("shelter_model", c0)
        self.assertEqual(c0["shelter_model"]["geometry"]["shape"], "Rectangle")

        # 2. Simulation ID
        self.assertIn("simulation_id", c0)
        self.assertTrue(c0["simulation_id"].startswith("sim-"))

        # 3. Weather dataset
        self.assertIn("weather_dataset", c0)
        self.assertTrue(len(c0["weather_dataset"]) > 0)

        # 4. Engine version
        self.assertIn("engine_version", c0)
        self.assertEqual(c0["engine_version"], opt.engine_version)

        # 5. Real metrics
        self.assertIn("metrics", c0)
        self.assertIn("indoor_min_c", c0["metrics"])
        self.assertIn("indoor_max_c", c0["metrics"])
        self.assertIn("comfort_hours_pct", c0["metrics"])
        self.assertIn("total_solar_gain_kwh", c0["metrics"])

        # 6. Score
        self.assertIn("objective_score", c0)
        self.assertIn("score", c0)
        self.assertIsInstance(c0["objective_score"], float)

        # 7. Constraints
        self.assertIn("constraints", c0)

        # 8. Status
        self.assertIn("status", c0)
        self.assertEqual(c0["status"], "COMPLETED")

    def test_04_failed_simulation_handling_zero_fabricated_metrics(self):
        """Verify that when EnergyPlus fails, candidate is marked FAILED with empty metrics."""
        opt = ParameterSweepOptimizer(base_model=self.base_shelter)
        opt.runner.executable_path = None

        res = opt.run_optimization_sweep(
            parameters_to_sweep=["orientation"],
            max_candidates=2,
        )

        candidates = res["ranked_candidates"]
        for cand in candidates:
            self.assertEqual(cand["status"], "FAILED")
            self.assertFalse(cand["is_feasible"])
            self.assertEqual(cand["metrics"], {})  # ZERO fabricated metrics!
            self.assertEqual(cand["objective_score"], -999999.0)
            self.assertIsNotNone(cand["failure_reason"])

    @unittest.skipUnless(EnergyPlusRunner().is_available, "EnergyPlus binary not installed on host machine")
    def test_05_design_targets_drive_comfort_calculations(self):
        """Verify that active project DesignTargets are used rather than hardcoded climate constants."""
        custom_shelter = copy.deepcopy(self.base_shelter)
        custom_shelter["design_targets"] = {
            "comfort": {
                "min_acceptable_temperature_c": 14.0,
                "max_acceptable_temperature_c": 22.0,
                "target_indoor_temperature_c": 18.0,
                "standard_or_model_name": "Custom Operational Target Band",
                "assumptions": "Arctic specialized survival gear",
            }
        }

        opt = ParameterSweepOptimizer(base_model=custom_shelter, run_period_days=2)
        res = opt.run_optimization_sweep(
            parameters_to_sweep=["orientation"],
            max_candidates=2,
        )

        cand = res["ranked_candidates"][0]
        self.assertEqual(cand["status"], "COMPLETED")
        self.assertIn("comfort_hours_pct", cand["metrics"])
        self.assertIn("hours_below_target", cand["metrics"])

    def test_06_configurable_small_search_space_budget(self):
        """Verify optimization respects small search space budget (20-50 demo candidates)."""
        opt = ParameterSweepOptimizer(base_model=self.base_shelter, run_period_days=2)
        raw = opt.generate_candidate_designs(parameters_to_sweep=["orientation", "insulation_thickness", "wall_construction"])
        self.assertGreater(len(raw), 25)

        res = opt.run_optimization_sweep(
            parameters_to_sweep=["orientation", "insulation_thickness", "wall_construction"],
            max_candidates=25,
        )
        self.assertEqual(len(res["ranked_candidates"]), 25)
        self.assertEqual(res["metadata"]["total_generated"], 25)


if __name__ == "__main__":
    unittest.main()
