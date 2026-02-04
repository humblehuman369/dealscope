"""
Token Blacklist Service - Redis-based JWT token revocation.

Provides a mechanism to invalidate tokens before their natural expiration:
- Logout: Blacklist both access and refresh tokens
- Refresh: Blacklist old refresh token when issuing new one
- Security: Blacklist all tokens for a user (force re-login)

Uses Redis for distributed token blacklist with automatic cleanup via TTL.
Falls back to in-memory storage when Redis is not available.
"""

import logging
from typing import Optional, Set
from datetime import datetime, timezone
import time

from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenBlacklistService:
    """
    Service for managing blacklisted (revoked) tokens.
    
    Uses Redis when available for distributed token revocation across
    multiple server instances. Falls back to in-memory for single-instance
    deployments or when Redis is unavailable.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        self.use_redis = False
        self._memory_blacklist: dict = {}  # jti -> expiry timestamp
        
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
                logger.info("Token blacklist Redis initialized successfully")
            except Exception as e:
                logger.warning(f"Redis not available for token blacklist, using in-memory: {e}")
                self.use_redis = False
    
    def _get_key(self, token_jti: str) -> str:
        """Generate Redis key for a token JTI."""
        return f"token_blacklist:{token_jti}"
    
    def _get_user_key(self, user_id: str) -> str:
        """Generate Redis key for user's blacklist timestamp."""
        return f"user_blacklist:{user_id}"
    
    async def blacklist_token(
        self,
        token_jti: str,
        expiry_timestamp: int,
        reason: str = "logout"
    ) -> bool:
        """
        Add a token to the blacklist.
        
        Args:
            token_jti: Unique token identifier (from 'jti' claim or hash of token)
            expiry_timestamp: When the token would naturally expire
            reason: Why the token was blacklisted (for logging)
            
        Returns:
            True if successfully blacklisted, False otherwise
        """
        try:
            # Calculate TTL - only need to store until token would expire
            current_time = int(time.time())
            ttl_seconds = max(expiry_timestamp - current_time, 0)
            
            if ttl_seconds <= 0:
                # Token already expired, no need to blacklist
                return True
            
            if self.use_redis and self.redis_client:
                key = self._get_key(token_jti)
                await self.redis_client.setex(key, ttl_seconds, reason)
                logger.debug(f"Token blacklisted in Redis: {token_jti[:8]}... reason={reason}")
                return True
            else:
                # In-memory fallback
                self._memory_blacklist[token_jti] = {
                    "expires_at": expiry_timestamp,
                    "reason": reason,
                    "added_at": current_time
                }
                
                # Cleanup old entries
                self._cleanup_memory_blacklist()
                
                logger.debug(f"Token blacklisted in memory: {token_jti[:8]}... reason={reason}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")
            return False
    
    async def is_blacklisted(self, token_jti: str) -> bool:
        """
        Check if a token is blacklisted.
        
        Args:
            token_jti: Unique token identifier
            
        Returns:
            True if blacklisted, False otherwise
        """
        try:
            if self.use_redis and self.redis_client:
                key = self._get_key(token_jti)
                result = await self.redis_client.exists(key)
                return result > 0
            else:
                # In-memory fallback
                entry = self._memory_blacklist.get(token_jti)
                if entry:
                    if time.time() < entry["expires_at"]:
                        return True
                    else:
                        # Expired, remove it
                        del self._memory_blacklist[token_jti]
                return False
                
        except Exception as e:
            logger.error(f"Failed to check token blacklist: {e}")
            # Fail open in case of error - log the issue
            return False
    
    async def blacklist_user_tokens(self, user_id: str) -> bool:
        """
        Blacklist all tokens for a user (force re-login).
        
        This sets a "blacklist after" timestamp for the user. Any tokens
        issued before this timestamp will be considered invalid.
        
        Args:
            user_id: User ID to blacklist tokens for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            current_time = int(time.time())
            # Store for the max token lifetime (refresh token duration)
            ttl_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
            
            if self.use_redis and self.redis_client:
                key = self._get_user_key(user_id)
                await self.redis_client.setex(key, ttl_seconds, str(current_time))
                logger.info(f"All tokens blacklisted for user: {user_id}")
                return True
            else:
                # In-memory - store user blacklist timestamp
                self._memory_blacklist[f"user:{user_id}"] = {
                    "blacklist_after": current_time,
                    "expires_at": current_time + ttl_seconds
                }
                logger.info(f"All tokens blacklisted for user (in-memory): {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to blacklist user tokens: {e}")
            return False
    
    async def is_user_token_blacklisted(self, user_id: str, token_iat: int) -> bool:
        """
        Check if a user's token was issued before their blacklist timestamp.
        
        Args:
            user_id: User ID
            token_iat: Token "issued at" timestamp
            
        Returns:
            True if token was issued before user blacklist, False otherwise
        """
        try:
            if self.use_redis and self.redis_client:
                key = self._get_user_key(user_id)
                blacklist_after = await self.redis_client.get(key)
                if blacklist_after:
                    return token_iat < int(blacklist_after)
                return False
            else:
                # In-memory fallback
                entry = self._memory_blacklist.get(f"user:{user_id}")
                if entry and time.time() < entry.get("expires_at", 0):
                    return token_iat < entry.get("blacklist_after", 0)
                return False
                
        except Exception as e:
            logger.error(f"Failed to check user token blacklist: {e}")
            return False
    
    def _cleanup_memory_blacklist(self) -> None:
        """Remove expired entries from in-memory blacklist."""
        current_time = time.time()
        expired_keys = [
            k for k, v in self._memory_blacklist.items()
            if current_time >= v.get("expires_at", 0)
        ]
        for key in expired_keys:
            del self._memory_blacklist[key]
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired blacklist entries")
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()


def get_token_blacklist_service() -> TokenBlacklistService:
    """Factory function to create token blacklist service."""
    return TokenBlacklistService(redis_url=settings.REDIS_URL)


# Singleton instance
token_blacklist_service = get_token_blacklist_service()
