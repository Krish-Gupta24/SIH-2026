"""Comprehensive automated tests for Ventilation and Infiltration mapping.

Verifies:
1. Ventilation input flows:
   UI ACH -> ShelterModel -> EnergyPlus ZoneInfiltration:DesignFlowRate.
2. User-defined infiltration ACH is NEVER ignored or hardcoded.
3. Multiple input representations supported:
   - ventilation.infiltrationACH
   - ventilation.infiltration_ach
   - ventilation.air_changes_per_hour
   - ventilation: numeric
   - shelter.infiltrationACH
   - shelter.infiltration_ach
4. Natural ventilation and mechanical ventilation support:
   - ZoneVentilation:DesignFlowRate with schedule
   - Mechanical flow rate in m³/s
5. Strict validation:
   - Reject negative ACH
   - Reject NaN and Inf
   - Reject ACH > 15.0
   - Reject negative mechanical flow rate
   - Reject invalid heat recovery efficiency
6. Live EnergyPlus execution proof:
   - Model A (Airtight: 0.15 ACH) vs Model B (Leaky: 1.50 ACH).
   - Proves physical differences in infiltration sensible heat loss energy and zone air temperatures.
"""

import os
import re
import tempfile
import unittest
from pathlib import Path

from simulation.validation.ventilation_validator import VentilationValidator
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner


