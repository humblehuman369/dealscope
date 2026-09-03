"""
Bulk analyze queue — rank a selection of map pins by Deal Gap.

This is the only part of the map roadmap that genuinely multiplies provider
spend: each address is a full ``PropertyService`` fan-out. Four constraints
shape the implementation, and none of them is optional.

**Sequential, never a parallel burst.** One address at a time. A burst of
twenty concurrent fan-outs is the fastest way to trip a provider rate limit
and get every one of them refused — turning a paid batch into nothing.

**Quota is charged per property, as it completes.** Checked before the fetch
and recorded after, so a run that stops early has charged for exactly the
analyses it delivered. The 30-day repeat rule from
``analysis_metering`` applies, which is what makes re-ranking an area the
investor already worked free.

**The 24h property cache is the point.** Nothing here bypasses it: no ``zpid``
is passed, because that argument makes ``search_property`` skip the cache
entirely. A batch over a farm area the investor has been clicking through is
therefore mostly cache hits.

**A time budget instead of a background worker.** The run drains what it can
within ``TIME_BUDGET_SECONDS`` and returns the rest in ``remaining`` for the
client to resubmit. That keeps each request a normal length and — the reason
it matters — makes the queue resumable, so a slow batch never charges quota
for results the user never receives.
"""

from __future__ import annotations

import logging
import time
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SubscriptionLimitError
from app.models.user import User
from app.schemas.analytics import IQVerdictResponse
from app.schemas.bulk_analyze import BulkAnalyzeResult
from app.services.analysis_metering import has_recent_successful_analysis
from app.services.assumption_resolver import resolve_assumptions
from app.services.billing_service import billing_service
from app.services.iq_verdict_service import compute_iq_verdict
from app.services.property_service import property_service
from app.services.search_history_service import search_history_service

logger = logging.getLogger(__name__)

# Wall-clock budget for one request. Sized so a run of cold properties returns
# well inside a normal HTTP timeout rather than stalling the client.
TIME_BUDGET_SECONDS = 45.0

# Always attempt at least one address, even if the budget is somehow already
# spent — otherwise a client resubmitting `remaining` could loop forever
# without making progress.
MIN_ATTEMPTS_PER_RUN = 1


def _rank_key(result: BulkAnalyzeResult) -> tuple[int, float]:
    """Order results best-deal-first.

    Deal Gap is the discount off asking a property needs to make the numbers
    work, so ascending is best-first and a negative gap means it already
    pencils. Properties that could not be analyzed sort last: they are not
    "gap zero", they are unknown, and showing them above real deals would be
    the ranking lying about what it knows.
    """
    if result.status != "analyzed" or result.deal_gap_percent is None:
        return (1, 0.0)
    return (0, result.deal_gap_percent)


def _to_result(
    address: str,
    verdict: IQVerdictResponse,
    property_id: str | None,
    charged: bool,
) -> BulkAnalyzeResult:
    snapshot = verdict.valuation_snapshot
    return BulkAnalyzeResult(
        address=address,
        status="analyzed",
        list_price=verdict.list_price,
        income_value=verdict.income_value,
        target_buy_price=(
            snapshot.target_buy_price if snapshot is not None else verdict.purchase_price
        ),
        deal_gap_amount=verdict.deal_gap_amount,
        deal_gap_percent=verdict.deal_gap_percent,
        deal_score=verdict.deal_score,
        deal_verdict=verdict.deal_verdict,
        monthly_rent=verdict.inputs_used.get("monthly_rent"),
        property_id=property_id,
        charged=charged,
    )


