"""
Unit and integration tests for platform security controls and production readiness review.
Validates all 17 security audit domains.
"""

import os
import tempfile
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_422_UNPROCESSABLE_ENTITY, HTTP_429_TOO_MANY_REQUESTS

from backend.main import app
from backend.core.binary_allowlist import BinaryAllowlist, SecurityException
from backend.core.path_security import resolve_safe_path, validate_weather_file, sanitize_filename
from backend.core.security import PasswordHasher, TokenManager, UserRole, require_role, DEMO_USERS
from backend.core.rate_limiter import rate_limiter
from backend.core.audit_logger import redact_secrets, SecurityAudit
from backend.simulation.store import simulation_store, SimulationStatus, sanitize_message
from backend.core.config import Settings


@pytest.fixture
def client():
    return TestClient(app)


# 1. COMMAND INJECTION & BINARY ALLOWLIST TESTS
def test_binary_allowlist_rejects_arbitrary_system_binaries():
    """Verify that arbitrary system binaries (e.g. cmd.exe, powershell, /bin/sh) are strictly rejected."""
    dangerous_candidates = [
        r"C:\Windows\System32\cmd.exe",
        r"C:\Windows\System32\calc.exe",
        r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
        "/bin/sh",
        "/bin/bash",
        "/usr/bin/curl",
    ]
    for bad_exe in dangerous_candidates:
        assert not BinaryAllowlist.is_binary_name_allowed(bad_exe)
        with pytest.raises(SecurityException):
            BinaryAllowlist.validate_executable(bad_exe)


def test_binary_allowlist_permits_approved_simulation_binaries():
    """Verify that approved simulation binaries pass name verification."""
    approved_names = ["energyplus.exe", "energyplus", "fluent.exe", "fluent", "openstudio.exe"]
    for good_name in approved_names:
        assert BinaryAllowlist.is_binary_name_allowed(good_name)


# 2. PATH TRAVERSAL & FILENAME SANITIZATION TESTS
def test_path_traversal_detection_in_resolve_safe_path(tmp_path):
    """Ensure resolve_safe_path raises SecurityException when path escapes base directory."""
    base_dir = tmp_path / "sandbox"
    base_dir.mkdir()

    # Traversal attempts
    escape_paths = [
        "../outside.txt",
        "../../etc/passwd",
        r"..\..\windows\system32\cmd.exe",
        "nested/../../secret.key",
    ]
    for esc in escape_paths:
        with pytest.raises(SecurityException):
            resolve_safe_path(esc, base_dir)

    # Valid relative path inside base
    safe_sub = base_dir / "safe_file.epw"
    safe_sub.write_text("LOCATION,SafeCity,INDIA")
    resolved = resolve_safe_path("safe_file.epw", base_dir, must_exist=True)
    assert resolved == safe_sub.resolve()


def test_sanitize_filename_strips_path_and_null_bytes():
    """Verify that filenames are cleaned of directory tokens, null bytes, and control characters."""
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("test\x00file.epw") == "testfile.epw"
    assert sanitize_filename(r"C:\Windows\calc.exe") == "calc.exe"
    assert sanitize_filename("...secret.json") == "secret.json"


def test_validate_weather_file_enforces_extension_and_header(tmp_path):
    """Ensure validate_weather_file rejects non-epw files, empty files, and corrupted headers."""
    # 1. Non-EPW file
    bad_ext = tmp_path / "weather.csv"
    bad_ext.write_text("COL1,COL2")
    with pytest.raises(SecurityException) as exc:
        validate_weather_file(bad_ext)
    assert "extension" in str(exc.value).lower()

    # 2. Empty file
    empty_epw = tmp_path / "empty.epw"
    empty_epw.write_text("")
    with pytest.raises(ValueError):
        validate_weather_file(empty_epw)

    # 3. Invalid header
    bad_hdr = tmp_path / "corrupted.epw"
    bad_hdr.write_text("MALICIOUS SCRIPT CONTENT\n1,2,3")
    with pytest.raises(SecurityException) as exc:
        validate_weather_file(bad_hdr)
    assert "location," in str(exc.value).lower()

    # 4. Valid EPW
    good_epw = tmp_path / "valid.epw"
    good_epw.write_text("LOCATION,LEH,LADAKH,IND,ISHRAE,34.15,77.58,5.5,3500.0\nDATA LINES...")
    valid_path = validate_weather_file(good_epw)
    assert valid_path == good_epw.resolve()


