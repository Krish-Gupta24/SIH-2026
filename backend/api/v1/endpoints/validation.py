"""Endpoints for empirical reference-case validation and statistical accuracy auditing."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from backend.validation.reference_case_validator import ReferenceCaseValidator, ReferenceValidationResult
from backend.simulation.store import simulation_store

router = APIRouter()


class DirectValidationRequest(BaseModel):
    simulated_timestamps: List[str]
    simulated_values: List[float]
    reference_csv_content: Optional[str] = None
    target_metric: str = "indoor_temperature"
    source_unit: Optional[str] = None
    source_tz_offset_hours: float = 5.5
    target_tz_offset_hours: float = 5.5


@router.post("/evaluate", summary="Evaluate statistical errors between simulation and reference data")
async def evaluate_validation(request: DirectValidationRequest):
    """
    Run 5-stage validation workflow:
    Reference Data -> map timestamps -> align units -> align time zones -> compare -> calculate MAE/RMSE/MBE/R².
    If reference_csv_content is omitted, returns 'Validation data not provided.' without synthetic fabrication.
    """
    result = ReferenceCaseValidator.validate_simulation(
        simulated_timestamps=request.simulated_timestamps,
        simulated_values=request.simulated_values,
        reference_csv_content=request.reference_csv_content,
        target_metric=request.target_metric,
        source_unit=request.source_unit,
        source_tz_offset_hours=request.source_tz_offset_hours,
        target_tz_offset_hours=request.target_tz_offset_hours,
    )
    return result.to_dict()


@router.post("/compare-job/{simulation_id}", summary="Validate a completed simulation job against uploaded reference CSV")
async def validate_simulation_job(
    simulation_id: str,
    file: Optional[UploadFile] = File(None),
    target_metric: str = Form("indoor_temperature"),
    source_unit: Optional[str] = Form(None),
    source_tz_offset_hours: float = Form(5.5),
):
    """Validate a stored SimulationResult against an uploaded field logger CSV."""
    job = simulation_store.get_job(simulation_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found.",
        )

    if not job.normalized_results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulation has no completed results to validate.",
        )

    sim_res = job.normalized_results
    timestamps = sim_res.get("timestamps", [])
    if target_metric == "outdoor_temperature":
        values = sim_res.get("outdoor_temperature", [])
    elif target_metric == "solar_radiation":
        values = sim_res.get("solar_radiation", [])
    else:
        values = sim_res.get("indoor_temperature", [])

    csv_content = None
    if file:
        content_bytes = await file.read()
        csv_content = content_bytes.decode("utf-8", errors="replace")

    result = ReferenceCaseValidator.validate_simulation(
        simulated_timestamps=timestamps,
        simulated_values=values,
        reference_csv_content=csv_content,
        target_metric=target_metric,
        source_unit=source_unit,
        source_tz_offset_hours=source_tz_offset_hours,
    )
    return result.to_dict()
