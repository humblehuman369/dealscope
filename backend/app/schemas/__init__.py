"""
Pydantic schemas for API request/response validation.
Organized by domain for better maintainability.
"""

# Re-export existing schemas for backward compatibility
from app.schemas.property import (
    PropertySearchRequest,
    PropertyResponse,
    AnalyticsRequest,
    AnalyticsResponse,
    AllAssumptions,
    StrategyType,
    SensitivityRequest,
    SensitivityResponse,
)

# New auth schemas
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenPayload,
    PasswordReset,
    PasswordResetConfirm,
    PasswordChange,
    EmailVerification,
)

# New user schemas
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
)

# New saved property schemas
from app.schemas.saved_property import (
    SavedPropertyCreate,
    SavedPropertyUpdate,
    SavedPropertyResponse,
    SavedPropertySummary,
    PropertyAdjustmentCreate,
    PropertyAdjustmentResponse,
)

__all__ = [
    # Existing (backward compatible)
    "PropertySearchRequest",
    "PropertyResponse", 
    "AnalyticsRequest",
    "AnalyticsResponse",
    "AllAssumptions",
    "StrategyType",
    "SensitivityRequest",
    "SensitivityResponse",
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenPayload",
    "PasswordReset",
    "PasswordResetConfirm",
    "PasswordChange",
    "EmailVerification",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserProfileCreate",
    "UserProfileUpdate",
    "UserProfileResponse",
    # Saved Properties
    "SavedPropertyCreate",
    "SavedPropertyUpdate",
    "SavedPropertyResponse",
    "SavedPropertySummary",
    "PropertyAdjustmentCreate",
    "PropertyAdjustmentResponse",
]

