"""EnergyPlusEngine implementing the unified engineering interface for building energy simulation."""

import os
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner, SimulationExecutionOutput
from simulation.parsers.energyplus_parser import EnergyPlusOutputParser
from simulation.results.result import SimulationResult
from simulation.results.parser import EnergyPlusResultParser
from simulation.validation.opening_validator import OpeningValidator
from simulation.validation.result_completeness_validator import ResultCompletenessValidator, CompletenessStatus


class EnergyPlusEngine:
    """Unified engine interface for EnergyPlus model preparation, execution, and output normalization."""

    def __init__(self, executable_path: Optional[str] = None):
        self.runner = EnergyPlusRunner(custom_executable_path=executable_path)
        self.generator = EnergyPlusIDFGenerator(engine_version=self.runner.detected_version or "24.1.0")
        self.parser = EnergyPlusOutputParser()
        self.result_parser = EnergyPlusResultParser()

        # Engine execution state
        self.status = "INITIALIZED" if self.runner.executable_path else "ENGINE_NOT_FOUND"
        self.shelter_model: Optional[Dict[str, Any]] = None
        self.idf_path: Optional[str] = None
        self.epw_path: Optional[str] = None
        self.work_dir: Optional[str] = None
        self.execution_output: Optional[SimulationExecutionOutput] = None
        self.error_summary: Optional[Dict[str, Any]] = None
        self.simulation_result: Optional[SimulationResult] = None
        self.normalized_results: Optional[Dict[str, Any]] = None

    def validate_model(self, shelter_model: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate that shelter model contains required geometric and thermal attributes."""
        errors: List[str] = []

        if not isinstance(shelter_model, dict):
            return False, ["Shelter model must be a dictionary."]

        geom = shelter_model.get("geometry", {})
        if not geom:
            errors.append("Missing 'geometry' section.")
        else:
            length = geom.get("length", 0)
            width = geom.get("width", 0)
            height = geom.get("height", 0)

            if length <= 0:
                errors.append(f"Invalid length: {length}. Must be > 0.")
            if width <= 0:
                errors.append(f"Invalid width: {width}. Must be > 0.")
            if height <= 0:
                errors.append(f"Invalid height: {height}. Must be > 0.")

        # Check window and door constraints if present
        windows = shelter_model.get("windows", []) or shelter_model.get("envelope", {}).get("windows", [])
        doors = shelter_model.get("doors", []) or shelter_model.get("envelope", {}).get("doors", [])
        if geom and (windows or doors):
            is_valid, opening_errors = OpeningValidator.validate_openings(windows, doors, geom)
            if not is_valid:
                errors.extend(opening_errors)

        # Check ventilation and infiltration constraints
        from simulation.validation.ventilation_validator import VentilationValidator
        is_vent_valid, vent_errors = VentilationValidator.validate_ventilation(shelter_model)
        if not is_vent_valid:
            errors.extend(vent_errors)

        # Check thermal mass constraints
        from simulation.validation.thermal_mass_validator import ThermalMassValidator
        is_tm_valid, tm_errors = ThermalMassValidator.validate_thermal_mass(shelter_model)
        if not is_tm_valid:
            errors.extend(tm_errors)

        return len(errors) == 0, errors

    def prepare_model(
        self,
        shelter_model: Dict[str, Any],
        weather_file_path: str,
        output_dir: Optional[str] = None,
        run_period_days: int = 3,
        start_month: int = 1,
        start_day: int = 1,
    ) -> str:
        """Validate inputs, create an isolated directory, and generate EnergyPlus IDF input."""
        is_valid, validation_errors = self.validate_model(shelter_model)
        if not is_valid:
            raise ValueError(f"Shelter model validation failed: {'; '.join(validation_errors)}")

        epw = Path(weather_file_path).resolve()
        if not epw.exists():
            raise FileNotFoundError(f"Weather file not found: {weather_file_path}")

        self.shelter_model = shelter_model
        self.epw_path = str(epw)

        # Create isolated working directory
        if not output_dir:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            shelter_id = shelter_model.get("id", "shelter")
            output_dir = str(Path("storage/simulations") / f"sim_{shelter_id}_{ts}_{uuid.uuid4().hex[:6]}")

        work_path = Path(output_dir).resolve()
        work_path.mkdir(parents=True, exist_ok=True)
        self.work_dir = str(work_path)

        # Generate IDF in isolated folder
        self.idf_path = str((work_path / "in.idf").resolve())
        self.generator.generate_idf(
            shelter=shelter_model,
            output_path=self.idf_path,
            run_period_days=run_period_days,
            start_month=start_month,
            start_day=start_day,
        )

        self.status = "PREPARED"
        return self.idf_path

    def run_simulation(self, timeout_seconds: int = 300) -> Dict[str, Any]:
        """Execute EnergyPlus, inspect error output, and parse thermal outputs."""
        if self.status != "PREPARED" or not self.idf_path or not self.epw_path or not self.work_dir:
            raise RuntimeError(f"Cannot run simulation in status '{self.status}'. Call prepare_model() first.")

        if not self.runner.executable_path:
            self.status = "FAILED"
            raise RuntimeError("EnergyPlus executable not found on host machine.")

        self.status = "RUNNING"

        # Subprocess execution in isolated work_dir
        self.execution_output = self.runner.run(
            idf_path=self.idf_path,
            epw_path=self.epw_path,
            work_dir=self.work_dir,
            timeout_seconds=timeout_seconds,
        )

        # Inspect error file
        self.error_summary = self.parser.parse_error_file(self.execution_output.err_file_path)

        # Fatal or severe errors determine completion success
        has_severe_or_fatal = (
            self.execution_output.exit_code != 0
            or self.error_summary.get("fatal_error", False)
            or self.error_summary.get("severe_error_count", 0) > 0
        )

        if has_severe_or_fatal:
            self.status = "FAILED"
            error_details = (
                self.error_summary.get("fatal_errors")
                or self.error_summary.get("severe_errors")
                or [f"Engine exited with code {self.execution_output.exit_code}"]
            )
            self.normalized_results = {
                "success": False,
                "status": self.status,
                "exit_code": self.execution_output.exit_code,
                "engine_version": self.runner.detected_version,
                "command_executed": self.execution_output.command_executed,
                "work_dir": self.work_dir,
                "errors": error_details,
                "summary": self.error_summary.get("summary_line", "Simulation Failed"),
            }
            return self.normalized_results

        # Extract comfort criteria from ShelterModel DesignTargets
        from simulation.results.metrics import parse_comfort_definition
        comf_def = parse_comfort_definition(self.shelter_model)

        # Parse raw artifacts into normalized SimulationResult
        parser_meta = {
            "engine_name": "EnergyPlus",
            "engine_version": self.runner.detected_version or "24.1.0",
            "model_version": self.shelter_model.get("version", "1.0.0") if self.shelter_model else "1.0.0",
            "weather_dataset": Path(self.epw_path).name,
            "execution_duration_seconds": self.execution_output.duration_seconds,
            "is_unconditioned": True,
            "comfort_definition": comf_def,
            "comfort_min_c": comf_def.min_acceptable_temperature_c,
            "comfort_max_c": comf_def.max_acceptable_temperature_c,
            "target_temp_c": comf_def.target_indoor_temperature_c,
            "comfort_model_name": comf_def.standard_or_model_name,
            "comfort_assumptions": comf_def.assumptions,
            "comfort_applicable_conditions": comf_def.applicable_conditions,
        }
        self.simulation_result = self.result_parser.parse(self.work_dir, metadata=parser_meta)
        result_dict = self.simulation_result.to_dict()

        # Parse CSV time-series and legacy metrics for backward compatibility
        csv_data = self.parser.parse_csv_results(self.execution_output.csv_file_path)

        # Strict completeness validation
        shelter_id = self.shelter_model.get("id", "shelter") if self.shelter_model else "shelter"
        completeness = ResultCompletenessValidator.validate_simulation_result(
            result=self.simulation_result,
            simulation_id=shelter_id,
            engine_status="EXECUTED",
        )
        self.status = completeness.status.value
        is_success = completeness.status != CompletenessStatus.INVALID

        self.normalized_results = {
            "success": is_success,
            "status": self.status,
            "completeness_status": completeness.status.value,
            "completeness_report": completeness.to_dict(),
            "metric_availability": completeness.availability_by_metric,
            "comfort_definition": self.simulation_result.comfort.comfort_definition.to_dict() if self.simulation_result.comfort.comfort_definition else None,
            "exit_code": self.execution_output.exit_code,
            "engine": "EnergyPlus",
            "engine_version": self.runner.detected_version,
            "command_executed": self.execution_output.command_executed,
            "duration_seconds": self.execution_output.duration_seconds,
            "work_dir": self.work_dir,
            "is_physically_valid": completeness.is_physically_complete,
            "metadata": {
                **result_dict["metadata"],
                "shelter_id": self.shelter_model.get("id") if self.shelter_model else None,
                "shelter_name": self.shelter_model.get("name") if self.shelter_model else None,
                "weather_file": Path(self.epw_path).name,
                "idf_file": Path(self.idf_path).name,
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            },
            "error_inspection": {
                "completed_successfully": self.error_summary.get("completed_successfully"),
                "severe_errors": self.error_summary.get("severe_error_count"),
                "warnings": self.error_summary.get("warning_count"),
                "summary_line": self.error_summary.get("summary_line"),
            },
            "thermal_performance": {
                "indoor_temperature": {
                    "min_c": self.simulation_result.comfort.indoor_min_c,
                    "max_c": self.simulation_result.comfort.indoor_max_c,
                    "mean_c": self.simulation_result.comfort.indoor_mean_c,
                },
                "outdoor_temperature": csv_data.get("outdoor_temperature", {}),
                "solar_radiation": csv_data.get("solar_radiation", {}),
                "timesteps_simulated": self.simulation_result.timesteps_count,
                "comfort": {
                    "target_range": self.simulation_result.comfort.target_range_str,
                    "target_indoor_temperature_c": self.simulation_result.comfort.target_indoor_temperature_c,
                    "actual_temperature": {
                        "min_c": self.simulation_result.comfort.indoor_min_c,
                        "max_c": self.simulation_result.comfort.indoor_max_c,
                        "mean_c": self.simulation_result.comfort.indoor_mean_c,
                    },
                    "hours_inside_target": self.simulation_result.comfort.hours_inside_target,
                    "hours_below_target": self.simulation_result.comfort.hours_below_target,
                    "hours_above_target": self.simulation_result.comfort.hours_above_target,
                    "percent_time_comfortable": self.simulation_result.comfort.percent_time_comfortable,
                    "underheating_degree_hours_c_h": self.simulation_result.comfort.underheating_degree_hours_c_h,
                    "overheating_degree_hours_c_h": self.simulation_result.comfort.overheating_degree_hours_c_h,
                    "comfort_definition": self.simulation_result.comfort.comfort_definition.to_dict() if self.simulation_result.comfort.comfort_definition else None,
                },
            },
            # Canonical normalized result schema
            "timestamps": result_dict["timestamps"],
            "indoor_temperature": result_dict["indoor_temperature"],
            "outdoor_temperature": result_dict["outdoor_temperature"],
            "solar_radiation": result_dict["solar_radiation"],
            "solar_gains": result_dict["solar_gains"],
            "wall_heat_transfer": result_dict["wall_heat_transfer"],
            "roof_heat_transfer": result_dict["roof_heat_transfer"],
            "floor_heat_transfer": result_dict["floor_heat_transfer"],
            "window_heat_transfer": result_dict["window_heat_transfer"],
            "door_heat_transfer": result_dict["door_heat_transfer"],
            "infiltration_heat_transfer": result_dict["infiltration_heat_transfer"],
            "envelope": result_dict["envelope"],
            "solar": result_dict["solar"],
            "energy": result_dict["energy"],
            "comfort": result_dict["comfort"],
            "logs": {
                "stdout_log": self.execution_output.stdout_log_path,
                "stderr_log": self.execution_output.stderr_log_path,
                "err_file": self.execution_output.err_file_path,
                "csv_file": self.execution_output.csv_file_path,
            },
            "hourly_sample": csv_data.get("hourly_timeseries", [])[:24],  # Sample first 24h
        }

        # Persist normalized results to disk
        results_file = Path(self.work_dir) / "normalized_results.json"
        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(self.normalized_results, f, indent=2)

        return self.normalized_results

    def get_status(self) -> Dict[str, Any]:
        """Return current status and inspection snapshot."""
        return {
            "status": self.status,
            "engine_version": self.runner.detected_version,
            "executable_path": self.runner.executable_path,
            "work_dir": self.work_dir,
            "idf_path": self.idf_path,
            "epw_path": self.epw_path,
        }

    def get_results(self) -> Optional[Dict[str, Any]]:
        """Return normalized simulation results if completed."""
        return self.normalized_results

    def get_simulation_result(self) -> Optional[SimulationResult]:
        """Return typed SimulationResult instance if completed."""
        return self.simulation_result
