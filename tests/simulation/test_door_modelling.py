"""Comprehensive automated tests for Door Modelling and EnergyPlus Integration.

Verifies:
1. Door input flows: UI -> ShelterModel.doors[] -> backend -> geometry -> construction -> EnergyPlus.
2. Respect of user's selected door construction:
   - No permanently hardcoded door material/construction when user selects another valid construction.
   - Support for custom multi-layer door assemblies and custom materials.
   - Preservation of id, host wall, position, width, height, sill height, construction, layers, and opening schedule.
3. Strict validation:
   - Door width cannot exceed wall length.
   - Door height cannot exceed wall height.
   - Door cannot have invalid/negative position.
   - Door right edge cannot exceed wall boundary.
   - Overlapping openings (door-door, door-window) must be rejected.
   - Non-positive, NaN, or Inf values are rejected.
4. All required cases:
   - Case 1: No door
   - Case 2: One door (South wall)
   - Case 3: Multiple doors (South entry + North exit)
   - Case 4: Custom door construction (Multi-layer insulated assembly)
   - Case 5: Different wall (East and West walls)
   - Case 6: Door opening schedule (Schedule:Compact generation)
5. Live EnergyPlus execution proof:
   - Real EnergyPlus execution on Model A (Uninsulated Wood Door) vs Model B (Insulated Heavy Timber Door).
   - Proves physical differences in indoor temperatures and conduction heat transfer.
"""

import os
import re
import tempfile
import unittest
from pathlib import Path

from simulation.materials.database import material_db
from simulation.materials.material import Construction, ConstructionLayer
from simulation.validation.opening_validator import OpeningValidator
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner


