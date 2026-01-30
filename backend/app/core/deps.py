"""
FastAPI dependencies for authentication and database access.
"""

from typing import Optional, Annotated
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.auth_service import auth_service
from app.models.user import User
from app.core.config import settings
from app.core.features import FeatureFlags

logger = logging.getLogger(__name__)

# OAuth2 scheme for token extraction
# tokenUrl points to the login endpoint
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False  # Don't auto-raise, we handle it
)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Raises HTTPException if:
    - No token provided
    - Token is invalid or expired
    - User not found or inactive
    
    Usage:
        @router.get("/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    # Verify the token
    payload = auth_service.verify_token(token, token_type="access")
    if not payload:
        raise credentials_exception
    
    # Get the user
    user = await auth_service.get_user_by_id(db, payload.sub)
    if not user:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    Dependency to get the current user if authenticated, or None.
    
    Useful for endpoints that work with or without authentication
    but may provide additional features for logged-in users.
    
    Usage:
        @router.get("/properties")
        async def list_properties(
            current_user: Optional[User] = Depends(get_current_user_optional)
        ):
            if current_user:
                # Show personalized results
            else:
                # Show public results
    """
    if not token:
        return None
    
    try:
        # Verify the token
        payload = auth_service.verify_token(token, token_type="access")
        if not payload:
            return None
        
        # Get the user
        user = await auth_service.get_user_by_id(db, payload.sub)
        if not user or not user.is_active:
            return None
        
        return user
        
    except Exception:
        return None


# DEPRECATED: Use get_current_user instead - it already checks is_active
# Kept for backward compatibility but should not be used in new code.
async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    DEPRECATED: Use get_current_user instead.
    
    This is redundant because get_current_user already checks is_active.
    Kept for backward compatibility only.
    """
    # get_current_user already verified is_active, just return
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the user is verified.
    
    Used for endpoints that require email verification.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the user is a superuser/admin.
    
    Used for admin-only endpoints.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


def require_auth_if_enabled():
    """
    Dependency that conditionally requires auth based on feature flag.
    
    Usage:
        @router.get("/data", dependencies=[Depends(require_auth_if_enabled())])
        async def get_data():
            ...
    """
    async def _require_auth(
        current_user: Optional[User] = Depends(get_current_user_optional)
    ):
        if FeatureFlags.is_enabled("auth_required") and not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return current_user
    
    return _require_auth


# Type aliases for cleaner route definitions
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]
VerifiedUser = Annotated[User, Depends(get_current_verified_user)]
SuperUser = Annotated[User, Depends(get_current_superuser)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

