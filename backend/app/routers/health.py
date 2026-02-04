"""
Health check router for monitoring and observability.

Provides:
- Basic health check (for load balancers)
- Deep health check (for monitoring systems)
- Readiness check (for Kubernetes-style deployments)
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.core.config import settings

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
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
        checks["database"] = f"error: {str(e)}"
        overall_ready = False
    
    # Redis check (if configured)
    if settings.REDIS_URL:
        try:
            import redis.asyncio as redis
            redis_client = redis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            await redis_client.ping()
            await redis_client.close()
            checks["redis"] = "connected"
        except Exception as e:
            logger.warning(f"Redis check failed: {e}")
            checks["redis"] = f"error: {str(e)}"
            # Redis failure is not critical for readiness
    else:
        checks["redis"] = "not_configured"
    
    return {
        "status": "ready" if overall_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
    checks: Dict[str, Any] = {}
    overall_status = "healthy"
    
    # 1. Database check
    try:
        result = await db.execute(text("SELECT version()"))
        version_row = result.fetchone()
        
        # Get table counts for basic data check
        from sqlalchemy import func
        from app.models.user import User
        user_count_result = await db.execute(
            text("SELECT COUNT(*) FROM users")
        )
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
    
    # 2. External APIs check (optional - just check if configured)
    checks["external_apis"] = {
        "rentcast": {
            "configured": bool(settings.RENTCAST_API_KEY),
            "url": settings.RENTCAST_URL,
        },
        "axesso": {
            "configured": bool(settings.AXESSO_API_KEY),
            "url": settings.AXESSO_URL,
        },
        "stripe": {
            "configured": bool(settings.STRIPE_SECRET_KEY),
            "webhook_configured": bool(settings.STRIPE_WEBHOOK_SECRET),
        },
        "email": {
            "configured": bool(settings.RESEND_API_KEY),
            "from_address": settings.EMAIL_FROM,
        },
    }
    
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
    
    # 4. Feature flags
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
