"""
Load testing with Locust for InvestIQ API.

Usage:
    pip install locust
    cd backend
    locust -f tests/load/locustfile.py --host http://localhost:8000

Then open http://localhost:8089 to configure and start the test.

Targets (at 100 concurrent users):
    - p99 latency < 2s
    - Zero 5xx errors
    - No connection-pool exhaustion (DB or Redis)

User classes simulate realistic traffic mix:
    - Health monitoring systems (low traffic)
    - Auth flows: register / login / refresh / logout
    - Property search & analytics
    - Saved-property CRUD (authenticated)
    - IQ Verdict calculations
"""

import json
import random
import string

from locust import HttpUser, between, task, tag


def _random_email() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"loadtest_{suffix}@example.com"


# =================================================================
# Health Check User — simulates monitoring probes
# =================================================================

class HealthCheckUser(HttpUser):
    """Simulates monitoring systems hitting health endpoints."""

    weight = 1
    wait_time = between(5, 10)

    @task
    def health(self):
        self.client.get("/health")

    @task
    def health_ready(self):
        self.client.get("/health/ready")

    @task
    @tag("health")
    def health_deep(self):
        """Hit /health/deep — exercises DB + Redis + external API probes."""
        self.client.get("/health/deep", name="/health/deep")


# =================================================================
# Auth Flow User — register / login / refresh / logout
# =================================================================

class AuthFlowUser(HttpUser):
    """Simulates registration → login → refresh → me → logout."""

    weight = 3
    wait_time = between(1, 3)

    def on_start(self):
        self.email = _random_email()
        self.password = "LoadTest1234!"
        self.token = None
        self.refresh_token = None

    @task(3)
    @tag("auth")
    def register_and_login(self):
        # Register
        resp = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": _random_email(),
                "password": self.password,
                "full_name": "Load Tester",
            },
        )
        if resp.status_code not in (200, 201, 409):
            return

        # Login
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
        )
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")

    @task(2)
    @tag("auth")
    def get_me(self):
        """Hit /auth/me — exercises eager-loaded user response."""
        if not self.token:
            return
        self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {self.token}"},
            name="/api/v1/auth/me",
        )

    @task(1)
    @tag("auth")
    def refresh(self):
        if not self.refresh_token:
            return
        self.client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": self.refresh_token},
            name="/api/v1/auth/refresh",
        )

    @task(1)
    @tag("auth")
    def login_wrong_password(self):
        """Generate failed login attempts — tests lockout path."""
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
            name="/api/v1/auth/login [fail]",
        )


# =================================================================
# Property Search User — search + demo endpoints
# =================================================================

class PropertySearchUser(HttpUser):
    """Simulates property search and analytics workflows."""

    weight = 5
    wait_time = between(2, 5)

    SAMPLE_ADDRESSES = [
        "123 Main St, Miami, FL 33101",
        "456 Oak Ave, Orlando, FL 32801",
        "789 Palm Dr, Tampa, FL 33602",
        "321 Beach Rd, West Palm Beach, FL 33401",
        "654 Lake St, Jacksonville, FL 32202",
    ]

    @task(5)
    @tag("search")
    def search_property(self):
        address = random.choice(self.SAMPLE_ADDRESSES)
        self.client.post(
            "/api/v1/properties/search",
            json={"address": address},
            name="/api/v1/properties/search",
        )

    @task(2)
    @tag("search")
    def get_demo_property(self):
        self.client.get("/api/v1/properties/demo/sample")

    @task(1)
    @tag("search")
    def get_root(self):
        self.client.get("/")


# =================================================================
# Analytics User — IQ Verdict + Deal Score (CPU-bound)
# =================================================================

