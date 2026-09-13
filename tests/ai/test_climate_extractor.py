"""Tests for EPW climate feature extraction and weather provenance validation."""

from pathlib import Path
import pytest
from backend.ai.climate_extractor import EPWClimateExtractor


WEATHER_DIR = Path("storage/weather")


def test_verified_weather_provenance():
    """Verify that canonical Himalayan stations are marked verified."""
    leh_epw = WEATHER_DIR / "IND_JK_Leh.427053_TMYx.epw"
    if not leh_epw.exists():
        pytest.skip(f"Weather file {leh_epw} not found")

    prov = EPWClimateExtractor.extract_provenance(leh_epw)
    assert prov.is_verified_high_altitude is True
    assert prov.elevation_m >= 3000.0
    assert prov.quarantine_reason is None
    assert len(prov.sha256_hash) == 64


def test_quarantined_weather_detection():
    """Verify that test_weather.epw (Denver, CO) is identified and quarantined."""
    test_epw = WEATHER_DIR / "test_weather.epw"
    if not test_epw.exists():
        pytest.skip(f"Weather file {test_epw} not found")

    prov = EPWClimateExtractor.extract_provenance(test_epw)
    assert prov.is_verified_high_altitude is False
    assert prov.quarantine_reason is not None
    assert "Denver" in prov.location_name or "Denver" in prov.quarantine_reason

    # Feature extraction on quarantined file must raise ValueError
    with pytest.raises(ValueError, match="quarantined"):
        EPWClimateExtractor.extract_features(test_epw)


def test_physical_climate_features_extraction():
    """Verify that physical features extracted from a verified station are physically sound."""
    dras_epw = WEATHER_DIR / "dras_kargil.epw"
    if not dras_epw.exists():
        pytest.skip(f"Weather file {dras_epw} not found")

    features, prov = EPWClimateExtractor.extract_features(dras_epw)
    assert prov.is_verified_high_altitude is True

    # Dras is one of the coldest inhabited places in the world
    assert features.elevation_m > 3000.0
    assert features.winter_temp_min_c < -10.0  # Cold winter
    assert features.outdoor_temp_diurnal_range_c > 5.0  # High alpine diurnal swing
    assert features.global_horizontal_solar_mean_w_m2 > 50.0
    assert features.heating_degree_days_base18 > 2000.0

    feat_vec = features.to_feature_vector()
    assert len(feat_vec) == 14
    assert all(isinstance(v, (int, float)) for v in feat_vec)
