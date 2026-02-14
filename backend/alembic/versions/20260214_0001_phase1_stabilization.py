"""Phase 1 stabilization: add unique address constraint, encrypt MFA secrets

Adds a partial unique index on saved_properties(user_id, full_address)
to prevent duplicate property saves at the database level, eliminating
the TOCTOU race condition in the application-level duplicate check.

Also encrypts any legacy plaintext MFA secrets that were stored before
field-level encryption was introduced.

Revision ID: 20260214_0001
Revises: 20260212_0001
Create Date: 2026-02-14 12:00:00.000000

"""
import logging

from alembic import op
from sqlalchemy import text

# revision identifiers
revision = "20260214_0001"
down_revision = "20260212_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)


def upgrade() -> None:
    """Add unique address constraint and encrypt plaintext MFA secrets."""

    # 1. Partial unique index on (user_id, full_address) WHERE full_address IS NOT NULL
    #    Prevents duplicate property saves for the same user + address combination.
    #    Works alongside the existing uq_saved_properties_user_zpid index.
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_properties_user_address
        ON saved_properties (user_id, full_address)
        WHERE full_address IS NOT NULL
    """)

    # 2. Encrypt any legacy plaintext MFA secrets.
    #    Encrypted secrets start with "enc:" prefix; anything without it is plaintext.
    conn = op.get_bind()
    rows = conn.execute(text("""
        SELECT id, mfa_secret FROM users
        WHERE mfa_secret IS NOT NULL
          AND mfa_secret != ''
          AND mfa_secret NOT LIKE 'enc:%'
    """)).fetchall()

    if rows:
        logger.info("Encrypting %d legacy plaintext MFA secrets", len(rows))
        try:
            # Import encryption utilities — available because alembic runs
            # with the app on sys.path (prepend_sys_path = . in alembic.ini).
            from app.core.encryption import encrypt_value

            for row in rows:
                user_id, plaintext_secret = row[0], row[1]
                encrypted = encrypt_value(plaintext_secret)
                conn.execute(
                    text("UPDATE users SET mfa_secret = :secret WHERE id = :uid"),
                    {"secret": encrypted, "uid": user_id},
                )
            logger.info("Successfully encrypted %d MFA secrets", len(rows))
        except Exception:
            logger.exception(
                "Failed to encrypt MFA secrets — they remain as plaintext. "
                "Run the encrypt_mfa_secrets cleanup task manually."
            )


def downgrade() -> None:
    """Remove address uniqueness constraint.

    NOTE: MFA secret encryption is NOT reversed — decryption still works
    transparently via the ``decrypt_value`` fallback for plaintext values.
    """
    op.execute("DROP INDEX IF EXISTS uq_saved_properties_user_address")
