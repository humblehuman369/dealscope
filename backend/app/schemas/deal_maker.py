"""
DealMakerRecord schemas - the central data structure for property analysis.

The DealMakerRecord is the heart of the analysis engine. It combines:
1. Property data from API at search time (immutable)
2. Resolved default assumptions at first view (immutable snapshot)
3. User adjustments via Deal Maker (mutable)
4. Cached computed metrics (recalculated on edit)

This record is created ONCE when a property is first viewed/saved, and the
default assumptions are locked at that moment - never re-fetched.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, Dict, Any
from datetime import datetime


class InitialAssumptions(BaseModel):
    """
    Snapshot of resolved defaults at the time the DealMakerRecord was created.
    These are immutable after creation - never re-fetched from defaults API.
    """
    # Financing
    down_payment_pct: float = Field(0.20, description="Down payment percentage (0.20 = 20%)")
    closing_costs_pct: float = Field(0.03, description="Closing costs percentage (0.03 = 3%)")
    interest_rate: float = Field(0.06, description="Interest rate (0.06 = 6%)")
    loan_term_years: int = Field(30, description="Loan term in years")
    
    # Operating
    vacancy_rate: float = Field(0.01, description="Vacancy rate (0.01 = 1%)")
    maintenance_pct: float = Field(0.05, description="Maintenance as % of rent (0.05 = 5%)")
    management_pct: float = Field(0.00, description="Property management as % of rent")
    insurance_pct: float = Field(0.01, description="Insurance as % of purchase price")
    capex_pct: float = Field(0.05, description="CapEx reserve as % of rent")
    
    # Growth
    appreciation_rate: float = Field(0.05, description="Annual appreciation rate")
    rent_growth_rate: float = Field(0.05, description="Annual rent growth rate")
    expense_growth_rate: float = Field(0.03, description="Annual expense growth rate")
    
    # Strategy-specific (optional)
    str_defaults: Optional[Dict[str, Any]] = Field(None, description="STR-specific defaults")
    brrrr_defaults: Optional[Dict[str, Any]] = Field(None, description="BRRRR-specific defaults")
    flip_defaults: Optional[Dict[str, Any]] = Field(None, description="Flip-specific defaults")
    
    # Metadata
    resolved_at: Optional[datetime] = Field(None, description="When defaults were resolved")
    zip_code: Optional[str] = Field(None, description="ZIP code used for market adjustments")
    market_region: Optional[str] = Field(None, description="Market region for adjustments")


class CachedMetrics(BaseModel):
    """
    Computed metrics cached for quick access.
    Recalculated whenever Deal Maker values change.
    """
    # Core metrics
    cap_rate: Optional[float] = Field(None, description="Capitalization rate")
    cash_on_cash: Optional[float] = Field(None, description="Cash-on-cash return")
    monthly_cash_flow: Optional[float] = Field(None, description="Monthly cash flow")
    annual_cash_flow: Optional[float] = Field(None, description="Annual cash flow")
    
    # Financing
    loan_amount: Optional[float] = None
    down_payment: Optional[float] = None
    closing_costs: Optional[float] = None
    monthly_payment: Optional[float] = None
    total_cash_needed: Optional[float] = None
    
    # NOI components
    gross_income: Optional[float] = None
    vacancy_loss: Optional[float] = None
    total_expenses: Optional[float] = None
    noi: Optional[float] = None
    
    # Ratios
    dscr: Optional[float] = Field(None, description="Debt service coverage ratio")
    ltv: Optional[float] = Field(None, description="Loan-to-value ratio")
    one_percent_rule: Optional[float] = None
    grm: Optional[float] = Field(None, description="Gross rent multiplier")
    
    # Equity
    equity: Optional[float] = None
    equity_after_rehab: Optional[float] = None
    
    # Deal analysis
    deal_gap_pct: Optional[float] = Field(None, description="Discount from list price needed")
    income_value: Optional[float] = Field(None, description="Income Value — price where cash flow = $0")
    
    # Metadata
    calculated_at: Optional[datetime] = None


class DealMakerRecord(BaseModel):
    """
    The central data structure for property analysis.
    
    This record is the single source of truth for:
    - Deal Maker screen (reads/writes user adjustments)
    - IQ Verdict (reads for scoring)
    - Strategy worksheets (reads for detailed analysis)
    - Dashboard cards (reads cached metrics)
    
    Lifecycle:
    1. Created when property is first viewed/saved
    2. initial_assumptions locked at creation (never re-fetched)
    3. User adjustments update buy_price, monthly_rent, etc.
    4. cached_metrics recalculated on every change
    """
    
    # === Property Data (from API at search time) ===
    list_price: float = Field(..., description="Original list price from API")
    rent_estimate: float = Field(..., description="Rent estimate from API")
    property_taxes: float = Field(0, description="Annual property taxes")
    insurance: float = Field(0, description="Annual insurance")
    arv_estimate: Optional[float] = Field(None, description="ARV estimate if available")
    sqft: Optional[int] = Field(None, description="Square footage")
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    
    # === Initial Assumptions (locked at creation) ===
    initial_assumptions: InitialAssumptions = Field(
        default_factory=InitialAssumptions,
        description="Snapshot of resolved defaults - never re-fetched"
    )
    
    # === User Adjustments (editable via Deal Maker) ===
    # These start with values from property data + initial_assumptions,
    # then can be modified by the user in Deal Maker
    
    # Purchase
    buy_price: float = Field(..., description="User's target buy price")
    down_payment_pct: float = Field(0.20, description="Down payment percentage")
    closing_costs_pct: float = Field(0.03, description="Closing costs percentage")
    
    # Financing
    interest_rate: float = Field(0.06, description="Interest rate")
    loan_term_years: int = Field(30, description="Loan term in years")
    
    # Rehab & Valuation
    rehab_budget: float = Field(0, description="Rehab/renovation budget")
    arv: float = Field(..., description="After-repair value")
    
    # Income
    monthly_rent: float = Field(..., description="Expected monthly rent")
    other_income: float = Field(0, description="Other monthly income")
    
    # Operating Expenses (rates)
    vacancy_rate: float = Field(0.01, description="Vacancy rate")
    maintenance_pct: float = Field(0.05, description="Maintenance as % of rent")
    management_pct: float = Field(0.00, description="Management as % of rent")
    capex_pct: float = Field(0.05, description="CapEx reserve as % of rent")
    
    # Operating Expenses (fixed)
    annual_property_tax: float = Field(0, description="Annual property taxes")
    annual_insurance: float = Field(0, description="Annual insurance")
    monthly_hoa: float = Field(0, description="Monthly HOA fees")
    monthly_utilities: float = Field(0, description="Monthly utilities (if landlord pays)")
    
    # === STR-Specific Fields (optional - only used for Short-term Rental strategy) ===
    furniture_setup_cost: Optional[float] = Field(None, description="One-time furniture & setup cost")
    average_daily_rate: Optional[float] = Field(None, description="Nightly rental rate")
    occupancy_rate: Optional[float] = Field(None, description="Expected occupancy rate (0.70 = 70%)")
    cleaning_fee_revenue: Optional[float] = Field(None, description="Cleaning fee charged per booking")
    avg_length_of_stay_days: Optional[int] = Field(None, description="Average guest stay length in days")
    platform_fee_rate: Optional[float] = Field(None, description="Platform fees as % of revenue (e.g., Airbnb)")
    str_management_rate: Optional[float] = Field(None, description="STR management fee as % of revenue")
    cleaning_cost_per_turnover: Optional[float] = Field(None, description="Cleaning cost per turnover")
    supplies_monthly: Optional[float] = Field(None, description="Monthly supplies & consumables cost")
    additional_utilities_monthly: Optional[float] = Field(None, description="Additional utilities for STR")
    
    # === BRRRR-Specific Fields (optional - only used for BRRRR strategy) ===
    buy_discount_pct: Optional[float] = Field(None, description="Discount from market value (0.05 = 5%)")
    hard_money_rate: Optional[float] = Field(None, description="Hard money loan interest rate")
    contingency_pct: Optional[float] = Field(None, description="Rehab contingency percentage")
    holding_period_months: Optional[int] = Field(None, description="Months to hold before refinance")
    holding_costs_monthly: Optional[float] = Field(None, description="Monthly holding costs during rehab")
    post_rehab_monthly_rent: Optional[float] = Field(None, description="Expected rent after rehab")
    post_rehab_rent_increase_pct: Optional[float] = Field(None, description="Rent increase from rehab")
    refinance_ltv: Optional[float] = Field(None, description="Refinance loan-to-value ratio")
    refinance_interest_rate: Optional[float] = Field(None, description="Refinance interest rate")
    refinance_term_years: Optional[int] = Field(None, description="Refinance loan term in years")
    refinance_closing_costs_pct: Optional[float] = Field(None, description="Refinance closing costs percentage")
    
    # === Flip-Specific Fields (optional - only used for Flip strategy) ===
    purchase_discount_pct: Optional[float] = Field(None, description="Discount from ARV for purchase")
    financing_type: Optional[str] = Field(None, description="Financing type: cash, hardMoney, conventional")
    hard_money_ltv: Optional[float] = Field(None, description="Hard money loan-to-value ratio")
    loan_points: Optional[float] = Field(None, description="Loan origination points")
    rehab_time_months: Optional[int] = Field(None, description="Expected rehab duration in months")
    days_on_market: Optional[int] = Field(None, description="Expected days on market to sell")
    selling_costs_pct: Optional[float] = Field(None, description="Selling costs as percentage of sale price")
    capital_gains_rate: Optional[float] = Field(None, description="Capital gains tax rate")
    
    # === HouseHack-Specific Fields (optional - only used for HouseHack strategy) ===
    total_units: Optional[int] = Field(None, description="Total number of units in property")
    owner_occupied_units: Optional[int] = Field(None, description="Number of units owner occupies")
    owner_unit_market_rent: Optional[float] = Field(None, description="Market rent for owner's unit")
    loan_type: Optional[str] = Field(None, description="Loan type: fha, conventional, va")
    pmi_rate: Optional[float] = Field(None, description="PMI/MIP annual rate")
    avg_rent_per_unit: Optional[float] = Field(None, description="Average rent per rented unit")
    current_housing_payment: Optional[float] = Field(None, description="Owner's current housing payment")
    utilities_monthly: Optional[float] = Field(None, description="Monthly shared utilities")
    capex_rate: Optional[float] = Field(None, description="CapEx reserve as percentage of rent")
    
    # === Wholesale-Specific Fields (optional - only used for Wholesale strategy) ===
    estimated_repairs: Optional[float] = Field(None, description="Estimated repair costs")
    contract_price: Optional[float] = Field(None, description="Contract price with seller")
    earnest_money: Optional[float] = Field(None, description="Earnest money deposit")
    inspection_period_days: Optional[int] = Field(None, description="Inspection period in days")
    days_to_close: Optional[int] = Field(None, description="Days to close transaction")
    assignment_fee: Optional[float] = Field(None, description="Wholesale assignment fee")
    marketing_costs: Optional[float] = Field(None, description="Marketing and acquisition costs")
    wholesale_closing_costs: Optional[float] = Field(None, description="Wholesaler closing costs")
    
    # Strategy type
    strategy_type: Optional[str] = Field(None, description="Investment strategy type (ltr, str, brrrr, flip, house_hack, wholesale)")
    
    # === Cached Metrics ===
    cached_metrics: Optional[CachedMetrics] = Field(
        None,
        description="Computed metrics - recalculated on every change"
    )
    
    # === Metadata ===
    created_at: Optional[datetime] = Field(None, description="When record was created")
    updated_at: Optional[datetime] = Field(None, description="Last update time")
    version: int = Field(1, description="Schema version for migrations")

    class Config:
        from_attributes = True


class DealMakerRecordCreate(BaseModel):
    """
    Schema for creating a DealMakerRecord.
    Most fields are optional - they will be populated from property data and defaults.
    """
    # Required - property identification
    list_price: float
    rent_estimate: float
    
    # Optional property data
    property_taxes: Optional[float] = None
    insurance: Optional[float] = None
    arv_estimate: Optional[float] = None
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    zip_code: Optional[str] = Field(None, description="For resolving market-specific defaults")
    
    # Optional user overrides (if not provided, will use property data + defaults)
    buy_price: Optional[float] = None
    monthly_rent: Optional[float] = None


class DealMakerRecordUpdate(BaseModel):
    """
    Schema for updating Deal Maker values.
    Only includes user-adjustable fields.
    """
    # Purchase
    buy_price: Optional[float] = Field(None, ge=0)
    down_payment_pct: Optional[float] = Field(None, ge=0, le=1)
    closing_costs_pct: Optional[float] = Field(None, ge=0, le=0.2)
    
    # Financing
    interest_rate: Optional[float] = Field(None, ge=0, le=0.3)
    loan_term_years: Optional[int] = Field(None, ge=1, le=40)
    
    # Rehab & Valuation
    rehab_budget: Optional[float] = Field(None, ge=0)
    arv: Optional[float] = Field(None, ge=0)
    
    # Income (LTR)
    monthly_rent: Optional[float] = Field(None, ge=0)
    other_income: Optional[float] = Field(None, ge=0)
    
    # Operating Expenses (rates)
    vacancy_rate: Optional[float] = Field(None, ge=0, le=1)
    maintenance_pct: Optional[float] = Field(None, ge=0, le=1)
    management_pct: Optional[float] = Field(None, ge=0, le=1)
    capex_pct: Optional[float] = Field(None, ge=0, le=1)
    
    # Operating Expenses (fixed)
    annual_property_tax: Optional[float] = Field(None, ge=0)
    annual_insurance: Optional[float] = Field(None, ge=0)
    monthly_hoa: Optional[float] = Field(None, ge=0)
    monthly_utilities: Optional[float] = Field(None, ge=0)
    
    # STR-Specific Fields
    furniture_setup_cost: Optional[float] = Field(None, ge=0, description="One-time furniture & setup cost")
    average_daily_rate: Optional[float] = Field(None, ge=0, description="Nightly rental rate")
    occupancy_rate: Optional[float] = Field(None, ge=0, le=1, description="Expected occupancy rate")
    cleaning_fee_revenue: Optional[float] = Field(None, ge=0, description="Cleaning fee per booking")
    avg_length_of_stay_days: Optional[int] = Field(None, ge=1, le=365, description="Average stay length")
    platform_fee_rate: Optional[float] = Field(None, ge=0, le=0.5, description="Platform fees %")
    str_management_rate: Optional[float] = Field(None, ge=0, le=0.5, description="STR management %")
    cleaning_cost_per_turnover: Optional[float] = Field(None, ge=0, description="Cleaning cost per turnover")
    supplies_monthly: Optional[float] = Field(None, ge=0, description="Monthly supplies cost")
    additional_utilities_monthly: Optional[float] = Field(None, ge=0, description="Additional utilities")
    
    # BRRRR-Specific Fields
    buy_discount_pct: Optional[float] = Field(None, ge=0, le=0.5, description="Discount from market value")
    hard_money_rate: Optional[float] = Field(None, ge=0, le=0.25, description="Hard money interest rate")
    contingency_pct: Optional[float] = Field(None, ge=0, le=0.5, description="Rehab contingency %")
    holding_period_months: Optional[int] = Field(None, ge=1, le=24, description="Holding period months")
    holding_costs_monthly: Optional[float] = Field(None, ge=0, description="Monthly holding costs")
    post_rehab_monthly_rent: Optional[float] = Field(None, ge=0, description="Post-rehab monthly rent")
    post_rehab_rent_increase_pct: Optional[float] = Field(None, ge=0, le=1, description="Rent increase from rehab")
    refinance_ltv: Optional[float] = Field(None, ge=0.5, le=0.9, description="Refinance LTV")
    refinance_interest_rate: Optional[float] = Field(None, ge=0, le=0.2, description="Refinance rate")
    refinance_term_years: Optional[int] = Field(None, ge=10, le=40, description="Refinance term years")
    refinance_closing_costs_pct: Optional[float] = Field(None, ge=0, le=0.1, description="Refinance closing costs %")
    
    # Flip-Specific Fields
    purchase_discount_pct: Optional[float] = Field(None, ge=0, le=0.5, description="Discount from ARV")
    financing_type: Optional[str] = Field(None, description="Financing type: cash, hardMoney, conventional")
    hard_money_ltv: Optional[float] = Field(None, ge=0.5, le=1.0, description="Hard money LTV")
    loan_points: Optional[float] = Field(None, ge=0, le=10, description="Loan origination points")
    rehab_time_months: Optional[int] = Field(None, ge=1, le=24, description="Rehab time in months")
    days_on_market: Optional[int] = Field(None, ge=0, le=365, description="Expected days on market")
    selling_costs_pct: Optional[float] = Field(None, ge=0, le=0.15, description="Selling costs %")
    capital_gains_rate: Optional[float] = Field(None, ge=0, le=0.5, description="Capital gains tax rate")
    
    # HouseHack-Specific Fields
    total_units: Optional[int] = Field(None, ge=2, le=8, description="Total units in property")
    owner_occupied_units: Optional[int] = Field(None, ge=1, le=2, description="Owner occupied units")
    owner_unit_market_rent: Optional[float] = Field(None, ge=0, description="Owner unit market rent")
    loan_type: Optional[str] = Field(None, description="Loan type: fha, conventional, va")
    pmi_rate: Optional[float] = Field(None, ge=0, le=0.02, description="PMI/MIP rate")
    avg_rent_per_unit: Optional[float] = Field(None, ge=0, description="Avg rent per unit")
    current_housing_payment: Optional[float] = Field(None, ge=0, description="Current housing payment")
    utilities_monthly: Optional[float] = Field(None, ge=0, description="Monthly utilities")
    capex_rate: Optional[float] = Field(None, ge=0, le=0.15, description="CapEx reserve %")
    
    # Wholesale-Specific Fields
    estimated_repairs: Optional[float] = Field(None, ge=0, description="Estimated repairs")
    contract_price: Optional[float] = Field(None, ge=0, description="Contract price")
    earnest_money: Optional[float] = Field(None, ge=0, le=50000, description="Earnest money")
    inspection_period_days: Optional[int] = Field(None, ge=0, le=60, description="Inspection period days")
    days_to_close: Optional[int] = Field(None, ge=0, le=180, description="Days to close")
    assignment_fee: Optional[float] = Field(None, ge=0, description="Assignment fee")
    marketing_costs: Optional[float] = Field(None, ge=0, description="Marketing costs")
    wholesale_closing_costs: Optional[float] = Field(None, ge=0, description="Wholesale closing costs")
    
    # Strategy type
    strategy_type: Optional[str] = Field(None, description="Strategy type")
    
    @model_validator(mode='after')
    def validate_cross_field_constraints(self):
        """Validate cross-field constraints for financial calculations."""
        # BRRRR: buy_price should typically be less than ARV (buying below market)
        if self.buy_price is not None and self.arv is not None:
            if self.buy_price > self.arv:
                # This is a warning, not an error - user might have a reason
                # But for extreme cases, we reject
                if self.buy_price > self.arv * 1.5:
                    raise ValueError(
                        f"buy_price ({self.buy_price:,.0f}) is significantly higher than "
                        f"ARV ({self.arv:,.0f}). For BRRRR strategy, buy_price should "
                        "typically be below ARV."
                    )
        
        # Refinance LTV must allow cash-out
        if (self.refinance_ltv is not None and 
            self.buy_price is not None and 
            self.arv is not None and
            self.arv > 0):
            max_loan = self.arv * self.refinance_ltv
            # Warning if refinance won't cover original purchase
            if max_loan < self.buy_price * 0.8:
                pass  # Just a warning, don't block
        
        # Total units must be >= owner_occupied_units for house hack
        if (self.total_units is not None and 
            self.owner_occupied_units is not None):
            if self.owner_occupied_units > self.total_units:
                raise ValueError(
                    f"owner_occupied_units ({self.owner_occupied_units}) cannot be "
                    f"greater than total_units ({self.total_units})"
                )
        
        return self


class DealMakerResponse(BaseModel):
    """
    Response schema for Deal Maker endpoints.
    Includes the full record plus computed metrics.
    """
    record: DealMakerRecord
    
    # Convenience fields for UI
    cash_needed: Optional[float] = Field(None, description="Total cash to close")
    deal_gap: Optional[float] = Field(None, description="% discount from list price")
    annual_profit: Optional[float] = Field(None, description="Annual cash flow")
    cap_rate: Optional[float] = None
    coc_return: Optional[float] = Field(None, description="Cash-on-cash return")
    monthly_payment: Optional[float] = None
    
    class Config:
        from_attributes = True
