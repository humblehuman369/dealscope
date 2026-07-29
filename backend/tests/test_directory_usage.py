"""Tests for directory export limits and the billing-cycle period key."""

from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.directory_usage import (
    EXPORT_MAX_RECORDS,
    MONTHLY_EXPORT_RECORD_LIMIT,
    billing_cycle_key,
)


def test_plan_limits():
    """Export limits: 200 records per export, 1,000 per billing cycle."""
    assert EXPORT_MAX_RECORDS == 200
    assert MONTHLY_EXPORT_RECORD_LIMIT == 1_000


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
