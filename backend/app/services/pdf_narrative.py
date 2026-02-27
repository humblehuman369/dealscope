"""
PDF Narrative Engine — Data-driven contextual text for the DealGapIQ Property Report.

Generates investor-oriented narrative paragraphs for each report section
based on the actual financial data. The tone is professional, concise,
and action-oriented — like a real estate analyst writing for a client.
"""

from app.schemas.proforma import FinancialProforma


def _fmt(val: float, decimals: int = 0) -> str:
    """Format number with commas."""
    if decimals == 0:
        return f"{val:,.0f}"
    return f"{val:,.{decimals}f}"


def _fmt_money(val: float) -> str:
    """Format as dollar amount."""
    if abs(val) >= 1_000_000:
        return f"${val / 1_000_000:,.2f}M"
    return f"${val:,.0f}"


def _fmt_pct(val: float, decimals: int = 1) -> str:
    """Format as percentage."""
    return f"{val:.{decimals}f}%"


def _property_type_label(ptype: str) -> str:
    """Normalize property type for narrative."""
    mapping = {
        "single_family": "single-family residence",
        "singlefamily": "single-family residence",
        "sfr": "single-family residence",
        "multi_family": "multi-family property",
        "condo": "condominium",
        "townhouse": "townhouse",
        "duplex": "duplex",
        "triplex": "triplex",
    }
    return mapping.get(ptype.lower().replace("-", "_").replace(" ", "_"), ptype)


# ---------------------------------------------------------------------------
# Cover page narrative
# ---------------------------------------------------------------------------


def cover_narrative(data: FinancialProforma) -> str:
    prop = data.property
    strategy = data.strategy_type.upper().replace("_", " ")
    ptype = _property_type_label(prop.property_type)

    base = (
        f"This comprehensive investment analysis provides detailed financial projections "
        f"and property insights for a {ptype} located in {prop.city}, {prop.state}. "
    )

    if prop.year_built:
        base += f"Built in {prop.year_built}, this property offers "
    else:
        base += "This property offers "

    base += (
        f"{prop.bedrooms} bedrooms and {prop.bathrooms} bathrooms across "
        f"{_fmt(prop.square_feet)} square feet of living space"
    )

    if prop.lot_size and prop.lot_size > 0:
        acres = prop.lot_size / 43560
        if acres >= 0.1:
            base += f" on a {_fmt(prop.lot_size)}-square-foot lot ({acres:.2f} acres)"

    base += f". Analyzed under a {strategy} investment strategy."

    return base


# ---------------------------------------------------------------------------
# Property overview narrative
# ---------------------------------------------------------------------------


def property_overview_narrative(data: FinancialProforma) -> str:
    prop = data.property
    acq = data.acquisition
    inc = data.income
    ptype = _property_type_label(prop.property_type)

    parts = [f"This {ptype} represents "]

    # Characterize the deal
    coc = data.metrics.cash_on_cash_return
    if coc >= 8:
        parts.append("a strong cash-flowing investment opportunity")
    elif coc >= 0:
        parts.append("a moderate investment opportunity with positive returns")
    else:
        parts.append("a wealth-building investment opportunity focused on long-term appreciation")

    parts.append(
        f" in {prop.city}'s residential market. "
        f"With a list price of {_fmt_money(acq.list_price)} and a projected monthly rent "
        f"of {_fmt_money(inc.monthly_rent)}, the property "
    )

    price_per_sqft = data.metrics.price_per_sqft
    if price_per_sqft > 0:
        parts.append(f"carries a price per square foot of ${_fmt(price_per_sqft)}. ")

    rent_per_sqft = data.metrics.rent_per_sqft
    if rent_per_sqft > 0:
        parts.append(
            "The rent-to-price ratio and location fundamentals position this property for sustained investor interest."
        )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Market position narrative
# ---------------------------------------------------------------------------


