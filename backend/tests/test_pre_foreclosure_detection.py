"""Pre-foreclosure detection and distressed-label integrity.

Two regressions are guarded here, both found on
``2406 River Hammock Ln, Fort Pierce, FL 34981`` (zpid 47816120) — a genuine
pre-foreclosure that the app reported as an ordinary off-market, agent-listed
home while the map simultaneously reported unrelated active listings as
pre-foreclosures.

1. **Detail path dropped the signal.** AXESSO returns
   ``homeStatus = "PRE_FORECLOSURE"``, but ``_extract_listing_info`` derived
   distress solely from ``listingSubType``. Pre-foreclosures are not listed for
   sale, so that object is empty and every flag came back false with
   ``seller_type`` falling through to its ``"FSBA"`` default.

2. **Map path fabricated the signal.** ``_fetch_zillow_distressed`` blanket-tagged
   every returned row with the requested bucket, assuming Zillow's
   ``filterState.pre``/``fore``/``auc`` toggles constrained the response. They are
   not honored — the three buckets return identical row sets — so the label was
   asserted without evidence.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from app.services.api_clients import DataNormalizer
from app.services.map_search_service import MapSearchService, normalize_listing_status


def _extract(axesso: dict) -> dict:
    normalized: dict = {}
    DataNormalizer()._extract_listing_info(
        normalized,
        axesso,
        datetime.now(UTC),
        {},
    )
    return normalized


# ─── 1. Detail path ──────────────────────────────────────────────────────


def test_home_status_pre_foreclosure_is_detected():
    """The real payload shape: PRE_FORECLOSURE with no listingSubType."""
    out = _extract({"homeStatus": "PRE_FORECLOSURE", "daysOnZillow": 155})

    assert out["is_pre_foreclosure"] is True
    assert out["seller_type"] == "PreForeclosure"


def test_pre_foreclosure_is_not_reported_as_agent_listed():
    """Guards the exact bug: seller_type fell through to the FSBA default."""
    out = _extract({"homeStatus": "PRE_FORECLOSURE"})

    assert out["seller_type"] != "FSBA"


def test_foreclosure_types_flag_is_detected():
    """``foreclosureTypes.isPreforeclosure`` was documented but never read."""
    out = _extract({"homeStatus": "OTHER", "foreclosureTypes": {"isPreforeclosure": True}})

    assert out["is_pre_foreclosure"] is True
    assert out["seller_type"] == "PreForeclosure"


def test_pre_foreclosure_has_no_list_price_and_is_off_market():
    """No asking price exists, so it must not be labelled an active listing."""
    out = _extract({"homeStatus": "PRE_FORECLOSURE", "price": 550700})

    assert out["is_off_market"] is True
    assert out["list_price"] is None


def test_pre_foreclosure_outranks_other_subtypes():
    out = _extract(
        {
            "homeStatus": "PRE_FORECLOSURE",
            "listingSubType": {"isFSBO": True},
        }
    )

    assert out["seller_type"] == "PreForeclosure"


@pytest.mark.parametrize("home_status", ["FOR_SALE", "SOLD", "OFF_MARKET", "PENDING", "OTHER", None])
def test_non_pre_foreclosure_statuses_stay_clear(home_status):
    """No false positives on ordinary inventory."""
    out = _extract({"homeStatus": home_status})

    assert out["is_pre_foreclosure"] is False
    assert out["seller_type"] != "PreForeclosure"


def test_reo_still_maps_to_bank_owned():
    """The listingSubType path must keep working for listed distress."""
    out = _extract({"homeStatus": "FOR_SALE", "listingSubType": {"isBankOwned": True}})

    assert out["is_pre_foreclosure"] is False
    assert out["seller_type"] == "BankOwned"


# ─── 2. Map path ─────────────────────────────────────────────────────────


class _StubResponse:
    def __init__(self, rows):
        self.success = True
        self.data = {"results": rows}


class _StubZillow:
    """Stands in for AXESSO's search-by-url."""

    def __init__(self, rows):
        self._rows = rows

    async def search_by_url(self, url: str):
        return _StubResponse(self._rows)


@pytest.mark.asyncio
async def test_unverifiable_rows_are_not_labelled_distressed():
    """A plain for-sale row must never be relabelled as pre-foreclosure."""
    service = MapSearchService()
    service.zillow = _StubZillow(
        [
            {
                "zpid": "1",
                "address": "590 Kenwood Dr SW, Vero Beach, FL 32968",
                "latitude": 27.6,
                "longitude": -80.4,
                "price": 365800,
                "homeStatus": "FOR_SALE",
            }
        ]
    )

    results = await service._fetch_zillow_distressed(27.6, -80.4, 5.0, "pre-foreclosure")

    assert results == []


@pytest.mark.asyncio
async def test_rows_with_real_evidence_are_kept():
    """When the provider does supply the flags, the row survives."""
    service = MapSearchService()
    service.zillow = _StubZillow(
        [
            {
                "zpid": "2",
                "address": "1 Real PreFC Ln, Fort Pierce, FL 34981",
                "latitude": 27.37,
                "longitude": -80.35,
                "foreclosureTypes": {"isPreforeclosure": True},
            }
        ]
    )

    results = await service._fetch_zillow_distressed(27.37, -80.35, 5.0, "pre-foreclosure")

    assert len(results) == 1
    assert normalize_listing_status(results[0].listing_status) == "pre-foreclosure"


@pytest.mark.asyncio
async def test_bucket_mismatch_is_dropped():
    """An auction row must not satisfy a pre-foreclosure query."""
    service = MapSearchService()
    service.zillow = _StubZillow(
        [
            {
                "zpid": "3",
                "address": "2 Auction Way, Fort Pierce, FL 34981",
                "latitude": 27.37,
                "longitude": -80.35,
                "listingSubType": {"isForAuction": True},
            }
        ]
    )

    assert await service._fetch_zillow_distressed(27.37, -80.35, 5.0, "pre-foreclosure") == []
    assert len(await service._fetch_zillow_distressed(27.37, -80.35, 5.0, "auction")) == 1


def test_rentcast_remains_a_verified_distress_source():
    """RentCast carries per-row flags, so it must feed the distressed filters."""
    from app.services.map_search_service import RENTCAST_SALE_STATUSES

    assert {"foreclosure", "pre-foreclosure", "auction"} <= RENTCAST_SALE_STATUSES

    status = MapSearchService._derive_rentcast_listing_status(
        {"listingSubType": {"isForeclosure": True}},
    )
    assert normalize_listing_status(status) == "pre-foreclosure"
