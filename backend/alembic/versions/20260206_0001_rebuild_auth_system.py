"""Rebuild auth system: sessions, RBAC, audit logs, verification tokens

Adds new tables for the auth rebuild:
- user_sessions: server-side session tracking
- roles: named RBAC roles
- permissions: granular permission codenames
- role_permissions: join table
- user_roles: user-to-role assignment
- audit_logs: immutable security event log
- verification_tokens: hashed one-time tokens

Adds new columns to the users table:
- failed_login_attempts, locked_until, password_changed_at
- mfa_secret, mfa_enabled

Seeds default roles and permissions.
Migrates existing is_superuser users to the admin role.

Revision ID: 20260206_0001
Revises: 20260204_0001
Create Date: 2026-02-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

# revision identifiers, used by Alembic.
revision = "20260206_0001"
down_revision = "20260204_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. New columns on users
    # ------------------------------------------------------------------
    op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("mfa_secret", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("mfa_enabled", sa.Boolean(), server_default="false", nullable=False))

    # ------------------------------------------------------------------
    # 2. user_sessions
    # ------------------------------------------------------------------
    op.create_table(
        "user_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_token", sa.String(128), unique=True, nullable=False),
        sa.Column("refresh_token", sa.String(128), unique=True, nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("last_active_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_index("ix_user_sessions_session_token", "user_sessions", ["session_token"], unique=True)
    op.create_index("ix_user_sessions_refresh_token", "user_sessions", ["refresh_token"], unique=True)
    op.create_index("ix_user_sessions_user_active", "user_sessions", ["user_id", "is_revoked"])

    # ------------------------------------------------------------------
    # 3. roles
    # ------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # 4. permissions
    # ------------------------------------------------------------------
    op.create_table(
        "permissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("codename", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ------------------------------------------------------------------
    # 5. role_permissions
    # ------------------------------------------------------------------
    op.create_table(
        "role_permissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("role_id", UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission_id", UUID(as_uuid=True), sa.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    # ------------------------------------------------------------------
    # 6. user_roles
    # ------------------------------------------------------------------
    op.create_table(
        "user_roles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("granted_by", UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )

    # ------------------------------------------------------------------
    # 7. audit_logs
    # ------------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("ix_audit_logs_user_action", "audit_logs", ["user_id", "action"])

    # ------------------------------------------------------------------
    # 8. verification_tokens
    # ------------------------------------------------------------------
    op.create_table(
        "verification_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("token_type", sa.String(30), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_verification_tokens_user_id", "verification_tokens", ["user_id"])
    op.create_index("ix_verification_tokens_token_hash", "verification_tokens", ["token_hash"], unique=True)
    op.create_index("ix_verification_tokens_user_type", "verification_tokens", ["user_id", "token_type"])

    # ------------------------------------------------------------------
    # 9. Seed default roles & permissions, migrate is_superuser -> admin
    # ------------------------------------------------------------------
    _seed_roles_and_permissions()
    _migrate_superusers_to_admin_role()


def _seed_roles_and_permissions() -> None:
    """Insert the default roles and permissions.

    Uses deterministic UUIDs (uuid5 with a fixed namespace) so that
    downgrade → upgrade cycles produce the same IDs.  Without this,
    every upgrade would insert duplicate rows because uuid4() generates
    a new random ID each time.
    """
    from sqlalchemy import text

    # Fixed namespace for deterministic seed UUIDs.
    # Generated once, never change: uuid.uuid5(uuid.NAMESPACE_DNS, "dealscope.seed")
    _NS = uuid.UUID("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")

    def _seed_id(*parts: str) -> uuid.UUID:
        """Deterministic UUID from parts, e.g. _seed_id('role', 'owner')."""
        return uuid.uuid5(_NS, ":".join(parts))

    conn = op.get_bind()

    # Roles
    roles = {
        "owner": "Full platform owner with all permissions",
        "admin": "Administrative access to user and system management",
        "member": "Standard authenticated user",
        "viewer": "Read-only access",
    }
    role_ids = {}
    for name, description in roles.items():
        role_id = _seed_id("role", name)
        conn.execute(
            text("INSERT INTO roles (id, name, description) VALUES (:id, :name, :desc)"),
            {"id": str(role_id), "name": name, "desc": description},
        )
        role_ids[name] = role_id

    # Permissions
    perms = [
        ("properties:read", "View property data and analyses"),
        ("properties:write", "Save and modify properties"),
        ("properties:delete", "Delete saved properties"),
        ("documents:read", "View documents"),
        ("documents:write", "Upload and modify documents"),
        ("documents:delete", "Delete documents"),
        ("reports:read", "View reports"),
        ("reports:generate", "Generate new reports"),
        ("search:execute", "Execute property searches"),
        ("profile:read", "View own profile"),
        ("profile:write", "Edit own profile"),
        ("billing:read", "View billing information"),
        ("billing:manage", "Manage subscription and payments"),
        ("admin:users", "Manage all users"),
        ("admin:roles", "Manage roles and permissions"),
        ("admin:system", "Access system configuration"),
        ("admin:audit", "View audit logs"),
    ]
    perm_ids = {}
    for codename, description in perms:
        perm_id = _seed_id("perm", codename)
        conn.execute(
            text("INSERT INTO permissions (id, codename, description) VALUES (:id, :codename, :desc)"),
            {"id": str(perm_id), "codename": codename, "desc": description},
        )
        perm_ids[codename] = perm_id

    # Role -> Permission mappings
    role_perm_map = {
        "owner": list(perm_ids.keys()),
        "admin": list(perm_ids.keys()),
        "member": [
            "properties:read", "properties:write", "properties:delete",
            "documents:read", "documents:write", "documents:delete",
            "reports:read", "reports:generate",
            "search:execute",
            "profile:read", "profile:write",
            "billing:read", "billing:manage",
        ],
        "viewer": [
            "properties:read",
            "documents:read",
            "reports:read",
            "profile:read",
        ],
    }
    for role_name, perm_codenames in role_perm_map.items():
        for codename in perm_codenames:
            rp_id = _seed_id("role_perm", role_name, codename)
            conn.execute(
                text("INSERT INTO role_permissions (id, role_id, permission_id) VALUES (:id, :rid, :pid)"),
                {"id": str(rp_id), "rid": str(role_ids[role_name]), "pid": str(perm_ids[codename])},
            )


def _migrate_superusers_to_admin_role() -> None:
    """Assign existing is_superuser=True users to the admin role."""
    from sqlalchemy import text

    conn = op.get_bind()

    # Get admin role id
    result = conn.execute(text("SELECT id FROM roles WHERE name = 'admin'"))
    row = result.fetchone()
    if not row:
        return
    admin_role_id = row[0]

    # Get member role id
    result = conn.execute(text("SELECT id FROM roles WHERE name = 'member'"))
    row = result.fetchone()
    if not row:
        return
    member_role_id = row[0]

    # Assign admin role to superusers
    superusers = conn.execute(text("SELECT id FROM users WHERE is_superuser = true"))
    for su_row in superusers:
        ur_id = uuid.uuid4()
        conn.execute(
            text("INSERT INTO user_roles (id, user_id, role_id) VALUES (:id, :uid, :rid)"),
            {"id": str(ur_id), "uid": str(su_row[0]), "rid": str(admin_role_id)},
        )

    # Assign member role to all users who don't already have a role
    all_users = conn.execute(text(
        "SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM user_roles)"
    ))
    for user_row in all_users:
        ur_id = uuid.uuid4()
        conn.execute(
            text("INSERT INTO user_roles (id, user_id, role_id) VALUES (:id, :uid, :rid)"),
            {"id": str(ur_id), "uid": str(user_row[0]), "rid": str(member_role_id)},
        )


def downgrade() -> None:
    # Drop new tables in reverse order
    op.drop_table("verification_tokens")
    op.drop_table("audit_logs")
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("user_sessions")

    # Drop new columns from users
    op.drop_column("users", "mfa_enabled")
    op.drop_column("users", "mfa_secret")
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
