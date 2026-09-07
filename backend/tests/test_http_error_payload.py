"""Structured HTTPException details must not leak as Python reprs."""

from app.main import http_error_payload


def test_dict_detail_keeps_human_message_and_limit_type():
    detail = {
        "code": "ANONYMOUS_LIMIT_REACHED",
        "message": "You've used today's 3 free analyses. Create a free account to keep analyzing properties.",
        "limit_type": "anonymous_analyses",
        "current": 3,
        "limit": 3,
        "tier_required": "free",
    }
    payload = http_error_payload(403, detail)
    assert payload["error"]["code"] == "ANONYMOUS_LIMIT_REACHED"
    assert payload["error"]["message"].startswith("You've used today's 3 free analyses")
    assert "{" not in payload["error"]["message"]
    assert payload["error"]["details"]["limit_type"] == "anonymous_analyses"
    assert payload["detail"]["limit_type"] == "anonymous_analyses"


def test_string_detail_stays_plain_message():
    payload = http_error_payload(404, "Property not found")
    assert payload["error"]["code"] == "NOT_FOUND"
    assert payload["error"]["message"] == "Property not found"


def test_already_canonical_envelope_passes_through():
    body = {"error": {"code": "X", "message": "y", "details": {}}}
    assert http_error_payload(400, body) is body
