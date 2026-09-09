"""Unit tests for Pydantic schema validation."""

import pytest
from backend.schemas.shelter import ShelterModelSchema


def test_shelter_schema_validation(sample_shelter_data):
    """Verify that a valid shelter dictionary parses into ShelterModelSchema."""
    model = ShelterModelSchema(**sample_shelter_data)
    assert model.id == "shelter-test-01"
    assert model.location.elevation == 3500.0
    assert model.geometry.length == 6.0


def test_invalid_negative_dimensions():
    """Verify that negative geometry length fails validation."""
    with pytest.raises(Exception):
        ShelterModelSchema(
            id="bad-01",
            name="Invalid",
            location={
                "latitude": 34.0,
                "longitude": 77.0,
                "elevation": 3000.0,
                "region": "Ladakh",
                "climate_zone": "Cold",
                "weather_source": "test.epw"
            },
            geometry={
                "shape": "Rectangle",
                "length": -5.0,  # Negative dimension is physically invalid
                "width": 4.0,
                "height": 2.8,
                "orientation": 0.0,
                "roof_type": "Flat",
                "roof_angle": 0.0,
                "floor_elevation": 0.0
            }
        )
