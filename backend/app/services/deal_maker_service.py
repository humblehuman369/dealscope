"""
DealMakerService - Central service for managing DealMakerRecords.

The DealMakerRecord is the heart of the analysis engine. This service:
1. Creates records by combining property data + resolved defaults (ONCE)
2. Updates records when user adjusts values in Deal Maker
3. Recalculates cached metrics on every update
4. Never re-fetches defaults after initial creation

This is the single source of truth for all analysis data used by:
- Deal Maker screen
- IQ Verdict
- Strategy worksheets
- Dashboard cards
"""

import logging
from datetime import UTC, datetime
from typing import Any

from app.core.valuation import (
    VALUATION_FORMULA_VERSION,
    ValuationInputs,
    build_valuation_snapshot,
    compute_noi,
)
from app.core.valuation.debt import annual_debt_service_at_price
from app.core.valuation.noi import NOIInputs
from app.schemas.deal_maker import (
    CachedMetrics,
    DealMakerRecord,
    DealMakerRecordCreate,
    DealMakerRecordUpdate,
    InitialAssumptions,
)
from app.schemas.valuation import ValuationSnapshot
from app.schemas.property import AllAssumptions
from app.services.assumptions_service import get_market_adjustments
from app.services.calculators import (
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
    calculate_grm,
    calculate_monthly_mortgage,
)

logger = logging.getLogger(__name__)


def _coalesce_none(*values):
    """Return the first value that is not None, preserving legitimate zeros."""
    for value in values:
        if value is not None:
            return value
    return None


