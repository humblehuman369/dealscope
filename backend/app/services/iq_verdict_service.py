"""IQ Verdict Service — multi-strategy investment analysis engine.

All calculation logic lives here; the router is a thin HTTP delegation layer.

IMPORTANT: This service uses ONLY assumptions passed in via the
``AllAssumptions`` object (resolved by assumption_resolver from the DB).
No runtime reads from ``app.core.defaults`` singletons are allowed.
"""

import logging

from app.core.formulas import calculate_buy_price, compute_market_price, estimate_income_value
from app.schemas.analytics import (
    DealFactor,
    DealScoreFactors,
    DealScoreInput,
    DealScoreMotivation,
    DealScoreResponse,
    IQVerdictInput,
    IQVerdictResponse,
    OpportunityFactorsResponse,
    ReturnFactorsResponse,
    ScoreDisplayResponse,
    StrategyResult,
)
from app.schemas.property import AllAssumptions
from app.services.calculators import calculate_monthly_mortgage

logger = logging.getLogger(__name__)


# ===========================================
# Internal calculation helpers
# ===========================================


def _score_to_grade_label(score: int) -> tuple[str, str, str]:
    if score >= 85:
        return ("A+", "STRONG OPPORTUNITY", "#22c55e")
    elif score >= 70:
        return ("A", "GOOD OPPORTUNITY", "#22c55e")
    elif score >= 55:
        return ("B", "MODERATE OPPORTUNITY", "#84cc16")
    elif score >= 40:
        return ("C", "MARGINAL OPPORTUNITY", "#f97316")
    elif score >= 25:
        return ("D", "UNLIKELY OPPORTUNITY", "#f97316")
    else:
        return ("F", "PASS", "#ef4444")


def _performance_score(metric_value: float, multiplier: float) -> int:
    score = round(50 + (metric_value * multiplier))
    return max(0, min(100, score))


def _format_compact_currency(value: float) -> str:
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    if abs(value) >= 1_000:
        return f"${round(value / 1000)}K"
    return f"${round(value):,}"


# ===========================================
# Strategy calculators (use assumptions param)
# ===========================================


def _calculate_ltr_strategy(
    price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    a: AllAssumptions,
) -> dict:
    f = a.financing
    o = a.operating
    down_payment = price * f.down_payment_pct
    closing_costs = price * f.closing_costs_pct
    loan_amount = price - down_payment
    total_cash = down_payment + closing_costs
    monthly_pi = calculate_monthly_mortgage(loan_amount, f.interest_rate, f.loan_term_years)
    annual_debt = monthly_pi * 12
    annual_rent = monthly_rent * 12
    vacancy_loss = annual_rent * o.vacancy_rate
    effective_income = annual_rent - vacancy_loss
    utilities_annual = o.utilities_monthly * 12
    other_annual = o.landscaping_annual + o.pest_control_annual
    mgmt = annual_rent * o.property_management_pct
    maint = annual_rent * o.maintenance_pct
    capex = annual_rent * o.capex_pct
    op_ex = property_taxes + insurance + mgmt + maint + capex + utilities_annual + other_annual
    noi = effective_income - op_ex
    annual_cash_flow = noi - annual_debt
    monthly_cash_flow = annual_cash_flow / 12
    coc = annual_cash_flow / total_cash if total_cash > 0 else 0
    coc_pct = coc * 100
    cap_rate = (noi / price * 100) if price > 0 else 0
    dscr = noi / annual_debt if annual_debt > 0 else 0
    score = _performance_score(coc_pct, 5)
    return {
        "id": "long-term-rental",
        "name": "Long-Term Rental",
        "metric": f"{coc_pct:.1f}%",
        "metric_label": "CoC Return",
        "metric_value": coc_pct,
        "score": score,
        "cap_rate": round(cap_rate, 2),
        "cash_on_cash": round(coc_pct, 2),
        "dscr": round(dscr, 2),
        "annual_cash_flow": round(annual_cash_flow, 0),
        "monthly_cash_flow": round(monthly_cash_flow, 0),
        "breakdown": {
            "purchase_price": round(price),
            "down_payment": round(down_payment),
            "down_payment_pct": round(f.down_payment_pct * 100, 1),
            "closing_costs": round(closing_costs),
            "closing_costs_pct": round(f.closing_costs_pct * 100, 1),
            "total_cash_needed": round(total_cash),
            "loan_amount": round(loan_amount),
            "interest_rate": round(f.interest_rate * 100, 1),
            "loan_term_years": f.loan_term_years,
            "monthly_payment": round(monthly_pi),
            "monthly_rent": round(monthly_rent),
            "annual_gross_rent": round(annual_rent),
            "vacancy_rate": round(o.vacancy_rate * 100, 1),
            "vacancy_loss": round(vacancy_loss),
            "effective_income": round(effective_income),
            "property_taxes": round(property_taxes),
            "insurance": round(insurance),
            "management": round(mgmt),
            "management_pct": round(o.property_management_pct * 100, 1),
            "maintenance": round(maint),
            "maintenance_pct": round(o.maintenance_pct * 100, 1),
            "reserves": round(capex),
            "reserves_pct": round(o.capex_pct * 100, 1),
            "total_operating_expenses": round(op_ex),
            "noi": round(noi),
            "annual_debt_service": round(annual_debt),
        },
    }


