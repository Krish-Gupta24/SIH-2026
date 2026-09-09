"""Endpoints for simulation job dispatch, status polling, and thermal results retrieval."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_simulations():
    """List simulation run history."""
    return []
