"""FastAPI endpoints for asynchronous simulation execution, status monitoring, and normalized results retrieval."""

import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.simulation.store import simulation_store, SimulationStatus
from backend.simulation.tasks import run_simulation_task
from backend.core.celery_app import celery_app
from backend.core.config import settings
from backend.core.rate_limiter import rate_limiter
from backend.core.audit_logger import SecurityAudit
from backend.core.path_security import sanitize_filename
from backend.core.binary_allowlist import SecurityException
from fastapi import Request

router = APIRouter()


DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


class SimulationRequest(BaseModel):
    """Schema for simulation execution requests."""
    shelter_model: Dict[str, Any] = Field(..., description="Canonical ShelterModel dictionary")
    weather_file: str = Field(default="test_weather.epw", description="Path or name of weather dataset")
    run_period_days: Optional[int] = Field(default=None, ge=1, le=365, description="Number of simulation days")
    period_type: Optional[str] = Field(default="quick", description="quick (24h), multi_day, monthly, full_year, custom")
    start_month: Optional[int] = Field(default=None, ge=1, le=12)
    start_day: Optional[int] = Field(default=None, ge=1, le=31)
    end_month: Optional[int] = Field(default=None, ge=1, le=12)
    end_day: Optional[int] = Field(default=None, ge=1, le=31)
    timestep: int = Field(default=4, ge=1, le=60, description="Timestep per hour (1, 2, 4, 6, 10, 12, 15, 20, 30, 60)")
    is_annual: bool = Field(default=False, description="Full-year annual run flag")
    timeout_seconds: int = Field(default=600, ge=1, le=3600, description="Process execution timeout")
    project_id: Optional[str] = None
    version_id: Optional[str] = None
    allow_test_data: bool = Field(default=False, description="Explicit confirmation required to simulate with test weather datasets")


def resolve_simulation_period(req: SimulationRequest) -> Dict[str, Any]:
    """Resolve period type, date boundaries, and timestep into a canonical execution specification."""
    pt = (req.period_type or "quick").lower()

    # 1. Full-Year
    if pt in ("full_year", "annual") or req.is_annual or req.run_period_days == 365:
        return {
            "period_type": "full_year",
            "is_annual": True,
            "start_month": 1,
            "start_day": 1,
            "end_month": 12,
            "end_day": 31,
            "run_period_days": 365,
            "timestep": req.timestep,
        }

    # 2. Quick / 24-Hour (1 day)
    if pt in ("quick", "24_hour", "24h", "1_day"):
        m = req.start_month or 1
        d = req.start_day or 1
        return {
            "period_type": "quick",
            "is_annual": False,
            "start_month": m,
            "start_day": d,
            "end_month": m,
            "end_day": d,
            "run_period_days": 1,
            "timestep": req.timestep,
        }

    # 3. Monthly
    if pt in ("monthly", "month"):
        m = req.start_month or 1
        end_d = DAYS_IN_MONTH[m - 1]
        return {
            "period_type": "monthly",
            "is_annual": False,
            "start_month": m,
            "start_day": 1,
            "end_month": m,
            "end_day": end_d,
            "run_period_days": end_d,
            "timestep": req.timestep,
        }

    # 4. Multi-day or Custom
    days = req.run_period_days or 3
    s_m = req.start_month or 1
    s_d = req.start_day or 1
    e_m = req.end_month or s_m
    e_d = req.end_day or min(s_d + days - 1, DAYS_IN_MONTH[e_m - 1])

    return {
        "period_type": pt,
        "is_annual": False,
        "start_month": s_m,
        "start_day": s_d,
        "end_month": e_m,
        "end_day": e_d,
        "run_period_days": days,
        "timestep": req.timestep,
    }


class SimulationResponse(BaseModel):
    """Schema for simulation queue response."""
    simulation_id: str
    status: str
    message: str
    created_at: str


