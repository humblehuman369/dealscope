"""Tests for /api/lenders — pagination cap, filters, gates, and exports (3.1/3.3/3.4).

The real 484-row dataset is loaded into Postgres for this module. That is
deliberate: the filter, search and locality assertions below are only meaningful
against production data, and they are what pins the behaviour of the JSON ->
Postgres migration.
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.models.lender import Lender
from app.routers import lenders as lenders_router
from app.routers.lenders import export_lenders, get_lender_stats, list_lenders
from app.schemas.lenders import LenderOut
from app.services import directory_pipeline
from app.services.entitlements import Entitlement
from app.services.lenders_service import (
    MAX_PAGE_SIZE,
    LenderListFilters,
    filter_lenders,
    get_lender_by_id,
    lender_stats,
    lender_total,
    list_lenders_page,
)
from fastapi import HTTPException
from sqlalchemy import update

pytestmark = pytest.mark.asyncio


def _user():
    return SimpleNamespace(id=uuid.uuid4(), email="user@example.com")


def _filters(**overrides) -> LenderListFilters:
    return LenderListFilters(**overrides)


def _list_kwargs(**overrides):
    kwargs = dict(
        state=None,
        product=None,
        min_loan=None,
        credit=None,
        q=None,
        include_web_only=True,
    )
    kwargs.update(overrides)
    return kwargs


def _locality_rank(lender: LenderOut, state: str) -> int:
    """Independent oracle for the SQL CASE ordering the service applies.

    Kept in Python so the assertions below check the query's ordering against a
    separately written rule rather than against itself.
    """
    if lender.state == state:
        return 0
    if not lender.nationwide:
        return 1
    return 2


# ---------------------------------------------------------------------------
# Service: pagination and filters
# ---------------------------------------------------------------------------


async def test_page_size_is_capped_at_25(db_session, seeded_lenders):
    lenders, total, total_pages = await list_lenders_page(
        db_session, filters=_filters(), page=1, limit=10_000
    )
    assert len(lenders) <= MAX_PAGE_SIZE == 25
    assert total > 25  # dataset is larger than one page
    assert total_pages >= total // MAX_PAGE_SIZE


async def test_no_single_response_contains_the_full_dataset(db_session, seeded_lenders):
    total = await lender_total(db_session)
    lenders, _, _ = await list_lenders_page(
        db_session, filters=_filters(), page=1, limit=MAX_PAGE_SIZE
    )
    assert len(lenders) < total


async def test_pagination_walks_without_overlap(db_session, seeded_lenders):
    page1, _, _ = await list_lenders_page(db_session, filters=_filters(), page=1, limit=25)
    page2, _, _ = await list_lenders_page(db_session, filters=_filters(), page=2, limit=25)
    ids1 = {lender.id for lender in page1}
    ids2 = {lender.id for lender in page2}
    assert ids1.isdisjoint(ids2)


async def test_page_beyond_range_is_empty(db_session, seeded_lenders):
    _, total, _ = await list_lenders_page(db_session, filters=_filters(), page=1, limit=25)
    beyond = (total // 25) + 2
    lenders, _, _ = await list_lenders_page(db_session, filters=_filters(), page=beyond, limit=25)
    assert lenders == []


async def test_state_filter(db_session, seeded_lenders):
    lenders, total, _ = await list_lenders_page(
        db_session, filters=_filters(state="FL"), page=1, limit=25
    )
    assert total > 0
    assert all("FL" in lender.states_served for lender in lenders)


async def test_name_search_filter(db_session, seeded_lenders):
    lenders, total, _ = await list_lenders_page(
        db_session, filters=_filters(q="capital"), page=1, limit=25
    )
    assert total > 0
    assert all(
        "capital" in lender.company_name.lower() or "capital" in lender.domain.lower()
        for lender in lenders
    )


async def test_search_treats_like_wildcards_literally(db_session, seeded_lenders):
    """`%` and `_` are ordinary characters in a search box, not patterns."""
    wildcard, wildcard_total, _ = await list_lenders_page(
        db_session, filters=_filters(q="%"), page=1, limit=25
    )
    assert wildcard_total == 0
    assert wildcard == []

    _, underscore_total, _ = await list_lenders_page(
        db_session, filters=_filters(q="capita_"), page=1, limit=25
    )
    assert underscore_total == 0


async def test_min_loan_keeps_lenders_with_no_stated_ceiling(db_session, seeded_lenders):
    """An unknown maximum is not evidence a lender won't fund the amount."""
    lenders = await filter_lenders(db_session, filters=_filters(min_loan=5_000_000))
    assert lenders
    assert all(
        lender.max_loan_amount is None or lender.max_loan_amount >= 5_000_000
        for lender in lenders
    )
    assert any(lender.max_loan_amount is None for lender in lenders)


