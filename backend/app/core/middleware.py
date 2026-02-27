"""
Middleware stack: rate limiting, security headers, CSRF protection,
request timing, request-ID injection, and correlation-ID logging.
"""

import contextvars
import logging
import secrets
import time
import uuid
from collections import defaultdict
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Correlation / Request-ID context (async-safe via contextvars)
# ---------------------------------------------------------------------------

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIDLogFilter(logging.Filter):
    """Inject the current ``request_id`` into every log record.

    Attach this filter to the root logger so all messages automatically
    include a ``request_id`` field — useful for correlating logs across
    a single HTTP request in both human-readable and JSON formats.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")  # type: ignore[attr-defined]
        return True


# ============================================
# RATE LIMITING MIDDLEWARE
# ============================================


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter with optional Redis backend."""

    def __init__(self, app, default_limit: int = 100, default_period: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.default_period = default_period
        self.requests: dict[str, list] = defaultdict(list)
        self._redis_client = None
        self._redis_available = None

        self.route_limits: dict[str, tuple] = {
            "/api/v1/auth/login": (5, 60),
            "/api/v1/auth/login/mfa": (10, 60),
            "/api/v1/auth/register": (3, 60),
            "/api/v1/auth/forgot-password": (3, 60),
            "/api/v1/auth/reset-password": (5, 60),
            "/api/v1/auth/refresh": (20, 60),
            "/api/v1/properties/search": (30, 60),
        }

    async def _get_redis_client(self):
        if self._redis_available is None:
            if settings.REDIS_URL:
                try:
                    import redis.asyncio as aioredis

                    self._redis_client = aioredis.from_url(
                        settings.REDIS_URL,
                        encoding="utf-8",
                        decode_responses=True,
                        socket_connect_timeout=2,
                        socket_timeout=2,
                    )
                    await self._redis_client.ping()
                    self._redis_available = True
                    logger.info(
                        "Rate limiter using Redis (shared across workers): %s",
                        settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else "localhost",
                    )
                except Exception as e:
                    logger.warning(
                        "Redis not available for rate limiting, falling back to in-memory (per-worker) counters: %s",
                        e,
                    )
                    self._redis_available = False
            else:
                logger.info("REDIS_URL not set; rate limiter using in-memory counters (per-worker)")
                self._redis_available = False
        return self._redis_client if self._redis_available else None

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        return f"rl:{ip}:{request.url.path}"

    def _limits(self, path: str) -> tuple:
        for prefix, lim in self.route_limits.items():
            if path.startswith(prefix):
                return lim
        return (self.default_limit, self.default_period)

    async def _check_redis(self, key: str, limit: int, period: int) -> tuple:
        redis = await self._get_redis_client()
        if not redis:
            return await self._check_memory(key, limit, period)
        try:
            now = time.time()
            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, now - period)
            pipe.zcard(key)
            pipe.zadd(key, {f"{now}:{id(self)}": now})
            pipe.expire(key, period + 1)
            results = await pipe.execute()
            count = results[1]
            if count >= limit:
                oldest = await redis.zrange(key, 0, 0, withscores=True)
                retry = int(period - (now - oldest[0][1])) + 1 if oldest else period
                return True, max(retry, 1)
            return False, 0
        except Exception:
            return await self._check_memory(key, limit, period)

    async def _check_memory(self, key: str, limit: int, period: int) -> tuple:
        now = time.time()
        window = now - period
        self.requests[key] = [(t, c) for t, c in self.requests[key] if t >= window]
        total = sum(c for _, c in self.requests[key])
        if total >= limit:
            oldest = min((t for t, _ in self.requests[key]), default=now)
            retry = int(period - (now - oldest)) + 1
            return True, max(retry, 1)
        self.requests[key].append((now, 1))
        return False, 0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        skip = ("/health", "/docs", "/redoc", "/openapi.json", "/metrics")
        if any(request.url.path.startswith(p) for p in skip):
            return await call_next(request)

        key = self._client_key(request)
        limit, period = self._limits(request.url.path)
        limited, retry = await self._check_redis(key, limit, period)
        if limited:
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests.",
                    "details": {"retry_after": retry},
                },
                headers={"Retry-After": str(retry)},
            )
        return await call_next(request)