async def _record_history(
    db: AsyncSession,
    user_id: uuid.UUID,
    address: str,
    response,
) -> None:
    """Log the analysis so the 30-day repeat rule sees it next time.

    Best-effort: failing to write history must not fail an analysis the user
    already paid for. The cost of a miss is that the same address could be
    charged again later, which is the safe direction to fail compared with
    losing the result.
    """
    try:
        addr = response.address
        details = response.details
        await search_history_service.record_search(
            db=db,
            user_id=str(user_id),
            search_query=address,
            property_cache_id=response.property_id,
            zpid=response.zpid,
            address_parts={
                "street": addr.street if addr else address,
                "city": addr.city if addr else None,
                "state": addr.state if addr else None,
                "zip": addr.zip_code if addr else None,
            },
            result_summary={
                "property_type": details.property_type if details else None,
                "bedrooms": details.bedrooms if details else None,
                "bathrooms": details.bathrooms if details else None,
            },
            search_source="map_bulk_analyze",
            was_successful=True,
        )
    except Exception as exc:
        logger.warning("Bulk analyze: failed to record history for %s: %s", address, exc)


async def analyze_queue(
    db: AsyncSession,
    user: User,
    addresses: list[str],
) -> tuple[list[BulkAnalyzeResult], list[str], int, bool, str | None]:
    """Drain what fits in the time budget.

    Returns ``(results, remaining, analyses_charged, quota_exhausted, notice)``.
    """
    assumptions = await resolve_assumptions(db, user=user)

    started = time.monotonic()
    results: list[BulkAnalyzeResult] = []
    remaining: list[str] = []
    charged_count = 0
    quota_exhausted = False
    notice: str | None = None

    for index, address in enumerate(addresses):
        over_budget = time.monotonic() - started >= TIME_BUDGET_SECONDS
        if over_budget and index >= MIN_ATTEMPTS_PER_RUN:
            notice = (
                f"Analyzed {len(results)} of {len(addresses)}. "
                "Continue to work through the rest."
            )
            remaining = list(addresses[index:])
            break

        is_repeat = await has_recent_successful_analysis(db, user.id, address)

        if not is_repeat:
            try:
                await billing_service.check_analysis_allowance(db, user.id)
            except SubscriptionLimitError as exc:
                quota_exhausted = True
                notice = (
                    f"You've used all {exc.limit} analyses this month. "
                    f"{len(results)} of {len(addresses)} were analyzed. "
                    "Upgrade to Pro for unlimited analyses."
                )
                remaining = list(addresses[index:])
                break

        try:
            # No zpid: passing one makes search_property skip the 24h cache,
            # and cache reuse is what keeps this batch affordable.
            response = await property_service.search_property(address)
        except Exception as exc:
            logger.warning("Bulk analyze: fetch failed for %s: %s", address, exc)
            results.append(
                BulkAnalyzeResult(
                    address=address,
                    status="error",
                    reason="Could not load this property right now.",
                )
            )
            continue

        verdict_input = property_service.build_verdict_input(response)
        if verdict_input is None:
            # No usable price. A verdict without one would be invented, so the
            # row says so instead of carrying a number nobody can act on. Not
            # charged — the user got no analysis.
            results.append(
                BulkAnalyzeResult(
                    address=address,
                    status="unavailable",
                    reason="No price available for this property, so it can't be ranked.",
                    property_id=response.property_id,
                )
            )
            continue

        verdict = compute_iq_verdict(verdict_input, assumptions=assumptions)

        charged = False
        if not is_repeat:
            try:
                await billing_service.record_analysis(db, user.id, property_address=address)
                charged = True
                charged_count += 1
            except SubscriptionLimitError:
                # Lost a race against another request; the data is already
                # fetched, so serve it rather than discarding paid work.
                logger.warning("Bulk analyze: quota race for user %s on %s", user.id, address)
            except Exception as exc:
                logger.error("Bulk analyze: failed to record usage for %s: %s", address, exc)

        await _record_history(db, user.id, address, response)
        results.append(_to_result(address, verdict, response.property_id, charged))

    # Sorted on every exit path, not just a full drain, so a partial run is
    # still a ranked list rather than fetch order.
    results.sort(key=_rank_key)
    return results, remaining, charged_count, quota_exhausted, notice
