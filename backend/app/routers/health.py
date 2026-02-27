"""
Health check router for monitoring and observability.

Provides:
- Basic health check (for load balancers)
- Deep health check (for monitoring systems)
- Readiness check (for Kubernetes-style deployments)
"""

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db, get_engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns simple status for load balancer health checks.
    This endpoint should always respond quickly.
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness check endpoint.

    Verifies that the application is ready to serve traffic.
    Checks database and Redis connectivity.
    """
    checks = {}
    overall_ready = True

    # Database check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        checks["database"] = f"error: {e!s}"
        overall_ready = False

    # Redis check (if configured)
    if settings.REDIS_URL:
        try:
            import redis.asyncio as redis

            redis_client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
            await redis_client.ping()
            await redis_client.close()
            checks["redis"] = "connected"
        except Exception as e:
            logger.warning(f"Redis check failed: {e}")
            checks["redis"] = f"error: {e!s}"
            # Redis failure is not critical for readiness
    else:
        checks["redis"] = "not_configured"

    return {
        "status": "ready" if overall_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/health/deep")
async def deep_health_check(db: AsyncSession = Depends(get_db)):
    """
    Deep health check endpoint.

    Performs comprehensive checks on all dependencies:
    - Database connectivity and query execution
    - External API availability (optional)
    - Configuration status

    Use this endpoint for detailed monitoring and alerting.
    """
    checks: dict[str, Any] = {}
    overall_status = "healthy"

    # 1. Database check
    try:
        result = await db.execute(text("SELECT version()"))
        version_row = result.fetchone()

        # Get table counts for basic data check
        user_count_result = await db.execute(text("SELECT COUNT(*) FROM users"))
        user_count = user_count_result.scalar()

        checks["database"] = {
            "status": "healthy",
            "version": version_row[0] if version_row else "unknown",
            "user_count": user_count,
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        overall_status = "degraded"

    # 2. External APIs — reachability probes (non-blocking, short timeout)
    import httpx

    async def _probe(name: str, url: str, timeout: float = 3.0) -> dict[str, Any]:
        """HEAD/GET probe with timeout. Returns status dict."""
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.head(url)
                return {"status": "reachable", "http_status": resp.status_code}
        except httpx.ConnectError:
            return {"status": "unreachable", "error": "connection refused"}
        except httpx.TimeoutException:
            return {"status": "unreachable", "error": "timeout"}
        except Exception as e:
            return {"status": "unknown", "error": str(e)}

    external_checks: dict[str, Any] = {}

    # RentCast
    if settings.RENTCAST_API_KEY:
        external_checks["rentcast"] = await _probe("rentcast", settings.RENTCAST_URL)
    else:
        external_checks["rentcast"] = {"status": "not_configured"}

    # AXESSO / Zillow
    if settings.AXESSO_API_KEY:
        external_checks["axesso"] = await _probe("axesso", settings.AXESSO_URL)
    else:
        external_checks["axesso"] = {"status": "not_configured"}

    # Stripe
    if settings.STRIPE_SECRET_KEY:
        external_checks["stripe"] = await _probe("stripe", "https://api.stripe.com/v1")
    else:
        external_checks["stripe"] = {"status": "not_configured"}

    # Redis
    if settings.REDIS_URL:
        try:
            import redis.asyncio as aioredis

            rc = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
            await rc.ping()
            await rc.close()
            external_checks["redis"] = {"status": "connected"}
        except Exception as e:
            external_checks["redis"] = {"status": "unreachable", "error": str(e)}
    else:
        external_checks["redis"] = {"status": "not_configured"}

    checks["external_services"] = external_checks

    # Flag overall as degraded if any critical service is unreachable
    for svc in ("rentcast", "axesso"):
        info = external_checks.get(svc, {})
        if info.get("status") == "unreachable":
            overall_status = "degraded"

    # 3. Configuration check
    config_issues = []

    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        config_issues.append("SECRET_KEY not set or too short")

    if settings.is_production:
        if "localhost" in settings.DATABASE_URL:
            config_issues.append("Using localhost database URL in production")
        if not settings.STRIPE_WEBHOOK_SECRET:
            config_issues.append("STRIPE_WEBHOOK_SECRET not set in production")

    checks["configuration"] = {
        "status": "healthy" if not config_issues else "warning",
        "environment": settings.ENVIRONMENT,
        "debug_mode": settings.DEBUG,
        "issues": config_issues if config_issues else None,
    }

    if config_issues and settings.is_production:
        overall_status = "degraded"

    # 4. Connection pool stats
    try:
        engine = get_engine()
        pool = engine.pool
        pool_status = pool.status()
        pool_info: dict[str, Any] = {"raw_status": pool_status}
        if hasattr(pool, "size"):
            pool_info["pool_size"] = pool.size()
            pool_info["checked_in"] = pool.checkedin()
            pool_info["checked_out"] = pool.checkedout()
            pool_info["overflow"] = pool.overflow()
            total = pool_info["checked_out"] + pool_info["overflow"]
            capacity = pool.size() + pool._max_overflow
            pool_info["utilization_pct"] = round(total / capacity * 100, 1) if capacity else 0
        checks["connection_pool"] = {"status": "healthy", **pool_info}
    except Exception as exc:
        logger.warning("Could not read connection pool stats: %s", exc)
        checks["connection_pool"] = {"status": "unknown", "error": str(exc)}

    # 5. Feature flags
    checks["features"] = {
        "auth_required": settings.FEATURE_AUTH_REQUIRED,
        "dashboard_enabled": settings.FEATURE_DASHBOARD_ENABLED,
        "document_upload_enabled": settings.FEATURE_DOCUMENT_UPLOAD_ENABLED,
        "sharing_enabled": settings.FEATURE_SHARING_ENABLED,
        "email_verification_required": settings.FEATURE_EMAIL_VERIFICATION_REQUIRED,
    }

    return {
        "status": overall_status,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": checks,
        "timestamp": datetime.now(UTC).isoformat(),
    }
