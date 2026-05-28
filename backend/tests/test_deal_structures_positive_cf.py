"""Options 1–4 pre_loaded_record must yield positive LTR cash flow when applied."""

from app.services.calculators import calculate_ltr
from app.services.deal_structures import compute_deal_structures
from tests._deal_structures_helpers import base_ctx


def _ltr_cf(
    *,
    purchase_price: float,
    monthly_rent: float,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 5,
) -> float:
    r = calculate_ltr(
        purchase_price=purchase_price,
        monthly_rent=monthly_rent,
        property_taxes_annual=12_000,
        insurance_annual=12_000,
        down_payment_pct=0.20,
        interest_rate=0.06,
        loan_term_years=30,
        closing_costs_pct=0.03,
        vacancy_rate=0.05,
        property_management_pct=0.08,
        maintenance_pct=0.05,
        utilities_monthly=0,
        landscaping_annual=0,
        pest_control_annual=0,
        appreciation_rate=0.03,
        rent_growth_rate=0.02,
        expense_growth_rate=0.02,
        hoa_monthly=0,
        seller_carry_amount=seller_carry_amount,
        seller_carry_rate=seller_carry_rate,
        seller_carry_term_years=seller_carry_term_years,
    )
    return r["monthly_cash_flow"]


def test_all_four_paths_positive_monthly_cash_flow():
    """Regression: large-gap listing similar to production bug reports."""
    from app.core.valuation.income_value import calculate_buy_price

    list_price = 1_299_900
    monthly_rent = 5_764
    taxes, ins = 14_000, 13_000
    target_buy = calculate_buy_price(
        list_price,
        monthly_rent,
        taxes,
        ins,
        down_payment_pct=0.20,
        interest_rate=0.065,
        loan_term_years=30,
        vacancy_rate=0.05,
        maintenance_pct=0.05,
        management_pct=0.08,
        capex_pct=0.05,
    )
    ctx = base_ctx(
        list_price=list_price,
        target_buy_price=target_buy,
        deal_gap_pct=(list_price - target_buy) / list_price * 100 if list_price else 0,
        monthly_rent=monthly_rent,
        property_taxes_annual=taxes,
        insurance_annual=ins,
    )
    out = compute_deal_structures(ctx)
    assert out.has_paths is True
    assert len(out.paths) >= 4

    for path in out.paths[:4]:
        record = path.pre_loaded_record or {}
        price = float(record.get("custom_purchase_price") or ctx.list_price)
        rent = float(record.get("custom_rent_estimate") or ctx.monthly_rent)
        extras = record.get("pending_extras") or {}
        sc = float(extras.get("seller_carry_amount") or 0)
        rate = float(extras.get("seller_carry_rate") or 0)
        term = int(extras.get("seller_carry_term_years") or 5)
        mcf = _ltr_cf(
            purchase_price=price,
            monthly_rent=rent,
            seller_carry_amount=sc,
            seller_carry_rate=rate,
            seller_carry_term_years=term,
        )
        assert mcf > 0, f"{path.id} monthly_cash_flow={mcf}"
