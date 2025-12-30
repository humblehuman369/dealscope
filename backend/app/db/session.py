"""
Database session management for async SQLAlchemy.
Provides connection pooling and session dependency for FastAPI.
Uses lazy initialization to allow app to start without database.
"""

from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker, AsyncEngine
from sqlalchemy.pool import NullPool
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy engine initialization
_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker] = None


def get_engine() -> AsyncEngine:
    """Get or create the async database engine (lazy initialization)."""
    global _engine
    if _engine is None:
        logger.info(f"Creating database engine...")
        
        db_url = settings.async_database_url
        connect_args = {}
        
        # For Railway: always use SSL with asyncpg's native handling
        # asyncpg expects ssl=True or ssl='require', not URL-based sslmode
        is_railway = "railway" in (settings.DATABASE_URL or "").lower()
        # Check if using public Railway endpoint (requires SSL)
        is_public_endpoint = "up.railway.app" in (settings.DATABASE_URL or "") or "proxy.rlwy.net" in (settings.DATABASE_URL or "")
        
        if is_public_endpoint:
            # Public Railway endpoints REQUIRE SSL
            connect_args["ssl"] = "require"
            logger.info("SSL mode: require (public Railway endpoint)")
        elif is_railway or settings.is_production:
            # Internal Railway or other production - prefer SSL
            connect_args["ssl"] = "prefer"
            logger.info("SSL mode: prefer (asyncpg native)")
        
        _engine = create_async_engine(
            db_url,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            # Use NullPool for Railway/serverless to avoid connection pool issues
            poolclass=NullPool,
            connect_args=connect_args,
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
