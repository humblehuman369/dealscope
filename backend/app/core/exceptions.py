"""
Custom exceptions for DealGapIQ API.

Centralizes exception definitions and provides consistent error handling patterns.
"""

from typing import Any


class DealGapIQError(Exception):
    """Base exception for all DealGapIQ errors."""

    def __init__(self, message: str, code: str = "DEALGAPIQ_ERROR", details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to canonical API error response format."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class NotFoundError(DealGapIQError):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            code="NOT_FOUND",
            details={"resource": resource, "identifier": identifier, **(details or {})},
        )
        self.resource = resource
        self.identifier = identifier


class PropertyNotFoundError(NotFoundError):
    """Property not found."""

    def __init__(self, property_id: str):
        super().__init__(resource="Property", identifier=property_id)


class UserNotFoundError(NotFoundError):
    """User not found."""

    def __init__(self, user_id: str):
        super().__init__(resource="User", identifier=user_id)


class ValidationError(DealGapIQError):
    """Validation error for input data."""

    def __init__(self, message: str, field: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message=message, code="VALIDATION_ERROR", details={"field": field, **(details or {})} if field else details
        )
        self.field = field


class AuthenticationError(DealGapIQError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed", details: dict[str, Any] | None = None):
        super().__init__(message=message, code="AUTHENTICATION_ERROR", details=details)


class AuthorizationError(DealGapIQError):
    """Authorization/permission denied."""

    def __init__(self, message: str = "Permission denied", details: dict[str, Any] | None = None):
        super().__init__(message=message, code="AUTHORIZATION_ERROR", details=details)


class ExternalAPIError(DealGapIQError):
    """Error from external API (RentCast, AXESSO, Stripe, etc.)."""

    def __init__(
        self, service: str, message: str, status_code: int | None = None, details: dict[str, Any] | None = None
    ):
        super().__init__(
            message=f"{service} API error: {message}",
            code="EXTERNAL_API_ERROR",
            details={"service": service, "status_code": status_code, **(details or {})},
        )
        self.service = service
        self.status_code = status_code


class RateLimitError(DealGapIQError):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after, **(details or {})},
        )
        self.retry_after = retry_after


class SubscriptionError(DealGapIQError):
    """Subscription-related error."""

    def __init__(self, message: str, tier_required: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(
            message=message, code="SUBSCRIPTION_ERROR", details={"tier_required": tier_required, **(details or {})}
        )
        self.tier_required = tier_required


class SubscriptionLimitError(SubscriptionError):
    """Subscription limit exceeded."""

    def __init__(self, limit_type: str, current: int, limit: int, tier_required: str | None = None):
        super().__init__(
            message=f"{limit_type} limit exceeded ({current}/{limit})",
            tier_required=tier_required,
            details={"limit_type": limit_type, "current": current, "limit": limit},
        )
        self.limit_type = limit_type
        self.current = current
        self.limit = limit


class StorageError(DealGapIQError):
    """File storage error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, code="STORAGE_ERROR", details=details)


class ConfigurationError(DealGapIQError):
    """Configuration/setup error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, code="CONFIGURATION_ERROR", details=details)
