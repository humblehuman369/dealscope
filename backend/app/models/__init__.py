"""
SQLAlchemy models for DealGapIQ.
All models are imported here for Alembic auto-discovery.
"""

from app.models.assumption_defaults import AdminAssumptionDefaults
from app.models.audit_log import AuditAction, AuditLog
from app.models.device_token import DevicePlatform, DeviceToken
from app.models.document import Document, DocumentType
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.saved_property import PropertyAdjustment, PropertyStatus, SavedProperty
from app.models.search_history import SearchHistory
from app.models.session import UserSession
from app.models.share import SharedLink, ShareType
from app.models.subscription import PaymentHistory, Subscription, SubscriptionStatus, SubscriptionTier
from app.models.user import User, UserProfile
from app.models.verification_token import TokenType, VerificationToken

__all__ = [
    "AdminAssumptionDefaults",
    "AuditAction",
    "AuditLog",
    "DevicePlatform",
    "DeviceToken",
    "Document",
    "DocumentType",
    "PaymentHistory",
    "Permission",
    "PropertyAdjustment",
    "PropertyStatus",
    "Role",
    "RolePermission",
    "SavedProperty",
    "SearchHistory",
    "ShareType",
    "SharedLink",
    "Subscription",
    "SubscriptionStatus",
    "SubscriptionTier",
    "TokenType",
    "User",
    "UserProfile",
    "UserRole",
    # New auth models
    "UserSession",
    "VerificationToken",
]
