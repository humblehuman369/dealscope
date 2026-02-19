"""
Auth router – registration, login, logout, token refresh, password
management, email verification, MFA, and session management.

Every endpoint delegates to the service layer.  No business logic here.
"""

from __future__ import annotations

import logging
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import (
    CurrentSession,
    CurrentUser,
    DbSession,
    get_current_session,
    get_current_user,
)
from app.repositories.role_repository import role_repo
from app.schemas.auth import (
    AuthMessage,
    EmailVerification,
    LoginResponse,
    MFAChallengeResponse,
    MFAConfirmRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    PasswordChange,
    PasswordReset,
    PasswordResetConfirm,
    RefreshTokenRequest,
    SessionInfo,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.auth_service import AuthError, MFARequired, auth_service
from app.services.email_service import email_service
from app.services.session_service import session_service
from app.services.token_service import token_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _set_auth_cookies(response: Response, session_token: str, refresh_token: str, access_jwt: str) -> None:
    """Set httpOnly auth cookies on the response."""
    cookie_kwargs = dict(
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(key="access_token", value=access_jwt, max_age=300, **cookie_kwargs)
    response.set_cookie(key="refresh_token", value=refresh_token, max_age=86400 * settings.REFRESH_TOKEN_EXPIRE_DAYS, **cookie_kwargs)
    response.set_cookie(key="session_token", value=session_token, max_age=86400 * settings.REFRESH_TOKEN_EXPIRE_DAYS, **cookie_kwargs)


def _clear_auth_cookies(response: Response) -> None:
    for name in ("access_token", "refresh_token", "session_token", "csrf_token"):
        response.delete_cookie(
            key=name,
            domain=settings.COOKIE_DOMAIN,
            path="/",
        )


async def _build_user_response(db: AsyncSession, user) -> UserResponse:
    """Build a UserResponse with roles and permissions.

    Optimised to avoid redundant queries: ``get_current_user`` already
    loads user_roles → role → role_permissions → permission via
    ``selectinload`` (one query).  We extract roles and permissions
    from the already-loaded relationship graph.  Only fall back to a
    DB query if the relationships were not eagerly loaded.
    """
    # -- Roles & permissions from pre-loaded relationship graph --
    user_roles_loaded = user.__dict__.get("user_roles")
    if user_roles_loaded is not None:
        role_names = [ur.role.name for ur in user_roles_loaded]
        perms: set[str] = set()
        for ur in user_roles_loaded:
            for rp in ur.role.role_permissions:
                perms.add(rp.permission.codename)
    else:
        # Fallback: relationships not loaded — query (should rarely happen)
        perms = await role_repo.get_user_permissions(db, user.id)
        _user_roles = await role_repo.get_user_roles(db, user.id)
        role_names = [ur.role.name for ur in _user_roles]

    # -- Profile from pre-loaded relationship or fallback query --
    profile = user.__dict__.get("profile")
    if profile is None and "profile" not in user.__dict__:
        from app.repositories.user_repository import user_repo
        profile_user = await user_repo.get_by_id(db, user.id, load_profile=True)
        profile = profile_user.profile if profile_user else None

    # -- Subscription tier (lightweight lookup) --
    from app.services.billing_service import billing_service
    subscription = await billing_service.get_subscription(db, user.id)
    tier = subscription.tier.value if subscription else "free"
    sub_status = subscription.status.value if subscription else "active"

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
        last_login=user.last_login,
        has_profile=profile is not None,
        onboarding_completed=profile.onboarding_completed if profile else False,
        roles=role_names,
        permissions=sorted(perms),
        subscription_tier=tier,
        subscription_status=sub_status,
    )


# ------------------------------------------------------------------
# Registration
# ------------------------------------------------------------------

@router.post("/register", response_model=AuthMessage, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, request: Request, db: DbSession):
    """Register a new user account."""
    try:
        user, verification_token = await auth_service.register_user(
            db,
            email=body.email,
            password=body.password,
            full_name=body.full_name,
            ip_address=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    # Send verification email (non-blocking)
    if verification_token:
        try:
            await email_service.send_verification_email(
                to_email=user.email,
                user_name=user.full_name or user.email,
                verification_token=verification_token,
            )
        except Exception as exc:
            logger.warning("Verification email failed: %s", exc)

    if verification_token:
        return AuthMessage(
            message="Registration successful. Please check your email to verify your account.",
            requires_verification=True,
        )
    return AuthMessage(message="Registration successful. You can now sign in.")


# ------------------------------------------------------------------
# Google OAuth
# ------------------------------------------------------------------

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@router.get("/google")
async def google_start(request: Request):
    """Redirect user to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    base = str(request.base_url).rstrip("/")
    redirect_uri = f"{base}/api/v1/auth/google/callback"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/google/callback")
async def google_callback(request: Request, response: Response, db: DbSession):
    """Handle Google OAuth callback: exchange code, get or create user, set session, redirect to frontend."""
    code = request.query_params.get("code")
    if not code:
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_missing_code"
        return RedirectResponse(url=redirect_url, status_code=302)

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_not_configured"
        return RedirectResponse(url=redirect_url, status_code=302)

    base = str(request.base_url).rstrip("/")
    redirect_uri = f"{base}/api/v1/auth/google/callback"

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
    if token_resp.status_code != 200:
        logger.warning("Google token exchange failed: %s %s", token_resp.status_code, token_resp.text)
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_token_failed"
        return RedirectResponse(url=redirect_url, status_code=302)

    token_data = token_resp.json()
    raw_id_token = token_data.get("id_token")
    if not raw_id_token:
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_token_failed"
        return RedirectResponse(url=redirect_url, status_code=302)

    # Verify id_token signature, audience, and issuer server-side
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        idinfo = google_id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            audience=settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        logger.warning("Google id_token verification failed: %s", exc)
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_token_invalid"
        return RedirectResponse(url=redirect_url, status_code=302)

    google_id = idinfo.get("sub")
    email = idinfo.get("email")
    name = idinfo.get("name") or ""
    picture = idinfo.get("picture")

    if not google_id or not email:
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_invalid_userinfo"
        return RedirectResponse(url=redirect_url, status_code=302)

    try:
        user, _created = await auth_service.get_or_create_user_from_google(
            db,
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
        )
    except Exception as e:
        logger.exception("Google get_or_create_user_from_google failed: %s", e)
        redirect_url = f"{settings.FRONTEND_URL}/register?error=google_signup_failed"
        return RedirectResponse(url=redirect_url, status_code=302)

    session_obj, jwt_token = await session_service.create_session(
        db,
        user.id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("User-Agent") or "",
        remember_me=False,
    )
    await db.commit()

    redirect_to = RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    _set_auth_cookies(redirect_to, session_obj.session_token, session_obj.refresh_token, jwt_token)
    return redirect_to


# ------------------------------------------------------------------
# Login
# ------------------------------------------------------------------

@router.post("/login")
async def login(body: UserLogin, request: Request, response: Response, db: DbSession):
    """Authenticate with email and password.

    Returns user data + tokens.  If MFA is enabled, returns a challenge
    instead and the client must call ``/login/mfa``.
    """
    try:
        user, session_obj, jwt_token = await auth_service.authenticate(
            db,
            email=body.email,
            password=body.password,
            ip_address=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            remember_me=body.remember_me,
        )
        await db.commit()
    except MFARequired as mfa:
        await db.commit()
        return MFAChallengeResponse(challenge_token=mfa.challenge_token)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    _set_auth_cookies(response, session_obj.session_token, session_obj.refresh_token, jwt_token)

    user_resp = await _build_user_response(db, user)
    return LoginResponse(
        user=user_resp,
        access_token=jwt_token,
        refresh_token=session_obj.refresh_token,
        expires_in=300,
    )


@router.post("/login/mfa")
async def login_mfa(body: MFAVerifyRequest, request: Request, response: Response, db: DbSession):
    """Complete MFA-protected login."""
    try:
        user, session_obj, jwt_token = await auth_service.verify_mfa_login(
            db,
            challenge_token=body.challenge_token,
            totp_code=body.totp_code,
            ip_address=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            remember_me=body.remember_me,
        )
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    _set_auth_cookies(response, session_obj.session_token, session_obj.refresh_token, jwt_token)

    user_resp = await _build_user_response(db, user)
    return LoginResponse(
        user=user_resp,
        access_token=jwt_token,
        refresh_token=session_obj.refresh_token,
        expires_in=300,
    )


# ------------------------------------------------------------------
# Token refresh
# ------------------------------------------------------------------

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: DbSession, body: Optional[RefreshTokenRequest] = None):
    """Refresh the access token using a refresh token (cookie or body)."""
    rt = request.cookies.get("refresh_token")
    if body and body.refresh_token:
        rt = body.refresh_token
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token required")

    result = await session_service.refresh_session(db, rt)
    if result is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    session_obj, new_jwt, new_refresh = result
    await db.commit()
    _set_auth_cookies(response, session_obj.session_token, new_refresh, new_jwt)

    return TokenResponse(
        access_token=new_jwt,
        refresh_token=new_refresh,
        expires_in=300,
    )


# ------------------------------------------------------------------
# Logout
# ------------------------------------------------------------------

@router.post("/logout", response_model=AuthMessage)
async def logout(request: Request, response: Response, db: DbSession, session: CurrentSession):
    """Revoke the current session and clear cookies."""
    await auth_service.logout(
        db,
        session.id,
        user_id=session.user_id,
        ip_address=_client_ip(request),
    )
    await db.commit()
    _clear_auth_cookies(response)
    return AuthMessage(message="Logged out successfully")


# ------------------------------------------------------------------
# Current user
# ------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser, db: DbSession):
    """Return the current authenticated user with roles and permissions."""
    return await _build_user_response(db, user)


# ------------------------------------------------------------------
# Email verification
# ------------------------------------------------------------------

@router.post("/verify-email", response_model=AuthMessage)
async def verify_email(body: EmailVerification, request: Request, db: DbSession):
    try:
        user = await auth_service.verify_email(db, body.token, ip_address=_client_ip(request))
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    # Send welcome email
    try:
        await email_service.send_welcome_email(to_email=user.email, user_name=user.full_name or user.email)
    except Exception:
        pass

    return AuthMessage(message="Email verified successfully")


@router.post("/resend-verification", response_model=AuthMessage)
async def resend_verification(user: CurrentUser, db: DbSession):
    raw_token = await auth_service.resend_verification(db, user.id)
    if raw_token is None:
        return AuthMessage(message="Email already verified")
    await db.commit()
    try:
        await email_service.send_verification_email(
            to_email=user.email,
            user_name=user.full_name or user.email,
            verification_token=raw_token,
        )
    except Exception as exc:
        logger.warning("Resend verification email failed: %s", exc)
    return AuthMessage(message="Verification email sent")


# ------------------------------------------------------------------
# Password management
# ------------------------------------------------------------------

@router.post("/forgot-password", response_model=AuthMessage)
async def forgot_password(body: PasswordReset, request: Request, db: DbSession):
    result = await auth_service.request_password_reset(db, body.email, ip_address=_client_ip(request))
    if result:
        await db.commit()
        raw_token, user = result
        try:
            await email_service.send_password_reset_email(
                to_email=user.email,
                user_name=user.full_name or user.email,
                reset_token=raw_token,
            )
        except Exception as exc:
            logger.warning("Password reset email failed: %s", exc)
    # Always return success to prevent email enumeration
    return AuthMessage(message="If an account exists with that email, a reset link has been sent.")


@router.post("/reset-password", response_model=AuthMessage)
async def reset_password(body: PasswordResetConfirm, request: Request, response: Response, db: DbSession):
    try:
        user = await auth_service.reset_password(
            db, body.token, body.new_password, ip_address=_client_ip(request),
        )
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    _clear_auth_cookies(response)

    try:
        await email_service.send_password_changed_email(to_email=user.email, user_name=user.full_name or user.email)
    except Exception:
        pass

    return AuthMessage(message="Password reset successfully. Please log in with your new password.")


@router.post("/change-password", response_model=AuthMessage)
async def change_password(body: PasswordChange, request: Request, user: CurrentUser, db: DbSession, session: CurrentSession):
    try:
        await auth_service.change_password(
            db,
            user.id,
            body.current_password,
            body.new_password,
            current_session_id=session.id,
            ip_address=_client_ip(request),
        )
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    try:
        await email_service.send_password_changed_email(to_email=user.email, user_name=user.full_name or user.email)
    except Exception:
        pass

    return AuthMessage(message="Password changed successfully")


# ------------------------------------------------------------------
# Session management
# ------------------------------------------------------------------

@router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions(user: CurrentUser, db: DbSession, session: CurrentSession):
    """List all active sessions for the current user."""
    sessions = await session_service.list_sessions(db, user.id)
    return [
        SessionInfo(
            id=str(s.id),
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            device_name=s.device_name,
            last_active_at=s.last_active_at,
            created_at=s.created_at,
            is_current=(s.id == session.id),
        )
        for s in sessions
    ]


@router.delete("/sessions/{session_id}", response_model=AuthMessage)
async def revoke_session(session_id: str, user: CurrentUser, db: DbSession, request: Request):
    """Revoke a specific session."""
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    from app.repositories.session_repository import session_repo
    from app.repositories.audit_repository import audit_repo
    from app.models.audit_log import AuditAction

    target = await session_repo.get_by_id(db, sid)
    if target is None or target.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    await session_repo.revoke(db, sid)
    await audit_repo.log(
        db,
        action=AuditAction.SESSION_REVOKE,
        user_id=user.id,
        ip_address=_client_ip(request),
        metadata={"revoked_session": session_id},
    )
    await db.commit()
    return AuthMessage(message="Session revoked")


# ------------------------------------------------------------------
# MFA management
# ------------------------------------------------------------------

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(user: CurrentUser, db: DbSession):
    """Begin MFA setup — returns secret and QR code provisioning URI."""
    try:
        secret, uri = await auth_service.setup_mfa(db, user.id)
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return MFASetupResponse(secret=secret, provisioning_uri=uri)


@router.post("/mfa/verify", response_model=AuthMessage)
async def mfa_verify(body: MFAConfirmRequest, user: CurrentUser, request: Request, db: DbSession):
    """Confirm MFA setup by verifying a TOTP code."""
    try:
        await auth_service.confirm_mfa(db, user.id, body.totp_code, ip_address=_client_ip(request))
        await db.commit()
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return AuthMessage(message="MFA enabled successfully")


@router.delete("/mfa", response_model=AuthMessage)
async def mfa_disable(user: CurrentUser, request: Request, db: DbSession):
    """Disable MFA for the current user."""
    await auth_service.disable_mfa(db, user.id, ip_address=_client_ip(request))
    await db.commit()
    return AuthMessage(message="MFA disabled")


# ------------------------------------------------------------------
# OAuth2 form login (for Swagger UI / API docs)
# ------------------------------------------------------------------

@router.post("/login/form", include_in_schema=False)
async def login_form(request: Request, response: Response, db: DbSession):
    """OAuth2-compatible form login for Swagger UI."""
    from fastapi.security import OAuth2PasswordRequestForm

    form = await request.form()
    email = form.get("username", "")
    password = form.get("password", "")

    try:
        user, session_obj, jwt_token = await auth_service.authenticate(
            db,
            email=str(email),
            password=str(password),
            ip_address=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )
        await db.commit()
    except (AuthError, MFARequired) as e:
        raise HTTPException(status_code=401, detail=str(e))

    _set_auth_cookies(response, session_obj.session_token, session_obj.refresh_token, jwt_token)
    return {"access_token": jwt_token, "token_type": "bearer"}
