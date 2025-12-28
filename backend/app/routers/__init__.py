"""
API routers for InvestIQ.
Each router handles a specific domain of the application.
"""

from app.routers.auth import router as auth_router
from app.routers.users import router as users_router

__all__ = [
    "auth_router",
    "users_router",
]

