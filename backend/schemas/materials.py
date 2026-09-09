"""Pydantic schemas for materials, constructions, and layer stacks."""

from typing import Optional
from pydantic import Field
from backend.schemas import CoreSchema


class MaterialSchema(CoreSchema):
    id: str
    name: str
    conductivity: float = Field(..., gt=0.0, description="W/(m·K)")
    density: float = Field(..., gt=0.0, description="kg/m³")
    specific_heat: float = Field(..., gt=0.0, description="J/(kg·K)")
    roughness: str = "MediumRough"
    provenance: str
    source_database: str
    is_user_defined: bool = False


class MaterialLayerSchema(CoreSchema):
    material_id: str
    thickness: float = Field(..., gt=0.0, description="Thickness in meters")


class GlazingMaterialSchema(CoreSchema):
    id: str
    name: str
    u_value: float = Field(..., gt=0.0, description="W/(m²·K)")
    shgc: float = Field(..., gt=0.0, lt=1.0, description="Solar Heat Gain Coefficient")
    vlt: float = Field(..., gt=0.0, lt=1.0, description="Visible Light Transmittance")
    provenance: str
