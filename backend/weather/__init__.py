"""Weather and microclimate data integration package (EPW, CSV, NASA POWER, User-Defined)."""

from backend.weather.validator import (
    WeatherValidator,
    WeatherValidationResult,
    WeatherClassification,
    WeatherLocationHeader,
    haversine_distance_km,
)
from backend.weather.nasa_power import NASAPowerClient
from backend.weather.open_meteo import OpenMeteoClient
from backend.weather.converter import CSVWeatherConverter, ManualWeatherGenerator
from backend.weather.microclimate_synthesizer import PhysicsInformedMicroclimateSynthesizer

__all__ = [
    "WeatherValidator",
    "WeatherValidationResult",
    "WeatherClassification",
    "WeatherLocationHeader",
    "haversine_distance_km",
    "NASAPowerClient",
    "OpenMeteoClient",
    "CSVWeatherConverter",
    "ManualWeatherGenerator",
    "PhysicsInformedMicroclimateSynthesizer",
]
