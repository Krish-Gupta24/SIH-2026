from typing import List, Dict, Any
from fastapi import APIRouter

router = APIRouter()

AVAILABLE_WEATHER_SOURCES = [
    {
        "id": "wx-leh-airport",
        "name": "Leh Airport Station (3500m)",
        "region": "Leh, Ladakh, India",
        "latitude": 34.1526,
        "longitude": 77.5771,
        "elevation_m": 3500.0,
        "climate_zone": "Cold / Extreme Alpine (ASHRAE 8)",
        "source_type": "EPW",
        "design_winter_min_c": -20.5,
        "design_summer_max_c": 28.0,
        "epw_file": "test_weather.epw",
    },
    {
        "id": "wx-kargil-outpost",
        "name": "Kargil Outpost Meteorological Station",
        "region": "Kargil, Ladakh, India",
        "latitude": 34.5539,
        "longitude": 76.1311,
        "elevation_m": 2676.0,
        "climate_zone": "Extreme Cold Continental",
        "source_type": "EPW",
        "design_winter_min_c": -24.0,
        "design_summer_max_c": 29.5,
        "epw_file": "test_weather.epw",
    },
    {
        "id": "wx-dras-valley",
        "name": "Dras Valley Extreme Meteorological Station",
        "region": "Dras, Ladakh, India",
        "latitude": 34.4294,
        "longitude": 75.7547,
        "elevation_m": 3280.0,
        "climate_zone": "Sub-Arctic Mountain / Extreme Alpine",
        "source_type": "EPW",
        "design_winter_min_c": -32.0,
        "design_summer_max_c": 22.0,
        "epw_file": "test_weather.epw",
    },
]


@router.get("/")
async def list_weather_sources() -> List[Dict[str, Any]]:
    """List available weather files and climate datasets."""
    return AVAILABLE_WEATHER_SOURCES