class TestVentilationIntegration(unittest.TestCase):
    """Test suite for ventilation and infiltration mapping from ShelterModel to EnergyPlus."""

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
    # 1. INFILTRATION MAPPING CASES
    # =========================================================================

    def test_case_default_fallback_infiltration(self):
        """Default 0.5000 ACH is applied when no ventilation field is supplied."""
        shelter = {
            "id": "shelter-default-vent",
            "geometry": self.base_geom,
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            self.assertIn("ZoneInfiltration:DesignFlowRate,", content)
            self.assertIn("0.5000;", content)
            self.assertIn("Air Changes per Hour", content)

    def test_case_passivhaus_airtight_infiltration(self):
        """User-defined 0.15 ACH (Passivhaus standard) is directly emitted in EnergyPlus."""
        shelter = {
            "id": "shelter-airtight",
            "geometry": self.base_geom,
            "ventilation": {
                "infiltrationACH": 0.15,
            },
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            self.assertIn("0.1500;", content)
            self.assertIn("Air Changes per Hour", content)
            self.assertNotIn("0.5000;", content)

    def test_case_standard_construction_infiltration(self):
        """User-defined 0.35 ACH (Good construction NBC 2016) is directly emitted in EnergyPlus."""
        shelter = {
            "id": "shelter-standard-vent",
            "geometry": self.base_geom,
            "ventilation": {
                "infiltrationACH": 0.35,
            },
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            self.assertIn("0.3500;", content)
            self.assertIn("Air Changes per Hour", content)

    def test_case_high_infiltration_leaky(self):
        """User-defined 1.50 ACH (Drafty / Leaky alpine shelter) is directly emitted in EnergyPlus."""
        shelter = {
            "id": "shelter-leaky-vent",
            "geometry": self.base_geom,
            "ventilation": {
                "infiltrationACH": 1.50,
            },
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            self.assertIn("1.5000;", content)
            self.assertIn("Air Changes per Hour", content)

    def test_case_alternative_key_formats(self):
        """All supported key formats resolve identically to the target ACH value."""
        target_ach = 0.22
        cases = [
            {"ventilation": {"infiltrationACH": target_ach}},
            {"ventilation": {"infiltration_ach": target_ach}},
            {"ventilation": {"air_changes_per_hour": target_ach}},
            {"ventilation": {"ach": target_ach}},
            {"ventilation": target_ach},
            {"infiltrationACH": target_ach},
            {"infiltration_ach": target_ach},
        ]

        for idx, extra in enumerate(cases):
            model = {"id": f"shelter-key-{idx}", "geometry": self.base_geom, **extra}
            params = VentilationValidator.resolve_ventilation(model)
            self.assertAlmostEqual(params["infiltration_ach"], target_ach, places=4)

            with tempfile.TemporaryDirectory() as tmpdir:
                idf_path = os.path.join(tmpdir, "in.idf")
                self.generator.generate_idf(model, idf_path)
                content = Path(idf_path).read_text()
                self.assertIn(f"{target_ach:.4f};", content)

    def test_case_natural_ventilation_schedule(self):
        """Natural ventilation emits ZoneVentilation:DesignFlowRate with schedule."""
        shelter = {
            "id": "shelter-nat-vent",
            "geometry": self.base_geom,
            "ventilation": {
                "infiltrationACH": 0.20,
                "naturalVentilationEnabled": True,
                "naturalACH": 1.8,
                "naturalSchedule": "NightPurge",
            },
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            self.assertIn("ZoneVentilation:DesignFlowRate,", content)
            self.assertIn("MainZone_NaturalVentilation", content)
            self.assertIn("1.8000,", content)
            self.assertIn("NaturalVentSchedule", content)
            self.assertIn("Until: 20:00, 0.0", content)
            self.assertIn("Until: 24:00, 1.0", content)

    def test_case_mechanical_ventilation(self):
        """Mechanical ventilation emits ZoneVentilation:DesignFlowRate with flow rate in m³/s."""
        shelter = {
            "id": "shelter-mech-vent",
            "geometry": self.base_geom,
            "ventilation": {
                "infiltrationACH": 0.15,
                "mechanicalVentilationEnabled": True,
                "mechanicalFlowRateLps": 25.0,  # 25 L/s = 0.025 m³/s
                "heatRecoveryEfficiency": 0.80,
            },
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter, idf_path)
            content = Path(idf_path).read_text()

            self.assertIn("MainZone_MechanicalVentilation", content)
            self.assertIn("0.02500,", content)  # 25 L/s -> 0.025 m³/s
            self.assertIn("Balanced,", content)

    # =========================================================================
    # 2. VALIDATION TESTS
    # =========================================================================

    def test_validation_negative_ach(self):
        """Reject negative infiltration ACH."""
        shelter = {"ventilation": {"infiltrationACH": -0.5}}
        is_valid, errors = VentilationValidator.validate_ventilation(shelter)
        self.assertFalse(is_valid)
        self.assertTrue(any("cannot be negative" in e for e in errors))

    def test_validation_nan_or_inf_ach(self):
        """Reject NaN or Inf infiltration ACH."""
        shelter_nan = {"ventilation": {"infiltrationACH": float("nan")}}
        is_valid, errors = VentilationValidator.validate_ventilation(shelter_nan)
        self.assertFalse(is_valid)
        self.assertTrue(any("cannot be NaN or Inf" in e for e in errors))

        shelter_inf = {"ventilation": {"infiltrationACH": float("inf")}}
        is_valid, errors = VentilationValidator.validate_ventilation(shelter_inf)
        self.assertFalse(is_valid)
        self.assertTrue(any("cannot be NaN or Inf" in e for e in errors))

    def test_validation_excessive_ach(self):
        """Reject ACH exceeding physical limit (15.0)."""
        shelter = {"ventilation": {"infiltrationACH": 25.0}}
        is_valid, errors = VentilationValidator.validate_ventilation(shelter)
        self.assertFalse(is_valid)
        self.assertTrue(any("exceeds maximum physical limit" in e for e in errors))

    def test_validation_negative_mechanical_flow(self):
        """Reject negative mechanical flow rate."""
        shelter = {
            "ventilation": {
                "mechanicalVentilationEnabled": True,
                "mechanicalFlowRateLps": -10.0,
            }
        }
        is_valid, errors = VentilationValidator.validate_ventilation(shelter)
        self.assertFalse(is_valid)
        self.assertTrue(any("flow rate cannot be negative" in e for e in errors))

    def test_validation_invalid_heat_recovery_efficiency(self):
        """Reject heat recovery efficiency outside [0.0, 1.0]."""
        shelter_high = {
            "ventilation": {
                "mechanicalVentilationEnabled": True,
                "heatRecoveryEfficiency": 1.25,
            }
        }
        is_valid, errors = VentilationValidator.validate_ventilation(shelter_high)
        self.assertFalse(is_valid)
        self.assertTrue(any("efficiency must be between 0.0 and 1.0" in e for e in errors))

    # =========================================================================
    # 3. LIVE ENERGYPLUS SIMULATION PROOF
    # =========================================================================

    def test_real_energyplus_execution_proves_infiltration_differs(self):
        """Execute live EnergyPlus on Model A (Airtight 0.15 ACH) vs Model B (Leaky 1.50 ACH).

        Proves that infiltration ACH is physically simulated:
        - Infiltration sensible heat loss energy is substantially higher in Model B (~10x higher).
        - Indoor air temperatures in sub-zero alpine conditions are colder in Model B.
        """
        runner = EnergyPlusRunner()
        if not runner.is_available:
            self.skipTest("EnergyPlus runner not available on host system.")
        if not self.weather_file.exists():
            self.skipTest(f"Weather fixture not found at {self.weather_file}")

        # Model A: Super-Airtight (0.15 ACH)
        shelter_airtight = {
            "id": "sim-airtight-015",
            "geometry": self.base_geom,
            "envelope": {
                "walls": {"north": {"constructionId": "default-insulated-earth-wall"}},
                "roof": {"constructionId": "default_insulated_metal_roof"},
                "floor": {"constructionId": "default_concrete_floor"},
            },
            "ventilation": {
                "infiltrationACH": 0.15,
            },
            "windows": [],
            "doors": [],
        }

        # Model B: Leaky / High Infiltration (1.50 ACH)
        shelter_leaky = {
            "id": "sim-leaky-150",
            "geometry": self.base_geom,
            "envelope": {
                "walls": {"north": {"constructionId": "default-insulated-earth-wall"}},
                "roof": {"constructionId": "default_insulated_metal_roof"},
                "floor": {"constructionId": "default_concrete_floor"},
            },
            "ventilation": {
                "infiltrationACH": 1.50,
            },
            "windows": [],
            "doors": [],
        }

        with tempfile.TemporaryDirectory() as tmpdir_a, tempfile.TemporaryDirectory() as tmpdir_b:
            idf_a = os.path.join(tmpdir_a, "in.idf")
            idf_b = os.path.join(tmpdir_b, "in.idf")

            self.generator.generate_idf(
                shelter_airtight,
                idf_a,
                run_period_days=1,
                start_month=1,
                start_day=15,
                end_month=1,
                end_day=15,
                timestep=4,
            )
            self.generator.generate_idf(
                shelter_leaky,
                idf_b,
                run_period_days=1,
                start_month=1,
                start_day=15,
                end_month=1,
                end_day=15,
                timestep=4,
            )

            # Inspect generated IDF files to verify ACH injection
            content_idf_a = Path(idf_a).read_text()
            content_idf_b = Path(idf_b).read_text()
            self.assertIn("0.1500;", content_idf_a)
            self.assertIn("1.5000;", content_idf_b)

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

            # Parse CSV rows
            import csv
            with open(csv_a, "r") as f:
                reader_a = list(csv.DictReader(f))
            with open(csv_b, "r") as f:
                reader_b = list(csv.DictReader(f))

            # Find infiltration heat loss column
            headers_a = reader_a[0].keys()
            infil_col = next((h for h in headers_a if "Zone Infiltration Sensible Heat Loss Energy" in h), None)
            self.assertIsNotNone(infil_col, f"Infiltration loss column not found in headers: {headers_a}")

            temp_col = next((h for h in headers_a if "Zone Mean Air Temperature" in h), None)
            self.assertIsNotNone(temp_col, f"Temperature column not found in headers: {headers_a}")

            total_loss_a = sum(float(r[infil_col]) for r in reader_a)
            total_loss_b = sum(float(r[infil_col]) for r in reader_b)

            mean_temp_a = sum(float(r[temp_col]) for r in reader_a) / len(reader_a)
            mean_temp_b = sum(float(r[temp_col]) for r in reader_b) / len(reader_b)

            # Prove: Model B (1.50 ACH) has substantially higher infiltration heat loss than Model A (0.15 ACH)
            self.assertGreater(total_loss_b, total_loss_a * 5.0, "1.50 ACH must produce substantially higher infiltration heat loss than 0.15 ACH")

            # Prove: Model B and Model A have physically divergent indoor air temperatures due to air change coupling
            self.assertNotEqual(mean_temp_b, mean_temp_a, "Indoor air temperatures must physically differ between airtight and leaky models")
            self.assertGreater(abs(mean_temp_b - mean_temp_a), 0.5, "Air exchange difference must produce significant temperature divergence")


if __name__ == "__main__":
    unittest.main()
