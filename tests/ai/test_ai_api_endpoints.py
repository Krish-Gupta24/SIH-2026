"""Integration tests for AI Generative Design FastAPI endpoints."""

import time
import pytest
from fastapi.testclient import TestClient

from backend.main import create_application
from backend.ai.service import AIDesignService


@pytest.fixture(scope="module")
def client():
    app = create_application()
    with TestClient(app) as test_client:
        yield test_client


def test_get_model_status_endpoint(client):
    """Verify /api/v1/ai/models/status returns structured status."""
    response = client.get("/api/v1/ai/models/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_surrogate_available" in data
    assert isinstance(data["is_surrogate_available"], bool)


def test_list_models_endpoint(client):
    """Verify /api/v1/ai/models lists models."""
    response = client.get("/api/v1/ai/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert isinstance(data["models"], list)


def test_generate_designs_and_poll_job(client):
    """Verify submitting a generative design search job, polling its progress, and retrieving candidates."""
    payload = {
        "weather_id": "leh_ladakh_tmyx",
        "target_indoor_min_c": 12.0,
        "max_envelope_mass_kg": None,
        "optimization_mode": "BALANCED",
        "population_size": 20,
        "generations": 5,
        "occupants": 4,
    }

    # 1. Submit job
    res = client.post("/api/v1/ai/design/generate", json=payload)
    assert res.status_code == 202
    job_data = res.json()
    assert "job_id" in job_data
    job_id = job_data["job_id"]

    # 2. Poll until completed (timeout after 15s)
    start_time = time.time()
    completed = False
    while time.time() - start_time < 15.0:
        status_res = client.get(f"/api/v1/ai/design/jobs/{job_id}")
        assert status_res.status_code == 200
        current_status = status_res.json()
        if current_status["status"] in ("COMPLETED", "FAILED"):
            completed = True
            break
        time.sleep(0.3)

    assert completed, "Job did not complete within timeout"
    assert current_status["status"] == "COMPLETED"
    assert current_status["candidates_count"] > 0

    # 3. Retrieve candidates
    cand_res = client.get(f"/api/v1/ai/design/candidates/{job_id}")
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    assert len(candidates) > 0

    top_candidate = candidates[0]
    assert "candidate_id" in top_candidate
    assert "parameters" in top_candidate
    assert "surrogate_predictions" in top_candidate
    assert "uncertainty_margin_c" in top_candidate

    # 4. Test explain candidate endpoint
    explain_payload = {
        "candidate": top_candidate,
        "target_name": "winter_indoor_min_c",
        "top_k": 4,
    }
    explain_res = client.post("/api/v1/ai/design/explain", json=explain_payload)
    assert explain_res.status_code == 200
    shap_data = explain_res.json()
    assert "target_name" in shap_data
    assert "predicted_value" in shap_data
    assert "top_contributors" in shap_data

    # 5. Test apply candidate to 3D designer format
    apply_res = client.post("/api/v1/ai/design/apply", json=top_candidate)
    assert apply_res.status_code == 200
    apply_data = apply_res.json()
    assert apply_data.get("success") is True
    shelter = apply_data.get("shelter_model")
    assert "geometry" in shelter
    assert "envelope" in shelter
    assert "windows" in shelter
    assert "doors" in shelter
