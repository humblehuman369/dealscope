"""Plan-saved email copy — trial CTA, not directory bait."""

from types import SimpleNamespace

import pytest
from app.services.email_service import EmailService

pytestmark = pytest.mark.asyncio


async def test_plan_saved_email_has_trial_cta_not_buyers(monkeypatch):
    captured: dict[str, str] = {}

    async def fake_send(self, to, subject, html, **kwargs):
        captured["html"] = html
        captured["subject"] = subject
        return {"success": True, "id": "test"}

    monkeypatch.setattr(EmailService, "send_email", fake_send)

    plan = SimpleNamespace(
        scenario=SimpleNamespace(label="Price", levers={}),
        narrative=SimpleNamespace(summary="A workable structure.", pitch=""),
    )
    svc = EmailService()
    await svc.send_plan_saved_email(
        "a@example.com",
        address="1 Main St, Austin, TX",
        plan=plan,
        magic_url="https://dealgapiq.com/auth/magic?token=x",
        is_new_user=True,
    )

    html = captured["html"]
    assert "Open my plan" in html
    assert "Start your 7-day Pro trial" in html
    assert "pricing?source=plan_email" in html
    assert "first payment" in html
    assert "cash buyers" not in html.lower()
    assert "lenders" not in html.lower()
