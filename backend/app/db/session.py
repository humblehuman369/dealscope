"""
Database session management for async SQLAlchemy.
Provides connection pooling and session dependency for FastAPI.
Uses lazy initialization to allow app to start without database.

Note: Using psycopg3 driver instead of asyncpg for better SSL handling.

Connection Pooling Strategy:
- Persistent containers (Railway, Docker, bare-metal): QueuePool for connection reuse
- True serverless (Lambda, Vercel edge): NullPool to avoid pool exhaustion across cold starts
- Override: set DB_USE_NULL_POOL=true to force NullPool regardless of environment
"""

import logging
import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy engine initialization
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker | None = None


def _should_use_null_pool() -> bool:
    """Determine whether to disable client-side connection pooling.

    Railway containers are long-lived processes — they benefit from QueuePool
    just like any traditional server.  NullPool is only appropriate for true
    serverless runtimes where the process may be frozen/destroyed between
    invocations and stale pooled connections would cause errors.
    """
    explicit = os.environ.get("DB_USE_NULL_POOL", "").lower()
    if explicit in ("true", "1", "yes"):
        return True
    if explicit in ("false", "0", "no"):
        return False

    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return True
    if os.environ.get("VERCEL"):
        return True
    return False


def get_engine() -> AsyncEngine:
    """Get or create the async database engine (lazy initialization)."""
    global _engine
    if _engine is None:
        logger.info("Creating database engine...")

        db_url = settings.async_database_url

        # Detect connection type
        # Private Railway network (railway.internal) does NOT use SSL
        # Public endpoints require SSL
        is_private_railway = "railway.internal" in (settings.DATABASE_URL or "")
        is_public_endpoint = "up.railway.app" in (settings.DATABASE_URL or "") or "proxy.rlwy.net" in (
            settings.DATABASE_URL or ""
        )

        if is_private_railway:
            logger.info("SSL mode: disabled (Railway private network)")
        elif is_public_endpoint:
            if "sslmode=" not in db_url:
                separator = "&" if "?" in db_url else "?"
                db_url = f"{db_url}{separator}sslmode=require"
            logger.info("SSL mode: require (Railway public endpoint)")
        else:
            logger.info("SSL mode: disabled (local/other)")

        if "@" in db_url:
            url_start = db_url.split("://")[0]
            url_end = db_url.split("@")[-1]
            logger.info(f"Database URL: {url_start}://***@{url_end}")

        use_null_pool = _should_use_null_pool()

        if use_null_pool:
            logger.info("Connection pooling: NullPool (serverless environment)")
            _engine = create_async_engine(
                db_url,
                echo=settings.DEBUG,
                pool_pre_ping=True,
                poolclass=NullPool,
            )
        else:
            # Scale per-worker pool so total connections stay within DB limits.
            # Total max connections = WEB_CONCURRENCY × (pool_size + max_overflow)
            # Railway Postgres default limit: ~100 connections.
            workers = max(1, settings.WEB_CONCURRENCY)
            pool_size = max(2, settings.DB_POOL_SIZE // workers)
            max_overflow = max(3, settings.DB_MAX_OVERFLOW // workers)

            logger.info(
                f"Connection pooling: QueuePool (pool_size={pool_size}, "
                f"max_overflow={max_overflow}, workers={workers}, "
                f"total_max={workers * (pool_size + max_overflow)})"
            )
            _engine = create_async_engine(
                db_url,
                echo=settings.DEBUG,
                pool_pre_ping=True,
                poolclass=AsyncAdaptedQueuePool,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_timeout=settings.DB_POOL_TIMEOUT,
                pool_recycle=1800,
            )

        logger.info("Database engine created successfully")
    return _engine


def get_session_factory() -> async_sessionmaker:
    """Get or create the async session factory (lazy initialization)."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.

    **Transaction policy**: This dependency does NOT auto-commit.
    Services are responsible for calling ``await db.commit()`` explicitly
    after successful mutations.  If the request raises an exception the
    session is rolled back automatically, ensuring no partial state is
    persisted.

    Usage::

        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connections on shutdown."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        logger.info("Database connections closed")