class DealMakerService:
    """
    Service for creating and managing DealMakerRecords.

    Key principles:
    - Defaults are resolved ONCE at creation and locked (initial_assumptions)
    - User adjustments update the record, not the initial assumptions
    - Metrics are recalculated on every update
    """

    @staticmethod
    def resolve_initial_assumptions(
        zip_code: str | None = None,
        resolved: AllAssumptions | None = None,
    ) -> InitialAssumptions:
        """Resolve initial assumptions from DB defaults + market adjustments.

        ``resolved`` should be an AllAssumptions object produced by
        assumption_resolver.  When not provided, falls back to Pydantic
        schema defaults (which still reference defaults.py singletons).
        """
        a = resolved or AllAssumptions()
        f = a.financing
        o = a.operating
        s = a.str_assumptions
        b = a.brrrr
        fl = a.flip

        assumptions = InitialAssumptions(
            down_payment_pct=f.down_payment_pct,
            closing_costs_pct=f.closing_costs_pct,
            interest_rate=f.interest_rate,
            loan_term_years=f.loan_term_years,
            vacancy_rate=o.vacancy_rate,
            maintenance_pct=o.maintenance_pct,
            management_pct=o.property_management_pct,
            insurance_pct=o.insurance_pct,
            capex_pct=0.05,
            appreciation_rate=a.appreciation_rate,
            rent_growth_rate=a.rent_growth_rate,
            expense_growth_rate=a.expense_growth_rate,
            resolved_at=datetime.now(UTC),
            zip_code=zip_code,
        )

        if zip_code:
            market = get_market_adjustments(zip_code)
            assumptions_dict = assumptions.model_dump(exclude={"vacancy_rate", "appreciation_rate", "market_region"})
            assumptions = InitialAssumptions(
                **assumptions_dict,
                vacancy_rate=market.get("vacancy_rate", o.vacancy_rate),
                appreciation_rate=market.get("appreciation_rate", a.appreciation_rate),
                market_region=market.get("region"),
            )

        assumptions_dict = assumptions.model_dump(exclude={"str_defaults", "brrrr_defaults", "flip_defaults"})
        assumptions = InitialAssumptions(
            **assumptions_dict,
            str_defaults={
                "platform_fees_pct": s.platform_fees_pct,
                "management_pct": s.str_management_pct,
                "cleaning_cost": s.cleaning_cost_per_turnover,
            },
            brrrr_defaults={
                "refinance_ltv": b.refinance_ltv,
                "refinance_rate": b.refinance_interest_rate,
                "post_rehab_rent_increase": b.post_rehab_rent_increase_pct,
            },
            flip_defaults={
                "holding_period_months": fl.holding_period_months,
                "selling_costs_pct": fl.selling_costs_pct,
            },
        )

        return assumptions

    @staticmethod
    def calculate_metrics(record: DealMakerRecord) -> CachedMetrics:
        """
        Calculate all metrics from the current record state.
        Called whenever record values change.
        """
        # Financing calculations
        down_payment = record.buy_price * record.down_payment_pct
        closing_costs = record.buy_price * record.closing_costs_pct
        loan_amount = record.buy_price - down_payment
        total_cash_needed = down_payment + closing_costs + record.rehab_budget

        sc_amt = record.seller_carry_amount or 0.0
        sc_rate = record.seller_carry_rate or 0.0
        sc_term = record.seller_carry_term_years or 30

        annual_debt_service = annual_debt_service_at_price(
            record.buy_price,
            record.down_payment_pct,
            record.interest_rate,
            record.loan_term_years,
            seller_carry_amount=sc_amt,
            seller_carry_rate=sc_rate,
            seller_carry_term_years=sc_term,
        )
        monthly_payment = annual_debt_service / 12 if annual_debt_service > 0 else 0.0

        effective_monthly_rent = (
            record.monthly_rent_override
            if record.monthly_rent_override is not None and record.monthly_rent_override > 0
            else record.monthly_rent
        )
        effective_market_value = (
            record.market_value_override
            if record.market_value_override is not None and record.market_value_override > 0
            else record.list_price
        )

        noi_result = compute_noi(
            NOIInputs(
                monthly_rent=effective_monthly_rent,
                property_taxes=record.annual_property_tax,
                insurance=record.annual_insurance,
                vacancy_rate=record.vacancy_rate,
                maintenance_pct=record.maintenance_pct,
                management_pct=record.management_pct,
                capex_pct=record.capex_pct,
                utilities_annual=record.monthly_utilities * 12,
                other_annual_expenses=record.monthly_hoa * 12,
                other_income_annual=record.other_income * 12,
            )
        )
        noi = noi_result.noi
        vacancy_loss = noi_result.vacancy_loss
        effective_gross_income = noi_result.effective_gross_income
        total_expenses = noi_result.operating_expenses
        annual_gross_rent = noi_result.annual_gross_rent

        annual_cash_flow = noi - annual_debt_service
        monthly_cash_flow = annual_cash_flow / 12

        cap_rate = calculate_cap_rate(noi, record.buy_price)
        cash_on_cash = calculate_cash_on_cash(annual_cash_flow, total_cash_needed)
        dscr = calculate_dscr(noi, annual_debt_service) if annual_debt_service > 0 else None
        ltv = loan_amount / record.buy_price if record.buy_price > 0 else 0
        one_percent = effective_monthly_rent / record.buy_price if record.buy_price > 0 else 0
        grm = calculate_grm(record.buy_price, annual_gross_rent)

        # Equity calculations
        equity = record.buy_price - loan_amount
        equity_after_rehab = record.arv - loan_amount if record.arv > 0 else equity

        # Deal analysis — market value override is SSOT for "current market" when set
        deal_gap_pct = (
            (effective_market_value - record.buy_price) / effective_market_value
            if effective_market_value > 0
            else 0
        )

        snap_dict = build_valuation_snapshot(
            ValuationInputs(
                monthly_rent=effective_monthly_rent,
                property_taxes=record.annual_property_tax,
                insurance=record.annual_insurance,
                list_price=effective_market_value,
                purchase_price=record.buy_price,
                down_payment_pct=record.down_payment_pct,
                interest_rate=record.interest_rate,
                loan_term_years=record.loan_term_years,
                vacancy_rate=record.vacancy_rate,
                maintenance_pct=record.maintenance_pct,
                management_pct=record.management_pct,
                capex_pct=record.capex_pct,
                utilities_annual=record.monthly_utilities * 12,
                other_annual_expenses=record.monthly_hoa * 12,
                seller_carry_amount=sc_amt,
                seller_carry_rate=sc_rate,
                seller_carry_term_years=sc_term,
                other_income_annual=record.other_income * 12,
            )
        )
        income_value = snap_dict.get("income_value") or 0
        valuation_snapshot = ValuationSnapshot(**snap_dict)

        return CachedMetrics(
            # Core metrics
            cap_rate=cap_rate,
            cash_on_cash=cash_on_cash,
            monthly_cash_flow=monthly_cash_flow,
            annual_cash_flow=annual_cash_flow,
            # Financing
            loan_amount=loan_amount,
            down_payment=down_payment,
            closing_costs=closing_costs,
            monthly_payment=monthly_payment,
            total_cash_needed=total_cash_needed,
            # NOI components
            gross_income=effective_gross_income,
            vacancy_loss=vacancy_loss,
            total_expenses=total_expenses,
            noi=noi,
            # Ratios
            dscr=dscr,
            ltv=ltv,
            one_percent_rule=one_percent,
            grm=grm,
            # Equity
            equity=equity,
            equity_after_rehab=equity_after_rehab,
            # Deal analysis
            deal_gap_pct=deal_gap_pct,
            income_value=income_value,
            metrics_calculation_version=VALUATION_FORMULA_VERSION,
            valuation_snapshot=valuation_snapshot,
            # Metadata
            calculated_at=datetime.now(UTC),
        )

    @classmethod
    def create_record(
        cls,
        data: DealMakerRecordCreate,
        zip_code: str | None = None,
    ) -> DealMakerRecord:
        """
        Create a new DealMakerRecord from property data.

        This is called when:
        1. User first views a property
        2. User saves a property to their portfolio

        The initial_assumptions are locked at this moment and never re-fetched.
        """
        # Resolve defaults ONCE
        initial = cls.resolve_initial_assumptions(zip_code or data.zip_code)

        # Create record with property data + resolved defaults
        record = DealMakerRecord(
            # Property data (from API)
            list_price=data.list_price,
            rent_estimate=data.rent_estimate,
            property_taxes=_coalesce_none(data.property_taxes, 0),
            insurance=_coalesce_none(data.insurance, 0),
            arv_estimate=data.arv_estimate,
            sqft=data.sqft,
            bedrooms=data.bedrooms,
            bathrooms=data.bathrooms,
            year_built=data.year_built,
            property_type=data.property_type,
            # Initial assumptions (locked)
            initial_assumptions=initial,
            # User adjustments (initialized from property data + defaults)
            buy_price=_coalesce_none(data.buy_price, data.list_price),
            down_payment_pct=initial.down_payment_pct,
            closing_costs_pct=initial.closing_costs_pct,
            interest_rate=initial.interest_rate,
            loan_term_years=initial.loan_term_years,
            rehab_budget=0,
            arv=_coalesce_none(data.arv_estimate, data.list_price),
            monthly_rent=_coalesce_none(data.monthly_rent, data.rent_estimate),
            other_income=0,
            vacancy_rate=initial.vacancy_rate,
            maintenance_pct=initial.maintenance_pct,
            management_pct=initial.management_pct,
            capex_pct=initial.capex_pct,
            annual_property_tax=_coalesce_none(data.property_taxes, 0),
            annual_insurance=_coalesce_none(data.insurance, data.list_price * initial.insurance_pct),
            monthly_hoa=0,
            monthly_utilities=0,
            # Metadata
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            version=3,
        )

        # Calculate initial metrics
        record.cached_metrics = cls.calculate_metrics(record)

        return record

    @classmethod
    def update_record(
        cls,
        record: DealMakerRecord,
        updates: DealMakerRecordUpdate,
    ) -> DealMakerRecord:
        """
        Update a DealMakerRecord with user adjustments.

        Only user-adjustable fields can be updated.
        Initial assumptions remain unchanged.
        Metrics are recalculated after update.
        """
        # Apply updates to the record
        record_dict = record.model_dump()
        updates_dict = updates.model_dump(exclude_unset=True)

        for key, value in updates_dict.items():
            if value is not None:
                record_dict[key] = value

        # Update timestamp
        record_dict["updated_at"] = datetime.now(UTC)

        # Reconstruct record
        updated_record = DealMakerRecord(**record_dict)

        # Recalculate metrics
        updated_record.cached_metrics = cls.calculate_metrics(updated_record)

        return updated_record

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DealMakerRecord:
        """
        Reconstruct a DealMakerRecord from a stored dictionary.
        Used when loading from database JSON column.
        """
        if not data:
            return None

        # Handle nested InitialAssumptions
        if "initial_assumptions" in data and isinstance(data["initial_assumptions"], dict):
            data["initial_assumptions"] = InitialAssumptions(**data["initial_assumptions"])

        # Handle nested CachedMetrics
        if "cached_metrics" in data and isinstance(data["cached_metrics"], dict):
            data["cached_metrics"] = CachedMetrics(**data["cached_metrics"])

        return DealMakerRecord(**data)

    @classmethod
    def to_dict(cls, record: DealMakerRecord) -> dict[str, Any]:
        """
        Convert a DealMakerRecord to a dictionary for storage.
        """
        return record.model_dump(mode="json")

    @classmethod
    def create_from_property_data(
        cls,
        property_data: dict[str, Any],
        zip_code: str | None = None,
    ) -> DealMakerRecord:
        """
        Create a DealMakerRecord from raw property data (e.g., from PropertyResponse).

        This is a convenience method that extracts the relevant fields from
        a property data dict and creates the record.
        """
        create_data = DealMakerRecordCreate(
            list_price=property_data.get("listPrice") or property_data.get("list_price") or 0,
            rent_estimate=property_data.get("monthlyRent") or property_data.get("rent_estimate") or 0,
            property_taxes=property_data.get("propertyTaxes") or property_data.get("property_taxes"),
            insurance=property_data.get("insurance"),
            arv_estimate=property_data.get("arv") or property_data.get("listPrice"),
            sqft=property_data.get("sqft") or property_data.get("livingArea"),
            bedrooms=property_data.get("bedrooms") or property_data.get("beds"),
            bathrooms=property_data.get("bathrooms") or property_data.get("baths"),
            year_built=property_data.get("yearBuilt") or property_data.get("year_built"),
            property_type=property_data.get("propertyType") or property_data.get("property_type"),
            zip_code=zip_code or property_data.get("zipCode") or property_data.get("zip_code"),
        )

        return cls.create_record(create_data, zip_code)


# Singleton instance for convenience
deal_maker_service = DealMakerService()
