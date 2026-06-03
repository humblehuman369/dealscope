"""Round-trip test for the Postgres-backed document storage backend."""

import io

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.services.storage_service import PostgresStorage

pytestmark = pytest.mark.asyncio


async def test_postgres_storage_round_trip(async_engine, monkeypatch):
    # PostgresStorage resolves its DB session via
    # ``app.db.session.get_session_factory`` at call time, so patching that
    # attribute deterministically points the backend at the test database.
    import app.db.session as db_session_module

    factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(db_session_module, "get_session_factory", lambda: factory)

    storage = PostgresStorage()
    payload = b"%PDF-1.4 fake contract bytes"

    # upload → returns a date-organized, path-style key under the prefix
    key = await storage.upload(
        file=io.BytesIO(payload),
        filename="contract.pdf",
        content_type="application/pdf",
        path_prefix="documents/user-123",
    )
    assert key.startswith("documents/user-123/")
    assert key.endswith(".pdf")

    # download → exact bytes back
    assert await storage.download(key) == payload

    # delete → True the first time, False once the row is gone
    assert await storage.delete(key) is True
    assert await storage.delete(key) is False

    # download after delete → FileNotFoundError
    with pytest.raises(FileNotFoundError):
        await storage.download(key)
