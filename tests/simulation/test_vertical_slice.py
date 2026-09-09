"""Automated tests for EnergyPlus model generation, error inspection, and output parsing."""

import json
import unittest
import tempfile
from pathlib import Path

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.parsers.energyplus_parser import EnergyPlusOutputParser
from simulation.runners.engine import EnergyPlusEngine


class TestVerticalSliceComponents(unittest.TestCase):
    """Component tests for IDF generator and EnergyPlus output parsers."""

    def setUp(self):
        path = Path("simulation/test_cases/fixed_test_shelter.json")
        with open(path, "r", encoding="utf-8") as f:
            self.fixed_shelter_dict = json.load(f)

    def test_idf_generator_creates_valid_syntax(self):
        """Verify that EnergyPlusIDFGenerator outputs all required simulation objects."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")
        with tempfile.TemporaryDirectory() as tmpdir:
            output_idf = Path(tmpdir) / "test.idf"
            generated_path = generator.generate_idf(self.fixed_shelter_dict, str(output_idf))

            self.assertTrue(Path(generated_path).exists())
            content = Path(generated_path).read_text(encoding="utf-8")

            self.assertIn("Version, 24.1;", content)
            self.assertIn("Building,", content)
            self.assertIn("Zone,", content)
            self.assertIn("MainZone", content)
            self.assertIn("SouthWall", content)
            self.assertIn("Output:Variable, *, Zone Mean Air Temperature, Hourly;", content)

    def test_parser_detects_severe_errors(self):
        """Verify parser catches severe and fatal errors in eplusout.err."""
        with tempfile.TemporaryDirectory() as tmpdir:
            err_file = Path(tmpdir) / "eplusout.err"
            err_file.write_text(
                "Program Version,EnergyPlus, Version 24.1.0-9d7789a3ac\n"
                "   ** Warning ** Material thickness is very thin.\n"
                "   ** Severe  ** Invalid surface vertex coordinate.\n"
                "   **  Fatal  ** Simulation terminated.\n"
                "EnergyPlus Terminated--Fatal Error Detected. 1 Warning; 1 Severe Errors;\n",
                encoding="utf-8",
            )

            parsed = EnergyPlusOutputParser.parse_error_file(str(err_file))
            self.assertFalse(parsed["completed_successfully"])
            self.assertTrue(parsed["fatal_error"])
            self.assertEqual(parsed["severe_error_count"], 1)
            self.assertEqual(parsed["warning_count"], 1)

    def test_parser_extracts_successful_run(self):
        """Verify parser handles clean completion summary."""
        with tempfile.TemporaryDirectory() as tmpdir:
            err_file = Path(tmpdir) / "eplusout.err"
            err_file.write_text(
                "Program Version,EnergyPlus, Version 24.1.0-9d7789a3ac\n"
                "   ** Warning ** Weather file snow indicator used.\n"
                "EnergyPlus Completed Successfully-- 1 Warning; 0 Severe Errors; Elapsed Time=00hr 00min  1.20sec\n",
                encoding="utf-8",
            )

            parsed = EnergyPlusOutputParser.parse_error_file(str(err_file))
            self.assertTrue(parsed["completed_successfully"])
            self.assertFalse(parsed["fatal_error"])
            self.assertEqual(parsed["severe_error_count"], 0)

    def test_csv_parser_extracts_temperatures(self):
        """Verify CSV parser extracts indoor, outdoor, and solar values."""
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_file = Path(tmpdir) / "eplusout.csv"
            csv_file.write_text(
                "Date/Time,MAINZONE:Zone Mean Air Temperature [C](Hourly),Environment:Site Outdoor Air Drybulb Temperature [C](Hourly),MAINZONE:Zone Windows Total Transmitted Solar Radiation Rate [W](Hourly)\n"
                " 01/01  01:00:00, 18.5, -12.4, 0.0\n"
                " 01/01  12:00:00, 22.3, -2.1, 450.0\n",
                encoding="utf-8",
            )

            res = EnergyPlusOutputParser.parse_csv_results(str(csv_file))
            self.assertEqual(res["timesteps_count"], 2)
            self.assertEqual(res["indoor_temperature"]["min_c"], 18.5)
            self.assertEqual(res["indoor_temperature"]["max_c"], 22.3)
            self.assertEqual(res["outdoor_temperature"]["min_c"], -12.4)
            self.assertEqual(res["solar_radiation"]["peak_transmitted_solar_w"], 450.0)

    def test_engine_validation(self):
        """Verify engine validates shelter dimensions and geometry constraints."""
        engine = EnergyPlusEngine()
        valid, errors = engine.validate_model({"geometry": {"length": 6.0, "width": 4.0, "height": 3.0}})
        self.assertTrue(valid)
        self.assertEqual(len(errors), 0)

        invalid, errs = engine.validate_model({"geometry": {"length": -6.0, "width": 4.0, "height": 3.0}})
        self.assertFalse(invalid)
        self.assertTrue(any("Invalid length" in e for e in errs))


if __name__ == "__main__":
    unittest.main(verbosity=2)