def _calculate_str_strategy(
    price: float,
    adr: float,
    occupancy: float,
    property_taxes: float,
    insurance: float,
    a: AllAssumptions,
) -> dict:
    f = a.financing
    o = a.operating
    s = a.str_assumptions
    down_payment = price * f.down_payment_pct
    closing_costs = price * f.closing_costs_pct
    total_cash = down_payment + closing_costs + s.furniture_setup_cost
    loan_amount = price - down_payment
    monthly_pi = calculate_monthly_mortgage(loan_amount, f.interest_rate, f.loan_term_years)
    annual_debt = monthly_pi * 12
    annual_revenue = adr * 365 * occupancy
    mgmt_fee = annual_revenue * s.str_management_pct
    platform_fees = annual_revenue * s.platform_fees_pct
    utilities = o.utilities_monthly * 12
    supplies = s.supplies_monthly * 12
    maintenance = annual_revenue * o.maintenance_pct
    capex = annual_revenue * o.capex_pct
    op_ex = property_taxes + insurance + mgmt_fee + platform_fees + utilities + supplies + maintenance + capex
    noi = annual_revenue - op_ex
    annual_cash_flow = noi - annual_debt
    monthly_cash_flow = annual_cash_flow / 12
    coc = annual_cash_flow / total_cash if total_cash > 0 else 0
    coc_pct = coc * 100
    cap_rate = (noi / price * 100) if price > 0 else 0
    dscr = noi / annual_debt if annual_debt > 0 else 0
    score = _performance_score(coc_pct, 3.33)
    return {
        "id": "short-term-rental",
        "name": "Short-Term Rental",
        "metric": f"{coc_pct:.1f}%",
        "metric_label": "CoC Return",
        "metric_value": coc_pct,
        "score": score,
        "cap_rate": round(cap_rate, 2),
        "cash_on_cash": round(coc_pct, 2),
        "dscr": round(dscr, 2),
        "annual_cash_flow": round(annual_cash_flow, 0),
        "monthly_cash_flow": round(monthly_cash_flow, 0),
        "breakdown": {
            "purchase_price": round(price),
            "down_payment": round(down_payment),
            "down_payment_pct": round(f.down_payment_pct * 100, 1),
            "closing_costs": round(closing_costs),
            "closing_costs_pct": round(f.closing_costs_pct * 100, 1),
            "furniture_setup": round(s.furniture_setup_cost),
            "total_cash_needed": round(total_cash),
            "loan_amount": round(loan_amount),
            "interest_rate": round(f.interest_rate * 100, 1),
            "loan_term_years": f.loan_term_years,
            "monthly_payment": round(monthly_pi),
            "adr": round(adr),
            "occupancy_rate": round(occupancy * 100, 1),
            "annual_gross_revenue": round(annual_revenue),
            "effective_income": round(annual_revenue),
            "property_taxes": round(property_taxes),
            "insurance": round(insurance),
            "management": round(mgmt_fee),
            "management_pct": round(s.str_management_pct * 100, 1),
            "platform_fees": round(platform_fees),
            "platform_fees_pct": round(s.platform_fees_pct * 100, 1),
            "maintenance": round(maintenance),
            "maintenance_pct": round(o.maintenance_pct * 100, 1),
            "reserves": round(capex),
            "reserves_pct": round(o.capex_pct * 100, 1),
            "supplies": round(supplies),
            "utilities": round(utilities),
            "total_operating_expenses": round(op_ex),
            "noi": round(noi),
            "annual_debt_service": round(annual_debt),
        },
    }


