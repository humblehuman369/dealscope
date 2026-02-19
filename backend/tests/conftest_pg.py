"""
Shared fixtures for integration tests that require a real PostgreSQL database.

Uses testcontainers to spin up a disposable Postgres instance so tests
exercise ARRAY, JSONB, CHECK constraints, partial indexes, and RETURNING
— none of which work reliably on SQLite.

Usage:
    Import this conftest in integration test files via explicit fixture
    request or by running ``pytest tests/integration/``.

    pytest tests/integration/ -v
"""

from __future__ import annotations

import asyncio
import os
from typing import AsyncGenerator, Generator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long-for-testing")


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def pg_url() -> Generator[str, None, None]:
    """Start a disposable Postgres container and yield the async URL."""
    try:
        from testcontainers.postgres import PostgresContainer
    except ImportError:
        pytest.skip("testcontainers[postgres] not installed")

    with PostgresContainer("postgres:16-alpine") as pg:
        sync_url = pg.get_connection_url()
        async_url = sync_url.replace("psycopg2", "psycopg", 1)
        if "postgresql://" in async_url and "+psycopg" not in async_url:
            async_url = async_url.replace("postgresql://", "postgresql+psycopg://", 1)
        os.environ["DATABASE_URL"] = sync_url
        yield async_url


@pytest.fixture(scope="session")
async def pg_engine(pg_url: str):
    """Create the async engine and initialise the schema once per session."""
    engine = create_async_engine(pg_url, echo=False)

    from app.db.base import Base
    import app.models  # noqa: F401 — register all models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def pg_session(pg_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a per-test database session with automatic rollback."""
    factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()
