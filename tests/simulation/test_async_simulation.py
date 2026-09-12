"""Tests for asynchronous simulation execution using Celery, Redis task pipeline, and FastAPI endpoints."""

import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.celery_app import celery_app
from backend.simulation.store import simulation_store, SimulationStatus
from backend.simulation.tasks import run_simulation_task
from simulation.runners.energyplus_runner import SimulationExecutionOutput, EnergyPlusRunner


class TestAsyncSimulationWorkflow(unittest.TestCase):
    """Test suite verifying asynchronous simulation workflow, statuses, timeouts, and API endpoints."""

    def setUp(self):
        # Configure Celery in eager mode for deterministic synchronous execution in tests
        celery_app.conf.update(
            task_always_eager=True,
            task_eager_propagates=True,
        )
        self.client = TestClient(app)
        simulation_store.clear()

        self.valid_shelter = {
            "id": "async-shelter-01",
            "name": "Async Test Shelter",
            "version": "1.0.0",
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 3.0,
                "roof_type": "Flat",
                "roof_angle": 0.0,
            },
            "location": {
                "latitude": 34.15,
                "longitude": 77.58,
                "elevation": 3500.0,
                "region": "Leh_Ladakh_IND",
            },
        }
        self.weather_file = "simulation/weather/test_weather.epw"

    @unittest.skipUnless(EnergyPlusRunner().is_available, "EnergyPlus binary not available on host machine")
    def test_01_successful_simulation_workflow(self):
        """Verify full lifecycle: POST /simulate -> queued -> preparing -> running -> parsing -> completed."""
        payload = {
            "shelter_model": self.valid_shelter,
            "weather_file": self.weather_file,
            "run_period_days": 1,
            "timeout_seconds": 60,
            "allow_test_data": True,
        }

        # 1. Dispatch through direct /simulate endpoint
        response = self.client.post("/simulate", json=payload)
        self.assertEqual(response.status_code, 202)
        data = response.json()
        self.assertIn("simulation_id", data)
        sim_id = data["simulation_id"]

        # Because Celery is in eager mode, the task ran synchronously during dispatch
        # 2. Check status
        status_resp = self.client.get(f"/api/simulations/{sim_id}")
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.json()
        self.assertEqual(status_data["status"], "completed")
        self.assertEqual(status_data["exit_code"], 0)
        self.assertTrue(status_data["has_results"])
        self.assertIsNotNone(status_data["duration_seconds"])

        # 3. Retrieve normalized results
        results_resp = self.client.get(f"/api/simulations/{sim_id}/results")
        self.assertEqual(results_resp.status_code, 200)
        results = results_resp.json()

        # Verify canonical schema keys
        self.assertIn("indoor_temperature", results)
        self.assertIn("outdoor_temperature", results)
        self.assertIn("wall_heat_transfer", results)
        self.assertIn("comfort", results)
        self.assertIn("energy", results)
        self.assertEqual(len(results["indoor_temperature"]), 24)

        # 4. Verify no server filesystem path leakage in results or status
        def assert_no_path_leakage(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    self.assertNotIn("c:\\users", str(k).lower())
                    self.assertNotIn("c:/users", str(k).lower())
                    assert_no_path_leakage(v)
            elif isinstance(obj, list):
                for item in obj:
                    assert_no_path_leakage(item)
            elif isinstance(obj, str):
                self.assertNotIn("c:\\users", obj.lower())
                self.assertNotIn("c:/users", obj.lower())

        assert_no_path_leakage(status_data)
        assert_no_path_leakage(results)

    def test_02_failed_simulation_handling(self):
        """Verify handling of simulation failure due to engine/model error."""
        # Create an invalid model that causes EnergyPlus to fail (e.g. invalid negative coordinate or unparseable geometry)
        invalid_shelter = {
            "id": "invalid-shelter",
            "name": "Invalid Shelter",
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 3.0,
                "roof_type": "UnsupportedRoofType",
                "roof_angle": 20.0,
            },
        }

        payload = {
            "shelter_model": invalid_shelter,
            "weather_file": self.weather_file,
            "run_period_days": 1,
            "allow_test_data": True,
        }

        response = self.client.post("/simulate", json=payload)
        self.assertEqual(response.status_code, 202)
        sim_id = response.json()["simulation_id"]

        # Status should be FAILED
        status_resp = self.client.get(f"/api/simulations/{sim_id}")
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.json()
        self.assertEqual(status_data["status"], "failed")
        self.assertIsNotNone(status_data["error_message"])

        # Error message must be sanitized (no local paths)
        self.assertNotIn("c:\\users", status_data["error_message"].lower())

        # Attempting to fetch results on failed run returns 400 Bad Request
        results_resp = self.client.get(f"/api/simulations/{sim_id}/results")
        self.assertEqual(results_resp.status_code, 400)
        self.assertIn("failed", results_resp.json()["detail"].lower())

    def test_03_simulation_timeout_handling(self):
        """Verify timeout handling when simulation execution exceeds allocated limit."""
        # Mock EnergyPlusRunner.run to simulate a timeout condition
        with patch("backend.simulation.tasks.EnergyPlusRunner.run") as mock_run:
            mock_run.return_value = SimulationExecutionOutput(
                exit_code=-99,
                duration_seconds=5.0,
                command_executed="energyplus -w ...",
                engine_name="EnergyPlus",
                engine_version="24.1.0",
                work_dir="/fake/work_dir",
                idf_path="/fake/in.idf",
                epw_path="/fake/weather.epw",
                stdout="Simulated timeout output",
                stderr="Simulation timed out after 5 seconds.",
                stdout_log_path="/fake/stdout.log",
                stderr_log_path="/fake/stderr.log",
                err_file_path="/fake/eplusout.err",
                csv_file_path="/fake/eplusout.csv",
            )

            payload = {
                "shelter_model": self.valid_shelter,
                "weather_file": self.weather_file,
                "run_period_days": 1,
                "timeout_seconds": 5,
                "allow_test_data": True,
            }

            response = self.client.post("/simulate", json=payload)
            self.assertEqual(response.status_code, 202)
            sim_id = response.json()["simulation_id"]

            status_resp = self.client.get(f"/api/simulations/{sim_id}")
            self.assertEqual(status_resp.status_code, 200)
            status_data = status_resp.json()
            self.assertEqual(status_data["status"], "failed")
            self.assertIn("timed out after 5 seconds", status_data["error_message"].lower())

    def test_04_simulation_cancellation(self):
        """Verify cancellation of an active/queued simulation."""
        # Register a queued simulation manually in store
        sim_id = "test-cancel-id-123"
        simulation_store.create_job(
            job_id=sim_id,
            shelter_model=self.valid_shelter,
            weather_file=self.weather_file,
        )

        cancel_resp = self.client.post(f"/api/simulations/{sim_id}/cancel")
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(cancel_resp.json()["status"], "cancelled")

        # Results request on cancelled job should return 400
        res_resp = self.client.get(f"/api/simulations/{sim_id}/results")
        self.assertEqual(res_resp.status_code, 400)
        self.assertIn("cancelled", res_resp.json()["detail"].lower())

    def test_05_conflict_when_results_requested_prematurely(self):
        """Verify 409 Conflict if results are requested while job is still in progress."""
        sim_id = "test-running-job-456"
        simulation_store.create_job(
            job_id=sim_id,
            shelter_model=self.valid_shelter,
            weather_file=self.weather_file,
        )
        simulation_store.update_status(sim_id, SimulationStatus.RUNNING)

        res_resp = self.client.get(f"/api/simulations/{sim_id}/results")
        self.assertEqual(res_resp.status_code, 409)
        self.assertIn("not ready", res_resp.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
