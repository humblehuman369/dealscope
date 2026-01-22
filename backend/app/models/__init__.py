"""
SQLAlchemy models for InvestIQ.
All models are imported here for Alembic auto-discovery.
"""

from app.models.user import User, UserProfile
from app.models.saved_property import SavedProperty, PropertyAdjustment, PropertyStatus
from app.models.document import Document, DocumentType
from app.models.share import SharedLink, ShareType
from app.models.search_history import SearchHistory
from app.models.subscription import Subscription, PaymentHistory, SubscriptionTier, SubscriptionStatus
from app.models.assumption_defaults import AdminAssumptionDefaults

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
]

