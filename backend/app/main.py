"""
InvestIQ - Real Estate Investment Analytics API
Main FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
import logging
import os
import sys

# Configure structured JSON logging for production, human-readable for dev
_log_level = logging.INFO

try:
    from pythonjsonlogger import jsonlogger

    _json_handler = logging.StreamHandler(sys.stdout)
    _json_handler.setFormatter(
        jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    )
    logging.root.handlers = [_json_handler]
    logging.root.setLevel(_log_level)
except ImportError:
    # Fallback to plain text if python-json-logger is not installed
    logging.basicConfig(
        level=_log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
    )

logger = logging.getLogger(__name__)

# Log startup immediately
logger.info("=" * 50)
logger.info("INVESTIQ API LOADING...")
logger.info(f"Python version: {sys.version}")
logger.info(f"PORT env: {os.environ.get('PORT', 'not set')}")
logger.info("=" * 50)

try:
    from app.core.config import settings
    from app.core.deps import DbSession
    logger.info("Config loaded successfully")
except Exception as e:
    logger.error(f"Failed to load config: {e}")
    raise

# ===========================================
# Sentry Integration (Error Tracking)
# ===========================================
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            send_default_pii=False,  # Don't send personally identifiable information
        )
        logger.info(f"Sentry initialized for environment: {settings.ENVIRONMENT}")
    except ImportError:
        logger.warning("sentry-sdk not installed, error tracking disabled")
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
else:
    logger.info("SENTRY_DSN not configured, error tracking disabled")

# Import database session for cleanup
try:
    from app.db.session import close_db
    logger.info("Database session module loaded")
except Exception as e:
    logger.warning(f"Database session not available (OK for initial setup): {e}")
    close_db = None


# Lifespan context manager (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup and cleanup on shutdown."""
    # Startup
    logger.info("Starting InvestIQ API lifespan...")
    logger.info(f"RentCast API configured: {'Yes' if settings.RENTCAST_API_KEY else 'No'}")
    logger.info(f"AXESSO API configured: {'Yes' if settings.AXESSO_API_KEY else 'No'}")
    logger.info(f"Database configured: {'Yes' if settings.DATABASE_URL else 'No'}")
    logger.info(f"Auth enabled: {'Yes' if settings.FEATURE_AUTH_REQUIRED else 'Optional'}")
    
    # Log DATABASE_URL format (masked for security) to debug Railway connection
    if settings.DATABASE_URL:
        db_url = settings.DATABASE_URL
        if "@" in db_url and "/" in db_url:
            host_part = db_url.split("@")[1].split("/")[0] if "@" in db_url else "unknown"
            logger.info(f"Database host: {host_part}")
            logger.info(f"Is Railway URL: {'railway' in db_url.lower()}")
            logger.info(f"Is production: {settings.is_production}")
    
    # Create database tables if they don't exist
    if settings.DATABASE_URL:
        try:
            from app.db.base import Base
            from app.db.session import get_engine
            engine = get_engine()
            async with engine.begin() as conn:
                import app.models  # noqa: F401 — register ALL models with SQLAlchemy
                await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
    
    # Run cleanup tasks (expired sessions, tokens, old audit logs) once at startup.
    # In production, wire these into a cron schedule (e.g. Railway cron, APScheduler).
    try:
        from app.tasks.cleanup import run_all_cleanup
        import asyncio
        cleanup_result = await run_all_cleanup()
        logger.info(f"Startup cleanup completed: {cleanup_result}")
    except Exception as e:
        logger.warning(f"Startup cleanup failed (non-fatal): {e}")

    # Check WeasyPrint availability for PDF exports
    try:
        from app.services.property_report_pdf import _ensure_weasyprint
        _ensure_weasyprint()
        logger.info("WeasyPrint: AVAILABLE — PDF report generation enabled")
    except Exception as exc:
        logger.warning(f"WeasyPrint: NOT AVAILABLE — PDF exports will fail. Error: {exc}")

    logger.info("Lifespan startup complete - yielding to app")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down InvestIQ API...")
    if close_db:
        await close_db()
        logger.info("Database connections closed")


