"""Seed missing admin permissions (admin:stats, admin:assumptions, admin:metrics)

These permissions are required by admin router endpoints but were
omitted from the original RBAC seed migration (20260206_0001).

Revision ID: 20260210_0001
Revises: 20260207_0001
Create Date: 2026-02-10 04:00:00.000000

"""
import uuid

from alembic import op
from sqlalchemy import text

# revision identifiers
revision = "20260210_0001"
down_revision = "20260207_0001"
branch_labels = None
depends_on = None


MISSING_PERMS = [
    ("admin:stats", "View platform statistics"),
    ("admin:assumptions", "Manage default assumptions"),
    ("admin:metrics", "View metrics glossary"),
]


def upgrade() -> None:
    conn = op.get_bind()

    # Get admin and owner role IDs (both should receive all admin permissions)
    admin_role_id = None
    owner_role_id = None

    row = conn.execute(text("SELECT id FROM roles WHERE name = 'admin'")).fetchone()
    if row:
        admin_role_id = row[0]

    row = conn.execute(text("SELECT id FROM roles WHERE name = 'owner'")).fetchone()
    if row:
        owner_role_id = row[0]

    # Fixed namespace for deterministic seed UUIDs (matches 20260206_0001).
    _NS = uuid.UUID("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")

    def _seed_id(*parts: str) -> uuid.UUID:
        return uuid.uuid5(_NS, ":".join(parts))

    for codename, description in MISSING_PERMS:
        # Skip if permission already exists
        existing = conn.execute(
            text("SELECT id FROM permissions WHERE codename = :codename"),
            {"codename": codename},
        ).fetchone()

        if existing:
            perm_id = existing[0]
        else:
            perm_id = _seed_id("perm", codename)
            conn.execute(
                text("INSERT INTO permissions (id, codename, description) VALUES (:id, :codename, :desc)"),
                {"id": str(perm_id), "codename": codename, "desc": description},
            )

        # Assign to admin and owner roles
        for role_name, role_id in [("admin", admin_role_id), ("owner", owner_role_id)]:
            if role_id is None:
                continue
            already = conn.execute(
                text("SELECT 1 FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"),
                {"rid": str(role_id), "pid": str(perm_id)},
            ).fetchone()
            if not already:
                conn.execute(
                    text("INSERT INTO role_permissions (id, role_id, permission_id) VALUES (:id, :rid, :pid)"),
                    {"id": str(_seed_id("role_perm", role_name, codename)), "rid": str(role_id), "pid": str(perm_id)},
                )


def downgrade() -> None:
    conn = op.get_bind()
    for codename, _ in MISSING_PERMS:
        row = conn.execute(
            text("SELECT id FROM permissions WHERE codename = :codename"),
            {"codename": codename},
        ).fetchone()
        if row:
            perm_id = row[0]
            conn.execute(
                text("DELETE FROM role_permissions WHERE permission_id = :pid"),
                {"pid": str(perm_id)},
            )
            conn.execute(
                text("DELETE FROM permissions WHERE id = :id"),
                {"id": str(perm_id)},
            )
