"""Pydantic schemas for multi-objective optimization parameters and Pareto results."""

from typing import List, Dict, Any, Optional
from pydantic import Field
from backend.schemas import CoreSchema


class OptimizationObjectiveSchema(CoreSchema):
    name: str  # min_heating_load | min_cost | max_comfort_hours
    weight: float = 1.0


class OptimizationRunRequest(CoreSchema):
    shelter_id: str
    objectives: List[OptimizationObjectiveSchema]
    max_generations: int = Field(default=50, ge=5, le=500)
    population_size: int = Field(default=30, ge=10, le=200)
    allowed_parameter_bounds: Dict[str, List[float]] = Field(default_factory=dict)


class ParetoSolutionSchema(CoreSchema):
    solution_id: str
    parameters: Dict[str, Any]
    objective_values: Dict[str, float]
    is_pareto_optimal: bool = True