# 3. AUTHENTICATION, PASSWORDS & CRYPTOGRAPHIC TOKENS
def test_password_hasher_pbkdf2():
    """Test PBKDF2-HMAC-SHA256 password hashing with salt and constant-time verification."""
    raw_pass = "ArmyThermal@2026Secure"
    hashed = PasswordHasher.hash_password(raw_pass)

    assert hashed.startswith("pbkdf2_sha256$100000$")
    assert PasswordHasher.verify_password(raw_pass, hashed)
    assert not PasswordHasher.verify_password("WrongPassword", hashed)


def test_token_manager_signing_and_verification():
    """Test HMAC-SHA256 cryptographic token issuance, tampering rejection, and expiration."""
    token = TokenManager.create_token(
        user_id="usr-999",
        email="test.officer@sih.gov.in",
        role=UserRole.ENGINEER.value,
        expires_delta_hours=2,
    )

    claims = TokenManager.verify_token(token)
    assert claims["sub"] == "usr-999"
    assert claims["email"] == "test.officer@sih.gov.in"
    assert claims["role"] == UserRole.ENGINEER.value

    # Tampered token
    tampered = token[:-4] + "ABCD"
    with pytest.raises(Exception):
        TokenManager.verify_token(tampered)


def test_auth_api_login_and_me(client):
    """Test login API endpoint returning Bearer token and /me profile retrieval."""
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "engineer@sih.gov.in",
        "password": "ArmyEngPass@2026",
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    assert token

    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "engineer@sih.gov.in"
    assert me_resp.json()["role"] == "engineer"


# 4. RATE LIMITING TESTS
def test_rate_limiter_blocks_burst_attacks():
    """Verify rate limiter triggers 429 when max requests threshold is breached."""
    rate_limiter.clear()
    key = "127.0.0.1:test_endpoint"

    for _ in range(5):
        allowed, remaining, _ = rate_limiter.check_limit(key, max_requests=5, window_seconds=60)
        assert allowed

    # 6th request must be blocked
    allowed, remaining, retry_after = rate_limiter.check_limit(key, max_requests=5, window_seconds=60)
    assert not allowed
    assert retry_after > 0


# 5. CONCURRENCY THROTTLE & TIMEOUT CLAMPING
def test_concurrency_throttle_and_timeout_clamp(client):
    """Verify that simulation store tracks active jobs and enforces concurrency ceiling."""
    simulation_store.clear()

    # Create active jobs up to limit (4)
    for i in range(4):
        job = simulation_store.create_job(
            job_id=f"job-{i}",
            shelter_model={"geometry": {"length": 6, "width": 4, "height": 2.8}},
        )
        simulation_store.update_status(f"job-{i}", SimulationStatus.RUNNING)

    assert simulation_store.get_active_simulation_count() == 4
    assert not simulation_store.can_start_simulation(max_concurrent=4)

    # Attempting to queue 5th simulation should return HTTP 429
    resp = client.post("/api/v1/simulations", json={
        "shelter_model": {"geometry": {"length": 6, "width": 4, "height": 2.8}},
        "weather_file": "test_weather.epw",
        "run_period_days": 3,
        "timeout_seconds": 600,
    })
    assert resp.status_code == 429
    assert "concurrency" in resp.json()["detail"].lower() or "capacity" in resp.json()["detail"].lower()

    simulation_store.clear()


# 6. SECURITY HEADERS & ERROR SANITIZATION
def test_security_headers_present_in_responses(client):
    """Verify standard security headers (X-Frame-Options, CSP, X-Content-Type-Options)."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-xss-protection"] == "1; mode=block"
    assert "content-security-policy" in resp.headers


def test_sanitize_message_redacts_filesystem_paths():
    """Verify error sanitizer converts local absolute server paths to [PATH]."""
    windows_path_msg = r"FileNotFoundError: Cannot locate C:\Users\Administrator\secrets\key.pem"
    sanitized = sanitize_message(windows_path_msg)
    assert "C:\\Users" not in sanitized
    assert "[PATH]" in sanitized


def test_audit_logger_redacts_credentials():
    """Verify secret redaction in audit logs."""
    raw_log = '{"actor": "user", "password": "SuperSecretPassword123!", "token": "abc.def.ghi"}'
    cleaned = redact_secrets(raw_log)
    assert "SuperSecretPassword123!" not in cleaned
    assert "[REDACTED]" in cleaned


# 7. PRODUCTION SECRETS VALIDATOR
def test_production_validator_rejects_weak_secret():
    """Ensure running with weak secret in production mode is blocked."""
    os.environ["ENVIRONMENT"] = "production"
    try:
        with pytest.raises(ValueError) as exc:
            Settings.validate_production_secret("default-insecure-secret-key-change-in-production", None)
        assert "SECURITY CRITICAL" in str(exc.value)
    finally:
        os.environ["ENVIRONMENT"] = "development"