def _calculate_brrrr_strategy(
    price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    arv: float,
    rehab_cost: float,
    a: AllAssumptions,
) -> dict:
    f = a.financing
    o = a.operating
    b = a.brrrr
    initial_cash = (price * 0.10) + rehab_cost + (price * f.closing_costs_pct)
    refi_loan = arv * b.refinance_ltv
    cash_back = refi_loan - (price * 0.90)
    cash_left = max(0, initial_cash - max(0, cash_back))
    recovery_pct = ((initial_cash - cash_left) / initial_cash * 100) if initial_cash > 0 else 0
    monthly_pi = calculate_monthly_mortgage(refi_loan, b.refinance_interest_rate, b.refinance_term_years)
    annual_debt = monthly_pi * 12
    annual_rent = monthly_rent * 12
    vacancy_loss = annual_rent * o.vacancy_rate
    effective_income = annual_rent - vacancy_loss
    utilities_annual = o.utilities_monthly * 12
    other_annual = o.landscaping_annual + o.pest_control_annual
    mgmt = annual_rent * o.property_management_pct
    maint = annual_rent * o.maintenance_pct
    capex = annual_rent * o.capex_pct
    op_ex = property_taxes + insurance + mgmt + maint + capex + utilities_annual + other_annual
    noi = effective_income - op_ex
    annual_cash_flow = noi - annual_debt
    min_cash_for_coc = max(cash_left, initial_cash * 0.10)
    if cash_left <= 0:
        coc = 999 if annual_cash_flow > 0 else 0
    else:
        coc = annual_cash_flow / min_cash_for_coc
    if coc > 100:
        display_coc = "Infinite"
    elif coc < -1:
        display_coc = "<-100%"
    else:
        display_coc = f"{coc * 100:.1f}%"
    cap_rate = (noi / price * 100) if price > 0 else 0
    dscr_val = noi / annual_debt if annual_debt > 0 else 0
    score = _performance_score(recovery_pct, 1)
    return {
        "id": "brrrr",
        "name": "BRRRR",
        "metric": display_coc,
        "metric_label": "CoC Return",
        "metric_value": recovery_pct,
        "score": score,
        "cap_rate": round(cap_rate, 2),
        "cash_on_cash": round(coc * 100, 2) if coc < 100 else 999,
        "dscr": round(dscr_val, 2),
        "annual_cash_flow": round(annual_cash_flow, 0),
        "monthly_cash_flow": round(annual_cash_flow / 12, 0),
        "breakdown": {
            "purchase_price": round(price),
            "initial_cash_in": round(initial_cash),
            "rehab_cost": round(rehab_cost),
            "arv": round(arv),
            "refi_loan": round(refi_loan),
            "cash_back": round(max(0, cash_back)),
            "cash_left_in_deal": round(cash_left),
            "recovery_pct": round(recovery_pct, 1),
            "total_cash_needed": round(cash_left),
            "loan_amount": round(refi_loan),
            "interest_rate": round(b.refinance_interest_rate * 100, 1),
            "loan_term_years": b.refinance_term_years,
            "monthly_payment": round(monthly_pi),
            "monthly_rent": round(monthly_rent),
            "annual_gross_rent": round(annual_rent),
            "vacancy_rate": round(o.vacancy_rate * 100, 1),
            "vacancy_loss": round(vacancy_loss),
            "effective_income": round(effective_income),
            "property_taxes": round(property_taxes),
            "insurance": round(insurance),
            "management": round(mgmt),
            "management_pct": round(o.property_management_pct * 100, 1),
            "maintenance": round(maint),
            "maintenance_pct": round(o.maintenance_pct * 100, 1),
            "reserves": round(capex),
            "reserves_pct": round(o.capex_pct * 100, 1),
            "total_operating_expenses": round(op_ex),
            "noi": round(noi),
            "annual_debt_service": round(annual_debt),
        },
    }


def _calculate_flip_strategy(
    price: float,
    arv: float,
    rehab_cost: float,
    property_taxes: float,
    insurance: float,
    a: AllAssumptions,
) -> dict:
    f = a.financing
    fl = a.flip
    purchase_costs = price * f.closing_costs_pct
    holding_months = fl.holding_period_months
    holding_costs = (
        (price * fl.hard_money_rate / 12 * holding_months)
        + (property_taxes / 12 * holding_months)
        + (insurance / 12 * holding_months)
    )
    selling_costs = arv * fl.selling_costs_pct
    total_investment = price + purchase_costs + rehab_cost + holding_costs
    net_profit = arv - total_investment - selling_costs
    roi = net_profit / total_investment if total_investment > 0 else 0
    roi_pct = roi * 100
    score = _performance_score(roi_pct, 2.5)
    return {
        "id": "fix-and-flip",
        "name": "Fix & Flip",
        "metric": _format_compact_currency(net_profit),
        "metric_label": "Profit",
        "metric_value": net_profit,
        "score": score,
        "cap_rate": None,
        "cash_on_cash": round(roi_pct, 2),
        "dscr": None,
        "annual_cash_flow": round(net_profit, 0),
        "monthly_cash_flow": None,
        "breakdown": {
            "purchase_price": round(price),
            "purchase_costs": round(purchase_costs),
            "rehab_cost": round(rehab_cost),
            "holding_months": holding_months,
            "holding_costs": round(holding_costs),
            "total_investment": round(total_investment),
            "arv": round(arv),
            "selling_costs": round(selling_costs),
            "selling_costs_pct": round(fl.selling_costs_pct * 100, 1),
            "net_profit": round(net_profit),
            "roi_pct": round(roi_pct, 1),
            "total_cash_needed": round(total_investment),
            "property_taxes": round(property_taxes),
            "insurance": round(insurance),
        },
    }


def _calculate_house_hack_strategy(
    price: float,
    monthly_rent: float,
    bedrooms: int,
    property_taxes: float,
    insurance: float,
    a: AllAssumptions,
) -> dict:
    f = a.financing
    o = a.operating
    h = a.house_hack
    total_beds = max(bedrooms, 2)
    rooms_rented = max(1, total_beds - 1)
    rent_per_room = monthly_rent / total_beds
    rental_income = rent_per_room * rooms_rented
    down_payment = price * h.fha_down_payment_pct
    closing_costs = price * f.closing_costs_pct
    loan_amount = price - down_payment
    monthly_pi = calculate_monthly_mortgage(loan_amount, h.fha_interest_rate, f.loan_term_years)
    monthly_taxes = property_taxes / 12
    monthly_insurance = insurance / 12
    pmi = loan_amount * h.fha_mip_rate / 12
    maintenance = rental_income * o.maintenance_pct
    capex = rental_income * o.capex_pct
    vacancy = rental_income * o.vacancy_rate
    monthly_expenses = monthly_pi + monthly_taxes + monthly_insurance + pmi + maintenance + capex + vacancy
    housing_offset = (rental_income / monthly_expenses * 100) if monthly_expenses > 0 else 0
    annual_savings = rental_income * 12
    score = _performance_score(housing_offset, 1)
    total_cash = down_payment + closing_costs
    return {
        "id": "house-hack",
        "name": "House Hack",
        "metric": f"{round(housing_offset)}%",
        "metric_label": "Savings",
        "metric_value": housing_offset,
        "score": score,
        "cap_rate": None,
        "cash_on_cash": round(housing_offset, 2),
        "dscr": None,
        "annual_cash_flow": round(annual_savings, 0),
        "monthly_cash_flow": round(rental_income, 0),
        "breakdown": {
            "purchase_price": round(price),
            "down_payment": round(down_payment),
            "down_payment_pct": round(h.fha_down_payment_pct * 100, 1),
            "closing_costs": round(closing_costs),
            "closing_costs_pct": round(f.closing_costs_pct * 100, 1),
            "total_cash_needed": round(total_cash),
            "loan_amount": round(loan_amount),
            "interest_rate": round(h.fha_interest_rate * 100, 1),
            "loan_term_years": f.loan_term_years,
            "monthly_payment": round(monthly_pi),
            "pmi": round(pmi),
            "total_bedrooms": total_beds,
            "rooms_rented": rooms_rented,
            "rent_per_room": round(rent_per_room),
            "monthly_rental_income": round(rental_income),
            "annual_rental_income": round(annual_savings),
            "monthly_expenses": round(monthly_expenses),
            "housing_offset_pct": round(housing_offset, 1),
            "property_taxes": round(property_taxes),
            "insurance": round(insurance),
            "maintenance": round(maintenance * 12),
            "reserves": round(capex * 12),
        },
    }


