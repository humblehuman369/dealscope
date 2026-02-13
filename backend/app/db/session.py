"""
Database session management for async SQLAlchemy.
Provides connection pooling and session dependency for FastAPI.
Uses lazy initialization to allow app to start without database.

Note: Using psycopg3 driver instead of asyncpg for better SSL handling.

Connection Pooling Strategy:
- Local/standard deployments: Use QueuePool for connection reuse
- Railway/serverless: Use NullPool to avoid connection pool issues
"""

from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker, AsyncEngine
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
import logging
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy engine initialization
_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker] = None


def _is_serverless_environment() -> bool:
    """Detect if running in a serverless/Railway environment."""
    # Check for Railway-specific environment variables
    if os.environ.get("RAILWAY_ENVIRONMENT"):
        return True
    # Check for common serverless indicators
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return True
    if os.environ.get("VERCEL"):
        return True
    # Check if DATABASE_URL contains Railway indicators
    db_url = settings.DATABASE_URL or ""
    if "railway" in db_url.lower():
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
        is_public_endpoint = "up.railway.app" in (settings.DATABASE_URL or "") or "proxy.rlwy.net" in (settings.DATABASE_URL or "")
        
        if is_private_railway:
            # Private Railway network - NO SSL needed
            logger.info("SSL mode: disabled (Railway private network)")
        elif is_public_endpoint:
            # Public Railway endpoint - requires SSL
            if "sslmode=" not in db_url:
                separator = "&" if "?" in db_url else "?"
                db_url = f"{db_url}{separator}sslmode=require"
            logger.info("SSL mode: require (Railway public endpoint)")
        else:
            # Local development or other
            logger.info("SSL mode: disabled (local/other)")
        
        # Log URL pattern for debugging (mask credentials)
        if "@" in db_url:
            url_start = db_url.split("://")[0]
            url_end = db_url.split("@")[-1]
            logger.info(f"Database URL: {url_start}://***@{url_end}")
        
        # Determine pool strategy based on environment
        is_serverless = _is_serverless_environment()
        
        if is_serverless:
            # Serverless: Use NullPool to avoid connection pool issues
            # connect_timeout=10 prevents indefinite hangs on Railway cold starts
            logger.info("Connection pooling: NullPool (serverless environment)")
            _engine = create_async_engine(
                db_url,
                echo=settings.DEBUG,
                pool_pre_ping=True,
                poolclass=NullPool,
                connect_args={"connect_timeout": 10},
            )
        else:
            # Standard deployment: Use QueuePool for connection reuse
            logger.info(
                f"Connection pooling: QueuePool (pool_size={settings.DB_POOL_SIZE}, "
                f"max_overflow={settings.DB_MAX_OVERFLOW})"
            )
            _engine = create_async_engine(
                db_url,
                echo=settings.DEBUG,
                pool_pre_ping=True,
                poolclass=AsyncAdaptedQueuePool,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_timeout=settings.DB_POOL_TIMEOUT,
                pool_recycle=1800,  # Recycle connections after 30 minutes
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
    
    Usage:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database tables.
    Called on application startup if needed.
    
    Note: In production, use Alembic migrations instead.
    """
    from app.db.base import Base
    
    engine = get_engine()
    async with engine.begin() as conn:
        # Import all models to register them
        from app.models import user, saved_property, document  # noqa
        
        # Create tables (only for development)
        # await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized")


async def close_db() -> None:
    """Close database connections on shutdown."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        logger.info("Database connections closed")
