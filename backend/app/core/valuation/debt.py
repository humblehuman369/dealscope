"""Debt service and blended mortgage constants for valuation (no service-layer imports)."""


def _monthly_mortgage(principal: float, annual_rate: float, years: int) -> float:
    if principal <= 0 or years < 1:
        return 0.0
    if annual_rate == 0:
        return principal / (years * 12)
    monthly_rate = annual_rate / 12
    num_payments = years * 12
    return principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / (
        (1 + monthly_rate) ** num_payments - 1
    )


def mortgage_constant(annual_rate: float, loan_term_years: int) -> float:
    """Annual payment per $1 of loan principal (P&I)."""
    rate = max(0.0, min(0.30, annual_rate))
    term = max(1, min(int(loan_term_years), 50))
    monthly_rate = rate / 12
    num_payments = term * 12

    if monthly_rate > 0:
        compounded = (1 + monthly_rate) ** num_payments
        if compounded <= 1:
            return 0.0
        return (monthly_rate * compounded) / (compounded - 1) * 12

    return (1 / term) if term > 0 else 0.0


def blended_income_value_denominator(
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    *,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 30,
    reference_purchase_price: float | None = None,
) -> float:
    """Denominator for Income Value = NOI / denominator."""
    down_pct = max(0.0, min(1.0, down_payment_pct))
    ltv_ratio = 1.0 - down_pct
    bank_mc = mortgage_constant(interest_rate, loan_term_years)
    if bank_mc <= 0:
        return 0.0

    sc = max(0.0, float(seller_carry_amount or 0.0))
    ref = reference_purchase_price
    if sc <= 0 or ref is None or ref <= 0:
        return ltv_ratio * bank_mc

    seller_pct = min(ltv_ratio, sc / ref)
    bank_ltv = max(0.0, ltv_ratio - seller_pct)
    seller_mc = mortgage_constant(seller_carry_rate, seller_carry_term_years)
    return bank_ltv * bank_mc + seller_pct * seller_mc


def annual_debt_service_at_price(
    purchase_price: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    *,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 30,
) -> float:
    """Annual P&I at purchase_price (bank loan + seller carry note)."""
    if purchase_price <= 0:
        return 0.0
    down_pct = max(0.0, min(1.0, down_payment_pct))
    down_payment = purchase_price * down_pct
    sc = max(0.0, float(seller_carry_amount or 0.0))
    bank_loan = max(0.0, purchase_price - down_payment)
    bank_pi = _monthly_mortgage(bank_loan, interest_rate, loan_term_years)
    seller_pi = _monthly_mortgage(sc, seller_carry_rate, max(1, int(seller_carry_term_years or 30)))
    return (bank_pi + seller_pi) * 12
