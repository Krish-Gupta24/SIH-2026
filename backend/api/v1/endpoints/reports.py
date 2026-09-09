"""Endpoints for engineering report generation and compliance exports."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_reports():
    """List generated thermal comfort and compliance reports."""
    return []
