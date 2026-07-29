"""Tests for the canonical county seed data behind the geo_counties table.

These assert the data file, not the table: the file is the artifact the seeder
writes to Postgres, so pinning it catches a bad Gazetteer rebuild before it
reaches the database.
"""

import json
from pathlib import Path

import pytest

DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "geo" / "counties.json"
CROSSWALK_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "zip_crosswalk.json"


@pytest.fixture(scope="module")
def counties() -> list[dict]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))["counties"]


@pytest.fixture(scope="module")
def by_fips(counties) -> dict[str, dict]:
    return {county["fips"]: county for county in counties}


# ---------------------------------------------------------------------------
# Shape and coverage
# ---------------------------------------------------------------------------


def test_covers_every_county_in_the_country(counties):
    """3,222 current county-equivalents (50 states + DC + PR) plus 8 retired CT counties."""
    assert len(counties) == 3230
    assert sum(1 for county in counties if county["is_current"]) == 3222


def test_covers_all_52_state_level_jurisdictions(counties):
    assert len({county["state"] for county in counties}) == 52


def test_fips_is_a_unique_five_digit_key(counties):
    codes = [county["fips"] for county in counties]
    assert len(set(codes)) == len(codes)
    assert all(len(code) == 5 and code.isdigit() for code in codes)


def test_required_fields_are_populated(counties):
    for county in counties:
        assert county["name"].strip() == county["name"] and county["name"]
        assert county["short_name"].strip() == county["short_name"] and county["short_name"]
        assert len(county["state"]) == 2 and county["state"].isupper()


def test_centroids_fall_inside_plausible_us_bounds(counties):
    """Latitude spans PR to northern Alaska; longitude wraps for the Aleutians.

    Aleutians West Census Area (02016) sits across the antimeridian, so its
    centroid longitude is positive.
    """
    for county in counties:
        if county["lat"] is None:
            continue
        assert 17.0 < county["lat"] < 72.0, county
        assert -180.0 < county["lng"] < -64.0 or county["lng"] > 172.0, county


def test_only_retired_counties_lack_a_centroid(counties):
    """A missing centroid is deliberate for retired geographies and a bug otherwise."""
    missing = {county["fips"] for county in counties if county["lat"] is None}
    retired = {county["fips"] for county in counties if not county["is_current"]}
    assert missing == retired


# ---------------------------------------------------------------------------
# Suffix stripping: the part most likely to silently regress
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("fips", "name", "short"),
    [
        ("12099", "Palm Beach County", "Palm Beach"),  # the common case
        ("22071", "Orleans Parish", "Orleans"),  # LA
        ("02020", "Anchorage Municipality", "Anchorage"),  # AK
        ("02110", "Juneau City and Borough", "Juneau"),  # AK, compound suffix
        ("02290", "Yukon-Koyukuk Census Area", "Yukon-Koyukuk"),  # AK
        ("02013", "Aleutians East Borough", "Aleutians East"),  # AK
        ("24510", "Baltimore city", "Baltimore"),  # independent city
        ("32510", "Carson City", "Carson City"),  # "City" is part of the name
        ("51095", "James City County", "James City"),  # "City" mid-name
        ("11001", "District of Columbia", "District of Columbia"),  # no suffix
        ("09110", "Capitol Planning Region", "Capitol Planning Region"),  # CT, no suffix
        ("72001", "Adjuntas Municipio", "Adjuntas"),  # PR
    ],
)
def test_short_name_strips_only_the_governmental_suffix(by_fips, fips, name, short):
    assert by_fips[fips]["name"] == name
    assert by_fips[fips]["short_name"] == short


def test_non_ascii_names_survive_the_source_encoding(by_fips):
    """The Gazetteer is UTF-8; decoding it as latin-1 yields "DoÃ±a Ana"."""
    assert by_fips["35013"]["name"] == "Doña Ana County"


def test_short_name_is_not_unique_within_a_state(counties):
    """Independent cities collide with their namesake counties, so never key on name.

    Maryland has Baltimore County and Baltimore city; Missouri has the St. Louis
    pair; Virginia has four. A name-only lookup is genuinely ambiguous and
    callers have to handle more than one hit.
    """
    collisions = set()
    seen: dict[tuple[str, str], str] = {}
    for county in counties:
        key = (county["state"], county["short_name"].lower())
        if key in seen:
            collisions.add(key)
        seen[key] = county["fips"]

    assert collisions == {
        ("MD", "baltimore"),
        ("MO", "st. louis"),
        ("VA", "fairfax"),
        ("VA", "franklin"),
        ("VA", "richmond"),
        ("VA", "roanoke"),
    }


# ---------------------------------------------------------------------------
# Cross-dataset consistency
# ---------------------------------------------------------------------------


def test_every_county_named_by_the_zip_crosswalk_resolves(counties):
    """The two geo datasets must join, or ZIP-derived counties dangle.

    They come from different Census vintages: the crosswalk from the 2020 ZCTA
    relationship file, this file from the 2024 Gazetteer. Connecticut replaced
    its counties with planning regions in between, which is why the retired
    rows exist.
    """
    canonical = {(county["state"], county["name"]) for county in counties}
    crosswalk = json.loads(CROSSWALK_PATH.read_text(encoding="utf-8"))["zips"]
    referenced = {(entry[0], name) for entry in crosswalk.values() for name in entry[1:]}
    assert referenced - canonical == set()


def test_retired_connecticut_counties_are_kept_but_flagged(by_fips):
    for fips in ("09001", "09003", "09005", "09007", "09009", "09011", "09013", "09015"):
        assert by_fips[fips]["state"] == "CT"
        assert by_fips[fips]["is_current"] is False


def test_current_connecticut_geography_is_the_nine_planning_regions(counties):
    current_ct = [c for c in counties if c["state"] == "CT" and c["is_current"]]
    assert len(current_ct) == 9
    assert all(county["name"].endswith("Planning Region") for county in current_ct)


def test_state_prefix_of_fips_is_consistent_within_each_state(counties):
    """One state FIPS prefix per USPS code, so fips[:2] is a reliable state key."""
    prefixes: dict[str, set[str]] = {}
    for county in counties:
        prefixes.setdefault(county["state"], set()).add(county["fips"][:2])
    assert all(len(found) == 1 for found in prefixes.values())
