"""
Authentication schemas for registration, login, MFA, sessions, and tokens.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re
import uuid


# -----------------------------------------------------------------------
# Password validator mixin
# -----------------------------------------------------------------------

def _validate_password_strength(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", v):
        raise ValueError("Password must contain at least one special character")
    return v


# -----------------------------------------------------------------------
# Registration
# -----------------------------------------------------------------------

class UserRegister(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()


# -----------------------------------------------------------------------
# Login
# -----------------------------------------------------------------------

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    """Returned after a successful login (or after MFA if enabled)."""
    user: "UserResponse"
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class MFAChallengeResponse(BaseModel):
    """Returned when MFA is required before completing login."""
    mfa_required: bool = True
    challenge_token: str


class MFAVerifyRequest(BaseModel):
    challenge_token: str
    totp_code: str = Field(..., min_length=6, max_length=6)
    remember_me: bool = False


# -----------------------------------------------------------------------
# Token / Session
# -----------------------------------------------------------------------

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ...",
                "refresh_token": "abc...",
                "token_type": "bearer",
                "expires_in": 300,
            }
        }


class TokenPayload(BaseModel):
    sub: str
    sid: Optional[str] = None
    exp: datetime
    type: str
    iat: Optional[datetime] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# -----------------------------------------------------------------------
# Password management
# -----------------------------------------------------------------------

class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


# -----------------------------------------------------------------------
# Email verification
# -----------------------------------------------------------------------

class EmailVerification(BaseModel):
    token: str


# -----------------------------------------------------------------------
# MFA setup
# -----------------------------------------------------------------------

class MFASetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class MFAConfirmRequest(BaseModel):
    totp_code: str = Field(..., min_length=6, max_length=6)


# -----------------------------------------------------------------------
# Sessions
# -----------------------------------------------------------------------

class SessionInfo(BaseModel):
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_name: Optional[str] = None
    last_active_at: datetime
    created_at: datetime
    is_current: bool = False

    class Config:
        from_attributes = True


# -----------------------------------------------------------------------
# User response (shared)
# -----------------------------------------------------------------------

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool = False
    mfa_enabled: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None
    has_profile: bool = False
    onboarding_completed: bool = False
    roles: List[str] = []
    permissions: List[str] = []

    class Config:
        from_attributes = True


# -----------------------------------------------------------------------
# Generic message
# -----------------------------------------------------------------------

class AuthMessage(BaseModel):
    message: str
    success: bool = True


# Resolve forward reference
LoginResponse.model_rebuild()
