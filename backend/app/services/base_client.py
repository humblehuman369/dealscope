"""
Base API Client - Common HTTP request logic for external API integrations.

This module provides a reusable base class that handles:
- Retry logic with exponential backoff
- Rate limit handling (429 responses)
- Circuit breaker pattern for fault tolerance
- Timeout management
- Standardized response wrapping
- Logging

API clients should inherit from BaseAPIClient and implement their
specific authentication and response handling.
"""
import httpx
from typing import Dict, Any, Optional, TypeVar, Generic
from datetime import datetime, timezone
from abc import ABC, abstractmethod
import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"


class CircuitBreaker:
    """
    Circuit breaker implementation for fault tolerance.
    
    When failures exceed the threshold, the circuit opens and
    subsequent requests fail fast. After the recovery timeout,
    a test request is allowed through (half-open state).
    """
    
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
    
    def record_failure(self) -> None:
        """Record a failed request."""
        self.failures += 1
        self.last_failure_time = datetime.now(timezone.utc)
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit breaker opened after {self.failures} failures")
    
    def record_success(self) -> None:
        """Record a successful request."""
        self.failures = 0
        self.state = CircuitState.CLOSED
    
    def can_execute(self) -> bool:
        """Check if a request can proceed."""
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if self.last_failure_time:
                elapsed = (datetime.now(timezone.utc) - self.last_failure_time).total_seconds()
                if elapsed >= self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    return True
            return False
        return True  # half-open allows one request
    
    def reset(self) -> None:
        """Reset the circuit breaker to closed state."""
        self.failures = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED


@dataclass
class BaseAPIResponse:
    """Base response wrapper for API calls."""
    success: bool
    data: Optional[Dict[str, Any]]
    error: Optional[str]
    status_code: Optional[int]
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    raw_response: Optional[Dict[str, Any]] = None


T = TypeVar('T', bound=BaseAPIResponse)


class BaseAPIClient(ABC, Generic[T]):
    """
    Abstract base class for API clients.
    
    Provides common functionality:
    - Retry logic with exponential backoff
    - Rate limit handling
    - Circuit breaker
    - Timeout management
    
    Subclasses must implement:
    - _get_headers(): Return authentication headers
    - _create_response(): Create response object from API result
    - _get_provider_name(): Return provider name for logging
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str,
        timeout: float = 15.0,
        connect_timeout: float = 5.0,
        max_retries: int = 3,
        enable_circuit_breaker: bool = True
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout, connect=connect_timeout)
        self.max_retries = max_retries
        self.circuit_breaker = CircuitBreaker() if enable_circuit_breaker else None
        self._failure_count = 0
        self._last_success: Optional[datetime] = None
    
    @abstractmethod
    def _get_headers(self) -> Dict[str, str]:
        """Return authentication headers for API requests."""
        pass
    
    @abstractmethod
    def _create_response(
        self,
        success: bool,
        data: Optional[Dict[str, Any]],
        error: Optional[str],
        status_code: Optional[int],
        raw_response: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> T:
        """Create a provider-specific response object."""
        pass
    
    @abstractmethod
    def _get_provider_name(self) -> str:
        """Return the provider name for logging."""
        pass
    
    def _create_circuit_open_response(self) -> T:
        """Create response for when circuit breaker is open."""
        return self._create_response(
            success=False,
            data=None,
            error="Circuit breaker is open - service temporarily unavailable",
            status_code=None
        )
    
    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        json_data: Optional[Dict[str, Any]] = None,
        **response_kwargs
    ) -> T:
        """
        Make an authenticated HTTP request with retries and error handling.
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            method: HTTP method (GET, POST, etc.)
            json_data: JSON body for POST/PUT requests
            **response_kwargs: Additional kwargs to pass to _create_response
            
        Returns:
            Provider-specific response object
        """
        provider = self._get_provider_name()
        
        # Check circuit breaker
        if self.circuit_breaker and not self.circuit_breaker.can_execute():
            return self._create_circuit_open_response()
        
        headers = self._get_headers()
        url = f"{self.base_url}/{endpoint}"
        
        # Clean params - remove None values
        if params:
            params = {k: v for k, v in params.items() if v is not None}
        
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    if method.upper() == "GET":
                        response = await client.get(url, headers=headers, params=params)
                    elif method.upper() == "POST":
                        response = await client.post(url, headers=headers, params=params, json=json_data)
                    elif method.upper() == "PUT":
                        response = await client.put(url, headers=headers, params=params, json=json_data)
                    elif method.upper() == "DELETE":
                        response = await client.delete(url, headers=headers, params=params)
                    else:
                        raise ValueError(f"Unsupported HTTP method: {method}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        self._record_success()
                        return self._create_response(
                            success=True,
                            data=data,
                            error=None,
                            status_code=response.status_code,
                            raw_response=data,
                            **response_kwargs
                        )
                    
                    elif response.status_code == 429:
                        # Rate limited - exponential backoff
                        wait_time = 2 ** attempt
                        logger.warning(f"{provider} rate limited, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    elif response.status_code == 404:
                        # Not found - may be valid (resource doesn't exist)
                        return self._create_response(
                            success=False,
                            data=None,
                            error=f"Resource not found",
                            status_code=response.status_code,
                            **response_kwargs
                        )
                    
                    else:
                        error_msg = f"{provider} API error: {response.status_code}"
                        try:
                            error_msg += f" - {response.text[:200]}"
                        except Exception:
                            pass
                        logger.error(error_msg)
                        self._record_failure()
                        return self._create_response(
                            success=False,
                            data=None,
                            error=error_msg,
                            status_code=response.status_code,
                            **response_kwargs
                        )
                        
            except httpx.TimeoutException:
                logger.warning(f"{provider} timeout on {endpoint}, attempt {attempt + 1}")
                await asyncio.sleep(2 ** attempt)
                
            except Exception as e:
                logger.error(f"{provider} error: {str(e)}")
                self._record_failure()
                return self._create_response(
                    success=False,
                    data=None,
                    error=str(e),
                    status_code=None,
                    **response_kwargs
                )
        
        self._record_failure()
        return self._create_response(
            success=False,
            data=None,
            error="Max retries exceeded",
            status_code=None,
            **response_kwargs
        )
    
    def _record_success(self) -> None:
        """Record a successful request."""
        self._failure_count = 0
        self._last_success = datetime.now(timezone.utc)
        if self.circuit_breaker:
            self.circuit_breaker.record_success()
    
    def _record_failure(self) -> None:
        """Record a failed request."""
        self._failure_count += 1
        if self.circuit_breaker:
            self.circuit_breaker.record_failure()
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of the API client."""
        return {
            "provider": self._get_provider_name(),
            "failure_count": self._failure_count,
            "last_success": self._last_success.isoformat() if self._last_success else None,
            "circuit_state": self.circuit_breaker.state.value if self.circuit_breaker else "disabled"
        }