def _calculate_wholesale_strategy(price: float, arv: float, rehab_cost: float) -> dict:
    wholesale_fee = price * 0.007
    mao = (arv * 0.70) - rehab_cost - wholesale_fee
    assignment_fee = mao - (price * 0.85)
    emd = 5000
    roi_pct = (assignment_fee / emd * 100) if emd > 0 else 0
    score = _performance_score(roi_pct, 0.5)
    return {
        "id": "wholesale",
        "name": "Wholesale",
        "metric": _format_compact_currency(max(0, assignment_fee)),
        "metric_label": "Assignment",
        "metric_value": assignment_fee,
        "score": score,
        "cap_rate": None,
        "cash_on_cash": round(roi_pct, 2),
        "dscr": None,
        "annual_cash_flow": round(assignment_fee, 0),
        "monthly_cash_flow": None,
        "breakdown": {
            "purchase_price": round(price),
            "arv": round(arv),
            "rehab_cost": round(rehab_cost),
            "wholesale_fee": round(wholesale_fee),
            "mao": round(mao),
            "assignment_fee": round(assignment_fee),
            "emd": emd,
            "roi_pct": round(roi_pct, 1),
            "total_cash_needed": emd,
        },
    }


# ===========================================
# Bracket-based verdict scoring (U.S. 2025 investor discount data)
# ===========================================

INVESTOR_DISCOUNT_BRACKETS: list[tuple[float, int, int, str]] = [
    # (max_gap_pct, score_at_bracket_start, score_at_bracket_end, investor_pct_label)
    (5, 88, 75, "30-38% of investor deals achieve a 0-5% discount"),
    (10, 75, 60, "30-37% of investor deals achieve a 6-10% discount"),
    (20, 60, 40, "12-18% of investor deals achieve an 11-20% discount"),
    (30, 40, 22, "6-10% of investor deals achieve a 21-30% discount"),
    (40, 22, 12, "2-4% of investor deals achieve a 31-40% discount"),
    (100, 12, 5, "Less than 2.5% of investor deals achieve this discount"),
]

AT_OR_ABOVE_LABEL = "10-15% of investor deals close at or above asking price"


def _interpolate_bracket_score(deal_gap_pct: float) -> int:
    """Compute base verdict score from deal gap using investor discount brackets."""
    if deal_gap_pct <= 0:
        return min(95, round(88 + min(abs(deal_gap_pct), 7)))

    prev_max = 0.0
    for max_gap, score_start, score_end, _ in INVESTOR_DISCOUNT_BRACKETS:
        if deal_gap_pct <= max_gap:
            bracket_width = max_gap - prev_max
            position = (deal_gap_pct - prev_max) / bracket_width if bracket_width > 0 else 0
            return round(score_start - position * (score_start - score_end))
        prev_max = max_gap
    return 5


def _get_bracket_label(deal_gap_pct: float) -> str:
    """Return the investor-stats label for the deal gap's bracket."""
    if deal_gap_pct <= 0:
        return AT_OR_ABOVE_LABEL
    for max_gap, _, _, label in INVESTOR_DISCOUNT_BRACKETS:
        if deal_gap_pct <= max_gap:
            return label
    return INVESTOR_DISCOUNT_BRACKETS[-1][3]


def _motivation_modifier(motivation_score: int) -> int:
    """Seller motivation modifier: -10 to +10 based on availability ranking score (0-100)."""
    return round((motivation_score - 50) / 50 * 10)


def _market_modifier(market_temperature: str | None) -> int:
    """Market temperature modifier. Cold = buyer advantage (+5), hot = seller advantage (-5)."""
    if not market_temperature:
        return 0
    temp = market_temperature.lower()
    if temp == "cold":
        return 5
    elif temp == "hot":
        return -5
    return 0


