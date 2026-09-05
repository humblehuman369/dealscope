"""Property-type filter for map search.

The user-visible bug: selecting Multi-Family still showed single-family
houses. Two causes:

1. AXESSO home-type flags default to ALL true. Setting only
   ``isMultiFamily=True`` is a no-op — SFR inventory stays in the response.
2. Unlike price / beds / status, there was no post-fetch type filter, so
   Zillow ``MULTI_FAMILY`` vs RentCast ``Multi-Family`` never got reconciled
   and untyped / wrong-type rows leaked through.
"""

from __future__ import annotations

from app.schemas.property import MapListing
from app.services.map_search_service import (
    canonicalize_property_type,
    listing_matches_property_type,
    rentcast_property_type_param,
    zillow_property_type_flags,
)


class TestCanonicalizePropertyType:
    def test_multi_family_labels(self) -> None:
        for raw in (
            "Multi-Family",
            "Multi Family",
            "MULTI_FAMILY",
            "multifamily",
            "Duplex",
            "Triplex",
            "Fourplex",
        ):
            assert canonicalize_property_type(raw) == "multi_family", raw

    def test_single_family_labels(self) -> None:
        for raw in ("Single Family", "SINGLE_FAMILY", "SFR", "House"):
            assert canonicalize_property_type(raw) == "single_family", raw

    def test_multi_family_does_not_collapse_to_single(self) -> None:
        # The old `"single" in pt` check is the failure mode this guards.
        assert canonicalize_property_type("MULTI_FAMILY") != "single_family"
        assert canonicalize_property_type("Multi-Family") != "single_family"

    def test_condo_and_townhouse(self) -> None:
        assert canonicalize_property_type("Condo") == "condo"
        assert canonicalize_property_type("CONDO") == "condo"
        assert canonicalize_property_type("Townhouse") == "townhouse"
        assert canonicalize_property_type("Townhome") == "townhouse"

    def test_empty_or_unknown(self) -> None:
        assert canonicalize_property_type(None) is None
        assert canonicalize_property_type("") is None
        assert canonicalize_property_type("Land") is None
        assert canonicalize_property_type("Manufactured") is None


class TestListingMatchesPropertyType:
    def test_multi_family_filter_excludes_single_family(self) -> None:
        assert listing_matches_property_type("MULTI_FAMILY", "Multi-Family") is True
        assert listing_matches_property_type("Single Family", "Multi-Family") is False
        assert listing_matches_property_type("SINGLE_FAMILY", "Multi-Family") is False

    def test_missing_listing_type_is_dropped_when_filter_is_set(self) -> None:
        assert listing_matches_property_type(None, "Multi-Family") is False
        assert listing_matches_property_type("", "Single Family") is False

    def test_no_filter_keeps_everything(self) -> None:
        assert listing_matches_property_type("SINGLE_FAMILY", None) is True
        assert listing_matches_property_type(None, None) is True


class TestZillowPropertyTypeFlags:
    def test_multi_family_turns_other_types_off(self) -> None:
        flags = zillow_property_type_flags("Multi-Family")
        assert flags["isMultiFamily"] is True
        assert flags["isSingleFamily"] is False
        assert flags["isCondo"] is False
        assert flags["isTownhouse"] is False
        assert flags["isApartment"] is False

    def test_single_family_turns_multi_off(self) -> None:
        flags = zillow_property_type_flags("Single Family")
        assert flags["isSingleFamily"] is True
        assert flags["isMultiFamily"] is False

    def test_no_type_sends_no_flags(self) -> None:
        assert zillow_property_type_flags(None) == {}
        assert zillow_property_type_flags("") == {}


class TestRentcastPropertyTypeParam:
    def test_maps_zillow_label_to_rentcast_enum(self) -> None:
        assert rentcast_property_type_param("MULTI_FAMILY") == "Multi-Family"
        assert rentcast_property_type_param("SINGLE_FAMILY") == "Single Family"
        assert rentcast_property_type_param("Townhome") == "Townhouse"

    def test_passthrough_when_already_canonical(self) -> None:
        assert rentcast_property_type_param("Multi-Family") == "Multi-Family"


def _listing(property_type: str | None) -> MapListing:
    return MapListing(
        id=f"t-{property_type}",
        address="1 Main St",
        latitude=26.35,
        longitude=-80.08,
        property_type=property_type,
        source="test",
    )


class TestPostFetchFilterSemantics:
    def test_mixed_feed_keeps_only_matching_bucket(self) -> None:
        rows = [
            _listing("SINGLE_FAMILY"),
            _listing("Single Family"),
            _listing("MULTI_FAMILY"),
            _listing("Multi-Family"),
            _listing("Duplex"),
            _listing("Condo"),
            _listing(None),
        ]
        kept = [
            row
            for row in rows
            if listing_matches_property_type(row.property_type, "Multi-Family")
        ]
        assert {row.property_type for row in kept} == {
            "MULTI_FAMILY",
            "Multi-Family",
            "Duplex",
        }
