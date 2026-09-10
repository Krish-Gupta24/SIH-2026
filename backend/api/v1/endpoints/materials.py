from typing import List, Dict, Any
from fastapi import APIRouter
from simulation.materials.database import material_db

router = APIRouter()


@router.get("/")
async def list_materials() -> List[Dict[str, Any]]:
    """List physical materials from verified database."""
    materials = material_db.list_materials()
    return [m.to_dict() for m in materials]
