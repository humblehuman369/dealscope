"""StructureContext — frozen snapshot of inputs used by every template solver.

Templates are pure functions of this context; no I/O, no DB.
"""

from dataclasses import dataclass, field

from app.services.calculators import calculate_monthly_mortgage


@dataclass(frozen=True)
class StructureContext:
    """Inputs every deal-structure template can read from.

    All values are post-resolution (after AssumptionResolver has filled defaults).
    """

    list_price: float
    target_buy_price: float
    income_value: float
    deal_gap_pct: float
    monthly_rent: float
    property_taxes_annual: float
    insurance_annual: float

    # Baseline financing assumptions (what the user is modeled against today)
    down_payment_pct: float
    interest_rate: float
    loan_term_years: int
    closing_costs_pct: float

    # Operating assumptions
    vacancy_rate: float
    maintenance_pct: float
    management_pct: float
    capex_pct: float
    utilities_annual: float
    other_annual_expenses: float

    # Listing context (used by the selector for ranking signals)
    is_listed: bool
    days_on_market: int | None
    is_fsbo: bool
    is_foreclosure: bool
    is_bank_owned: bool
    market_temperature: str | None

    # Three Paths — merged over STRUCTURE_TEMPLATE_FLAGS from defaults
    template_flags: dict[str, bool] = field(default_factory=dict)

    # Sub2 heuristic inputs (optional)
    estimated_purchase_year: int | None = None
    estimated_purchase_price: float | None = None

    # Rate-buydown heuristic
    year_built: int | None = None

    # Sub2 real-data / assumable (optional; from public records when present)
    existing_loan_type: str | None = None
    estimated_existing_loan_balance: float | None = None
    estimated_existing_loan_rate: float | None = None

    # FHA house-hack
    unit_count: int | None = None
    is_owner_occupied: bool | None = None
    bedrooms: int = 3

    # Regional selector calibration (T15) — two-letter state when known
    state: str | None = None

    @property
    def deal_gap_amount(self) -> float:
        return self.list_price - self.target_buy_price

    @property
    def baseline_loan_amount(self) -> float:
        return self.list_price * (1 - self.down_payment_pct)

    @property
    def baseline_monthly_pi(self) -> float:
        if self.list_price <= 0:
            return 0.0
        return calculate_monthly_mortgage(
            self.baseline_loan_amount,
            self.interest_rate,
            self.loan_term_years,
        )

    @property
    def baseline_monthly_cash_flow(self) -> float:
        """Estimated monthly cash flow at list price under baseline assumptions.

        Rough proxy: NOI/12 - monthly_pi. Used to size each template's monthly_savings vs baseline.
        """
        annual_gross = self.monthly_rent * 12
        eff = annual_gross * (1 - self.vacancy_rate)
        opex = (
            self.property_taxes_annual
            + self.insurance_annual
            + annual_gross * self.maintenance_pct
            + annual_gross * self.management_pct
            + annual_gross * self.capex_pct
            + self.utilities_annual
            + self.other_annual_expenses
        )
        noi_monthly = (eff - opex) / 12
        return noi_monthly - self.baseline_monthly_pi

    @property
    def baseline_cash_required(self) -> float:
        """Total cash to close at list price under baseline financing."""
        return self.list_price * (self.down_payment_pct + self.closing_costs_pct)
