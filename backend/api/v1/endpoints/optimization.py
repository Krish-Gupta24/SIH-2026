"""Endpoints for parametric sweep optimization problem setup and Pareto front retrieval."""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.optimization.parameter_sweep_optimizer import (
    ParameterSweepOptimizer,
    OptimizationConstraint,
)

router = APIRouter()

# In-memory storage for optimization runs
_OPTIMIZATION_RUNS: Dict[str, Dict[str, Any]] = {}


class SweepRunRequest(BaseModel):
    shelter_model: Dict[str, Any]
    objective: str = "maximize_comfort"
    parameters_to_sweep: Optional[List[str]] = None
    custom_parameter_options: Optional[Dict[str, List[Any]]] = None
    constraints: Optional[List[Dict[str, Any]]] = None
    weather_dataset: Optional[str] = None
    weather_file_path: Optional[str] = None
    run_period_days: int = Field(default=3, ge=1, le=14)
    max_candidates: int = Field(default=25, ge=2, le=100)


@router.get("/parameters")
async def get_available_parameters():
    """Return the 9 standard envelope parameters and default discrete options."""
    return {
        "parameters": ParameterSweepOptimizer.DEFAULT_SWEEP_OPTIONS,
        "descriptions": {
            "orientation": "Building azimuth angle (0° = True South solar aperture, 90° = East)",
            "insulation_thickness": "Opaque wall insulation layer thickness (meters)",
            "wall_construction": "Wall envelope composite assembly classification",
            "roof_construction": "Roof and ceiling thermal barrier assembly",
            "window_area": "Total glazed fenestration surface area (m²)",
            "glazing_type": "Window glazing system and gas cavity specification",
            "window_placement": "Aperture distribution strategy across cardinal facades",
            "thermal_mass": "Internal high-density thermal mass buffer capacity",
            "ventilation": "Continuous air infiltration rate (ACH)",
        },
    }


@router.get("/objectives")
async def get_supported_objectives():
    """Return the 5 supported engineering optimization objectives."""
    return {
        "objectives": [
            {
                "id": "maximize_comfort",
                "label": "Maximize Comfort Hours",
                "description": "Maximizes the percentage of time living zone temperatures remain within 18°C–24°C.",
            },
            {
                "id": "minimize_heat_loss",
                "label": "Minimize Envelope Heat Loss",
                "description": "Minimizes cumulative thermal conduction and air leakage loss rates (Watts).",
            },
            {
                "id": "minimize_auxiliary_energy",
                "label": "Minimize Auxiliary Heating Energy",
                "description": "Minimizes annual heating energy demand (kWh/m²·a) to sustain indoor livability.",
            },
            {
                "id": "maximize_useful_solar_gain",
                "label": "Maximize Useful Passive Solar Gain",
                "description": "Maximizes passive solar radiation capture while penalizing summertime overheating.",
            },
            {
                "id": "minimize_material_cost",
                "label": "Minimize Material & Logistics Cost",
                "description": "Balances thermal performance against insulation weight and remote transport penalties.",
            },
        ]
    }


@router.post("/sweep")
async def run_parameter_sweep(request: SweepRunRequest):
    """Execute full 8-step parameter sweep optimization run."""
    try:
        # Reconstruct constraints if provided
        active_constraints = None
        if request.constraints:
            active_constraints = [
                OptimizationConstraint(
                    name=c.get("name", "Custom Constraint"),
                    metric=c.get("metric", "indoor_min_c"),
                    operator=c.get("operator", ">="),
                    threshold=float(c.get("threshold", 8.0)),
                    description=c.get("description", ""),
                )
                for c in request.constraints
            ]

        optimizer = ParameterSweepOptimizer(
            base_model=request.shelter_model,
            objective=request.objective,
            custom_parameter_options=request.custom_parameter_options,
            constraints=active_constraints,
            weather_dataset=request.weather_dataset,
            weather_file_path=request.weather_file_path,
            run_period_days=request.run_period_days,
        )

        results = optimizer.run_optimization_sweep(
            parameters_to_sweep=request.parameters_to_sweep,
            max_candidates=request.max_candidates,
        )

        run_id = results["metadata"]["run_id"]
        _OPTIMIZATION_RUNS[run_id] = results

        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Optimization sweep failed: {str(e)}")


@router.get("/runs")
async def list_optimization_runs():
    """List all executed optimization runs with metadata."""
    return [
        run["metadata"] for run in _OPTIMIZATION_RUNS.values()
    ]


@router.get("/runs/{run_id}")
async def get_optimization_run(run_id: str):
    """Retrieve full candidate rankings, Pareto frontier, and best candidate for a run."""
    if run_id not in _OPTIMIZATION_RUNS:
        raise HTTPException(status_code=404, detail="Optimization run not found")
    return _OPTIMIZATION_RUNS[run_id]


class RecommendationRequest(BaseModel):
    sweep_result: Optional[Dict[str, Any]] = None
    run_id: Optional[str] = None
    shelter_model: Optional[Dict[str, Any]] = None
    baseline_heating_kwh: float = 165.0
    baseline_comfort_pct: float = 35.0


@router.post("/recommendation")
async def generate_recommendation(request: RecommendationRequest):
    """Generate structured 7-section RECOMMENDED DESIGN report from optimization result."""
    from backend.optimization.recommendation_engine import RecommendationEngine, NoValidDesignError

    sweep = request.sweep_result
    if not sweep and request.run_id:
        if request.run_id not in _OPTIMIZATION_RUNS:
            raise HTTPException(status_code=404, detail=f"Optimization run {request.run_id} not found")
        sweep = _OPTIMIZATION_RUNS[request.run_id]

    if not sweep:
        raise HTTPException(status_code=400, detail="Must provide either sweep_result or valid run_id")

    base_model = request.shelter_model or sweep.get("best_candidate", {}).get("shelter_model", {})
    try:
        report = RecommendationEngine.generate_report(
            sweep_result=sweep,
            base_model=base_model,
            baseline_heating_kwh=request.baseline_heating_kwh,
            baseline_comfort_pct=request.baseline_comfort_pct,
        )
        return {
            "status": "SUCCESS",
            "report": report.to_dict(),
            "markdown": report.to_markdown(),
        }
    except NoValidDesignError as e:
        return {
            "status": "NO_VALID_DESIGN",
            "message": "No valid design found under the specified constraints.",
            "report": None,
            "markdown": "## No valid design found under the specified constraints.",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate recommendation report: {str(e)}")

