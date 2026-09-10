"""Unit and integration tests for weather data pipeline, validation, and zero-silent-fallback policy."""

import os
import io
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from backend.weather.validator import (
    WeatherValidator,
    WeatherClassification,
    haversine_distance_km,
)
from backend.weather.converter import (
    CSVWeatherConverter,
    ManualWeatherGenerator,
    elevation_to_barometric_pressure_pa,
)
from backend.weather.nasa_power import NASAPowerClient
from backend.simulation.tasks import run_simulation_task
from backend.simulation.store import simulation_store, SimulationStatus
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def test_epw_path() -> Path:
    """Path to the existing test_weather.epw fixture."""
    return Path("simulation/weather/test_weather.epw").resolve()


def test_haversine_distance_calculation():
    """Verify haversine distance calculation between known landmarks."""
    # Leh (34.1526, 77.5771) to Kargil (34.5539, 76.1311) ~ 140 km
    dist = haversine_distance_km(34.1526, 77.5771, 34.5539, 76.1311)
    assert 120.0 < dist < 160.0


def test_barometric_formula_for_high_altitude():
    """Verify barometric pressure calculation matches atmospheric physics at altitude."""
    # Sea level ~ 101325 Pa
    p_0 = elevation_to_barometric_pressure_pa(0.0)
    assert 101000.0 <= p_0 <= 101400.0

    # Leh at 3500m ~ 66000 Pa
    p_leh = elevation_to_barometric_pressure_pa(3500.0)
    assert 64000.0 <= p_leh <= 68000.0

    # Extreme altitude (5400m - Siachen) ~ 51000 Pa
    p_siachen = elevation_to_barometric_pressure_pa(5400.0)
    assert 50000.0 <= p_siachen <= 53000.0


def test_validator_classifies_test_weather_as_test_data(test_epw_path):
    """Verify test_weather.epw is strictly classified as TEST_DATA and flagged."""
    res = WeatherValidator.validate_epw_file(test_epw_path)
    assert res.is_valid is True
    assert res.classification == WeatherClassification.TEST_DATA
    assert res.is_test_data is True
    assert res.header is not None
    assert "Denver" in res.header["city"]
    assert res.file_hash_sha256 != ""
    assert res.records_count > 0


def test_validator_detects_coordinate_divergence(test_epw_path):
    """Verify validator emits warning when model coordinates diverge from EPW location."""
    # test_weather.epw is Denver (39.74°N, 105.18°W). Compare with Leh (34.15°N, 77.58°E)
    res = WeatherValidator.validate_epw_file(
        test_epw_path,
        expected_latitude=34.1526,
        expected_longitude=77.5771,
    )
    assert res.coordinate_delta_km is not None
    assert res.coordinate_delta_km > 5000.0  # Denver to Leh is >10000 km
    assert any("Geographic divergence" in w for w in res.warnings)


def test_validator_rejects_truncated_file(tmp_path):
    """Verify truncated file with insufficient headers is rejected."""
    bad_file = tmp_path / "truncated.epw"
    bad_file.write_text("LOCATION,Bogus,XX,YY\nDATA PERIODS,1\n", encoding="utf-8")

    res = WeatherValidator.validate_epw_file(bad_file)
    assert res.is_valid is False
    assert any("truncated" in e.lower() for e in res.errors)


def test_validator_rejects_negative_solar_radiation(tmp_path, test_epw_path):
    """Verify physical bounds validation catches invalid negative solar radiation."""
    with open(test_epw_path, "r", encoding="utf-8") as f:
        lines = [f.readline() for _ in range(12)]

    # Tamper with row 9 (first data row): set GHI to -50.0
    cols = lines[8].split(",")
    cols[13] = "-50.0"
    lines[8] = ",".join(cols)

    tampered_file = tmp_path / "tampered.epw"
    tampered_file.write_text("".join(lines), encoding="utf-8")

    res = WeatherValidator.validate_epw_file(tampered_file)
    assert res.is_valid is False
    assert any("negative solar irradiance" in e.lower() for e in res.errors)


def test_csv_weather_converter_to_epw(tmp_path):
    """Verify CSV weather converter creates valid, parseable EPW file."""
    csv_content = """month,day,hour,dry_bulb_temp_c,relative_humidity,solar_radiation_wm2,wind_speed_ms
1,1,1,-18.5,45.0,0.0,2.1
1,1,2,-19.0,46.0,0.0,1.8
1,1,12,-5.0,30.0,750.0,3.5
"""
    out_epw = CSVWeatherConverter.convert_csv_to_epw(
        csv_content=csv_content,
        location_name="Kargil Field Post",
        latitude=34.55,
        longitude=76.13,
        elevation_m=2676.0,
        output_dir=tmp_path,
    )

    assert out_epw.is_file()
    res = WeatherValidator.validate_epw_file(out_epw, expected_latitude=34.55, expected_longitude=76.13)
    assert res.is_valid is True
    assert res.header["city"] == "Kargil Field Post"
    assert res.records_count == 3