def _calculate_verdict_score(
    deal_gap_pct: float,
    motivation_score: int,
    market_temperature: str | None,
) -> int:
    """Calculate verdict score using deal gap brackets + motivation/market modifiers."""
    base = _interpolate_bracket_score(deal_gap_pct)
    mot_mod = _motivation_modifier(motivation_score)
    mkt_mod = _market_modifier(market_temperature)
    return max(5, min(95, base + mot_mod + mkt_mod))


def _generate_deal_factors(
    deal_gap_pct: float,
    bracket_label: str,
    listing_status: str | None,
    market_temperature: str | None,
    days_on_market: int | None,
    is_foreclosure: bool,
    is_bank_owned: bool,
    is_fsbo: bool,
    is_listed: bool | None,
) -> list[dict[str, str]]:
    """Generate 2-4 plain-language deal factor narratives."""
    factors: list[dict[str, str]] = []

    if deal_gap_pct <= 0:
        factors.append({
            "type": "positive",
            "text": "This property is profitable at asking price — no discount needed",
        })
    elif deal_gap_pct <= 5:
        factors.append({
            "type": "positive",
            "text": f"Only a {deal_gap_pct:.0f}% discount is needed — {bracket_label.lower()}",
        })
    else:
        severity = "info" if deal_gap_pct <= 20 else "warning"
        factors.append({
            "type": severity,
            "text": f"A {deal_gap_pct:.0f}% discount is needed — {bracket_label.lower()}",
        })

    status = (listing_status or "").upper()

    if is_foreclosure or is_bank_owned:
        factors.append({
            "type": "positive",
            "text": "Distressed sale — lender is typically motivated to liquidate",
        })
    elif "OFF_MARKET" in status or is_listed is False:
        factors.append({
            "type": "warning",
            "text": "Off-market property — seller has not indicated intent to sell",
        })
    elif "PENDING" in status:
        factors.append({
            "type": "warning",
            "text": "Property is under contract — unlikely to be available",
        })
    elif "SOLD" in status:
        factors.append({
            "type": "warning",
            "text": "Recently sold — not currently available for purchase",
        })
    elif is_fsbo:
        factors.append({
            "type": "positive",
            "text": "For sale by owner — more room for direct negotiation",
        })
    elif "FOR_SALE" in status:
        factors.append({
            "type": "info",
            "text": "Agent-listed property with standard seller motivation",
        })

    if days_on_market is not None and days_on_market > 0 and "FOR_SALE" in status:
        if days_on_market >= 120:
            factors.append({
                "type": "positive",
                "text": f"Listed {days_on_market} days — extended time on market increases negotiation leverage",
            })
        elif days_on_market >= 60:
            factors.append({
                "type": "info",
                "text": f"Listed {days_on_market} days — seller may be open to negotiation",
            })

    if market_temperature:
        temp = market_temperature.lower()
        if temp == "hot":
            factors.append({
                "type": "warning",
                "text": "Hot market — competing offers reduce negotiation leverage",
            })
        elif temp == "cold":
            factors.append({
                "type": "positive",
                "text": "Cold market — fewer buyers gives stronger negotiation position",
            })

    return factors


def _assess_pricing_quality(income_value: float, list_price: float) -> tuple[str, str]:
    if list_price <= 0 or income_value <= 0:
        return ("unknown", "pricing cannot be assessed with available data")
    income_gap_pct = ((list_price - income_value) / list_price) * 100
    if income_gap_pct <= 0:
        return ("below_income_value", "priced below its Income Value")
    elif income_gap_pct <= 5:
        return ("investment_grade", "priced near its Income Value")
    elif income_gap_pct <= 10:
        return ("fair", "modestly above its Income Value")
    elif income_gap_pct <= 20:
        return ("above_income_value", "priced above its income-generating capacity")
    elif income_gap_pct <= 30:
        return ("overpriced", "significantly above its Income Value")
    else:
        return ("substantially_overpriced", "substantially overpriced relative to income potential")


def _calculate_opportunity_score(income_value: float, list_price: float) -> tuple[int, float, str]:
    if list_price <= 0:
        return (0, 100.0, "Invalid")
    discount_pct = ((list_price - income_value) / list_price) * 100
    if discount_pct < 0:
        discount_pct = 0
    score = max(0, min(100, round(100 - discount_pct * 2)))
    if discount_pct <= 5:
        verdict = "Strong Opportunity"
    elif discount_pct <= 10:
        verdict = "Good Opportunity"
    elif discount_pct <= 15:
        verdict = "Moderate Opportunity"
    elif discount_pct <= 25:
        verdict = "Marginal Opportunity"
    elif discount_pct <= 35:
        verdict = "Unlikely Opportunity"
    elif discount_pct <= 45:
        verdict = "Pass"
    else:
        verdict = "Pass"
    return (score, discount_pct, verdict)


