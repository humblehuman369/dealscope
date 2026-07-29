"""Tests for the coverage-string resolver.

These decide what a directory's free-text service area actually means, so the
cases that matter are the ones where a plausible-looking shortcut produces a
*wrong* county rather than no county. Resolving "Jefferson City" to Jefferson
County, or "Baltimore County" to the independent city, would claim a buyer works
somewhere they do not — and nothing downstream could detect it.

Built from a hand-written fixture rather than the database so each rule is
readable in isolation; ``test_directory_service_area`` exercises the same code
against the real gazetteer.
"""

import pytest
from app.services.geo_matching import CoverageResolver, normalize_place_name

# (fips, legal name, short name, state). The legal name is what marks an
# independent city: Census spells those with a lowercase "city".
COUNTIES = [
    ("24005", "Baltimore County", "Baltimore", "MD"),
    ("24510", "Baltimore city", "Baltimore", "MD"),
    ("24033", "Prince George's County", "Prince George's", "MD"),
    ("29189", "St. Louis County", "St. Louis", "MO"),
    ("29510", "St. Louis city", "St. Louis", "MO"),
    ("29099", "Jefferson County", "Jefferson", "MO"),
    ("29051", "Cole County", "Cole", "MO"),
    ("12057", "Hillsborough County", "Hillsborough", "FL"),
    ("12099", "Palm Beach County", "Palm Beach", "FL"),
    ("22005", "Ascension Parish", "Ascension", "LA"),
    ("36047", "Kings County", "Kings", "NY"),
    ("37067", "Forsyth County", "Forsyth", "NC"),
    ("48293", "Limestone County", "Limestone", "TX"),
    ("48213", "Henderson County", "Henderson", "TX"),
]

# (short name, aliases, state, county fips)
CITIES = [
    ("Tampa", [], "FL", ["12057"]),
    ("Jefferson City", [], "MO", ["29051"]),
    ("Kansas City", [], "MO", ["29095"]),
    ("Winston-Salem", [], "NC", ["37067"]),
    ("Mexia", [], "TX", ["48293"]),
    ("Malakoff", [], "TX", ["48213"]),
    # Same name, two different counties — genuinely undecidable.
    ("Springfield", [], "TX", ["48293"]),
    ("Springfield", [], "TX", ["48213"]),
]


@pytest.fixture(scope="module")
def resolver() -> CoverageResolver:
    return CoverageResolver(COUNTIES, CITIES)


def resolve(resolver: CoverageResolver, raw: str, state: str | None = "MD"):
    return resolver.resolve(raw, state)


# ---------------------------------------------------------------------------
# Scope markers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("raw", ["All of CA", "all of ca", "Entire CA", "State of CA"])
def test_state_markers_resolve_to_that_state(resolver, raw):
    result = resolve(resolver, raw, "FL")
    assert (result.kind, result.state) == ("state", "CA")


def test_all_of_us_is_nationwide_not_a_state_called_us(resolver):
    """"US" is a two-letter code that is not a state; treating it as one would
    silently create coverage for a state that does not exist."""
    assert resolve(resolver, "All of US", "FL").kind == "nationwide"


def test_bare_statewide_uses_the_entitys_own_state(resolver):
    result = resolve(resolver, "Statewide", "MO")
    assert (result.kind, result.state) == ("state", "MO")


def test_bare_statewide_without_an_entity_state_is_unmatched(resolver):
    assert resolve(resolver, "Statewide", None).kind == "unmatched"


# ---------------------------------------------------------------------------
# The county / independent-city collision
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "state", "expected"),
    [
        ("Baltimore County", "MD", ("24005",)),
        ("Baltimore City", "MD", ("24510",)),
        ("St. Louis County", "MO", ("29189",)),
        ("St Louis City", "MO", ("29510",)),
    ],
)
def test_an_explicit_suffix_picks_the_one_it_names(resolver, raw, state, expected):
    result = resolve(resolver, raw, state)
    assert (result.kind, result.county_fips) == ("county", expected)


