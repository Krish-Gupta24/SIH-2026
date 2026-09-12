"""Tests for normalized SimulationResult system, ResultParser, and MetricCalculator."""

import unittest
import json
from pathlib import Path
import tempfile
import csv

from simulation.results.result import (
    EngineMetadata,
    EnvelopeHeatTransfer,
    SolarPerformance,
    EnergyMetrics,
    ComfortMetrics,
    SimulationResult,
)
from simulation.results.metrics import MetricCalculator
from simulation.results.parser import EnergyPlusResultParser
from simulation.runners.engine import EnergyPlusEngine
from simulation.runners.energyplus_runner import EnergyPlusRunner


class TestNormalizedSimulationResult(unittest.TestCase):
    """Test suite verifying engine-independent simulation results, metrics, and parsers."""

    def setUp(self):
        self.calculator = MetricCalculator()
        self.parser = EnergyPlusResultParser(metric_calculator=self.calculator)
        self.known_demo_dir = Path("storage/simulations/demo_wall-150mm-eps-earth")

    def test_01_metric_calculator_temperature_stats(self):
        """Verify summary temperature metrics calculation."""
        temps = [15.0, 18.0, 22.0, 25.0]
        stats = self.calculator.calculate_temperature_stats(temps)
        self.assertEqual(stats["min"], 15.0)
        self.assertEqual(stats["max"], 25.0)
        self.assertEqual(stats["mean"], 20.0)
        self.assertEqual(stats["swing"], 10.0)

        # Empty handling
        empty_stats = self.calculator.calculate_temperature_stats([])
        self.assertEqual(empty_stats["mean"], 0.0)

    def test_02_metric_calculator_energy_integration(self):
        """Verify numerical power-to-energy integration."""
        # 1000 W steady over 24 hours = 24 kWh
        power_24h = [1000.0] * 24
        energy_kwh = self.calculator.integrate_power_to_energy_kwh(power_24h, timestep_hours=1.0)
        self.assertAlmostEqual(energy_kwh, 24.0, places=3)

        # Half-hour timesteps: 2000 W over 10 half-hour steps (5h) = 10 kWh
        power_5h = [2000.0] * 10
        energy_half_hour = self.calculator.integrate_power_to_energy_kwh(power_5h, timestep_hours=0.5)
        self.assertAlmostEqual(energy_half_hour, 10.0, places=3)

    def test_03_metric_calculator_comfort_degree_hours(self):
        """Verify comfort degree-hours and comfort band hours calculation."""
        # Comfort band: 18°C to 26°C
        # Temperatures: 10, 15, 20, 24, 28 (1 hour each)
        temps = [10.0, 15.0, 20.0, 24.0, 28.0]
        comfort = self.calculator.calculate_comfort_metrics(
            indoor_temps=temps,
            timestep_hours=1.0,
            comfort_temperature_min_c=18.0,
            comfort_temperature_max_c=26.0,
        )

        self.assertTrue(comfort.is_valid)
        self.assertEqual(comfort.hours_in_comfort_band, 2.0)  # 20, 24
        self.assertEqual(comfort.hours_below_comfort, 2.0)    # 10, 15
        self.assertEqual(comfort.hours_above_comfort, 1.0)    # 28
        self.assertAlmostEqual(comfort.percent_time_comfortable, 40.0, places=1)

        # Underheating: (18 - 10) + (18 - 15) = 8 + 3 = 11.0 °C·h
        self.assertAlmostEqual(comfort.underheating_degree_hours_c_h, 11.0, places=2)
        # Overheating: (28 - 26) = 2.0 °C·h
        self.assertAlmostEqual(comfort.overheating_degree_hours_c_h, 2.0, places=2)

    def test_04_metric_calculator_comfort_validity_rules(self):
        """Verify comfort validity rules and rejection of unphysical data."""
        # Empty list -> invalid
        empty_res = self.calculator.calculate_comfort_metrics([])
        self.assertFalse(empty_res.is_valid)
        self.assertIn("empty", empty_res.validity_reason.lower())

        # Unphysical extreme temperature -> invalid
        unphysical_res = self.calculator.calculate_comfort_metrics([-85.0, 20.0])
        self.assertFalse(unphysical_res.is_valid)
        self.assertIn("physical", unphysical_res.validity_reason.lower())

        # NaN values -> invalid
        nan_res = self.calculator.calculate_comfort_metrics([float("nan"), 20.0])
        self.assertFalse(nan_res.is_valid)

    def test_05_parse_known_energyplus_output(self):
        """Verify parsing against known EnergyPlus test output from storage."""
        self.assertTrue(self.known_demo_dir.exists(), "Known test directory must exist.")

        metadata = {
            "engine_name": "EnergyPlus",
            "model_version": "1.0.0",
            "weather_dataset": "test_weather.epw",
            "execution_duration_seconds": 1.45,
            "is_unconditioned": True,
        }

        result = self.parser.parse(self.known_demo_dir, metadata=metadata)

        # Verify type
        self.assertIsInstance(result, SimulationResult)

        # Verify Engine Metadata
        self.assertEqual(result.metadata.engine_name, "EnergyPlus")
        self.assertIn("24.1", result.metadata.engine_version)
        self.assertEqual(result.metadata.model_version, "1.0.0")
        self.assertEqual(result.metadata.weather_dataset, "test_weather.epw")
        self.assertTrue(result.metadata.completed_successfully)
        self.assertEqual(result.metadata.simulation_period["timesteps_count"], 72)

        # Verify Timeseries lengths
        self.assertEqual(len(result.timestamps), 72)
        self.assertEqual(len(result.indoor_temperature), 72)
        self.assertEqual(len(result.outdoor_temperature), 72)
        self.assertEqual(len(result.solar_radiation), 72)
        self.assertEqual(len(result.solar_gains), 72)
        self.assertEqual(len(result.wall_heat_transfer), 72)
        self.assertEqual(len(result.roof_heat_transfer), 72)
        self.assertEqual(len(result.floor_heat_transfer), 72)
        self.assertEqual(len(result.window_heat_transfer), 72)
        self.assertEqual(len(result.door_heat_transfer), 72)
        self.assertEqual(len(result.infiltration_heat_transfer), 72)

        # Verify physical temperature values
        self.assertGreater(result.comfort.indoor_mean_c, 10.0)
        self.assertLess(result.comfort.indoor_mean_c, 25.0)
        self.assertTrue(result.comfort.is_valid)

        # Verify envelope heat transfer segregation
        self.assertIn("north", result.envelope.walls_by_orientation)
        self.assertIn("south", result.envelope.walls_by_orientation)
        self.assertEqual(len(result.envelope.walls_by_orientation["north"]), 72)

        # Verify energy balance metrics
        self.assertIn("wall", result.energy.envelope_losses_kwh)
        self.assertIn("roof", result.energy.envelope_losses_kwh)
        self.assertGreater(result.energy.envelope_losses_kwh["wall"], 0.0)

    def test_06_frontend_independence_clean_schema(self):
        """Verify that normalized schema contains no raw EnergyPlus headers or file artifacts."""
        result = self.parser.parse(self.known_demo_dir, metadata={"weather_dataset": "test.epw"})
        result_dict = result.to_dict()

        # Keys must be standard canonical fields
        expected_root_keys = {
            "metadata",
            "timestamps",
            "indoor_temperature",
            "outdoor_temperature",
            "solar_radiation",
            "solar_gains",
            "wall_heat_transfer",
            "roof_heat_transfer",
            "floor_heat_transfer",
            "window_heat_transfer",
            "door_heat_transfer",
            "infiltration_heat_transfer",
            "envelope",
            "solar",
            "energy",
            "comfort",
        }
        self.assertTrue(expected_root_keys.issubset(set(result_dict.keys())))

        # Search for raw EnergyPlus syntax in all keys
        def check_no_raw_headers(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    self.assertNotIn("Environment:Site", k)
                    self.assertNotIn("[C](Hourly)", k)
                    self.assertNotIn("[W](Hourly)", k)
                    self.assertNotIn("Surface Inside Face", k)
                    check_no_raw_headers(v)
            elif isinstance(obj, list):
                for item in obj:
                    check_no_raw_headers(item)

        check_no_raw_headers(result_dict)

    def test_07_serialization_and_deserialization_roundtrip(self):
        """Verify full JSON serialization and deserialization roundtrip."""
        result = self.parser.parse(self.known_demo_dir, metadata={"weather_dataset": "test.epw"})
        json_str = result.to_json()
        reconstituted = SimulationResult.from_dict(json.loads(json_str))

        self.assertEqual(reconstituted.metadata.engine_name, result.metadata.engine_name)
        self.assertEqual(reconstituted.metadata.engine_version, result.metadata.engine_version)
        self.assertEqual(reconstituted.indoor_temperature, result.indoor_temperature)
        self.assertEqual(reconstituted.outdoor_temperature, result.outdoor_temperature)
        self.assertEqual(reconstituted.wall_heat_transfer, result.wall_heat_transfer)
        self.assertEqual(reconstituted.energy.envelope_losses_kwh, result.energy.envelope_losses_kwh)
        self.assertEqual(reconstituted.comfort.hours_below_comfort, result.comfort.hours_below_comfort)

    def test_08_parser_with_windows_doors_and_infiltration_fixture(self):
        """Verify parser correctly processes synthetic fixtures with windows, doors, and infiltration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_file = Path(tmpdir) / "eplusout.csv"
            err_file = Path(tmpdir) / "eplusout.err"

            # Write error file
            with open(err_file, "w", encoding="utf-8") as f:
                f.write(
                    "Program Version,EnergyPlus, Version 24.1.0-custom, YMD=2026.09.09 12:00,\n"
                    "   ** Warning ** Weather File Location=Leh_Ladakh_IND\n"
                    "   ************* EnergyPlus Completed Successfully -- 0 Warning; 0 Severe Errors\n"
                )

            # Write CSV with complete set of component variables
            headers = [
                "Date/Time",
                "Environment:Site Outdoor Air Drybulb Temperature [C](Hourly)",
                "Environment:Site Direct Solar Radiation Rate per Area [W/m2](Hourly)",
                "Environment:Site Diffuse Solar Radiation Rate per Area [W/m2](Hourly)",
                "MAINZONE:Zone Mean Air Temperature [C](Hourly)",
                "SOUTHWALL:Surface Inside Face Conduction Heat Transfer Rate [W](Hourly)",
                "NORTHWALL:Surface Inside Face Conduction Heat Transfer Rate [W](Hourly)",
                "ROOFSURFACE:Surface Inside Face Conduction Heat Transfer Rate [W](Hourly)",
                "FLOORSURFACE:Surface Inside Face Conduction Heat Transfer Rate [W](Hourly)",
                "WINDOW_SOUTH:Surface Inside Face Conduction Heat Transfer Rate [W](Hourly)",
                "WINDOW_SOUTH:Surface Window Transmitted Solar Radiation Rate [W](Hourly)",
                "DOOR_EAST:Surface Inside Face Conduction Heat Transfer Rate [W](Hourly)",
                "MAINZONE:Zone Infiltration Sensible Heat Loss Energy [J](Hourly)",
                "MAINZONE:Zone Infiltration Sensible Heat Gain Energy [J](Hourly)",
            ]

            rows = [
                [
                    " 01/01  01:00:00",
                    "-5.0",
                    "0.0",
                    "0.0",
                    "18.5",
                    "-20.0",
                    "-25.0",
                    "-30.0",
                    "50.0",
                    "-15.0",
                    "0.0",
                    "-10.0",
                    "36000.0",  # 36000 J / 3600 s = 10 W loss
                    "0.0",
                ],
                [
                    " 01/01  12:00:00",
                    "2.0",
                    "600.0",
                    "150.0",
                    "21.0",
                    "10.0",
                    "-5.0",
                    "40.0",
                    "20.0",
                    "-5.0",
                    "350.0",
                    "0.0",
                    "0.0",
                    "72000.0",  # 72000 J / 3600 s = 20 W gain
                ],
            ]

            with open(csv_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                writer.writerows(rows)

            result = self.parser.parse(tmpdir)

            # Check window & door heat transfer
            self.assertEqual(result.window_heat_transfer, [-15.0, -5.0])
            self.assertEqual(result.door_heat_transfer, [-10.0, 0.0])
            # Check window solar gains
            self.assertEqual(result.solar_gains, [0.0, 350.0])
            self.assertIn("WINDOW_SOUTH", result.solar.solar_gains_by_window)
            # Check infiltration rate (W): net = gain - loss
            self.assertEqual(result.infiltration_heat_transfer, [-10.0, 20.0])
            # Check walls
            self.assertEqual(result.wall_heat_transfer, [-45.0, 5.0])
            # Check roof & floor
            self.assertEqual(result.roof_heat_transfer, [-30.0, 40.0])
            self.assertEqual(result.floor_heat_transfer, [50.0, 20.0])

            # Check metadata extracted from error file
            self.assertIn("24.1.0-custom", result.metadata.engine_version)
            self.assertIn("Leh_Ladakh_IND", result.metadata.weather_dataset)

    @unittest.skipUnless(EnergyPlusRunner().is_available, "EnergyPlus binary not available on host machine")
    def test_09_end_to_end_engine_generates_simulation_result(self):
        """Verify EnergyPlusEngine produces typed SimulationResult and valid normalized_results.json."""
        shelter_model = {
            "id": "result-test-shelter",
            "name": "Result Test Shelter",
            "version": "1.2.0",
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 3.0,
                "roof_type": "Flat",
                "roof_angle": 0.0,
            },
            "location": {
                "latitude": 34.15,
                "longitude": 77.58,
                "elevation": 3500.0,
                "region": "Leh_Ladakh_IND",
            },
        }
        weather_file = Path("simulation/weather/test_weather.epw")
        self.assertTrue(weather_file.exists())

        with tempfile.TemporaryDirectory() as tmpdir:
            engine = EnergyPlusEngine()
            engine.prepare_model(
                shelter_model=shelter_model,
                weather_file_path=str(weather_file),
                output_dir=tmpdir,
                run_period_days=1,
            )

            res_dict = engine.run_simulation(timeout_seconds=60)
            self.assertTrue(res_dict["success"])

            # Verify typed result accessible from engine
            typed_result = engine.get_simulation_result()
            self.assertIsNotNone(typed_result)
            self.assertIsInstance(typed_result, SimulationResult)
            self.assertEqual(typed_result.metadata.model_version, "1.2.0")
            self.assertEqual(typed_result.metadata.weather_dataset, "test_weather.epw")
            self.assertEqual(len(typed_result.indoor_temperature), 24)

            # Verify on-disk normalized_results.json
            results_json_path = Path(tmpdir) / "normalized_results.json"
            self.assertTrue(results_json_path.exists())
            with open(results_json_path, "r", encoding="utf-8") as f:
                disk_data = json.load(f)

            self.assertIn("comfort", disk_data)
            self.assertIn("energy", disk_data)
            self.assertIn("indoor_temperature", disk_data)
            self.assertEqual(len(disk_data["indoor_temperature"]), 24)


if __name__ == "__main__":
    unittest.main(verbosity=2)
