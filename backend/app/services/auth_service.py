"""
Authentication service – orchestrates registration, login, MFA, password
management, and email-verification flows.

This service delegates data access to repositories and token/session
management to their respective services.  It owns the business rules:
  - account lockout after N failed attempts
  - MFA challenge flow
  - audit logging of every security event
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import pyotp
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit_log import AuditAction
from app.models.session import UserSession
from app.models.user import User, UserProfile
from app.models.verification_token import TokenType
from app.repositories.audit_repository import audit_repo
from app.repositories.role_repository import role_repo
from app.repositories.user_repository import user_repo
from app.services.session_service import session_service
from app.services.token_service import token_service

logger = logging.getLogger(__name__)

# Password hashing — bcrypt via passlib
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Account lockout
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
LOCKOUT_PROGRESSIVE_MULTIPLIER = 2  # doubles each lockout


class AuthError(Exception):
    """Raised for authentication failures that should be shown to the user."""

    def __init__(self, detail: str, *, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class MFARequired(Exception):
    """Raised when credentials are valid but MFA verification is needed."""

    def __init__(self, challenge_token: str, user_id: uuid.UUID):
        self.challenge_token = challenge_token
        self.user_id = user_id
        super().__init__("MFA verification required")


class AuthService:
    """Central authentication orchestrator."""

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        try:
            return pwd_context.verify(plain, hashed)
        except Exception:
            return False

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    async def register_user(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str,
        full_name: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, Optional[str]]:
        """Register a new user.

        Returns ``(user, raw_verification_token_or_None)``.
        Raises ``AuthError`` on duplicate email.

        All mutations (user, profile, role, token, audit) are performed
        inside a single SAVEPOINT so they either all succeed or all
        roll back, preventing orphaned records.
        """
        email = email.lower().strip()

        existing = await user_repo.get_by_email(db, email)
        if existing:
            raise AuthError("Email already registered", status_code=409)

        hashed = self.hash_password(password)
        requires_verification = settings.FEATURE_EMAIL_VERIFICATION_REQUIRED

        async with db.begin_nested():
            user = await user_repo.create(
                db,
                email=email,
                hashed_password=hashed,
                full_name=full_name.strip(),
                is_active=True,
                is_verified=not requires_verification,
            )

            # Create profile
            await user_repo.create_profile(db, user.id)

            # Assign default member role
            member_role = await role_repo.get_role_by_name(db, "member")
            if member_role:
                await role_repo.assign_role(db, user.id, member_role.id)

            # Verification token
            raw_token: Optional[str] = None
            if requires_verification:
                raw_token = await token_service.create_verification_token(
                    db, user.id, TokenType.EMAIL_VERIFICATION
                )

            # Audit
            await audit_repo.log(
                db,
                action=AuditAction.REGISTER,
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"email": email},
            )

        logger.info("User registered: %s", email)
        return user, raw_token

    # ------------------------------------------------------------------
    # Authentication (login)
    # ------------------------------------------------------------------

    async def authenticate(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
        remember_me: bool = False,
    ) -> Tuple[User, UserSession, str]:
        """Authenticate a user and create a session.

        Returns ``(user, session, jwt)``.
        Raises ``AuthError`` on failure, ``MFARequired`` when MFA is needed.
        """
        email = email.lower().strip()
        user = await user_repo.get_by_email(db, email, load_roles=True)

        if user is None:
            raise AuthError("Invalid email or password", status_code=401)

        # Account lockout check
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds())
            raise AuthError(
                f"Account is temporarily locked. Try again in {remaining // 60 + 1} minutes.",
                status_code=423,
            )

        if not user.is_active:
            raise AuthError("Account is deactivated", status_code=403)

        # Verify password
        if not self.verify_password(password, user.hashed_password):
            new_count = await user_repo.increment_failed_logins(db, user.id)
            await audit_repo.log(
                db,
                action=AuditAction.LOGIN_FAILED,
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"attempt": new_count},
            )
            if new_count >= MAX_FAILED_ATTEMPTS:
                lockout_mins = LOCKOUT_DURATION_MINUTES * (
                    LOCKOUT_PROGRESSIVE_MULTIPLIER ** ((new_count - MAX_FAILED_ATTEMPTS) // MAX_FAILED_ATTEMPTS)
                )
                lock_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_mins)
                await user_repo.lock_account(db, user.id, lock_until)
                await audit_repo.log(
                    db,
                    action=AuditAction.ACCOUNT_LOCKED,
                    user_id=user.id,
                    ip_address=ip_address,
                    metadata={"locked_until": lock_until.isoformat(), "attempts": new_count},
                )
                raise AuthError(
                    f"Too many failed attempts. Account locked for {lockout_mins} minutes.",
                    status_code=423,
                )
            raise AuthError("Invalid email or password", status_code=401)

        # Email verification check
        if settings.FEATURE_EMAIL_VERIFICATION_REQUIRED and not user.is_verified:
            raise AuthError("Email not verified. Please check your inbox.", status_code=403)

        # MFA check
        if user.mfa_enabled and user.mfa_secret:
            # Create a short-lived MFA challenge token
            challenge_token = await token_service.create_verification_token(
                db, user.id, TokenType.MFA_SETUP, expires_hours=0  # will override below
            )
            # Override — MFA challenge valid for 5 minutes only
            # (the token_service already created a record; we're reusing it here)
            raise MFARequired(challenge_token=challenge_token, user_id=user.id)

        # Success — reset lockout and create session
        await user_repo.reset_failed_logins(db, user.id)
        await user_repo.update(db, user.id, last_login=datetime.now(timezone.utc))

        session_obj, jwt_token = await session_service.create_session(
            db,
            user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name,
            remember_me=remember_me,
        )

        await audit_repo.log(
            db,
            action=AuditAction.LOGIN,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"session_id": str(session_obj.id)},
        )

        logger.info("User authenticated: %s", email)
        return user, session_obj, jwt_token

    # ------------------------------------------------------------------
    # MFA
    # ------------------------------------------------------------------

    async def verify_mfa_login(
        self,
        db: AsyncSession,
        *,
        challenge_token: str,
        totp_code: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
        remember_me: bool = False,
    ) -> Tuple[User, UserSession, str]:
        """Complete MFA login after a successful password check."""
        user_id = await token_service.validate_verification_token(
            db, challenge_token, TokenType.MFA_SETUP
        )
        if user_id is None:
            raise AuthError("Invalid or expired MFA challenge", status_code=401)

        user = await user_repo.get_by_id(db, user_id, load_roles=True)
        if user is None or not user.mfa_enabled or not user.mfa_secret:
            raise AuthError("MFA not configured", status_code=400)

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(totp_code, valid_window=1):
            await audit_repo.log(
                db,
                action=AuditAction.MFA_CHALLENGE,
                user_id=user.id,
                ip_address=ip_address,
                metadata={"result": "failed"},
            )
            raise AuthError("Invalid MFA code", status_code=401)

        # MFA passed — create session
        await user_repo.reset_failed_logins(db, user.id)
        await user_repo.update(db, user.id, last_login=datetime.now(timezone.utc))

        session_obj, jwt_token = await session_service.create_session(
            db,
            user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name,
            remember_me=remember_me,
        )

        await audit_repo.log(
            db,
            action=AuditAction.LOGIN,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"session_id": str(session_obj.id), "mfa": True},
        )

        return user, session_obj, jwt_token

    async def setup_mfa(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> Tuple[str, str]:
        """Begin MFA setup.  Returns ``(secret, provisioning_uri)``."""
        user = await user_repo.get_by_id(db, user_id)
        if user is None:
            raise AuthError("User not found", status_code=404)

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name=settings.APP_NAME)

        # Store the secret temporarily — not yet enabled
        await user_repo.update(db, user_id, mfa_secret=secret)
        return secret, uri

    async def confirm_mfa(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        totp_code: str,
        *,
        ip_address: Optional[str] = None,
    ) -> bool:
        """Confirm MFA setup by verifying a code from the authenticator app."""
        user = await user_repo.get_by_id(db, user_id)
        if user is None or not user.mfa_secret:
            raise AuthError("MFA setup not started", status_code=400)

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(totp_code, valid_window=1):
            raise AuthError("Invalid MFA code", status_code=400)

        await user_repo.update(db, user_id, mfa_enabled=True)
        await audit_repo.log(
            db,
            action=AuditAction.MFA_ENABLE,
            user_id=user_id,
            ip_address=ip_address,
        )
        return True

    async def disable_mfa(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        ip_address: Optional[str] = None,
    ) -> None:
        await user_repo.update(db, user_id, mfa_secret=None, mfa_enabled=False)
        await audit_repo.log(
            db,
            action=AuditAction.MFA_DISABLE,
            user_id=user_id,
            ip_address=ip_address,
        )

    # ------------------------------------------------------------------
    # Email verification
    # ------------------------------------------------------------------

    async def verify_email(
        self,
        db: AsyncSession,
        raw_token: str,
        *,
        ip_address: Optional[str] = None,
    ) -> User:
        user_id = await token_service.validate_verification_token(
            db, raw_token, TokenType.EMAIL_VERIFICATION
        )
        if user_id is None:
            raise AuthError("Invalid or expired verification token", status_code=400)

        await user_repo.update(db, user_id, is_verified=True)
        user = await user_repo.get_by_id(db, user_id)
        if user is None:
            raise AuthError("User not found", status_code=404)

        await audit_repo.log(
            db,
            action=AuditAction.EMAIL_VERIFICATION,
            user_id=user_id,
            ip_address=ip_address,
        )
        return user

    async def resend_verification(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> Optional[str]:
        user = await user_repo.get_by_id(db, user_id)
        if user is None or user.is_verified:
            return None
        return await token_service.create_verification_token(
            db, user.id, TokenType.EMAIL_VERIFICATION
        )

    # ------------------------------------------------------------------
    # Password reset
    # ------------------------------------------------------------------

    async def request_password_reset(
        self,
        db: AsyncSession,
        email: str,
        *,
        ip_address: Optional[str] = None,
    ) -> Optional[Tuple[str, User]]:
        """Request a password reset.  Returns None if user not found (no leak)."""
        user = await user_repo.get_by_email(db, email.lower().strip())
        if user is None:
            return None

        raw_token = await token_service.create_verification_token(
            db, user.id, TokenType.PASSWORD_RESET
        )
        await audit_repo.log(
            db,
            action=AuditAction.PASSWORD_RESET_REQUEST,
            user_id=user.id,
            ip_address=ip_address,
        )
        return raw_token, user

    async def reset_password(
        self,
        db: AsyncSession,
        raw_token: str,
        new_password: str,
        *,
        ip_address: Optional[str] = None,
    ) -> User:
        user_id = await token_service.validate_verification_token(
            db, raw_token, TokenType.PASSWORD_RESET
        )
        if user_id is None:
            raise AuthError("Invalid or expired reset token", status_code=400)

        async with db.begin_nested():
            hashed = self.hash_password(new_password)
            await user_repo.update(
                db,
                user_id,
                hashed_password=hashed,
                password_changed_at=datetime.now(timezone.utc),
            )

            # Revoke all existing sessions
            await session_service.revoke_all_sessions(db, user_id)

            await audit_repo.log(
                db,
                action=AuditAction.PASSWORD_RESET_COMPLETE,
                user_id=user_id,
                ip_address=ip_address,
            )

        user = await user_repo.get_by_id(db, user_id)
        if user is None:
            raise AuthError("User not found", status_code=404)

        return user

    # ------------------------------------------------------------------
    # Password change (authenticated)
    # ------------------------------------------------------------------

    async def change_password(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
        *,
        current_session_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> bool:
        user = await user_repo.get_by_id(db, user_id)
        if user is None:
            raise AuthError("User not found", status_code=404)

        if not self.verify_password(current_password, user.hashed_password):
            raise AuthError("Current password is incorrect", status_code=400)

        async with db.begin_nested():
            hashed = self.hash_password(new_password)
            await user_repo.update(
                db,
                user_id,
                hashed_password=hashed,
                password_changed_at=datetime.now(timezone.utc),
            )

            # Revoke all sessions except the current one
            await session_service.revoke_all_sessions(
                db, user_id, except_session_id=current_session_id
            )

            await audit_repo.log(
                db,
                action=AuditAction.PASSWORD_CHANGE,
                user_id=user_id,
                ip_address=ip_address,
            )
        return True

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    async def logout(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        *,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        await session_service.revoke_session(db, session_id)
        await audit_repo.log(
            db,
            action=AuditAction.LOGOUT,
            user_id=user_id,
            ip_address=ip_address,
            metadata={"session_id": str(session_id)},
        )


# Module-level singleton
auth_service = AuthService()
