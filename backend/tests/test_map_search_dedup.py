"""
Cross-source dedup tests for ``MapSearchService``.

These guard the regression where distressed listings (foreclosure /
pre-foreclosure / auction) silently disappeared from the map after a
viewport refresh because the same address — returned earlier by
RentCast or Zillow's generic ``forSale`` query as ``Active`` — won the
first-seen-wins dedup race and dropped the distress label.

The fix swaps the dedup to status-priority-aware:

    foreclosure / pre-foreclosure / auction  > owner_listed > active

so the row carrying the strongest investor signal survives, regardless of
which upstream source happened to return first.
"""

from __future__ import annotations

from app.schemas.property import MapListing
from app.services.map_search_service import (
    MapSearchService,
    _listing_status_priority,
    _merge_preserving_loser_fields,
)


def _make_listing(
    *,
    address: str,
    listing_status: str | None,
    source: str = "test",
    photo_url: str | None = None,
    price: float | None = None,
    bedrooms: int | None = None,
    days_on_market: int | None = None,
    listing_id: str | None = None,
) -> MapListing:
    return MapListing(
        id=listing_id or f"{source}-{address}",
        address=address,
        latitude=40.0,
        longitude=-74.0,
        listing_status=listing_status,
        source=source,
        photo_url=photo_url,
        price=price,
        bedrooms=bedrooms,
        days_on_market=days_on_market,
    )


class TestListingStatusPriority:
    def test_distressed_outranks_active(self) -> None:
        assert _listing_status_priority("Foreclosure") > _listing_status_priority("Active")
        assert _listing_status_priority("Pre-Foreclosure") > _listing_status_priority("Active")
        assert _listing_status_priority("Auction") > _listing_status_priority("Active")

    def test_owner_listed_between_active_and_distressed(self) -> None:
        active = _listing_status_priority("Active")
        owner = _listing_status_priority("Owner Listed")
        distressed = _listing_status_priority("Foreclosure")
        assert active < owner < distressed

    def test_unknown_status_falls_below_active(self) -> None:
        assert _listing_status_priority("WeirdProviderLabel") < _listing_status_priority("Active")

    def test_none_or_empty_priority(self) -> None:
        assert _listing_status_priority(None) == 0
        assert _listing_status_priority("") == 0


class TestMergePreservingLoserFields:
    def test_carries_photo_and_price_forward_when_winner_missing(self) -> None:
        winner = _make_listing(
            address="1 Main St", listing_status="Foreclosure", source="zillow_distressed"
        )
        loser = _make_listing(
            address="1 Main St",
            listing_status="Active",
            source="rentcast",
            photo_url="https://example.com/p.jpg",
            price=350_000,
            bedrooms=3,
        )
        merged = _merge_preserving_loser_fields(winner, loser)
        assert merged.listing_status == "Foreclosure"
        assert merged.photo_url == "https://example.com/p.jpg"
        assert merged.price == 350_000
        assert merged.bedrooms == 3

    def test_does_not_overwrite_winner_when_winner_already_populated(self) -> None:
        winner = _make_listing(
            address="1 Main St",
            listing_status="Foreclosure",
            source="zillow_distressed",
            photo_url="https://winner.example/p.jpg",
            price=400_000,
        )
        loser = _make_listing(
            address="1 Main St",
            listing_status="Active",
            source="rentcast",
            photo_url="https://loser.example/p.jpg",
            price=350_000,
        )
        merged = _merge_preserving_loser_fields(winner, loser)
        assert merged.photo_url == "https://winner.example/p.jpg"
        assert merged.price == 400_000


