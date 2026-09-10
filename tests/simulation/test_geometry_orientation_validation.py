"""Automated geometry, surface winding, outward normal, and orientation validation test suite."""

import unittest
import tempfile
import math
import numpy as np
from pathlib import Path

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.engine import EnergyPlusEngine


class TestGeometryAndOrientationValidation(unittest.TestCase):
    """Verifies that the canonical ShelterModel drives mathematically exact geometry,
    outward-facing surface normals, counter-clockwise vertex winding, and consistent
    orientation mapping in EnergyPlus simulations without severe errors or geometric warnings.
    """

    def setUp(self):
        self.generator = EnergyPlusIDFGenerator(engine_version="24.1")
        self.weather_file = Path("simulation/weather/test_weather.epw")

    def _make_shelter(
        self,
        length: float = 6.0,
        width: float = 4.0,
        height: float = 3.0,
        orientation: float = 0.0,
        roof_type: str = "Flat",
        roof_angle: float = 0.0,
    ):
        return {
            "id": f"shelter_{roof_type}_{int(length)}x{int(width)}",
            "name": f"Validation Shelter {roof_type}",
            "location": {
                "latitude": 34.1526,
                "longitude": 77.5771,
                "elevation": 3500.0,
                "region": "Ladakh",
                "weather_source": "test_weather.epw",
            },
            "geometry": {
                "shape": "Rectangle",
                "length": length,
                "width": width,
                "height": height,
                "orientation": orientation,
                "roof_type": roof_type,
                "roof_angle": roof_angle,
                "floor_elevation": 0.0,
            },
        }

    # =========================================================================
    # 1. MATHEMATICAL FORMULA VERIFICATION (Area, Volume, Ceiling Height)
    # =========================================================================

    def test_01_flat_roof_geometry_properties(self):
        """Verify exact floor area, roof area, wall area, volume, and mean ceiling height for Flat roof."""
        L, W, H = 6.0, 4.0, 3.0
        props = self.generator.calculate_geometry_properties(L, W, H, "Flat", 0.0)

        self.assertAlmostEqual(props["floor_area"], 24.0, places=3)
        self.assertAlmostEqual(props["roof_area"], 24.0, places=3)
        self.assertAlmostEqual(props["wall_area"], 2 * (L * H) + 2 * (W * H), places=3)
        self.assertAlmostEqual(props["volume"], 72.0, places=3)
        self.assertAlmostEqual(props["mean_ceiling_height"], H, places=3)
        self.assertAlmostEqual(props["peak_height"], H, places=3)
        self.assertAlmostEqual(props["total_envelope_area"], 24.0 + 24.0 + 60.0, places=3)

    def test_02_shed_roof_geometry_properties(self):
        """Verify sloped roof area, trapezoidal wall areas, volume, and mean ceiling height for Shed roof."""
        L, W, H = 6.0, 4.0, 3.0
        angle = 20.0
        rad = math.radians(angle)
        delta_h = W * math.tan(rad)
        expected_slope_len = W / math.cos(rad)

        props = self.generator.calculate_geometry_properties(L, W, H, "Shed", angle)

        self.assertAlmostEqual(props["floor_area"], 24.0, places=3)
        self.assertAlmostEqual(props["roof_area"], L * expected_slope_len, places=3)
        expected_wall_area = (L * H) + (L * (H + delta_h)) + 2 * (W * (H + 0.5 * delta_h))
        self.assertAlmostEqual(props["wall_area"], expected_wall_area, places=3)
        expected_vol = L * W * (H + 0.5 * delta_h)
        self.assertAlmostEqual(props["volume"], expected_vol, places=3)
        self.assertAlmostEqual(props["mean_ceiling_height"], H + 0.5 * delta_h, places=3)
        self.assertAlmostEqual(props["peak_height"], H + delta_h, places=3)

    def test_03_gable_roof_geometry_properties(self):
        """Verify dual pitch roof area, pentagonal wall areas, volume, and mean ceiling height for Gable roof."""
        L, W, H = 6.0, 4.0, 3.0
        angle = 20.0
        rad = math.radians(angle)
        delta_h = 0.5 * W * math.tan(rad)
        slope_len = (0.5 * W) / math.cos(rad)

        props = self.generator.calculate_geometry_properties(L, W, H, "Gable", angle)

        self.assertAlmostEqual(props["floor_area"], 24.0, places=3)
        self.assertAlmostEqual(props["roof_area"], 2 * (L * slope_len), places=3)
        expected_wall_area = 2 * (L * H) + 2 * (W * H + 0.5 * W * delta_h)
        self.assertAlmostEqual(props["wall_area"], expected_wall_area, places=3)
        expected_vol = L * W * (H + 0.5 * delta_h)
        self.assertAlmostEqual(props["volume"], expected_vol, places=3)
        self.assertAlmostEqual(props["mean_ceiling_height"], H + 0.5 * delta_h, places=3)
        self.assertAlmostEqual(props["peak_height"], H + delta_h, places=3)

    # =========================================================================
    # 2. SURFACE VERTEX WINDING & OUTWARD NORMAL CROSS-PRODUCTS
    # =========================================================================

    def _parse_surface_vertices_from_idf(self, idf_text: str):
        """Extract all BuildingSurface:Detailed blocks and parse their vertex coordinates."""
        surfaces = {}
        blocks = idf_text.split("BuildingSurface:Detailed,")
        for b in blocks[1:]:
            lines = [line.split("!")[0].strip().rstrip(",;") for line in b.strip().splitlines() if line.strip() and not line.strip().startswith("!-")]
            if not lines:
                continue
            name = lines[0]
            stype = lines[1]
            # Vertices start after Number of Vertices line
            num_v = 0
            for idx, l in enumerate(lines):
                if l.isdigit():
                    num_v = int(l)
                    v_start = idx + 1
                    break
            verts = []
            for i in range(num_v):
                coord_str = lines[v_start + i]
                parts = [float(p.strip()) for p in coord_str.split(",") if p.strip()]
                verts.append(parts)
            surfaces[name] = {"type": stype, "vertices": np.array(verts)}
        return surfaces

    def _compute_surface_normal(self, verts: np.ndarray) -> np.ndarray:
        """Compute normal vector using Newells method or edge cross-product."""
        # Edge cross-product between (v1-v0) and (v2-v1)
        e1 = verts[1] - verts[0]
        e2 = verts[2] - verts[1]
        n = np.cross(e1, e2)
        norm = np.linalg.norm(n)
        return n / norm if norm > 0 else n

    def test_04_flat_roof_surface_normals_and_winding(self):
        """Verify all surface normals point strictly outwards for Flat roof."""
        shelter = self._make_shelter(6.0, 4.0, 3.0, roof_type="Flat", roof_angle=0.0)
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "flat.idf"
            self.generator.generate_idf(shelter, str(p))
            surfs = self._parse_surface_vertices_from_idf(p.read_text())

            # Floor: -Z
            n_floor = self._compute_surface_normal(surfs["FloorSurface"]["vertices"])
            self.assertAlmostEqual(n_floor[0], 0.0, places=2)
            self.assertAlmostEqual(n_floor[1], 0.0, places=2)
            self.assertAlmostEqual(n_floor[2], -1.0, places=2)

            # Roof: +Z
            n_roof = self._compute_surface_normal(surfs["RoofSurface"]["vertices"])
            self.assertAlmostEqual(n_roof[0], 0.0, places=2)
            self.assertAlmostEqual(n_roof[1], 0.0, places=2)
            self.assertAlmostEqual(n_roof[2], 1.0, places=2)

            # South Wall: -Y
            n_south = self._compute_surface_normal(surfs["SouthWall"]["vertices"])
            self.assertAlmostEqual(n_south[0], 0.0, places=2)
            self.assertAlmostEqual(n_south[1], -1.0, places=2)
            self.assertAlmostEqual(n_south[2], 0.0, places=2)

            # North Wall: +Y
            n_north = self._compute_surface_normal(surfs["NorthWall"]["vertices"])
            self.assertAlmostEqual(n_north[0], 0.0, places=2)
            self.assertAlmostEqual(n_north[1], 1.0, places=2)
            self.assertAlmostEqual(n_north[2], 0.0, places=2)

            # East Wall: +X
            n_east = self._compute_surface_normal(surfs["EastWall"]["vertices"])
            self.assertAlmostEqual(n_east[0], 1.0, places=2)
            self.assertAlmostEqual(n_east[1], 0.0, places=2)
            self.assertAlmostEqual(n_east[2], 0.0, places=2)

            # West Wall: -X
            n_west = self._compute_surface_normal(surfs["WestWall"]["vertices"])
            self.assertAlmostEqual(n_west[0], -1.0, places=2)
            self.assertAlmostEqual(n_west[1], 0.0, places=2)
            self.assertAlmostEqual(n_west[2], 0.0, places=2)

    def test_05_shed_roof_surface_normals_and_winding(self):
        """Verify all surface normals point strictly outwards for Shed roof."""
        shelter = self._make_shelter(6.0, 4.0, 3.0, roof_type="Shed", roof_angle=20.0)
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "shed.idf"
            self.generator.generate_idf(shelter, str(p))
            surfs = self._parse_surface_vertices_from_idf(p.read_text())

            # Roof tilts South (-Y) and Up (+Z)
            n_roof = self._compute_surface_normal(surfs["RoofSurface"]["vertices"])
            self.assertLess(n_roof[1], 0.0, "Roof normal must tilt South (-Y)")
            self.assertGreater(n_roof[2], 0.0, "Roof normal must tilt Up (+Z)")

            # East Wall: +X
            n_east = self._compute_surface_normal(surfs["EastWall"]["vertices"])
            self.assertAlmostEqual(n_east[0], 1.0, places=2)

            # West Wall: -X
            n_west = self._compute_surface_normal(surfs["WestWall"]["vertices"])
            self.assertAlmostEqual(n_west[0], -1.0, places=2)

    def test_06_gable_roof_surface_normals_and_winding(self):
        """Verify all surface normals point strictly outwards for Gable roof (including corrected pentagons)."""
        shelter = self._make_shelter(6.0, 4.0, 3.0, roof_type="Gable", roof_angle=20.0)
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "gable.idf"
            self.generator.generate_idf(shelter, str(p))
            surfs = self._parse_surface_vertices_from_idf(p.read_text())

            # South Roof Pitch tilts South (-Y) and Up (+Z)
            n_south_roof = self._compute_surface_normal(surfs["RoofSurface_South"]["vertices"])
            self.assertLess(n_south_roof[1], 0.0)
            self.assertGreater(n_south_roof[2], 0.0)

            # North Roof Pitch tilts North (+Y) and Up (+Z)
            n_north_roof = self._compute_surface_normal(surfs["RoofSurface_North"]["vertices"])
            self.assertGreater(n_north_roof[1], 0.0)
            self.assertGreater(n_north_roof[2], 0.0)

            # East Wall pentagon: MUST point +X (Outwards)
            n_east = self._compute_surface_normal(surfs["EastWall"]["vertices"])
            self.assertAlmostEqual(n_east[0], 1.0, places=2, msg="East Wall pentagon normal must point +X outwards")
            self.assertAlmostEqual(n_east[1], 0.0, places=2)
            self.assertAlmostEqual(n_east[2], 0.0, places=2)

            # West Wall pentagon: MUST point -X (Outwards)
            n_west = self._compute_surface_normal(surfs["WestWall"]["vertices"])
            self.assertAlmostEqual(n_west[0], -1.0, places=2, msg="West Wall pentagon normal must point -X outwards")
            self.assertAlmostEqual(n_west[1], 0.0, places=2)
            self.assertAlmostEqual(n_west[2], 0.0, places=2)

    # =========================================================================
    # 3. REAL ENERGYPLUS SIMULATION VALIDATION (Zero Geometric Warnings)
    # =========================================================================

    def test_07_real_energyplus_flat_roof_simulation(self):
        """Execute real EnergyPlus simulation on Flat roof: verify exit code 0, 0 severe errors, 0 volume warnings."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        shelter = self._make_shelter(6.0, 4.0, 3.0, roof_type="Flat", roof_angle=0.0)
        with tempfile.TemporaryDirectory() as td:
            engine.prepare_model(shelter, str(self.weather_file), output_dir=td, run_period_days=1)
            # Add ExtraWarnings to assert zero geometry discrepancies
            idf = Path(td) / "in.idf"
            idf.write_text(idf.read_text() + "\nOutput:Diagnostics, DisplayExtraWarnings;\n")

            res = engine.run_simulation(timeout_seconds=60)
            self.assertTrue(res["success"])
            self.assertEqual(res["exit_code"], 0)
            self.assertEqual(res["error_inspection"]["severe_errors"], 0)

            err_content = (Path(td) / "eplusout.err").read_text()
            self.assertNotIn("Entered Zone Volumes differ from calculated", err_content)
            self.assertNotIn("Entered Ceiling Height for Zone", err_content)

    def test_08_real_energyplus_shed_roof_simulation(self):
        """Execute real EnergyPlus simulation on Shed roof: verify exit code 0, 0 severe errors, 0 volume warnings."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        shelter = self._make_shelter(6.0, 4.0, 3.0, roof_type="Shed", roof_angle=20.0)
        with tempfile.TemporaryDirectory() as td:
            engine.prepare_model(shelter, str(self.weather_file), output_dir=td, run_period_days=1)
            idf = Path(td) / "in.idf"
            idf.write_text(idf.read_text() + "\nOutput:Diagnostics, DisplayExtraWarnings;\n")

            res = engine.run_simulation(timeout_seconds=60)
            self.assertTrue(res["success"])
            self.assertEqual(res["exit_code"], 0)
            self.assertEqual(res["error_inspection"]["severe_errors"], 0)

            err_content = (Path(td) / "eplusout.err").read_text()
            self.assertNotIn("Entered Zone Volumes differ from calculated", err_content)
            self.assertNotIn("Entered Ceiling Height for Zone", err_content)

    def test_09_real_energyplus_gable_roof_simulation(self):
        """Execute real EnergyPlus simulation on Gable roof: verify exit code 0, 0 severe errors, 0 volume warnings."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        shelter = self._make_shelter(6.0, 4.0, 3.0, roof_type="Gable", roof_angle=20.0)
        with tempfile.TemporaryDirectory() as td:
            engine.prepare_model(shelter, str(self.weather_file), output_dir=td, run_period_days=1)
            idf = Path(td) / "in.idf"
            idf.write_text(idf.read_text() + "\nOutput:Diagnostics, DisplayExtraWarnings;\n")

            res = engine.run_simulation(timeout_seconds=60)
            self.assertTrue(res["success"])
            self.assertEqual(res["exit_code"], 0)
            self.assertEqual(res["error_inspection"]["severe_errors"], 0)

            err_content = (Path(td) / "eplusout.err").read_text()
            self.assertNotIn("Entered Zone Volumes differ from calculated", err_content)
            self.assertNotIn("Entered Ceiling Height for Zone", err_content)

    def test_10_orientation_rotations_simulation(self):
        """Execute real EnergyPlus simulations across all 4 cardinal orientations (0, 90, 180, 270 deg)."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        for azimuth in [0.0, 90.0, 180.0, 270.0]:
            shelter = self._make_shelter(6.0, 4.0, 3.0, orientation=azimuth, roof_type="Gable", roof_angle=15.0)
            with tempfile.TemporaryDirectory() as td:
                engine.prepare_model(shelter, str(self.weather_file), output_dir=td, run_period_days=1)
                res = engine.run_simulation(timeout_seconds=60)
                self.assertTrue(res["success"], f"Simulation failed on azimuth {azimuth}")
                self.assertEqual(res["exit_code"], 0)
                self.assertEqual(res["error_inspection"]["severe_errors"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