async def test_get_lender_by_id_roundtrip(db_session, seeded_lenders):
    first_page, _, _ = await list_lenders_page(db_session, filters=_filters(), page=1, limit=1)
    lender = first_page[0]
    found = await get_lender_by_id(db_session, lender.id)
    assert found is not None
    assert found.company_name == lender.company_name
    assert await get_lender_by_id(db_session, -1) is None


async def test_states_served_count_is_derived(db_session, seeded_lenders):
    lenders, _, _ = await list_lenders_page(db_session, filters=_filters(), page=1, limit=25)
    assert all(
        lender.states_served_count == len(lender.states_served) for lender in lenders
    )
    assert any(lender.states_served_count > 0 for lender in lenders)


async def test_inactive_lenders_are_excluded(db_session, seeded_lenders):
    """Retiring a lender hides it from the directory without deleting the row,
    so a saved contact pointing at it still resolves."""
    target, _, _ = await list_lenders_page(db_session, filters=_filters(), page=1, limit=1)
    lender_id = target[0].id
    before = await lender_total(db_session)

    await db_session.execute(
        update(Lender).where(Lender.id == lender_id).values(is_active=False)
    )

    assert await get_lender_by_id(db_session, lender_id) is None
    assert await lender_total(db_session) == before - 1


# ---------------------------------------------------------------------------
# Service: locality ordering when a state is selected
# ---------------------------------------------------------------------------


async def test_state_results_are_ordered_local_first(db_session, seeded_lenders):
    lenders = await filter_lenders(db_session, filters=_filters(state="FL"))
    ranks = [_locality_rank(lender, "FL") for lender in lenders]
    assert ranks == sorted(ranks)


async def test_in_state_hq_lenders_lead_the_results(db_session, seeded_lenders):
    lenders = await filter_lenders(db_session, filters=_filters(state="FL"))
    assert any(lender.state == "FL" for lender in lenders)
    assert lenders[0].state == "FL"


async def test_nationwide_lenders_rank_below_regional_ones(db_session, seeded_lenders):
    """Among out-of-state lenders, a regional focus outranks a national one.

    An in-state HQ still wins outright, nationwide or not — being headquartered
    where the deal is remains the strongest locality signal.
    """
    all_fl = await filter_lenders(db_session, filters=_filters(state="FL"))
    out_of_state = [lender for lender in all_fl if lender.state != "FL"]
    first_nationwide = next(i for i, lender in enumerate(out_of_state) if lender.nationwide)
    last_regional = max(i for i, lender in enumerate(out_of_state) if not lender.nationwide)
    assert first_nationwide > last_regional


async def test_in_state_hq_outranks_out_of_state_regional(db_session, seeded_lenders):
    lenders = await filter_lenders(db_session, filters=_filters(state="FL"))
    first_out_of_state = next(i for i, lender in enumerate(lenders) if lender.state != "FL")
    assert all(lender.state == "FL" for lender in lenders[:first_out_of_state])


async def test_locality_ordering_preserves_the_filtered_set(db_session, seeded_lenders):
    """Sorting must reorder results, never add or drop them."""
    ordered = await filter_lenders(db_session, filters=_filters(state="FL"))
    everything = await filter_lenders(db_session, filters=_filters())
    assert {lender.id for lender in ordered} == {
        lender.id for lender in everything if "FL" in lender.states_served
    }


# ---------------------------------------------------------------------------
# Router: view gates (Task 3.3)
# ---------------------------------------------------------------------------


async def test_free_list_gets_403(monkeypatch, db_session, seeded_lenders):
    async def deny(*args, **kwargs):
        raise HTTPException(status_code=403, detail={"error": "PRO_REQUIRED"})

    monkeypatch.setattr(lenders_router, "gate_view", deny)

    with pytest.raises(HTTPException) as exc:
        await list_lenders(
            current_user=_user(), db=db_session, page=1, limit=25, **_list_kwargs()
        )

    assert exc.value.status_code == 403