class TestMergeListingInto:
    """Regression tests for the dedup race that hid distressed pins."""

    def test_distressed_row_overrides_earlier_active_row(self) -> None:
        # Simulates: RentCast returns "1 Main St" tagged Active first;
        # Zillow's foreclosure URL search returns the same address tagged
        # Foreclosure second. The map MUST keep the Foreclosure tag.
        bucket: dict[str, MapListing] = {}
        active_first = _make_listing(
            address="1 Main St",
            listing_status="Active",
            source="rentcast",
            photo_url="https://rentcast.example/p.jpg",
            price=325_000,
        )
        foreclosure_second = _make_listing(
            address="1 Main St",
            listing_status="Foreclosure",
            source="zillow_distressed",
        )
        MapSearchService._merge_listing_into(bucket, active_first)
        MapSearchService._merge_listing_into(bucket, foreclosure_second)

        assert len(bucket) == 1
        winner = next(iter(bucket.values()))
        assert winner.listing_status == "Foreclosure"
        # Display fields from the loser are preserved so the marker still
        # has a photo and price.
        assert winner.photo_url == "https://rentcast.example/p.jpg"
        assert winner.price == 325_000

    def test_active_row_does_not_override_earlier_distressed_row(self) -> None:
        # Reverse arrival order: distressed seen first, generic active
        # arrives later. The Active row must NOT replace the Foreclosure.
        bucket: dict[str, MapListing] = {}
        foreclosure_first = _make_listing(
            address="1 Main St",
            listing_status="Foreclosure",
            source="zillow_distressed",
        )
        active_second = _make_listing(
            address="1 Main St",
            listing_status="Active",
            source="rentcast",
            photo_url="https://rentcast.example/p.jpg",
            price=325_000,
        )
        MapSearchService._merge_listing_into(bucket, foreclosure_first)
        MapSearchService._merge_listing_into(bucket, active_second)

        winner = next(iter(bucket.values()))
        assert winner.listing_status == "Foreclosure"
        # Loser still contributes missing display fields.
        assert winner.photo_url == "https://rentcast.example/p.jpg"
        assert winner.price == 325_000

    def test_preforeclosure_and_auction_both_outrank_active(self) -> None:
        for distressed in ("Pre-Foreclosure", "Auction"):
            bucket: dict[str, MapListing] = {}
            MapSearchService._merge_listing_into(
                bucket,
                _make_listing(
                    address="2 Oak Ave",
                    listing_status="Active",
                    source="rentcast",
                ),
            )
            MapSearchService._merge_listing_into(
                bucket,
                _make_listing(
                    address="2 Oak Ave",
                    listing_status=distressed,
                    source="zillow_distressed",
                ),
            )
            winner = next(iter(bucket.values()))
            assert winner.listing_status == distressed, (
                f"{distressed} must outrank Active"
            )

    def test_owner_listed_outranks_active_but_loses_to_distressed(self) -> None:
        bucket: dict[str, MapListing] = {}
        MapSearchService._merge_listing_into(
            bucket,
            _make_listing(address="3 Pine", listing_status="Active", source="rentcast"),
        )
        MapSearchService._merge_listing_into(
            bucket,
            _make_listing(
                address="3 Pine", listing_status="Owner Listed", source="zillow"
            ),
        )
        assert next(iter(bucket.values())).listing_status == "Owner Listed"

        MapSearchService._merge_listing_into(
            bucket,
            _make_listing(
                address="3 Pine",
                listing_status="Foreclosure",
                source="zillow_distressed",
            ),
        )
        assert next(iter(bucket.values())).listing_status == "Foreclosure"

    def test_address_is_case_and_whitespace_insensitive(self) -> None:
        bucket: dict[str, MapListing] = {}
        MapSearchService._merge_listing_into(
            bucket,
            _make_listing(address="  1 MAIN St  ", listing_status="Active"),
        )
        MapSearchService._merge_listing_into(
            bucket,
            _make_listing(address="1 main st", listing_status="Foreclosure"),
        )
        assert len(bucket) == 1
        assert next(iter(bucket.values())).listing_status == "Foreclosure"

    def test_blank_address_is_skipped(self) -> None:
        bucket: dict[str, MapListing] = {}
        MapSearchService._merge_listing_into(
            bucket, _make_listing(address="   ", listing_status="Foreclosure")
        )
        assert bucket == {}

    def test_distinct_addresses_are_preserved(self) -> None:
        bucket: dict[str, MapListing] = {}
        for i in range(3):
            MapSearchService._merge_listing_into(
                bucket,
                _make_listing(
                    address=f"{i} Maple Dr",
                    listing_status="Foreclosure",
                    listing_id=f"id-{i}",
                ),
            )
        assert len(bucket) == 3
