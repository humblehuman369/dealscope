"""
Financial Proforma Generator Service
Compiles property data, calculations, and projections into a complete proforma
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import math

from app.schemas.proforma import (
    FinancialProforma,
    DepreciationConfig,
    DepreciationMethod,
    AnnualTaxProjection,
    AmortizationRow,
    AmortizationSummary,
    ExitAnalysis,
    InvestmentReturns,
    SensitivityScenario,
    SensitivityAnalysis,
    PropertySummary,
    AcquisitionDetails,
    FinancingDetails,
    IncomeDetails,
    ExpenseDetails,
    KeyMetrics,
    Projections,
    DealScoreSummary,
    DataSources,
)
from app.schemas.property import PropertyResponse
from app.services.calculators import (
    calculate_monthly_mortgage, calculate_ltr, calculate_str,
    calculate_brrrr, calculate_flip, calculate_house_hack, calculate_wholesale,
)

from app.schemas.property import AllAssumptions

import logging
logger = logging.getLogger(__name__)


# ============================================
# STRATEGY METHODOLOGY DESCRIPTIONS
# ============================================

STRATEGY_METHODOLOGY = {
    "ltr": """**Long-Term Rental (LTR)** — Buy and hold for steady monthly cash flow.
You purchase the property, secure long-term tenants (12-month leases), and earn
rental income minus operating expenses and debt service. Key metrics: Cap Rate,
Cash-on-Cash Return, DSCR. This strategy prioritizes predictable income and
long-term appreciation. Ideal for investors seeking passive income with moderate
risk. The financial model projects 10-year cash flows with rent growth, expense
inflation, and equity buildup through loan amortization and appreciation.""",

    "str": """**Short-Term Rental (STR)** — Maximize revenue through nightly bookings.
You operate the property as a vacation or short-term rental on platforms like
Airbnb and VRBO. Revenue is driven by Average Daily Rate (ADR) × Occupancy Rate.
Higher revenue potential comes with higher management intensity: cleaning costs,
platform fees (15-20%), furnishing, and active management. Key metrics: Revenue
per Available Night (RevPAN), Break-Even Occupancy, Cash-on-Cash Return. The
model includes seasonality adjustments and platform fee structures.""",

    "brrrr": """**BRRRR** — Buy, Rehab, Rent, Refinance, Repeat.
You purchase a distressed property below Zestimate, renovate to increase its
value (to ARV — After Repair Value), rent it out, then refinance based on the
new higher value to pull out most or all of your initial investment. Key metrics:
Capital Recycled %, Post-Refi Cash-on-Cash, Cash Left in Deal. The goal is to
recycle your capital into the next deal, achieving "infinite ROI" when you
recover 100% of your cash. The model tracks 5 phases: Buy → Rehab → Rent →
Refinance → Repeat.""",

    "flip": """**Fix & Flip** — Buy low, renovate, sell high for a one-time profit.
You purchase a distressed property, complete renovations within a target timeline
(typically 3-6 months), and sell at or above ARV. Profit = Sale Price - Purchase
- Rehab - Holding Costs - Selling Costs. Key metrics: Net Profit, ROI, Annualized
ROI, 70% Rule compliance. The model accounts for hard money financing, holding
costs (taxes, insurance, utilities during renovation), and selling costs (6%
commission + closing). Risk factors: renovation budget overruns, extended timelines,
and market shifts during the hold period.""",

    "house_hack": """**House Hack** — Live in part of the property, rent the rest.
You purchase a property (often with FHA 3.5% down), live in one unit or bedroom,
and rent out the remaining space to offset your housing costs. This dramatically
reduces your personal housing expense while building equity. Key metrics: Housing
Cost Offset %, Monthly Savings vs. Renting, Live-Free Threshold. Two scenarios
are modeled: Scenario A (rent individual rooms) and Scenario B (duplex conversion).
Ideal for first-time investors who want to start building wealth while minimizing
out-of-pocket housing costs.""",

    "wholesale": """**Wholesale** — Earn assignment fees without owning the property.
