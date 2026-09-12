"""API v1 routing aggregation."""

from fastapi import APIRouter
from backend.api.v1.endpoints import (
    health,
    shelters,
    simulations,
    weather,
    materials,
    optimization,
    reports,
    auth,
    validation,
    ansys,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Identity"])
api_router.include_router(health.router, prefix="/health", tags=["System Health"])
api_router.include_router(shelters.router, prefix="/shelters", tags=["Shelter Models"])
api_router.include_router(shelters.router, prefix="/projects", tags=["Shelter Models (Projects Alias)"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["Thermal Simulation"])

# Direct /simulate endpoint accessible under /api/v1/simulate and /api/simulate
from backend.api.v1.endpoints.simulations import queue_simulation
api_router.add_api_route(
    "/simulate",
    queue_simulation,
    methods=["POST"],
    status_code=202,
    tags=["Thermal Simulation"],
    summary="Direct endpoint for queuing asynchronous simulations",
)
api_router.include_router(weather.router, prefix="/weather", tags=["Climate & Weather"])
api_router.include_router(materials.router, prefix="/materials", tags=["Materials & Constructions"])
api_router.include_router(optimization.router, prefix="/optimization", tags=["Multi-Objective Optimization"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Provenance"])
api_router.include_router(validation.router, prefix="/validation", tags=["Empirical Validation"])
api_router.include_router(ansys.router, prefix="/ansys", tags=["ANSYS Simulation Deck & Validation"])


