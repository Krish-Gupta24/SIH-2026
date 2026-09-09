"""
Authentication, cryptography, and Role-Based Access Control (RBAC) security layer.
Implements PBKDF2-HMAC-SHA256 password hashing and cryptographically signed session tokens.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.core.config import settings

# HTTP Bearer security scheme
security_bearer = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    """User authorization roles."""
    VIEWER = "viewer"
    ENGINEER = "engineer"
    ADMIN = "admin"


class PasswordHasher:
    """PBKDF2-HMAC-SHA256 password hashing with random 16-byte salt."""

    ITERATIONS = 100_000

    @classmethod
    def hash_password(cls, password: str) -> str:
        """Hash a plaintext password with a unique salt."""
        salt = secrets.token_bytes(16)
        hash_bytes = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            cls.ITERATIONS,
        )
        # Format: pbkdf2_sha256$iterations$salt_b64$hash_b64
        salt_b64 = base64.b64encode(salt).decode("ascii")
        hash_b64 = base64.b64encode(hash_bytes).decode("ascii")
        return f"pbkdf2_sha256${cls.ITERATIONS}${salt_b64}${hash_b64}"

    @classmethod
    def verify_password(cls, password: str, hashed: str) -> bool:
        """Verify a password against its stored hash using constant-time comparison."""
        try:
            parts = hashed.split("$")
            if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
                return False
            iterations = int(parts[1])
            salt = base64.b64decode(parts[2].encode("ascii"))
            expected_hash = base64.b64decode(parts[3].encode("ascii"))

            computed_hash = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt,
                iterations,
            )
            return hmac.compare_digest(computed_hash, expected_hash)
        except Exception:
            return False


class TokenManager:
    """HMAC-SHA256 cryptographically signed token generator and validator."""

    @classmethod
    def create_token(
        cls,
        user_id: str,
        email: str,
        role: str = UserRole.ENGINEER.value,
        expires_delta_hours: int = 24,
    ) -> str:
        """Generate a cryptographically signed token with user identity and claims."""
        now = int(time.time())
        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "iat": now,
            "exp": now + (expires_delta_hours * 3600),
        }
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")

        secret = settings.SECRET_KEY.encode("utf-8")
        signature = hmac.new(secret, payload_b64.encode("ascii"), hashlib.sha256).digest()
        sig_b64 = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")

        return f"{payload_b64}.{sig_b64}"

    @classmethod
    def verify_token(cls, token: str) -> Dict[str, Any]:
        """Verify signature and expiration of a signed token; returns decoded claims."""
        parts = token.split(".")
        if len(parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token structure.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload_b64, sig_b64 = parts

        # Verify signature in constant time
        secret = settings.SECRET_KEY.encode("utf-8")
        expected_sig = hmac.new(secret, payload_b64.encode("ascii"), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("ascii").rstrip("=")

        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Decode payload
        try:
            # Re-pad base64
            padded = payload_b64 + "=" * (-len(payload_b64) % 4)
            payload_json = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
            payload = json.loads(payload_json)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token payload.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check expiration
        now = int(time.time())
        if payload.get("exp", 0) < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload


# In-memory mock user store for authentication when DB is running in local/test mode
DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "engineer@sih.gov.in": {
        "id": "usr-eng-001",
        "email": "engineer@sih.gov.in",
        "hashed_password": PasswordHasher.hash_password("ArmyEngPass@2026"),
        "full_name": "Capt. R. Sharma (MES / SIH)",
        "role": UserRole.ENGINEER.value,
        "is_active": True,
    },
    "admin@sih.gov.in": {
        "id": "usr-adm-001",
        "email": "admin@sih.gov.in",
        "hashed_password": PasswordHasher.hash_password("AdminSecure@2026"),
        "full_name": "Brig. V. Verma (Chief Engineer)",
        "role": UserRole.ADMIN.value,
        "is_active": True,
    },
}


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Dict[str, Any]:
    """FastAPI dependency: require and validate Bearer token, returning active user claims."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenManager.verify_token(credentials.credentials)


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Optional[Dict[str, Any]]:
    """FastAPI dependency: parse Bearer token if provided, but do not reject anonymous requests."""
    if not credentials:
        return None
    try:
        return TokenManager.verify_token(credentials.credentials)
    except HTTPException:
        return None


def require_role(allowed_roles: List[str]):
    """FastAPI dependency factory: enforce role-based access control."""
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", UserRole.VIEWER.value)
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles}, your role is '{user_role}'.",
            )
        return current_user
    return role_checker
