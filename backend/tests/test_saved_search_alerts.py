"""Cost guardrails on scheduled saved-search alerts.

Alerts are the only part of the map roadmap that adds recurring provider
spend, and every failure mode here is silent: nobody notices that a hundred
subscribers each triggered their own scan, or that a search which should have
been refused ran every morning for a year. So the guardrails are tested
directly rather than through the job's happy path.

Four properties, in descending order of what they'd cost if broken:

1. Overlapping geographies collapse to one dispatch. Two investors watching
   the same neighbourhood must produce one provider search, not two.
2. Only the cheap dispatch path is alert-eligible. Motivated-seller, expired,
   distressed and owner-records searches are refused a schedule.
3. The frequency cap is enforced in the job, so the cron interval is only an
   upper bound on how often we look.
4. The first run seeds a baseline instead of emailing the entire result set.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from app.models.saved_map_search import (
    SEEN_KEYS_CAP,
    AlertFrequency,
    SavedMapSearch,
)
from app.schemas.property import MapSearchRequest
from app.schemas.saved_map_search import STORED_FILTER_FIELDS, SavedMapSearchCreate
from app.services.map_search_service import alert_ineligible_reason
from app.services.saved_map_search_service import ineligible_reason, to_request
from app.services.saved_search_alert_jobs import _group_by_dispatch, _listing_key

# A Fort Pierce viewport, roughly a few miles across.
BASE_BOUNDS = {"north": 27.45, "south": 27.40, "east": -80.30, "west": -80.36}


def make_search(**overrides) -> SavedMapSearch:
    fields = {
        **BASE_BOUNDS,
        "name": "Fort Pierce farm",
        "filters": {},
        "alert_frequency": AlertFrequency.DAILY,
        "polygon": None,
        "seen_address_keys": [],
        "last_alert_sent_at": None,
    }
    fields.update(overrides)
    return SavedMapSearch(**fields)


# ─── 1. One area is queried once ─────────────────────────────────────────


def test_two_investors_watching_the_same_area_cost_one_provider_search():
    """The whole economic case for scheduled alerts."""
    alice = make_search(name="Alice's farm")
    bob = make_search(name="Bob's farm")

    groups = _group_by_dispatch([alice, bob])

    assert len(groups) == 1
    _request, members = next(iter(groups.values()))
    assert {m.name for m in members} == {"Alice's farm", "Bob's farm"}


def test_a_nudged_viewport_over_the_same_area_still_shares_a_dispatch():
    """Nobody saves the identical rectangle twice; the tile grid is what makes
    the dedupe useful rather than theoretical."""
    alice = make_search()
    bob = make_search(north=27.4498, south=27.4005, east=-80.3005, west=-80.3595)

    assert len(_group_by_dispatch([alice, bob])) == 1


def test_a_crowd_watching_one_neighbourhood_collapses_to_a_handful_of_dispatches():
    """The economic claim, measured.

    Snapping to a grid cannot guarantee that *any* two viewports share a tile
    — a pair straddling a gridline lands in two, which costs one extra
    dispatch and is correct, just not free. What has to hold is the aggregate:
    a crowd of investors watching the same neighbourhood must cost a handful
    of searches rather than one per investor.
    """
    crowd = [
        make_search(
            name=f"investor-{i}",
            north=27.45 + i * 0.0007,
            south=27.40 + i * 0.0007,
            east=-80.30 - i * 0.0006,
            west=-80.36 - i * 0.0006,
        )
        for i in range(20)
    ]

    dispatches = len(_group_by_dispatch(crowd))

    # The drift above spans a little over one tile step in each axis, so the
    # crowd can land across a 3x3 neighbourhood of tiles — nine is the ceiling
    # the grid allows, and anything near twenty would mean the dedupe is not
    # working at all.
    assert dispatches <= 9, f"20 overlapping watchers cost {dispatches} searches"
    assert dispatches < len(crowd) / 2


def test_different_filters_over_the_same_area_do_not_share_a_dispatch():
    cheap = make_search(filters={"max_price": 250_000})
    pricey = make_search(filters={"max_price": 900_000})

    assert len(_group_by_dispatch([cheap, pricey])) == 2


def test_different_areas_do_not_share_a_dispatch():
    florida = make_search()
    texas = make_search(north=30.30, south=30.25, east=-97.70, west=-97.76)

    assert len(_group_by_dispatch([florida, texas])) == 2


def test_two_polygons_inside_one_tile_share_the_dispatch():
    """Each subscriber's boundary clips the shared result afterwards, so a
    drawn farm must not fragment the group it could have shared."""
    north_half = make_search(
        polygon=[[27.43, -80.36], [27.45, -80.36], [27.45, -80.30], [27.43, -80.30]]
    )
    south_half = make_search(
        polygon=[[27.40, -80.36], [27.42, -80.36], [27.42, -80.30], [27.40, -80.30]]
    )

    groups = _group_by_dispatch([north_half, south_half])

    assert len(groups) == 1
    request, members = next(iter(groups.values()))
    assert len(members) == 2
    # The dispatched search covers the tile; clipping happens per subscriber.
    assert request.polygon is None


# ─── 2. Cheap dispatch modes only ────────────────────────────────────────


@pytest.mark.parametrize(
    ("label", "filters"),
    [
        ("motivated seller", {"motivated_seller_search": True}),
        ("expired", {"listing_statuses": ["expired"]}),
        ("foreclosure", {"listing_statuses": ["foreclosure"]}),
        ("pre-foreclosure", {"listing_statuses": ["pre-foreclosure"]}),
        ("auction", {"listing_statuses": ["auction"]}),
        ("owner tenure", {"owner_tenure_min_years": 10}),
        ("absentee owners", {"owner_occupancy": "absentee"}),
        ("STR", {"include_str_listings": True}),
    ],
)
def test_expensive_modes_are_refused_a_schedule(label, filters):
    reason = ineligible_reason(make_search(filters=filters))

    assert reason, f"{label} should not be alert-eligible"
    # The reason is user-facing, so it has to be a sentence, not a code.
    assert reason[0].isupper() and reason.endswith(".")


@pytest.mark.parametrize(
    "filters",
    [
        {},
        {"listing_statuses": ["active"]},
        {"listing_statuses": ["active", "owner_listed"]},
        {"min_price": 100_000, "max_price": 400_000, "bedrooms": 3},
        {"listing_type": "rental"},
    ],
)
def test_ordinary_listing_searches_are_eligible(filters):
    assert ineligible_reason(make_search(filters=filters)) is None


def test_a_distressed_status_mixed_into_an_active_search_is_still_refused():
    """Otherwise the cheapest way past the gate is to append 'active'."""
    assert ineligible_reason(
        make_search(filters={"listing_statuses": ["active", "foreclosure"]})
    )


def test_eligibility_is_decided_on_the_request_that_will_actually_run():
    """The write-time check and the cron must not be able to disagree."""
    search = make_search(filters={"motivated_seller_search": True})

    assert ineligible_reason(search) == alert_ineligible_reason(to_request(search))


# ─── 3. Frequency is capped in the job ───────────────────────────────────


def test_a_never_alerted_search_is_due():
    assert make_search(last_alert_sent_at=None).is_alert_due(datetime.now(UTC))


def test_daily_does_not_fire_twice_in_a_day_even_if_the_cron_does():
    now = datetime.now(UTC)
    search = make_search(alert_frequency=AlertFrequency.DAILY, last_alert_sent_at=now)

    assert not search.is_alert_due(now + timedelta(hours=6))
    assert not search.is_alert_due(now + timedelta(hours=19))
    # Slightly under 24h so a cron drifting later each day never skips a send.
    assert search.is_alert_due(now + timedelta(hours=21))


def test_weekly_holds_for_most_of_a_week():
    now = datetime.now(UTC)
    search = make_search(alert_frequency=AlertFrequency.WEEKLY, last_alert_sent_at=now)

    assert not search.is_alert_due(now + timedelta(days=3))
    assert search.is_alert_due(now + timedelta(days=6, hours=1))


def test_alerts_turned_off_are_never_due():
    search = make_search(alert_frequency=AlertFrequency.OFF, last_alert_sent_at=None)

    assert not search.is_alert_due(datetime.now(UTC))


# ─── 4. New means new ────────────────────────────────────────────────────


def test_the_diff_key_survives_the_winning_provider_changing():
    """The same property from RentCast vs Zillow must not read as new
    inventory just because the other source won the merge this time."""
    from app.schemas.property import MapListing

    rentcast = MapListing(
        id="rc-1",
        address="2406 River Hammock Lane, Fort Pierce, FL 34981",
        latitude=27.42,
        longitude=-80.33,
        source="rentcast",
    )
    zillow = MapListing(
        id="12345678",
        address="2406 River Hammock Ln, Fort Pierce, FL 34981",
        latitude=27.42,
        longitude=-80.33,
        source="zillow",
    )

    assert _listing_key(rentcast) == _listing_key(zillow)


def test_seen_keys_retain_currently_listed_properties_when_trimmed():
    """Evicting a still-listed property would re-announce it as new."""
    search = make_search(seen_address_keys=[f"old-{i}|34981" for i in range(SEEN_KEYS_CAP)])
    current = [f"live-{i}|34981" for i in range(10)]

    merged = search.merge_seen_keys(current)

    assert len(merged) == SEEN_KEYS_CAP
    assert set(current).issubset(set(merged))


def test_seen_keys_are_bounded():
    search = make_search(seen_address_keys=[f"old-{i}|34981" for i in range(SEEN_KEYS_CAP)])

    merged = search.merge_seen_keys([f"new-{i}|34981" for i in range(SEEN_KEYS_CAP)])

    assert len(merged) == SEEN_KEYS_CAP


def test_duplicate_keys_in_one_run_are_collapsed():
    merged = make_search().merge_seen_keys(["a|34981", "a|34981", "b|34981"])

    assert merged == ["a|34981", "b|34981"]


# ─── Stored filters replay faithfully ────────────────────────────────────


def test_a_saved_search_replays_the_filters_it_stored():
    search = make_search(
        filters={"min_price": 150_000, "bedrooms": 3, "listing_statuses": ["active"]}
    )

    request = to_request(search)

    assert isinstance(request, MapSearchRequest)
    assert request.min_price == 150_000
    assert request.bedrooms == 3
    assert request.listing_statuses == ["active"]
    assert (request.north, request.south) == (BASE_BOUNDS["north"], BASE_BOUNDS["south"])


def test_unknown_filter_keys_are_dropped_at_the_door():
    """``to_request`` splats ``filters`` into MapSearchRequest, so an unknown
    key stored today is a 500 on every future replay. It also keeps a client
    from smuggling a field past the eligibility check."""
    payload = SavedMapSearchCreate(
        name="Farm",
        **BASE_BOUNDS,
        filters={"min_price": 100_000, "not_a_real_field": True, "limit": 99999},
    )

    assert payload.filters == {"min_price": 100_000}


def test_every_stored_filter_field_is_a_real_map_search_field():
    """Guards against a typo in the allowlist silently disabling a filter."""
    assert STORED_FILTER_FIELDS <= set(MapSearchRequest.model_fields)


def test_a_polygon_needs_enough_vertices_to_enclose_anything():
    with pytest.raises(ValueError):
        SavedMapSearchCreate(name="Farm", **BASE_BOUNDS, polygon=[[27.4, -80.3], [27.5, -80.3]])
