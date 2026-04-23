"""
Tests for SignupNotificationService.

Verifies that admin signup notifications:
  - No-op when ADMIN_NOTIFICATION_EMAILS is unset
  - Fan out to every configured recipient
  - Include the source label, name, email, and total user count
  - Are idempotent (second call for same user_id is a no-op)
  - Never raise — failures are swallowed and logged
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.services.signup_notification_service import (
    SignupNotificationService,
    signup_notification_service,
)


pytestmark = pytest.mark.asyncio


@pytest.fixture
def mock_email_send():
    """Patch EmailService.send_signup_notification_email and yield the mock."""
    with patch(
        "app.services.signup_notification_service.email_service.send_signup_notification_email",
        new_callable=AsyncMock,
    ) as m:
        m.return_value = {"success": True, "id": "test-id"}
        yield m


@pytest.fixture
def mock_total_users():
    """Patch the total-user-count query so tests don't need a populated DB."""
    with patch.object(
        SignupNotificationService,
        "_fetch_total_user_count",
        new_callable=AsyncMock,
    ) as m:
        m.return_value = 1247
        yield m


@pytest.fixture
def fresh_cache():
    """Force a fresh in-memory cache each test so idempotency state is isolated."""
    from app.services import cache_service as cache_module

    original = cache_module._cache_instance
    cache_module._cache_instance = cache_module.CacheService(redis_url=None)
    yield cache_module._cache_instance
    cache_module._cache_instance = original


@pytest.fixture
def with_admin_recipients(monkeypatch):
    """Configure ADMIN_NOTIFICATION_EMAILS for the duration of a test."""

    def _set(value: str) -> None:
        from app.core.config import settings

        monkeypatch.setattr(settings, "ADMIN_NOTIFICATION_EMAILS", value)

    return _set


# ------------------------------------------------------------------
# Configuration gate
# ------------------------------------------------------------------


class TestConfigurationGate:
    async def test_no_op_when_unconfigured(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("")
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="new@example.com",
            full_name="New User",
            source="email",
        )
        mock_email_send.assert_not_called()

    async def test_no_op_when_only_whitespace(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("  ,  , ")
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="new@example.com",
            full_name="New User",
            source="email",
        )
        mock_email_send.assert_not_called()


# ------------------------------------------------------------------
# Fan-out
# ------------------------------------------------------------------


class TestFanOut:
    async def test_single_recipient(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com")
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="new@example.com",
            full_name="New User",
            source="email",
        )
        assert mock_email_send.call_count == 1
        kwargs = mock_email_send.call_args.kwargs
        assert kwargs["to"] == "brad@dealgapiq.com"
        assert kwargs["new_user_email"] == "new@example.com"
        assert kwargs["new_user_name"] == "New User"
        assert kwargs["source"] == "Email + password"
        assert kwargs["total_users"] == 1247

    async def test_multiple_recipients(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com, cofounder@dealgapiq.com")
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="new@example.com",
            full_name="New User",
            source="google",
        )
        assert mock_email_send.call_count == 2
        recipients = {call.kwargs["to"] for call in mock_email_send.call_args_list}
        assert recipients == {"brad@dealgapiq.com", "cofounder@dealgapiq.com"}
        for call in mock_email_send.call_args_list:
            assert call.kwargs["source"] == "Google OAuth"

    async def test_apple_source_label(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com")
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="new@example.com",
            full_name=None,
            source="apple",
        )
        assert mock_email_send.call_args.kwargs["source"] == "Apple Sign In"


# ------------------------------------------------------------------
# Idempotency
# ------------------------------------------------------------------


class TestIdempotency:
    async def test_same_user_only_notified_once(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com")
        user_id = uuid.uuid4()
        await signup_notification_service.notify(
            user_id=user_id,
            email="new@example.com",
            full_name="New User",
            source="email",
        )
        await signup_notification_service.notify(
            user_id=user_id,
            email="new@example.com",
            full_name="New User",
            source="email",
        )
        assert mock_email_send.call_count == 1

    async def test_different_users_each_notified(
        self, mock_email_send, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com")
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="a@example.com",
            full_name="A",
            source="email",
        )
        await signup_notification_service.notify(
            user_id=uuid.uuid4(),
            email="b@example.com",
            full_name="B",
            source="email",
        )
        assert mock_email_send.call_count == 2


# ------------------------------------------------------------------
# Failure isolation
# ------------------------------------------------------------------


class TestFailureIsolation:
    async def test_email_send_exception_is_swallowed(
        self, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com")
        with patch(
            "app.services.signup_notification_service.email_service.send_signup_notification_email",
            new_callable=AsyncMock,
            side_effect=RuntimeError("Resend down"),
        ):
            await signup_notification_service.notify(
                user_id=uuid.uuid4(),
                email="new@example.com",
                full_name="New User",
                source="email",
            )

    async def test_one_recipient_failure_does_not_block_others(
        self, mock_total_users, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("first@dealgapiq.com,second@dealgapiq.com")
        call_count = {"n": 0}

        async def flaky(**kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise RuntimeError("transient")
            return {"success": True, "id": "ok"}

        with patch(
            "app.services.signup_notification_service.email_service.send_signup_notification_email",
            new=flaky,
        ):
            await signup_notification_service.notify(
                user_id=uuid.uuid4(),
                email="new@example.com",
                full_name="New User",
                source="email",
            )

        assert call_count["n"] == 2

    async def test_total_user_count_failure_still_sends_email(
        self, mock_email_send, fresh_cache, with_admin_recipients
    ):
        with_admin_recipients("brad@dealgapiq.com")
        with patch.object(
            SignupNotificationService,
            "_fetch_total_user_count",
            new_callable=AsyncMock,
            return_value=None,
        ):
            await signup_notification_service.notify(
                user_id=uuid.uuid4(),
                email="new@example.com",
                full_name="New User",
                source="email",
            )
            assert mock_email_send.call_count == 1
            assert mock_email_send.call_args.kwargs["total_users"] is None


# ------------------------------------------------------------------
# Settings parsing
# ------------------------------------------------------------------


class TestSettingsParsing:
    """Settings parsing for ADMIN_NOTIFICATION_EMAILS.

    Marked async to satisfy the module-level ``pytestmark`` even though
    no awaits are needed — the parse logic is pure-sync.
    """

    async def test_admin_notification_emails_list_strips_and_filters(self, monkeypatch):
        from app.core.config import settings

        monkeypatch.setattr(
            settings,
            "ADMIN_NOTIFICATION_EMAILS",
            " a@x.com , , b@x.com ,c@x.com ",
        )
        assert settings.admin_notification_emails_list == ["a@x.com", "b@x.com", "c@x.com"]

    async def test_admin_notification_emails_list_empty(self, monkeypatch):
        from app.core.config import settings

        monkeypatch.setattr(settings, "ADMIN_NOTIFICATION_EMAILS", "")
        assert settings.admin_notification_emails_list == []
