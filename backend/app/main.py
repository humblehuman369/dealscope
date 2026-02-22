"""
DealGapIQ - Real Estate Investment Analytics API
Main FastAPI application entry point.
"""
# Bare print BEFORE any imports — visible even if imports crash
import sys, os, traceback as _tb  # noqa: E401
print(">>> MAIN.PY LOADING — Python", sys.version_info[:2], "PORT", os.environ.get("PORT"), flush=True)

try:
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from typing import Optional, List
    from datetime import datetime, timezone
    import logging
except Exception as _e:
    print(f">>> FATAL IMPORT ERROR: {_e}", flush=True)
    _tb.print_exc()
    sys.exit(1)

# Configure structured JSON logging for production, human-readable for dev.
# The RequestIDLogFilter (attached below) injects `request_id` into every
# record so logs can be correlated across a single HTTP request.
_log_level = logging.INFO

try:
    from pythonjsonlogger import jsonlogger

    _json_handler = logging.StreamHandler(sys.stdout)
    _json_handler.setFormatter(
        jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(request_id)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    )
    logging.root.handlers = [_json_handler]
    logging.root.setLevel(_log_level)
except ImportError:
    # Fallback to plain text if python-json-logger is not installed
    logging.basicConfig(
        level=_log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] %(message)s",
        stream=sys.stdout,
    )

# Attach correlation-ID filter to root logger so every module gets it
from app.core.middleware import RequestIDLogFilter  # noqa: E402
logging.root.addFilter(RequestIDLogFilter())

logger = logging.getLogger(__name__)

# Log startup immediately
logger.info("=" * 50)
logger.info("DEALGAPIQ API LOADING...")
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
    logger.info("Starting DealGapIQ API lifespan...")
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
    
    # Create database tables if they don't exist.
    # Wrapped in asyncio.wait_for so a slow/unreachable DB doesn't block
    # the entire lifespan — uvicorn can't accept connections until yield.
    import asyncio
    if settings.DATABASE_URL:
        try:
            async def _init_db():
                from app.db.base import Base
                from app.db.session import get_engine
                engine = get_engine()
                async with engine.begin() as conn:
                    import app.models  # noqa: F401 — register ALL models
                    await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified successfully")
            await asyncio.wait_for(_init_db(), timeout=15)
        except asyncio.TimeoutError:
            logger.error("Database table init timed out after 15s — continuing without DB verification")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
    
    # Run cleanup tasks (expired sessions, tokens, old audit logs) once at startup.
    # In production, wire these into a cron schedule (e.g. Railway cron, APScheduler).
    try:
        from app.tasks.cleanup import run_all_cleanup
        cleanup_result = await asyncio.wait_for(run_all_cleanup(), timeout=15)
        logger.info(f"Startup cleanup completed: {cleanup_result}")
    except asyncio.TimeoutError:
        logger.warning("Startup cleanup timed out after 15s (non-fatal)")
    except Exception as e:
        logger.warning(f"Startup cleanup failed (non-fatal): {e}")

    # Check WeasyPrint availability for PDF exports
    try:
        from app.services.property_report_pdf import _ensure_weasyprint
        _ensure_weasyprint()
        logger.info("WeasyPrint: AVAILABLE — PDF report generation enabled")
    except Exception as exc:
        logger.warning(f"WeasyPrint: NOT AVAILABLE — PDF exports will fail. Error: {exc}")

    # Start periodic cleanup scheduler (APScheduler)
    try:
        from app.tasks.scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler failed to start (non-fatal): {e}")

    # Flush stale property caches on deploy so updated extraction logic takes effect
    try:
        from app.services.cache_service import get_cache_service
        cache = get_cache_service()
        if cache.use_redis and cache.redis_client:
            keys = []
            async for key in cache.redis_client.scan_iter(match="property:*"):
                keys.append(key)
            async for key in cache.redis_client.scan_iter(match="prop_id:*"):
                keys.append(key)
            if keys:
                await cache.redis_client.delete(*keys)
                logger.info("Flushed %d stale property cache keys on deploy", len(keys))
            else:
                logger.info("No property cache keys to flush")
        else:
            logger.info("No Redis — in-memory cache already empty on startup")
    except Exception as e:
        logger.warning("Failed to flush property cache on startup (non-fatal): %s", e)

    logger.info("Lifespan startup complete - yielding to app")

    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down DealGapIQ API...")
    try:
        from app.tasks.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    if close_db:
        await close_db()
        logger.info("Database connections closed")


# Create FastAPI app with lifespan
app = FastAPI(
    title="DealGapIQ API",
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
    allow_origin_regex=r"https://dealgapiq[a-z0-9-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
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
        AuditLoggingMiddleware,
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(AuditLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        default_limit=settings.RATE_LIMIT_REQUESTS,
        default_period=settings.RATE_LIMIT_PERIOD,
    )
    logger.info("Security middleware enabled: rate limiting, CSRF, security headers, request timing, request ID, audit logging")
except Exception as e:
    logger.warning(f"Could not load security middleware: {e}")


# ============================================
# GLOBAL EXCEPTION HANDLERS
# ============================================

from app.core.exceptions import (
    DealGapIQError,
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


@app.exception_handler(DealGapIQError)
async def dealgapiq_error_handler(request: Request, exc: DealGapIQError):
    """Handle all DealGapIQ custom exceptions with canonical error shape."""
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


from fastapi.exceptions import HTTPException as StarletteHTTPException

_STATUS_TO_CODE = {
    400: "BAD_REQUEST",
    401: "AUTHENTICATION_ERROR",
    402: "PAYMENT_REQUIRED",
    403: "AUTHORIZATION_ERROR",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMIT_EXCEEDED",
}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Normalise all HTTPException responses into the canonical error shape."""
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        # Already in canonical shape — pass through
        return JSONResponse(status_code=exc.status_code, content=detail)

    code = _STATUS_TO_CODE.get(exc.status_code, "HTTP_ERROR")
    message = detail if isinstance(detail, str) else str(detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": {},
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
# Router manifest and import logic live in app.routers.__init__.
# No special-casing — every router defines its own prefix.

from app.routers import get_all_routers

for _name, _r in get_all_routers():
    app.include_router(_r)
    logger.info(f"{_name} router included")


# ============================================
# HEALTH CHECK FALLBACK
# ============================================
# The primary /health endpoint lives in app.routers.health (always returns 200).
# If that router failed to load, register a minimal fallback here so Railway's
# healthcheck never gets a 404.
try:
    _has_health = any(getattr(r, "path", "") == "/health" for r in app.routes)
except Exception:
    _has_health = False

if not _has_health:
    @app.get("/health")
    async def health_fallback():
        """Minimal fallback healthcheck (health router failed to load)."""
        return {"status": "healthy", "fallback": True}
    logger.warning("Health router did not load — registered fallback /health endpoint")


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "DealGapIQ API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "strategies": ["Long-Term Rental", "Short-Term Rental", "BRRRR", "Fix & Flip", "House Hacking", "Wholesale"],
        "endpoints": {"auth": "/api/v1/auth", "users": "/api/v1/users", "properties": "/api/v1/properties", "analytics": "/api/v1/analytics", "loi": "/api/v1/loi"},
    }



# ============================================
# LOCAL DEVELOPMENT
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
