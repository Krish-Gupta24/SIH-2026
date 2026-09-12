"""Tests for the ANSYS FastAPI endpoints (/api/v1/ansys)."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


@pytest.fixture
def valid_shelter_payload():
    return {
        "shelter_model": {
            "id": "alpine-ansys-api-test",
            "project": {
                "name": "Ladakh Forward Outpost",
                "version": "1.0.0",
            },
            "location": {
                "region": "Leh Ladakh",
                "elevation": 3500.0,
                "latitude": 34.1526,
                "longitude": 77.5771,
                "designTempWinter": -20.5,
            },
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 2.8,
                "orientation": 0.0,
            },
            "envelope": {
                "walls": {
                    "north": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                    "south": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                    "east": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                    "west": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                }
            },
            "internalLoads": {
                "occupantsCount": 2,
                "activityLevelWatts": 90.0,
                "equipmentPowerWatts": 200.0,
            },
        }
    }


def test_ansys_status_endpoint():
    """Verify GET /api/v1/ansys/status returns honest environment metrics."""
    res = client.get("/api/v1/ansys/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_installed" in data
    assert "license_configured" in data
    assert "supported_versions" in data


def test_ansys_export_endpoint(valid_shelter_payload):
    """Verify POST /api/v1/ansys/export generates complete Fluent & MAPDL code."""
    res = client.post("/api/v1/ansys/export", json=valid_shelter_payload)
    assert res.status_code == 200
    data = res.json()
    assert "files" in data
    assert "fluent_setup.jou" in data["files"]
    assert "mapdl_thermal.mac" in data["files"]
    assert "boundary_manifest.json" in data["files"]
    assert "/define/models/radiation/discrete-ordinates" in data["files"]["fluent_setup.jou"]
    assert "SOLID70" in data["files"]["mapdl_thermal.mac"]


def test_ansys_download_zip_endpoint(valid_shelter_payload):
    """Verify POST /api/v1/ansys/download streams a valid zip archive."""
    res = client.post("/api/v1/ansys/download", json=valid_shelter_payload)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in res.headers["content-disposition"]
    assert len(res.content) > 500  # valid zip archive has non-trivial bytes
