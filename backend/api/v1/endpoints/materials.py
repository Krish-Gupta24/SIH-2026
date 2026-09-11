"""Endpoints for Physical Materials and Glazing Assemblies."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from simulation.materials.database import material_db
from simulation.materials.glazing import glazing_db
from simulation.materials.material import Material, MaterialStatus

router = APIRouter()


class MaterialCreateRequest(BaseModel):
    """Payload to register a new physical building material."""
    name: str = Field(..., min_length=2, description="Material designation name")
    category: str = Field(default="General", description="Material classification category")
    density: float = Field(..., gt=0.0, le=15000.0, description="Density in kg/m³")
    thermal_conductivity: float = Field(..., gt=0.0, le=500.0, description="Thermal conductivity in W/(m·K)")
    specific_heat: float = Field(..., gt=0.0, le=10000.0, description="Specific heat capacity in J/(kg·K)")
    thermal_absorptance: float = Field(default=0.90, ge=0.0, le=1.0)
    solar_absorptance: float = Field(default=0.70, ge=0.0, le=1.0)
    visible_absorptance: float = Field(default=0.70, ge=0.0, le=1.0)
    roughness: str = Field(default="MediumRough")
    source: str = Field(default="User Laboratory Test", description="Certification or test standard")
    provenance: str = Field(default="Direct User Specification", description="Source citation or test report")
    cost_per_m3: Optional[float] = Field(default=None, ge=0.0)
    notes: Optional[str] = None


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    summary="List physical materials from verified database",
)
@router.get(
    "/",
    response_model=List[Dict[str, Any]],
    include_in_schema=False,
)
async def list_materials() -> List[Dict[str, Any]]:
    """List all certified and user-defined physical materials."""
    materials = material_db.list_materials()
    return [m.to_dict() for m in materials]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Register a verified physical material",
)
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_material(req: MaterialCreateRequest) -> Dict[str, Any]:
    """Register a new material with physical properties into the runtime registry."""
    slug = req.name.lower().replace(" ", "-").replace("/", "-")
    mat_id = f"mat-user-{slug}"

    try:
        new_mat = Material(
            id=mat_id,
            name=req.name,
            category=req.category,
            density=req.density,
            thermal_conductivity=req.thermal_conductivity,
            specific_heat=req.specific_heat,
            thermal_absorptance=req.thermal_absorptance,
            solar_absorptance=req.solar_absorptance,
            visible_absorptance=req.visible_absorptance,
            roughness=req.roughness,
            source=req.source,
            provenance=req.provenance,
            status=MaterialStatus.USER_DEFINED,
            cost_per_m3=req.cost_per_m3,
            notes=req.notes or "Registered via Platform API",
        )
        material_db.register_material(new_mat)
        return new_mat.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.get(
    "/glazing",
    summary="List verified window glazing and frame systems",
)
async def list_glazing_systems() -> Dict[str, Any]:
    """Retrieve certified window assemblies, frame conductance, and U-factors."""
    glazings = [
        {
            "id": g.id,
            "name": g.name,
            "u_value": g.u_value,
            "shgc": g.shgc,
            "visible_transmittance": g.visible_transmittance,
            "cost_per_m2": g.cost_per_m2,
            "source": g.source,
            "provenance": g.provenance,
            "status": g.status.value,
            "notes": g.notes,
        }
        for g in glazing_db.list_glazings()
    ]
    frames = [
        {
            "id": f.id,
            "name": f.name,
            "u_value": f.u_value,
            "width_m": f.width_m,
            "source": f.source,
            "notes": f.notes,
        }
        for f in glazing_db.list_frames()
    ]
    return {
        "glazings": glazings,
        "frames": frames,
    }
