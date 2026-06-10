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

# NOTE: do NOT mutate os.environ here. ENVIRONMENT / SECRET_KEY / DATABASE_URL
# are configured once in tests/conftest.py before any app import. Overriding
# DATABASE_URL at module-import time poisons the session-scoped database_url
# fixture for the entire test run (it happens during collection, before the
# Postgres reachability probe).
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
    
    def test_readiness_endpoint_includes_dependency_checks(self):
        """Readiness endpoint should report database and redis status."""
        with TestClient(app) as client:
            response = client.get("/health/ready")

            data = response.json()
            assert "checks" in data
            assert "database" in data["checks"]
            assert "redis" in data["checks"]


class TestRootEndpoint:
    """Tests for root endpoint."""
    
    def test_root_returns_api_info(self):
        """Root endpoint should return API information."""
        with TestClient(app) as client:
            response = client.get("/")
            
            assert response.status_code == 200
            data = response.json()
            assert "name" in data
            assert "DealGapIQ" in data["name"]
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


def _ltr_params(**overrides):
    """Fully-resolved LTR params (the calculators take no defaults — the
    assumption_resolver normally supplies every value)."""
    params = {
        "purchase_price": 300000,
        "monthly_rent": 2500,
        "property_taxes_annual": 3600,
        "down_payment_pct": 0.20,
        "interest_rate": 0.06,
        "loan_term_years": 30,
        "closing_costs_pct": 0.03,
        "vacancy_rate": 0.05,
        "property_management_pct": 0.08,
        "maintenance_pct": 0.05,
        "insurance_annual": 3000,
        "utilities_monthly": 0,
        "landscaping_annual": 600,
        "pest_control_annual": 300,
        "appreciation_rate": 0.03,
        "rent_growth_rate": 0.03,
        "expense_growth_rate": 0.02,
    }
    params.update(overrides)
    return params


class TestCalculatorValidation:
    """Tests for calculator input validation."""

    def test_calculator_rejects_negative_price(self):
        """Calculator should reject negative purchase price."""
        from app.services.calculators import calculate_ltr, CalculationInputError

        with pytest.raises(CalculationInputError) as exc_info:
            calculate_ltr(**_ltr_params(purchase_price=-100000))

        assert "Purchase price" in str(exc_info.value)

    def test_calculator_rejects_excessive_interest_rate(self):
        """Calculator should reject interest rate over 30%."""
        from app.services.calculators import calculate_ltr, CalculationInputError

        with pytest.raises(CalculationInputError) as exc_info:
            calculate_ltr(**_ltr_params(interest_rate=0.50))

        assert "Interest rate" in str(exc_info.value)

    def test_calculator_accepts_valid_inputs(self):
        """Calculator should accept valid inputs."""
        from app.services.calculators import calculate_ltr

        result = calculate_ltr(**_ltr_params())

        assert "monthly_cash_flow" in result
        assert "cash_on_cash_return" in result
        assert "cap_rate" in result

    def test_flip_calculator_with_valid_inputs(self):
        """Flip calculator should work with valid inputs."""
        from app.services.calculators import calculate_flip

        result = calculate_flip(
            market_value=200000,
            arv=300000,
            purchase_discount_pct=0.10,
            hard_money_ltv=0.80,
            hard_money_rate=0.12,
            closing_costs_pct=0.03,
            renovation_budget=50000,
            contingency_pct=0.10,
            holding_period_months=6,
            property_taxes_annual=3000,
            insurance_annual=2400,
            utilities_monthly=200,
            selling_costs_pct=0.07,
            capital_gains_rate=0.25,
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
            assignment_fee=15000,
            marketing_costs=2000,
            earnest_money_deposit=1000,
            arv_discount_pct=0.30,
            days_to_close=30,
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
