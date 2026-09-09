"""Integration tests covering FastAPI endpoints for the SIH 2026 Thermal System."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_api_health_endpoint():
    """Verify GET /api/v1/health/."""
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_api_materials_endpoint():
    """Verify GET /api/v1/materials/ returns verified materials list."""
    response = client.get("/api/v1/materials/")
    assert response.status_code == 200
    materials = response.json()
    assert isinstance(materials, list)
    assert len(materials) >= 4

    # Verify canonical physical materials exist
    mat_ids = [m["id"] for m in materials]
    assert "mat-eps-insulation" in mat_ids
    assert "mat-rammed-earth" in mat_ids
    assert "mat-concrete-slab" in mat_ids

    # Check physics properties exist
    eps = next(m for m in materials if m["id"] == "mat-eps-insulation")
    assert eps["thermal_conductivity"] == 0.035
    assert eps["density"] == 25.0
    assert eps["status"] == "verified"


def test_api_weather_endpoint():
    """Verify GET /api/v1/weather/ returns available climate datasets."""
    response = client.get("/api/v1/weather/")
    assert response.status_code == 200
    datasets = response.json()
    assert isinstance(datasets, list)
    assert len(datasets) >= 1

    regions = [d["region"] for d in datasets]
    assert any("Leh" in r for r in regions)


def test_api_optimization_metadata():
    """Verify GET /api/v1/optimization/parameters and /objectives."""
    res_params = client.get("/api/v1/optimization/parameters")
    assert res_params.status_code == 200
    params_data = res_params.json()
    assert "parameters" in params_data
    assert "orientation" in params_data["parameters"]
    assert "insulation_thickness" in params_data["parameters"]

    res_objs = client.get("/api/v1/optimization/objectives")
    assert res_objs.status_code == 200
    objs_data = res_objs.json()
    assert "objectives" in objs_data
    obj_ids = [o["id"] for o in objs_data["objectives"]]
    assert "maximize_comfort" in obj_ids
    assert "minimize_heat_loss" in obj_ids


def test_api_report_compilation_and_pdf(sample_shelter_data):
    """Verify POST /api/v1/reports/compile and /export/pdf."""
    payload = {
        "shelter_model": sample_shelter_data,
        "simulation_result": {
            "summary": {
                "indoor_min_c": 6.5,
                "indoor_max_c": 21.0,
                "indoor_mean_c": 14.2,
                "comfort_hours_percent": 82.5,
                "annual_heating_demand_kwh_m2": 45.0,
            },
            "hourly_timeseries": [],
            "metadata": {
                "simulation_engine": "EnergyPlus 24.1.0",
                "weather_file": "test_weather.epw",
            },
        },
    }

    # 1. Compile 24-section report
    res_compile = client.post("/api/v1/reports/compile", json=payload)
    assert res_compile.status_code == 200
    report = res_compile.json()
    assert "report_metadata" in report
    assert "sections" in report
    assert len(report["sections"]) == 24

    # Verify preserved metadata
    assert "preserved" in report["report_metadata"]
    assert "simulation_engine" in report["report_metadata"]["preserved"]

    # 2. Export PDF
    res_pdf = client.post("/api/v1/reports/export/pdf", json=payload)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF")
