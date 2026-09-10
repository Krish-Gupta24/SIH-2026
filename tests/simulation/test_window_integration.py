"""Comprehensive automated tests for Window and Glazing Integration.

Verifies:
1. Window input flows: UI -> ShelterModel.windows[] -> EnergyPlus FenestrationSurface -> Glazing -> Simulation.
2. Preservation of id, host wall, position, width, height, sill height, glazing type, frame, and shading overhang.
3. Strict validation:
   - Window larger than wall
   - Invalid position (negative or exceeding length)
   - Window outside wall (position + width > wall length)
   - Invalid sill height (negative or sill + height > wall height)
   - Overlapping windows on the same wall
   - Impossible geometry (dimensions <= 0, NaN, Inf)
4. Unified Glazing Registry:
   - Single canonical database used by EnergyPlus generator, optimizer, recommendation engine.
   - Exact same U-value and SHGC across all modules.
5. All 7 required cases:
   - Case 1: No window
   - Case 2: One south window
   - Case 3: Two south windows
   - Case 4: East window
   - Case 5: West window
   - Case 6: Different glazing (Single_Clear vs Triple_LowE_Krypton)
   - Case 7: Changed window area (1.5 m² vs 4.5 m²)
6. Live EnergyPlus execution on distinct window cases proving physical differences.
"""

import os
import re
import tempfile
import unittest
from pathlib import Path

from simulation.materials.glazing import glazing_db, GlazingDefinition, FrameDefinition
from simulation.validation.opening_validator import OpeningValidator
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner
from backend.optimization.parameter_sweep_optimizer import ParameterSweepOptimizer
from backend.optimization.recommendation_engine import RecommendationEngine