def market_narrative(data: FinancialProforma) -> str:
    prop = data.property

    return (
        f"Located in {prop.city}, {prop.state}, this property benefits from "
        f"the area's residential market dynamics. The neighborhood offers access to local "
        f"amenities, schools, and transportation corridors that drive tenant demand. "
        f"With an assumed annual appreciation rate of "
        f"{_fmt_pct(data.projections.appreciation_rate)}, the investment thesis leverages "
        f"both rental income and long-term value growth. "
        f"Strong fundamentals in the local housing market — including limited inventory "
        f"and consistent demand from relocating professionals — support the projected "
        f"appreciation trajectory."
    )


# ---------------------------------------------------------------------------
# Financing narrative
# ---------------------------------------------------------------------------


def financing_narrative(data: FinancialProforma) -> str:
    fin = data.financing
    acq = data.acquisition

    parts = [
        f"The investment requires a total acquisition cost of {_fmt_money(acq.total_acquisition_cost)}, "
        f"including the purchase price, closing costs"
    ]
    if acq.rehab_costs > 0:
        parts.append(f", and {_fmt_money(acq.rehab_costs)} in rehabilitation costs")
    parts.append(
        f". With a conventional financing structure utilizing a "
        f"{fin.down_payment_percent:.0f}% down payment, investors can leverage "
        f"{_fmt_money(fin.loan_amount)} while maintaining strong equity positioning. "
    )
    parts.append(
        f"The {fin.loan_term_years}-year fixed mortgage at {fin.interest_rate:.2f}% interest "
        f"provides payment stability throughout the hold period. "
    )
    parts.append(
        f"Over the life of the loan, total interest payments will reach "
        f"{_fmt_money(fin.total_interest_over_life)}, making refinancing opportunities "
        f"an important consideration as interest rates evolve."
    )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Income statement narrative
# ---------------------------------------------------------------------------


def income_narrative(data: FinancialProforma) -> str:
    inc = data.income
    m = data.metrics

    parts = [
        f"The first-year financial performance projects gross scheduled rent of "
        f"{_fmt_money(inc.annual_gross_rent)} generating a net operating income of "
        f"{_fmt_money(m.net_operating_income)}. "
    ]

    if m.annual_cash_flow >= 0:
        parts.append(
            f"After debt service of {_fmt_money(m.annual_debt_service)}, the property "
            f"produces a pre-tax cash flow of {_fmt_money(m.annual_cash_flow)}, "
            f"resulting in monthly positive cash flow of {_fmt_money(m.monthly_cash_flow)}. "
            f"This positions the investment for immediate income generation alongside "
            f"long-term wealth accumulation through appreciation and equity buildup."
        )
    else:
        parts.append(
            f"After debt service of {_fmt_money(m.annual_debt_service)}, the property "
            f"produces a pre-tax cash flow of negative {_fmt_money(abs(m.annual_cash_flow))}, "
            f"resulting in monthly negative cash flow of {_fmt_money(abs(m.monthly_cash_flow))}. "
            f"However, this initial underperformance is offset by significant tax benefits "
            f"through depreciation and positions the investment for strong future returns "
            f"as rents escalate and the loan amortizes."
        )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Expense breakdown narrative
# ---------------------------------------------------------------------------


def expense_narrative(data: FinancialProforma) -> str:
    exp = data.expenses
    proj = data.projections

    ratio = exp.expense_ratio * 100 if exp.expense_ratio < 1 else exp.expense_ratio

    parts = [
        f"Total operating expenses of {_fmt_money(exp.total_operating_expenses)} annually "
        f"represent {ratio:.1f}% of effective gross income"
    ]

    if 35 <= ratio <= 45:
        parts.append(", a healthy expense ratio for single-family residential properties. ")
    elif ratio < 35:
        parts.append(", a favorable expense ratio indicating efficient operations. ")
    else:
        parts.append(", which is elevated relative to typical single-family benchmarks. ")

    if exp.insurance > exp.property_taxes:
        parts.append(f"Insurance costs are the largest expense category at {_fmt_money(exp.insurance)}, ")
    else:
        parts.append(f"Property taxes are the largest expense category at {_fmt_money(exp.property_taxes)}, ")

    parts.append(
        "while conservative reserves for maintenance and capital expenditures "
        "ensure adequate funds for property upkeep. "
    )

    if exp.hoa_fees == 0:
        parts.append("The absence of HOA fees provides a meaningful cost advantage. ")

    parts.append(
        f"With {_fmt_pct(proj.expense_growth_rate)} annual expense growth assumptions, "
        f"operating cost inflation remains modest relative to the projected "
        f"{_fmt_pct(proj.rent_growth_rate)} annual rent growth."
    )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Key metrics narrative
