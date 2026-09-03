"""Provider-spend controls on ``MapSearchService``.

Map search dispatches up to dozens of paid provider calls per request, so the
cache key and the dispatch gate are cost controls, not conveniences. Two
regressions are guarded here.

1. **The cache key was too fine to ever hit.** Bounds were rounded to three
   decimals (~111 m), so an ordinary drag produced a brand-new key and re-ran
   the whole fan-out. Bounds are now snapped outward onto an absolute tile grid
   whose step scales with the viewport span, so near-identical viewports from
   any user collapse onto one key.

2. **STR parameters were absent from the key.** ``include_str_listings`` /
   ``str_state`` / ``str_city`` did not participate, so toggling Airbnb on
   returned the cached non-Airbnb result — and two different cities shared one
   entry.

Plus the zoom gate: the expensive per-property modes (motivated-seller keyword
scans, expired validation, distressed URL queries) refuse to run at region
zoom instead of billing for a result set no investor can work.
"""

from __future__ import annotations

import pytest
from app.schemas.property import MapListing, MapSearchRequest, MapSearchResponse
from app.services.map_search_service import (
    EXPENSIVE_MODE_MAX_RADIUS_MILES,
    MapSearchService,
    _build_cache_key,
    _expensive_mode_labels,
    _quantize_viewport,
    _viewport_radius_miles,
)


def _req(**overrides) -> MapSearchRequest:
    """A ~7-mile Fort Pierce, FL viewport — well inside the expensive-mode cap."""
    base = {
        "north": 27.4800,
        "south": 27.3800,
        "east": -80.2800,
        "west": -80.3800,
    }
    base.update(overrides)
    return MapSearchRequest(**base)


# ─── Tile quantization ───────────────────────────────────────────────────


def test_a_pan_session_collapses_to_a_handful_of_keys():
    """The core cost fix, measured the way the bill is: keys per pan session.

    Twenty small drags across roughly a mile. Under the old three-decimal
    rounding every one of them was a distinct key and therefore a full
    provider fan-out; snapped to tiles the same session touches a couple.
    """
    keys = {
        _build_cache_key(
            _req(
                north=27.4800 + i * 0.001,
                south=27.3800 + i * 0.001,
                east=-80.2800 + i * 0.001,
                west=-80.3800 + i * 0.001,
            )
        )
        for i in range(20)
    }

    assert len(keys) <= 4


def test_different_areas_do_not_share_a_cache_key():
    """Snapping must not be so coarse that neighbouring towns collide."""
    fort_pierce = _req()
    port_st_lucie = _req(north=27.3000, south=27.2000, east=-80.3300, west=-80.4300)

    assert _build_cache_key(fort_pierce) != _build_cache_key(port_st_lucie)


def test_snapped_tile_contains_the_requested_viewport():
    """The tile is searched instead of the viewport, so it must cover it."""
    req = _req()
    north, south, east, west = _quantize_viewport(req.north, req.south, req.east, req.west)

    assert north >= req.north
    assert south <= req.south
    assert east >= req.east
    assert west <= req.west


def test_snapping_does_not_balloon_the_searched_area():
    """Growth is bounded so a tile can't cross a grid-size threshold's cost."""
    req = _req()
    north, south, east, west = _quantize_viewport(req.north, req.south, req.east, req.west)

    requested = _viewport_radius_miles(req.north, req.south, req.east, req.west)
    tile = _viewport_radius_miles(north, south, east, west)

    assert tile <= requested * 1.5


def test_quantization_grid_is_absolute_not_caller_relative():
    """Shared alignment is what makes one user's fetch serve the next user.

    Snapping is to multiples of the step from zero, so the result is a
    function of *where* the viewport is, not of who asked. Two callers framing
    the same neighbourhood slightly differently therefore land on one tile —
    the property a caller-relative scheme (round to N decimals of the caller's
    own bounds) can never provide.
    """
    tile = _quantize_viewport(27.4800, 27.3800, -80.2800, -80.3800)

    for offset in (0.0002, -0.0002, 0.0005):
        assert (
            _quantize_viewport(
                27.4800 + offset,
                27.3800 + offset,
                -80.2800 + offset,
                -80.3800 + offset,
            )
            == tile
        )


# ─── STR parameters in the cache key ─────────────────────────────────────


def test_airbnb_toggle_changes_the_cache_key():
    assert _build_cache_key(_req()) != _build_cache_key(
        _req(include_str_listings=True, str_state="FL", str_city="Fort Pierce")
    )