class AnalyticsUser(HttpUser):
    """Exercises IQ Verdict & Deal Score calculations.

    These are CPU-bound — good for detecting pool exhaustion under
    concurrent load because the event loop is blocked during calc.
    """

    weight = 4
    wait_time = between(2, 5)

    SAMPLE_PRICES = [150_000, 250_000, 350_000, 500_000, 750_000]

    def on_start(self):
        """Login once to get a token."""
        self.email = _random_email()
        self.password = "LoadTest1234!"
        self.token = None

        self.client.post(
            "/api/v1/auth/register",
            json={"email": self.email, "password": self.password, "full_name": "Analytics Tester"},
        )
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")

    def _headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(5)
    @tag("analytics")
    def iq_verdict(self):
        price = random.choice(self.SAMPLE_PRICES)
        self.client.post(
            "/api/v1/analytics/iq-verdict",
            json={
                "listPrice": price,
                "monthlyRent": int(price * 0.007),
                "propertyTaxes": int(price * 0.012),
                "insurance": int(price * 0.005),
                "bedrooms": random.randint(2, 5),
                "bathrooms": random.choice([1, 1.5, 2, 2.5, 3]),
            },
            headers=self._headers(),
            name="/api/v1/analytics/iq-verdict",
        )

    @task(3)
    @tag("analytics")
    def deal_score(self):
        price = random.choice(self.SAMPLE_PRICES)
        self.client.post(
            "/api/v1/analytics/deal-score",
            json={
                "listPrice": price,
                "purchasePrice": int(price * 0.9),
                "monthlyRent": int(price * 0.007),
                "propertyTaxes": int(price * 0.012),
                "insurance": int(price * 0.005),
            },
            headers=self._headers(),
            name="/api/v1/analytics/deal-score",
        )

    @task(2)
    @tag("analytics")
    def get_defaults(self):
        self.client.get(
            "/api/v1/analytics/defaults",
            headers=self._headers(),
            name="/api/v1/analytics/defaults",
        )


# =================================================================
# Saved Properties User — CRUD lifecycle
# =================================================================

class SavedPropertyUser(HttpUser):
    """Exercises the saved-properties CRUD pipeline.

    Creates an authenticated session and cycles through:
    list → save → get → update → delete

    This is the best stress test for connection-pool exhaustion because
    each operation acquires a DB session.
    """

    weight = 3
    wait_time = between(1, 4)

    def on_start(self):
        self.email = _random_email()
        self.password = "LoadTest1234!"
        self.token = None
        self.saved_ids: list[str] = []

        self.client.post(
            "/api/v1/auth/register",
            json={"email": self.email, "password": self.password, "full_name": "CRUD Tester"},
        )
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")

    def _headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(3)
    @tag("saved")
    def list_saved(self):
        if not self.token:
            return
        resp = self.client.get(
            "/api/v1/properties/saved",
            headers=self._headers(),
            name="/api/v1/properties/saved [list]",
        )
        # Verify X-Total-Count header is returned
        if resp.status_code == 200 and "X-Total-Count" not in resp.headers:
            resp.failure("Missing X-Total-Count header")

    @task(2)
    @tag("saved")
    def save_property(self):
        if not self.token:
            return
        suffix = "".join(random.choices(string.digits, k=5))
        resp = self.client.post(
            "/api/v1/properties/saved",
            json={
                "address_street": f"{suffix} Load Test Blvd",
                "address_city": "Miami",
                "address_state": "FL",
                "address_zip": "33101",
                "status": "watching",
            },
            headers=self._headers(),
            name="/api/v1/properties/saved [create]",
        )
        if resp.status_code == 201:
            pid = resp.json().get("id")
            if pid:
                self.saved_ids.append(pid)

    @task(2)
    @tag("saved")
    def get_saved(self):
        if not self.token or not self.saved_ids:
            return
        pid = random.choice(self.saved_ids)
        self.client.get(
            f"/api/v1/properties/saved/{pid}",
            headers=self._headers(),
            name="/api/v1/properties/saved/{id} [get]",
        )

    @task(1)
    @tag("saved")
    def delete_saved(self):
        if not self.token or not self.saved_ids:
            return
        pid = self.saved_ids.pop()
        self.client.delete(
            f"/api/v1/properties/saved/{pid}",
            headers=self._headers(),
            name="/api/v1/properties/saved/{id} [delete]",
        )
