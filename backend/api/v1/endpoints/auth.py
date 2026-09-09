"""
Authentication and session management API endpoints.
Provides secure user registration, credential verification, and cryptographic token issuance.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field

from backend.core.security import (
    PasswordHasher,
    TokenManager,
    UserRole,
    get_current_user,
    DEMO_USERS,
)
from backend.core.audit_logger import SecurityAudit

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str = Field(..., description="User corporate/institutional email")
    password: str = Field(..., min_length=8, description="Strong password (minimum 8 characters)")
    full_name: str = Field(..., min_length=2, description="Full name and title")
    role: Optional[str] = Field(default=UserRole.ENGINEER.value, description="Assigned role (viewer, engineer, admin)")


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in_hours: int = 24
    role: str
    full_name: str
    email: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    """Register a new user account with PBKDF2-HMAC-SHA256 password hashing."""
    email_clean = req.email.strip().lower()
    if email_clean in DEMO_USERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Validate role
    role = req.role if req.role in [r.value for r in UserRole] else UserRole.ENGINEER.value

    # Store user
    user_id = f"usr-{len(DEMO_USERS) + 1:03d}"
    hashed = PasswordHasher.hash_password(req.password)
    user_data = {
        "id": user_id,
        "email": email_clean,
        "hashed_password": hashed,
        "full_name": req.full_name,
        "role": role,
        "is_active": True,
    }
    DEMO_USERS[email_clean] = user_data

    # Issue token
    token = TokenManager.create_token(user_id=user_id, email=email_clean, role=role)
    SecurityAudit.log_auth_success(email_clean)

    return TokenResponse(
        access_token=token,
        role=role,
        full_name=req.full_name,
        email=email_clean,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Authenticate user credentials and issue HMAC-SHA256 signed access token."""
    email_clean = req.email.strip().lower()
    user = DEMO_USERS.get(email_clean)

    if not user or not PasswordHasher.verify_password(req.password, user["hashed_password"]):
        SecurityAudit.log_auth_failure(email_clean, reason="Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact system administrator.",
        )

    token = TokenManager.create_token(
        user_id=user["id"],
        email=email_clean,
        role=user["role"],
    )
    SecurityAudit.log_auth_success(email_clean)

    return TokenResponse(
        access_token=token,
        role=user["role"],
        full_name=user["full_name"],
        email=email_clean,
    )


@router.get("/me")
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve identity and claims of currently authenticated caller."""
    email = current_user.get("email")
    user_meta = DEMO_USERS.get(email, {})
    return {
        "id": current_user.get("sub"),
        "email": email,
        "role": current_user.get("role"),
        "full_name": user_meta.get("full_name", "Authenticated Engineer"),
        "is_active": user_meta.get("is_active", True),
    }
