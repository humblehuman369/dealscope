"""
Shared test fixtures for DealGapIQ backend tests.
"""
import os
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock, AsyncMock

# Set test environment before importing app modules (preserve CI DATABASE_URL if set)
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-characters-long-for-testing"
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test_db")

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.user import User, UserProfile
from app.models.session import UserSession
from app.models.role import Role, Permission, RolePermission, UserRole
from app.models.audit_log import AuditLog
from app.models.verification_token import VerificationToken
from app.services.auth_service import AuthService, auth_service
from app.services.token_service import TokenService, token_service
from app.services.session_service import SessionService, session_service
from app.repositories.user_repository import UserRepository, user_repo
from app.repositories.session_repository import SessionRepository, session_repo
from app.repositories.role_repository import RoleRepository, role_repo
from app.repositories.audit_repository import AuditRepository, audit_repo
from app.repositories.token_repository import TokenRepository, token_repo


# Use in-memory SQLite for testing (with async driver)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def async_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a database session for testing."""
    factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def seeded_roles(db_session: AsyncSession) -> dict:
    """Seed default roles and return a name->Role mapping."""
    roles = {}
    for name, desc in [
        ("owner", "Full access"),
        ("admin", "Admin access"),
        ("member", "Standard user"),
        ("viewer", "Read-only"),
    ]:
        role = Role(name=name, description=desc)
        db_session.add(role)
        roles[name] = role
    await db_session.flush()
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
    """Create a test user in the database with member role."""
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