# Create FastAPI app with lifespan
app = FastAPI(
    title="InvestIQ API",
    description="""
    Real Estate Investment Analytics Platform - Analyze properties across 6 investment strategies.
    
    ## Features
    - **Property Search**: Fetch property data from RentCast & AXESSO APIs
    - **6 Strategy Analysis**: LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale
    - **User Authentication**: Register, login, profile management
    - **Saved Properties**: Save and track properties with custom adjustments
    - **Document Storage**: Upload documents for each property
    - **Sharing**: Generate shareable links for property analysis
    
    ## Authentication
    Protected endpoints require a Bearer token. Get a token via `/api/v1/auth/login`.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://investiq[a-z0-9-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================================
# Prometheus Metrics
# ===========================================
try:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        excluded_handlers=["/health", "/health/ready", "/health/deep", "/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    logger.info("Prometheus metrics enabled at /metrics")
except ImportError:
    logger.info("prometheus-fastapi-instrumentator not installed, metrics disabled")
except Exception as e:
    logger.warning(f"Failed to initialize Prometheus metrics: {e}")

# Security and performance middleware
try:
    from app.core.middleware import (
        RateLimitMiddleware,
        SecurityHeadersMiddleware,
        RequestTimingMiddleware,
        CSRFMiddleware,
        RequestIDMiddleware,
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        default_limit=settings.RATE_LIMIT_REQUESTS,
        default_period=settings.RATE_LIMIT_PERIOD,
    )
    logger.info("Security middleware enabled: rate limiting, CSRF, security headers, request timing, request ID")
except Exception as e:
    logger.warning(f"Could not load security middleware: {e}")


# ============================================
# GLOBAL EXCEPTION HANDLERS
# ============================================

from app.core.exceptions import (
    InvestIQError,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ExternalAPIError,
    RateLimitError,
    SubscriptionError,
)
from fastapi import Request
from fastapi import status as http_status


@app.exception_handler(InvestIQError)
async def investiq_error_handler(request: Request, exc: InvestIQError):
    """Handle all InvestIQ custom exceptions with canonical error shape."""
    status_code = http_status.HTTP_500_INTERNAL_SERVER_ERROR
    
    if isinstance(exc, NotFoundError):
        status_code = http_status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ValidationError):
        status_code = http_status.HTTP_422_UNPROCESSABLE_ENTITY
    elif isinstance(exc, AuthenticationError):
        status_code = http_status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, AuthorizationError):
        status_code = http_status.HTTP_403_FORBIDDEN
    elif isinstance(exc, RateLimitError):
        status_code = http_status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(exc, ExternalAPIError):
        status_code = http_status.HTTP_503_SERVICE_UNAVAILABLE
    elif isinstance(exc, SubscriptionError):
        status_code = http_status.HTTP_402_PAYMENT_REQUIRED
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions with consistent format."""
    logger.exception(f"Unhandled exception: {exc}")
    
    detail = str(exc) if settings.DEBUG else "An unexpected error occurred"
    
    return JSONResponse(
        status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": detail,
                "details": {},
            }
        },
    )


# ============================================
# INCLUDE ALL ROUTERS
# ============================================

def _try_load_router(name: str, import_path: str):
    """Load a router module, returning None on failure."""
    try:
        import importlib
        mod = importlib.import_module(import_path)
        logger.info(f"{name} router loaded successfully")
        return mod.router
    except Exception as e:
        logger.warning(f"{name} router failed to load: {e}")
        return None


# Core routers (always attempt)
_routers = [
    ("Auth",             "app.routers.auth"),
    ("Users",            "app.routers.users"),
    ("Saved Properties", "app.routers.saved_properties"),
    ("Admin",            "app.routers.admin"),
    ("Property",         "app.routers.property"),
    ("Health",           "app.routers.health"),
    ("Analytics",        "app.routers.analytics"),
    ("Worksheet",        "app.routers.worksheet"),
    ("Comparison",       "app.routers.comparison"),
    ("LOI",              "app.routers.loi"),
    ("Search History",   "app.routers.search_history"),
    ("Reports",          "app.routers.reports"),
    ("Proforma",         "app.routers.proforma"),
    ("Documents",        "app.routers.documents"),
    ("Billing",          "app.routers.billing"),
    ("Sync",             "app.routers.sync"),
    ("Defaults",         "app.routers.defaults"),
    ("Devices",          "app.routers.devices"),
]

for name, path in _routers:
    _r = _try_load_router(name, path)
    if _r is not None:
        # LOI router uses a prefix override
        if name == "LOI":
            app.include_router(_r, prefix="/api/v1")
        else:
            app.include_router(_r)
        logger.info(f"{name} router included")


# ============================================
# HEALTH CHECK (enhanced with dependency checks)
# ============================================

async def check_database_connection() -> dict:
    """Check database connectivity."""
    try:
        from app.db.session import get_engine
        from sqlalchemy import text
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "latency_ms": None}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "error", "error": str(e)}


async def check_redis_connection() -> dict:
    """Check Redis connectivity."""
    try:
        from app.services.cache_service import cache_service
        if cache_service.use_redis and cache_service.redis_client:
            await cache_service.redis_client.ping()
            return {"status": "ok"}
        else:
            return {"status": "unavailable", "note": "using in-memory cache"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {"status": "error", "error": str(e)}


@app.get("/health")
async def health_check():
    """Health check endpoint with dependency status."""
    db_status = await check_database_connection()
    redis_status = await check_redis_connection()
    
    db_ok = db_status.get("status") == "ok"
    redis_ok = redis_status.get("status") in ["ok", "unavailable"]
    
    if db_ok and redis_ok:
        overall_status = "healthy"
    elif db_ok:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    return {
        "status": overall_status,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {"database": db_status, "redis": redis_status},
        "features": {
            "auth_required": settings.FEATURE_AUTH_REQUIRED,
            "dashboard_enabled": settings.FEATURE_DASHBOARD_ENABLED,
            "document_upload": settings.FEATURE_DOCUMENT_UPLOAD_ENABLED,
            "sharing": settings.FEATURE_SHARING_ENABLED,
        },
    }


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "InvestIQ API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "strategies": ["Long-Term Rental", "Short-Term Rental", "BRRRR", "Fix & Flip", "House Hacking", "Wholesale"],
        "endpoints": {"auth": "/api/v1/auth", "users": "/api/v1/users", "properties": "/api/v1/properties", "analytics": "/api/v1/analytics", "loi": "/api/v1/loi"},
    }


@app.get("/api/v1/market/assumptions")
async def get_market_assumptions(
    zip_code: str = Query(..., description="ZIP code to get market-specific assumptions for")
):
    """Get market-specific default assumptions based on zip code."""
    try:
        from app.services.assumptions_service import get_market_adjustments
        adjustments = get_market_adjustments(zip_code)
        return {"success": True, "data": adjustments}
    except Exception as e:
        logger.error(f"Market assumptions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LOCAL DEVELOPMENT
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
