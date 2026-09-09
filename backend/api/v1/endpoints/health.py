"""Health check and engine status endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    """Returns basic system health status."""
    return {
        "status": "healthy",
        "service": "Area-Specific Shelter Thermal Simulation Platform API",
        "version": "0.1.0",
    }
