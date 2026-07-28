"""Tests for ZIP -> state/county resolution behind the directory geo search."""

import pytest
from app.services.lenders_service import filter_lenders
from app.services.zip_geo import _load_crosswalk, normalize_zip, resolve_zip, zip_count


# ---------------------------------------------------------------------------
# Input handling
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("33460", "33460"),
        ("  90210 ", "90210"),
        ("33460-1234", "33460"),
        ("00501", "00501"),  # leading zeros are significant
    ],
)
def test_normalize_zip_accepts_valid_input(raw, expected):
    assert normalize_zip(raw) == expected


@pytest.mark.parametrize("raw", [None, "", "   ", "9021", "904105", "abcde", "9021a"])
def test_normalize_zip_rejects_invalid_input(raw):
    assert normalize_zip(raw) is None


# ---------------------------------------------------------------------------
# Resolution against the real crosswalk
# ---------------------------------------------------------------------------


def test_resolves_zip_to_state_and_county():
    location = resolve_zip("33460")
    assert location is not None
    assert location.state == "FL"
    assert location.county == "Palm Beach County"


def test_resolves_zip_plus_four():
    assert resolve_zip("90210-1234").state == "CA"


def test_po_box_zip_resolves_to_state_with_no_county():
    """PO-box-only ZIPs have no Census ZCTA — a state, but never a fabricated county."""
    location = resolve_zip("00501")
    assert location is not None
    assert location.state == "NY"
    assert location.county is None
    assert location.counties == ()


def test_unrecognized_zip_returns_none():
    assert resolve_zip("99999") is None


def test_malformed_input_returns_none():
    assert resolve_zip("not-a-zip") is None
    assert resolve_zip(None) is None


@pytest.mark.parametrize(
    ("zip_code", "state"),
    [
        ("82930", "WY"),  # Evanston WY; more of its land area sits in Summit County UT
        ("42223", "KY"),  # Fort Campbell; straddles the TN line
        ("93737", "CA"),  # Fresno PO box ZIP
    ],
)
def test_border_zips_resolve_to_the_usps_state(zip_code, state):
    assert resolve_zip(zip_code).state == state


def test_multi_county_zip_lists_every_county_primary_first():
    location = resolve_zip("33460")
    assert location.counties[0] == location.county
    assert len(location.counties) == len(set(location.counties))


# ---------------------------------------------------------------------------
# Coverage: the crosswalk has to serve the directory it feeds
# ---------------------------------------------------------------------------


def test_crosswalk_covers_the_whole_country():
    assert zip_count() > 40_000


def test_every_state_a_lender_serves_is_reachable_by_zip():
    """A ZIP search must be able to reach every state the directory covers."""
    served = {state for lender in filter_lenders() for state in lender.states_served}
    reachable = {entry[0] for entry in _load_crosswalk().values()}
    assert served - reachable == set()
