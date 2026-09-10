"""Pydantic schema definitions for the canonical ShelterModel."""

from typing import List, Optional, Dict, Any
from pydantic import Field
from backend.schemas import CoreSchema


class LocationSchema(CoreSchema):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Degrees north (-90 to +90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Degrees east (-180 to +180)")
    elevation: float = Field(..., ge=-500.0, le=9000.0, description="Meters above sea level")
    region: str
    climate_zone: str
    weather_source: str


class GeometrySchema(CoreSchema):
    shape: str
    length: float = Field(..., gt=0.0, description="Length in meters")
    width: float = Field(..., gt=0.0, description="Width in meters")
    height: float = Field(..., gt=0.0, description="Wall height in meters")
    orientation: float = Field(..., ge=0.0, lt=360.0, description="Azimuth angle in degrees from true North")
    roof_type: str
    roof_angle: float = Field(default=0.0, ge=0.0, le=85.0, description="Pitch angle in degrees")
    floor_elevation: float = Field(default=0.0, ge=0.0, description="Floor height above grade in meters")


class ComfortTargetsSchema(CoreSchema):
    model: Optional[str] = "DesignTargets Operational Band"
    target_indoor_temp_min: Optional[float] = 18.0
    target_indoor_temp_max: Optional[float] = 26.0
    target_indoor_temp: Optional[float] = 22.0
    acceptable_ppd_max: Optional[float] = 20.0
    adaptive_category: Optional[str] = "category_ii"
    assumptions: Optional[str] = None
    applicable_conditions: Optional[str] = None


class DesignTargetsSchema(CoreSchema):
    comfort: Optional[ComfortTargetsSchema] = None
    comfortTempMinC: Optional[float] = None
    comfortTempMaxC: Optional[float] = None
    targetIndoorTempC: Optional[float] = None
    comfortModel: Optional[str] = None
    assumptions: Optional[str] = None
    applicableConditions: Optional[str] = None
    targetComfortPercent: Optional[float] = None
    maxAnnualHeatingDemandKwhM2: Optional[float] = None


class ShelterModelSchema(CoreSchema):
    id: str
    name: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    version: str = "1.0.0"
    location: LocationSchema
    geometry: GeometrySchema
    design_targets: Optional[Dict[str, Any]] = None
    designTargets: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
