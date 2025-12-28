"""
Pydantic schemas for API request/response validation.
Organized by domain for better maintainability.
"""

# Re-export ALL existing schemas from property.py for backward compatibility
from app.schemas.property import (
    # Enums
    PropertyType,
    DataSource,
    Confidence,
    RiskLevel,
    StrategyType,
    # Provenance
    FieldProvenance,
    ProvenanceMap,
    # Property Data
    Address,
    PropertyDetails,
    ValuationData,
    RentalData,
    MarketData,
    DataQuality,
    # Assumptions
    FinancingAssumptions,
    OperatingAssumptions,
    STRAssumptions,
    RehabAssumptions,
    BRRRRAssumptions,
    FlipAssumptions,
    HouseHackAssumptions,
    WholesaleAssumptions,
    AllAssumptions,
    # Calculation Results
    LTRResults,
    STRResults,
    BRRRRResults,
    FlipResults,
    HouseHackResults,
    WholesaleResults,
    StrategyComparison,
    # API Requests/Responses
    PropertySearchRequest,
    PropertyResponse,
    AnalyticsRequest,
    AnalyticsResponse,
    SensitivityRequest,
    SensitivityResponse,
    ExportRequest,
    ExportResponse,
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
    AuthMessage,
    RefreshTokenRequest,
)

# New user schemas
from app.schemas.user import (
    ExperienceLevel,
    RiskTolerance,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserWithProfile,
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    OnboardingProgress,
)

# New saved property schemas
from app.schemas.saved_property import (
    PropertyStatus,
    SavedPropertyCreate,
    SavedPropertyUpdate,
    SavedPropertyResponse,
    SavedPropertySummary,
    PropertyAdjustmentCreate,
    PropertyAdjustmentResponse,
    BulkStatusUpdate,
    BulkTagUpdate,
)

__all__ = [
    # Property/Analytics (backward compatible)
    "PropertyType",
    "DataSource",
    "Confidence",
    "RiskLevel",
    "StrategyType",
    "FieldProvenance",
    "ProvenanceMap",
    "Address",
    "PropertyDetails",
    "ValuationData",
    "RentalData",
    "MarketData",
    "DataQuality",
    "FinancingAssumptions",
    "OperatingAssumptions",
    "STRAssumptions",
    "RehabAssumptions",
    "BRRRRAssumptions",
    "FlipAssumptions",
    "HouseHackAssumptions",
    "WholesaleAssumptions",
    "AllAssumptions",
    "LTRResults",
    "STRResults",
    "BRRRRResults",
    "FlipResults",
    "HouseHackResults",
    "WholesaleResults",
    "StrategyComparison",
    "PropertySearchRequest",
    "PropertyResponse",
    "AnalyticsRequest",
    "AnalyticsResponse",
    "SensitivityRequest",
    "SensitivityResponse",
    "ExportRequest",
    "ExportResponse",
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenPayload",
    "PasswordReset",
    "PasswordResetConfirm",
    "PasswordChange",
    "EmailVerification",
    "AuthMessage",
    "RefreshTokenRequest",
    # User
    "ExperienceLevel",
    "RiskTolerance",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserWithProfile",
    "UserProfileCreate",
    "UserProfileUpdate",
    "UserProfileResponse",
    "OnboardingProgress",
    # Saved Properties
    "PropertyStatus",
    "SavedPropertyCreate",
    "SavedPropertyUpdate",
    "SavedPropertyResponse",
    "SavedPropertySummary",
    "PropertyAdjustmentCreate",
    "PropertyAdjustmentResponse",
    "BulkStatusUpdate",
    "BulkTagUpdate",
]