async def test_trial_list_gets_403(monkeypatch, db_session, seeded_lenders):
    """The directory is not part of the free trial."""

    async def deny(*args, **kwargs):
        raise HTTPException(status_code=403, detail={"error": "DIRECTORY_PAID_ONLY"})

    monkeypatch.setattr(lenders_router, "gate_view", deny)

    with pytest.raises(HTTPException) as exc:
        await list_lenders(
            current_user=_user(), db=db_session, page=1, limit=25, **_list_kwargs()
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "DIRECTORY_PAID_ONLY"


async def test_paid_list_keeps_contacts(monkeypatch, db_session, seeded_lenders):
    """Paid responses are never redacted — there is no redaction path left."""
    monkeypatch.setattr(lenders_router, "gate_view", AsyncMock(return_value=None))

    response = await list_lenders(
        current_user=_user(), db=db_session, page=1, limit=25, **_list_kwargs()
    )

    assert any(lender.phone or lender.email for lender in response.lenders)
    assert all(lender.domain for lender in response.lenders)


async def test_stats_teaser_for_free(monkeypatch, db_session, seeded_lenders):
    monkeypatch.setattr(
        directory_pipeline, "resolve_entitlement", AsyncMock(return_value=Entitlement.FREE)
    )

    response = await get_lender_stats(current_user=_user(), db=db_session)

    assert response.status_code == 401
    assert b'"total"' in response.body
    assert b"byState" not in response.body


@pytest.mark.parametrize("entitlement", [Entitlement.TRIAL, Entitlement.PAID])
async def test_stats_full_for_trial_and_paid(monkeypatch, db_session, seeded_lenders, entitlement):
    monkeypatch.setattr(
        directory_pipeline, "resolve_entitlement", AsyncMock(return_value=entitlement)
    )

    stats = await get_lender_stats(current_user=_user(), db=db_session)

    assert stats.total == await lender_total(db_session)
    assert stats.byState


async def test_stats_are_computed_from_the_table(db_session, seeded_lenders):
    """Aggregates are live SQL now, not the dataset's frozen stats block."""
    stats = await lender_stats(db_session)

    assert stats.total == seeded_lenders
    assert stats.byState["FL"] > 0
    assert stats.byProduct["fix_flip"] > 0
    assert stats.nationwideCount > 0
    assert stats.noCreditCheckCount > 0
    # A lender with no stated policy is counted as "unknown", not dropped.
    assert stats.byCreditPolicy["unknown"] > 0
    assert sum(stats.byCreditPolicy.values()) == stats.total


# ---------------------------------------------------------------------------
# Router: export gates + meters (Task 3.4)
# ---------------------------------------------------------------------------


def _patch_export(monkeypatch, *, used: int):
    """Stub the gate and the meter — both now live in the shared pipeline."""
    monkeypatch.setattr(
        directory_pipeline, "require_paid_export", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(directory_pipeline, "get_export_usage", AsyncMock(return_value=used))
    add_usage = AsyncMock(return_value=used)
    monkeypatch.setattr(directory_pipeline, "add_export_usage", add_usage)
    return add_usage


async def test_export_caps_at_200_records(monkeypatch, db_session, seeded_lenders):
    add_usage = _patch_export(monkeypatch, used=0)

    response = await export_lenders(
        current_user=_user(), db=db_session, fmt="csv", **_list_kwargs()
    )

    assert response.headers["X-Export-Records"] == "200"
    # header + 200 data rows
    assert response.body.decode("utf-8").strip().count("\n") == 200
    add_usage.assert_awaited_once()
    assert add_usage.await_args.args[-1] == 200


async def test_export_respects_monthly_remaining(monkeypatch, db_session, seeded_lenders):
    """950 of 1,000 used → this export is capped at the remaining 50 records."""
    _patch_export(monkeypatch, used=950)

    response = await export_lenders(
        current_user=_user(), db=db_session, fmt="csv", **_list_kwargs()
    )

    assert response.headers["X-Export-Records"] == "50"


async def test_export_blocked_at_monthly_ceiling(monkeypatch, db_session, seeded_lenders):
    _patch_export(monkeypatch, used=1_000)

    with pytest.raises(HTTPException) as exc:
        await export_lenders(
            current_user=_user(), db=db_session, fmt="csv", **_list_kwargs()
        )

    assert exc.value.status_code == 429
    assert exc.value.detail["error"] == "EXPORT_LIMIT_REACHED"
    assert (
        exc.value.detail["message"]
        == "You've hit this month's export limit. It resets on your billing date."
    )


async def test_print_export_follows_same_caps(monkeypatch, db_session, seeded_lenders):
    _patch_export(monkeypatch, used=0)

    response = await export_lenders(
        current_user=_user(), db=db_session, fmt="print", **_list_kwargs()
    )

    assert response.headers["X-Export-Records"] == "200"
    body = response.body.decode("utf-8")
    assert "<table>" in body
    assert "window.print()" in body
