"""
Cache service with Redis support and in-memory fallback.
Provides a unified caching interface for property data.
"""

import hashlib
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Default TTL for property cache (24 hours)
DEFAULT_TTL_SECONDS = 86400


class CacheService:
    """
    Unified cache service that uses Redis when available,
    with fallback to in-memory caching.
    """

    def __init__(self, redis_url: str | None = None):
        self.redis_client = None
        self.use_redis = False
        self._memory_cache: dict[str, dict[str, Any]] = {}

        if redis_url:
            try:
                import redis.asyncio as redis

                self.redis_client = redis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                )
                self.use_redis = True
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.warning(f"Redis not available, using in-memory cache: {e}")
                self.use_redis = False

    @staticmethod
    def generate_key(prefix: str, identifier: str) -> str:
        """Generate a cache key with prefix."""
        # Normalize the identifier
        normalized = identifier.lower().strip()
        hash_part = hashlib.sha256(normalized.encode()).hexdigest()[:16]
        return f"{prefix}:{hash_part}"

    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        try:
            if self.use_redis and self.redis_client:
                value = await self.redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
            else:
                # In-memory fallback
                cached = self._memory_cache.get(key)
                if cached:
                    import time

                    if time.time() < cached.get("expires_at", 0):
                        return cached.get("data")
                    else:
                        # Expired - remove it
                        del self._memory_cache[key]
                return None
        except Exception as e:
            logger.warning(f"Cache get error for {key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> bool:
        """Set value in cache with TTL."""
        try:
            if self.use_redis and self.redis_client:
                serialized = json.dumps(value, default=str)
                await self.redis_client.setex(key, ttl_seconds, serialized)
                return True
            else:
                # In-memory fallback
                import time

                self._memory_cache[key] = {
                    "data": value,
                    "expires_at": time.time() + ttl_seconds,
                }

                # Clean up old entries if cache is too large
                if len(self._memory_cache) > 1000:
                    self._cleanup_memory_cache()

                return True
        except Exception as e:
            logger.warning(f"Cache set error for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            if self.use_redis and self.redis_client:
                await self.redis_client.delete(key)
                return True
            else:
                if key in self._memory_cache:
                    del self._memory_cache[key]
                return True
        except Exception as e:
            logger.warning(f"Cache delete error for {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            if self.use_redis and self.redis_client:
                return await self.redis_client.exists(key) > 0
            else:
                return key in self._memory_cache
        except Exception as e:
            logger.warning(f"Cache exists error for {key}: {e}")
            return False

    async def get_property(self, address: str) -> dict | None:
        """Get cached property data by address."""
        key = self.generate_key("property", address)
        return await self.get(key)

    async def set_property(self, address: str, data: dict, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> bool:
        """Cache property data with 24h TTL."""
        key = self.generate_key("property", address)
        return await self.set(key, data, ttl_seconds)

    async def get_calculation(self, property_id: str, assumptions_hash: str) -> dict | None:
        """Get cached calculation result."""
        key = f"calc:{property_id}:{assumptions_hash}"
        return await self.get(key)

    async def set_calculation(
        self, property_id: str, assumptions_hash: str, data: dict, ttl_seconds: int = DEFAULT_TTL_SECONDS
    ) -> bool:
        """Cache calculation result."""
        key = f"calc:{property_id}:{assumptions_hash}"
        return await self.set(key, data, ttl_seconds)

    async def clear_property_cache(self, address: str) -> bool:
        """Clear cached data for a specific property."""
        key = self.generate_key("property", address)
        return await self.delete(key)

    async def get_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        stats = {
            "backend": "redis" if self.use_redis else "memory",
            "connected": False,
        }

        try:
            if self.use_redis and self.redis_client:
                # Ping to check connection
                await self.redis_client.ping()
                stats["connected"] = True

                # Get Redis info
                info = await self.redis_client.info("memory")
                stats["memory_used"] = info.get("used_memory_human", "unknown")
                stats["keys"] = await self.redis_client.dbsize()
            else:
                stats["connected"] = True  # Memory is always available
                stats["keys"] = len(self._memory_cache)

        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")

        return stats

    def _cleanup_memory_cache(self):
        """Remove expired entries from memory cache."""
        import time

        now = time.time()
        expired_keys = [k for k, v in self._memory_cache.items() if now >= v.get("expires_at", 0)]
        for key in expired_keys:
            del self._memory_cache[key]

        logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

    async def close(self):
        """Close Redis connection if active."""
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")


# Singleton cache instance
_cache_instance: CacheService | None = None


def get_cache_service() -> CacheService:
    """Get the global cache service instance."""
    global _cache_instance
    if _cache_instance is None:
        from app.core.config import settings

        _cache_instance = CacheService(redis_url=settings.REDIS_URL)
    return _cache_instance


async def init_cache_service(redis_url: str | None = None) -> CacheService:
    """Initialize the cache service with optional Redis URL."""
    global _cache_instance
    _cache_instance = CacheService(redis_url=redis_url)
    return _cache_instance