# ============================================
# CSRF PROTECTION MIDDLEWARE (double-submit cookie)
# ============================================


class CSRFMiddleware(BaseHTTPMiddleware):
    """Double-submit cookie CSRF protection for cookie-based auth.

    On every response we set a non-httpOnly ``csrf_token`` cookie.
    Mutating requests (POST/PUT/PATCH/DELETE) from browser clients must
    echo it back in the ``X-CSRF-Token`` header.

    Mobile / API clients using Authorization header (no cookies) are
    exempt because CSRF is a browser-only attack vector.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    # Only pre-authentication endpoints should be exempt from CSRF.
    # These paths accept credentials (username/password, refresh token)
    # before a session cookie exists, so CSRF protection is N/A.
    # Infrastructure paths (/health, /docs) are inherently GET/HEAD
    # and already skipped by the SAFE_METHODS check above.
    EXEMPT_PREFIXES = (
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
    )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Always set the CSRF cookie so the client has a token
        csrf_cookie = request.cookies.get("csrf_token")
        if not csrf_cookie:
            csrf_cookie = secrets.token_urlsafe(32)

        # Check on mutating requests
        if request.method not in self.SAFE_METHODS:
            # Exempt if request uses Authorization header (mobile/API)
            has_auth_header = "authorization" in {k.lower() for k in request.headers.keys()}
            is_exempt_path = any(request.url.path.startswith(p) for p in self.EXEMPT_PREFIXES)

            if not has_auth_header and not is_exempt_path:
                # Browser client using cookies — require CSRF header
                has_cookie = "access_token" in request.cookies
                if has_cookie:
                    header_token = request.headers.get("X-CSRF-Token", "")
                    if not header_token or header_token != csrf_cookie:
                        return JSONResponse(status_code=403, content={"detail": "CSRF token missing or invalid"})

        response = await call_next(request)

        # Set (or refresh) CSRF cookie — readable by JS
        response.set_cookie(
            key="csrf_token",
            value=csrf_cookie,
            httponly=False,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            domain=settings.COOKIE_DOMAIN,
            max_age=86400 * 7,
            path="/",
        )
        return response


# ============================================
# SECURITY HEADERS MIDDLEWARE
# ============================================


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if "server" in response.headers:
            del response.headers["server"]
        return response


# ============================================
# REQUEST TIMING MIDDLEWARE
# ============================================


class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.time()
        response = await call_next(request)
        elapsed = time.time() - start
        response.headers["X-Process-Time"] = f"{elapsed:.4f}"
        if elapsed > 0.5:
            logger.warning("Slow request: %s %s took %.2fs", request.method, request.url.path, elapsed)
        return response


# ============================================
# REQUEST ID MIDDLEWARE
# ============================================


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject a unique request ID for tracing.

    The ID is stored in three places so it's universally accessible:
      1. ``request.state.request_id`` — for route handlers.
      2. ``X-Request-ID`` response header — for client correlation.
      3. ``request_id_ctx`` context-var — for the ``RequestIDLogFilter``
         so every log line emitted during this request contains the ID.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = rid
        token = request_id_ctx.set(rid)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = rid
            return response
        finally:
            request_id_ctx.reset(token)


# ============================================
# AUDIT LOGGING MIDDLEWARE
# ============================================

_AUDIT_PREFIXES = (
    "/api/v1/auth/",
    "/api/v1/billing/webhook",
)

_audit_logger = logging.getLogger("dealscope.audit")


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Log request metadata for auth and billing endpoints.

    Captures method, path, status, client IP, and user-agent (redacted
    to first 80 chars).  Billing webhook events additionally log the
    Stripe event type from the ``Stripe-Signature`` header presence.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if not any(path.startswith(p) for p in _AUDIT_PREFIXES):
            return await call_next(request)

        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "-")
        ua = (request.headers.get("User-Agent") or "-")[:80]

        response = await call_next(request)

        extra: dict = {
            "method": request.method,
            "path": path,
            "status": response.status_code,
            "client_ip": client_ip,
            "user_agent": ua,
        }
        if "webhook" in path:
            extra["has_stripe_sig"] = "Stripe-Signature" in request.headers

        _audit_logger.info("audit_event", extra=extra)
        return response
