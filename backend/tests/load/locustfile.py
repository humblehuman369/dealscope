"""
Load testing with Locust for InvestIQ API.

Usage:
    pip install locust
    cd backend
    locust -f tests/load/locustfile.py --host http://localhost:8000

Then open http://localhost:8089 to configure and start the test.

Target: p99 latency < 2s at 100 concurrent users.
"""

import json
import random
import string

from locust import HttpUser, between, task, tag


def _random_email() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"loadtest_{suffix}@example.com"


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


class AuthFlowUser(HttpUser):
    """Simulates registration → login → refresh → logout."""

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

    @task(1)
    @tag("auth")
    def login_wrong_password(self):
        """Generate failed login attempts — tests lockout path."""
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
            name="/api/v1/auth/login [fail]",
        )


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
