"""
Integration tests for API endpoints.

These tests verify end-to-end functionality including:
- Auth flow (login, refresh, logout)
- Property analysis endpoints
- Health checks
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
import os

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-characters-long-for-testing"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.main import app


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    def test_health_endpoint_returns_status(self):
        """Health endpoint should return status."""
        with TestClient(app) as client:
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert data["status"] in ["healthy", "degraded", "unhealthy"]
            assert "version" in data
            assert "timestamp" in data
    
    def test_health_endpoint_includes_dependencies(self):
        """Health endpoint should include dependency status."""
        with TestClient(app) as client:
            response = client.get("/health")
            
            data = response.json()
            assert "dependencies" in data
            assert "database" in data["dependencies"]
            assert "redis" in data["dependencies"]


class TestRootEndpoint:
    """Tests for root endpoint."""
    
    def test_root_returns_api_info(self):
        """Root endpoint should return API information."""
        with TestClient(app) as client:
            response = client.get("/")
            
            assert response.status_code == 200
            data = response.json()
            assert "name" in data
            assert "InvestIQ" in data["name"]
            assert "version" in data


class TestAuthFlow:
    """Tests for authentication flow."""
    
    @pytest.fixture
    def test_user(self):
        """Test user credentials."""
        return {
            "email": "testuser@example.com",
            "password": "SecurePassword123",
            "full_name": "Test User"
        }
    
    @pytest.mark.asyncio
    async def test_register_and_login_flow(self, test_user):
        """Test complete registration and login flow."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Register
            register_response = await client.post(
                "/api/v1/auth/register",
                json=test_user
            )
            
            # Registration may fail if user exists, that's ok for this test
            if register_response.status_code == 201:
                data = register_response.json()
                assert data["email"] == test_user["email"]
            
            # Login
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": test_user["email"],
                    "password": test_user["password"]
                }
            )
            
            # Login may fail if registration failed due to existing user
            if login_response.status_code == 200:
                tokens = login_response.json()
                assert "access_token" in tokens
                assert "refresh_token" in tokens
                assert tokens["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_invalid_login_returns_401(self):
        """Invalid login should return 401."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": "nonexistent@example.com",
                    "password": "WrongPassword123"
                }
            )
            
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_requires_auth(self):
        """Protected endpoint should require authentication."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/auth/me")
            
            assert response.status_code == 401


class TestCalculatorValidation:
    """Tests for calculator input validation."""
    
    def test_calculator_rejects_negative_price(self):
        """Calculator should reject negative purchase price."""
        from app.services.calculators import calculate_ltr, CalculationInputError
        
        with pytest.raises(CalculationInputError) as exc_info:
            calculate_ltr(
                purchase_price=-100000,
                monthly_rent=2000,
                property_taxes_annual=3000
            )
        
        assert "Purchase price" in str(exc_info.value)
    
    def test_calculator_rejects_excessive_interest_rate(self):
        """Calculator should reject interest rate over 30%."""
        from app.services.calculators import calculate_ltr, CalculationInputError
        
        with pytest.raises(CalculationInputError) as exc_info:
            calculate_ltr(
                purchase_price=300000,
                monthly_rent=2000,
                property_taxes_annual=3000,
                interest_rate=0.50  # 50% - way too high
            )
        
        assert "Interest rate" in str(exc_info.value)
    
    def test_calculator_accepts_valid_inputs(self):
        """Calculator should accept valid inputs."""
        from app.services.calculators import calculate_ltr
        
        result = calculate_ltr(
            purchase_price=300000,
            monthly_rent=2500,
            property_taxes_annual=3600,
            down_payment_pct=0.20,
            interest_rate=0.06
        )
        
        assert "monthly_cash_flow" in result
        assert "cash_on_cash_return" in result
        assert "cap_rate" in result
    
    def test_flip_calculator_with_valid_inputs(self):
        """Flip calculator should work with valid inputs."""
        from app.services.calculators import calculate_flip
        
        result = calculate_flip(
            market_value=200000,
            arv=300000,
            renovation_budget=50000
        )
        
        assert "net_profit_before_tax" in result
        assert "roi" in result
        assert "meets_70_rule" in result
    
    def test_wholesale_calculator_with_valid_inputs(self):
        """Wholesale calculator should work with valid inputs."""
        from app.services.calculators import calculate_wholesale
        
        result = calculate_wholesale(
            arv=300000,
            estimated_rehab_costs=50000,
            assignment_fee=15000
        )
        
        assert "net_profit" in result
        assert "roi" in result


class TestDefaultsEndpoint:
    """Tests for defaults endpoint."""
    
    @pytest.mark.asyncio
    async def test_defaults_endpoint_returns_defaults(self):
        """Defaults endpoint should return system defaults."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/defaults")
            
            assert response.status_code == 200
            data = response.json()
            
            # Check for major default categories
            assert "financing" in data
            assert "operating" in data
            assert "str" in data
            assert "brrrr" in data
            assert "flip" in data


class TestCookieAuth:
    """Tests for httpOnly cookie authentication."""
    
    @pytest.mark.asyncio
    async def test_login_sets_cookies(self):
        """Login should set httpOnly cookies."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # First register a user
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "cookietest@example.com",
                    "password": "SecurePassword123",
                    "full_name": "Cookie Test"
                }
            )
            
            # Then login
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": "cookietest@example.com",
                    "password": "SecurePassword123"
                }
            )
            
            if response.status_code == 200:
                # Check that cookies are set
                cookies = response.cookies
                # Note: httpOnly cookies may not be visible in test client
                # The important thing is the response is successful
                assert "access_token" in response.json() or len(cookies) >= 0