# ---------------------------------------------------------------------------


def metrics_narrative(data: FinancialProforma) -> str:
    m = data.metrics
    r = data.returns

    parts = []

    # Overall assessment
    if m.cap_rate >= 6 and m.cash_on_cash_return >= 8:
        parts.append(
            "This investment demonstrates strong operational fundamentals with above-benchmark "
            "returns on both an unlevered and levered basis. "
        )
    elif m.cap_rate >= 4 and m.cash_on_cash_return >= 0:
        parts.append(
            "The investment shows moderate operational performance. While first-year metrics "
            "reflect current market conditions, the property is positioned for improving returns. "
        )
    else:
        parts.append("First-year operational metrics reflect the challenges of current market conditions. ")

    # DSCR context
    if m.dscr >= 1.25:
        parts.append(
            f"A DSCR of {m.dscr:.2f} indicates the property's income comfortably covers "
            f"debt obligations with a healthy safety margin. "
        )
    elif m.dscr >= 1.0:
        parts.append(
            f"A DSCR of {m.dscr:.2f} indicates the property's income covers debt obligations, "
            f"though with limited margin. "
        )
    else:
        parts.append(
            f"A DSCR below 1.0 ({m.dscr:.2f}) indicates the property's operational income "
            f"does not fully cover debt obligations in year one. "
        )

    # IRR context
    if hasattr(r, "irr") and r.irr > 0:
        parts.append(f"The {_fmt_pct(r.irr)} projected IRR demonstrates ")
        if r.irr >= 15:
            parts.append("excellent total returns when held through the full investment cycle, ")
        elif r.irr >= 10:
            parts.append("solid total returns when held through the full investment cycle, ")
        else:
            parts.append("moderate total returns over the projected hold period, ")
        parts.append("accounting for rental income, appreciation, loan amortization, and eventual sale proceeds.")

    return "".join(parts)


# ---------------------------------------------------------------------------
# Deal score narrative
# ---------------------------------------------------------------------------


def deal_score_narrative(data: FinancialProforma) -> str:
    ds = data.deal_score

    if ds.score >= 80:
        assessment = "a strong investment opportunity"
        action = "The data supports moving forward with due diligence and negotiation."
    elif ds.score >= 60:
        assessment = "a moderate investment opportunity with upside potential"
        action = "Consider negotiating toward the Income Value to improve returns."
    elif ds.score >= 40:
        assessment = "a marginal opportunity that requires careful evaluation"
        action = "Significant price negotiation would be needed to achieve target returns."
    else:
        assessment = "a challenging investment at current pricing"
        action = "The current pricing does not support the investment thesis. Look for substantial price reduction or alternative strategies."

    parts = [f"The DealGapIQ Deal Score of {ds.score} ({ds.grade}) indicates this is {assessment}. {ds.verdict}. "]

    if ds.income_value > 0 and ds.discount_required != 0:
        parts.append(
            f"The Income Value is calculated at {_fmt_money(ds.income_value)}, "
            f"representing a {abs(ds.discount_required):.1f}% "
            f"{'discount' if ds.discount_required > 0 else 'premium'} from the current price. "
        )

    parts.append(action)

    return "".join(parts)


# ---------------------------------------------------------------------------
# Projections narrative
# ---------------------------------------------------------------------------


