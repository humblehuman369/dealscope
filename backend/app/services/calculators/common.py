"""
Shared utilities for investment calculators.

Validation, mortgage math, and common financial formulas used
across all strategy calculators.
"""


class CalculationInputError(ValueError):
    """Raised when calculator inputs are outside acceptable bounds."""

    pass


def validate_financial_inputs(
    purchase_price: float | None = None,
    monthly_rent: float | None = None,
    interest_rate: float | None = None,
    down_payment_pct: float | None = None,
    loan_term_years: int | None = None,
    arv: float | None = None,
    rehab_cost: float | None = None,
    holding_period_months: int | None = None,
    assignment_fee: float | None = None,
) -> None:
    """Validate financial inputs are within reasonable bounds."""
    errors = []

    if purchase_price is not None:
        if purchase_price <= 0:
            errors.append("Purchase price must be greater than $0")
        elif purchase_price > 100_000_000:
            errors.append("Purchase price exceeds maximum of $100,000,000")

    if monthly_rent is not None:
        if monthly_rent < 0:
            errors.append("Monthly rent cannot be negative")
        elif monthly_rent > 1_000_000:
            errors.append("Monthly rent exceeds maximum of $1,000,000")

    if interest_rate is not None:
        if interest_rate < 0:
            errors.append("Interest rate cannot be negative")
        elif interest_rate > 0.30:
            errors.append("Interest rate exceeds maximum of 30%")

    if down_payment_pct is not None:
        # Negative down payment is allowed: it represents an over-funded deal where the
        # bank loan + seller note exceed the purchase price (cash back at close).
        if down_payment_pct < -1.0:
            errors.append("Down payment percentage cannot be below -100%")
        elif down_payment_pct > 1.0:
            errors.append("Down payment percentage cannot exceed 100%")

    if loan_term_years is not None:
        if loan_term_years < 1:
            errors.append("Loan term must be at least 1 year")
        elif loan_term_years > 50:
            errors.append("Loan term exceeds maximum of 50 years")

    if arv is not None:
        if arv <= 0:
            errors.append("After Repair Value (ARV) must be greater than $0")
        elif arv > 100_000_000:
            errors.append("ARV exceeds maximum of $100,000,000")

    if rehab_cost is not None:
        if rehab_cost < 0:
            errors.append("Rehab cost cannot be negative")
        elif rehab_cost > 10_000_000:
            errors.append("Rehab cost exceeds maximum of $10,000,000")

    if holding_period_months is not None:
        if holding_period_months < 1:
            errors.append("Holding period must be at least 1 month")
        elif holding_period_months > 120:
            errors.append("Holding period exceeds maximum of 120 months (10 years)")

    if assignment_fee is not None:
        if assignment_fee < 0:
            errors.append("Assignment fee cannot be negative")
        elif assignment_fee > 1_000_000:
            errors.append("Assignment fee exceeds maximum of $1,000,000")

    if errors:
        raise CalculationInputError("; ".join(errors))


def calculate_monthly_mortgage(principal: float, annual_rate: float, years: int) -> float:
    """Calculate monthly mortgage payment (P&I)."""
    if principal <= 0 or years < 1:
        return 0.0
    if annual_rate == 0:
        return principal / (years * 12)

    monthly_rate = annual_rate / 12
    num_payments = years * 12

    payment = principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / ((1 + monthly_rate) ** num_payments - 1)

    return payment


def seller_monthly_payment(
    principal: float,
    annual_rate: float,
    term_years: int,
    interest_only: bool = False,
) -> float:
    """Monthly seller-carry P&I.

    By default the note amortizes principal over the term — including 0% notes, where
    the payment is simply principal ÷ term (no interest). Pass ``interest_only=True`` for
    deferred/balloon-only creative-finance notes (e.g. Morby Method, Seller 2nd 0%
    balloon): a 0% deferred note has no monthly payment ($0/mo until the balloon).
    """
    if principal <= 0:
        return 0.0
    if interest_only:
        # Deferred note: nothing amortizes monthly. A 0% deferred note pays $0/mo; a
        # nonzero-rate deferred note pays interest only.
        return 0.0 if annual_rate <= 0 else principal * annual_rate / 12
    return calculate_monthly_mortgage(principal, annual_rate, max(1, int(term_years or 30)))


def conventional_first_lien_loan(purchase_price: float, down_payment_dollars: float) -> float:
    """Bank loan = purchase price minus buyer down payment."""
    pp = float(purchase_price)
    dp = max(0.0, float(down_payment_dollars))
    return max(0.0, pp - dp)


