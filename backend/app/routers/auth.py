"""
Authentication router for user registration, login, and session management.
"""

from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.auth_service import auth_service
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    PasswordReset,
    PasswordResetConfirm,
    PasswordChange,
    EmailVerification,
    AuthMessage,
    RefreshTokenRequest,
)
from app.schemas.user import UserResponse
from app.core.deps import get_current_user, CurrentUser, DbSession
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


# ===========================================
# Registration
# ===========================================

@router.post(
    "/register", 
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(
    data: UserRegister,
    db: DbSession
):
    """
    Register a new user account.
    
    - **email**: Valid email address (will be used for login)
    - **password**: Min 8 chars, must include uppercase and digit
    - **full_name**: User's display name
    
    Returns the created user. If email verification is enabled,
    a verification email will be sent.
    """
    logger.info(f"Registration attempt for email: {data.email}")
    try:
        user, verification_token = await auth_service.register_user(
            db=db,
            email=data.email,
            password=data.password,
            full_name=data.full_name
        )
        logger.info(f"User registered successfully: {user.email}")
        
        # TODO: Send verification email if token exists
        if verification_token:
            logger.info(f"Verification token generated for {data.email}")
            # await email_service.send_verification_email(user.email, verification_token)
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login,
            has_profile=user.profile is not None,
            onboarding_completed=user.profile.onboarding_completed if user.profile else False
        )
        
    except ValueError as e:
        logger.warning(f"Registration validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration failed with error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


# ===========================================
# Login
# ===========================================

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get access token"
)
async def login(
    data: UserLogin,
    db: DbSession
):
    """
    Authenticate user and return JWT tokens.
    
    - **email**: User's email address
    - **password**: User's password
    - **remember_me**: If true, extends token expiration
    
    Returns access_token and refresh_token.
    """
    user = await auth_service.authenticate_user(
        db=db,
        email=data.email,
        password=data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email verification is required
    if settings.FEATURE_EMAIL_VERIFICATION_REQUIRED and not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in"
        )
    
    tokens = auth_service.create_tokens(
        user_id=str(user.id),
        remember_me=data.remember_me
    )
    
    return tokens


@router.post(
    "/login/form",
    response_model=TokenResponse,
    summary="Login with OAuth2 form (for Swagger UI)"
)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible login endpoint for Swagger UI testing.
    Uses form data instead of JSON body.
    """
    user = await auth_service.authenticate_user(
        db=db,
        email=form_data.username,  # OAuth2 uses 'username'
        password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = auth_service.create_tokens(user_id=str(user.id))
    
    return tokens


# ===========================================
# Token Refresh
# ===========================================

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token"
)
async def refresh_token(
    data: RefreshTokenRequest,
    db: DbSession
):
    """
    Get a new access token using a refresh token.
    
    - **refresh_token**: Valid refresh token from login
    
    Returns new access_token and refresh_token.
    """
    # Verify the refresh token
    payload = auth_service.verify_token(data.refresh_token, token_type="refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify user still exists and is active
    user = await auth_service.get_user_by_id(db, payload.sub)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    tokens = auth_service.create_tokens(user_id=str(user.id))
    
    return tokens


# ===========================================
# Logout
# ===========================================

@router.post(
    "/logout",
    response_model=AuthMessage,
    summary="Logout current session"
)
async def logout(
    current_user: CurrentUser,
    response: Response
):
    """
    Logout the current user session.
    
    Note: With stateless JWT, this primarily clears client-side tokens.
    For true session invalidation, implement a token blacklist in Redis.
    """
    # In a stateless JWT system, logout is client-side
    # For server-side invalidation, add token to blacklist (Redis)
    
    logger.info(f"User logged out: {current_user.email}")
    
    return AuthMessage(
        message="Successfully logged out",
        success=True
    )


# ===========================================
# Current User
# ===========================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user info"
)
async def get_me(current_user: CurrentUser):
    """
    Get the currently authenticated user's information.
    
    Requires valid access token in Authorization header.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        has_profile=current_user.profile is not None,
        onboarding_completed=current_user.profile.onboarding_completed if current_user.profile else False
    )


# ===========================================
# Email Verification
# ===========================================

@router.post(
    "/verify-email",
    response_model=AuthMessage,
    summary="Verify email address"
)
async def verify_email(
    data: EmailVerification,
    db: DbSession
):
    """
    Verify a user's email address with the token from the verification email.
    
    - **token**: Verification token from email link
    """
    user = await auth_service.verify_email(db, data.token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    return AuthMessage(
        message="Email verified successfully",
        success=True
    )


@router.post(
    "/resend-verification",
    response_model=AuthMessage,
    summary="Resend verification email"
)
async def resend_verification(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Resend the email verification link.
    
    Requires authentication. Only works if email is not yet verified.
    """
    if current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate new verification token
    # TODO: Implement token regeneration and email sending
    
    return AuthMessage(
        message="Verification email sent",
        success=True
    )


# ===========================================
# Password Reset
# ===========================================

@router.post(
    "/forgot-password",
    response_model=AuthMessage,
    summary="Request password reset"
)
async def forgot_password(
    data: PasswordReset,
    db: DbSession
):
    """
    Request a password reset email.
    
    - **email**: Email address of the account
    
    Always returns success to prevent email enumeration.
    """
    reset_token = await auth_service.create_password_reset_token(db, data.email)
    
    if reset_token:
        # TODO: Send password reset email
        logger.info(f"Password reset token created for {data.email}")
        # await email_service.send_password_reset_email(data.email, reset_token)
    
    # Always return success to prevent email enumeration
    return AuthMessage(
        message="If an account exists with that email, a reset link has been sent",
        success=True
    )


@router.post(
    "/reset-password",
    response_model=AuthMessage,
    summary="Reset password with token"
)
async def reset_password(
    data: PasswordResetConfirm,
    db: DbSession
):
    """
    Reset password using the token from the reset email.
    
    - **token**: Reset token from email link
    - **new_password**: New password (min 8 chars, uppercase + digit)
    """
    user = await auth_service.reset_password(
        db=db,
        token=data.token,
        new_password=data.new_password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return AuthMessage(
        message="Password reset successfully",
        success=True
    )


# ===========================================
# Password Change
# ===========================================

@router.post(
    "/change-password",
    response_model=AuthMessage,
    summary="Change password"
)
async def change_password(
    data: PasswordChange,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Change the current user's password.
    
    - **current_password**: Current password for verification
    - **new_password**: New password (min 8 chars, uppercase + digit)
    """
    success = await auth_service.change_password(
        db=db,
        user=current_user,
        current_password=data.current_password,
        new_password=data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    return AuthMessage(
        message="Password changed successfully",
        success=True
    )

