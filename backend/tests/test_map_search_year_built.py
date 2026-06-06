"""Year-built extraction for map-search listing normalizers."""

from __future__ import annotations

from app.services.map_search_service import MapSearchService


class TestExtractYearBuilt:
    def test_top_level_year_built_camel_case(self) -> None:
        assert MapSearchService._extract_year_built({"yearBuilt": 1998}) == 1998

    def test_top_level_year_built_snake_case(self) -> None:
        assert MapSearchService._extract_year_built({"year_built": 2005}) == 2005

    def test_reso_facts_nested(self) -> None:
        item = {"resoFacts": {"yearBuilt": 1974}}
        assert MapSearchService._extract_year_built(item) == 1974

    def test_hdp_home_info_nested(self) -> None:
        item = {"hdpData": {"homeInfo": {"yearBuilt": 1988}}}
        assert MapSearchService._extract_year_built(item) == 1988

    def test_year_constructed_alias(self) -> None:
        assert MapSearchService._extract_year_built({"yearConstructed": 2012}) == 2012

    def test_invalid_or_missing_returns_none(self) -> None:
        assert MapSearchService._extract_year_built({}) is None
        assert MapSearchService._extract_year_built({"yearBuilt": 1700}) is None
        assert MapSearchService._extract_year_built({"yearBuilt": "n/a"}) is None


class TestNormalizeZillowListingYearBuilt:
    def test_populates_year_built_from_nested_payload(self) -> None:
        listing = MapSearchService._normalize_zillow_listing(
            {
                "zpid": 123,
                "address": "1 Main St, Boca Raton, FL 33432",
                "latitude": 26.35,
                "longitude": -80.08,
                "resoFacts": {"yearBuilt": 1991},
            }
        )
        assert listing.year_built == 1991


class TestNormalizeRentcastListingYearBuilt:
    def test_populates_year_built_from_snake_case(self) -> None:
        listing = MapSearchService._normalize_rentcast_listing(
            {
                "id": "rc-1",
                "formattedAddress": "2 Oak Ave, Boca Raton, FL 33432",
                "latitude": 26.36,
                "longitude": -80.09,
                "year_built": 1985,
            }
        )
        assert listing.year_built == 1985
