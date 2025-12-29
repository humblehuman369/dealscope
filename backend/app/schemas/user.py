"""
User and UserProfile schemas for API responses and updates.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ExperienceLevel(str, Enum):
    """Investment experience levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class RiskTolerance(str, Enum):
    """Risk tolerance levels."""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


# ===========================================
# User Schemas
# ===========================================

class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user (internal use)."""
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user info."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user response (public info)."""
    id: str
    email: EmailStr
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_verified: bool
    is_superuser: bool = False
    created_at: datetime
    last_login: Optional[datetime]
    
    # Include profile summary
    has_profile: bool = False
    onboarding_completed: bool = False
    
    class Config:
        from_attributes = True


class UserWithProfile(UserResponse):
    """User response including full profile."""
    profile: Optional["UserProfileResponse"] = None


# ===========================================
# User Profile Schemas
# ===========================================

class UserProfileBase(BaseModel):
    """Base profile fields."""
    investment_experience: Optional[ExperienceLevel] = None
    preferred_strategies: Optional[List[str]] = Field(
        default=None,
        description="List of strategy IDs: ltr, str, brrrr, flip, house_hack, wholesale"
    )
    target_markets: Optional[List[str]] = Field(
        default=None,
        description="List of state codes or city names"
    )
    investment_budget_min: Optional[float] = Field(
        default=None,
        ge=0,
        description="Minimum investment budget"
    )
    investment_budget_max: Optional[float] = Field(
        default=None,
        ge=0,
        description="Maximum investment budget"
    )
    target_cash_on_cash: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Target cash-on-cash return (0.08 = 8%)"
    )
    target_cap_rate: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Target cap rate (0.06 = 6%)"
    )
    risk_tolerance: Optional[RiskTolerance] = None


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile."""
    pass


class UserProfileUpdate(UserProfileBase):
    """Schema for updating a user profile."""
    
    # Additional fields that can be updated
    default_assumptions: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Custom default assumptions to override global defaults"
    )
    notification_preferences: Optional[Dict[str, Any]] = None
    dashboard_layout: Optional[Dict[str, Any]] = None
    preferred_theme: Optional[str] = Field(
        default=None,
        pattern="^(light|dark|system)$"
    )


class UserProfileResponse(UserProfileBase):
    """Schema for profile response."""
    id: str
    user_id: str
    default_assumptions: Optional[Dict[str, Any]] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    dashboard_layout: Optional[Dict[str, Any]] = None
    preferred_theme: Optional[str] = "system"
    onboarding_completed: bool = False
    onboarding_step: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class OnboardingProgress(BaseModel):
    """Schema for onboarding progress update."""
    step: int = Field(..., ge=0, le=5)
    completed: bool = False
    data: Optional[Dict[str, Any]] = None


# Update forward reference
UserWithProfile.model_rebuild()