@router.post(
    "",
    response_model=SimulationResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue an asynchronous building simulation",
)
@router.post(
    "/simulate",
    response_model=SimulationResponse,
    status_code=status.HTTP_202_ACCEPTED,
    include_in_schema=False,
)
async def queue_simulation(req: SimulationRequest, request: Request):
    """Create simulation record and dispatch background Celery worker job without blocking."""
    # 1. Rate Limiting Check
    client_ip = request.client.host if request.client else "127.0.0.1"
    allowed, remaining, retry_after = rate_limiter.check_limit(
        key=f"{client_ip}:simulation",
        max_requests=settings.RATE_LIMIT_SIMULATION_PER_MINUTE,
        window_seconds=60,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: maximum {settings.RATE_LIMIT_SIMULATION_PER_MINUTE} simulation requests per minute.",
            headers={"Retry-After": str(retry_after)},
        )

    # 2. Concurrency Capacity Check
    if not simulation_store.can_start_simulation(settings.MAX_CONCURRENT_SIMULATIONS):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Maximum concurrent simulation capacity ({settings.MAX_CONCURRENT_SIMULATIONS} active jobs) reached. "
                f"Please wait for currently running simulations to conclude."
            ),
            headers={"Retry-After": "30"},
        )

    # 3. Path Traversal & File Name Sanitization on Weather File
    if ".." in req.weather_file or "\x00" in req.weather_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SECURITY VIOLATION: Path traversal sequence detected in weather file parameter.",
        )

    # 3b. Weather Data Policy Check: Block test data unless explicitly confirmed
    is_test_dataset = (
        "test_weather" in req.weather_file.lower()
        or req.weather_file.lower() == "test_weather.epw"
    )
    if is_test_dataset and not req.allow_test_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "SIMULATION BLOCKED: Requested weather dataset is classified as TEST DATA. "
                "The application strictly prohibits silent or unconfirmed usage of synthetic test weather for simulations. "
                "Set allow_test_data=true to explicitly confirm you wish to execute using test fixtures."
            ),
        )

    # 4. Geometry physical bounds validation
    geom = req.shelter_model.get("geometry", {})
    if not geom:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Shelter model must contain a 'geometry' specification.",
        )
    l, w, h = geom.get("length", 0), geom.get("width", 0), geom.get("height", 0)
    if l <= 0 or w <= 0 or h <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dimensions (length, width, height) must all be positive numbers.",
        )
    if l > 100 or w > 100 or h > 30:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dimensions exceed maximum physical building threshold (100m x 100m x 30m).",
        )

    # 5. Resolve simulation period & clamp execution timeout to system maximum
    resolved_period = resolve_simulation_period(req)
    clamped_timeout = min(req.timeout_seconds, settings.MAX_SIMULATION_TIMEOUT_SECONDS)

    # 6. Generate simulation ID and register queued record
    sim_id = str(uuid.uuid4())
    record = simulation_store.create_job(
        job_id=sim_id,
        shelter_model=req.shelter_model,
        weather_file=req.weather_file,
        project_id=req.project_id,
        version_id=req.version_id,
        run_period_days=resolved_period["run_period_days"],
        timeout_seconds=clamped_timeout,
        allow_test_data=req.allow_test_data,
        simulation_period=resolved_period,
    )

    # 7. Audit log event
    SecurityAudit.log_simulation_dispatch(actor=client_ip, sim_id=sim_id, client_ip=client_ip)

    # 8. Dispatch simulation task with Redis/Celery configuration switch
    task_kwargs = {
        "simulation_id": sim_id,
        "shelter_model": req.shelter_model,
        "weather_file_path": req.weather_file,
        "run_period_days": resolved_period["run_period_days"],
        "start_month": resolved_period["start_month"],
        "start_day": resolved_period["start_day"],
        "end_month": resolved_period["end_month"],
        "end_day": resolved_period["end_day"],
        "timestep": resolved_period["timestep"],
        "is_annual": resolved_period["is_annual"],
        "timeout_seconds": clamped_timeout,
        "allow_test_data": req.allow_test_data,
    }

    task_id = None
    if getattr(celery_app.conf, "task_always_eager", False) or getattr(settings, "ENABLE_CELERY", False):
        try:
            task = run_simulation_task.delay(**task_kwargs)
            task_id = getattr(task, "id", None)
        except Exception:
            # Fallback to local background thread execution when external Celery broker is unreachable
            import threading
            t = threading.Thread(
                target=run_simulation_task,
                kwargs=task_kwargs,
                daemon=True,
            )
            t.start()
            task_id = f"thread-{sim_id}"
    else:
        # Development mode (ENABLE_CELERY=False): Run simulation directly without Celery/Redis dependency
        import threading
        t = threading.Thread(
            target=run_simulation_task,
            kwargs=task_kwargs,
            daemon=True,
        )
        t.start()
        task_id = f"local-{sim_id}"

    # Attach celery_task_id without reverting status if task completed eagerly
    curr_job = simulation_store.get_job(sim_id)
    if curr_job and task_id:
        curr_job.celery_task_id = task_id


    return SimulationResponse(
        simulation_id=sim_id,
        status=curr_job.status.value if curr_job else SimulationStatus.QUEUED.value,
        message="Simulation job successfully queued.",
        created_at=record.created_at,
    )


@router.get(
    "/{simulation_id}",
    summary="Get current simulation lifecycle status",
)
async def get_simulation_status(simulation_id: str):
    """Retrieve current lifecycle status (queued, preparing, running, parsing, completed, failed, cancelled)."""
    job = simulation_store.get_job(simulation_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found.",
        )
    return job.to_public_dict()


@router.get(
    "/{simulation_id}/results",
    summary="Retrieve normalized simulation results",
)
async def get_simulation_results(simulation_id: str):
    """Retrieve normalized SimulationResult. Returns 409 if still running, 400 if failed."""
    job = simulation_store.get_job(simulation_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found.",
        )

    if job.status == SimulationStatus.COMPLETED:
        if job.normalized_results:
            return job.normalized_results
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Simulation marked completed but results payload is missing.",
        )

    if job.status in (
        SimulationStatus.QUEUED,
        SimulationStatus.PREPARING,
        SimulationStatus.RUNNING,
        SimulationStatus.PARSING,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Simulation is currently in status '{job.status.value}'. Results are not ready yet.",
        )

    if job.status == SimulationStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Simulation failed: {job.error_message or 'Unknown engine error.'}",
        )

    if job.status == SimulationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulation was cancelled.",
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Cannot retrieve results for simulation in status '{job.status.value}'.",
    )


@router.post(
    "/{simulation_id}/cancel",
    summary="Cancel a queued or running simulation",
)
async def cancel_simulation(simulation_id: str):
    """Cancel an active simulation job."""
    job = simulation_store.get_job(simulation_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found.",
        )

    if job.status in (SimulationStatus.COMPLETED, SimulationStatus.FAILED, SimulationStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel simulation in terminal status '{job.status.value}'.",
        )

    if job.celery_task_id:
        try:
            celery_app.control.revoke(job.celery_task_id, terminate=True)
        except Exception:
            pass

    simulation_store.update_status(simulation_id, SimulationStatus.CANCELLED)
    return {
        "simulation_id": simulation_id,
        "status": SimulationStatus.CANCELLED.value,
        "message": "Simulation successfully cancelled.",
    }
