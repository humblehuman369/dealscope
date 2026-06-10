"""Shared test fixtures for DealGapIQ backend tests.

The models declare Postgres-only column types (``UUID(as_uuid=True)``,
``ARRAY``, ``JSONB``), so the test database has to be Postgres — not
SQLite. Two ways the engine is sourced, in order:

1. If ``DATABASE_URL`` points at a reachable Postgres instance, we use
   it directly. CI provisions a Postgres service and exports
   ``DATABASE_URL`` to it, so this is the fast path in CI.
2. Otherwise, we spin up a disposable Postgres container via
   ``testcontainers`` (requires Docker locally). This keeps local
   ``pytest`` runs working without forcing developers to keep a
   Postgres service running.

Schema is materialised by running Alembic migrations against the chosen
database (matches what production does). Per-test isolation comes from
wrapping each test in a session whose work is rolled back in teardown.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator, Generator
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

# Set test environment before importing app modules
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-characters-long-for-testing"
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test_db")

# Force-import every model so Alembic and SQLAlchemy see the full metadata
# graph before any engine is created. Listed exhaustively so a missing
# `from app.models import X` in a service can never silently desync the
# test DB schema from production.
from app.models import (  # noqa: F401
    AdminAssumptionDefaults,
    AuditAction,
    AuditLog,
    BudgetExpense,
    BudgetLine,
    ContactRole,
    DevicePlatform,
    DeviceToken,
    Document,
    DocumentType,
    FlipStage,
    PaymentHistory,
    Permission,
    PropertyAdjustment,
    PropertyContact,
    PropertyStatus,
    PropertyTask,
    RehabBudget,
    Role,
    RolePermission,
    SavedProperty,
    SearchHistory,
    SharedLink,
    ShareType,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    TokenType,
    User,
    UserProfile,
    UserRole,
    UserSession,
    VerificationToken,
)
from app.repositories.role_repository import role_repo
from app.repositories.user_repository import user_repo
from app.services.auth_service import auth_service
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def _normalize_async_url(url: str) -> str:
    """Coerce a Postgres URL to use the async psycopg3 driver."""
    if "+psycopg" in url or "+asyncpg" in url:
        return url
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _is_reachable(sync_url: str, timeout: float = 2.0) -> bool:
    """Best-effort probe to see if the configured Postgres is up."""
    try:
        import psycopg
    except ImportError:
        return False
    try:
        # libpq requires an integer connect_timeout — passing a float raises
        # "bad value for connect_timeout", which would silently force the
        # Docker/testcontainers fallback even when Postgres is reachable.
        with psycopg.connect(sync_url, connect_timeout=int(timeout)):
            return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Session-scoped event loop so async fixtures can share state."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def database_url() -> Generator[str, None, None]:
    """Yield a Postgres async URL — preferring the configured DATABASE_URL."""
    configured = os.environ.get("DATABASE_URL", "")
    sync_probe_url = configured.replace("+psycopg", "").replace("+asyncpg", "").replace("+psycopg2", "")

    if configured and _is_reachable(sync_probe_url):
        yield _normalize_async_url(configured)
        return

    try:
        from testcontainers.postgres import PostgresContainer
    except ImportError:  # pragma: no cover - test deps only
        pytest.skip(
            "DATABASE_URL is not reachable and testcontainers[postgres] is not "
            "installed. Either start a local Postgres or `pip install "
            "'testcontainers[postgres]>=4.0'`."
        )

    with PostgresContainer("postgres:16-alpine") as pg:
        sync_url = pg.get_connection_url()
        async_url = _normalize_async_url(sync_url)
        os.environ["DATABASE_URL"] = async_url
        # Settings was instantiated at app-import time with the placeholder
        # URL; patch it so Alembic env.py (which reads
        # settings.async_database_url) targets the live container.
        from app.core.config import settings as _settings

        _settings.DATABASE_URL = async_url
        yield async_url


@pytest.fixture(scope="session")
async def async_engine(database_url: str):
    """Build the engine and apply Alembic migrations once per session."""
    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    # alembic/env.py overrides sqlalchemy.url with settings.async_database_url,
    # so the override here is belt-and-suspenders: the real source of truth
    # is os.environ["DATABASE_URL"] (which the database_url fixture has
    # already aligned with the chosen DB).
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    await asyncio.to_thread(command.upgrade, alembic_cfg, "head")

    engine = create_async_engine(database_url, echo=False, future=True)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session whose work is rolled back on teardown.

    Binds the session to a connection holding an outer transaction and uses
    ``join_transaction_mode="create_savepoint"`` so ``commit()`` calls made by
    the code under test only release a SAVEPOINT. The outer transaction is
    rolled back at teardown, reverting everything — including committed work.
    """
    async with async_engine.connect() as connection:
        outer = await connection.begin()
        factory = async_sessionmaker(
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        async with factory() as session:
            try:
                yield session
            finally:
                await session.rollback()
        await outer.rollback()


@pytest.fixture
async def seeded_roles(db_session: AsyncSession) -> dict:
    """Return the four default roles already seeded by Alembic migrations.

    The ``20260206_0001_rebuild_auth_system`` migration inserts the
    ``owner``/``admin``/``member``/``viewer`` rows (along with their
    permissions and role-permission mappings). We fetch them rather than
    re-insert to keep the test database in the same shape as production.
    """
    from sqlalchemy import select

    result = await db_session.execute(select(Role).where(Role.name.in_(["owner", "admin", "member", "viewer"])))
    roles = {r.name: r for r in result.scalars().all()}
    if len(roles) != 4:
        raise RuntimeError(
            "Default roles missing from the test DB — Alembic migrations did not seed them. "
            f"Found: {sorted(roles.keys())}"
        )
    return roles


@pytest.fixture
def sample_user_data() -> dict:
    return {
        "email": "test@example.com",
        "password": "SecurePassword123",
        "full_name": "Test User",
    }


@pytest.fixture
async def created_user(
    db_session: AsyncSession,
    seeded_roles: dict,
    sample_user_data: dict,
) -> User:
    """Create a test user in the database with the member role assigned."""
    user = await user_repo.create(
        db_session,
        email=sample_user_data["email"],
        hashed_password=auth_service.hash_password(sample_user_data["password"]),
        full_name=sample_user_data["full_name"],
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role(db_session, user.id, seeded_roles["member"].id)
    await db_session.flush()
    return user


@pytest.fixture
def mock_email_service():
    mock = MagicMock()
    mock.send_verification_email = AsyncMock(return_value={"success": True})
    mock.send_password_reset_email = AsyncMock(return_value={"success": True})
    mock.send_welcome_email = AsyncMock(return_value={"success": True})
    mock.send_password_changed_email = AsyncMock(return_value={"success": True})
    return mock
