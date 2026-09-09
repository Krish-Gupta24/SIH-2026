from typing import List, Dict, Any
from fastapi import APIRouter
from simulation.materials.database import material_db

router = APIRouter()


@router.get("/")
async def list_materials() -> List[Dict[str, Any]]:
    """List physical materials from verified database."""
    materials = material_db.list_materials()
    return [
        {
            "id": m.id,
            "name": m.name,
            "density": m.density,
            "thermal_conductivity": m.thermal_conductivity,
            "specific_heat": m.specific_heat,
            "thermal_absorptance": m.thermal_absorptance,
            "solar_absorptance": m.solar_absorptance,
            "visible_absorptance": m.visible_absorptance,
            "roughness": m.roughness,
            "source": m.source,
            "provenance": m.provenance,
            "status": m.status.value,
        }
        for m in materials
    ]