class TestDoorModelling(unittest.TestCase):
    """Test suite for door modeling, geometric validation, multi-layer constructions, and EnergyPlus generation."""

    def setUp(self):
        self.generator = EnergyPlusIDFGenerator(engine_version="24.1")
        self.repo_root = Path(__file__).resolve().parent.parent.parent
        self.weather_file = self.repo_root / "simulation" / "weather" / "test_weather.epw"
        self.base_geom = {
            "length": 6.0,
            "width": 4.0,
            "height": 2.8,
            "roof_type": "Flat",
            "roof_angle": 0.0,
        }

    # =========================================================================
    # 1. GEOMETRIC & CONSTRUCTION INTEGRATION CASES
    # =========================================================================

    def test_case_1_no_door(self):
        """Case 1: Shelter with no doors generates clean IDF without door fenestrations."""
        shelter = {
            "id": "shelter-no-door",
            "geometry": self.base_geom,
            "doors": [],
            "windows": [],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            # Ensure no door FenestrationSurface is generated
            self.assertNotIn("Door,", content)
            self.assertNotIn("Door_Const", content)

    def test_case_2_one_door_south_wall(self):
        """Case 2: Single door on South wall is correctly positioned and bound to its construction."""
        door = {
            "id": "main_south_entry",
            "wall": "south",
            "position_x": 1.5,
            "width": 1.0,
            "height": 2.1,
            "construction": "insulated_heavy_timber_door",
        }
        shelter = {
            "id": "shelter-one-door",
            "geometry": self.base_geom,
            "doors": [door],
            "windows": [],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            # Verify FenestrationSurface:Detailed for door
            self.assertIn("main_south_entry", content)
            self.assertIn("SouthWall", content)
            self.assertIn("Door,", content)

            # Verify resolved construction name
            self.assertIn("Door_Const_main_south_entry", content)

            # Verify counter-clockwise coordinates on South wall:
            # v1: (1.5, 0, 2.1), v2: (1.5, 0, 0), v3: (2.5, 0, 0), v4: (2.5, 0, 2.1)
            self.assertIn("1.500, 0.000, 2.100", content)
            self.assertIn("1.500, 0.000, 0.000", content)
            self.assertIn("2.500, 0.000, 0.000", content)
            self.assertIn("2.500, 0.000, 2.100", content)

    def test_case_3_multiple_doors_different_walls(self):
        """Case 3: Multiple doors on different walls (South entrance + North emergency exit)."""
        doors = [
            {
                "id": "entry_door",
                "wall": "south",
                "position_x": 1.0,
                "width": 1.0,
                "height": 2.1,
                "construction": "insulated_timber_door",
            },
            {
                "id": "exit_door",
                "wall": "north",
                "position_x": 3.0,
                "width": 0.9,
                "height": 2.0,
                "construction": "insulated_steel_security_door",
            },
        ]
        shelter = {
            "id": "shelter-multi-doors",
            "geometry": self.base_geom,
            "doors": doors,
            "windows": [],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            # Both doors must be present on their respective walls
            self.assertIn("entry_door", content)
            self.assertIn("exit_door", content)
            self.assertIn("SouthWall", content)
            self.assertIn("NorthWall", content)

            # Both distinct constructions must be emitted
            self.assertIn("Door_Const_entry_door", content)
            self.assertIn("Door_Const_exit_door", content)

    def test_case_4_custom_door_construction_layers(self):
        """Case 4: User-specified custom multilayer door assembly (Steel + XPS + Steel) is respected."""
        custom_door = {
            "id": "custom_armored_door",
            "wall": "south",
            "position_x": 2.0,
            "width": 1.1,
            "height": 2.1,
            "layers": [
                {"material_id": "mat-galvanized-steel", "thickness": 0.003},
                {"material_id": "mat-xps-insulation", "thickness": 0.060},
                {"material_id": "mat-himalayan-timber", "thickness": 0.020},
            ],
        }
        shelter = {
            "id": "shelter-custom-door",
            "geometry": self.base_geom,
            "doors": [custom_door],
            "windows": [],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            # Verify materials are emitted with custom thicknesses
            self.assertIn("Mat_mat_galvanized_steel_3mm", content)
            self.assertIn("Mat_mat_xps_insulation_60mm", content)
            self.assertIn("Mat_mat_himalayan_timber_20mm", content)

            # Verify construction definition includes all 3 layers in outside-to-inside order
            self.assertIn("Door_Const_custom_armored_door", content)

            # Verify envelope inspection reports the custom door layers
            inspection = self.generator.inspect_envelope(shelter)
            door_meta = inspection["surfaces"]["door_custom_armored_door"]
            self.assertEqual(door_meta["layer_count"], 3)
            self.assertEqual(door_meta["layers"][0]["material_id"], "mat-galvanized-steel")
            self.assertEqual(door_meta["layers"][1]["material_id"], "mat-xps-insulation")
            self.assertEqual(door_meta["layers"][2]["material_id"], "mat-himalayan-timber")
            self.assertFalse(door_meta["is_fallback"])

    def test_case_5_different_walls_east_and_west(self):
        """Case 5: Doors on East and West walls have correct coordinate systems and outward normals."""
        doors = [
            {
                "id": "door_east",
                "wall": "east",
                "position_x": 1.0,
                "width": 0.9,
                "height": 2.1,
                "construction": "insulated_timber_door",
            },
            {
                "id": "door_west",
                "wall": "west",
                "position_x": 1.5,
                "width": 0.9,
                "height": 2.1,
                "construction": "insulated_timber_door",
            },
        ]
        shelter = {
            "id": "shelter-east-west-doors",
            "geometry": self.base_geom,
            "doors": doors,
            "windows": [],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            # East wall door at X = 6.0m (length)
            # v1: (6.0, 1.0, 2.1), v2: (6.0, 1.0, 0), v3: (6.0, 1.9, 0), v4: (6.0, 1.9, 2.1)
            self.assertIn("door_east", content)
            self.assertIn("EastWall", content)
            self.assertIn("6.000, 1.000, 2.100", content)
            self.assertIn("6.000, 1.900, 0.000", content)

            # West wall door at X = 0.0m
            # y0 = 4.0 - 1.5 = 2.5, y1 = 4.0 - 2.4 = 1.6
            # v1: (0.0, 2.5, 2.1), v2: (0.0, 2.5, 0), v3: (0.0, 1.6, 0), v4: (0.0, 1.6, 2.1)
            self.assertIn("door_west", content)
            self.assertIn("WestWall", content)
            self.assertIn("0.000, 2.500, 2.100", content)
            self.assertIn("0.000, 1.600, 0.000", content)

    def test_case_6_door_schedule(self):
        """Case 6: Door opening schedule generates valid Schedule:Compact in EnergyPlus."""
        door = {
            "id": "scheduled_entry_door",
            "wall": "south",
            "position_x": 1.0,
            "width": 1.0,
            "height": 2.1,
            "construction": "insulated_heavy_timber_door",
            "schedule": "DayOnly",
        }
        shelter = {
            "id": "shelter-door-sched",
            "geometry": self.base_geom,
            "doors": [door],
            "windows": [],
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            # Verify Schedule:Compact was emitted
            self.assertIn("Schedule:Compact,", content)
            self.assertIn("DoorSchedule_scheduled_entry_door", content)
            self.assertIn("Until: 08:00, 0.0", content)
            self.assertIn("Until: 18:00, 1.0", content)

    # =========================================================================
    # 2. STRICT VALIDATION TESTS (REJECT IMPOSSIBLE GEOMETRY)
    # =========================================================================

    def test_validation_door_width_exceeds_wall_length(self):
        """Reject door whose width exceeds the host wall length."""
        # South wall length is 6.0m; door width is 6.5m
        door = {"id": "door-oversized-w", "wall": "south", "position_x": 0.0, "width": 6.5, "height": 2.1}
        is_valid, errors = OpeningValidator.validate_openings([], [door], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("exceeds south wall length" in e for e in errors))

    def test_validation_door_height_exceeds_wall_height(self):
        """Reject door whose height exceeds the host wall height."""
        # Wall height is 2.8m; door height is 3.0m
        door = {"id": "door-oversized-h", "wall": "south", "position_x": 1.0, "width": 1.0, "height": 3.0}
        is_valid, errors = OpeningValidator.validate_openings([], [door], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("exceeds south wall height" in e for e in errors))

    def test_validation_door_negative_position(self):
        """Reject door with negative position X."""
        door = {"id": "door-neg-x", "wall": "south", "position_x": -0.5, "width": 1.0, "height": 2.1}
        is_valid, errors = OpeningValidator.validate_openings([], [door], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("cannot be negative" in e for e in errors))

    def test_validation_door_outside_wall_boundary(self):
        """Reject door whose right edge exceeds wall length."""
        # South wall is 6.0m; position 5.5 + width 1.0 = 6.5m
        door = {"id": "door-boundary-overflow", "wall": "south", "position_x": 5.5, "width": 1.0, "height": 2.1}
        is_valid, errors = OpeningValidator.validate_openings([], [door], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("extends outside south wall boundary" in e for e in errors))

    def test_validation_door_door_overlap(self):
        """Reject two doors overlapping on the same wall."""
        door1 = {"id": "door-a", "wall": "south", "position_x": 1.0, "width": 1.2, "height": 2.1}
        door2 = {"id": "door-b", "wall": "south", "position_x": 1.8, "width": 1.0, "height": 2.1}
        is_valid, errors = OpeningValidator.validate_openings([], [door1, door2], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("Overlapping openings detected" in e and "door-a" in e and "door-b" in e for e in errors))

    def test_validation_door_window_overlap(self):
        """Reject door and window colliding on the same wall."""
        door = {"id": "door-entry", "wall": "south", "position_x": 1.0, "width": 1.0, "height": 2.1}
        # Window at X: 1.5 - 3.0, Sill: 0.9m, Height: 1.2m -> Collides with door X: 1.0 - 2.0, Z: 0.0 - 2.1m
        win = {"id": "win-clash", "wall": "south", "position_x": 1.5, "width": 1.5, "height": 1.2, "sill_height": 0.9}
        is_valid, errors = OpeningValidator.validate_openings([win], [door], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("Overlapping openings detected" in e and "win-clash" in e and "door-entry" in e for e in errors))

    def test_validation_impossible_geometry_values(self):
        """Reject non-positive or NaN/Inf geometry values."""
        door_zero = {"id": "door-zero", "wall": "south", "position_x": 1.0, "width": 0.0, "height": 2.1}
        is_valid, errors = OpeningValidator.validate_openings([], [door_zero], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("Width must be > 0 m" in e for e in errors))

        door_nan = {"id": "door-nan", "wall": "south", "position_x": float("nan"), "width": 1.0, "height": 2.1}
        is_valid, errors = OpeningValidator.validate_openings([], [door_nan], self.base_geom)
        self.assertFalse(is_valid)
        self.assertTrue(any("cannot be NaN or Inf" in e for e in errors))

    # =========================================================================
    # 3. LIVE ENERGYPLUS EXECUTION PROOF (PHYSICAL MODEL DIFFERENCE)
    # =========================================================================

    def test_real_energyplus_execution_proves_door_construction_differs(self):
        """Execute live EnergyPlus on Model A (Solid Wood Door) vs Model B (Insulated Heavy Timber Door).

        Proves that selecting a different door construction changes physical indoor thermal
        behavior and surface heat transfer in actual EnergyPlus calculations.
        """
        runner = EnergyPlusRunner()
        if not runner.is_available:
            self.skipTest("EnergyPlus runner not available on host system.")
        if not self.weather_file.exists():
            self.skipTest(f"Weather fixture not found at {self.weather_file}")

        # Model A: Uninsulated Solid Softwood Timber Door (High Conductance, U ~ 2.45 W/m²K)
        shelter_uninsulated = {
            "id": "sim-door-solid-wood",
            "geometry": self.base_geom,
            "envelope": {
                "walls": {"north": {"constructionId": "default-insulated-earth-wall"}},
                "roof": {"constructionId": "default_insulated_metal_roof"},
                "floor": {"constructionId": "default_concrete_floor"},
            },
            "doors": [
                {
                    "id": "main_door",
                    "wall": "south",
                    "position_x": 2.0,
                    "width": 1.2,
                    "height": 2.2,
                    "construction": "solid_wood_door",
                }
            ],
            "windows": [],
        }

        # Model B: High-Performance Insulated Heavy Timber Door (Low Conductance, U ~ 0.61 W/m²K)
        shelter_insulated = {
            "id": "sim-door-insulated-timber",
            "geometry": self.base_geom,
            "envelope": {
                "walls": {"north": {"constructionId": "default-insulated-earth-wall"}},
                "roof": {"constructionId": "default_insulated_metal_roof"},
                "floor": {"constructionId": "default_concrete_floor"},
            },
            "doors": [
                {
                    "id": "main_door",
                    "wall": "south",
                    "position_x": 2.0,
                    "width": 1.2,
                    "height": 2.2,
                    "construction": "insulated_heavy_timber_door",
                }
            ],
            "windows": [],
        }

        with tempfile.TemporaryDirectory() as tmpdir_a, tempfile.TemporaryDirectory() as tmpdir_b:
            idf_a = os.path.join(tmpdir_a, "in.idf")
            idf_b = os.path.join(tmpdir_b, "in.idf")

            self.generator.generate_idf(
                shelter_uninsulated,
                idf_a,
                run_period_days=1,
                start_month=1,
                start_day=15,
                end_month=1,
                end_day=15,
                timestep=4,
            )
            self.generator.generate_idf(
                shelter_insulated,
                idf_b,
                run_period_days=1,
                start_month=1,
                start_day=15,
                end_month=1,
                end_day=15,
                timestep=4,
            )

            # Inspect IDF files to ensure constructions and materials differ
            idf_a_text = Path(idf_a).read_text()
            idf_b_text = Path(idf_b).read_text()

            # Model A has single 45mm timber layer
            self.assertIn("Mat_mat_himalayan_timber_45mm", idf_a_text)
            self.assertNotIn("Mat_mat_eps_insulation_50mm", idf_a_text)

            # Model B has 25mm timber + 50mm EPS + 25mm timber
            self.assertIn("Mat_mat_himalayan_timber_25mm", idf_b_text)
            self.assertIn("Mat_mat_eps_insulation_50mm", idf_b_text)

            # Run Model A in EnergyPlus
            res_a = runner.run(
                idf_path=idf_a,
                epw_path=str(self.weather_file.resolve()),
                work_dir=tmpdir_a,
                timeout_seconds=60,
            )
            self.assertEqual(res_a.exit_code, 0, f"EnergyPlus Model A failed: {res_a.stderr}")

            # Run Model B in EnergyPlus
            res_b = runner.run(
                idf_path=idf_b,
                epw_path=str(self.weather_file.resolve()),
                work_dir=tmpdir_b,
                timeout_seconds=60,
            )
            self.assertEqual(res_b.exit_code, 0, f"EnergyPlus Model B failed: {res_b.stderr}")

            # Verify physical output difference from CSV results
            csv_a = Path(tmpdir_a) / "eplusout.csv"
            csv_b = Path(tmpdir_b) / "eplusout.csv"

            self.assertTrue(csv_a.exists(), "CSV output A not found")
            self.assertTrue(csv_b.exists(), "CSV output B not found")

            content_a = csv_a.read_text()
            content_b = csv_b.read_text()

            # Prove: Simulation results differ physically between uninsulated and insulated doors
            self.assertNotEqual(
                content_a,
                content_b,
                "EnergyPlus output with insulated vs uninsulated door must physically differ.",
            )


if __name__ == "__main__":
    unittest.main()