def _get_verdict_description(
    score: int,
    top_strategy: dict,
    income_value: float,
    list_price: float,
    target_price: float,
    income_gap_pct: float,
    deal_gap_pct: float,
    motivation_label: str,
) -> str:
    name = top_strategy["name"]
    fmt_iv = f"${income_value:,.0f}"

    if income_gap_pct <= 0:
        return (
            f"This property is priced at or below its Income Value of {fmt_iv} "
            f"— it can generate positive cash flow at the current asking price. "
            f"{name} shows the strongest returns."
        )
    elif income_gap_pct <= 5:
        return (
            f"This property is priced near its Income Value — the asking price "
            f"nearly covers all costs at current rents. A modest negotiation "
            f"could make this cash-flow positive. {motivation_label} seller "
            f"motivation supports that outcome."
        )
    elif income_gap_pct <= 15:
        return (
            f"The asking price is {income_gap_pct:.0f}% above the Income Value "
            f"of {fmt_iv}. {motivation_label} seller motivation suggests "
            f"negotiation is feasible. {name} is your strongest strategy "
            f"if you can close the gap."
        )
    elif income_gap_pct <= 30:
        return (
            f"This property requires a {income_gap_pct:.0f}% discount to reach "
            f"its Income Value of {fmt_iv}. That's a significant negotiation. "
            f"Consider adjusting your target return or exploring {name} "
            f"for the best available returns."
        )
    else:
        return (
            f"The asking price is {income_gap_pct:.0f}% above the Income Value "
            f"of {fmt_iv}. This gap is unlikely to close through negotiation "
            f"alone. Consider waiting for a price reduction or adjusting "
            f"your assumptions."
        )


# ===========================================
# Public API — called by the analytics router
# ===========================================


