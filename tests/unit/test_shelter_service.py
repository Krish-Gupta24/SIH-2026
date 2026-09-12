"""Unit tests for ShelterService persistence and deletion integrity."""

import pytest
import json
from pathlib import Path
from backend.services.shelter_service import ShelterService, SHELTERS_DIR, DELETED_SHELTERS_FILE


def test_shelter_service_deletion_and_resurrection_prevention(tmp_path, monkeypatch):
    test_shelters_dir = tmp_path / "shelters"
    test_deleted_file = test_shelters_dir / ".deleted_shelters.json"

    monkeypatch.setattr("backend.services.shelter_service.SHELTERS_DIR", test_shelters_dir)
    monkeypatch.setattr("backend.services.shelter_service.DELETED_SHELTERS_FILE", test_deleted_file)

    service = ShelterService()
    # Canonical shelters seeded
    initial_count = len(service.list_shelters())
    assert initial_count >= 1

    target_id = service.list_shelters()[0]["id"]
    assert service.get_shelter(target_id) is not None

    # Delete target shelter
    result = service.delete_shelter(target_id)
    assert result is True
    assert service.get_shelter(target_id) is None
    assert len(service.list_shelters()) == initial_count - 1

    # Verify deleted tombstones file exists
    assert test_deleted_file.is_file()
    with open(test_deleted_file, "r") as f:
        deleted_list = json.load(f)
    assert target_id in deleted_list

    # Initialize a new service instance (simulating server restart or uvicorn reload)
    new_service = ShelterService()
    # The deleted shelter MUST NOT be re-seeded or resurrected!
    assert new_service.get_shelter(target_id) is None
    assert len(new_service.list_shelters()) == initial_count - 1


def test_shelter_service_idempotent_delete(tmp_path, monkeypatch):
    test_shelters_dir = tmp_path / "shelters"
    test_deleted_file = test_shelters_dir / ".deleted_shelters.json"

    monkeypatch.setattr("backend.services.shelter_service.SHELTERS_DIR", test_shelters_dir)
    monkeypatch.setattr("backend.services.shelter_service.DELETED_SHELTERS_FILE", test_deleted_file)

    service = ShelterService()
    # Deleting a non-existent ID should succeed idempotently
    assert service.delete_shelter("non-existent-shelter-xyz") is True
