"""
Authentication schemas for registration, login, and token management.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re


class UserRegister(BaseModel):
    """Schema for user registration."""
    
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=100,
        description="Password (min 8 chars, must include uppercase and digit)"
    )
    full_name: str = Field(
        ..., 
        min_length=2, 
        max_length=100,
        description="User's full name"
    )
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v
    
    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Clean and validate name."""
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    remember_me: bool = Field(
        default=False, 
        description="If true, extends token expiration"
    )


class TokenResponse(BaseModel):
    """Schema for token response after login."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token for renewal")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }


class TokenPayload(BaseModel):
    """Schema for decoded JWT token payload."""
    
    sub: str = Field(..., description="Subject (user ID)")
    exp: datetime = Field(..., description="Expiration time")
    type: str = Field(..., description="Token type: access or refresh")
    iat: Optional[datetime] = Field(None, description="Issued at time")


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""
    
    refresh_token: str = Field(..., description="Refresh token to exchange")


class PasswordReset(BaseModel):
    """Schema for password reset request."""
    
    email: EmailStr = Field(..., description="Email address for password reset")


class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset with new password."""
    
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(
        ..., 
        min_length=8, 
        max_length=100,
        description="New password"
    )
    
    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class PasswordChange(BaseModel):
    """Schema for changing password while logged in."""
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., 
        min_length=8, 
        max_length=100,
        description="New password"
    )
    
    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class EmailVerification(BaseModel):
    """Schema for email verification."""
    
    token: str = Field(..., description="Verification token from email")


class AuthMessage(BaseModel):
    """Generic message response for auth operations."""
    
    message: str = Field(..., description="Status message")
    success: bool = Field(default=True, description="Operation success status")