You find off-market deals, put them under contract, then assign the contract to
an end buyer (typically a rehabber or investor) for an assignment fee. No
renovation, no tenants, no financing needed — just deal-finding skill and
marketing. Key metrics: Assignment Fee, ROI on Earnest Money, Deals Needed for
Target Income. The model calculates Maximum Allowable Offer (MAO) using the 70%
Rule: MAO = ARV × 70% - Rehab Costs - Your Fee. Lowest capital requirement of
any strategy but requires volume and marketing investment.""",
}


def _run_strategy_calculator(
    strategy: str,
    purchase_price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    arv: float = 0,
    bedrooms: int = 3,
) -> dict:
    """Run the full strategy calculator and return results as a dict."""
    try:
        if strategy == "ltr":
            return calculate_ltr(
                purchase_price=purchase_price, monthly_rent=monthly_rent,
                property_taxes_annual=property_taxes, hoa_monthly=0,
            )
        elif strategy == "str":
            adr = monthly_rent * 12 / 365 * 1.8  # Approximate ADR from monthly rent
            return calculate_str(
                purchase_price=purchase_price, average_daily_rate=adr,
                occupancy_rate=0.65, property_taxes_annual=property_taxes, hoa_monthly=0,
            )
        elif strategy == "brrrr":
            rehab_cost = purchase_price * 0.15
            return calculate_brrrr(
                market_value=purchase_price, arv=arv or purchase_price * 1.25,
                monthly_rent_post_rehab=monthly_rent, property_taxes_annual=property_taxes,
                renovation_budget=rehab_cost,
            )
        elif strategy == "flip":
            rehab_cost = purchase_price * 0.15
            return calculate_flip(
                market_value=purchase_price, arv=arv or purchase_price * 1.3,
                property_taxes_annual=property_taxes, insurance_annual=insurance,
                renovation_budget=rehab_cost,
            )
        elif strategy == "house_hack":
            return calculate_house_hack(
                purchase_price=purchase_price, monthly_rent_per_room=monthly_rent / max(bedrooms, 2),
                rooms_rented=max(1, bedrooms - 1), property_taxes_annual=property_taxes,
                owner_unit_market_rent=monthly_rent,
            )
        elif strategy == "wholesale":
            rehab_cost = purchase_price * 0.15
            return calculate_wholesale(
                arv=arv or purchase_price * 1.3, estimated_rehab_costs=rehab_cost,
            )
        else:
            return {}
    except Exception as e:
        logger.warning(f"Strategy calculator error for {strategy}: {e}")
        return {"error": str(e)}


# ============================================
# DEPRECIATION CALCULATIONS
# ============================================

def calculate_depreciation(
    purchase_price: float,
    land_value_percent: float = 0.20,
    closing_costs: float = 0,
    rehab_costs: float = 0,
    is_residential: bool = True
) -> DepreciationConfig:
    """Calculate depreciation configuration for tax purposes."""
    land_value = purchase_price * land_value_percent
    improvement_value = purchase_price - land_value
    depreciation_years = 27.5 if is_residential else 39.0
    
    # Typically ~60% of closing costs are capitalizable
    capitalized_closing_costs = closing_costs * 0.6
    
    total_depreciable_basis = improvement_value + capitalized_closing_costs + rehab_costs
    annual_depreciation = total_depreciable_basis / depreciation_years
    
    return DepreciationConfig(
        purchase_price=purchase_price,
        land_value_percent=land_value_percent,
        land_value=land_value,
        improvement_value=improvement_value,
        capitalized_closing_costs=capitalized_closing_costs,
        rehab_costs=rehab_costs,
        total_depreciable_basis=total_depreciable_basis,
        depreciation_method=DepreciationMethod.STRAIGHT_LINE,
        depreciation_years=depreciation_years,
        annual_depreciation=annual_depreciation,
        monthly_depreciation=annual_depreciation / 12,
    )


# ============================================
# AMORTIZATION CALCULATIONS
# ============================================

def calculate_amortization_schedule(
    principal: float,
    annual_rate: float,
    term_years: int
) -> tuple[List[AmortizationRow], AmortizationSummary]:
    """Generate full amortization schedule."""
    monthly_payment = calculate_monthly_mortgage(principal, annual_rate, term_years)
    monthly_rate = annual_rate / 12
    total_months = term_years * 12
    
    balance = principal
    cumulative_principal = 0
    cumulative_interest = 0
    schedule = []
    
    for month in range(1, total_months + 1):
        beginning_balance = balance
        interest_payment = balance * monthly_rate
        principal_payment = monthly_payment - interest_payment
        
        cumulative_principal += principal_payment
        cumulative_interest += interest_payment
        balance = max(0, balance - principal_payment)
        
        schedule.append(AmortizationRow(
            month=month,
            year=math.ceil(month / 12),
            payment_number=month,
            beginning_balance=beginning_balance,
            scheduled_payment=monthly_payment,
            principal_payment=principal_payment,
            interest_payment=interest_payment,
            ending_balance=balance,
            cumulative_principal=cumulative_principal,
            cumulative_interest=cumulative_interest,
        ))
    
    # Payoff date
    payoff_date = datetime.now()
    payoff_date = payoff_date.replace(year=payoff_date.year + term_years)
    
    summary = AmortizationSummary(
        monthly_payment=monthly_payment,
        total_payments=monthly_payment * total_months,
        total_principal=principal,
        total_interest=cumulative_interest,
        principal_percent=(principal / (monthly_payment * total_months)) * 100,
        interest_percent=(cumulative_interest / (monthly_payment * total_months)) * 100,
        payoff_date=payoff_date.strftime("%Y-%m-%d"),
    )
    
    return schedule, summary


def get_yearly_amortization(
    schedule: List[AmortizationRow],
    year: int
) -> tuple[float, float, float]:
    """Get interest, principal, and ending balance for a specific year."""
    year_payments = [row for row in schedule if row.year == year]
    
    if not year_payments:
        return 0, 0, 0
    
    interest = sum(row.interest_payment for row in year_payments)
    principal = sum(row.principal_payment for row in year_payments)
    ending_balance = year_payments[-1].ending_balance
    
    return interest, principal, ending_balance


# ============================================
# TAX PROJECTIONS
# ============================================

def calculate_annual_projection(
    year: int,
    gross_rent: float,
    vacancy_rate: float,
    expenses: Dict[str, float],
    mortgage_interest: float,
    mortgage_principal: float,
    depreciation: float,
    marginal_tax_rate: float = 0.24
) -> AnnualTaxProjection:
    """Calculate after-tax cash flow for a single year."""
    # Income
    vacancy_loss = gross_rent * vacancy_rate
    effective_gross_income = gross_rent - vacancy_loss
    other_income = 0
    total_income = effective_gross_income + other_income
    
    # Operating expenses
    total_operating_expenses = sum(expenses.values())
    
    # NOI
    net_operating_income = total_income - total_operating_expenses
    
    # Debt service
    total_debt_service = mortgage_interest + mortgage_principal
    
    # Pre-tax cash flow
    pre_tax_cash_flow = net_operating_income - total_debt_service
    
    # Taxable income (NOI - Interest - Depreciation)
    taxable_income = net_operating_income - mortgage_interest - depreciation
    
    # Tax liability
    estimated_tax_liability = taxable_income * marginal_tax_rate
    tax_benefit = abs(estimated_tax_liability) if taxable_income < 0 else 0
    
    # After-tax cash flow
    after_tax_cash_flow = pre_tax_cash_flow - estimated_tax_liability
    
    return AnnualTaxProjection(
        year=year,
        gross_rental_income=gross_rent,
        effective_gross_income=effective_gross_income,
        other_income=other_income,
        total_income=total_income,
        operating_expenses=total_operating_expenses,
        property_taxes=expenses.get("property_taxes", 0),
        insurance=expenses.get("insurance", 0),
        management=expenses.get("management", 0),
        maintenance=expenses.get("maintenance", 0),
        utilities=expenses.get("utilities", 0),
        hoa_fees=expenses.get("hoa_fees", 0),
        other_expenses=expenses.get("other", 0),
        mortgage_interest=mortgage_interest,
        mortgage_principal=mortgage_principal,
        total_debt_service=total_debt_service,
        depreciation=depreciation,
        net_operating_income=net_operating_income,
        taxable_income=taxable_income,
        marginal_tax_rate=marginal_tax_rate,
        estimated_tax_liability=estimated_tax_liability,
        tax_benefit=tax_benefit,
        pre_tax_cash_flow=pre_tax_cash_flow,
        after_tax_cash_flow=after_tax_cash_flow,
    )


def generate_multi_year_projections(
    base_year_expenses: Dict[str, float],
    annual_gross_rent: float,
    vacancy_rate: float,
    amortization_schedule: List[AmortizationRow],
    annual_depreciation: float,
    hold_period_years: int,
    rent_growth_rate: float,
    expense_growth_rate: float,
    appreciation_rate: float,
    purchase_price: float,
    marginal_tax_rate: float = 0.24
) -> Projections:
    """Generate multi-year projections with growth rates."""
    annual_projections = []
    cumulative_cash_flow = []
    property_values = []
    equity_positions = []
    loan_balances = []
    
    cumulative_cf = 0
    
    for year in range(1, hold_period_years + 1):
        # Apply growth rates
        rent_growth_factor = (1 + rent_growth_rate / 100) ** (year - 1)
        expense_growth_factor = (1 + expense_growth_rate / 100) ** (year - 1)
        
        gross_rent = annual_gross_rent * rent_growth_factor
        
        # Apply expense growth (management/maintenance tied to rent)
        expenses = {
            "property_taxes": base_year_expenses.get("property_taxes", 0) * expense_growth_factor,
            "insurance": base_year_expenses.get("insurance", 0) * expense_growth_factor,
            "management": base_year_expenses.get("management", 0) * rent_growth_factor,
            "maintenance": base_year_expenses.get("maintenance", 0) * rent_growth_factor,
            "utilities": base_year_expenses.get("utilities", 0) * expense_growth_factor,
            "hoa_fees": base_year_expenses.get("hoa_fees", 0) * expense_growth_factor,
            "other": base_year_expenses.get("other", 0) * expense_growth_factor,
        }
        
        # Get mortgage breakdown
        interest, principal, ending_balance = get_yearly_amortization(amortization_schedule, year)
        
        # Calculate projection
        projection = calculate_annual_projection(
            year=year,
            gross_rent=gross_rent,
            vacancy_rate=vacancy_rate / 100,
            expenses=expenses,
            mortgage_interest=interest,
            mortgage_principal=principal,
            depreciation=annual_depreciation,
            marginal_tax_rate=marginal_tax_rate,
        )
        annual_projections.append(projection)
        
        # Cumulative cash flow
        cumulative_cf += projection.after_tax_cash_flow
        cumulative_cash_flow.append(cumulative_cf)
        
        # Property value
        property_value = purchase_price * ((1 + appreciation_rate / 100) ** year)
        property_values.append(property_value)
        
        # Loan balance
        loan_balances.append(ending_balance)
        
        # Equity position
        equity = property_value - ending_balance
        equity_positions.append(equity)
    
    return Projections(
        hold_period_years=hold_period_years,
        appreciation_rate=appreciation_rate,
        rent_growth_rate=rent_growth_rate,
        expense_growth_rate=expense_growth_rate,
        annual_projections=annual_projections,
        cumulative_cash_flow=cumulative_cash_flow,
        property_values=property_values,
        equity_positions=equity_positions,
        loan_balances=loan_balances,
    )


# ============================================
# EXIT ANALYSIS
# ============================================

def calculate_exit_analysis(
    purchase_price: float,
    hold_period_years: int,
    appreciation_rate: float,
    accumulated_depreciation: float,
    remaining_loan_balance: float,
    rehab_costs: float = 0,
    broker_commission_percent: float = 0.06,
    closing_costs_percent: float = 0.015,
    capital_gains_tax_rate: float = 0.15
) -> ExitAnalysis:
    """Calculate exit/disposition analysis with capital gains."""
    # Projected sale price
    projected_sale_price = purchase_price * ((1 + appreciation_rate / 100) ** hold_period_years)
    
    # Sale costs
    broker_commission = projected_sale_price * broker_commission_percent
    closing_costs = projected_sale_price * closing_costs_percent
    total_sale_costs = broker_commission + closing_costs
    
    # Net proceeds before tax
    net_sale_proceeds = projected_sale_price - total_sale_costs - remaining_loan_balance
    
    # Cost basis
    original_cost_basis = purchase_price + rehab_costs
    adjusted_cost_basis = original_cost_basis - accumulated_depreciation
    
    # Total gain
    total_gain = projected_sale_price - total_sale_costs - adjusted_cost_basis
    
    # Depreciation recapture (taxed at 25%)
    depreciation_recapture = min(accumulated_depreciation, max(0, total_gain))
    depreciation_recapture_tax = depreciation_recapture * 0.25
    
    # Capital gain
    capital_gain = max(0, total_gain - depreciation_recapture)
    capital_gains_tax = capital_gain * capital_gains_tax_rate
    
    # Total tax
    total_tax_on_sale = depreciation_recapture_tax + capital_gains_tax
    after_tax_proceeds = net_sale_proceeds - total_tax_on_sale
    
    return ExitAnalysis(
        hold_period_years=hold_period_years,
        initial_value=purchase_price,
        appreciation_rate=appreciation_rate,
        projected_sale_price=projected_sale_price,
        broker_commission_percent=broker_commission_percent,
        broker_commission=broker_commission,
        closing_costs_percent=closing_costs_percent,
        closing_costs=closing_costs,
        total_sale_costs=total_sale_costs,
        remaining_loan_balance=remaining_loan_balance,
        prepayment_penalty=0,
        gross_sale_proceeds=projected_sale_price,
        net_sale_proceeds=net_sale_proceeds,
        adjusted_cost_basis=adjusted_cost_basis,
        accumulated_depreciation=accumulated_depreciation,
        total_gain=total_gain,
        depreciation_recapture=depreciation_recapture,
        depreciation_recapture_tax=depreciation_recapture_tax,
        capital_gain=capital_gain,
        capital_gains_tax_rate=capital_gains_tax_rate,
        capital_gains_tax=capital_gains_tax,
        total_tax_on_sale=total_tax_on_sale,
        after_tax_proceeds=after_tax_proceeds,
    )


# ============================================
# INVESTMENT RETURNS
# ============================================

def calculate_irr(cash_flows: List[float], guess: float = 0.1) -> float:
    """Calculate IRR using Newton-Raphson method."""
    max_iterations = 100
    tolerance = 0.0001
    rate = guess
    
    for _ in range(max_iterations):
        npv = 0
        derivative_npv = 0
        
        for j, cf in enumerate(cash_flows):
            discount_factor = (1 + rate) ** j
            npv += cf / discount_factor
            if j > 0:
                derivative_npv -= (j * cf) / ((1 + rate) ** (j + 1))
        
        if abs(derivative_npv) < 0.0001:
            break
        
        new_rate = rate - npv / derivative_npv
        
        if abs(new_rate - rate) < tolerance:
            return new_rate * 100
        
        # Prevent divergence
        rate = max(-0.99, min(10, new_rate))
    
    return rate * 100


def calculate_investment_returns(
    initial_investment: float,
    annual_cash_flows: List[float],
    exit_proceeds: float
) -> InvestmentReturns:
    """Calculate complete investment returns."""
    # Build cash flow array
    all_cash_flows = [-initial_investment] + annual_cash_flows
    all_cash_flows[-1] += exit_proceeds
    
    irr = calculate_irr(all_cash_flows)
    
    total_cash_flows = sum(annual_cash_flows)
    total_distributions = total_cash_flows + exit_proceeds
    equity_multiple = total_distributions / initial_investment if initial_investment > 0 else 0
    
    # Payback period
    cumulative = 0
    payback_period_months = None
    for i, cf in enumerate(annual_cash_flows):
        cumulative += cf
        if cumulative >= initial_investment and payback_period_months is None:
            prior_cumulative = cumulative - cf
            remaining = initial_investment - prior_cumulative
            months_in_year = (remaining / cf) * 12 if cf > 0 else 12
            payback_period_months = (i * 12) + int(months_in_year)
    
    if payback_period_months is None and cumulative + exit_proceeds >= initial_investment:
        payback_period_months = len(annual_cash_flows) * 12
    
    average_annual_return = (total_cash_flows / len(annual_cash_flows)) / initial_investment * 100 if annual_cash_flows and initial_investment > 0 else 0
    # CAGR: guard against negative equity_multiple which produces complex numbers
    # when raised to a fractional power (e.g. (-2) ** 0.1 → complex in Python)
    if annual_cash_flows and equity_multiple > 0:
        cagr = ((equity_multiple ** (1 / len(annual_cash_flows))) - 1) * 100
    elif annual_cash_flows and equity_multiple < 0:
        # Negative equity multiple means total loss exceeds investment — express as negative CAGR
        cagr = -((abs(equity_multiple) ** (1 / len(annual_cash_flows))) - 1) * 100
    else:
        cagr = 0
    
    return InvestmentReturns(
        irr=irr,
        mirr=None,
        total_cash_flows=total_cash_flows,
        total_distributions=total_distributions,
        equity_multiple=equity_multiple,
        payback_period_months=payback_period_months,
        average_annual_return=average_annual_return,
        cagr=cagr,
    )


# ============================================
# SENSITIVITY ANALYSIS
# ============================================

def calculate_sensitivity_for_purchase_price(
    base_params: Dict[str, Any],
    new_purchase_price: float,
    hold_period_years: int,
    marginal_tax_rate: float,
    capital_gains_tax_rate: float,
    assumptions: Optional[AllAssumptions] = None,
) -> Dict[str, float]:
    """Recalculate returns for a different purchase price."""
    a = assumptions or AllAssumptions()
    purchase_price = new_purchase_price
    monthly_rent = base_params["monthly_rent"]
    property_taxes = base_params["property_taxes"]
    hoa_fees = base_params["hoa_fees"]
    
    # Recalculate with new purchase price
    down_payment_pct = a.financing.down_payment_pct
    interest_rate = a.financing.interest_rate
    loan_term_years = a.financing.loan_term_years
    closing_costs_pct = a.financing.closing_costs_pct
    
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    loan_amount = purchase_price - down_payment
    monthly_mortgage = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years)
    total_cash_required = down_payment + closing_costs
    
    annual_gross_rent = monthly_rent * 12
    vacancy_rate = a.operating.vacancy_rate
    insurance = purchase_price * a.operating.insurance_pct
    
    # Operating expenses
    management = annual_gross_rent * a.operating.property_management_pct
    maintenance = annual_gross_rent * a.operating.maintenance_pct
    utilities = a.operating.utilities_monthly * 12
    landscaping = a.operating.landscaping_annual
    pest_control = a.operating.pest_control_annual
    cap_ex = annual_gross_rent * 0.05
    
    total_op_ex = (property_taxes + insurance + hoa_fees + 
                   management + maintenance + utilities + 
                   landscaping + pest_control + cap_ex)
    
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)
    noi = effective_gross_income - total_op_ex
    annual_debt_service = monthly_mortgage * 12
    annual_cash_flow = noi - annual_debt_service
    
    cash_on_cash = (annual_cash_flow / total_cash_required * 100) if total_cash_required > 0 else 0
    
    # Simple IRR estimate (using annual cash flow and appreciation)
    appreciation_rate = a.appreciation_rate
    exit_value = purchase_price * ((1 + appreciation_rate) ** hold_period_years)
    exit_costs = exit_value * 0.075  # ~7.5% selling costs
    
    # Rough loan balance (simplified)
    principal_paid_pct = 0.03 * hold_period_years  # ~3% per year approximate
    remaining_balance = loan_amount * (1 - min(principal_paid_pct, 0.3))
    net_exit = exit_value - exit_costs - remaining_balance
    
    total_cash_flows = annual_cash_flow * hold_period_years
    total_return = total_cash_flows + net_exit
    
    # Simple IRR approximation
    all_cash_flows = [-total_cash_required] + [annual_cash_flow] * hold_period_years
    all_cash_flows[-1] += net_exit
    irr = calculate_irr(all_cash_flows)
    
    return {
        "irr": irr,
        "cash_on_cash": cash_on_cash,
        "net_profit": total_return - total_cash_required,
    }


def calculate_sensitivity_for_interest_rate(
    base_params: Dict[str, Any],
    new_interest_rate: float,
    hold_period_years: int,
    assumptions: Optional[AllAssumptions] = None,
) -> Dict[str, float]:
    """Recalculate returns for a different interest rate."""
    a = assumptions or AllAssumptions()
    purchase_price = base_params["purchase_price"]
    monthly_rent = base_params["monthly_rent"]
    property_taxes = base_params["property_taxes"]
    total_cash_required = base_params["total_cash_required"]
    
    down_payment_pct = a.financing.down_payment_pct
    loan_term_years = a.financing.loan_term_years
    
    loan_amount = purchase_price * (1 - down_payment_pct)
    monthly_mortgage = calculate_monthly_mortgage(loan_amount, new_interest_rate, loan_term_years)
    
    annual_gross_rent = monthly_rent * 12
    vacancy_rate = a.operating.vacancy_rate
    insurance = purchase_price * a.operating.insurance_pct
    
    management = annual_gross_rent * a.operating.property_management_pct
    maintenance = annual_gross_rent * a.operating.maintenance_pct
    utilities = a.operating.utilities_monthly * 12
    total_op_ex = (property_taxes + insurance + management + maintenance + utilities + 
                   annual_gross_rent * 0.05)
    
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)
    noi = effective_gross_income - total_op_ex
    annual_debt_service = monthly_mortgage * 12
    annual_cash_flow = noi - annual_debt_service
    
    cash_on_cash = (annual_cash_flow / total_cash_required * 100) if total_cash_required > 0 else 0
    
    appreciation_rate = a.appreciation_rate
    exit_value = purchase_price * ((1 + appreciation_rate) ** hold_period_years)
    remaining_balance = loan_amount * 0.7  # Rough estimate
    net_exit = exit_value * 0.925 - remaining_balance
    
    all_cash_flows = [-total_cash_required] + [annual_cash_flow] * hold_period_years
    all_cash_flows[-1] += net_exit
    irr = calculate_irr(all_cash_flows)
    
    return {
        "irr": irr,
        "cash_on_cash": cash_on_cash,
        "net_profit": sum(all_cash_flows),
    }


def calculate_sensitivity_for_rent(
    base_params: Dict[str, Any],
    new_monthly_rent: float,
    hold_period_years: int,
    assumptions: Optional[AllAssumptions] = None,
) -> Dict[str, float]:
    """Recalculate returns for different rent."""
    a = assumptions or AllAssumptions()
    purchase_price = base_params["purchase_price"]
    property_taxes = base_params["property_taxes"]
    total_cash_required = base_params["total_cash_required"]
    monthly_mortgage = base_params["monthly_mortgage"]
    
    annual_gross_rent = new_monthly_rent * 12
    vacancy_rate = a.operating.vacancy_rate
    insurance = purchase_price * a.operating.insurance_pct
    
    management = annual_gross_rent * a.operating.property_management_pct
    maintenance = annual_gross_rent * a.operating.maintenance_pct
    utilities = a.operating.utilities_monthly * 12
    total_op_ex = (property_taxes + insurance + management + maintenance + utilities + 
                   annual_gross_rent * 0.05)
    
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)
    noi = effective_gross_income - total_op_ex
    annual_debt_service = monthly_mortgage * 12
    annual_cash_flow = noi - annual_debt_service
    
    cash_on_cash = (annual_cash_flow / total_cash_required * 100) if total_cash_required > 0 else 0
    
    appreciation_rate = a.appreciation_rate
    exit_value = purchase_price * ((1 + appreciation_rate) ** hold_period_years)
    loan_amount = purchase_price * (1 - a.financing.down_payment_pct)
    remaining_balance = loan_amount * 0.7
    net_exit = exit_value * 0.925 - remaining_balance
    
    all_cash_flows = [-total_cash_required] + [annual_cash_flow] * hold_period_years
    all_cash_flows[-1] += net_exit
    irr = calculate_irr(all_cash_flows)
    
    return {
        "irr": irr,
        "cash_on_cash": cash_on_cash,
        "net_profit": sum(all_cash_flows),
    }


def generate_full_sensitivity_analysis(
    base_params: Dict[str, Any],
    hold_period_years: int,
    marginal_tax_rate: float,
    capital_gains_tax_rate: float,
    assumptions: Optional[AllAssumptions] = None,
) -> SensitivityAnalysis:
    """Generate complete sensitivity analysis for all key variables."""
    a = assumptions or AllAssumptions()
    percent_changes = [-10, -5, 0, 5, 10]
    
    # Purchase Price Sensitivity
    purchase_price_scenarios = []
    for pct in percent_changes:
        new_price = base_params["purchase_price"] * (1 + pct / 100)
        results = calculate_sensitivity_for_purchase_price(
            base_params, new_price, hold_period_years, 
            marginal_tax_rate, capital_gains_tax_rate,
            assumptions=a
        )
        purchase_price_scenarios.append(SensitivityScenario(
            variable="purchase_price",
            change_percent=pct,
            absolute_value=new_price,
            irr=results["irr"],
            cash_on_cash=results["cash_on_cash"],
            net_profit=results["net_profit"],
        ))
    
    # Interest Rate Sensitivity
    interest_rate_scenarios = []
    base_rate = a.financing.interest_rate * 100  # Convert to percentage
    rate_changes = [-1.5, -0.75, 0, 0.75, 1.5]  # Absolute rate changes
    for delta in rate_changes:
        new_rate = (base_rate + delta) / 100  # Convert back to decimal
        results = calculate_sensitivity_for_interest_rate(
            base_params, new_rate, hold_period_years,
            assumptions=a
        )
        interest_rate_scenarios.append(SensitivityScenario(
            variable="interest_rate",
            change_percent=delta,  # Using absolute change for rates
            absolute_value=new_rate * 100,  # Display as percentage
            irr=results["irr"],
            cash_on_cash=results["cash_on_cash"],
            net_profit=results["net_profit"],
        ))
    
    # Rent Sensitivity
    rent_scenarios = []
    for pct in percent_changes:
        new_rent = base_params["monthly_rent"] * (1 + pct / 100)
        results = calculate_sensitivity_for_rent(
            base_params, new_rent, hold_period_years,
            assumptions=a
        )
        rent_scenarios.append(SensitivityScenario(
            variable="rent",
            change_percent=pct,
            absolute_value=new_rent,
            irr=results["irr"],
            cash_on_cash=results["cash_on_cash"],
            net_profit=results["net_profit"],
        ))
    
    # Vacancy Sensitivity
    vacancy_scenarios = []
    base_vacancy = a.operating.vacancy_rate * 100
    vacancy_changes = [0, 2.5, 5, 7.5, 10]  # Absolute vacancy rates
    for vac in vacancy_changes:
        # Recalculate with different vacancy
        purchase_price = base_params["purchase_price"]
        monthly_rent = base_params["monthly_rent"]
        annual_gross_rent = monthly_rent * 12
        effective_income = annual_gross_rent * (1 - vac / 100)
        
        insurance = purchase_price * a.operating.insurance_pct
        management = annual_gross_rent * a.operating.property_management_pct
        maintenance = annual_gross_rent * a.operating.maintenance_pct
        utilities = a.operating.utilities_monthly * 12
        total_op_ex = (base_params["property_taxes"] + insurance + management + 
                       maintenance + utilities + annual_gross_rent * 0.05)
        
        noi = effective_income - total_op_ex
        annual_cash_flow = noi - base_params["monthly_mortgage"] * 12
        cash_on_cash = (annual_cash_flow / base_params["total_cash_required"] * 100) if base_params["total_cash_required"] > 0 else 0
        
        vacancy_scenarios.append(SensitivityScenario(
            variable="vacancy",
            change_percent=vac,  # Absolute vacancy rate
            absolute_value=vac,
            irr=0,  # Simplified - would need full recalc
            cash_on_cash=cash_on_cash,
            net_profit=annual_cash_flow * hold_period_years,
        ))
    
    # Appreciation Sensitivity
    appreciation_scenarios = []
    appreciation_changes = [0, 2, 3, 5, 7]  # Annual appreciation rates
    for app_rate in appreciation_changes:
        exit_value = base_params["purchase_price"] * ((1 + app_rate / 100) ** hold_period_years)
        exit_costs = exit_value * 0.075
        loan_amount = base_params["purchase_price"] * (1 - a.financing.down_payment_pct)
        remaining_balance = loan_amount * 0.7
        net_exit = exit_value - exit_costs - remaining_balance
        
        annual_cash_flow = base_params.get("annual_cash_flow", 0)
        total_cash_required = base_params["total_cash_required"]
        
        all_cash_flows = [-total_cash_required] + [annual_cash_flow] * hold_period_years
        all_cash_flows[-1] += net_exit
        irr = calculate_irr(all_cash_flows)
        
        appreciation_scenarios.append(SensitivityScenario(
            variable="appreciation",
            change_percent=app_rate,  # Annual rate
            absolute_value=app_rate,
            irr=irr,
            cash_on_cash=base_params.get("cash_on_cash", 0),
            net_profit=sum(all_cash_flows),
        ))
    
    return SensitivityAnalysis(
        purchase_price=purchase_price_scenarios,
        interest_rate=interest_rate_scenarios,
        rent=rent_scenarios,
        vacancy=vacancy_scenarios,
        appreciation=appreciation_scenarios,
    )


# ============================================
# MAIN PROFORMA GENERATOR
# ============================================

async def generate_proforma_data(
    property_data: PropertyResponse,
    strategy: str = "ltr",
    land_value_percent: float = 0.20,
    marginal_tax_rate: float = 0.24,
    capital_gains_tax_rate: float = 0.15,
    hold_period_years: int = 10,
    purchase_price_override: Optional[float] = None,
    monthly_rent_override: Optional[float] = None,
    interest_rate_override: Optional[float] = None,
    down_payment_pct_override: Optional[float] = None,
    property_taxes_override: Optional[float] = None,
    insurance_override: Optional[float] = None,
    assumptions: Optional[AllAssumptions] = None,
) -> FinancialProforma:
    """Generate complete financial proforma from property data."""
    a = assumptions or AllAssumptions()
    _FIN = a.financing
    _OPS = a.operating
    _GRO_appreciation = a.appreciation_rate
    _GRO_rent_growth = a.rent_growth_rate
    _GRO_expense_growth = a.expense_growth_rate

    valuations = property_data.valuations
    rentals = property_data.rentals
    market = property_data.market
    listing = property_data.listing

    purchase_price = purchase_price_override or (valuations.current_value_avm if valuations else None) or 0
    list_price = (listing.list_price if listing and listing.list_price else None) or purchase_price
    monthly_rent = monthly_rent_override or (rentals.monthly_rent_ltr if rentals else None) or 0
    annual_gross_rent = monthly_rent * 12
    property_taxes = property_taxes_override or (market.property_taxes_annual if market else None) or (purchase_price * 0.01)
    hoa_fees = ((market.hoa_fees_monthly if market else None) or 0) * 12

    down_payment_pct = down_payment_pct_override or _FIN.down_payment_pct
    if down_payment_pct > 1:
        down_payment_pct = down_payment_pct / 100
    interest_rate = interest_rate_override or _FIN.interest_rate
    if interest_rate > 1:
        interest_rate = interest_rate / 100
    loan_term_years = _FIN.loan_term_years
    closing_costs_pct = _FIN.closing_costs_pct
    
    # Calculate financing
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    loan_amount = purchase_price - down_payment
    monthly_mortgage = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years)
    total_cash_required = down_payment + closing_costs
    
    # Operating assumptions
    vacancy_rate = _OPS.vacancy_rate * 100  # Convert to percent
    management_pct = _OPS.property_management_pct
    maintenance_pct = _OPS.maintenance_pct
    insurance = insurance_override or (purchase_price * _OPS.insurance_pct)
    utilities = _OPS.utilities_monthly * 12
    landscaping = _OPS.landscaping_annual
    pest_control = _OPS.pest_control_annual
    
    # Calculate expenses
    management = annual_gross_rent * management_pct
    maintenance = annual_gross_rent * maintenance_pct
    cap_ex_reserve = annual_gross_rent * 0.05  # 5% CapEx reserve
    total_operating_expenses = (
        property_taxes + insurance + hoa_fees + 
        management + maintenance + utilities + 
        landscaping + pest_control + cap_ex_reserve
    )
    
    # Key metrics
    vacancy_allowance = annual_gross_rent * (vacancy_rate / 100)
    effective_gross_income = annual_gross_rent - vacancy_allowance
    noi = effective_gross_income - total_operating_expenses
    annual_debt_service = monthly_mortgage * 12
    annual_cash_flow = noi - annual_debt_service
    monthly_cash_flow = annual_cash_flow / 12
    
    cap_rate = (noi / purchase_price * 100) if purchase_price > 0 else 0
    cash_on_cash = (annual_cash_flow / total_cash_required * 100) if total_cash_required > 0 else 0
    dscr = noi / annual_debt_service if annual_debt_service > 0 else 0
    grm = purchase_price / annual_gross_rent if annual_gross_rent > 0 else 0
    one_percent_rule = (monthly_rent / purchase_price * 100) if purchase_price > 0 else 0
    break_even_occupancy = ((total_operating_expenses + annual_debt_service) / annual_gross_rent * 100) if annual_gross_rent > 0 else 0
    
    details = property_data.details
    sqft = (details.square_footage if details else None) or 1
    price_per_sqft = purchase_price / sqft
    rent_per_sqft = annual_gross_rent / sqft
    
    # Depreciation
    depreciation = calculate_depreciation(
        purchase_price=purchase_price,
        land_value_percent=land_value_percent,
        closing_costs=closing_costs,
        rehab_costs=0,
        is_residential=True,
    )
    
    # Amortization
    amortization_schedule, amortization_summary = calculate_amortization_schedule(
        loan_amount, interest_rate, loan_term_years
    )
    
    # Base year expenses for projections
    base_year_expenses = {
        "property_taxes": property_taxes,
        "insurance": insurance,
        "management": management,
        "maintenance": maintenance,
        "utilities": utilities,
        "hoa_fees": hoa_fees,
        "other": landscaping + pest_control + cap_ex_reserve,
    }
    
    # Multi-year projections
    projections = generate_multi_year_projections(
        base_year_expenses=base_year_expenses,
        annual_gross_rent=annual_gross_rent,
        vacancy_rate=vacancy_rate,
        amortization_schedule=amortization_schedule,
        annual_depreciation=depreciation.annual_depreciation,
        hold_period_years=hold_period_years,
        rent_growth_rate=_GRO_rent_growth * 100,
        expense_growth_rate=_GRO_expense_growth * 100,
        appreciation_rate=_GRO_appreciation * 100,
        purchase_price=purchase_price,
        marginal_tax_rate=marginal_tax_rate,
    )
    
    # Accumulated depreciation at exit
    accumulated_depreciation = depreciation.annual_depreciation * hold_period_years
    remaining_loan_balance = projections.loan_balances[-1] if projections.loan_balances else 0
    
    # Exit analysis
    exit_analysis = calculate_exit_analysis(
        purchase_price=purchase_price,
        hold_period_years=hold_period_years,
        appreciation_rate=_GRO_appreciation * 100,
        accumulated_depreciation=accumulated_depreciation,
        remaining_loan_balance=remaining_loan_balance,
        rehab_costs=0,
        broker_commission_percent=0.06,
        closing_costs_percent=0.015,
        capital_gains_tax_rate=capital_gains_tax_rate,
    )
    
    # Investment returns
    annual_cash_flows = [p.after_tax_cash_flow for p in projections.annual_projections]
    returns = calculate_investment_returns(
        initial_investment=total_cash_required,
        annual_cash_flows=annual_cash_flows,
        exit_proceeds=exit_analysis.after_tax_proceeds,
    )
    
    # Build base params for sensitivity analysis
    base_params = {
        "purchase_price": purchase_price,
        "monthly_rent": monthly_rent,
        "property_taxes": property_taxes,
        "hoa_fees": hoa_fees,
        "total_cash_required": total_cash_required,
        "monthly_mortgage": monthly_mortgage,
        "annual_cash_flow": annual_cash_flow,
        "cash_on_cash": cash_on_cash,
    }
    
    # Full sensitivity analysis with recalculated returns
    sensitivity = generate_full_sensitivity_analysis(
        base_params=base_params,
        hold_period_years=hold_period_years,
        marginal_tax_rate=marginal_tax_rate,
        capital_gains_tax_rate=capital_gains_tax_rate,
        assumptions=a,
    )
    
    # Build proforma - extract with None checks
    address = property_data.address
    
    return FinancialProforma(
        generated_at=datetime.now().isoformat(),
        property_id=property_data.property_id or "",
        property_address=(address.full_address if address else None) or "Unknown Address",
        strategy_type=strategy,
        
        property=PropertySummary(
            address=(address.street if address else None) or "Unknown",
            city=(address.city if address else None) or "Unknown",
            state=(address.state if address else None) or "Unknown",
            zip=(address.zip_code if address else None) or "Unknown",
            property_type=(details.property_type if details else None) or "Single Family",
            bedrooms=(details.bedrooms if details else None) or 0,
            bathrooms=(details.bathrooms if details else None) or 0,
            square_feet=(details.square_footage if details else None) or 0,
            year_built=(details.year_built if details else None) or 0,
            lot_size=(details.lot_size if details else None) or 0,
        ),
        
        acquisition=AcquisitionDetails(
            purchase_price=purchase_price,
            list_price=list_price,
            discount_from_list=((list_price - purchase_price) / list_price * 100) if list_price > 0 else 0,
            closing_costs=closing_costs,
            closing_costs_percent=closing_costs_pct * 100,
            inspection_costs=0,
            rehab_costs=0,
            total_acquisition_cost=purchase_price + closing_costs,
        ),
        
        financing=FinancingDetails(
            down_payment=down_payment,
            down_payment_percent=down_payment_pct * 100,
            loan_amount=loan_amount,
            interest_rate=interest_rate * 100,
            loan_term_years=loan_term_years,
            loan_type="Conventional",
            monthly_payment=monthly_mortgage,
            monthly_payment_with_escrow=monthly_mortgage + (property_taxes + insurance) / 12,
            total_interest_over_life=amortization_summary.total_interest,
            apr=interest_rate * 100,
        ),
        
        income=IncomeDetails(
            monthly_rent=monthly_rent,
            annual_gross_rent=annual_gross_rent,
            other_income=0,
            vacancy_allowance=vacancy_allowance,
            vacancy_percent=vacancy_rate,
            effective_gross_income=effective_gross_income,
        ),
        
        expenses=ExpenseDetails(
            property_taxes=property_taxes,
            insurance=insurance,
            hoa_fees=hoa_fees,
            management=management,
            management_percent=management_pct * 100,
            maintenance=maintenance,
            maintenance_percent=maintenance_pct * 100,
            utilities=utilities,
            landscaping=landscaping,
            pest_control=pest_control,
            cap_ex_reserve=cap_ex_reserve,
            cap_ex_reserve_percent=5.0,
            other_expenses=0,
            total_operating_expenses=total_operating_expenses,
            expense_ratio=(total_operating_expenses / effective_gross_income * 100) if effective_gross_income > 0 else 0,
        ),
        
        metrics=KeyMetrics(
            net_operating_income=noi,
            annual_debt_service=annual_debt_service,
            annual_cash_flow=annual_cash_flow,
            monthly_cash_flow=monthly_cash_flow,
            cap_rate=cap_rate,
            cash_on_cash_return=cash_on_cash,
            dscr=dscr,
            gross_rent_multiplier=grm,
            one_percent_rule=one_percent_rule,
            break_even_occupancy=break_even_occupancy,
            price_per_unit=purchase_price,
            price_per_sqft=price_per_sqft,
            rent_per_sqft=rent_per_sqft,
        ),
        
        depreciation=depreciation,
        projections=projections,
        amortization_schedule=amortization_schedule,
        amortization_summary=amortization_summary,
        exit=exit_analysis,
        returns=returns,
        sensitivity=sensitivity,
        
        deal_score=DealScoreSummary(
            score=0,  # Would be populated from deal score calculation
            grade="",
            verdict="",
            income_value=0,
            discount_required=0,
        ),
        
        sources=DataSources(
            rent_estimate_source="RentCast/Zillow",
            property_value_source="AVM",
            tax_data_source="County Records",
            market_data_source="RentCast",
            data_freshness=datetime.now().strftime("%Y-%m-%d"),
        ),
        
        # Strategy-specific detailed breakdown from full calculator
        strategy_breakdown=_run_strategy_calculator(
            strategy=strategy,
            purchase_price=purchase_price,
            monthly_rent=monthly_rent,
            property_taxes=property_taxes,
            insurance=insurance,
            arv=purchase_price,  # Default ARV to purchase price
            bedrooms=(details.bedrooms if details else None) or 3,
        ),
        
        # Strategy methodology description for reports
        strategy_methodology=STRATEGY_METHODOLOGY.get(strategy, ""),
    )
