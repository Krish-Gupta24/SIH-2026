"""Unit test suite verifying post-audit platform hardening fixes.

Covers:
1. SimulationJobStore orphan and stale job reaping (crash recovery).
2. SimulationJobStore scratch directory pruning.
3. ShelterService multi-worker cross-process mtime cache synchronization.
4. EnergyPlusIDFGenerator fenestration edge-of-glass frame modeling defaults.
"""

import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest

from backend.simulation.store import (
    SimulationJobStore,
    SimulationStatus,
    SimulationJobRecord,
)
from backend.services.shelter_service import ShelterService, SHELTERS_DIR
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator


class TestSimulationStoreHardening:
    """Verify orphan job reaping and scratch pruning in SimulationJobStore."""

    def test_reap_stale_and_orphaned_jobs(self):
        store = SimulationJobStore()
        now = datetime.now(timezone.utc)

        # 1. Active recent job (< 5 minutes old)
        job_active = store.create_job(
            job_id="sim-active-01",
            shelter_model={"id": "shelter-active"},
            weather_file="test_weather.epw",
        )
        store.update_status(job_id="sim-active-01", status=SimulationStatus.RUNNING)

        # 2. Stale job started 30 minutes ago (orphaned/interrupted)
        job_stale = store.create_job(
            job_id="sim-stale-01",
            shelter_model={"id": "shelter-stale"},
            weather_file="test_weather.epw",
        )
        old_time = (now - timedelta(minutes=30)).isoformat()
        job_stale.status = SimulationStatus.RUNNING
        job_stale.started_at = old_time

        # 3. Already completed job
        job_completed = store.create_job(
            job_id="sim-completed-01",
            shelter_model={"id": "shelter-done"},
            weather_file="test_weather.epw",
        )
        store.update_status(job_id="sim-completed-01", status=SimulationStatus.COMPLETED)

        # Initially 2 active jobs
        assert store.get_active_simulation_count() == 2

        # Run reaper with 15 min threshold (900 seconds)
        reaped = store.reap_stale_or_orphaned_jobs(timeout_threshold_seconds=900)
        assert reaped == 1

        # Stale job is now FAILED with informative explanation
        reaped_record = store.get_job("sim-stale-01")
        assert reaped_record.status == SimulationStatus.FAILED
        assert "interrupted" in reaped_record.error_message.lower()

        # Active job remains untouched and RUNNING
        active_record = store.get_job("sim-active-01")
        assert active_record.status == SimulationStatus.RUNNING

        # Active count drops back to 1
        assert store.get_active_simulation_count() == 1

    def test_prune_old_simulation_workdirs(self, tmp_path):
        store = SimulationJobStore()

        # Create simulated simulation directories
        old_dir = tmp_path / "sim_old_123"
        old_dir.mkdir()
        (old_dir / "in.idf").write_text("old idf", encoding="utf-8")

        new_dir = tmp_path / "sim_new_456"
        new_dir.mkdir()
        (new_dir / "in.idf").write_text("new idf", encoding="utf-8")

        # Artificially age old_dir by setting mtime to 10 days ago
        ten_days_ago = time.time() - (10 * 86400)
        import os
        os.utime(old_dir, (ten_days_ago, ten_days_ago))

        pruned = store.prune_old_simulation_workdirs(storage_dir=str(tmp_path), retention_days=7)
        assert pruned == 1
        assert not old_dir.exists()
        assert new_dir.exists()


class TestShelterServiceMultiWorkerSync:
    """Verify ShelterService detects cross-process disk changes via mtime invalidation."""

    def test_cross_process_file_modification_detection(self, tmp_path, monkeypatch):
        # Point service to temporary test directory
        monkeypatch.setattr("backend.services.shelter_service.SHELTERS_DIR", tmp_path)
        monkeypatch.setattr(
            "backend.services.shelter_service.DELETED_SHELTERS_FILE",
            tmp_path / ".deleted_shelters.json",
        )

        service = ShelterService()

        # Save an initial model
        model = {
            "id": "shelter-mtime-test",
            "name": "Initial Name",
            "geometry": {"length": 6.0, "width": 4.0, "height": 2.8},
        }
        service.save_shelter(model)

        cached = service.get_shelter("shelter-mtime-test")
        assert cached["name"] == "Initial Name"

        # Simulate another worker or external process updating the file on disk
        fp = tmp_path / "shelter-mtime-test.json"
        time.sleep(0.05)  # Ensure distinct filesystem timestamp
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "id": "shelter-mtime-test",
                    "name": "Updated by External Worker",
                    "geometry": {"length": 8.0, "width": 5.0, "height": 3.0},
                },
                f,
                indent=2,
            )

        # Service.get_shelter() should automatically detect updated mtime and return fresh data
        reloaded = service.get_shelter("shelter-mtime-test")
        assert reloaded["name"] == "Updated by External Worker"
        assert reloaded["geometry"]["length"] == 8.0

        # Clean up
        service.delete_shelter("shelter-mtime-test")
        assert service.get_shelter("shelter-mtime-test") is None


class TestFenestrationFrameEmission:
    """Verify EnergyPlus generator emits proper alpine frame properties."""

    def test_window_defaults_to_upvc_insulated_frame(self):
        generator = EnergyPlusIDFGenerator()

        shelter = {
            "id": "shelter-frame-test",
            "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roofType": "Flat", "roofAngle": 0.0},
            "envelope": {
                "walls": {
                    "north": {"layers": [{"materialId": "mat-rammed-earth", "thickness": 0.3}]},
                    "south": {"layers": [{"materialId": "mat-rammed-earth", "thickness": 0.3}]},
                    "east": {"layers": [{"materialId": "mat-rammed-earth", "thickness": 0.3}]},
                    "west": {"layers": [{"materialId": "mat-rammed-earth", "thickness": 0.3}]},
                },
                "roof": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "floor": {"layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
            "windows": [
                {
                    "id": "win-south-01",
                    "wall": "south",
                    "width": 1.6,
                    "height": 1.2,
                    "glazingType": "Double_LowE_Argon",
                    # Note: frameType intentionally omitted to test default behavior
                }
            ],
            "doors": [],
        }

        idf_text = generator.generate(shelter_model=shelter, run_period_days=1)

        # Confirm WindowProperty:FrameAndDivider is emitted
        assert "WindowProperty:FrameAndDivider," in idf_text
        assert "Frame_UPVC_Insulated," in idf_text
        assert "1.10,                           !- Ratio of Frame-Edge Glass Conductance" in idf_text

        # Confirm FenestrationSurface:Detailed links to Frame_UPVC_Insulated
        assert "Frame_UPVC_Insulated,                  !- Frame and Divider Name" in idf_text
