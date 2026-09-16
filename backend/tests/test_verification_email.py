"""Verification email carries the 6-digit code above the unchanged link."""

import pytest
from app.core.config import settings
from app.services.email_service import EmailService


@pytest.mark.asyncio
async def test_verification_email_puts_code_above_the_link(monkeypatch):
    captured: dict[str, str] = {}

    async def fake_send(self, to, subject, html, **kwargs):
        captured["html"] = html
        captured["subject"] = subject
        return {"success": True, "id": "test"}

    monkeypatch.setattr(EmailService, "send_email", fake_send)

    svc = EmailService()
    await svc.send_verification_email(
        "a@example.com",
        "Ada",
        verification_token="tok_abc",
        code="847291",
    )

    html = captured["html"]
    assert "Your sign-in code" in html
    assert "847 291" in html
    assert "Type this code in the window where you asked to sign in." in html
    assert f"It works for {svc.verification_expiry_phrase()}." in html
    assert str(settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS) in svc.verification_expiry_phrase()
    assert "Verify Email Address" in html
    assert "/verify-email?token=tok_abc" in html
    assert "This link will expire in" in html


def test_format_email_code_groups_three():
    assert EmailService.format_email_code("123456") == "123 456"
