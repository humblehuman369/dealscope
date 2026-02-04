"""
Feature flags for gradual rollout of new features.
Allows enabling/disabling features without code changes.
"""

from functools import wraps
from typing import Callable, Optional
from fastapi import HTTPException, status

from app.core.config import settings


class FeatureFlags:
    """
    Feature flag management.
    
    All flags default to the values in settings, but can be overridden
    at runtime for testing or gradual rollout.
    """
    
    _overrides: dict = {}
    
    @classmethod
    def is_enabled(cls, feature_name: str) -> bool:
        """
        Check if a feature is enabled.
        
        Priority:
        1. Runtime overrides
        2. Environment settings
        3. Default to False
        """
        # Check for runtime override
        if feature_name in cls._overrides:
            return cls._overrides[feature_name]
        
        # Check settings
        setting_name = f"FEATURE_{feature_name.upper()}"
        return getattr(settings, setting_name, False)
    
    @classmethod
    def set_override(cls, feature_name: str, enabled: bool) -> None:
        """Set a runtime override for a feature."""
        cls._overrides[feature_name] = enabled
    
    @classmethod
    def clear_override(cls, feature_name: str) -> None:
        """Clear a runtime override."""
        cls._overrides.pop(feature_name, None)
    
    @classmethod
    def clear_all_overrides(cls) -> None:
        """Clear all runtime overrides."""
        cls._overrides.clear()
    
    # ===========================================
    # Feature Properties
    # ===========================================
    
    @classmethod
    def auth_required(cls) -> bool:
        """Whether authentication is required for all routes."""
        return cls.is_enabled("auth_required")
    
    @classmethod
    def dashboard_enabled(cls) -> bool:
        """Whether the dashboard feature is enabled."""
        return cls.is_enabled("dashboard_enabled")
    
    @classmethod
    def document_upload_enabled(cls) -> bool:
        """Whether document upload is enabled."""
        return cls.is_enabled("document_upload_enabled")
    
    @classmethod
    def sharing_enabled(cls) -> bool:
        """Whether sharing features are enabled."""
        return cls.is_enabled("sharing_enabled")
    
    @classmethod
    def email_verification_required(cls) -> bool:
        """Whether email verification is required for new accounts."""
        return cls.is_enabled("email_verification_required")


def require_feature(feature_name: str, error_message: Optional[str] = None):
    """
    Decorator to require a feature flag to be enabled.
    
    Usage:
        @router.get("/dashboard")
        @require_feature("dashboard_enabled")
        async def get_dashboard():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not FeatureFlags.is_enabled(feature_name):
                msg = error_message or f"Feature '{feature_name}' is not enabled"
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail=msg
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Convenience aliases
features = FeatureFlags

