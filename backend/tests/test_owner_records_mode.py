"""Owner Leads (property-records) request gating.

Owner Leads is on when tenure, occupancy, or availability is set. An omitted
availability while mode is on is unconstrained (listed + unlisted), not
the old off-market default.
"""

from __future__ import annotations

from app.schemas.property import MapSearchRequest
from app.services.map_search_service import (
    alert_ineligible_reason,
    owner_records_active,
    resolve_owner_availability,
)


def _req(**overrides) -> MapSearchRequest:
    base = {
        "north": 27.4800,
        "south": 27.3800,
        "east": -80.2800,
        "west": -80.3800,
    }
    base.update(overrides)
    return MapSearchRequest(**base)


def test_schema_default_availability_is_none():
    assert _req().owner_records_availability is None


def test_empty_request_is_not_owner_records_mode():
    assert owner_records_active(_req()) is False


def test_availability_only_enters_owner_records_mode():
    req = _req(owner_records_availability="off_market")
    assert owner_records_active(req) is True
    assert req.owner_tenure_min_years is None
    assert req.owner_occupancy is None


def test_tenure_only_is_unconstrained_availability():
    req = _req(owner_tenure_min_years=30)
    assert owner_records_active(req) is True
    assert resolve_owner_availability(req) == "any"


def test_occupancy_only_is_unconstrained_availability():
    req = _req(owner_occupancy="absentee")
    assert owner_records_active(req) is True
    assert resolve_owner_availability(req) == "any"


def test_explicit_off_market_is_not_widened():
    req = _req(owner_tenure_min_years=30, owner_records_availability="off_market")
    assert resolve_owner_availability(req) == "off_market"


def test_availability_only_cannot_be_alerted():
    reason = alert_ineligible_reason(_req(owner_records_availability="off_market"))
    assert reason is not None
    assert "Owner Leads" in reason
