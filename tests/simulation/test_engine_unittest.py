"""Standard library unittest test suite for EnergyPlus vertical slice."""

import json
import unittest
import tempfile
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.parsers.energyplus_parser import EnergyPlusOutputParser
from simulation.runners.engine import EnergyPlusEngine


class TestEnergyPlusVerticalSlice(unittest.TestCase):
    """Test suite verifying EnergyPlus IDF generation, error inspection, and execution."""

    def setUp(self):
        self.shelter_path = ROOT_DIR / "simulation" / "test_cases" / "fixed_test_shelter.json"
        with open(self.shelter_path, "r", encoding="utf-8") as f:
            self.shelter_data = json.load(f)
        self.weather_file = ROOT_DIR / "simulation" / "weather" / "test_weather.epw"

    def test_01_model_validation(self):
        """Test validation catches invalid geometry."""
        engine = EnergyPlusEngine()
        valid, errors = engine.validate_model(self.shelter_data)
        self.assertTrue(valid)
        self.assertEqual(len(errors), 0)

        invalid_data = {"geometry": {"length": -10.0, "width": 4.0, "height": 3.0}}
        valid, errors = engine.validate_model(invalid_data)
        self.assertFalse(valid)
        self.assertTrue(any("Invalid length" in e for e in errors))

    def test_02_idf_generation(self):
        """Test that generated IDF has valid syntax and surface vertices."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_out = Path(tmpdir) / "test.idf"
            res = generator.generate_idf(self.shelter_data, str(idf_out))
            self.assertTrue(Path(res).exists())

            content = Path(res).read_text(encoding="utf-8")
            self.assertIn("Version, 24.1;", content)
            self.assertIn("MainZone", content)
            self.assertIn("SouthWall", content)
            self.assertIn("FloorSurface", content)
            self.assertIn("RoofSurface", content)

    def test_03_error_parser_fatal_inspection(self):
        """Test parser correctly flags fatal error conditions."""
        with tempfile.TemporaryDirectory() as tmpdir:
            err_file = Path(tmpdir) / "eplusout.err"
            err_file.write_text(
                "Program Version,EnergyPlus, Version 24.1.0-9d7789a3ac\n"
                "   ** Severe  ** Surface azimuth error.\n"
                "   **  Fatal  ** Program terminated prematurely.\n"
                "EnergyPlus Terminated--Fatal Error Detected. 0 Warning; 1 Severe Errors;\n",
                encoding="utf-8",
            )
            parsed = EnergyPlusOutputParser.parse_error_file(str(err_file))
            self.assertFalse(parsed["completed_successfully"])
            self.assertTrue(parsed["fatal_error"])
            self.assertEqual(parsed["severe_error_count"], 1)

    def test_04_csv_output_parser(self):
        """Test parser correctly extracts temperature metrics and solar gains."""
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_file = Path(tmpdir) / "eplusout.csv"
            csv_file.write_text(
                "Date/Time,MAINZONE:Zone Mean Air Temperature [C](Hourly),Environment:Site Outdoor Air Drybulb Temperature [C](Hourly),MAINZONE:Zone Windows Total Transmitted Solar Radiation Rate [W](Hourly)\n"
                " 01/01  01:00:00, 15.2, -8.0, 0.0\n"
                " 01/01  12:00:00, 18.4, 1.5, 620.0\n",
                encoding="utf-8",
            )
            res = EnergyPlusOutputParser.parse_csv_results(str(csv_file))
            self.assertEqual(res["timesteps_count"], 2)
            self.assertEqual(res["indoor_temperature"]["min_c"], 15.2)
            self.assertEqual(res["indoor_temperature"]["max_c"], 18.4)
            self.assertEqual(res["solar_radiation"]["peak_transmitted_solar_w"], 620.0)

    def test_05_end_to_end_simulation(self):
        """End-to-end execution of fixed test shelter in EnergyPlus."""
        engine = EnergyPlusEngine()
        if not engine.runner.executable_path or not self.weather_file.exists():
            self.skipTest("EnergyPlus executable or test weather file not available.")

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = engine.prepare_model(
                shelter_model=self.shelter_data,
                weather_file_path=str(self.weather_file),
                output_dir=tmpdir,
                run_period_days=2,
            )
            self.assertTrue(Path(idf_path).exists())

            results = engine.run_simulation(timeout_seconds=60)
            self.assertTrue(results["success"])
            self.assertEqual(results["exit_code"], 0)
            self.assertEqual(results["status"], "COMPLETED")
            self.assertEqual(results["error_inspection"]["severe_errors"], 0)
            self.assertTrue(results["error_inspection"]["completed_successfully"])

            # Verify parsed physical temperatures
            indoor = results["thermal_performance"]["indoor_temperature"]
            self.assertIsNotNone(indoor["min_c"])
            self.assertIsNotNone(indoor["max_c"])
            self.assertIsNotNone(indoor["mean_c"])
            self.assertGreater(results["thermal_performance"]["timesteps_simulated"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
