"""Weather processing and EPW dataset manager for simulation engines."""

from typing import Dict, Any, Optional


class EPWManager:
    """Manages EnergyPlus Weather (EPW) files, location headers, and hourly timeseries."""

    @staticmethod
    def get_weather_file_path(location_name: str) -> Optional[str]:
        """Locate verified EPW file for a specific location."""
        return None
