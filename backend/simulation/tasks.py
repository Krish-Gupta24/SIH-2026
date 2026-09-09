"""Celery task definitions for asynchronous EnergyPlus simulation execution."""

import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from backend.core.celery_app import celery_app
from backend.simulation.store import (
    simulation_store,
    SimulationStatus,
    sanitize_message,
)
from backend.core.path_security import validate_weather_file, resolve_safe_path
from backend.core.binary_allowlist import SecurityException
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner
from simulation.parsers.energyplus_parser import EnergyPlusOutputParser
from simulation.results.parser import EnergyPlusResultParser


def safe_cleanup_work_dir(work_dir: Path):
    """Safely remove heavy intermediate scratch files, preserving logs, error reports, and normalized results."""
    transient_extensions = [".eso", ".bnd", ".audit", ".rdd", ".mdd", ".shd", ".rvaudit", ".mtd"]
    for ext in transient_extensions:
        for f in work_dir.glob(f"*{ext}"):
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass


@celery_app.task(bind=True, name="backend.simulation.tasks.run_simulation_task")
def run_simulation_task(
    self,
    simulation_id: str,
    shelter_model: Dict[str, Any],
    weather_file_path: str,
    run_period_days: int = 3,
    start_month: int = 1,
    start_day: int = 1,
    timeout_seconds: int = 600,
    cleanup_scratch_files: bool = True,
) -> Dict[str, Any]:
    """Execute complete building thermal simulation workflow through the 7 lifecycle stages."""
    # 1. PREPARING
    simulation_store.update_status(
        job_id=simulation_id,
        status=SimulationStatus.PREPARING,
        celery_task_id=self.request.id if hasattr(self, "request") else None,
    )

    work_path: Optional[Path] = None
    try:
        # Create isolated working directory
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        sim_dirname = f"sim_{simulation_id[:8]}_{ts}"
        work_path = (Path("storage/simulations") / sim_dirname).resolve()
        work_path.mkdir(parents=True, exist_ok=True)

        # Reject path traversal tricks
        if ".." in str(weather_file_path) or "\x00" in str(weather_file_path):
            raise SecurityException("SECURITY VIOLATION: Path traversal sequence detected in weather file parameter.")

        # Resolve weather file
        raw_epw = Path(weather_file_path)
        epw = None
        if raw_epw.is_file():
            epw = raw_epw.resolve()
        else:
            # Check candidate approved locations
            candidates = [
                Path("simulation/weather") / raw_epw.name,
                Path("storage/weather") / raw_epw.name,
                Path("backend/weather") / raw_epw.name,
            ]
            for c in candidates:
                if c.is_file():
                    epw = c.resolve()
                    break

        if not epw or not epw.exists():
            fallback_epw = Path("simulation/weather/test_weather.epw").resolve()
            if fallback_epw.exists():
                epw = fallback_epw
            else:
                raise FileNotFoundError(f"Weather dataset file not found: {raw_epw.name}")

        # Strict validation of weather file (format, magic header, size)
        validate_weather_file(epw)


        # Initialize runner & generator
        runner = EnergyPlusRunner()
        detected_version = runner.detected_version or "24.1.0"
        generator = EnergyPlusIDFGenerator(engine_version=detected_version)

        # Generate IDF in isolated directory
        idf_path = str((work_path / "in.idf").resolve())
        generator.generate_idf(
            shelter=shelter_model,
            output_path=idf_path,
            run_period_days=run_period_days,
            start_month=start_month,
            start_day=start_day,
        )

        # 2. RUNNING
        simulation_store.update_status(
            job_id=simulation_id,
            status=SimulationStatus.RUNNING,
            isolated_work_dir=str(work_path),
            engine_version=detected_version,
        )

        exec_output = runner.run(
            idf_path=idf_path,
            epw_path=str(epw),
            work_dir=str(work_path),
            timeout_seconds=timeout_seconds,
        )

        # Check for timeout execution
        if exec_output.exit_code == -99 or "timed out after" in exec_output.stderr.lower():
            simulation_store.update_status(
                job_id=simulation_id,
                status=SimulationStatus.FAILED,
                error_message=f"Simulation timed out after {timeout_seconds} seconds.",
                duration_seconds=exec_output.duration_seconds,
                exit_code=-99,
            )
            return {"success": False, "status": "failed", "error": f"Simulation timed out after {timeout_seconds} seconds."}

        # 3. PARSING
        simulation_store.update_status(
            job_id=simulation_id,
            status=SimulationStatus.PARSING,
            duration_seconds=exec_output.duration_seconds,
            exit_code=exec_output.exit_code,
        )

        # Inspect error logs
        error_info = EnergyPlusOutputParser.parse_error_file(exec_output.err_file_path)
        has_fatal_or_severe = (
            exec_output.exit_code != 0
            or error_info.get("fatal_error", False)
            or error_info.get("severe_error_count", 0) > 0
        )

        if has_fatal_or_severe:
            err_details = (
                error_info.get("fatal_errors")
                or error_info.get("severe_errors")
                or [f"Engine process exited with code {exec_output.exit_code}"]
            )
            joined_err = "; ".join(err_details)
            simulation_store.update_status(
                job_id=simulation_id,
                status=SimulationStatus.FAILED,
                error_message=sanitize_message(joined_err),
                duration_seconds=exec_output.duration_seconds,
                exit_code=exec_output.exit_code,
            )
            return {"success": False, "status": "failed", "error": sanitize_message(joined_err)}

        # Parse normalized simulation results
        parser_meta = {
            "engine_name": "EnergyPlus",
            "engine_version": detected_version,
            "model_version": shelter_model.get("version", "1.0.0"),
            "weather_dataset": epw.name,
            "execution_duration_seconds": exec_output.duration_seconds,
            "is_unconditioned": True,
        }
        result_parser = EnergyPlusResultParser()
        sim_result = result_parser.parse(work_path, metadata=parser_meta)
        result_dict = sim_result.to_dict()

        # Write normalized_results.json into work_dir
        results_json_file = work_path / "normalized_results.json"
        with open(results_json_file, "w", encoding="utf-8") as f:
            f.write(sim_result.to_json(indent=2))

        # 4. SAFE CLEANUP
        if cleanup_scratch_files:
            safe_cleanup_work_dir(work_path)

        # 5. COMPLETED
        simulation_store.update_status(
            job_id=simulation_id,
            status=SimulationStatus.COMPLETED,
            normalized_results=result_dict,
            duration_seconds=exec_output.duration_seconds,
            exit_code=0,
            engine_version=detected_version,
        )

        return {
            "success": True,
            "status": "completed",
            "simulation_id": simulation_id,
            "duration_seconds": exec_output.duration_seconds,
        }

    except subprocess.TimeoutExpired:
        simulation_store.update_status(
            job_id=simulation_id,
            status=SimulationStatus.FAILED,
            error_message=f"Simulation timed out after {timeout_seconds} seconds.",
            exit_code=-1,
        )
        return {"success": False, "status": "failed", "error": f"Simulation timed out after {timeout_seconds} seconds."}

    except Exception as exc:
        simulation_store.update_status(
            job_id=simulation_id,
            status=SimulationStatus.FAILED,
            error_message=sanitize_message(str(exc)),
            exit_code=1,
        )
        return {"success": False, "status": "failed", "error": sanitize_message(str(exc))}
