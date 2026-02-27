"""
Token service - JWT creation/verification and verification-token lifecycle.

JWTs are short-lived (5 min) and contain a ``session_id`` claim so the
server can revoke them instantly by invalidating the session row.

Verification tokens (email confirmation, password reset, MFA setup) are
generated as url-safe random strings.  Only the SHA-256 hash is stored in
the database; the raw value is sent to the user via email or QR code.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.verification_token import TokenType
from app.repositories.token_repository import token_repo

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------
JWT_ACCESS_LIFETIME_MINUTES = 5  # Short-lived — rely on session for validity
JWT_ALGORITHM = "HS256"


class TokenService:
    """Handles JWT and one-time verification tokens."""

    # ------------------------------------------------------------------
    # JWT helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _jwt_key() -> str:
        """Return the JWT signing key, preferring a dedicated secret."""
        return getattr(settings, "JWT_SECRET_KEY", None) or settings.SECRET_KEY

    def create_jwt(
        self,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        *,
        expires_delta: timedelta | None = None,
    ) -> str:
        """Create a short-lived JWT access token bound to a session."""
        now = datetime.now(UTC)
        expire = now + (expires_delta or timedelta(minutes=JWT_ACCESS_LIFETIME_MINUTES))
        payload = {
            "sub": str(user_id),
            "sid": str(session_id),
            "exp": expire,
            "iat": now,
            "type": "access",
            "aud": settings.APP_NAME,
            "iss": settings.APP_NAME,
        }
        return jwt.encode(payload, self._jwt_key(), algorithm=JWT_ALGORITHM)

    def verify_jwt(self, token: str) -> dict | None:
        """Decode and verify a JWT.  Returns the payload dict or None."""
        try:
            payload = jwt.decode(
                token,
                self._jwt_key(),
                algorithms=[JWT_ALGORITHM],
                audience=settings.APP_NAME,
                issuer=settings.APP_NAME,
            )
            if payload.get("type") != "access":
                return None
            return payload
        except JWTError:
            return None

    # ------------------------------------------------------------------
    # Verification tokens (email, password reset, MFA setup)
    # ------------------------------------------------------------------

    @staticmethod
    def _hash_token(raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()

    async def create_verification_token(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        token_type: str | TokenType,
        *,
        expires_hours: int | None = None,
        expires_minutes: int | None = None,
    ) -> str:
        """Generate a verification token and persist its hash.

        Returns the **raw** token (to send to the user).

        Expiry priority:
          1. ``expires_minutes`` (if given)
          2. ``expires_hours`` (if given)
          3. Type-specific default
        """
        if isinstance(token_type, TokenType):
            token_type = token_type.value

        # Decide expiry based on explicit args, then type-specific defaults
        if expires_minutes is not None:
            expires_delta = timedelta(minutes=expires_minutes)
        elif expires_hours is not None:
            expires_delta = timedelta(hours=expires_hours)
        elif token_type == TokenType.PASSWORD_RESET.value:
            expires_delta = timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
        elif token_type == TokenType.MFA_CHALLENGE.value:
            expires_delta = timedelta(minutes=5)
        else:
            expires_delta = timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

        # Invalidate previous unused tokens of the same type
        await token_repo.invalidate_for_user(db, user_id, token_type)

        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)

        await token_repo.create(
            db,
            user_id=user_id,
            token_hash=token_hash,
            token_type=token_type,
            expires_at=datetime.now(UTC) + expires_delta,
        )
        return raw_token

    async def validate_verification_token(
        self,
        db: AsyncSession,
        raw_token: str,
        token_type: str | TokenType,
    ) -> uuid.UUID | None:
        """Validate a raw token.  Returns the ``user_id`` if valid, else None."""
        if isinstance(token_type, TokenType):
            token_type = token_type.value

        token_hash = self._hash_token(raw_token)
        record = await token_repo.get_by_hash(db, token_hash, token_type)
        if record is None:
            return None

        # Mark as used
        await token_repo.mark_used(db, record.id)
        return record.user_id


# Module-level singleton
token_service = TokenService()