def test_different_str_cities_do_not_share_a_cache_key():
    miami = _req(include_str_listings=True, str_state="FL", str_city="Miami")
    tampa = _req(include_str_listings=True, str_state="FL", str_city="Tampa")

    assert _build_cache_key(miami) != _build_cache_key(tampa)


def test_str_city_casing_is_normalized():
    """Two spellings of one city must not double the provider bill."""
    lower = _req(include_str_listings=True, str_state="fl", str_city="fort pierce")
    title = _req(include_str_listings=True, str_state="FL", str_city="Fort Pierce")

    assert _build_cache_key(lower) == _build_cache_key(title)


# ─── Expensive-mode zoom gate ────────────────────────────────────────────


@pytest.mark.parametrize(
    ("req", "expected"),
    [
        (_req(motivated_seller_search=True), ["motivated sellers"]),
        (_req(listing_statuses=["expired"]), ["expired listings"]),
        (_req(listing_statuses=["pre-foreclosure"]), ["distressed listings"]),
        (_req(listing_statuses=["auction", "foreclosure"]), ["distressed listings"]),
        (_req(listing_statuses=["active"]), []),
        (_req(), []),
    ],
)
def test_expensive_modes_are_identified(req, expected):
    statuses = set(req.listing_statuses or ["active"])
    assert _expensive_mode_labels(req, statuses) == expected


def test_expensive_mode_cap_matches_the_single_grid_point_band():
    """An expensive mode must never also be multiplied by grid fan-out.

    ``search()`` moves to a 2x2 grid above 30 miles, so the cap has to sit at
    or below that boundary or the two cost multipliers compound.
    """
    assert EXPENSIVE_MODE_MAX_RADIUS_MILES <= 30.0


# ─── Drawn boundaries share the tile they sit in ─────────────────────────
#
# ``polygon`` is not part of the cache key, so it must not be applied inside
# the cached body. If it were, a drawn farm boundary and a plain viewport over
# the same tile would share one entry and whichever ran second would be served
# the other's result — the viewport silently losing every listing outside a
# boundary it never drew.


def test_polygon_is_not_part_of_the_cache_key():
    boundary = [[27.44, -80.34], [27.46, -80.34], [27.46, -80.30], [27.44, -80.30]]

    assert _build_cache_key(_req()) == _build_cache_key(_req(polygon=boundary))


@pytest.mark.asyncio
async def test_a_drawn_boundary_reuses_the_tile_and_clips_it():
    """One dispatch for the tile; the boundary is applied to the response."""
    inside = MapListing(
        id="in", address="Inside the boundary", latitude=27.450, longitude=-80.320, source="rentcast"
    )
    outside = MapListing(
        id="out", address="Outside the boundary", latitude=27.400, longitude=-80.370, source="rentcast"
    )

    service = MapSearchService()
    tile_calls: list[MapSearchRequest] = []

    async def fake_tile(req: MapSearchRequest) -> MapSearchResponse:
        tile_calls.append(req)
        return MapSearchResponse(
            listings=[inside, outside],
            total_count=2,
            estimated_total=40,
            viewport_center=[27.43, -80.33],
        )

    service._search_tile = fake_tile  # type: ignore[method-assign]

    boundary = [[27.44, -80.34], [27.46, -80.34], [27.46, -80.30], [27.44, -80.30]]
    response = await service.search(_req(polygon=boundary))

    # The tile search is dispatched without the polygon, so its cached payload
    # stays valid for any viewport or boundary inside the same tile.
    assert len(tile_calls) == 1
    assert tile_calls[0].polygon is None

    assert [i.id for i in response.listings] == ["in"]
    assert response.total_count == 1
    # A tile-wide extrapolation cannot be rescaled to an arbitrary polygon.
    assert response.estimated_total is None


@pytest.mark.asyncio
async def test_a_viewport_search_is_returned_whole():
    listings = [
        MapListing(id="a", address="A", latitude=27.45, longitude=-80.32, source="rentcast"),
        MapListing(id="b", address="B", latitude=27.40, longitude=-80.37, source="rentcast"),
    ]

    service = MapSearchService()

    async def fake_tile(req: MapSearchRequest) -> MapSearchResponse:
        return MapSearchResponse(
            listings=listings, total_count=2, estimated_total=40, viewport_center=[27.43, -80.33]
        )

    service._search_tile = fake_tile  # type: ignore[method-assign]

    response = await service.search(_req())

    assert [i.id for i in response.listings] == ["a", "b"]
    assert response.estimated_total == 40
