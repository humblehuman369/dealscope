"""Postgres fixtures for integration tests.

The root ``tests/conftest.py`` already provisions a real Postgres database
(configured ``DATABASE_URL`` when reachable, testcontainers as fallback),
applies Alembic migrations, and provides per-test rollback isolation via
``db_session``. ``pg_session`` is kept as an alias so the integration tests
keep their explicit "this runs on real Postgres" naming.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def pg_session(db_session: AsyncSession) -> AsyncSession:
    return db_session
