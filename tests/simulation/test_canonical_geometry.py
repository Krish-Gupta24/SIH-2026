"""Automated test suite verifying dynamic geometry derivation from canonical ShelterModel."""

import unittest
import tempfile
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.engine import EnergyPlusEngine


class TestCanonicalShelterGeometry(unittest.TestCase):
    """Verifies that EnergyPlusIDFGenerator derives exact 3D geometry from ShelterModel."""

    def setUp(self):
        self.generator = EnergyPlusIDFGenerator(engine_version="24.1")
        self.weather_file = ROOT_DIR / "simulation" / "weather" / "test_weather.epw"

    def _make_shelter(self, length: float, width: float, height: float, orientation: float = 0.0, roof_type: str = "Flat", roof_angle: float = 0.0):
        return {
            "id": f"shelter_{int(length)}x{int(width)}x{int(height)}",
            "name": f"Shelter {length}x{width}x{height}",
            "location": {
                "latitude": 34.1526,
                "longitude": 77.5771,
                "elevation": 3500.0,
                "region": "Ladakh",
                "climate_zone": "Cold",
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

    def test_01_geometry_properties_6x4x3(self):
        """Verify volume and surface area math for 6x4x3."""
        props = self.generator.calculate_geometry_properties(6.0, 4.0, 3.0, "Flat", 0.0)
        self.assertEqual(props["floor_area"], 24.0)
        self.assertEqual(props["roof_area"], 24.0)
        self.assertEqual(props["wall_area"], 60.0)
        self.assertEqual(props["volume"], 72.0)
        self.assertEqual(props["total_envelope_area"], 108.0)

    def test_02_geometry_properties_8x4x3(self):
        """Verify volume and surface area math for 8x4x3."""
        props = self.generator.calculate_geometry_properties(8.0, 4.0, 3.0, "Flat", 0.0)
        self.assertEqual(props["floor_area"], 32.0)
        self.assertEqual(props["roof_area"], 32.0)
        self.assertEqual(props["wall_area"], 72.0)
        self.assertEqual(props["volume"], 96.0)
        self.assertEqual(props["total_envelope_area"], 136.0)

    def test_03_geometry_properties_10x5x3(self):
        """Verify volume and surface area math for 10x5x3."""
        props = self.generator.calculate_geometry_properties(10.0, 5.0, 3.0, "Flat", 0.0)
        self.assertEqual(props["floor_area"], 50.0)
        self.assertEqual(props["roof_area"], 50.0)
        self.assertEqual(props["wall_area"], 90.0)
        self.assertEqual(props["volume"], 150.0)
        self.assertEqual(props["total_envelope_area"], 190.0)

    def test_04_orientation_mapping_in_idf(self):
        """Verify that orientation is mapped directly to Building North Axis."""
        for azimuth in [0.0, 45.0, 90.0, 180.0, 270.0]:
            shelter = self._make_shelter(6.0, 4.0, 3.0, orientation=azimuth)
            with tempfile.TemporaryDirectory() as tmpdir:
                idf_path = Path(tmpdir) / "test.idf"
                self.generator.generate_idf(shelter, str(idf_path))
                content = idf_path.read_text(encoding="utf-8")
                self.assertIn(f"  {azimuth:.2f},              !- North Axis {{deg}}", content)

    def test_05_volume_and_peak_height_shed_and_gable(self):
        """Verify that pitched roof forms increase volume and peak height appropriately."""
        flat_props = self.generator.calculate_geometry_properties(6.0, 4.0, 3.0, "Flat", 0.0)
        shed_props = self.generator.calculate_geometry_properties(6.0, 4.0, 3.0, "Shed", 15.0)
        gable_props = self.generator.calculate_geometry_properties(6.0, 4.0, 3.0, "Gable", 15.0)

        # Shed and Gable add volume over flat roof
        self.assertGreater(shed_props["volume"], flat_props["volume"])
        self.assertGreater(gable_props["volume"], flat_props["volume"])
        self.assertGreater(shed_props["peak_height"], flat_props["peak_height"])
        self.assertGreater(gable_props["peak_height"], flat_props["peak_height"])
        self.assertGreater(shed_props["roof_area"], flat_props["roof_area"])
        self.assertGreater(gable_props["roof_area"], flat_props["roof_area"])

    def test_06_simulation_dimensions_scaling(self):
        """Run real EnergyPlus simulations across 6x4x3, 8x4x3, and 10x5x3."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        models = [
            self._make_shelter(6.0, 4.0, 3.0),
            self._make_shelter(8.0, 4.0, 3.0),
            self._make_shelter(10.0, 5.0, 3.0),
        ]

        for m in models:
            with tempfile.TemporaryDirectory() as tmpdir:
                engine.prepare_model(m, str(self.weather_file), output_dir=tmpdir, run_period_days=1)
                results = engine.run_simulation(timeout_seconds=60)

                self.assertTrue(results["success"], f"Failed on model {m['name']}: {results.get('errors')}")
                self.assertEqual(results["exit_code"], 0)
                self.assertEqual(results["error_inspection"]["severe_errors"], 0)
                self.assertTrue(results["error_inspection"]["completed_successfully"])

    def test_07_simulation_orientation_variation(self):
        """Run real EnergyPlus simulations across orientation changes (0 vs 90 deg)."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        for azimuth in [0.0, 90.0, 180.0]:
            m = self._make_shelter(6.0, 4.0, 3.0, orientation=azimuth)
            with tempfile.TemporaryDirectory() as tmpdir:
                engine.prepare_model(m, str(self.weather_file), output_dir=tmpdir, run_period_days=1)
                results = engine.run_simulation(timeout_seconds=60)

                self.assertTrue(results["success"], f"Failed on orientation {azimuth}: {results.get('errors')}")
                self.assertEqual(results["exit_code"], 0)
                self.assertEqual(results["error_inspection"]["severe_errors"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
