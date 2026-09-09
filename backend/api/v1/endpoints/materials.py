"""Endpoints for materials library and envelope layer stack definitions."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_materials():
    """List physical materials from verified database."""
    return []
