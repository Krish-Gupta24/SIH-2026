"""Endpoints for multi-objective optimization problem setup and Pareto front retrieval."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_optimization_jobs():
    """List optimization runs."""
    return []
