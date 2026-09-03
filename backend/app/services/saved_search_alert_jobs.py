"""
New-inventory alerts for saved map searches.

This is the one phase of the map roadmap that adds recurring provider cost
rather than removing it, so the guardrails are the design rather than a
setting:

**One area is queried once.** Saved searches are grouped by their map-search
cache key before anything is dispatched. Because that key snaps the viewport
onto a shared tile grid, two investors watching the same neighbourhood with
the same filters collapse into a single group — one provider search fanned out
to both. ``provider_searches`` versus ``subscribers`` in the run summary is the
measurement of that: the gap between them is the money the dedupe saved.

**Only the cheap dispatch path runs.** ``alert_ineligible_reason`` is checked
again here, not merely at write time, so a search that became expensive (or
was stored before a rule tightened) is skipped instead of billed.

**Frequency is capped in the job.** ``SavedMapSearch.is_alert_due`` enforces a
minimum gap between emails, so the cron interval is only an upper bound on how
often we *look*.

**The first run never emails.** It records the baseline. Without that, turning
on alerts would immediately send "500 new listings", which is not news.

Runs off-peak from the cron-gated jobs router.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.saved_map_search import AlertFrequency, SavedMapSearch
from app.schemas.property import MapListing, MapSearchRequest
from app.schemas.saved_map_search import SavedSearchAlertRunResult
from app.services import saved_map_search_service as saved_searches
from app.services.email_service import email_service
from app.services.map_search_service import (
    MapSearchService,
    _build_cache_key,
    _point_in_polygon,
    alert_ineligible_reason,
    map_search_service,
)

logger = logging.getLogger(__name__)

# Ceiling on distinct provider searches per run. Groups beyond it are left for
# the next run — every search keeps its own ``last_alert_sent_at``, so the
# backlog rotates rather than starving a fixed set of users.
DEFAULT_MAX_PROVIDER_SEARCHES = 40

# How many listings the email itself lists before summarizing the remainder.
# An email is a prompt to open the map, not a replacement for it.
EMAIL_PREVIEW_LIMIT = 8


def _listing_key(listing: MapListing) -> str:
    """Stable identity for new-inventory diffing.

    Provider ids are unusable here: the same property can arrive from RentCast
    or Zillow with different ids, and the merge keeps whichever row carried the
    stronger status. That winner can change between runs, which would present
    an already-seen property as new. The canonical address key is the same one
    the search uses to dedupe across providers, so it is stable by
    construction.
    """
    return MapSearchService._addr_match_key(listing.address) or f"latlng|{listing.latitude:.5f},{listing.longitude:.5f}"


async def _load_due_searches(db: AsyncSession, now: datetime) -> list[SavedMapSearch]:
    """Alert-enabled searches whose frequency cap has elapsed."""
    result = await db.execute(
        select(SavedMapSearch)
        .where(SavedMapSearch.alert_frequency != AlertFrequency.OFF)
        .options(selectinload(SavedMapSearch.user))
        .order_by(SavedMapSearch.last_alert_sent_at.asc().nulls_first())
    )
    return [s for s in result.scalars().all() if s.is_alert_due(now)]


def _group_by_dispatch(
    searches: list[SavedMapSearch],
) -> dict[str, tuple[MapSearchRequest, list[SavedMapSearch]]]:
    """Collapse searches that resolve to the same provider query.

    The grouping key is the map-search cache key, so the grouping is exactly
    as coarse as the cache is — no more, no less. Anything the cache would have
    served from one entry is dispatched once here.
    """
    groups: dict[str, tuple[MapSearchRequest, list[SavedMapSearch]]] = {}

    for search in searches:
        # Polygons clip the same underlying tile, so they must not split a
        # group. Each member re-applies its own boundary to the shared result.
        request = saved_searches.to_request(search).model_copy(update={"polygon": None})
        key = _build_cache_key(request)
        if key in groups:
            groups[key][1].append(search)
        else:
            groups[key] = (request, [search])

    return groups


def _clip_to_polygon(listings: list[MapListing], search: SavedMapSearch) -> list[MapListing]:
    """Restrict shared group results to this subscriber's drawn boundary."""
    if not search.polygon:
        return listings
    return [i for i in listings if _point_in_polygon(i.latitude, i.longitude, search.polygon)]


