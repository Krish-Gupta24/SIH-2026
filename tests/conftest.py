"""Root pytest fixtures and configuration."""

import pytest
import sys
from pathlib import Path

# Ensure root directory is on python path for test execution
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


@pytest.fixture
def sample_shelter_data():
    """Returns valid baseline shelter dictionary for testing."""
    return {
        "id": "shelter-test-01",
        "name": "Test Ladakh Outpost",
        "tags": ["test", "high-altitude"],
        "version": "1.0.0",
        "location": {
            "latitude": 34.1526,
            "longitude": 77.5771,
            "elevation": 3500.0,
            "region": "Ladakh",
            "climate_zone": "Cold",
            "weather_source": "IND_Ladakh.Leh.420270_ISHRAE.epw"
        },
        "geometry": {
            "shape": "Rectangle",
            "length": 6.0,
            "width": 4.0,
            "height": 2.8,
            "orientation": 0.0,
            "roof_type": "Shed",
            "roof_angle": 15.0,
            "floor_elevation": 0.3
        }
    }
