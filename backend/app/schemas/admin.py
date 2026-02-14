"""
Schemas for admin endpoints.

Moved from app/routers/admin.py as part of Phase 2 Architecture Cleanup.
"""

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, EmailStr

from app.schemas.property import AllAssumptions


class AdminUserResponse(BaseModel):
    """User response for admin view."""
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_verified: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime]
    saved_properties_count: int = 0

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    """Schema for admin updating a user."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_superuser: Optional[bool] = None


class PlatformStats(BaseModel):
    """Platform statistics."""
    total_users: int
    active_users: int
    total_properties_saved: int
    new_users_30d: int
    verified_users: int
    admin_users: int


class AdminAssumptionsResponse(BaseModel):
    """Response for admin assumption defaults."""
    assumptions: AllAssumptions
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_by_email: Optional[EmailStr] = None


class MetricsGlossaryResponse(BaseModel):
    """Metrics glossary payload."""
    data: Any
