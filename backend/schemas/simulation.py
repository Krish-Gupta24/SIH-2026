"""Pydantic schemas for simulation requests, status, and thermal results."""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import Field
from backend.schemas import CoreSchema


class SimulationRunRequest(CoreSchema):
    shelter_id: str
    engine: str = Field(default="EnergyPlus", description="EnergyPlus | OpenStudio | ANSYS")
    weather_source: str
    simulation_type: str = Field(default="Annual", description="Annual | DesignDay | MultiDay")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timesteps_per_hour: int = Field(default=4, ge=1, le=60)


class SimulationStatusResponse(CoreSchema):
    job_id: str
    status: str  # PENDING, RUNNING, COMPLETED, FAILED
    progress_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    engine: str
    engine_version: Optional[str] = None
    exit_code: Optional[int] = None
    is_physically_valid: Optional[bool] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class ComfortMetricsSchema(CoreSchema):
    pmv_average: float
    ppd_average: float
    hours_comfort_exceeded: int
    heating_demand_kwh: float
    cooling_demand_kwh: float
    min_indoor_temp_c: float
    max_indoor_temp_c: float
