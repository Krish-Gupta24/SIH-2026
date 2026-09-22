"""Simulation job record store and lifecycle state tracking."""

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict


class SimulationStatus(str, Enum):
    """Permitted simulation execution lifecycle statuses."""
    QUEUED = "queued"
    PREPARING = "preparing"
    RUNNING = "running"
    PARSING = "parsing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


def sanitize_message(msg: Optional[str]) -> Optional[str]:
    """Sanitize error messages and logs to remove absolute local server filesystem paths."""
    if not msg:
        return msg
    # Replace Windows paths (e.g., C:\Users\... or .\storage\...)
    cleaned = re.sub(r"[A-Za-z]:\\[^:\n\r\t]+[\\/]", "[PATH]/", msg)
    cleaned = re.sub(r"(/[a-zA-Z0-9_\-\.]+)+/[a-zA-Z0-9_\-\.]+", "[PATH]", cleaned)
    return cleaned


@dataclass
class SimulationJobRecord:
    """Simulation execution state record."""
    id: str
    status: SimulationStatus = SimulationStatus.QUEUED
    project_id: Optional[str] = None
    version_id: Optional[str] = None
    shelter_model: Dict[str, Any] = field(default_factory=dict)
    weather_file: str = "test_weather.epw"
    run_period_days: int = 3
    timeout_seconds: int = 600
    engine: str = "ThermoShelter Core"
    engine_version: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    isolated_work_dir: Optional[str] = None  # Internal only
    celery_task_id: Optional[str] = None
    logs: Dict[str, Any] = field(default_factory=dict)
    normalized_results: Optional[Dict[str, Any]] = None
    weather_provenance: Optional[Dict[str, Any]] = None
    simulation_period: Optional[Dict[str, Any]] = None
    allow_test_data: bool = False

    def to_public_dict(self, include_results: bool = False) -> Dict[str, Any]:
        """Convert record to public-facing dictionary, strictly redacting internal filesystem paths."""
        data = {
            "simulation_id": self.id,
            "status": self.status.value,
            "project_id": self.project_id,
            "version_id": self.version_id,
            "engine": self.engine,
            "engine_version": self.engine_version,
            "weather_file": self.weather_file,
            "weather_provenance": self.weather_provenance,
            "simulation_period": self.simulation_period,
            "allow_test_data": self.allow_test_data,
            "run_period_days": self.run_period_days,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_seconds": self.duration_seconds,
            "exit_code": self.exit_code,
            "error_message": sanitize_message(self.error_message),
            "has_results": self.normalized_results is not None,
        }
        if include_results and self.normalized_results:
            data["results"] = self.normalized_results
        return data


