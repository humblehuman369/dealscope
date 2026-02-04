"""
Middleware for rate limiting, security headers, and request processing.
"""
import time
import logging
from typing import Dict, Optional, Callable
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================
# RATE LIMITING MIDDLEWARE
# ============================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with Redis support.
    
    Uses Redis when available for distributed rate limiting across
    multiple server instances. Falls back to in-memory for single-instance
    deployments or when Redis is unavailable.
    
    Implements sliding window rate limiting.
    """
    
    def __init__(self, app, default_limit: int = 100, default_period: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.default_period = default_period
        
        # In-memory storage fallback
        self.requests: Dict[str, list] = defaultdict(list)
        
        # Redis client (lazy initialization)
        self._redis_client = None
        self._redis_available = None
        
        # Route-specific limits (path prefix -> (limit, period))
        self.route_limits: Dict[str, tuple] = {
            "/api/v1/auth/login": (5, 60),       # 5 per minute for login
            "/api/v1/auth/register": (3, 60),    # 3 per minute for registration
            "/api/v1/auth/forgot-password": (3, 60),  # 3 per minute for password reset
            "/api/v1/properties/search": (30, 60),    # 30 per minute for property search
        }
    
    async def _get_redis_client(self):
        """Lazy initialization of Redis client."""
        if self._redis_available is None:
            if settings.REDIS_URL:
                try:
                    import redis.asyncio as redis
                    self._redis_client = redis.from_url(
                        settings.REDIS_URL,
                        encoding="utf-8",
                        decode_responses=True,
                        socket_connect_timeout=2,
                        socket_timeout=2,
                    )
                    # Test connection
                    await self._redis_client.ping()
                    self._redis_available = True
                    logger.info("Rate limiting using Redis")
                except Exception as e:
                    logger.warning(f"Redis not available for rate limiting: {e}")
                    self._redis_available = False
            else:
                self._redis_available = False
                
        return self._redis_client if self._redis_available else None
    
    def _get_client_key(self, request: Request) -> str:
        """Get a unique key for the client (IP + path)."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        return f"ratelimit:{client_ip}:{request.url.path}"
    
    def _get_limits(self, path: str) -> tuple:
        """Get rate limits for a specific path."""
        for route_prefix, limits in self.route_limits.items():
            if path.startswith(route_prefix):
                return limits
        return (self.default_limit, self.default_period)
    
    async def _is_rate_limited_redis(
        self,
        client_key: str,
        limit: int,
        period: int
    ) -> tuple:
        """
        Check rate limit using Redis sliding window.
        
        Returns: (is_limited: bool, retry_after: int)
        """
        redis = await self._get_redis_client()
        if not redis:
            return await self._is_rate_limited_memory(client_key, limit, period)
        
        try:
            current_time = time.time()
            window_start = current_time - period
            
            # Use Redis sorted set for sliding window
            # Score = timestamp, member = unique request ID
            pipe = redis.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(client_key, 0, window_start)
            
            # Count current entries
            pipe.zcard(client_key)
            
            # Add new entry
            request_id = f"{current_time}:{id(self)}"
            pipe.zadd(client_key, {request_id: current_time})
            
            # Set expiry on the key
            pipe.expire(client_key, period + 1)
            
            results = await pipe.execute()
            current_count = results[1]  # zcard result
            
            if current_count >= limit:
                # Get oldest entry to calculate retry_after
                oldest = await redis.zrange(client_key, 0, 0, withscores=True)
                if oldest:
                    oldest_time = oldest[0][1]
                    retry_after = int(period - (current_time - oldest_time)) + 1
                else:
                    retry_after = period
                return True, max(retry_after, 1)
            
            return False, 0
            
        except Exception as e:
            logger.warning(f"Redis rate limit error, falling back to memory: {e}")
            return await self._is_rate_limited_memory(client_key, limit, period)
    
    async def _is_rate_limited_memory(
        self,
        client_key: str,
        limit: int,
        period: int
    ) -> tuple:
        """Check rate limit using in-memory storage."""
        current_time = time.time()
        window_start = current_time - period
        
        # Clean up old requests
        self.requests[client_key] = [
            (ts, count) for ts, count in self.requests[client_key]
            if ts >= window_start
        ]
        
        # Count requests in current window
        request_count = sum(count for _, count in self.requests[client_key])
        
        if request_count >= limit:
            oldest_request = min(
                (ts for ts, _ in self.requests[client_key]),
                default=current_time
            )
            retry_after = int(period - (current_time - oldest_request)) + 1
            return True, max(retry_after, 1)
        
        # Record this request
        self.requests[client_key].append((current_time, 1))
        
        return False, 0
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request with rate limiting."""
        # Skip rate limiting for health checks and docs
        skip_paths = ["/health", "/docs", "/redoc", "/openapi.json"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)
        
        # Get rate limits for this path
        client_key = self._get_client_key(request)
        limit, period = self._get_limits(request.url.path)
        
        # Check rate limit (use Redis if available)
        is_limited, retry_after = await self._is_rate_limited_redis(
            client_key, limit, period
        )
        
        if is_limited:
            client_ip = request.client.host if request.client else "unknown"
            logger.warning(f"Rate limit exceeded for {client_ip}: {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "details": {"retry_after": retry_after}
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        return await call_next(request)


# ============================================
# SECURITY HEADERS MIDDLEWARE
# ============================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    
    Headers added:
    - X-Content-Type-Options: Prevent MIME type sniffing
    - X-Frame-Options: Prevent clickjacking
    - X-XSS-Protection: Enable browser XSS protection
    - Referrer-Policy: Control referrer information
    - Content-Security-Policy: Control resource loading (for API, minimal)
    - Strict-Transport-Security: Enforce HTTPS (production only)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking (API shouldn't be framed)
        response.headers["X-Frame-Options"] = "DENY"
        
        # Enable XSS protection in older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy for API responses
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        
        # HSTS header (only in production with HTTPS)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Remove server header to avoid version disclosure
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


# ============================================
# REQUEST TIMING MIDDLEWARE
# ============================================

class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    Log request timing for performance monitoring.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        
        # Log slow requests (>500ms)
        if process_time > 0.5:
            logger.warning(
                f"Slow request: {request.method} {request.url.path} "
                f"took {process_time:.2f}s"
            )
        
        return response