def test_manual_weather_generator(tmp_path):
    """Verify custom engineering design day generator creates valid USER_DEFINED EPW file."""
    out_epw = ManualWeatherGenerator.generate_custom_weather(
        location_name="Extreme Siachen Stress Test",
        latitude=35.42,
        longitude=77.11,
        elevation_m=5400.0,
        design_winter_min_c=-35.0,
        design_summer_max_c=12.0,
        diurnal_range_c=14.0,
        peak_solar_dni_wm2=900.0,
        num_days=2,
        output_dir=tmp_path,
    )

    assert out_epw.is_file()
    res = WeatherValidator.validate_epw_file(out_epw)
    assert res.is_valid is True
    assert res.classification == WeatherClassification.USER_DEFINED
    assert res.records_count == 48  # 2 days * 24 hours


def test_nasa_power_conversion(tmp_path):
    """Verify NASA POWER JSON converter produces valid EPW with calculated dew point and infrared."""
    mock_nasa_json = {
        "geometry": {"coordinates": [77.58, 34.15, 3500.0]},
        "properties": {
            "parameter": {
                "T2M": {"2023010100": -15.2, "2023010101": -16.0, "2023010112": -4.5},
                "RH2M": {"2023010100": 42.0, "2023010101": 45.0, "2023010112": 25.0},
                "PS": {"2023010100": 66.5, "2023010101": 66.5, "2023010112": 66.4},
                "WS10M": {"2023010100": 2.5, "2023010101": 2.1, "2023010112": 4.2},
                "WD10M": {"2023010100": 240.0, "2023010101": 245.0, "2023010112": 270.0},
                "ALLSKY_SFC_SW_DWN": {"2023010100": 0.0, "2023010101": 0.0, "2023010112": 680.0},
                "ALLSKY_SFC_SW_DNI": {"2023010100": 0.0, "2023010101": 0.0, "2023010112": 820.0},
                "ALLSKY_SFC_SW_DIFF": {"2023010100": 0.0, "2023010101": 0.0, "2023010112": 150.0},
            }
        },
    }

    epw_path = NASAPowerClient.convert_nasa_json_to_epw(
        nasa_data=mock_nasa_json,
        location_name="Leh Outpost",
        elevation_m=3500.0,
        output_dir=tmp_path,
    )

    assert epw_path.is_file()
    res = WeatherValidator.validate_epw_file(epw_path)
    assert res.is_valid is True
    assert res.classification == WeatherClassification.REAL_DATA
    assert res.records_count == 3


def test_tasks_prevent_silent_fallback_on_missing_weather():
    """Verify that a missing weather file FAILS CLEARLY and does NOT silently fall back to test_weather.epw."""
    canonical_shelter = {
        "id": "shelter-test-01",
        "project": {"name": "Test Shelter"},
        "geometry": {"length": 6.0, "width": 4.0, "height": 2.8},
        "location": {"latitude": 34.15, "longitude": 77.58, "elevation": 3500.0},
    }

    # Attempt simulation with completely non-existent weather file
    res = run_simulation_task.apply(
        kwargs={
            "simulation_id": "sim-test-fail",
            "shelter_model": canonical_shelter,
            "weather_file_path": "non_existent_weather_file_404.epw",
        }
    ).result

    assert res["success"] is False
    assert res["status"] == "failed"
    assert "not found" in res["error"].lower()
    assert "silent fallback to test weather is strictly prohibited" in res["error"].lower()


def test_tasks_block_test_data_without_confirmation(test_epw_path):
    """Verify that running with test_weather.epw is blocked unless allow_test_data=True."""
    canonical_shelter = {
        "id": "shelter-test-02",
        "project": {"name": "Test Shelter"},
        "geometry": {"length": 6.0, "width": 4.0, "height": 2.8},
        "location": {"latitude": 34.15, "longitude": 77.58, "elevation": 3500.0},
    }

    # Calling with allow_test_data=False (default) should abort
    res = run_simulation_task.apply(
        kwargs={
            "simulation_id": "sim-test-block",
            "shelter_model": canonical_shelter,
            "weather_file_path": str(test_epw_path),
            "allow_test_data": False,
        }
    ).result

    assert res["success"] is False
    assert res["status"] == "failed"
    assert "classified as test data" in res["error"].lower()


def test_api_blocks_test_data_in_production_request():
    """Verify API endpoint rejects test_weather.epw when allow_test_data is False."""
    client = TestClient(app)

    payload = {
        "shelter_model": {
            "id": "shelter-prod-01",
            "geometry": {"length": 6.0, "width": 4.0, "height": 2.8},
            "location": {"latitude": 34.15, "longitude": 77.58, "elevation": 3500.0},
        },
        "weather_file": "test_weather.epw",
        "allow_test_data": False,
    }

    response = client.post("/api/v1/simulations", json=payload)
    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "SIMULATION BLOCKED" in detail
    assert "TEST DATA" in detail
