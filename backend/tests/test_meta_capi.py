"""Meta CAPI payload and consent mode."""

from app.core.config import settings
from app.services.meta_capi import build_payload


def test_build_payload_hashes_email_and_sets_event_id(monkeypatch):
    monkeypatch.setattr(settings, "META_CAPI_CONSENT_MODE", "strict")
    monkeypatch.setattr(settings, "META_CAPI_ACCESS_TOKEN", "token")
    body = build_payload(
        event_name="verdict_viewed",
        event_id="evt-1",
        event_source_url="https://dealgapiq.com/discovery",
        email="Investor@Example.com",
        fbc="fb.1.2.x",
        client_ip="1.2.3.4",
        user_agent="test-ua",
        analytics_consent=True,
        event_time=1_700_000_000,
    )
    assert body is not None
    event = body["data"][0]
    assert event["event_name"] == "Lead"
    assert event["event_id"] == "evt-1"
    assert event["action_source"] == "website"
    assert event["user_data"]["em"][0] == (
        __import__("hashlib").sha256(b"investor@example.com").hexdigest()
    )
    assert event["user_data"]["fbc"] == "fb.1.2.x"


def test_strict_mode_drops_declined_consent(monkeypatch):
    monkeypatch.setattr(settings, "META_CAPI_CONSENT_MODE", "strict")
    body = build_payload(
        event_name="Lead",
        event_id="evt-2",
        event_source_url="https://dealgapiq.com/discovery",
        email="a@b.com",
        analytics_consent=False,
    )
    assert body is None


def test_minimal_mode_sends_without_email(monkeypatch):
    monkeypatch.setattr(settings, "META_CAPI_CONSENT_MODE", "minimal")
    monkeypatch.setattr(settings, "META_CAPI_ACCESS_TOKEN", "token")
    body = build_payload(
        event_name="signup_completed",
        event_id="evt-3",
        event_source_url="https://dealgapiq.com/register",
        email="a@b.com",
        fbc="fb.1.2.x",
        analytics_consent=False,
    )
    assert body is not None
    assert "em" not in body["data"][0]["user_data"]
    assert body["data"][0]["user_data"]["fbc"] == "fb.1.2.x"
    assert body["data"][0]["event_name"] == "CompleteRegistration"


def test_unknown_event_is_dropped():
    assert (
        build_payload(
            event_name="blog_post_viewed",
            event_id="x",
            event_source_url=None,
        )
        is None
    )
