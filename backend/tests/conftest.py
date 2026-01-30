"""
Shared test fixtures for InvestIQ backend tests.
"""
import os
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock, AsyncMock

# Set test environment before importing app modules
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-characters-long-for-testing"
os.environ["DATABASE_URL"] = "postgresql+psycopg://test:test@localhost:5432/test_db"

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.user import User, UserProfile
from app.models.subscription import Subscription
from app.services.auth_service import AuthService


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
    async_session_maker = async_sessionmaker(
        async_engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest.fixture
def auth_service() -> AuthService:
    """Create an auth service instance for testing."""
    return AuthService()


@pytest.fixture
def sample_user_data() -> dict:
    """Sample user registration data."""
    return {
        "email": "test@example.com",
        "password": "SecurePassword123",
        "full_name": "Test User"
    }


@pytest.fixture
def sample_weak_passwords() -> list:
    """List of passwords that should fail validation."""
    return [
        "short",           # Too short
        "alllowercase1",   # No uppercase
        "ALLUPPERCASE1",   # No lowercase  
        "NoNumbers",       # No digit
        "12345678",        # No letters
    ]


@pytest.fixture
async def created_user(db_session: AsyncSession, auth_service: AuthService, sample_user_data: dict) -> User:
    """Create a test user in the database."""
    user, _ = await auth_service.register_user(
        db=db_session,
        email=sample_user_data["email"],
        password=sample_user_data["password"],
        full_name=sample_user_data["full_name"]
    )
    await db_session.commit()
    return user


@pytest.fixture
def mock_email_service():
    """Mock email service for testing."""
    mock = MagicMock()
    mock.send_verification_email = AsyncMock(return_value={"success": True})
    mock.send_password_reset_email = AsyncMock(return_value={"success": True})
    mock.send_welcome_email = AsyncMock(return_value={"success": True})
    return mock
