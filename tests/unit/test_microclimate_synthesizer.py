"""Unit tests for Physics-Informed ML High-Altitude Microclimate Weather Synthesizer."""

import pytest
from pathlib import Path

from backend.weather.microclimate_synthesizer import (
    PhysicsInformedMicroclimateSynthesizer,
    isa_barometric_pressure,
    solar_zenith_and_elevation,
    STANDARD_SEA_LEVEL_PRESSURE_PA,
)
from backend.weather.validator import WeatherValidator, WeatherClassification


def test_isa_barometric_pressure_drop():
    """Verify atmospheric pressure correctly diminishes with altitude according to ISA standard."""
    p_0 = isa_barometric_pressure(0.0)
    assert p_0 == pytest.approx(STANDARD_SEA_LEVEL_PRESSURE_PA, rel=0.01)

    p_leh = isa_barometric_pressure(3500.0)
    # At 3,500m pressure is approx 67.4 kPa (67,400 Pa)
    assert 65000.0 < p_leh < 70000.0

    p_siachen = isa_barometric_pressure(5400.0)
    # At 5,400m (Siachen) pressure plunges to ~50-52 kPa
    assert 48000.0 < p_siachen < 53000.0
    assert p_siachen < p_leh

    p_everest = isa_barometric_pressure(8848.0)
    assert 30000.0 < p_everest < 34000.0


def test_solar_zenith_and_horizon_shadowing():
    """Test solar geometry and terrain valley horizon shadow casting."""
    zenith, elev = solar_zenith_and_elevation(doy=172, hour=12.0, latitude_deg=34.15, longitude_deg=77.58)
    assert elev > 60.0
    assert zenith < 30.0

    # Test horizon shadow: if horizon angle is 30° and sun is at 20°, DNI should be 0
    dni, dhi, ghi = PhysicsInformedMicroclimateSynthesizer.apply_solar_transmittance_scaling(
        dni_base=800.0,
        dhi_base=150.0,
        target_elev_m=4800.0,
        base_elev_m=3500.0,
        solar_elev_deg=20.0,
        horizon_shadow_angle_deg=30.0,  # Steep Himalayan gorge shadow
    )
    assert dni == 0.0
    assert ghi == dhi
    assert dhi > 0.0

    # If sun is above mountain ridge (40° > 30°), direct beam is transmitted and boosted
    dni_sun, dhi_sun, ghi_sun = PhysicsInformedMicroclimateSynthesizer.apply_solar_transmittance_scaling(
        dni_base=800.0,
        dhi_base=150.0,
        target_elev_m=5400.0,
        base_elev_m=3500.0,
        solar_elev_deg=45.0,
        horizon_shadow_angle_deg=30.0,
    )
    assert dni_sun > 800.0  # Thin atmosphere direct beam amplification
    assert ghi_sun > dni_sun * 0.5


def test_diurnal_lapse_rate_modulation():
    """Verify diurnal lapse rate responds to solar convection and night radiation."""
    day_lapse = PhysicsInformedMicroclimateSynthesizer.calculate_diurnal_lapse_rate(
        hour=13, month=6, solar_elev_deg=65.0
    )
    night_lapse = PhysicsInformedMicroclimateSynthesizer.calculate_diurnal_lapse_rate(
        hour=2, month=6, solar_elev_deg=-30.0
    )
    # Daytime solar convection steepens lapse rate closer to dry adiabatic rate
    assert day_lapse > night_lapse
    assert 0.0070 < day_lapse < 0.0105
    assert 0.0050 < night_lapse < 0.0070


def test_synthesize_siachen_glacier_epw(tmp_path: Path):
    """Synthesize full 8,760-hour EPW for Siachen Glacier at 5,400m and validate physics."""
    res = PhysicsInformedMicroclimateSynthesizer.synthesize_8760h_epw(
        target_latitude=35.42,
        target_longitude=77.11,
        target_elevation_m=5400.0,
        location_name="Siachen Glacier Forward Post",
        horizon_shadow_angle_deg=15.0,
        output_dir=tmp_path,
    )

    assert res["status"] == "SUCCESS"
    assert res["records_count"] == 8760
    assert res["elevation_m"] == 5400.0
    assert res["surface_pressure_hpa"] < 530.0  # Deep pressure drop
    # Extreme cold: Siachen winter temperature should plunge below -30°C
    assert res["min_temperature_c"] < -32.0
    assert res["validation"]["is_valid"] is True

    epw_file = tmp_path / res["epw_file"]
    assert epw_file.is_file()
    assert epw_file.stat().st_size > 1_000_000  # Valid 8,760-hour dataset


def test_api_microclimate_synthesize_endpoint():
    """Test POST /api/v1/weather/microclimate-synthesize through FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)
    payload = {
        "target_latitude": 35.42,
        "target_longitude": 77.11,
        "target_elevation_m": 5400.0,
        "location_name": "Siachen Glacier Outpost",
        "horizon_shadow_angle_deg": 20.0,
    }
    resp = client.post("/api/v1/weather/microclimate-synthesize", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["records_count"] == 8760
    assert "MICROCLIMATE_Siachen_Glacier_Outpost_5400m_8760h.epw" in data["epw_file"]
    assert data["surface_pressure_hpa"] < 530.0
    assert data["min_temperature_c"] < -30.0


def test_api_geocode_and_reverse_geocode_endpoints():
    """Test GET /api/v1/weather/geocode and GET /api/v1/weather/reverse-geocode."""
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)

    # Empty / short query returns empty list gracefully
    resp_empty = client.get("/api/v1/weather/geocode?query=a")
    assert resp_empty.status_code == 200
    assert resp_empty.json() == []

    # Valid reverse geocode endpoint
    resp_rev = client.get("/api/v1/weather/reverse-geocode?latitude=34.1526&longitude=77.5771")
    assert resp_rev.status_code == 200
    data_rev = resp_rev.json()
    assert "elevation_m" in data_rev
    assert data_rev["latitude"] == pytest.approx(34.1526)
    assert data_rev["longitude"] == pytest.approx(77.5771)

