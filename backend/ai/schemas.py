"""Pydantic request and response schemas for the AI Generative Design Engine."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GenerateDesignRequest(BaseModel):
    """Payload to initiate an AI Inverse Design optimization job."""

    weather_id: str = Field(default="leh_ladakh_tmyx", description="Canonical high-altitude weather station ID")
    target_indoor_min_c: float = Field(default=12.0, description="Minimum acceptable indoor temperature in degrees C")
    max_envelope_mass_kg: Optional[float] = Field(default=None, description="Optional user-defined maximum envelope deployment mass")
    optimization_mode: str = Field(default="BALANCED", description="Optimization mode: BALANCED, MINIMUM_HEATING, MAXIMUM_COMFORT, MINIMUM_MASS")
    population_size: int = Field(default=100, ge=20, le=300, description="Genetic algorithm population size")
    generations: int = Field(default=40, ge=5, le=100, description="Genetic algorithm generations")
    occupants: int = Field(default=4, ge=1, le=12, description="Target occupant count")


class OptimizationJobStatus(BaseModel):
    """Real-time job progress container."""

    job_id: str
    status: str  # 'QUEUED', 'OPTIMIZING', 'COMPLETED', 'FAILED'
    progress_pct: float = 0.0
    current_generation: int = 0
    total_generations: int = 40
    evaluations_count: int = 0
    elapsed_seconds: float = 0.0
    candidates_count: int = 0
    error_message: Optional[str] = None


class CandidateResponse(BaseModel):
    """Single candidate design returned from NSGA-II."""

    candidate_id: str
    parameters: Dict[str, Any]
    surrogate_predictions: Dict[str, float]
    uncertainty_margin_c: float
    is_high_uncertainty: bool
    objective_values: List[float]
    is_physics_verified: bool
    verified_physics: Optional[Dict[str, float]] = None
    calibration_error: Optional[Dict[str, float]] = None
    verification_duration_s: Optional[float] = None


class VerifyCandidatesRequest(BaseModel):
    """Request to verify selected candidates using EnergyPlus."""

    k: int = Field(default=5, ge=1, le=10, description="Number of diverse candidates to verify")
    period_days: int = Field(default=3, ge=1, le=365, description="Verification simulation period")


class ExplainCandidateRequest(BaseModel):
    """Request for target-specific SHAP explanation."""

    candidate: Dict[str, Any]
    target_name: str = Field(default="winter_indoor_min_c", description="Target metric to explain")
    top_k: int = Field(default=6, ge=3, le=15, description="Number of top contributors to extract")


class BenchmarkRunRequest(BaseModel):
    """Request to profile execution latencies."""

    n_direct: int = Field(default=5, ge=2, le=20)
    population_size: int = Field(default=30, ge=10, le=100)
    generations: int = Field(default=10, ge=5, le=30)
