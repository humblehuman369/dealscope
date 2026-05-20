"""Assumable FHA / VA / USDA template — T9."""

from __future__ import annotations

from app.services.deal_structures.templates import assumable

from tests._deal_structures_helpers import base_ctx


def test_returns_none_for_conventional_loan_type():
    """Only FHA / VA / USDA loans are formally assumable."""
    ctx = base_ctx(
        existing_loan_type="conventional",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    assert assumable.solve(ctx) is None


def test_returns_none_when_loan_type_missing():
    ctx = base_ctx(
        existing_loan_type=None,
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    assert assumable.solve(ctx) is None


def test_returns_none_when_no_balance_no_purchase_year_fallback():
    """Without explicit balance/rate AND no purchase-year fallback, no card."""
    ctx = base_ctx(existing_loan_type="FHA")
    assert assumable.solve(ctx) is None


def test_returns_none_when_assumed_rate_close_to_market():
    """Assumed rate within 0.5pp of new-loan rate → PV is too small to feature."""
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.062,  # only 0.3pp below 6.5%
    )
    assert assumable.solve(ctx) is None


def test_fires_with_fha_loan_real_data():
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = assumable.solve(ctx)
    assert result is not None
    assert result.id == "assumable"
    assert result.family == "financing"
    assert result.monthly_savings > 0


def test_va_loan_pitch_includes_entitlement_warning():
    """VA-specific risk: seller's VA entitlement stays tied up if buyer isn't VA-eligible."""
    ctx = base_ctx(
        existing_loan_type="VA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = assumable.solve(ctx)
    assert result is not None
    assert result.pitch_script is not None
    assert "entitlement" in result.pitch_script.lower() or "va-eligible" in result.pitch_script.lower()


def test_falls_back_to_purchase_year_heuristic_when_real_data_absent():
    """T8.5 not yet shipped → must degrade to Sub2-style proxy when balance/rate are None."""
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
    )
    result = assumable.solve(ctx)
    assert result is not None
    assert result.id == "assumable"


def test_headline_quotes_pv_in_dollars():
    """Card's distinctive feature is the PV figure — must render in dollars."""
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = assumable.solve(ctx)
    assert result is not None
    assert "$" in result.headline


def test_pre_loaded_record_records_loan_type_and_pv():
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = assumable.solve(ctx)
    assert result is not None
    extras = result.pre_loaded_record.get("pending_extras", {})
    assert extras["three_paths_structure_id"] == "assumable"
    assert extras["existing_loan_type"] == "FHA"
    assert extras["assumable_pv_estimate"] > 0


def test_pre_loaded_record_preserves_full_asking_price():
    """Loan assumption pays full ask — Buy Price must NOT be reduced.

    Without an explicit `custom_purchase_price`, the Strategy worksheet falls back
    to the LTR-discounted target buy and contradicts the pitch ("clean offer at full price").
    """
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    result = assumable.solve(ctx)
    assert result is not None
    assert result.pre_loaded_record["custom_purchase_price"] == ctx.list_price