def compute_iq_verdict(
    input_data: IQVerdictInput,
    assumptions: AllAssumptions | None = None,
) -> IQVerdictResponse:
    """Run the full IQ Verdict multi-strategy analysis.

    Pure function: no I/O, no DB access, no side-effects.

    ``assumptions`` should be a fully-resolved AllAssumptions object
    (from assumption_resolver). When not provided, Pydantic schema
    defaults are used as a last-resort fallback.
    """
    a = assumptions or AllAssumptions()

    list_price = input_data.list_price
    monthly_rent = input_data.monthly_rent or 0
    property_taxes = input_data.property_taxes or 0
    insurance = input_data.insurance or 0
    arv = input_data.arv or (list_price * 1.15)
    rehab_cost = arv * a.rehab.renovation_budget_pct
    adr = input_data.average_daily_rate or (((monthly_rent / 30) * 1.5) if monthly_rent > 0 else 0)
    occupancy = input_data.occupancy_rate or 0.65
    bedrooms = input_data.bedrooms

    # Resolve per-request overrides on top of DB assumptions
    down_pct = input_data.down_payment_pct if input_data.down_payment_pct is not None else a.financing.down_payment_pct
    rate = input_data.interest_rate if input_data.interest_rate is not None else a.financing.interest_rate
    term = input_data.loan_term_years if input_data.loan_term_years is not None else a.financing.loan_term_years
    vacancy = input_data.vacancy_rate if input_data.vacancy_rate is not None else a.operating.vacancy_rate
    maint_pct = input_data.maintenance_pct if input_data.maintenance_pct is not None else a.operating.maintenance_pct
    mgmt_pct = (
        input_data.management_pct if input_data.management_pct is not None else a.operating.property_management_pct
    )
    buy_discount = input_data.buy_discount_pct if input_data.buy_discount_pct is not None else a.ltr.buy_discount_pct

    capex_pct = a.operating.capex_pct
    utilities_annual = a.operating.utilities_monthly * 12
    other_annual = a.operating.landscaping_annual + a.operating.pest_control_annual

    income_value = estimate_income_value(
        monthly_rent=monthly_rent,
        property_taxes=property_taxes,
        insurance=insurance,
        down_payment_pct=down_pct,
        interest_rate=rate,
        loan_term_years=term,
        vacancy_rate=vacancy,
        maintenance_pct=maint_pct,
        management_pct=mgmt_pct,
        capex_pct=capex_pct,
        utilities_annual=utilities_annual,
        other_annual_expenses=other_annual,
    )

    if input_data.is_listed is False and (
        input_data.zestimate is not None
        or input_data.current_value_avm is not None
        or input_data.tax_assessed_value is not None
    ):
        computed_market = compute_market_price(
            is_listed=False,
            list_price=input_data.list_price,
            zestimate=input_data.zestimate,
            current_value_avm=input_data.current_value_avm,
            tax_assessed_value=input_data.tax_assessed_value,
        )
        if computed_market is not None:
            list_price = float(computed_market)
            arv = input_data.arv or (list_price * 1.15)
            rehab_cost = arv * a.rehab.renovation_budget_pct

    buy_price = input_data.purchase_price or calculate_buy_price(
        market_price=list_price,
        monthly_rent=monthly_rent,
        property_taxes=property_taxes,
        insurance=insurance,
        buy_discount_pct=buy_discount,
        down_payment_pct=down_pct,
        interest_rate=rate,
        loan_term_years=term,
        vacancy_rate=vacancy,
        maintenance_pct=maint_pct,
        management_pct=mgmt_pct,
        capex_pct=capex_pct,
        utilities_annual=utilities_annual,
        other_annual_expenses=other_annual,
    )

    strategies = [
        _calculate_ltr_strategy(buy_price, monthly_rent, property_taxes, insurance, a),
        _calculate_str_strategy(buy_price, adr, occupancy, property_taxes, insurance, a),
        _calculate_brrrr_strategy(buy_price, monthly_rent, property_taxes, insurance, arv, rehab_cost, a),
        _calculate_flip_strategy(buy_price, arv, rehab_cost, property_taxes, insurance, a),
        _calculate_house_hack_strategy(buy_price, monthly_rent, bedrooms, property_taxes, insurance, a),
        _calculate_wholesale_strategy(buy_price, arv, rehab_cost),
    ]

    for i, strategy in enumerate(strategies):
        strategy["rank"] = i + 1
        score = strategy["score"]
        strategy["badge"] = "Strong" if score >= 80 else ("Good" if score >= 60 else None)

    top_strategy = max(strategies, key=lambda x: x["score"])

    motivation_score = 50
    motivation_label = "Medium"
    is_distressed = input_data.is_foreclosure or input_data.is_bank_owned

    if input_data.listing_status or input_data.seller_type:
        from app.services.calculators import get_availability_ranking

        avail = get_availability_ranking(
            listing_status=input_data.listing_status,
            seller_type=input_data.seller_type,
            is_foreclosure=input_data.is_foreclosure or False,
            is_bank_owned=input_data.is_bank_owned or False,
            is_fsbo=input_data.is_fsbo or False,
        )
        motivation_score = avail["score"]
        motivation_label = avail["motivation"].capitalize()

    income_gap_amount = list_price - income_value if list_price > 0 else 0
    income_gap_pct = max(0, (income_gap_amount / list_price) * 100) if list_price > 0 else 0

    deal_gap_amount = list_price - buy_price if list_price > 0 else 0
    deal_gap_pct = max(0, (deal_gap_amount / list_price) * 100) if list_price > 0 else 0

    pricing_tier, _pricing_sentence = _assess_pricing_quality(income_value, list_price)

    deal_score = _calculate_verdict_score(
        deal_gap_pct=deal_gap_pct,
        motivation_score=motivation_score,
        market_temperature=input_data.market_temperature,
    )

    bracket_label = _get_bracket_label(deal_gap_pct)

    deal_factors_raw = _generate_deal_factors(
        deal_gap_pct=deal_gap_pct,
        bracket_label=bracket_label,
        listing_status=input_data.listing_status,
        market_temperature=input_data.market_temperature,
        days_on_market=input_data.days_on_market,
        is_foreclosure=input_data.is_foreclosure or False,
        is_bank_owned=input_data.is_bank_owned or False,
        is_fsbo=input_data.is_fsbo or False,
        is_listed=input_data.is_listed,
    )

    deal_verdict = (
        "Strong Opportunity"
        if deal_score >= 85
        else "Good Opportunity"
        if deal_score >= 70
        else "Moderate Opportunity"
        if deal_score >= 55
        else "Marginal Opportunity"
        if deal_score >= 40
        else "Unlikely Opportunity"
        if deal_score >= 25
        else "Pass"
    )

    opp_grade, opp_label, opp_color = _score_to_grade_label(deal_score)
    ret_grade, ret_label, ret_color = _score_to_grade_label(top_strategy["score"])

    defaults_dict = a.model_dump(by_alias=True)

    return IQVerdictResponse(
        deal_score=deal_score,
        deal_verdict=deal_verdict,
        verdict_description=_get_verdict_description(
            deal_score,
            top_strategy,
            income_value=income_value,
            list_price=list_price,
            target_price=buy_price,
            income_gap_pct=income_gap_pct,
            deal_gap_pct=deal_gap_pct,
            motivation_label=motivation_label,
        ),
        discount_percent=round(income_gap_pct, 1),
        strategies=[StrategyResult(**s) for s in strategies],
        purchase_price=buy_price,
        income_value=income_value,
        list_price=list_price,
        inputs_used={
            "monthly_rent": monthly_rent,
            "property_taxes": property_taxes,
            "insurance": insurance,
            "arv": arv,
            "rehab_cost": rehab_cost,
            "bedrooms": bedrooms,
            "provided_rent": input_data.monthly_rent,
            "provided_taxes": input_data.property_taxes,
            "provided_insurance": input_data.insurance,
        },
        defaults_used=defaults_dict,
        income_gap_amount=round(income_gap_amount, 0),
        income_gap_percent=round(income_gap_pct, 1),
        pricing_quality_tier=pricing_tier,
        deal_gap_amount=round(deal_gap_amount, 0),
        deal_gap_percent=round(deal_gap_pct, 1),
        opportunity=ScoreDisplayResponse(score=deal_score, grade=opp_grade, label=opp_label, color=opp_color),
        opportunity_factors=OpportunityFactorsResponse(
            deal_gap=round(deal_gap_pct, 1),
            motivation=motivation_score,
            motivation_label=motivation_label,
            days_on_market=input_data.days_on_market,
            buyer_market=input_data.market_temperature,
            distressed_sale=is_distressed,
        ),
        return_rating=ScoreDisplayResponse(
            score=top_strategy["score"], grade=ret_grade, label=ret_label, color=ret_color
        ),
        return_factors=ReturnFactorsResponse(
            cap_rate=top_strategy.get("cap_rate"),
            cash_on_cash=top_strategy.get("cash_on_cash"),
            dscr=top_strategy.get("dscr"),
            annual_roi=top_strategy.get("annual_cash_flow"),
            annual_profit=top_strategy.get("annual_cash_flow"),
            strategy_name=top_strategy["name"],
        ),
        wholesale_mao=round((arv * 0.70) - rehab_cost - (buy_price * 0.007), 0),
        deal_factors=[DealFactor(**f) for f in deal_factors_raw],
        discount_bracket_label=bracket_label,
    )