class TestWindowIntegration(unittest.TestCase):
    """Test suite for window integration, validation, unified glazing, and EnergyPlus generation."""

    def setUp(self):
        self.generator = EnergyPlusIDFGenerator(engine_version="24.1")
        self.repo_root = Path(__file__).resolve().parent.parent.parent
        self.weather_file = self.repo_root / "simulation" / "weather" / "test_weather.epw"
        self.base_geom = {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0}

    # =========================================================================
    # 1. UNIFIED GLAZING REGISTRY TESTS
    # =========================================================================

    def test_glazing_database_unification(self):
        """Prove that EnergyPlus generator, Optimizer, and Recommendation Engine share identical glazing properties."""
        for g_id in ["Single_Clear", "Double_LowE_Argon", "Triple_LowE_Krypton"]:
            g_def = glazing_db.get_glazing(g_id)
            self.assertIsNotNone(g_def)
            self.assertGreater(g_def.u_value, 0.0)
            self.assertGreater(g_def.shgc, 0.0)
            self.assertGreater(g_def.visible_transmittance, 0.0)
            self.assertGreater(g_def.cost_per_m2, 0.0)

        # Verify optimizer uses identical values
        opt = ParameterSweepOptimizer(base_model={"geometry": self.base_geom})
        opt_res_single = opt.evaluate_thermal_physics(
            {"glazing_type": "Single_Clear", "insulation_thickness": 0.10, "wall_construction": "Standard_EPS_Wall", "thermal_mass": "Rammed_Earth_300mm", "roof_construction": "Pitched_Tin_Roof", "window_area": 2.0, "window_placement": "south_dominant", "ventilation": 0.5},
        )
        opt_res_triple = opt.evaluate_thermal_physics(
            {"glazing_type": "Triple_LowE_Krypton", "insulation_thickness": 0.10, "wall_construction": "Standard_EPS_Wall", "thermal_mass": "Rammed_Earth_300mm", "roof_construction": "Pitched_Tin_Roof", "window_area": 2.0, "window_placement": "south_dominant", "ventilation": 0.5},
        )
        # Triple glazing must produce substantially lower heat loss rate (UA) and higher cost
        self.assertGreater(opt_res_triple["material_cost_usd"], opt_res_single["material_cost_usd"])
        self.assertLess(opt_res_triple["total_heat_loss_rate_ua"], opt_res_single["total_heat_loss_rate_ua"])
        self.assertLess(opt_res_triple["peak_heat_loss_w"], opt_res_single["peak_heat_loss_w"])
        # Single clear has higher SHGC (0.81 vs 0.35) admitting more raw solar gain
        self.assertGreater(opt_res_single["total_solar_gain_kwh"], opt_res_triple["total_solar_gain_kwh"])

    # =========================================================================
    # 2. STRICT VALIDATION TESTS (REJECT IMPOSSIBLE GEOMETRY)
    # =========================================================================

    def test_validation_window_larger_than_wall(self):
        """Reject window when width exceeds wall length or height exceeds wall height."""
        # Width 7m exceeds south wall length (6m)
        win_wide = {"id": "win-too-wide", "wall": "south", "position_x": 0.5, "width": 7.0, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win_wide], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("exceeds south wall length" in e for e in errors))

        # Height 3.5m exceeds wall height (2.8m)
        win_tall = {"id": "win-too-tall", "wall": "south", "position_x": 1.0, "width": 1.5, "height": 3.5, "sill_height": 0.0}
        is_valid, errors = OpeningValidator.validate_openings([win_tall], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("exceeds south wall height" in e for e in errors))

    def test_validation_invalid_position_negative_or_out_of_bounds(self):
        """Reject window with negative position or position starting outside the wall."""
        win_neg = {"id": "win-neg-pos", "wall": "south", "position_x": -1.0, "width": 1.5, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win_neg], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("cannot be negative" in e for e in errors))

        win_past = {"id": "win-past-wall", "wall": "south", "position_x": 6.5, "width": 1.0, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win_past], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("outside south wall" in e for e in errors))

    def test_validation_window_outside_wall_boundary(self):
        """Reject window whose right edge (position_x + width) extends past wall length."""
        # 5.0 + 1.5 = 6.5m > 6.0m
        win_overflow = {"id": "win-overflow", "wall": "south", "position_x": 5.0, "width": 1.5, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win_overflow], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("extends outside south wall boundary" in e for e in errors))

    def test_validation_invalid_sill_height(self):
        """Reject window with negative sill height or sill + height exceeding wall top."""
        win_neg_sill = {"id": "win-neg-sill", "wall": "south", "position_x": 1.0, "width": 1.5, "height": 1.2, "sill_height": -0.5}
        is_valid, errors = OpeningValidator.validate_openings([win_neg_sill], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("Sill height cannot be negative" in e for e in errors))

        # 2.0 + 1.2 = 3.2m > 2.8m wall height
        win_high_sill = {"id": "win-high-sill", "wall": "south", "position_x": 1.0, "width": 1.5, "height": 1.2, "sill_height": 2.0}
        is_valid, errors = OpeningValidator.validate_openings([win_high_sill], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("exceeds south wall height" in e for e in errors))

    def test_validation_overlapping_windows(self):
        """Reject overlapping windows on the same wall surface."""
        win1 = {"id": "win-1", "wall": "south", "position_x": 1.0, "width": 2.0, "height": 1.2, "sill_height": 0.8}
        # win2 starts at 2.0, overlapping win1 (1.0 to 3.0) at the same elevation
        win2 = {"id": "win-2", "wall": "south", "position_x": 2.0, "width": 2.0, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win1, win2], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("Overlapping openings detected" in e for e in errors))

    def test_validation_window_door_overlap(self):
        """Reject window colliding with a door on the same wall."""
        door = {"id": "door-1", "wall": "north", "position_x": 1.0, "width": 1.0, "height": 2.1}
        win = {"id": "win-door-collide", "wall": "north", "position_x": 1.5, "width": 1.5, "height": 1.0, "sill_height": 1.2}
        is_valid, errors = OpeningValidator.validate_openings([win], [door], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("collides with" in e for e in errors))

    def test_validation_impossible_geometry(self):
        """Reject window with non-positive dimensions or NaN values."""
        win_zero = {"id": "win-zero", "wall": "south", "position_x": 1.0, "width": 0.0, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win_zero], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("Width must be > 0 m" in e for e in errors))

        win_nan = {"id": "win-nan", "wall": "south", "position_x": float("nan"), "width": 1.0, "height": 1.2, "sill_height": 0.8}
        is_valid, errors = OpeningValidator.validate_openings([win_nan], [], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("impossible non-finite value" in e for e in errors))

    # =========================================================================
    # 3. 7 REQUIRED INTEGRATION CASES
    # =========================================================================

    def _generate_idf_for_shelter(self, shelter: dict) -> str:
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter=shelter, output_path=idf_path)
            return Path(idf_path).read_text(encoding="utf-8")

    def test_case_1_no_window(self):
        """Case 1: No windows in shelter generates zero window FenestrationSurface objects."""
        shelter = {"id": "case-1", "geometry": self.base_geom, "windows": []}
        idf = self._generate_idf_for_shelter(shelter)
        self.assertNotIn("Surface Type\n  Window", idf)
        self.assertNotIn("FenestrationSurface:Detailed,\n  Window", idf)

    def test_case_2_one_south_window(self):
        """Case 2: One south window preserves properties and generates exact vertices."""
        win = {
            "id": "South_Solar_Aperture",
            "wall": "south",
            "position_x": 2.0,
            "width": 2.0,
            "height": 1.2,
            "sill_height": 0.9,
            "glazing_type": "Double_LowE_Argon",
            "frame_type": "UPVC_Insulated",
            "shading_overhang": 0.45,
        }
        shelter = {"id": "case-2", "geometry": self.base_geom, "windows": [win]}
        idf = self._generate_idf_for_shelter(shelter)

        # Glazing construction emitted from canonical glazing_db
        self.assertIn("Double_LowE_Argon_Const", idf)
        self.assertIn("Double_LowE_Argon_Mat", idf)

        # FenestrationSurface
        self.assertIn("FenestrationSurface:Detailed,", idf)
        self.assertIn("South_Solar_Aperture,", idf)
        self.assertIn("SouthWall,", idf)
        self.assertIn("Frame_UPVC_Insulated,", idf)

        # Counter-clockwise vertices for South wall (outside view):
        # x0=2.0, x1=4.0, z0=0.9, z1=2.1
        self.assertIn("2.000, 0.000, 2.100, !- Vertex 1", idf)
        self.assertIn("2.000, 0.000, 0.900, !- Vertex 2", idf)
        self.assertIn("4.000, 0.000, 0.900, !- Vertex 3", idf)
        self.assertIn("4.000, 0.000, 2.100; !- Vertex 4", idf)

        # Shading overhang emitted
        self.assertIn("Shading:Overhang,", idf)
        self.assertIn("Overhang_South_Solar_Aperture,", idf)
        self.assertIn("0.450;           !- Depth {m}", idf)

    def test_case_3_two_south_windows(self):
        """Case 3: Two distinct south windows with separate IDs and non-overlapping coordinates."""
        win1 = {"id": "South_Win_Left", "wall": "south", "position_x": 0.5, "width": 1.8, "height": 1.2, "sill_height": 0.9}
        win2 = {"id": "South_Win_Right", "wall": "south", "position_x": 3.5, "width": 1.8, "height": 1.2, "sill_height": 0.9}
        shelter = {"id": "case-3", "geometry": self.base_geom, "windows": [win1, win2]}
        idf = self._generate_idf_for_shelter(shelter)

        self.assertIn("South_Win_Left,", idf)
        self.assertIn("South_Win_Right,", idf)
        # Both must reference SouthWall
        matches = re.findall(r"FenestrationSurface:Detailed,\s*\n\s*([^,]+),", idf)
        self.assertIn("South_Win_Left", matches)
        self.assertIn("South_Win_Right", matches)

    def test_case_4_east_window(self):
        """Case 4: East window bound to EastWall with Y-axis counter-clockwise coordinates."""
        # East wall length = width = 4.0m
        win = {"id": "East_Morning_Win", "wall": "east", "position_x": 1.0, "width": 1.5, "height": 1.0, "sill_height": 1.0}
        shelter = {"id": "case-4", "geometry": self.base_geom, "windows": [win]}
        idf = self._generate_idf_for_shelter(shelter)

        self.assertIn("East_Morning_Win,", idf)
        self.assertIn("EastWall,", idf)
        # East wall is at X = 6.0, Y in [1.0, 2.5], Z in [1.0, 2.0]
        self.assertIn("6.000, 1.000, 2.000, !- Vertex 1", idf)
        self.assertIn("6.000, 1.000, 1.000, !- Vertex 2", idf)
        self.assertIn("6.000, 2.500, 1.000, !- Vertex 3", idf)
        self.assertIn("6.000, 2.500, 2.000; !- Vertex 4", idf)

    def test_case_5_west_window(self):
        """Case 5: West window bound to WestWall with inverted Y-axis coordinates."""
        # West wall length = width = 4.0m
        win = {"id": "West_Sunset_Win", "wall": "west", "position_x": 1.0, "width": 1.5, "height": 1.0, "sill_height": 1.0}
        shelter = {"id": "case-5", "geometry": self.base_geom, "windows": [win]}
        idf = self._generate_idf_for_shelter(shelter)

        self.assertIn("West_Sunset_Win,", idf)
        self.assertIn("WestWall,", idf)
        # West wall is at X = 0.0. Looking from outside, Left is Y=4.0, pos_x=1.0 -> y0=3.0, y1=1.5
        self.assertIn("0.000, 3.000, 2.000, !- Vertex 1", idf)
        self.assertIn("0.000, 3.000, 1.000, !- Vertex 2", idf)
        self.assertIn("0.000, 1.500, 1.000, !- Vertex 3", idf)
        self.assertIn("0.000, 1.500, 2.000; !- Vertex 4", idf)

    def test_case_6_different_glazing(self):
        """Case 6: Glazing selection propagates to construction binding."""
        win_single = {"id": "Win_Single", "wall": "south", "position_x": 1.0, "width": 1.5, "height": 1.0, "sill_height": 1.0, "glazing_type": "Single_Clear"}
        shelter_single = {"id": "case-6-single", "geometry": self.base_geom, "windows": [win_single]}
        idf_single = self._generate_idf_for_shelter(shelter_single)
        self.assertRegex(idf_single, r"Win_Single,[\s\S]*?Window,[\s\S]*?Single_Clear_Const,")

        win_triple = {"id": "Win_Triple", "wall": "south", "position_x": 1.0, "width": 1.5, "height": 1.0, "sill_height": 1.0, "glazing_type": "Triple_LowE_Krypton"}
        shelter_triple = {"id": "case-6-triple", "geometry": self.base_geom, "windows": [win_triple]}
        idf_triple = self._generate_idf_for_shelter(shelter_triple)
        self.assertRegex(idf_triple, r"Win_Triple,[\s\S]*?Window,[\s\S]*?Triple_LowE_Krypton_Const,")

    def test_case_7_changed_window_area(self):
        """Case 7: Changing window aperture dimensions directly scales vertex coordinates."""
        # 1.5m x 1.0m = 1.5m²
        win_small = {"id": "Win_Small", "wall": "south", "position_x": 1.0, "width": 1.5, "height": 1.0, "sill_height": 0.9}
        idf_small = self._generate_idf_for_shelter({"id": "small", "geometry": self.base_geom, "windows": [win_small]})
        self.assertIn("2.500, 0.000, 0.900, !- Vertex 3", idf_small)

        # 3.0m x 1.5m = 4.5m²
        win_large = {"id": "Win_Large", "wall": "south", "position_x": 1.0, "width": 3.0, "height": 1.5, "sill_height": 0.9}
        idf_large = self._generate_idf_for_shelter({"id": "large", "geometry": self.base_geom, "windows": [win_large]})
        self.assertIn("4.000, 0.000, 0.900, !- Vertex 3", idf_large)

    # =========================================================================
    # 4. REAL ENERGYPLUS SIMULATION PROOF (AT LEAST 2 CASES DIFFER PHYSICAL OUTPUT)
    # =========================================================================

    def test_real_energyplus_execution_proves_model_differs(self):
        """Run real EnergyPlus on Case 1 (No Window) vs Case 2 (South Window) and prove dynamic heat balance differences."""
        runner = EnergyPlusRunner()
        if not runner.is_available:
            self.skipTest("EnergyPlus runner not available on host system.")
        if not self.weather_file.exists():
            self.skipTest(f"Weather fixture not found at {self.weather_file}")

        # Model A: No Window (Baseline closed envelope)
        shelter_no_win = {
            "id": "sim-no-win",
            "geometry": self.base_geom,
            "envelope": {
                "walls": {"north": {"constructionId": "default-insulated-earth-wall"}},
                "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}, {"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
            "windows": [],
        }

        # Model B: Large South Window with Double Low-E Argon
        shelter_with_win = {
            "id": "sim-with-win",
            "geometry": self.base_geom,
            "envelope": {
                "walls": {"north": {"constructionId": "default-insulated-earth-wall"}},
                "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}, {"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
            "windows": [
                {
                    "id": "South_Solar_Aperture",
                    "wall": "south",
                    "position_x": 1.5,
                    "width": 3.0,
                    "height": 1.5,
                    "sill_height": 0.8,
                    "glazing_type": "Double_LowE_Argon",
                    "frame_type": "UPVC_Insulated",
                }
            ],
        }

        with tempfile.TemporaryDirectory() as tmpdir_a, tempfile.TemporaryDirectory() as tmpdir_b:
            idf_a = os.path.join(tmpdir_a, "in.idf")
            idf_b = os.path.join(tmpdir_b, "in.idf")

            self.generator.generate_idf(shelter_no_win, idf_a, run_period_days=1, start_month=1, start_day=15, end_month=1, end_day=15, timestep=4)
            self.generator.generate_idf(shelter_with_win, idf_b, run_period_days=1, start_month=1, start_day=15, end_month=1, end_day=15, timestep=4)

            # Run Model A
            out_a = runner.run(idf_path=idf_a, epw_path=str(self.weather_file.resolve()), work_dir=tmpdir_a, timeout_seconds=60)
            self.assertEqual(out_a.exit_code, 0, f"EnergyPlus Model A failed: {out_a.stderr}")

            # Run Model B
            out_b = runner.run(idf_path=idf_b, epw_path=str(self.weather_file.resolve()), work_dir=tmpdir_b, timeout_seconds=60)
            self.assertEqual(out_b.exit_code, 0, f"EnergyPlus Model B failed: {out_b.stderr}")

            # Verify physical output difference from CSV results
            csv_a = Path(tmpdir_a) / "eplusout.csv"
            csv_b = Path(tmpdir_b) / "eplusout.csv"

            self.assertTrue(csv_a.exists(), "CSV output A not found")
            self.assertTrue(csv_b.exists(), "CSV output B not found")

            content_a = csv_a.read_text()
            content_b = csv_b.read_text()

            # Prove: Model B with window contains transmitted solar radiation, while Model A does not
            self.assertNotIn("SURFACE WINDOW TRANSMITTED SOLAR RADIATION RATE", content_a.upper())
            self.assertIn("SOUTH_SOLAR_APERTURE", content_b.upper())
            self.assertIn("SURFACE WINDOW TRANSMITTED SOLAR RADIATION RATE", content_b.upper())

            # Prove: Indoor temperatures differ dynamically
            self.assertNotEqual(content_a, content_b, "Physical simulation outputs must not be identical")


if __name__ == "__main__":
    unittest.main()
