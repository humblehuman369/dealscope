"""Sub2 (Subject-To) template — heuristic + public-records branches."""

from __future__ import annotations

from app.services.deal_structures.templates import sub2

from tests._deal_structures_helpers import base_ctx

# ---------------------------------------------------------------------------
# Gating — when the template must return None
# ---------------------------------------------------------------------------


def test_returns_none_when_purchase_year_missing():
    ctx = base_ctx(estimated_purchase_year=None, estimated_purchase_price=350_000)
    assert sub2.solve(ctx) is None


def test_returns_none_when_purchase_price_missing():
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=None)
    assert sub2.solve(ctx) is None


def test_returns_none_for_post_2022_purchase_year():
    """Rate proxy returns None for 2023+ — no rate advantage vs today's 6.5%."""
    ctx = base_ctx(estimated_purchase_year=2023, estimated_purchase_price=350_000)
    assert sub2.solve(ctx) is None


def test_returns_none_when_assumed_rate_close_to_market():
    """2022 assumed rate (4.8%) is too close to a 5.5% market rate (< 1.5pp delta) — skip."""
    ctx = base_ctx(
        estimated_purchase_year=2022,
        estimated_purchase_price=350_000,
        interest_rate=0.055,
    )
    assert sub2.solve(ctx) is None


def test_returns_none_when_gap_already_closed():
    ctx = base_ctx(
        target_buy_price=400_000,
        deal_gap_pct=0,
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
    )
    assert sub2.solve(ctx) is None


# ---------------------------------------------------------------------------
# Happy path — heuristic branch
# ---------------------------------------------------------------------------


def test_fires_with_2021_purchase_year_heuristic():
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    result = sub2.solve(ctx)
    assert result is not None
    assert result.id == "sub2"
    assert result.family == "financing"
    assert result.monthly_savings > 0
    assert result.cash_required > 0
    assert result.pitch_script is not None
    assert "loan" in result.pitch_script.lower()


def test_selection_reason_cites_purchase_year():
    """Heuristic-branch selection_reason must reference the year — that's the trust signal."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    result = sub2.solve(ctx)
    assert result is not None
    assert result.selection_reason is not None
    assert "2021" in result.selection_reason


def test_caveat_warns_about_balance_being_an_assumption():
    """Heuristic branch must surface the assumption explicitly — never claim certainty."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    result = sub2.solve(ctx)
    assert result is not None
    assert result.caveat is not None
    assert "assume" in result.caveat.lower() or "estimate" in result.caveat.lower()


def test_pre_loaded_record_carries_pending_extras():
    """Until T8 lands real seller-carry fields, the lever values live under pending_extras."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    result = sub2.solve(ctx)
    assert result is not None
    assert "pending_extras" in result.pre_loaded_record
    extras = result.pre_loaded_record["pending_extras"]
    assert extras["three_paths_structure_id"] == "sub2"
    assert "sub2_heuristic_rate" in extras


# ---------------------------------------------------------------------------
# Real-data branch (T3b) — public records overrides
# ---------------------------------------------------------------------------


def test_real_data_branch_used_when_balance_and_rate_present():
    ctx = base_ctx(
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = sub2.solve(ctx)
    assert result is not None
    assert result.id == "sub2"
    assert result.selection_reason is not None
    assert "records" in result.selection_reason.lower() or "%" in result.selection_reason


def test_real_data_branch_skips_when_rate_close_to_market():
    """Even with real data, < 1.5pp advantage means no card."""
    ctx = base_ctx(
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.055,  # only 1pp below 6.5%
    )
    assert sub2.solve(ctx) is None


def test_real_data_pre_loaded_record_marks_source():
    ctx = base_ctx(
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = sub2.solve(ctx)
    assert result is not None
    extras = result.pre_loaded_record.get("pending_extras", {})
    assert extras.get("sub2_from_records") is True


# ---------------------------------------------------------------------------
# Listing context shifts ranking
# ---------------------------------------------------------------------------


def test_high_dom_increases_ranking():
    """Long days-on-market → higher Sub2 ranking (sellers more flexible)."""
    base_overrides = dict(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    short = sub2.solve(base_ctx(days_on_market=10, **base_overrides))
    long = sub2.solve(base_ctx(days_on_market=120, **base_overrides))
    assert short is not None and long is not None
    assert long.ranking_score > short.ranking_score


def test_foreclosure_penalizes_ranking():
    """REO/foreclosure: bank doesn't carry paper, Sub2 is implausible."""
    base_overrides = dict(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    standard = sub2.solve(base_ctx(**base_overrides))
    reo = sub2.solve(base_ctx(is_foreclosure=True, **base_overrides))
    assert standard is not None
    if reo is not None:
        assert reo.ranking_score < standard.ranking_score
