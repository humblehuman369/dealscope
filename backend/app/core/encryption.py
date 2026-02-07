"""
Field-level encryption utilities using Fernet (AES-128-CBC + HMAC-SHA256).

Used for encrypting sensitive data at rest, such as MFA TOTP secrets.

The encryption key is derived from ``settings.SECRET_KEY`` so no additional
environment variable is needed.  A dedicated ``MFA_ENCRYPTION_KEY`` override
is supported if the operator wants to rotate independently.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Key derivation
# ---------------------------------------------------------------------------

_PREFIX = "enc:"  # ciphertext prefix so we can detect already-encrypted values


def _derive_fernet_key() -> bytes:
    """Derive a 32-byte URL-safe-base64 Fernet key from the app secret.

    If ``MFA_ENCRYPTION_KEY`` is explicitly set in the environment, use that
    directly (must be a valid Fernet key — 32 bytes, URL-safe base64).
    Otherwise derive deterministically from ``SECRET_KEY``.
    """
    explicit = getattr(settings, "MFA_ENCRYPTION_KEY", None)
    if explicit:
        return explicit.encode()

    # SHA-256 the secret to get exactly 32 bytes, then base64-encode for Fernet
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(raw)


def _get_fernet() -> Fernet:
    return Fernet(_derive_fernet_key())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string and return a prefixed ciphertext string.

    If the value is already encrypted (starts with ``enc:``), return as-is.
    """
    if plaintext.startswith(_PREFIX):
        return plaintext  # already encrypted
    token = _get_fernet().encrypt(plaintext.encode())
    return f"{_PREFIX}{token.decode()}"


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a prefixed ciphertext string back to plaintext.

    If the value does NOT have the ``enc:`` prefix, it is treated as a
    legacy plaintext value and returned as-is (caller should re-encrypt).
    """
    if not ciphertext.startswith(_PREFIX):
        # Legacy plaintext — return as-is so TOTP verification still works
        return ciphertext
    try:
        token = ciphertext[len(_PREFIX) :].encode()
        return _get_fernet().decrypt(token).decode()
    except InvalidToken:
        logger.error("Failed to decrypt value — key may have been rotated")
        raise ValueError("Decryption failed; the encryption key may have changed")


def is_encrypted(value: Optional[str]) -> bool:
    """Check whether a value carries the encryption prefix."""
    return value is not None and value.startswith(_PREFIX)
