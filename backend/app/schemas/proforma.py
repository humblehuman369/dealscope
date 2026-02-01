"""
Financial Proforma Schemas - Accounting-Standard Export
Pydantic models for proforma generation and export
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class DepreciationMethod(str, Enum):
    """Depreciation calculation methods."""
    STRAIGHT_LINE = "straight-line"
    MACRS = "macrs"  # Future: Modified Accelerated Cost Recovery


class DepreciationConfig(BaseModel):
    """Tax depreciation configuration."""
    purchase_price: float
    land_value_percent: float = Field(default=0.20, ge=0, le=1)
    land_value: float
    improvement_value: float
    capitalized_closing_costs: float = 0
    rehab_costs: float = 0
    total_depreciable_basis: float
    depreciation_method: DepreciationMethod = DepreciationMethod.STRAIGHT_LINE
    depreciation_years: float = 27.5  # 27.5 residential, 39 commercial
    annual_depreciation: float
    monthly_depreciation: float


class AnnualTaxProjection(BaseModel):
    """Year-by-year tax and cash flow projection."""
    year: int
    
    # Income
    gross_rental_income: float
    effective_gross_income: float
    other_income: float = 0
    total_income: float
    
    # Expenses
    operating_expenses: float
    property_taxes: float
    insurance: float
    management: float
    maintenance: float
    utilities: float
    hoa_fees: float = 0
    other_expenses: float = 0
    
    # Financing
    mortgage_interest: float
    mortgage_principal: float
    total_debt_service: float
    
    # Depreciation
    depreciation: float
    
    # Tax calculation
    net_operating_income: float
    taxable_income: float
    marginal_tax_rate: float = 0.24
    estimated_tax_liability: float
    tax_benefit: float = 0
    
    # Cash flows
    pre_tax_cash_flow: float
    after_tax_cash_flow: float


class AmortizationRow(BaseModel):
    """Single row in amortization schedule."""
    month: int
    year: int
    payment_number: int
    beginning_balance: float
    scheduled_payment: float
    principal_payment: float
    interest_payment: float
    ending_balance: float
    cumulative_principal: float
    cumulative_interest: float


class AmortizationSummary(BaseModel):
    """Summary of loan amortization."""
    monthly_payment: float
    total_payments: float
    total_principal: float
    total_interest: float
    principal_percent: float
    interest_percent: float
    payoff_date: str


class ExitAnalysis(BaseModel):
    """Property disposition analysis."""
    hold_period_years: int
    initial_value: float
    appreciation_rate: float
    projected_sale_price: float
    
    # Sale costs
    broker_commission_percent: float = 0.06
    broker_commission: float
    closing_costs_percent: float = 0.015
    closing_costs: float
    total_sale_costs: float
    
    # Payoff
    remaining_loan_balance: float
    prepayment_penalty: float = 0
    
    # Proceeds
    gross_sale_proceeds: float
    net_sale_proceeds: float
    
    # Capital gains
    adjusted_cost_basis: float
    accumulated_depreciation: float
    total_gain: float
    depreciation_recapture: float
    depreciation_recapture_tax: float  # 25% rate
    capital_gain: float
    capital_gains_tax_rate: float = 0.15
    capital_gains_tax: float
    total_tax_on_sale: float
    after_tax_proceeds: float


class InvestmentReturns(BaseModel):
    """Complete return metrics."""
    irr: float
    mirr: Optional[float] = None
    total_cash_flows: float
    total_distributions: float
    equity_multiple: float
    payback_period_months: Optional[int] = None
    average_annual_return: float
    cagr: float


class SensitivityScenario(BaseModel):
    """Single sensitivity analysis scenario."""
    variable: str
    change_percent: float
    absolute_value: float
    irr: float
    cash_on_cash: float
    net_profit: float


class PropertySummary(BaseModel):
    """Property information for proforma."""
    address: str
    city: str
    state: str
    zip: str
    property_type: str
    bedrooms: int
    bathrooms: float
    square_feet: int
    year_built: int
    lot_size: int


class AcquisitionDetails(BaseModel):
    """Acquisition cost breakdown."""
    purchase_price: float
    list_price: float
    discount_from_list: float
    closing_costs: float
    closing_costs_percent: float
    inspection_costs: float = 0
    rehab_costs: float = 0
    total_acquisition_cost: float


class FinancingDetails(BaseModel):
    """Loan and financing information."""
    down_payment: float
    down_payment_percent: float
    loan_amount: float
    interest_rate: float
    loan_term_years: int
    loan_type: str
    monthly_payment: float
    monthly_payment_with_escrow: float
    total_interest_over_life: float
    apr: float


class IncomeDetails(BaseModel):
    """Year 1 income breakdown."""
    monthly_rent: float
    annual_gross_rent: float
    other_income: float = 0
    vacancy_allowance: float
    vacancy_percent: float
    effective_gross_income: float


class ExpenseDetails(BaseModel):
    """Year 1 operating expenses."""
    property_taxes: float
    insurance: float
    hoa_fees: float = 0
    management: float
    management_percent: float
    maintenance: float
    maintenance_percent: float
    utilities: float
    landscaping: float = 0
    pest_control: float = 0
    cap_ex_reserve: float = 0
    cap_ex_reserve_percent: float = 0.05
    other_expenses: float = 0
    total_operating_expenses: float
    expense_ratio: float


class KeyMetrics(BaseModel):
    """Core investment metrics."""
    net_operating_income: float
    annual_debt_service: float
    annual_cash_flow: float
    monthly_cash_flow: float
    cap_rate: float
    cash_on_cash_return: float
    dscr: float
    gross_rent_multiplier: float
    one_percent_rule: float
    break_even_occupancy: float
    price_per_unit: float
    price_per_sqft: float
    rent_per_sqft: float


class Projections(BaseModel):
    """Multi-year projection data."""
    hold_period_years: int
    appreciation_rate: float
    rent_growth_rate: float
    expense_growth_rate: float
    annual_projections: List[AnnualTaxProjection]
    cumulative_cash_flow: List[float]
    property_values: List[float]
    equity_positions: List[float]
    loan_balances: List[float]


class DealScoreSummary(BaseModel):
    """Deal score for proforma."""
    score: int
    grade: str
    verdict: str
    breakeven_price: float
    discount_required: float


class DataSources(BaseModel):
    """Data provenance information."""
    rent_estimate_source: str
    property_value_source: str
    tax_data_source: str
    market_data_source: str
    data_freshness: str


class SensitivityAnalysis(BaseModel):
    """Complete sensitivity analysis."""
    purchase_price: List[SensitivityScenario] = []
    interest_rate: List[SensitivityScenario] = []
    rent: List[SensitivityScenario] = []
    vacancy: List[SensitivityScenario] = []
    appreciation: List[SensitivityScenario] = []


class FinancialProforma(BaseModel):
    """Complete financial proforma data structure."""
    # Metadata
    generated_at: str
    property_id: str
    property_address: str
    strategy_type: str
    
    # Property Summary
    property: PropertySummary
    
    # Acquisition
    acquisition: AcquisitionDetails
    
    # Financing
    financing: FinancingDetails
    
    # Income (Year 1)
    income: IncomeDetails
    
    # Operating Expenses (Year 1)
    expenses: ExpenseDetails
    
    # Key Metrics
    metrics: KeyMetrics
    
    # Depreciation & Tax
    depreciation: DepreciationConfig
    
    # Multi-Year Projections
    projections: Projections
    
    # Amortization
    amortization_schedule: List[AmortizationRow]
    amortization_summary: AmortizationSummary
    
    # Exit Analysis
    exit: ExitAnalysis
    
    # Investment Returns
    returns: InvestmentReturns
    
    # Sensitivity Analysis
    sensitivity: SensitivityAnalysis
    
    # Deal Score
    deal_score: DealScoreSummary
    
    # Data Sources
    sources: DataSources


class ProformaRequest(BaseModel):
    """Request to generate financial proforma."""
    property_id: str
    address: str  # Required for property lookup
    strategy: Literal["ltr", "str", "brrrr", "flip", "house_hack", "wholesale"] = "ltr"
    
    # Optional overrides
    purchase_price: Optional[float] = None
    monthly_rent: Optional[float] = None
    
    # Tax configuration
    land_value_percent: float = Field(default=0.20, ge=0, le=0.50)
    marginal_tax_rate: float = Field(default=0.24, ge=0, le=0.50)
    capital_gains_tax_rate: float = Field(default=0.15, ge=0, le=0.30)
    
    # Projection settings
    hold_period_years: int = Field(default=10, ge=1, le=30)
    
    # Export format
    format: Literal["json", "xlsx", "pdf"] = "xlsx"


class ProformaExportResponse(BaseModel):
    """Proforma export result."""
    proforma_id: str
    property_id: str
    strategy: str
    generated_at: datetime
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    format: str
    file_size_bytes: Optional[int] = None
