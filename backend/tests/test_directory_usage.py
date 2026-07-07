"""Tests for directory usage limits and the billing-cycle period key (Task 3.4)."""

from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.directory_usage import (
    DAILY_DETAIL_VIEW_LIMIT,
    EXPORT_MAX_RECORDS,
    MONTHLY_EXPORT_RECORD_LIMIT,
    billing_cycle_key,
    daily_period_key,
)


def test_plan_limits():
    """Limits confirmed in the task brief: 25/day views, 200/export, 1,000/month."""
    assert DAILY_DETAIL_VIEW_LIMIT == 25
    assert EXPORT_MAX_RECORDS == 200
    assert MONTHLY_EXPORT_RECORD_LIMIT == 1_000


def test_daily_period_key_is_utc_date():
    now = datetime(2026, 7, 6, 23, 59, tzinfo=UTC)
    assert daily_period_key(now) == "2026-07-06"


def _sub(period_start: datetime | None):
    return SimpleNamespace(current_period_start=period_start)


def test_billing_cycle_anchors_on_billing_day():
    """User billed on the 15th: cycles run 15th → 15th ('resets on your billing date')."""
    sub = _sub(datetime(2026, 1, 15, tzinfo=UTC))
    assert billing_cycle_key(sub, datetime(2026, 7, 6, tzinfo=UTC)) == "2026-06-15"
    assert billing_cycle_key(sub, datetime(2026, 7, 20, tzinfo=UTC)) == "2026-07-15"
    # On the billing day itself, a new cycle starts.
    assert billing_cycle_key(sub, datetime(2026, 7, 15, tzinfo=UTC)) == "2026-07-15"


def test_billing_cycle_clamps_short_months():
    """A 31st anchor clamps to the last day of shorter months."""
    sub = _sub(datetime(2026, 1, 31, tzinfo=UTC))
    assert billing_cycle_key(sub, datetime(2026, 2, 15, tzinfo=UTC)) == "2026-01-31"
    assert billing_cycle_key(sub, datetime(2026, 3, 1, tzinfo=UTC)) == "2026-02-28"


def test_billing_cycle_january_rollover():
    sub = _sub(datetime(2026, 1, 15, tzinfo=UTC))
    assert billing_cycle_key(sub, datetime(2027, 1, 10, tzinfo=UTC)) == "2026-12-15"


def test_billing_cycle_without_subscription_uses_calendar_month():
    """Admin comps have no billing anchor — calendar months apply."""
    assert billing_cycle_key(None, datetime(2026, 7, 6, tzinfo=UTC)) == "2026-07-01"
    assert billing_cycle_key(_sub(None), datetime(2026, 7, 6, tzinfo=UTC)) == "2026-07-01"
