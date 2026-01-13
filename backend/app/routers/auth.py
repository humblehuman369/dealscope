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
from app.services.email_service import email_service

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
    logger.info(f"[API] Registration attempt for email: {data.email}")
    
    try:
        user, verification_token = await auth_service.register_user(
            db=db,
            email=data.email,
            password=data.password,
            full_name=data.full_name
        )
        logger.info(f"[API] User registered successfully: {user.email} (id: {user.id})")
        
        # Send verification email if token exists (don't let email failure break registration)
        if verification_token:
            try:
                logger.info(f"[API] Sending verification email to {data.email}")
                await email_service.send_verification_email(
                    to=user.email,
                    user_name=user.full_name,
                    verification_token=verification_token,
                )
            except Exception as email_error:
                # Log but don't fail registration if email fails
                logger.warning(f"[API] Failed to send verification email: {email_error}")
        
        # Build response with all required fields
        # Note: We just created the profile in register_user, so it exists
        # Avoid lazy loading by checking if profile was created (it was)
        response = UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            last_login=user.last_login,
            has_profile=True,  # Profile is created during registration
            onboarding_completed=False
        )
        logger.debug(f"[API] Returning response for user: {user.email}")
        return response
        
    except ValueError as e:
        error_msg = str(e)
        logger.warning(f"[API] Registration validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        import traceback
        error_msg = str(e)
        tb = traceback.format_exc()
        logger.error(f"[API] Registration failed with error: {error_msg}")
        logger.error(f"[API] Traceback: {tb}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {error_msg}"
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
async def get_me(current_user: CurrentUser, db: DbSession):
    """
    Get the currently authenticated user's information.
    
    Requires valid access token in Authorization header.
    """
    # Fetch profile to get onboarding status
    from app.services.user_service import user_service
    profile = await user_service.get_profile(db, str(current_user.id))
    
    has_profile = profile is not None
    onboarding_completed = profile.onboarding_completed if profile else False
    
    # #region agent log
    logger.info(f"[DEBUG-G] /auth/me returning onboarding_completed={onboarding_completed} for user {current_user.email}")
    # #endregion
    
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        has_profile=has_profile,
        onboarding_completed=onboarding_completed
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
    
    # Send welcome email
    await email_service.send_welcome_email(
        to=user.email,
        user_name=user.full_name,
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
    token = await auth_service.regenerate_verification_token(db, current_user)
    
    if token:
        await email_service.send_verification_email(
            to=current_user.email,
            user_name=current_user.full_name,
            verification_token=token,
        )
    
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
    result = await auth_service.create_password_reset_token(db, data.email)
    
    if result:
        reset_token, user = result
        logger.info(f"Password reset token created for {data.email}")
        await email_service.send_password_reset_email(
            to=data.email,
            user_name=user.full_name if user else None,
            reset_token=reset_token,
        )
    
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
    
    # Send password changed notification
    await email_service.send_password_changed_email(
        to=user.email,
        user_name=user.full_name,
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
    
    # Send password changed notification
    await email_service.send_password_changed_email(
        to=current_user.email,
        user_name=current_user.full_name,
    )
    
    return AuthMessage(
        message="Password changed successfully",
        success=True
    )


# ===========================================
# Debug Endpoints (for troubleshooting)
# ===========================================

@router.get(
    "/debug/config",
    summary="Check database configuration (no connection)"
)
async def debug_config():
    """
    Show database configuration without actually connecting.
    This helps debug connection issues.
    """
    import os
    from app.core.config import settings
    
    db_url = os.environ.get("DATABASE_URL", "NOT SET")
    
    # Show more details about the URL for debugging
    url_info = {
        "length": len(db_url) if db_url else 0,
        "has_at_sign": "@" in db_url if db_url else False,
        "has_postgres": "postgres" in db_url.lower() if db_url else False,
        "starts_with": db_url[:20] if db_url and len(db_url) > 20 else db_url[:10] if db_url else "EMPTY",
    }
    
    # Mask password for security
    if db_url and "@" in db_url and db_url != "NOT SET":
        # Format: postgres://user:pass@host:port/db
        try:
            proto_user = db_url.split("@")[0]  # postgres://user:pass
            host_db = db_url.split("@")[1]      # host:port/db
            proto = proto_user.split("://")[0]  # postgres
            masked_url = f"{proto}://***:***@{host_db}"
        except Exception as e:
            masked_url = f"PARSE_ERROR: {e}"
    else:
        masked_url = f"RAW (no @): {db_url[:30]}..." if db_url and len(db_url) > 30 else db_url
    
    # Check async URL
    try:
        async_url = settings.async_database_url
        if "@" in async_url:
            async_masked = async_url.split("://")[0] + "://***@" + async_url.split("@")[-1]
        else:
            async_masked = f"NO_AT_SIGN: {async_url[:30]}..."
    except Exception as e:
        async_masked = f"ERROR: {e}"
    
    return {
        "database_url_set": db_url != "NOT SET" and len(db_url) > 10,
        "url_info": url_info,
        "database_url_masked": masked_url,
        "is_private_railway": "railway.internal" in db_url if db_url else False,
        "is_public_railway": ("up.railway.app" in db_url or "proxy.rlwy.net" in db_url) if db_url else False,
        "async_url_masked": async_masked,
        "environment": settings.ENVIRONMENT,
        "all_db_env_vars": {k: "SET" for k in os.environ.keys() if "DATABASE" in k.upper() or "POSTGRES" in k.upper()},
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get(
    "/debug/test-connection",
    summary="Test database connection with full error details"
)
async def test_connection_manual():
    """
    Manually test database connection without using FastAPI dependency.
    Returns full error details if connection fails.
    """
    import traceback
    from app.core.config import settings
    
    result = {
        "timestamp": datetime.utcnow().isoformat(),
        "steps": {}
    }
    
    try:
        # Step 1: Check settings
        result["steps"]["1_settings"] = "checking..."
        db_url = settings.async_database_url
        result["steps"]["1_settings"] = f"OK - driver: {db_url.split('://')[0] if '://' in db_url else 'unknown'}"
        
        # Step 2: Import psycopg
        result["steps"]["2_import"] = "importing psycopg..."
        import psycopg
        result["steps"]["2_import"] = f"OK - psycopg version: {psycopg.__version__}"
        
        # Step 3: Try async connection
        result["steps"]["3_connect"] = "connecting..."
        
        # Get raw DATABASE_URL (not the async version)
        import os
        raw_url = os.environ.get("DATABASE_URL", settings.DATABASE_URL)
        
        # psycopg async connection test
        async with await psycopg.AsyncConnection.connect(raw_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                row = await cur.fetchone()
                result["steps"]["3_connect"] = f"OK - test query returned: {row}"
        
        result["status"] = "SUCCESS"
        result["message"] = "Database connection works!"
        
    except Exception as e:
        result["status"] = "FAILED"
        result["error"] = str(e)
        result["error_type"] = type(e).__name__
        result["traceback"] = traceback.format_exc()
    
    return result


@router.get(
    "/debug/test-db",
    summary="Test database connectivity"
)
async def test_database(db: DbSession):
    """
    Test database connectivity by running a simple query.
    Returns database connection status and version info.
    """
    from sqlalchemy import text
    
    try:
        # Test basic connectivity
        result = await db.execute(text("SELECT 1 as test"))
        row = result.fetchone()
        
        # Get PostgreSQL version
        version_result = await db.execute(text("SELECT version()"))
        version_row = version_result.fetchone()
        
        # Count users table
        from app.models.user import User
        from sqlalchemy import select, func
        user_count = await db.execute(select(func.count()).select_from(User))
        count = user_count.scalar()
        
        return {
            "status": "connected",
            "test_query": row[0] if row else None,
            "db_version": version_row[0] if version_row else None,
            "user_count": count,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get(
    "/debug/test-hash",
    summary="Test password hashing"
)
async def test_hash():
    """
    Test password hashing functionality.
    Returns hash and verification results.
    """
    try:
        test_password = "TestPassword123"
        
        # Test hashing
        hashed = auth_service.get_password_hash(test_password)
        
        # Test verification
        verified = auth_service.verify_password(test_password, hashed)
        wrong_verified = auth_service.verify_password("wrongpassword", hashed)
        
        return {
            "status": "success",
            "hash_length": len(hashed),
            "hash_prefix": hashed[:20] + "...",
            "verification_correct": verified,
            "verification_wrong": wrong_verified,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        import traceback
        logger.error(f"Hash test failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.post(
    "/debug/test-register",
    summary="Test registration flow step by step"
)
async def test_register_flow(db: DbSession):
    """
    Test the registration flow step by step.
    Creates a test user (deleted immediately after).
    """
    import uuid
    from sqlalchemy import text
    
    test_email = f"test_{uuid.uuid4().hex[:8]}@test.local"
    results = {
        "test_email": test_email,
        "steps": {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        # Step 1: Test DB connection
        results["steps"]["1_db_connection"] = "testing..."
        await db.execute(text("SELECT 1"))
        results["steps"]["1_db_connection"] = "success"
        
        # Step 2: Test password hashing
        results["steps"]["2_password_hash"] = "testing..."
        hashed = auth_service.get_password_hash("TestPassword123")
        results["steps"]["2_password_hash"] = f"success (len={len(hashed)})"
        
        # Step 3: Test user creation
        results["steps"]["3_user_create"] = "testing..."
        from app.models.user import User
        user = User(
            email=test_email,
            hashed_password=hashed,
            full_name="Test User",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        results["steps"]["3_user_create"] = f"success (id={user.id})"
        
        # Step 4: Test profile creation
        results["steps"]["4_profile_create"] = "testing..."
        from app.models.user import UserProfile
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
        results["steps"]["4_profile_create"] = f"success (id={profile.id})"
        
        # Step 5: Rollback (don't keep test data)
        results["steps"]["5_cleanup"] = "rolling back..."
        await db.rollback()
        results["steps"]["5_cleanup"] = "rolled back (no test data saved)"
        
        results["overall"] = "ALL STEPS PASSED"
        
    except Exception as e:
        import traceback
        results["error"] = str(e)
        results["traceback"] = traceback.format_exc()
        results["overall"] = "FAILED"
        await db.rollback()
    
    return results