@pytest.mark.parametrize(("raw", "state"), [("Baltimore", "MD"), ("St. Louis", "MO")])
def test_a_bare_shared_name_covers_both(resolver, raw, state):
    """Either reading puts the entity in that metro, so the union is the only
    answer that cannot exclude the area they meant."""
    result = resolve(resolver, raw, state)
    assert result.kind == "county"
    assert len(result.county_fips) == 2


# ---------------------------------------------------------------------------
# Names that must not be mistaken for a county
# ---------------------------------------------------------------------------


def test_jefferson_city_is_not_jefferson_county(resolver):
    """The regression this ordering exists to prevent: stripping "City" first
    would send Missouri's capital to a county 100 miles away."""
    result = resolve(resolver, "Jefferson City", "MO")
    assert result.county_fips == ("29051",)  # Cole County


def test_the_county_of_that_name_still_resolves(resolver):
    assert resolve(resolver, "Jefferson", "MO").county_fips == ("29099",)


def test_kansas_city_is_not_read_as_kansas(resolver):
    assert resolve(resolver, "Kansas City", "MO").county_fips == ("29095",)


# ---------------------------------------------------------------------------
# Spelling differences that mean the same place
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "state", "expected"),
    [
        ("Prince George's", "MD", "24033"),
        ("Prince George\u2019s County", "MD", "24033"),  # curly apostrophe
        ("prince georges", "MD", "24033"),
        ("Winston-Salem", "NC", "37067"),
        ("Winston Salem", "NC", "37067"),
        ("Ascension Parish", "LA", "22005"),
        ("Ascension", "LA", "22005"),
        ("Palm Beach Co.", "FL", "12099"),
        ("PALM BEACH COUNTY", "FL", "12099"),
    ],
)
def test_punctuation_and_suffixes_do_not_change_the_answer(resolver, raw, state, expected):
    assert resolve(resolver, raw, state).county_fips == (expected,)


def test_a_city_resolves_to_its_county(resolver):
    assert resolve(resolver, "Tampa", "FL").county_fips == ("12057",)


def test_nyc_boroughs_map_to_their_county(resolver):
    """No Census record connects "Brooklyn" to Kings County, but every buyer in
    the five boroughs writes the borough name."""
    assert resolve(resolver, "Brooklyn", "NY").county_fips == ("36047",)


# ---------------------------------------------------------------------------
# Refusing to guess
# ---------------------------------------------------------------------------


def test_two_same_named_places_in_different_counties_stay_ambiguous(resolver):
    assert resolve(resolver, "Springfield", "TX").kind == "ambiguous"


def test_a_place_in_a_neighbouring_state_is_not_reached_for(resolver):
    """A Tennessee buyer covering "DeSoto" means DeSoto County, Mississippi.
    Searching adjacent states to find it would be a guess, so it stays
    unmatched and shows up in the gap report instead."""
    assert resolve(resolver, "DeSoto", "TN").kind == "unmatched"


def test_an_unknown_name_is_unmatched(resolver):
    assert resolve(resolver, "Hampton Roads", "VA").kind == "unmatched"


def test_a_place_name_without_a_state_cannot_be_scoped(resolver):
    assert resolve(resolver, "Atlanta", None).kind == "unmatched"


@pytest.mark.parametrize("raw", ["", "   ", ","])
def test_empty_strings_resolve_to_nothing(resolver, raw):
    assert resolve(resolver, raw, "FL").kind == "unmatched"


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("DeSoto Co.", "desoto"),
        ("Ascension Parish", "ascension"),
        ("St. Clair", "st clair"),
        ("Saint Clair", "st clair"),
        ("Miami-Dade County", "miami dade"),
        ("Kansas City", "kansas city"),
    ],
)
def test_normalize_place_name(raw, expected):
    assert normalize_place_name(raw) == expected
