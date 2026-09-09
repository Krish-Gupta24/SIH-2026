"""Endpoints for ShelterModel CRUD and geometry validation."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_shelters():
    """List all saved shelter models."""
    return []
