from datetime import UTC, datetime

from app.core.exceptions import SubscriptionLimitError
from app.main import http_error_payload
from app.routers.property import _analysis_limit_http_error, _usage_resets_at_iso


def test_analysis_limit_is_402_quota_exceeded():
    exc = SubscriptionLimitError(
        limit_type="analyses",
        current=3,
        limit=3,
        tier_required="pro",
    )
    http = _analysis_limit_http_error(exc, resets_at="2026-10-01T00:00:00+00:00")
    assert http.status_code == 402
    assert http.detail["code"] == "QUOTA_EXCEEDED"
    assert http.detail["plan"] == "starter"
    assert http.detail["limit"] == 3
    assert http.detail["used"] == 3
    assert http.detail["resets_at"] == "2026-10-01T00:00:00+00:00"


def test_quota_exceeded_envelope_keeps_required_fields():
    detail = {
        "code": "QUOTA_EXCEEDED",
        "plan": "starter",
        "limit": 3,
        "used": 3,
        "resets_at": "2026-10-01T00:00:00+00:00",
        "message": "You've used all 3 free analyses this month. Upgrade to Pro for unlimited.",
    }
    payload = http_error_payload(402, detail)
    assert payload["error"]["code"] == "QUOTA_EXCEEDED"
    assert payload["detail"]["plan"] == "starter"
    assert payload["detail"]["used"] == 3
    assert payload["detail"]["resets_at"] == "2026-10-01T00:00:00+00:00"


def test_next_reset_is_thirty_days_after_last_reset():
    last = datetime(2026, 9, 1, tzinfo=UTC)
    assert _usage_resets_at_iso(last).startswith("2026-10-01")
