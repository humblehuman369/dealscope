"""
User and UserProfile schemas for API responses and updates.
"""
import re
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, HttpUrl
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


# Phone number regex pattern (US format primarily, but flexible)
PHONE_PATTERN = re.compile(r'^[\d\s\-\.\(\)\+]+$')

# State code pattern (2 letters)
STATE_PATTERN = re.compile(r'^[A-Z]{2}$')

# ZIP code pattern (5 digits or 5+4 format)
ZIP_PATTERN = re.compile(r'^\d{5}(-\d{4})?$')


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


class PhoneNumber(BaseModel):
    """Schema for a phone number entry."""
    type: str = Field(..., pattern="^(mobile|home|work|fax|other)$")
    number: str = Field(..., min_length=10, max_length=20)
    primary: bool = False
    
    @field_validator('number')
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        """Validate phone number format."""
        # Remove all formatting to check digit count
        digits_only = re.sub(r'\D', '', v)
        if len(digits_only) < 10:
            raise ValueError('Phone number must have at least 10 digits')
        if len(digits_only) > 15:
            raise ValueError('Phone number cannot exceed 15 digits')
        if not PHONE_PATTERN.match(v):
            raise ValueError('Phone number contains invalid characters')
        return v


class SocialLinks(BaseModel):
    """Schema for social media links."""
    linkedin: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    website: Optional[str] = None
    
    @field_validator('linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'website')
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate that social links are valid URLs."""
        if v is None or v == '':
            return None
        
        # Check if it's a valid URL format
        if not v.startswith(('http://', 'https://')):
            # Allow just the username/handle for social platforms
            if len(v) > 500:
                raise ValueError('URL or handle is too long')
            return v
        
        # Basic URL validation
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        
        if not url_pattern.match(v):
            raise ValueError('Invalid URL format')
        
        return v


class UserUpdate(BaseModel):
    """Schema for updating user info."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = None
    
    # Business Profile
    business_name: Optional[str] = Field(None, max_length=255)
    business_type: Optional[str] = Field(None, max_length=100)
    
    # Business Address
    business_address_street: Optional[str] = Field(None, max_length=255)
    business_address_city: Optional[str] = Field(None, max_length=100)
    business_address_state: Optional[str] = Field(None, max_length=2)
    business_address_zip: Optional[str] = Field(None, max_length=10)
    business_address_country: Optional[str] = Field(None, max_length=100)
    
    # Contact Information
    phone_numbers: Optional[List[PhoneNumber]] = None
    additional_emails: Optional[List[EmailStr]] = None
    
    # Social Links
    social_links: Optional[SocialLinks] = None
    
    # Professional Info
    license_number: Optional[str] = Field(None, max_length=100)
    license_state: Optional[str] = Field(None, max_length=2)
    bio: Optional[str] = Field(None, max_length=2000)
    
    @field_validator('business_address_state', 'license_state')
    @classmethod
    def validate_state_code(cls, v: Optional[str]) -> Optional[str]:
        """Validate US state code format (2 uppercase letters)."""
        if v is None or v == '':
            return None
        
        v_upper = v.upper()
        if not STATE_PATTERN.match(v_upper):
            raise ValueError('State code must be 2 uppercase letters (e.g., FL, CA, NY)')
        
        return v_upper
    
    @field_validator('business_address_zip')
    @classmethod
    def validate_zip_code(cls, v: Optional[str]) -> Optional[str]:
        """Validate US ZIP code format (5 digits or 5+4 format)."""
        if v is None or v == '':
            return None
        
        # Remove any extra whitespace
        v = v.strip()
        
        if not ZIP_PATTERN.match(v):
            raise ValueError('ZIP code must be 5 digits (e.g., 33444) or 5+4 format (e.g., 33444-1234)')
        
        return v


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
    
    # Business Profile
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    business_address_street: Optional[str] = None
    business_address_city: Optional[str] = None
    business_address_state: Optional[str] = None
    business_address_zip: Optional[str] = None
    business_address_country: Optional[str] = None
    phone_numbers: Optional[List[Dict[str, Any]]] = None
    additional_emails: Optional[List[str]] = None
    social_links: Optional[Dict[str, Any]] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    bio: Optional[str] = None
    
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
    investment_budget_min: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Minimum investment budget"
    )
    investment_budget_max: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Maximum investment budget"
    )
    target_cash_on_cash: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=1,
        description="Target cash-on-cash return (0.08 = 8%)"
    )
    target_cap_rate: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=1,
        description="Target cap rate (0.06 = 6%)"
    )
    risk_tolerance: Optional[RiskTolerance] = None
    
    @model_validator(mode='after')
    def validate_budget_range(self):
        """Ensure investment_budget_min <= investment_budget_max."""
        if self.investment_budget_min is not None and self.investment_budget_max is not None:
            if self.investment_budget_min > self.investment_budget_max:
                raise ValueError(
                    f"investment_budget_min ({self.investment_budget_min}) must be less than "
                    f"or equal to investment_budget_max ({self.investment_budget_max})"
                )
        return self


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

