"""
Map IQ Verdict inputs and DealMaker records into AllAssumptions + property overrides.

Keeps comprehensive Excel export aligned with Strategy page / verdict recalc math.
"""

from __future__ import annotations

from typing import Any

from app.core.valuation.rates import normalize_annual_rate
from app.schemas.analytics import IQVerdictInput
from app.schemas.deal_maker import DealMakerRecord
from app.schemas.property import AllAssumptions, PropertyResponse


def _set_if_present(target: dict[str, Any], key: str, value: Any) -> None:
    if value is not None:
        target[key] = value


def deal_maker_record_to_verdict_overrides(record: DealMakerRecord) -> dict[str, Any]:
    """Convert a saved DealMakerRecord into IQVerdictInput-compatible override fields."""
    overrides: dict[str, Any] = {}

    list_price = record.market_value_override if record.market_value_override and record.market_value_override > 0 else record.list_price
    _set_if_present(overrides, "list_price", list_price)
    _set_if_present(overrides, "purchase_price", record.buy_price)

    rent = (
        record.monthly_rent_override
        if record.monthly_rent_override is not None and record.monthly_rent_override > 0
        else record.monthly_rent
    )
    _set_if_present(overrides, "monthly_rent", rent)
    _set_if_present(overrides, "property_taxes", record.annual_property_tax)
    _set_if_present(overrides, "insurance", record.annual_insurance)
    _set_if_present(overrides, "hoa_fees_monthly", record.monthly_hoa)
    _set_if_present(overrides, "arv", record.arv)
    _set_if_present(overrides, "rehab_cost", record.rehab_budget)

    _set_if_present(overrides, "down_payment_pct", record.down_payment_pct)
    _set_if_present(overrides, "interest_rate", record.interest_rate)
    _set_if_present(overrides, "loan_term_years", record.loan_term_years)
    _set_if_present(overrides, "closing_costs_pct", record.closing_costs_pct)
    _set_if_present(overrides, "vacancy_rate", record.vacancy_rate)
    _set_if_present(overrides, "maintenance_pct", record.maintenance_pct)
    _set_if_present(overrides, "management_pct", record.management_pct)
    _set_if_present(overrides, "capex_pct", record.capex_pct)
    _set_if_present(overrides, "utilities_monthly", record.monthly_utilities or record.utilities_monthly)

    _set_if_present(overrides, "average_daily_rate", record.average_daily_rate)
    _set_if_present(overrides, "occupancy_rate", record.occupancy_rate)
    _set_if_present(overrides, "buy_discount_pct", record.buy_discount_pct)

    _set_if_present(overrides, "seller_carry_amount", record.seller_carry_amount)
    _set_if_present(overrides, "seller_carry_rate", record.seller_carry_rate)
    _set_if_present(overrides, "seller_carry_term_years", record.seller_carry_term_years)

    if record.bedrooms is not None:
        overrides["bedrooms"] = record.bedrooms
    if record.bathrooms is not None:
        overrides["bathrooms"] = record.bathrooms
    if record.sqft is not None:
        overrides["sqft"] = record.sqft

    return overrides


def merge_verdict_input(base: IQVerdictInput, saved_overrides: dict[str, Any] | None) -> IQVerdictInput:
    """Merge saved deal record fields under live request (request wins)."""
    if not saved_overrides:
        return base
    data = base.model_dump()
    for key, value in saved_overrides.items():
        if value is None:
            continue
        if data.get(key) is None:
            data[key] = value
    return IQVerdictInput.model_validate(data)


