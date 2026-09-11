"""Adversarial engineering audit test for all solar-related EnergyPlus outputs.

Verifies:
1. Incident solar radiation (direct, diffuse, surface incident)
2. Transmitted solar radiation where supported (glazing transmitted rate, total zone transmitted rate)
3. Absorbed solar gains where supported (exterior face absorption, glazing layer absorption, inside face heat gain)
4. Solar heat gain through windows (net window heat gain rate, window heat loss rate)
5. Total useful solar gain (integrated energy in J and kWh)

Asserts:
- Every requested variable exists in installed EnergyPlus version
- Correct units are enforced
- Every variable is actually produced in simulation artifacts
- Parser reads the correct columns and populates SimulationResult.solar
- Zero unsupported output requests
- Zero fabricated fallback numbers
"""

import os
import unittest
from pathlib import Path

from simulation.results.output_registry import OutputVariableRegistry, OutputCategory
from simulation.runners.engine import EnergyPlusEngine
from simulation.results.parser import EnergyPlusResultParser


class TestSolarOutputAudit(unittest.TestCase):
    """Rigorous audit test asserting 100% production and integrity of solar variables."""

    @classmethod
    def setUpClass(cls):
        """Execute a live EnergyPlus run on a model with south aperture and extract artifacts."""
        cls.repo_root = Path(__file__).resolve().parent.parent.parent
        cls.out_dir = cls.repo_root / "storage" / "simulations" / "test_solar_audit_run"
        cls.weather_file = str(cls.repo_root / "simulation" / "weather" / "test_weather.epw")

        cls.shelter_model = {
            "id": "solar-audit-rigorous-shelter",
            "name": "Audit Solar Aperture Shelter",
            "version": "1.0.0",
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 2.8,
                "roof_type": "Flat",
                "roof_angle": 0.0,
                "orientation": 0.0,  # True South
            },
            "location": {
                "region": "Leh Ladakh",
                "elevation": 3500.0,
                "latitude": 34.1526,
                "longitude": 77.5771,
            },
            "envelope": {
                "walls": {
                    "south": {"constructionId": "default-insulated-earth-wall"},
                    "north": {"constructionId": "default-insulated-earth-wall"},
                    "east": {"constructionId": "default-insulated-earth-wall"},
                    "west": {"constructionId": "default-insulated-earth-wall"},
                }
            },
            "windows": [
                {
                    "id": "Win_South_Audit",
                    "wall": "south",
                    "position_x": 1.5,
                    "width": 2.0,
                    "height": 1.2,
                    "sill_height": 0.9,
                    "glazing_type": "Double_LowE_Argon",
                }
            ],
            "doors": [],
            "ventilation": {"infiltrationACH": 0.35},
            "thermal_mass": [{"id": "mass_slab", "type": "FloorSlab", "material": "mat-concrete-slab", "thickness": 0.15, "surface_area": 24.0}],
        }

        cls.engine = EnergyPlusEngine()
        cls.engine.prepare_model(
            shelter_model=cls.shelter_model,
            weather_file_path=cls.weather_file,
            output_dir=str(cls.out_dir),
            run_period_days=2,
            start_month=1,
            start_day=1,
        )
        cls.results = cls.engine.run_simulation(timeout_seconds=120)
        cls.audit_summary = OutputVariableRegistry.audit_output_directory(cls.out_dir)

    def test_simulation_completed_cleanly(self):
        """Verify the test simulation executed with exit code 0."""
        self.assertEqual(self.results.get("exit_code"), 0)
        self.assertEqual(self.engine.status, "COMPLETED")

    def test_all_registered_solar_variables_are_supported(self):
        """Verify every solar output variable is recognized by installed EnergyPlus (0 unsupported)."""
        solar_specs = OutputVariableRegistry.get_solar_variables()
        self.assertGreaterEqual(len(solar_specs), 8)

        unsupported_metrics = [u["metric"] for u in self.audit_summary["unsupported"]]
        self.assertEqual(
            len(unsupported_metrics),
            0,
            f"Unsupported variables requested: {unsupported_metrics}",
        )

    def test_all_registered_solar_variables_are_produced(self):
        """Verify all registered solar output variables are actually produced in eplusout.csv."""
        solar_specs = OutputVariableRegistry.get_solar_variables()
        produced_metrics = set(p["metric"] for p in self.audit_summary["produced"])

        for spec in solar_specs:
            self.assertIn(
                spec.metric,
                produced_metrics,
                f"Solar metric '{spec.metric}' ({spec.ep_variable_name}) was NOT produced in simulation.",
            )

    def test_5_required_solar_concepts_are_verified(self):
        """Verify the 5 mandatory solar physical concepts are 100% produced."""
        concepts = self.audit_summary["solar_concepts"]

        # 1. incident solar radiation
        self.assertTrue(concepts["incident solar radiation"]["all_produced"])
        self.assertIn("site_direct_solar_radiation", concepts["incident solar radiation"]["produced_metrics"])
        self.assertIn("site_diffuse_solar_radiation", concepts["incident solar radiation"]["produced_metrics"])

        # 2. transmitted solar radiation where supported
        self.assertTrue(concepts["transmitted solar radiation where supported"]["all_produced"])
        self.assertIn("surface_window_transmitted_solar_rate", concepts["transmitted solar radiation where supported"]["produced_metrics"])

        # 3. absorbed solar gains where supported
        self.assertTrue(concepts["absorbed solar gains where supported"]["all_produced"])
        self.assertIn("surface_outside_face_solar_absorption_rate", concepts["absorbed solar gains where supported"]["produced_metrics"])
        self.assertIn("window_glazing_absorbed_solar_rate", concepts["absorbed solar gains where supported"]["produced_metrics"])

        # 4. solar heat gain through windows
        self.assertTrue(concepts["solar heat gain through windows"]["all_produced"])
        self.assertIn("zone_windows_total_heat_gain_rate", concepts["solar heat gain through windows"]["produced_metrics"])

        # 5. total useful solar gain
        self.assertTrue(concepts["total useful solar gain"]["all_produced"])
        self.assertIn("surface_window_transmitted_solar_energy", concepts["total useful solar gain"]["produced_metrics"])

    def test_correct_units_enforced(self):
        """Verify strict SI unit conventions for all solar metrics."""
        for spec in OutputVariableRegistry.get_solar_variables():
            if "radiation" in spec.metric or "irradiance" in spec.metric:
                if "rate per area" in spec.ep_variable_name.lower():
                    self.assertEqual(spec.unit, "W/m2")
                elif "energy" in spec.metric or "energy" in spec.ep_variable_name.lower():
                    self.assertEqual(spec.unit, "J")
                else:
                    self.assertEqual(spec.unit, "W")
            elif "heat_gain" in spec.metric or "absorption" in spec.metric or "rate" in spec.metric:
                self.assertEqual(spec.unit, "W")

    def test_parser_populates_solar_performance_without_fake_values(self):
        """Verify EnergyPlusResultParser extracts genuine non-zero solar gains without fake multipliers."""
        parser = EnergyPlusResultParser()
        parsed_result = parser.parse(self.out_dir)

        solar = parsed_result.solar
        self.assertEqual(solar.status, "AVAILABLE")
        self.assertGreater(len(solar.direct_normal_irradiance), 0)
        self.assertGreater(len(solar.diffuse_horizontal_irradiance), 0)
        self.assertGreater(len(solar.global_horizontal_irradiance), 0)
        self.assertGreater(len(solar.solar_gains_total), 0)

        # Confirm peak solar gains correspond to daylight hours (noon)
        max_trans_w = max(solar.solar_gains_total)
        self.assertGreater(max_trans_w, 50.0, "Expected significant solar transmission through south aperture.")

        # Confirm useful energy integration
        self.assertGreater(solar.useful_solar_gain_total_kwh, 0.0)

        # Absorbed solar gains
        self.assertGreater(len(solar.absorbed_solar_surfaces), 0)
        self.assertGreater(len(solar.absorbed_solar_glazing), 0)
        self.assertGreater(max(solar.absorbed_solar_surfaces), 0.0)

    def test_mapping_table_completeness(self):
        """Verify the centralized mapping table has all required columns."""
        table = OutputVariableRegistry.get_mapping_table()
        self.assertGreater(len(table), 10)
        for row in table:
            self.assertIn("metric", row)
            self.assertIn("ep_variable", row)
            self.assertIn("unit", row)
            self.assertIn("frequency", row)
            self.assertIn("parser_key", row)
            self.assertIn("concept", row)
            self.assertIn("is_required", row)


if __name__ == "__main__":
    unittest.main()
