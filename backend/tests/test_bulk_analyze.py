"""Bulk analyze queue: ranking honesty and spend guardrails.

This is the only map feature that multiplies provider spend — each address is
a full PropertyService fan-out — so the tests are about what it refuses to do
as much as what it does.

The ranking half matters for a different reason. The whole promise is "these
are your best deals in this area", and a ranking that puts a property it
could not price above one it could would be the feature lying about what it
knows.
"""

from __future__ import annotations

import pytest
from app.schemas.bulk_analyze import MAX_QUEUE_SIZE, BulkAnalyzeRequest, BulkAnalyzeResult
from app.services.bulk_analyze_service import (
    MIN_ATTEMPTS_PER_RUN,
    TIME_BUDGET_SECONDS,
    _rank_key,
)


def analyzed(address: str, gap: float) -> BulkAnalyzeResult:
    return BulkAnalyzeResult(
        address=address,
        status="analyzed",
        list_price=300_000,
        deal_gap_percent=gap,
    )


# ─── Ranking ─────────────────────────────────────────────────────────────


def test_the_smallest_deal_gap_ranks_first():
    """Deal Gap is the discount off asking the deal needs, so less is better."""
    results = [analyzed("needs 20% off", 20.0), analyzed("needs 4% off", 4.0)]

    results.sort(key=_rank_key)

    assert [r.address for r in results] == ["needs 4% off", "needs 20% off"]


def test_a_property_that_pencils_at_list_outranks_one_needing_a_discount():
    results = [analyzed("needs 8% off", 8.0), analyzed("works at list", -3.0)]

    results.sort(key=_rank_key)

    assert results[0].address == "works at list"


@pytest.mark.parametrize("status", ["unavailable", "error"])
def test_unanalyzable_properties_sort_below_every_real_deal(status):
    """An unknown gap is not a zero gap.

    Sorting a property with no price as 0% would put it at the very top of a
    list titled "best deals", which is the most damaging possible place for a
    row that carries no information.
    """
    unknown = BulkAnalyzeResult(address="no price", status=status)
    results = [unknown, analyzed("needs 45% off", 45.0)]

    results.sort(key=_rank_key)

    assert [r.address for r in results] == ["needs 45% off", "no price"]


def test_an_analyzed_row_with_no_gap_still_sorts_as_unknown():
    """Belt and braces: status alone must not be trusted over the number."""
    missing_gap = BulkAnalyzeResult(address="analyzed but no gap", status="analyzed")
    results = [missing_gap, analyzed("needs 45% off", 45.0)]

    results.sort(key=_rank_key)

    assert results[0].address == "needs 45% off"


def test_ranking_is_stable_for_equal_gaps():
    results = [analyzed("first", 10.0), analyzed("second", 10.0)]

    results.sort(key=_rank_key)

    assert [r.address for r in results] == ["first", "second"]


# ─── Queue hygiene ───────────────────────────────────────────────────────


def test_duplicate_addresses_are_collapsed():
    """A double-clicked pin must not be charged twice in one queue."""
    request = BulkAnalyzeRequest(
        addresses=[
            "2406 River Hammock Ln, Fort Pierce, FL 34981",
            "2406 river hammock ln, fort pierce, fl 34981",
            "100 Main St, Fort Pierce, FL 34981",
        ]
    )

    assert len(request.addresses) == 2


def test_blank_addresses_are_dropped():
    request = BulkAnalyzeRequest(addresses=["  ", "100 Main St, Fort Pierce, FL 34981", ""])

    assert request.addresses == ["100 Main St, Fort Pierce, FL 34981"]


def test_a_queue_of_only_blanks_is_rejected():
    with pytest.raises(ValueError):
        BulkAnalyzeRequest(addresses=["   ", ""])


def test_queue_order_is_preserved():
    """The client chose this order; ties in the ranking should follow it."""
    addresses = [f"{i} Main St, Fort Pierce, FL 34981" for i in range(5)]

    assert BulkAnalyzeRequest(addresses=addresses).addresses == addresses


def test_an_oversized_queue_is_refused():
    """The hard bound on what one request can start."""
    too_many = [f"{i} Main St, Fort Pierce, FL 34981" for i in range(MAX_QUEUE_SIZE + 1)]

    with pytest.raises(ValueError):
        BulkAnalyzeRequest(addresses=too_many)


# ─── Cost guardrails ─────────────────────────────────────────────────────


def test_the_time_budget_leaves_headroom_in_a_normal_request():
    """The budget exists so a slow batch resumes instead of timing out and
    charging quota for results the user never receives."""
    assert 10.0 <= TIME_BUDGET_SECONDS <= 55.0


def test_every_run_attempts_at_least_one_address():
    """Otherwise a client resubmitting `remaining` loops without progress."""
    assert MIN_ATTEMPTS_PER_RUN >= 1


def test_a_property_with_no_price_is_never_charged():
    """The user got no analysis, so there is nothing to bill for."""
    result = BulkAnalyzeResult(address="no price", status="unavailable", reason="No price")

    assert result.charged is False


def test_a_failed_fetch_is_never_charged():
    result = BulkAnalyzeResult(address="broken", status="error", reason="Could not load")

    assert result.charged is False