def projections_narrative(data: FinancialProforma) -> str:
    proj = data.projections
    years = len(proj.annual_projections)

    # Find when cash flow turns positive
    positive_year = None
    for i, ap in enumerate(proj.annual_projections):
        if ap.pre_tax_cash_flow >= 0:
            positive_year = i + 1
            break

    # Calculate cumulative equity growth
    initial_equity = data.financing.down_payment
    final_equity = proj.equity_positions[-1] if proj.equity_positions else initial_equity
    equity_growth_pct = ((final_equity - initial_equity) / initial_equity * 100) if initial_equity > 0 else 0

    # Property appreciation
    initial_value = data.acquisition.purchase_price
    final_value = proj.property_values[-1] if proj.property_values else initial_value
    ((final_value - initial_value) / initial_value * 100) if initial_value > 0 else 0

    parts = []

    if positive_year and positive_year > 1:
        parts.append(
            f"The property transforms from negative cash flow to positive returns by year {positive_year} "
            f"as rent growth at {_fmt_pct(proj.rent_growth_rate)} annually outpaces expense growth at "
            f"{_fmt_pct(proj.expense_growth_rate)}. "
        )
    elif positive_year == 1:
        parts.append(
            f"The property generates positive cash flow from year one, with returns strengthening "
            f"as rent growth at {_fmt_pct(proj.rent_growth_rate)} outpaces expenses. "
        )
    else:
        parts.append(
            f"Over the {years}-year projection, rent growth at {_fmt_pct(proj.rent_growth_rate)} "
            f"works to offset expense growth at {_fmt_pct(proj.expense_growth_rate)}. "
        )

    parts.append(
        f"Property value appreciation at {_fmt_pct(proj.appreciation_rate)} annually drives "
        f"the primary wealth creation, compounding from {_fmt_money(initial_value)} to a projected "
        f"{_fmt_money(final_value)} by year {years}. Combined with loan principal reduction, "
        f"total equity grows from {_fmt_money(initial_equity)} to {_fmt_money(final_equity)} — "
        f"a {equity_growth_pct:.0f}% increase over the hold period."
    )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Exit strategy narrative
# ---------------------------------------------------------------------------


def exit_narrative(data: FinancialProforma) -> str:
    e = data.exit
    r = data.returns
    fin = data.financing

    parts = [
        f"After a {e.hold_period_years}-year hold period, the exit analysis projects "
        f"a gross sale price of {_fmt_money(e.projected_sale_price)} based on continued "
        f"{_fmt_pct(e.appreciation_rate)} annual appreciation. "
        f"After broker commissions of {e.broker_commission_percent * 100:.0f}%, closing costs, "
        f"and loan payoff of {_fmt_money(e.remaining_loan_balance)}, "
        f"net sale proceeds reach {_fmt_money(e.net_sale_proceeds)} before taxes. "
    ]

    if e.accumulated_depreciation > 0:
        parts.append(
            f"Tax implications are significant, with accumulated depreciation of "
            f"{_fmt_money(e.accumulated_depreciation)} subject to recapture at 25%, "
            f"plus capital gains taxes on the remaining {_fmt_money(e.capital_gain)} profit. "
        )

    parts.append(
        f"The after-tax proceeds of {_fmt_money(e.after_tax_proceeds)} represent a "
        f"{r.equity_multiple:.2f}x equity multiple on the original "
        f"{_fmt_money(fin.down_payment)} down payment. "
    )

    parts.append(
        "Investors should consider 1031 exchange opportunities to defer capital gains "
        "taxation and reinvest proceeds into larger properties, accelerating portfolio "
        "growth and wealth accumulation."
    )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Sensitivity narrative
# ---------------------------------------------------------------------------


def sensitivity_narrative(data: FinancialProforma) -> str:
    s = data.sensitivity

    parts = ["Sensitivity analysis examines how changes in key variables affect investment returns. "]

    if s.purchase_price:
        best = max(s.purchase_price, key=lambda x: x.irr)
        worst = min(s.purchase_price, key=lambda x: x.irr)
        parts.append(
            f"Purchase price scenarios show IRR ranging from {_fmt_pct(worst.irr)} "
            f"to {_fmt_pct(best.irr)}, demonstrating the impact of acquisition pricing "
            f"on total returns. "
        )

    if s.rent:
        best = max(s.rent, key=lambda x: x.irr)
        worst = min(s.rent, key=lambda x: x.irr)
        parts.append(
            f"Rent variation scenarios project IRR between {_fmt_pct(worst.irr)} "
            f"and {_fmt_pct(best.irr)}, highlighting the sensitivity of returns "
            f"to rental income assumptions. "
        )

    parts.append(
        "These scenarios help quantify risk and identify the variables with the "
        "greatest impact on investment performance."
    )

    return "".join(parts)
