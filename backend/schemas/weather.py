"""Pydantic schemas for weather data and climate variables."""

from typing import List, Optional
from pydantic import Field
from backend.schemas import CoreSchema


class WeatherSummarySchema(CoreSchema):
    location_name: str
    latitude: float
    longitude: float
    elevation: float
    annual_heating_degree_days: float
    annual_cooling_degree_days: float
    min_dry_bulb_c: float
    max_dry_bulb_c: float
    data_source: str  # EPW | NASA_POWER
    is_extreme_cold_zone: bool
