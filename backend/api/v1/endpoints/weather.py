"""Endpoints for EPW file management, NASA POWER retrieval, and design day lookup."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_weather_sources():
    """List available weather files and climate datasets."""
    return []
