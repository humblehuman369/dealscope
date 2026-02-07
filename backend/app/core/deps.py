"""
FastAPI dependencies for authentication, authorization, and database access.

The new auth model:
  1. Extract JWT from httpOnly cookie or Authorization header.
  2. Verify the JWT signature and expiry (5-minute window).
  3. Load the backing session from PostgreSQL (instant revocation).
  4. Load the user and their RBAC permissions.

``require_permission("codename")`` is the primary authorization gate.
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated, Callable, Optional, Set

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.session import UserSession
from app.models.user import User
from app.repositories.role_repository import role_repo
from app.repositories.user_repository import user_repo
from app.services.session_service import session_service

logger = logging.getLogger(__name__)

# OAuth2 scheme — auto_error=False so we can fall back to cookies
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


# ------------------------------------------------------------------
# Token extraction
# ------------------------------------------------------------------

def _extract_token(request: Request, header_token: Optional[str] = None) -> Optional[str]:
    """Extract JWT from cookie (preferred) or Authorization header (mobile)."""
    cookie = request.cookies.get("access_token")
    if cookie:
        return cookie
    return header_token


# ------------------------------------------------------------------
# Session resolution
# ------------------------------------------------------------------

async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    header_token: Optional[str] = Depends(oauth2_scheme),
) -> UserSession:
    """Resolve the current session from the JWT.

    The JWT contains a ``sid`` (session id) claim.  We load the session from
    PostgreSQL to verify it has not been revoked.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request, header_token)
    if not token:
        raise credentials_exc

    session_obj = await session_service.validate_session_from_jwt(db, token)
    if session_obj is None:
        raise credentials_exc

    return session_obj


async def get_current_session_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
    header_token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[UserSession]:
    """Like ``get_current_session`` but returns None instead of raising."""
    token = _extract_token(request, header_token)
    if not token:
        return None
    try:
        return await session_service.validate_session_from_jwt(db, token)
    except (ValueError, KeyError):
        # Expected JWT validation failures
        return None
    except Exception:
        logger.exception("Unexpected error in get_current_session_optional")
        raise


# ------------------------------------------------------------------
# User resolution
# ------------------------------------------------------------------

async def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Load the authenticated user for the current session."""
    user = await user_repo.get_by_id(db, session.user_id, load_profile=True, load_roles=True)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    # Attach session id for downstream use (e.g. change-password)
    user._current_session_id = session.id  # type: ignore[attr-defined]
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
    header_token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[User]:
    """Return the authenticated user or None (for public endpoints)."""
    token = _extract_token(request, header_token)
    if not token:
        return None
    try:
        session_obj = await session_service.validate_session_from_jwt(db, token)
        if session_obj is None:
            return None
        user = await user_repo.get_by_id(db, session_obj.user_id, load_profile=True)
        if user and user.is_active:
            return user
    except (ValueError, KeyError) as exc:
        # Expected JWT validation failures — treat as unauthenticated
        logger.debug("Optional auth token invalid: %s", exc)
    except Exception:
        # Unexpected errors (e.g. database outage) must propagate so they
        # don't silently degrade all users to anonymous.
        logger.exception("Unexpected error in get_current_user_optional")
        raise
    return None


# ------------------------------------------------------------------
# Authorization helpers
# ------------------------------------------------------------------

async def get_current_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the user's email is verified."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
        )
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Legacy superuser check — prefer ``require_permission``."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )
    return current_user


def require_permission(codename: str) -> Callable:
    """Factory that returns a FastAPI dependency checking an RBAC permission.

    Usage::

        @router.post("/admin/users", dependencies=[Depends(require_permission("admin:users"))])
        async def manage_users(...):
            ...
    """

    async def _check(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        has = await role_repo.user_has_permission(db, current_user.id, codename)
        if not has:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{codename}' required",
            )
        return current_user

    return _check


# ------------------------------------------------------------------
# Type aliases for cleaner route signatures
# ------------------------------------------------------------------

CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]
VerifiedUser = Annotated[User, Depends(get_current_verified_user)]
SuperUser = Annotated[User, Depends(get_current_superuser)]
CurrentSession = Annotated[UserSession, Depends(get_current_session)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
