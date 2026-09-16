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
import hmac
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

# 6-digit email codes: 5 wrong tries stay valid; the 6th invalidates token + code.
CODE_LENGTH = 6
CODE_MAX_ATTEMPTS = 6

# -----------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------


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
        expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        payload = {
            "sub": str(user_id),
            "sid": str(session_id),
            "exp": expire,
            "iat": now,
            "type": "access",
            "aud": settings.APP_NAME,
            "iss": settings.APP_NAME,
        }
        return jwt.encode(payload, self._jwt_key(), algorithm=settings.ALGORITHM)

    def verify_jwt(self, token: str) -> dict | None:
        """Decode and verify a JWT.  Returns the payload dict or None."""
        try:
            payload = jwt.decode(
                token,
                self._jwt_key(),
                algorithms=[settings.ALGORITHM],
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

    @staticmethod
    def generate_email_code() -> str:
        """6-digit numeric code from a CSPRNG. Not unique across users."""
        return f"{secrets.randbelow(10**CODE_LENGTH):0{CODE_LENGTH}d}"

    async def create_email_verification(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> tuple[str, str]:
        """Issue an email-verification link token and a 6-digit code.

        Returns ``(raw_token, raw_code)``. Both share the same expiry and
        one-use row — whichever is consumed first invalidates the other.
        """
        raw_token, raw_code = await self._issue_verification_token(
            db,
            user_id,
            TokenType.EMAIL_VERIFICATION.value,
            with_code=True,
        )
        if raw_code is None:
            raise RuntimeError("email verification tokens always include a code")
        return raw_token, raw_code

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
        raw_token, _code = await self._issue_verification_token(
            db,
            user_id,
            token_type,
            expires_hours=expires_hours,
            expires_minutes=expires_minutes,
            with_code=False,
        )
        return raw_token

    async def _issue_verification_token(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        token_type: str | TokenType,
        *,
        expires_hours: int | None = None,
        expires_minutes: int | None = None,
        with_code: bool = False,
    ) -> tuple[str, str | None]:
        if isinstance(token_type, TokenType):
            token_type = token_type.value

        # EMAIL_VERIFICATION always carries a code so a resend via the
        # generic helper still produces a typable code.
        if token_type == TokenType.EMAIL_VERIFICATION.value:
            with_code = True

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
        raw_code = self.generate_email_code() if with_code else None

        await token_repo.create(
            db,
            user_id=user_id,
            token_hash=self._hash_token(raw_token),
            code_hash=self._hash_token(raw_code) if raw_code is not None else None,
            token_type=token_type,
            expires_at=datetime.now(UTC) + expires_delta,
            attempt_count=0,
        )
        return raw_token, raw_code

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

    async def validate_verification_code(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        raw_code: str,
        token_type: str | TokenType,
    ) -> uuid.UUID | None:
        """Validate a 6-digit code for the user's current unused token.

        Wrong guesses increment ``attempt_count``. The sixth miss marks the
        token (and therefore the link) used. Returns ``user_id`` on success.
        """
        if isinstance(token_type, TokenType):
            token_type = token_type.value

        record = await token_repo.get_unused_for_user(db, user_id, token_type)
        if record is None or not record.code_hash:
            return None

        offered = "".join(c for c in raw_code if c.isdigit())
        if len(offered) != CODE_LENGTH or not hmac.compare_digest(
            record.code_hash, self._hash_token(offered)
        ):
            attempts = await token_repo.increment_attempts(db, record.id)
            if attempts >= CODE_MAX_ATTEMPTS:
                await token_repo.mark_used(db, record.id)
            return None

        await token_repo.mark_used(db, record.id)
        return record.user_id


# Module-level singleton
token_service = TokenService()
