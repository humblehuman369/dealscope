"""
SQLAlchemy models for DealGapIQ.
All models are imported here for Alembic auto-discovery.
"""

from app.models.user import User, UserProfile
from app.models.saved_property import SavedProperty, PropertyAdjustment, PropertyStatus
from app.models.document import Document, DocumentType
from app.models.share import SharedLink, ShareType
from app.models.search_history import SearchHistory
from app.models.subscription import Subscription, PaymentHistory, SubscriptionTier, SubscriptionStatus
from app.models.assumption_defaults import AdminAssumptionDefaults
from app.models.session import UserSession
from app.models.role import Role, Permission, RolePermission, UserRole
from app.models.audit_log import AuditLog, AuditAction
from app.models.verification_token import VerificationToken, TokenType
from app.models.device_token import DeviceToken, DevicePlatform

__all__ = [
    "User",
    "UserProfile",
    "SavedProperty",
    "PropertyAdjustment",
    "PropertyStatus",
    "Document",
    "DocumentType",
    "SharedLink",
    "ShareType",
    "SearchHistory",
    "Subscription",
    "PaymentHistory",
    "SubscriptionTier",
    "SubscriptionStatus",
    "AdminAssumptionDefaults",
    # New auth models
    "UserSession",
    "Role",
    "Permission",
    "RolePermission",
    "UserRole",
    "AuditLog",
    "AuditAction",
    "VerificationToken",
    "TokenType",
    "DeviceToken",
    "DevicePlatform",
]
