"""Endpoints for ShelterModel CRUD and geometry validation."""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from backend.services.shelter_service import shelter_service

router = APIRouter()


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    summary="List all saved shelter models",
)
@router.get(
    "/",
    response_model=List[Dict[str, Any]],
    include_in_schema=False,
)
async def list_shelters():
    """List all saved canonical shelter models from persistent storage."""
    return shelter_service.list_shelters()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create or save a canonical shelter model",
)
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_shelter(shelter: Dict[str, Any]):
    """Save a new shelter model into persistent storage."""
    if not shelter.get("geometry"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Shelter model must specify a geometry object.",
        )
    return shelter_service.save_shelter(shelter)


@router.get(
    "/{shelter_id}",
    summary="Retrieve a specific shelter model",
)
async def get_shelter(shelter_id: str):
    """Retrieve a canonical shelter model by unique ID."""
    shelter = shelter_service.get_shelter(shelter_id)
    if not shelter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shelter model '{shelter_id}' not found.",
        )
    return shelter


@router.put(
    "/{shelter_id}",
    summary="Update an existing shelter model",
)
async def update_shelter(shelter_id: str, updates: Dict[str, Any]):
    """Update properties of an existing canonical shelter model."""
    existing = shelter_service.get_shelter(shelter_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shelter model '{shelter_id}' not found.",
        )
    updates["id"] = shelter_id
    # Deep merge or replace
    merged = {**existing, **updates}
    return shelter_service.save_shelter(merged)


@router.delete(
    "/{shelter_id}",
    summary="Delete a shelter model",
)
async def delete_shelter(shelter_id: str):
    """Remove a shelter model from persistent storage."""
    success = shelter_service.delete_shelter(shelter_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shelter model '{shelter_id}' not found.",
        )
    return {"status": "deleted", "id": shelter_id}