def apply_verdict_input_to_assumptions(
    assumptions: AllAssumptions,
    input_data: IQVerdictInput,
) -> set[str]:
    """
    Apply per-request verdict fields onto AllAssumptions (mutates in place).

    Returns keys that were explicitly set from the request (for Assumptions sheet).
    """
    user_keys: set[str] = set()

    list_price = input_data.list_price
    monthly_rent = input_data.monthly_rent if input_data.monthly_rent is not None else 0
    property_taxes = input_data.property_taxes if input_data.property_taxes is not None else 0
    insurance = input_data.insurance if input_data.insurance is not None else 0
    arv = input_data.arv or (list_price * 1.15)
    rehab_cost = (
        input_data.rehab_cost
        if input_data.rehab_cost is not None
        else arv * assumptions.rehab.renovation_budget_pct
    )

    if input_data.purchase_price is not None:
        assumptions.financing.purchase_price = input_data.purchase_price
        user_keys.add("purchase_price")

    if input_data.down_payment_pct is not None:
        assumptions.financing.down_payment_pct = input_data.down_payment_pct
        user_keys.add("down_payment_pct")
    if input_data.interest_rate is not None:
        assumptions.financing.interest_rate = normalize_annual_rate(
            input_data.interest_rate,
            fallback=assumptions.financing.interest_rate,
        )
        user_keys.add("interest_rate")
    if input_data.loan_term_years is not None:
        assumptions.financing.loan_term_years = input_data.loan_term_years
        user_keys.add("loan_term_years")
    if input_data.closing_costs_pct is not None:
        assumptions.financing.closing_costs_pct = input_data.closing_costs_pct
        user_keys.add("closing_costs_pct")

    if input_data.vacancy_rate is not None:
        assumptions.operating.vacancy_rate = input_data.vacancy_rate
        user_keys.add("vacancy_rate")
    if input_data.maintenance_pct is not None:
        assumptions.operating.maintenance_pct = input_data.maintenance_pct
        user_keys.add("maintenance_pct")
    if input_data.management_pct is not None:
        assumptions.operating.property_management_pct = input_data.management_pct
        user_keys.add("management_pct")
    if input_data.capex_pct is not None:
        assumptions.operating.capex_pct = input_data.capex_pct
        user_keys.add("capex_pct")
    if input_data.utilities_monthly is not None:
        assumptions.operating.utilities_monthly = input_data.utilities_monthly
        user_keys.add("utilities_monthly")
    if input_data.pest_control_annual is not None:
        assumptions.operating.pest_control_annual = input_data.pest_control_annual
        user_keys.add("pest_control_annual")
    if input_data.insurance is not None:
        assumptions.operating.insurance_annual = input_data.insurance
        user_keys.add("insurance")

    if input_data.rehab_cost is not None:
        assumptions.rehab.renovation_budget = input_data.rehab_cost
        user_keys.add("rehab_cost")

    if input_data.buy_discount_pct is not None:
        assumptions.ltr.buy_discount_pct = input_data.buy_discount_pct
        assumptions.brrrr.buy_discount_pct = input_data.buy_discount_pct
        user_keys.add("buy_discount_pct")

    if input_data.average_daily_rate is not None:
        # Stored on property rentals for analytics; flag for assumptions sheet
        user_keys.add("average_daily_rate")
    if input_data.occupancy_rate is not None:
        user_keys.add("occupancy_rate")

    # Ensure purchase_price for analytics when only list/target context exists
    if assumptions.financing.purchase_price is None and input_data.purchase_price is not None:
        assumptions.financing.purchase_price = input_data.purchase_price

    return user_keys


def patch_property_from_verdict_input(
    property_data: PropertyResponse,
    input_data: IQVerdictInput,
) -> PropertyResponse:
    """Return a copy of property data with verdict-driven rent/tax/valuation overrides."""
    updates: dict[str, Any] = {}

    if input_data.monthly_rent is not None and property_data.rentals:
        rentals = property_data.rentals.model_copy(
            update={"monthly_rent_ltr": input_data.monthly_rent},
        )
        updates["rentals"] = rentals

    if property_data.market and (
        input_data.property_taxes is not None
        or input_data.insurance is not None
        or input_data.hoa_fees_monthly is not None
    ):
        market_updates: dict[str, Any] = {}
        if input_data.property_taxes is not None:
            market_updates["property_taxes_annual"] = input_data.property_taxes
        if input_data.insurance is not None:
            market_updates["insurance_annual"] = input_data.insurance
        if input_data.hoa_fees_monthly is not None:
            market_updates["hoa_fees_monthly"] = input_data.hoa_fees_monthly
        updates["market"] = property_data.market.model_copy(update=market_updates)

    if input_data.arv is not None and property_data.valuations:
        val_updates: dict[str, Any] = {"arv": input_data.arv}
        updates["valuations"] = property_data.valuations.model_copy(update=val_updates)

    if input_data.average_daily_rate is not None and property_data.rentals:
        rentals = updates.get("rentals") or property_data.rentals
        updates["rentals"] = rentals.model_copy(update={"average_daily_rate": input_data.average_daily_rate})

    if input_data.occupancy_rate is not None and property_data.rentals:
        rentals = updates.get("rentals") or property_data.rentals
        occ_pct = input_data.occupancy_rate * 100 if input_data.occupancy_rate <= 1 else input_data.occupancy_rate
        updates["rentals"] = rentals.model_copy(update={"occupancy_rate": occ_pct})

    if not updates:
        return property_data
    return property_data.model_copy(update=updates)


def resolve_purchase_price(input_data: IQVerdictInput, assumptions: AllAssumptions) -> float:
    """Target buy / purchase price for proforma and analytics."""
    if input_data.purchase_price is not None and input_data.purchase_price > 0:
        return input_data.purchase_price
    if assumptions.financing.purchase_price is not None and assumptions.financing.purchase_price > 0:
        return assumptions.financing.purchase_price
    return input_data.list_price