def _screen_rank(listing: MapListing) -> tuple[int, float]:
    """Order for the email preview: strongest rent-to-price screen first.

    Which eight of a hundred new listings to show is a real editorial choice,
    and the Phase 3 screen is the only ranking signal a map listing carries
    that speaks to whether the deal pencils. Listings without a screen sort
    last rather than being treated as zero-ratio.
    """
    ratio = listing.zip_rent_to_price
    if ratio is None:
        return (1, 0.0)
    return (0, -ratio)


async def send_saved_search_alerts(
    db: AsyncSession,
    *,
    max_provider_searches: int = DEFAULT_MAX_PROVIDER_SEARCHES,
) -> SavedSearchAlertRunResult:
    """Email new inventory for every saved search that is due."""
    now = datetime.now(UTC)
    due = await _load_due_searches(db, now)
    if not due:
        return SavedSearchAlertRunResult(
            due=0, provider_searches=0, subscribers=0, seeded=0, emails_sent=0, errors=0
        )

    groups = _group_by_dispatch(due)

    provider_searches = 0
    subscribers = 0
    seeded = 0
    emails_sent = 0
    errors = 0

    for request, members in groups.values():
        if provider_searches >= max_provider_searches:
            logger.info(
                "Saved-search alerts hit the per-run dispatch cap (%d); %d groups deferred",
                max_provider_searches,
                len(groups) - provider_searches,
            )
            break

        reason = alert_ineligible_reason(request)
        if reason:
            # Stored before a rule tightened, or hand-crafted via the API.
            # Turn the schedule off so it stops being reconsidered every run.
            logger.warning("Disabling %d ineligible alert search(es): %s", len(members), reason)
            for search in members:
                search.alert_frequency = AlertFrequency.OFF
            continue

        try:
            response = await map_search_service.search(request)
        except Exception as exc:
            errors += 1
            logger.warning("Saved-search alert dispatch failed: %s", exc)
            continue

        provider_searches += 1

        if response.notice:
            # The search declined to run (e.g. too wide for its mode). Nothing
            # was fetched, so leave the baseline untouched.
            logger.info("Saved-search alert search returned a notice: %s", response.notice)
            continue

        for search in members:
            subscribers += 1
            listings = _clip_to_polygon(response.listings, search)
            current_keys = [_listing_key(i) for i in listings]

            first_run = not search.seen_address_keys
            known = set(search.seen_address_keys or [])
            new_listings = [
                listing
                for listing, key in zip(listings, current_keys, strict=True)
                if key not in known
            ]

            search.seen_address_keys = search.merge_seen_keys(current_keys)
            search.last_checked_at = now

            if first_run:
                seeded += 1
                continue
            if not new_listings:
                continue

            new_listings.sort(key=_screen_rank)
            try:
                result = await email_service.send_new_inventory_alert_email(
                    to=search.user.email,
                    user_name=(search.user.full_name or "").split(" ")[0],
                    search_name=search.name,
                    listings=[
                        {
                            "address": listing.address,
                            "price": listing.price,
                            "bedrooms": listing.bedrooms,
                            "bathrooms": listing.bathrooms,
                            "listing_status": listing.listing_status,
                            "zip_median_rent": listing.zip_median_rent,
                            "zip_rent_to_price": listing.zip_rent_to_price,
                        }
                        for listing in new_listings[:EMAIL_PREVIEW_LIMIT]
                    ],
                    total_new=len(new_listings),
                    frequency=str(search.alert_frequency),
                )
            except Exception as exc:
                errors += 1
                logger.warning("Saved-search alert email failed for %s: %s", search.id, exc)
                continue

            if result.get("success"):
                emails_sent += 1
                search.last_alert_sent_at = now
            else:
                errors += 1

    await db.commit()

    logger.info(
        "Saved-search alerts: %d due, %d provider searches fanned out to %d subscribers, %d emails",
        len(due),
        provider_searches,
        subscribers,
        emails_sent,
    )

    return SavedSearchAlertRunResult(
        due=len(due),
        provider_searches=provider_searches,
        subscribers=subscribers,
        seeded=seeded,
        emails_sent=emails_sent,
        errors=errors,
    )
