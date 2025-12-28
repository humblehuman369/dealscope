"""
Service layer for InvestIQ.
Contains business logic separated from API routes.
"""

from app.services.property_service import property_service

# Auth service will be initialized after import
# from app.services.auth_service import auth_service

__all__ = [
    "property_service",
]

