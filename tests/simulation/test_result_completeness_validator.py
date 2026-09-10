"""Tests for ResultCompletenessValidator and OutputVariableRegistry.

Verifies strict enforcement:
1. 100% outputs produced -> COMPLETED
2. Missing secondary variables (solar gains, infiltration, etc.) -> PARTIAL
3. Missing critical variables (temperatures, timestamps) -> INVALID
4. Missing metrics return status = UNAVAILABLE with 'Metric unavailable from this simulation'
5. No silent substitution of fake or default numbers
"""

import unittest
from simulation.results.output_registry import (
    OutputVariableRegistry,
    OutputCategory,
)
from simulation.validation.result_completeness_validator import (
    ResultCompletenessValidator,
    CompletenessStatus,
    MetricAvailability,
)
from simulation.results.result import (
    SimulationResult,
    EngineMetadata,
    EnvelopeHeatTransfer,
    SolarPerformance,
    EnergyMetrics,
    ComfortMetrics,
)


class TestResultCompletenessValidator(unittest.TestCase):
    """Verifies strict validation policies for simulation completeness."""

    def setUp(self):
        self.metadata = EngineMetadata(
            engine_name="EnergyPlus",
            engine_version="24.1.0",
            model_version="1.0",
            weather_dataset="IND_JK_Leh.420270_ISHRAE.epw",
            simulation_period={"start": "01/01 01:00:00", "end": "01/03 24:00:00", "timestep_seconds": 3600, "timesteps_count": 72},
            execution_duration_seconds=1.2,
            completed_successfully=True,
        )

    def test_01_registry_contains_all_solar_and_thermal_concepts(self):
        """Verify centralized OutputVariableRegistry has all required solar and thermal concepts."""
        solar_vars = OutputVariableRegistry.get_solar_variables()
        self.assertGreaterEqual(len(solar_vars), 10)

        # Check concept classifications
        incident = OutputVariableRegistry.get_by_concept("incident solar radiation")
        self.assertGreaterEqual(len(incident), 3)

        transmitted = OutputVariableRegistry.get_by_concept("transmitted solar radiation")
        self.assertGreaterEqual(len(transmitted), 2)

        absorbed = OutputVariableRegistry.get_by_concept("absorbed solar gains")
        self.assertGreaterEqual(len(absorbed), 3)

        window_heat = OutputVariableRegistry.get_by_concept("solar heat gain through windows")
        self.assertGreaterEqual(len(window_heat), 2)

        useful_gain = OutputVariableRegistry.get_by_concept("total useful solar gain")
        self.assertGreaterEqual(len(useful_gain), 1)

        # Ensure every entry has unit and parser key
        for reg in OutputVariableRegistry.get_all():
            self.assertTrue(bool(reg.unit), f"Variable {reg.metric} must have unit")
            self.assertTrue(bool(reg.parser_key), f"Variable {reg.metric} must have parser_key")
            self.assertEqual(reg.frequency, "Hourly")

    def test_02_fully_complete_simulation_marked_completed(self):
        """When all required variables are verified, status is COMPLETED."""
        timestamps = [f"01/01 {i:02d}:00:00" for i in range(1, 73)]
        indoor_temps = [18.5 + (i % 5) * 0.5 for i in range(72)]
        outdoor_temps = [-15.0 + (i % 8) * 1.0 for i in range(72)]
        solar_rad = [0.0 if (i % 24) < 7 or (i % 24) > 17 else 450.0 for i in range(72)]
        solar_gains = [s * 0.45 for s in solar_rad]

        res = SimulationResult(
            metadata=self.metadata,
            timestamps=timestamps,
            indoor_temperature=indoor_temps,
            outdoor_temperature=outdoor_temps,
            solar_radiation=solar_rad,
            solar_gains=solar_gains,
            wall_heat_transfer=[-200.0] * 72,
            roof_heat_transfer=[-100.0] * 72,
            floor_heat_transfer=[-50.0] * 72,
            window_heat_transfer=[-30.0] * 72,
            door_heat_transfer=[-10.0] * 72,
            infiltration_heat_transfer=[-80.0] * 72,
            envelope=EnvelopeHeatTransfer(),
            solar=SolarPerformance(status="AVAILABLE", solar_gains_total=solar_gains),
            energy=EnergyMetrics(status="AVAILABLE", net_energy_demand_kwh=120.0),
            comfort=ComfortMetrics(is_valid=True, status="AVAILABLE", indoor_mean_c=19.5, percent_time_comfortable=85.0),
        )

        report = ResultCompletenessValidator.validate_simulation_result(
            result=res,
            simulation_id="sim-complete-001",
            engine_status="COMPLETED",
        )

        self.assertEqual(report.status, CompletenessStatus.COMPLETED)
        self.assertEqual(len(report.missing_critical), 0)
        self.assertEqual(len(report.missing_secondary), 0)
        self.assertTrue(report.is_physically_complete)

    def test_03_missing_indoor_temperature_marked_invalid(self):
        """When indoor temperature is missing, result must be marked INVALID, never COMPLETED."""
        res = SimulationResult(
            metadata=self.metadata,
            timestamps=["01/01 01:00:00"],
            indoor_temperature=[],  # Missing!
            outdoor_temperature=[-15.0],
            solar_radiation=[0.0],
            solar_gains=[0.0],
            wall_heat_transfer=[-200.0],
            roof_heat_transfer=[-100.0],
            floor_heat_transfer=[-50.0],
            window_heat_transfer=[-30.0],
            door_heat_transfer=[-10.0],
            infiltration_heat_transfer=[-80.0],
            envelope=EnvelopeHeatTransfer(),
            solar=SolarPerformance(),
            energy=EnergyMetrics(),
            comfort=ComfortMetrics(is_valid=False, status="UNAVAILABLE"),
        )

        report = ResultCompletenessValidator.validate_simulation_result(
            result=res,
            simulation_id="sim-invalid-002",
            engine_status="COMPLETED",
        )

        self.assertEqual(report.status, CompletenessStatus.INVALID)
        self.assertIn("indoor_temperature", report.missing_critical)
        self.assertFalse(report.is_physically_complete)

        # Verify UNAVAILABLE metadata
        t_avail = report.availability_by_metric["indoor_temperature"]
        self.assertEqual(t_avail["status"], "UNAVAILABLE")
        self.assertEqual(t_avail["display_value"], "Metric unavailable from this simulation")
        self.assertIn("did not produce", t_avail["reason"])

    def test_04_missing_solar_gains_marked_partial(self):
        """When secondary variable (solar gains) is missing, status must be PARTIAL, not COMPLETED."""
        timestamps = ["01/01 01:00:00", "01/01 02:00:00"]
        indoor_temps = [19.0, 19.2]
        outdoor_temps = [-12.0, -11.5]

        res = SimulationResult(
            metadata=self.metadata,
            timestamps=timestamps,
            indoor_temperature=indoor_temps,
            outdoor_temperature=outdoor_temps,
            solar_radiation=[0.0, 50.0],
            solar_gains=[],  # Missing transmitted solar gains!
            wall_heat_transfer=[-200.0, -190.0],
            roof_heat_transfer=[-100.0, -95.0],
            floor_heat_transfer=[-50.0, -48.0],
            window_heat_transfer=[-30.0, -28.0],
            door_heat_transfer=[-10.0, -9.0],
            infiltration_heat_transfer=[-80.0, -75.0],
            envelope=EnvelopeHeatTransfer(),
            solar=SolarPerformance(status="UNAVAILABLE"),
            energy=EnergyMetrics(),
            comfort=ComfortMetrics(is_valid=True, status="AVAILABLE", indoor_mean_c=19.1),
        )

        report = ResultCompletenessValidator.validate_simulation_result(
            result=res,
            simulation_id="sim-partial-003",
            engine_status="COMPLETED",
        )

        self.assertEqual(report.status, CompletenessStatus.PARTIAL)
        self.assertIn("solar_gains", report.missing_secondary)
        self.assertFalse(report.is_physically_complete)

        # Check availability declaration
        sg_avail = report.availability_by_metric["solar_gains"]
        self.assertEqual(sg_avail["status"], "UNAVAILABLE")
        self.assertEqual(sg_avail["display_value"], "Metric unavailable from this simulation")

    def test_05_never_invent_fake_numbers_for_unavailable_metrics(self):
        """Verify unavailable metric helper returns explicit text and no fake numbers."""
        metric = ResultCompletenessValidator.create_unavailable_metric(
            metric="heat_loss_ua",
            missing_variable="Surface Inside Face Conduction Heat Transfer Rate",
            reason="EnergyPlus execution did not output surface conduction",
            simulation_id="sim-test-999",
            engine_status="PARTIAL",
        )

        self.assertEqual(metric.status, "UNAVAILABLE")
        self.assertEqual(metric.display_value, "Metric unavailable from this simulation")
        self.assertNotIn("28.5", metric.display_value)
        self.assertNotIn("0.0", metric.display_value)
        self.assertEqual(metric.missing_variable, "Surface Inside Face Conduction Heat Transfer Rate")
        self.assertEqual(metric.simulation_id, "sim-test-999")