class SimulationJobStore:
    """In-memory simulation job repository with atomic state transitions."""

    def __init__(self):
        self._jobs: Dict[str, SimulationJobRecord] = {}

    def create_job(
        self,
        job_id: str,
        shelter_model: Dict[str, Any],
        weather_file: str = "test_weather.epw",
        project_id: Optional[str] = None,
        version_id: Optional[str] = None,
        run_period_days: int = 3,
        timeout_seconds: int = 600,
        engine: str = "ThermoShelter Core",
        allow_test_data: bool = False,
        weather_provenance: Optional[Dict[str, Any]] = None,
        simulation_period: Optional[Dict[str, Any]] = None,
    ) -> SimulationJobRecord:
        """Create and register a new simulation record in queued status."""
        record = SimulationJobRecord(
            id=job_id,
            status=SimulationStatus.QUEUED,
            project_id=project_id,
            version_id=version_id,
            shelter_model=shelter_model,
            weather_file=weather_file,
            run_period_days=run_period_days,
            timeout_seconds=timeout_seconds,
            engine=engine,
            allow_test_data=allow_test_data,
            weather_provenance=weather_provenance,
            simulation_period=simulation_period,
        )
        self._jobs[job_id] = record
        return record

    def get_job(self, job_id: str) -> Optional[SimulationJobRecord]:
        """Retrieve simulation record by ID."""
        return self._jobs.get(job_id)

    def update_status(
        self,
        job_id: str,
        status: SimulationStatus,
        error_message: Optional[str] = None,
        duration_seconds: Optional[float] = None,
        exit_code: Optional[int] = None,
        engine_version: Optional[str] = None,
        isolated_work_dir: Optional[str] = None,
        logs: Optional[Dict[str, Any]] = None,
        normalized_results: Optional[Dict[str, Any]] = None,
        celery_task_id: Optional[str] = None,
        weather_provenance: Optional[Dict[str, Any]] = None,
        simulation_period: Optional[Dict[str, Any]] = None,
    ) -> Optional[SimulationJobRecord]:
        """Atomically transition job status and attach execution artifacts."""
        job = self._jobs.get(job_id)
        if not job:
            return None

        job.status = status
        now_iso = datetime.now(timezone.utc).isoformat()

        if status == SimulationStatus.PREPARING and not job.started_at:
            job.started_at = now_iso
        elif status in (SimulationStatus.COMPLETED, SimulationStatus.FAILED, SimulationStatus.CANCELLED):
            job.completed_at = now_iso

        if error_message is not None:
            job.error_message = sanitize_message(error_message)
        if duration_seconds is not None:
            job.duration_seconds = duration_seconds
        if exit_code is not None:
            job.exit_code = exit_code
        if engine_version is not None:
            job.engine_version = engine_version
        if isolated_work_dir is not None:
            job.isolated_work_dir = isolated_work_dir
        if logs is not None:
            job.logs = logs
        if normalized_results is not None:
            job.normalized_results = normalized_results
        if celery_task_id is not None:
            job.celery_task_id = celery_task_id
        if weather_provenance is not None:
            job.weather_provenance = weather_provenance
        if simulation_period is not None:
            job.simulation_period = simulation_period

        return job

    def get_active_simulation_count(self) -> int:
        """Count simulations currently in PREPARING or RUNNING states."""
        return sum(
            1 for j in self._jobs.values()
            if j.status in (SimulationStatus.PREPARING, SimulationStatus.RUNNING)
        )

    def can_start_simulation(self, max_concurrent: int = 4) -> bool:
        """Verify if system has available capacity to spawn another concurrent simulation."""
        return self.get_active_simulation_count() < max_concurrent

    def list_jobs(self, limit: Optional[int] = None) -> List[SimulationJobRecord]:
        """List all tracked simulation records."""
        jobs = list(self._jobs.values())
        if limit:
            return jobs[:limit]
        return jobs

    def clear(self):
        """Clear all records (used in tests)."""
        self._jobs.clear()

    def reap_stale_or_orphaned_jobs(self, timeout_threshold_seconds: int = 900) -> int:
        """Scan simulation jobs and mark any QUEUED, PREPARING, or RUNNING jobs that have
        exceeded the activity timeout threshold or were left over from server restarts as FAILED.
        Returns the count of reaped jobs.
        """
        now = datetime.now(timezone.utc)
        reaped_count = 0

        for job in list(self._jobs.values()):
            if job.status in (SimulationStatus.QUEUED, SimulationStatus.PREPARING, SimulationStatus.RUNNING):
                ref_time_str = job.started_at or job.created_at
                is_stale = False
                if ref_time_str:
                    try:
                        ref_dt = datetime.fromisoformat(ref_time_str)
                        if (now - ref_dt).total_seconds() > timeout_threshold_seconds:
                            is_stale = True
                    except Exception:
                        is_stale = True
                else:
                    is_stale = True

                if is_stale:
                    job.status = SimulationStatus.FAILED
                    job.completed_at = now.isoformat()
                    job.error_message = (
                        "Simulation interrupted: process terminated or timed out without heartbeat."
                    )
                    reaped_count += 1

        return reaped_count

    def prune_old_simulation_workdirs(self, storage_dir: Optional[str] = None, retention_days: int = 7) -> int:
        """Prune intermediate scratch execution directories older than retention_days,
        preserving normalized results.
        """
        import shutil
        from pathlib import Path
        import time

        base_dir = Path(storage_dir or "storage/simulations")
        if not base_dir.is_dir():
            return 0

        now_ts = time.time()
        cutoff_sec = retention_days * 86400
        pruned_count = 0

        for entry in base_dir.glob("sim_*"):
            if entry.is_dir():
                try:
                    mtime = entry.stat().st_mtime
                    if (now_ts - mtime) > cutoff_sec:
                        shutil.rmtree(entry, ignore_errors=True)
                        pruned_count += 1
                except Exception:
                    pass

        return pruned_count


# Global singleton instance
simulation_store = SimulationJobStore()