def bank_loan_after_seller_carry(
    purchase_price: float,
    down_payment_dollars: float,
    seller_carry_amount: float,
) -> float:
    """Bank loan = remaining financed price after buyer down payment and seller note."""
    conventional_loan = conventional_first_lien_loan(purchase_price, down_payment_dollars)
    sc = max(0.0, float(seller_carry_amount or 0.0))
    return max(0.0, conventional_loan - sc)


def cash_needed_after_seller(
    down_payment_dollars: float,
    closing_costs: float,
    extra_cash_costs: float,
    seller_carry_amount: float,
) -> float:
    """Cash out of pocket = down + closing + extra (e.g. rehab, furniture) − seller financing."""
    dp = max(0.0, float(down_payment_dollars))
    cc = max(0.0, float(closing_costs))
    ex = max(0.0, float(extra_cash_costs))
    sc = max(0.0, float(seller_carry_amount or 0.0))
    return max(0.0, dp + cc + ex - sc)


def model_a_bank_loan_and_cash_equity(
    purchase_price: float,
    down_payment_dollars: float,
    seller_carry_amount: float,
) -> tuple[float, float]:
    """Used by fix-and-flip nominal-equity stack (hard money + seller on equity slot).

    bank_loan = purchase_price - max(down_payment_dollars, seller_carry_amount)
    cash_equity = max(0, down_payment_dollars - seller_carry_amount)
    """
    dp = max(0.0, float(down_payment_dollars))
    sc = max(0.0, float(seller_carry_amount or 0.0))
    cap = max(dp, sc)
    bank_loan = max(0.0, float(purchase_price) - cap)
    cash_equity = max(0.0, dp - sc)
    return bank_loan, cash_equity


def combined_bank_and_seller_pi(
    bank_loan: float,
    bank_rate: float,
    bank_term_years: int,
    seller_principal: float,
    seller_rate: float,
    seller_term_years: int,
    seller_interest_only: bool = False,
) -> tuple[float, float, float]:
    """Returns (bank_monthly_pi, seller_monthly_pi, combined_monthly_pi).

    ``seller_interest_only=True`` models a deferred/balloon-only seller note (no
    amortization); otherwise the seller note amortizes over its term (0% → principal÷term).
    """
    bank_pi = calculate_monthly_mortgage(bank_loan, bank_rate, bank_term_years)
    if seller_principal <= 0:
        return bank_pi, 0.0, bank_pi
    seller_pi = seller_monthly_payment(
        seller_principal,
        seller_rate,
        max(1, int(seller_term_years or 30)),
        interest_only=seller_interest_only,
    )
    return bank_pi, seller_pi, bank_pi + seller_pi


def calculate_noi(gross_income: float, operating_expenses: float) -> float:
    """Calculate Net Operating Income."""
    return gross_income - operating_expenses


def calculate_cap_rate(noi: float, property_value: float) -> float:
    """Calculate Capitalization Rate."""
    if property_value == 0:
        return 0
    return noi / property_value


def calculate_cash_on_cash(annual_cash_flow: float, total_cash_invested: float) -> float:
    """Calculate Cash-on-Cash Return.

    When no positive cash is invested (zero or negative — e.g. an over-funded deal
    that returns cash at close), cash-on-cash is undefined: report infinite return
    for positive cash flow, otherwise 0.
    """
    if total_cash_invested <= 0:
        return float("inf") if annual_cash_flow > 0 else 0
    return annual_cash_flow / total_cash_invested


def calculate_dscr(noi: float, annual_debt_service: float) -> float:
    """Calculate Debt Service Coverage Ratio."""
    if annual_debt_service == 0:
        return float("inf")
    return noi / annual_debt_service


def calculate_grm(property_price: float, annual_gross_rent: float) -> float:
    """Calculate Gross Rent Multiplier."""
    if annual_gross_rent == 0:
        return float("inf")
    return property_price / annual_gross_rent


def run_sensitivity_analysis(
    base_calculation_func,
    base_params: dict,
    variable_name: str,
    variations: list,
    output_metrics: list,
) -> list:
    """Run sensitivity analysis on a single variable."""
    results = []
    base_value = base_params.get(variable_name, 0)

    for variation in variations:
        modified_params = base_params.copy()
        modified_value = base_value * (1 + variation)
        modified_params[variable_name] = modified_value

        calc_result = base_calculation_func(**modified_params)

        result_row = {
            "variation": variation,
            "variable_value": modified_value,
        }
        for metric in output_metrics:
            result_row[metric] = calc_result.get(metric, None)

        results.append(result_row)

    return results