def compute_deal_score(
    input_data: DealScoreInput,
    assumptions: AllAssumptions | None = None,
) -> DealScoreResponse:
    """Run the Deal Opportunity Score calculation.

    Pure function: no I/O, no DB access, no side-effects.
    """
    a = assumptions or AllAssumptions()

    from app.services.calculators import calculate_deal_opportunity_score

    list_price = input_data.list_price
    purchase_price = input_data.purchase_price
    monthly_rent = input_data.monthly_rent
    property_taxes = input_data.property_taxes
    insurance = input_data.insurance

    vacancy = input_data.vacancy_rate if input_data.vacancy_rate is not None else a.operating.vacancy_rate
    maint_pct = input_data.maintenance_pct if input_data.maintenance_pct is not None else a.operating.maintenance_pct
    mgmt_pct = (
        input_data.management_pct if input_data.management_pct is not None else a.operating.property_management_pct
    )
    down_pct = input_data.down_payment_pct if input_data.down_payment_pct is not None else a.financing.down_payment_pct
    rate = input_data.interest_rate if input_data.interest_rate is not None else a.financing.interest_rate
    term = input_data.loan_term_years if input_data.loan_term_years is not None else a.financing.loan_term_years

    capex_pct = a.operating.capex_pct
    utilities_annual = a.operating.utilities_monthly * 12
    other_annual = a.operating.landscaping_annual + a.operating.pest_control_annual

    income_value = estimate_income_value(
        monthly_rent=monthly_rent,
        property_taxes=property_taxes,
        insurance=insurance,
        down_payment_pct=down_pct,
        interest_rate=rate,
        loan_term_years=term,
        vacancy_rate=vacancy,
        maintenance_pct=maint_pct,
        management_pct=mgmt_pct,
        capex_pct=capex_pct,
        utilities_annual=utilities_annual,
        other_annual_expenses=other_annual,
    )

    has_listing_context = (
        input_data.listing_status is not None
        or input_data.seller_type is not None
        or input_data.is_foreclosure
        or input_data.is_bank_owned
        or input_data.is_fsbo
        or input_data.days_on_market is not None
        or input_data.price_reductions > 0
        or input_data.market_temperature is not None
    )

    if has_listing_context:
        enhanced_result = calculate_deal_opportunity_score(
            income_value=income_value,
            list_price=list_price,
            listing_status=input_data.listing_status,
            seller_type=input_data.seller_type,
            is_foreclosure=input_data.is_foreclosure or False,
            is_bank_owned=input_data.is_bank_owned or False,
            is_fsbo=input_data.is_fsbo or False,
            is_auction=input_data.is_auction or False,
            price_reductions=input_data.price_reductions or 0,
            days_on_market=input_data.days_on_market,
            market_temperature=input_data.market_temperature,
        )
        deal_score = enhanced_result["score"]
        discount_pct = enhanced_result["deal_gap_percent"]
        deal_verdict = enhanced_result["label"]
        grade = enhanced_result["grade"]
        color = enhanced_result["color"]

        motivation_data = enhanced_result["motivation"]
        motivation = DealScoreMotivation(
            score=motivation_data["score"],
            label=motivation_data["label"],
            base_score=motivation_data["base_score"],
            dom_bonus=motivation_data["dom_bonus"],
            market_modifier=motivation_data["market_modifier"],
            market_temperature=motivation_data["market_temperature"],
            availability_status=motivation_data["availability_status"],
            availability_label=motivation_data["availability_label"],
        )
        factors = DealScoreFactors(
            deal_gap_percent=enhanced_result["deal_gap_percent"],
            deal_gap_amount=enhanced_result["deal_gap_amount"],
            max_achievable_discount=enhanced_result["max_achievable_discount"],
            motivation=motivation,
            deal_gap_score=enhanced_result["factors"]["deal_gap"]["score"],
            availability_score=enhanced_result["factors"]["availability"]["score"],
            availability_status=enhanced_result["factors"]["availability"]["status"],
            availability_label=enhanced_result["factors"]["availability"]["label"],
            availability_motivation=enhanced_result["factors"]["availability"].get("motivation", "medium"),
            dom_score=enhanced_result["factors"]["days_on_market"].get("bonus", 0),
            dom_leverage="medium",
            days_on_market=enhanced_result["factors"]["days_on_market"].get("days"),
        )
    else:
        deal_score, discount_pct, deal_verdict = _calculate_opportunity_score(income_value, list_price)
        if deal_score >= 90:
            grade, color = "A+", "#22c55e"
        elif deal_score >= 80:
            grade, color = "A", "#22c55e"
        elif deal_score >= 70:
            grade, color = "B", "#84cc16"
        elif deal_score >= 50:
            grade, color = "C", "#f97316"
        elif deal_score >= 30:
            grade, color = "D", "#f97316"
        else:
            grade, color = "F", "#ef4444"
        factors = None

    return DealScoreResponse(
        deal_score=deal_score,
        deal_verdict=deal_verdict,
        discount_percent=round(discount_pct, 1),
        income_value=income_value,
        purchase_price=purchase_price,
        list_price=list_price,
        factors=factors,
        grade=grade,
        color=color,
        calculation_details={
            "monthly_rent": monthly_rent,
            "property_taxes": property_taxes,
            "insurance": insurance,
            "vacancy_rate": vacancy,
            "maintenance_pct": maint_pct,
            "management_pct": mgmt_pct,
            "down_payment_pct": down_pct,
            "interest_rate": rate,
            "loan_term_years": term,
        },
    )
