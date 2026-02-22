"""
Worksheet router — Strategy-specific calculation endpoints.

Handles LTR, STR, BRRRR, Flip, House Hack, and Wholesale worksheet calculations.
Extracted from main.py as part of Phase 2 Architecture Cleanup.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.deps import DbSession
from app.services.assumption_resolver import resolve_assumptions
from app.services.calculators import (
    calculate_ltr, calculate_str, calculate_brrrr,
    calculate_flip, calculate_house_hack, calculate_wholesale,
    calculate_monthly_mortgage,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Worksheets"])


# ===========================================
# Schemas
# ===========================================

class LTRWorksheetInput(BaseModel):
    purchase_price: float = Field(...)
    monthly_rent: float = Field(...)
    property_taxes_annual: float = Field(None)
    insurance_annual: float = Field(None)
    down_payment_pct: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None
    closing_costs: float = Field(0)
    rehab_costs: float = Field(0)
    vacancy_rate: Optional[float] = None
    property_management_pct: Optional[float] = None
    maintenance_pct: Optional[float] = None
    capex_pct: float = Field(0.0)
    hoa_monthly: float = Field(0)
    arv: float = Field(None)
    sqft: float = Field(None)


class STRWorksheetInput(BaseModel):
    purchase_price: float
    list_price: Optional[float] = None
    average_daily_rate: float
    occupancy_rate: float = Field(0.75)
    property_taxes_annual: float = Field(None)
    insurance_annual: float = Field(None)
    down_payment_pct: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None
    closing_costs: float = 0
    furnishing_budget: Optional[float] = None
    platform_fees_pct: Optional[float] = None
    property_management_pct: Optional[float] = None
    cleaning_cost_per_turn: Optional[float] = None
    cleaning_fee_revenue: Optional[float] = None
    avg_booking_length: Optional[int] = None
    supplies_monthly: Optional[float] = None
    utilities_monthly: Optional[float] = None
    maintenance_pct: Optional[float] = None
    capex_pct: float = Field(0.05)


class BRRRRWorksheetInput(BaseModel):
    purchase_price: float
    purchase_costs: float = 0
    rehab_costs: float
    arv: float
    sqft: Optional[float] = None
    monthly_rent: float
    property_taxes_annual: float = 6000
    insurance_annual: float = 2000
    utilities_monthly: float = 0
    down_payment_pct: float = 0.20
    loan_to_cost_pct: Optional[float] = None
    interest_rate: float = 0.10
    points: float = 2
    holding_months: int = 6
    refi_ltv: float = 0.75
    refi_interest_rate: float = 0.07
    refi_loan_term: int = 30
    refi_closing_costs: float = 3000
    vacancy_rate: float = 0.08
    property_management_pct: float = 0.08
    maintenance_pct: float = 0.05
    capex_pct: float = 0.05


class FlipWorksheetInput(BaseModel):
    purchase_price: float
    purchase_costs: float = 0
    rehab_costs: float
    arv: float
    down_payment_pct: float = 0.10
    interest_rate: float = 0.12
    points: float = 2
    holding_months: float = 6
    property_taxes_annual: float = 4000
    insurance_annual: float = 1500
    utilities_monthly: float = 150
    dumpster_monthly: float = 100
    inspection_costs: float = 0
    contingency_pct: float = 0
    selling_costs_pct: float = 0.08
    capital_gains_rate: float = 0.20
    loan_type: Optional[str] = "interest_only"


class HouseHackWorksheetInput(BaseModel):
    purchase_price: float
    unit_rents: list = Field(default=[0, 0, 0])
    owner_market_rent: float = 1500
    list_price: Optional[float] = None
    fha_max_price: Optional[float] = None
    property_taxes_annual: float = 6000
    insurance_annual: float = 2000
    down_payment_pct: float = 0.035
    interest_rate: float = 0.07
    loan_term_years: int = 30
    closing_costs: float = 0
    pmi_rate: float = 0.005
    vacancy_rate: float = 0.05
    maintenance_pct: float = 0.05
    capex_pct: float = 0.05
    maintenance_monthly: float = 200
    capex_monthly: float = 100
    utilities_monthly: float = 150
    loan_type: Optional[str] = "conventional"


class WholesaleWorksheetInput(BaseModel):
    arv: float
    contract_price: float
    investor_price: float
    rehab_costs: float
    assignment_fee: float = 15000
    marketing_costs: float = 500
    earnest_money: float = 1000
    selling_costs_pct: float = 0.06
    investor_down_payment_pct: float = 0.25
    investor_purchase_costs_pct: float = 0.03
    tax_rate: float = 0.20


# ===========================================
# Endpoints
# ===========================================

@router.post("/api/v1/worksheet/ltr/calculate")
async def calculate_ltr_worksheet(input_data: LTRWorksheetInput, db: DbSession):
    """Calculate LTR worksheet metrics."""
    try:
        a = await resolve_assumptions(db)
        f, o = a.financing, a.operating
        dp = input_data.down_payment_pct if input_data.down_payment_pct is not None else f.down_payment_pct
        ir = input_data.interest_rate if input_data.interest_rate is not None else f.interest_rate
        lt = input_data.loan_term_years if input_data.loan_term_years is not None else f.loan_term_years
        vr = input_data.vacancy_rate if input_data.vacancy_rate is not None else o.vacancy_rate
        pm = input_data.property_management_pct if input_data.property_management_pct is not None else o.property_management_pct
        mp = input_data.maintenance_pct if input_data.maintenance_pct is not None else o.maintenance_pct
        ia = input_data.insurance_annual if input_data.insurance_annual is not None else input_data.purchase_price * o.insurance_pct

        result = calculate_ltr(
            purchase_price=input_data.purchase_price,
            monthly_rent=input_data.monthly_rent,
            property_taxes_annual=input_data.property_taxes_annual or (input_data.purchase_price * 0.012),
            down_payment_pct=dp,
            interest_rate=ir,
            loan_term_years=lt,
            closing_costs_pct=input_data.closing_costs / input_data.purchase_price if input_data.closing_costs > 0 else f.closing_costs_pct,
            vacancy_rate=vr,
            property_management_pct=pm,
            maintenance_pct=mp + input_data.capex_pct,
            insurance_annual=ia,
            utilities_monthly=o.utilities_monthly,
            landscaping_annual=o.landscaping_annual,
            pest_control_annual=o.pest_control_annual,
            appreciation_rate=a.appreciation_rate,
            rent_growth_rate=a.rent_growth_rate,
            expense_growth_rate=a.expense_growth_rate,
            hoa_monthly=input_data.hoa_monthly,
        )

        arv = input_data.arv or input_data.purchase_price
        sqft = input_data.sqft or 1
        annual_gross_rent = result["annual_gross_rent"]
        arv_psf = arv / sqft if sqft > 0 else 0
        price_psf = input_data.purchase_price / sqft if sqft > 0 else 0
        rehab_psf = input_data.rehab_costs / sqft if sqft > 0 else 0
        equity = arv - input_data.purchase_price
        equity_after_rehab = equity - input_data.rehab_costs
        total_cash_needed = result["total_cash_required"] + input_data.rehab_costs
        maintenance_only = annual_gross_rent * input_data.maintenance_pct
        capex_reserve = annual_gross_rent * input_data.capex_pct
        mao = (arv * 0.70) - input_data.rehab_costs
        annual_cash_flow = result["annual_cash_flow"]
        coc_return = (annual_cash_flow / total_cash_needed * 100) if total_cash_needed > 0 else 0

        return {
            "gross_income": result["effective_gross_income"], "annual_gross_rent": result["annual_gross_rent"],
            "vacancy_loss": result["vacancy_loss"],
            "gross_expenses": result["total_operating_expenses"], "property_taxes": result["property_taxes"],
            "insurance": result["insurance"], "property_management": result["property_management"],
            "maintenance": result["maintenance"], "maintenance_only": maintenance_only,
            "capex": capex_reserve, "hoa_fees": result["hoa_fees"],
            "loan_amount": result["loan_amount"], "down_payment": result["down_payment"],
            "closing_costs": result["closing_costs"], "monthly_payment": result["monthly_pi"],
            "annual_debt_service": result["annual_debt_service"],
            "noi": result["noi"], "monthly_cash_flow": result["monthly_cash_flow"],
            "annual_cash_flow": result["annual_cash_flow"],
            "cap_rate": result["cap_rate"] * 100, "cash_on_cash_return": coc_return,
            "dscr": result["dscr"], "grm": result["grm"], "one_percent_rule": result["one_percent_rule"],
            "arv": arv, "arv_psf": arv_psf, "price_psf": price_psf, "rehab_psf": rehab_psf,
            "equity": equity, "equity_after_rehab": equity_after_rehab, "mao": mao,
            "total_cash_needed": total_cash_needed,
            "ltv": (result["loan_amount"] / input_data.purchase_price * 100) if input_data.purchase_price > 0 else 0,
            "deal_score": min(100, max(0, round(
                50 +
                (15 if result["cap_rate"] >= 0.08 else 10 if result["cap_rate"] >= 0.06 else 0) +
                (15 if coc_return >= 10 else 10 if coc_return >= 8 else 0) +
                (10 if result["dscr"] >= 1.25 else 0) +
                (10 if result["one_percent_rule"] else 0)
            ))),
        }
    except Exception as e:
        logger.error(f"LTR worksheet calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/worksheet/str/calculate")
async def calculate_str_worksheet(input_data: STRWorksheetInput, db: DbSession):
    """Calculate STR worksheet metrics."""
    try:
        a = await resolve_assumptions(db)
        f, o, s = a.financing, a.operating, a.str_assumptions
        dp = input_data.down_payment_pct if input_data.down_payment_pct is not None else f.down_payment_pct
        ir = input_data.interest_rate if input_data.interest_rate is not None else f.interest_rate
        lt = input_data.loan_term_years if input_data.loan_term_years is not None else f.loan_term_years
        mp = input_data.maintenance_pct if input_data.maintenance_pct is not None else o.maintenance_pct
        fb = input_data.furnishing_budget if input_data.furnishing_budget is not None else s.furniture_setup_cost
        pfp = input_data.platform_fees_pct if input_data.platform_fees_pct is not None else s.platform_fees_pct
        pmp = input_data.property_management_pct if input_data.property_management_pct is not None else s.str_management_pct
        cpt = input_data.cleaning_cost_per_turn if input_data.cleaning_cost_per_turn is not None else s.cleaning_cost_per_turnover
        cfr = input_data.cleaning_fee_revenue if input_data.cleaning_fee_revenue is not None else s.cleaning_fee_revenue
        abl = input_data.avg_booking_length if input_data.avg_booking_length is not None else s.avg_length_of_stay_days
        sm = input_data.supplies_monthly if input_data.supplies_monthly is not None else s.supplies_monthly
        um = input_data.utilities_monthly if input_data.utilities_monthly is not None else o.utilities_monthly
        ia = input_data.insurance_annual if input_data.insurance_annual is not None else input_data.purchase_price * s.str_insurance_pct

        result = calculate_str(
            purchase_price=input_data.purchase_price,
            average_daily_rate=input_data.average_daily_rate,
            occupancy_rate=input_data.occupancy_rate,
            property_taxes_annual=input_data.property_taxes_annual or (input_data.purchase_price * 0.012),
            down_payment_pct=dp,
            interest_rate=ir,
            loan_term_years=lt,
            closing_costs_pct=input_data.closing_costs / input_data.purchase_price if input_data.closing_costs > 0 else f.closing_costs_pct,
            furniture_setup_cost=fb,
            platform_fees_pct=pfp,
            str_management_pct=pmp,
            cleaning_cost_per_turnover=cpt,
            cleaning_fee_revenue=cfr,
            avg_length_of_stay_days=abl,
            supplies_monthly=sm,
            additional_utilities_monthly=um,
            insurance_annual=ia,
            maintenance_annual=input_data.purchase_price * (mp + input_data.capex_pct),
            landscaping_annual=o.landscaping_annual,
            pest_control_annual=o.pest_control_annual,
        )

        supplies_annual = input_data.supplies_monthly * 12
        utilities_annual = input_data.utilities_monthly * 12
        maintenance_annual = input_data.purchase_price * input_data.maintenance_pct
        capex_annual = input_data.purchase_price * input_data.capex_pct
        gross_revenue = result["total_gross_revenue"]
        noi = result["noi"]
        annual_debt_service = result["annual_debt_service"]
        total_cash_needed = result["total_cash_required"]
        list_price = input_data.list_price or (input_data.purchase_price * 1.03)
        income_value = input_data.purchase_price * (annual_debt_service / noi) if noi > 0 else 0
        target_cash_flow = total_cash_needed * 0.10
        ten_coc_price = (
            input_data.purchase_price - ((target_cash_flow - (noi - annual_debt_service)) / 0.25)
            if total_cash_needed > 0 else 0
        )
        mao_price = gross_revenue * 7
        discount_percent = ((list_price - input_data.purchase_price) / list_price * 100) if list_price > 0 else 0
        base_occ_pct = input_data.occupancy_rate * 100
        seasonality = {
            "summer": min(95, base_occ_pct + 15), "spring": min(95, base_occ_pct + 5),
            "fall": max(30, base_occ_pct - 5), "winter": max(30, base_occ_pct - 15),
        }
        cap_rate_pct = result["cap_rate"] * 100
        coc_pct = result["cash_on_cash_return"] * 100
        deal_score = 50
        if cap_rate_pct >= 10: deal_score += 15
        elif cap_rate_pct >= 8: deal_score += 10
        if coc_pct >= 15: deal_score += 15
        elif coc_pct >= 10: deal_score += 10
        if result["dscr"] >= 1.25: deal_score += 10
        if result["break_even_occupancy"] <= 0.6: deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))

        return {
            "gross_revenue": gross_revenue, "rental_revenue": result["rental_revenue"],
            "cleaning_fee_revenue": result["cleaning_fee_revenue"], "nights_occupied": result["nights_occupied"],
            "num_bookings": result["num_bookings"], "revpar": result["revenue_per_available_night"],
            "gross_expenses": result["total_operating_expenses"], "platform_fees": result["platform_fees"],
            "str_management": result["str_management"], "cleaning_costs": result["cleaning_costs"],
            "property_taxes": result["property_taxes"], "insurance": result["insurance"],
            "supplies": supplies_annual, "utilities": utilities_annual,
            "maintenance": maintenance_annual, "capex": capex_annual,
            "noi": result["noi"], "monthly_cash_flow": result["monthly_cash_flow"],
            "annual_cash_flow": result["annual_cash_flow"],
            "cap_rate": cap_rate_pct, "cash_on_cash_return": coc_pct,
            "dscr": result["dscr"], "break_even_occupancy": result["break_even_occupancy"] * 100,
            "deal_score": deal_score,
            "loan_amount": result["loan_amount"], "monthly_payment": result["monthly_pi"],
            "annual_debt_service": annual_debt_service, "total_cash_needed": total_cash_needed,
            "list_price": list_price, "income_value": income_value,
            "target_coc_price": ten_coc_price, "mao_price": mao_price,
            "discount_percent": discount_percent, "seasonality": seasonality,
        }
    except Exception as e:
        logger.error(f"STR worksheet calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/worksheet/brrrr/calculate")
async def calculate_brrrr_worksheet(input_data: BRRRRWorksheetInput, db: DbSession):
    """Calculate BRRRR worksheet metrics."""
    try:
        a = await resolve_assumptions(db)
        purchase_costs_pct = input_data.purchase_costs / input_data.purchase_price if input_data.purchase_costs > 0 else a.financing.closing_costs_pct
        down_payment_pct = (1 - (input_data.loan_to_cost_pct / 100)) if input_data.loan_to_cost_pct is not None else input_data.down_payment_pct
        monthly_holding = (input_data.purchase_price * a.rehab.holding_costs_pct) / 12

        result = calculate_brrrr(
            market_value=input_data.purchase_price, arv=input_data.arv,
            monthly_rent_post_rehab=input_data.monthly_rent,
            property_taxes_annual=input_data.property_taxes_annual,
            purchase_discount_pct=0, down_payment_pct=down_payment_pct,
            interest_rate=input_data.interest_rate, loan_term_years=1,
            closing_costs_pct=purchase_costs_pct, renovation_budget=input_data.rehab_costs,
            contingency_pct=a.rehab.contingency_pct,
            holding_period_months=input_data.holding_months,
            monthly_holding_costs=monthly_holding,
            refinance_ltv=input_data.refi_ltv, refinance_interest_rate=input_data.refi_interest_rate,
            refinance_term_years=input_data.refi_loan_term, refinance_closing_costs=input_data.refi_closing_costs,
            vacancy_rate=input_data.vacancy_rate,
            operating_expense_pct=input_data.property_management_pct + input_data.maintenance_pct + input_data.capex_pct,
            insurance_annual=input_data.insurance_annual,
        )

        sqft = input_data.sqft or 1
        total_rehab = result["renovation_budget"] + result["contingency"]
        all_in_cost = input_data.purchase_price + total_rehab + input_data.purchase_costs
        all_in_pct_arv = (all_in_cost / input_data.arv * 100) if input_data.arv > 0 else 0
        initial_loan_amount = result["initial_loan_amount"]
        loan_to_cost = (initial_loan_amount / (input_data.purchase_price + input_data.rehab_costs)) * 100 if (input_data.purchase_price + input_data.rehab_costs) > 0 else 0
        loan_to_cost_pct = input_data.loan_to_cost_pct or loan_to_cost
        points_cost = initial_loan_amount * (input_data.points / 100)
        cash_to_close = result["down_payment"] + input_data.purchase_costs + points_cost
        annual_interest = initial_loan_amount * input_data.interest_rate
        holding_interest = annual_interest * (input_data.holding_months / 12)
        holding_taxes = input_data.property_taxes_annual * (input_data.holding_months / 12)
        holding_insurance = input_data.insurance_annual * (input_data.holding_months / 12)
        holding_utilities = input_data.utilities_monthly * input_data.holding_months
        total_holding_costs = holding_interest + holding_taxes + holding_insurance + holding_utilities
        cash_out_at_refi = result["cash_out_at_refinance"]
        total_cash_invested = result["down_payment"] + input_data.purchase_costs + points_cost + total_rehab + total_holding_costs
        cash_left_in_deal = total_cash_invested - cash_out_at_refi
        annual_gross_rent = result["annual_gross_rent"]
        vacancy_loss = annual_gross_rent * input_data.vacancy_rate
        effective_income = annual_gross_rent - vacancy_loss
        property_management = effective_income * input_data.property_management_pct
        maintenance = effective_income * input_data.maintenance_pct
        capex = effective_income * input_data.capex_pct
        total_expenses = input_data.property_taxes_annual + input_data.insurance_annual + property_management + maintenance + capex
        noi = effective_income - total_expenses
        annual_debt_service = result["new_monthly_pi"] * 12
        annual_cash_flow = noi - annual_debt_service
        cap_rate_arv = (noi / input_data.arv * 100) if input_data.arv > 0 else 0
        cash_on_cash_return = (annual_cash_flow / cash_left_in_deal * 100) if cash_left_in_deal > 0 else float('inf')
        return_on_equity = (annual_cash_flow / result["equity_position"] * 100) if result["equity_position"] > 0 else 0
        total_roi_year1 = ((annual_cash_flow + result["equity_position"]) / total_cash_invested * 100) if total_cash_invested > 0 else 0
        deal_score = 50
        if cash_left_in_deal <= 0: deal_score += 20
        elif cash_left_in_deal <= total_cash_invested * 0.25: deal_score += 10
        if annual_cash_flow > 0: deal_score += 15
        if all_in_pct_arv <= 75: deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))

        return {
            "purchase_price": result["purchase_price"], "purchase_costs": input_data.purchase_costs,
            "total_rehab": total_rehab, "holding_costs": total_holding_costs,
            "holding_interest": holding_interest, "holding_taxes": holding_taxes,
            "holding_insurance": holding_insurance, "holding_utilities": holding_utilities,
            "all_in_cost": all_in_cost, "loan_to_cost_pct": loan_to_cost_pct,
            "loan_amount": initial_loan_amount, "cash_to_close": cash_to_close,
            "points_cost": points_cost, "total_cash_invested": total_cash_invested,
            "refinance_loan_amount": result["refinance_loan_amount"], "cash_out": cash_out_at_refi,
            "cash_left_in_deal": cash_left_in_deal, "refinance_costs": result["refinance_costs"],
            "payoff_old_loan": result["original_loan_payoff"],
            "annual_gross_rent": annual_gross_rent, "vacancy_loss": vacancy_loss,
            "effective_income": effective_income, "property_taxes": input_data.property_taxes_annual,
            "insurance": input_data.insurance_annual, "property_management": property_management,
            "maintenance": maintenance, "capex": capex, "total_expenses": total_expenses,
            "noi": noi, "monthly_cash_flow": annual_cash_flow / 12, "annual_cash_flow": annual_cash_flow,
            "annual_debt_service": annual_debt_service,
            "cap_rate_arv": cap_rate_arv, "cash_on_cash_return": cash_on_cash_return,
            "return_on_equity": return_on_equity, "total_roi_year1": total_roi_year1,
            "equity_position": result["equity_position"], "all_in_pct_arv": all_in_pct_arv,
            "infinite_roi_achieved": cash_left_in_deal <= 0, "deal_score": deal_score,
            "arv": input_data.arv, "arv_psf": (input_data.arv / sqft) if sqft > 0 else 0,
            "price_psf": (input_data.purchase_price / sqft) if sqft > 0 else 0,
            "rehab_psf": (input_data.rehab_costs / sqft) if sqft > 0 else 0,
            "equity_created": input_data.arv - all_in_cost,
        }
    except Exception as e:
        logger.error(f"BRRRR worksheet calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/worksheet/flip/calculate")
async def calculate_flip_worksheet(input_data: FlipWorksheetInput):
    """Calculate Fix & Flip worksheet metrics."""
    try:
        purchase_costs_pct = input_data.purchase_costs / input_data.purchase_price if input_data.purchase_costs > 0 else 0.03
        result = calculate_flip(
            market_value=input_data.purchase_price, arv=input_data.arv, purchase_discount_pct=0,
            hard_money_ltv=1 - input_data.down_payment_pct, hard_money_rate=input_data.interest_rate,
            closing_costs_pct=purchase_costs_pct, inspection_costs=input_data.inspection_costs,
            renovation_budget=input_data.rehab_costs, contingency_pct=input_data.contingency_pct,
            holding_period_months=input_data.holding_months,
            property_taxes_annual=input_data.property_taxes_annual,
            insurance_annual=input_data.insurance_annual,
            utilities_monthly=input_data.utilities_monthly,
            security_maintenance_monthly=input_data.dumpster_monthly,
            selling_costs_pct=input_data.selling_costs_pct,
            capital_gains_rate=input_data.capital_gains_rate,
        )

        loan_amount = result["hard_money_loan"]
        points_cost = loan_amount * (input_data.points / 100)
        loan_to_cost_pct = (loan_amount / (input_data.purchase_price + input_data.rehab_costs)) * 100 if (input_data.purchase_price + input_data.rehab_costs) > 0 else 0
        if input_data.loan_type == "amortizing":
            monthly_payment = calculate_monthly_mortgage(loan_amount, input_data.interest_rate, 30)
        else:
            monthly_payment = (loan_amount * input_data.interest_rate) / 12
        monthly_taxes = input_data.property_taxes_annual / 12
        monthly_insurance = input_data.insurance_annual / 12
        monthly_holding_base = monthly_payment + monthly_taxes + monthly_insurance + input_data.utilities_monthly + input_data.dumpster_monthly
        total_holding_costs = monthly_holding_base * input_data.holding_months
        total_renovation = result["total_renovation"]
        all_in_cost = input_data.purchase_price + total_renovation + input_data.purchase_costs
        purchase_rehab_cost = input_data.purchase_price + input_data.rehab_costs
        income_value = result["minimum_sale_for_breakeven"]
        target_fifteen_all_in = (input_data.arv * 0.85) - input_data.rehab_costs - input_data.purchase_costs
        total_cash_required = result["down_payment"] + input_data.purchase_costs + input_data.inspection_costs + points_cost + total_renovation + total_holding_costs
        total_project_cost = input_data.purchase_price + input_data.purchase_costs + input_data.inspection_costs + total_renovation + total_holding_costs
        gross_profit = input_data.arv - total_project_cost
        net_profit_before_tax = result["net_sale_proceeds"] - loan_amount - total_cash_required
        capital_gains_tax = max(0, net_profit_before_tax * input_data.capital_gains_rate)
        net_profit_after_tax = net_profit_before_tax - capital_gains_tax
        roi = net_profit_before_tax / total_cash_required if total_cash_required > 0 else 0
        annualized_roi = roi * (12 / input_data.holding_months) if input_data.holding_months > 0 else 0
        profit_margin = net_profit_before_tax / input_data.arv if input_data.arv > 0 else 0
        roi_pct = roi * 100
        annualized_roi_pct = annualized_roi * 100
        profit_margin_pct = profit_margin * 100
        deal_score = 50
        if roi_pct > 0: deal_score += min(25, roi_pct / 4)
        if purchase_rehab_cost < input_data.arv * 0.75: deal_score += 15
        if net_profit_before_tax > 15000: deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))

        return {
            "purchase_price": result["purchase_price"], "purchase_costs": input_data.purchase_costs,
            "inspection_costs": input_data.inspection_costs, "points_cost": points_cost,
            "total_renovation": total_renovation, "total_holding_costs": total_holding_costs,
            "total_project_cost": total_project_cost, "total_cash_required": total_cash_required,
            "loan_amount": loan_amount, "loan_to_cost_pct": loan_to_cost_pct,
            "monthly_payment": monthly_payment, "holding_months": input_data.holding_months,
            "arv": input_data.arv, "selling_costs": result["total_selling_costs"],
            "net_sale_proceeds": result["net_sale_proceeds"], "loan_repayment": loan_amount,
            "gross_profit": gross_profit, "net_profit_before_tax": net_profit_before_tax,
            "net_profit_after_tax": net_profit_after_tax,
            "roi": roi_pct, "annualized_roi": annualized_roi_pct, "profit_margin": profit_margin_pct,
            "meets_70_rule": result["meets_70_rule"], "mao": result["seventy_pct_max_price"],
            "deal_score": deal_score,
            "all_in_cost": all_in_cost, "purchase_rehab_cost": purchase_rehab_cost,
            "income_value": income_value, "target_fifteen_all_in": target_fifteen_all_in,
        }
    except Exception as e:
        logger.error(f"Flip worksheet calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/worksheet/househack/calculate")
async def calculate_househack_worksheet(input_data: HouseHackWorksheetInput):
    """Calculate House Hack worksheet metrics."""
    try:
        total_rent = sum(input_data.unit_rents)
        rooms_rented = sum(1 for r in input_data.unit_rents if r > 0)
        avg_rent = total_rent / rooms_rented if rooms_rented > 0 else 0

        result = calculate_house_hack(
            purchase_price=input_data.purchase_price, monthly_rent_per_room=avg_rent,
            rooms_rented=rooms_rented, property_taxes_annual=input_data.property_taxes_annual,
            owner_unit_market_rent=input_data.owner_market_rent,
            down_payment_pct=input_data.down_payment_pct, interest_rate=input_data.interest_rate,
            loan_term_years=input_data.loan_term_years,
            closing_costs_pct=input_data.closing_costs / input_data.purchase_price if input_data.closing_costs > 0 else 0.03,
            fha_mip_rate=input_data.pmi_rate, insurance_annual=input_data.insurance_annual,
            utilities_shared_monthly=input_data.utilities_monthly,
            maintenance_monthly=input_data.maintenance_monthly + input_data.capex_monthly,
        )

        maintenance_monthly = total_rent * input_data.maintenance_pct if input_data.maintenance_monthly == 0 else input_data.maintenance_monthly
        capex_monthly = total_rent * input_data.capex_pct if input_data.capex_monthly == 0 else input_data.capex_monthly
        monthly_taxes = input_data.property_taxes_annual / 12
        monthly_insurance = input_data.insurance_annual / 12
        monthly_pmi = (result["loan_amount"] * input_data.pmi_rate) / 12
        monthly_piti = result["monthly_pi"] + monthly_pmi
        effective_rental_income = total_rent * (1 - input_data.vacancy_rate)
        total_monthly_expenses = monthly_taxes + monthly_insurance + maintenance_monthly + capex_monthly + input_data.utilities_monthly
        your_housing_cost = monthly_piti + total_monthly_expenses - effective_rental_income
        savings_vs_renting = input_data.owner_market_rent - your_housing_cost
        full_rental_income = (total_rent + input_data.owner_market_rent) * (1 - input_data.vacancy_rate)
        full_rental_noi = full_rental_income * 12 - (total_monthly_expenses * 12)
        full_rental_cash_flow = full_rental_noi - (monthly_piti * 12)
        moveout_cap_rate = (full_rental_noi / input_data.purchase_price * 100) if input_data.purchase_price > 0 else 0
        list_price = input_data.list_price or (input_data.purchase_price * 1.056)
        income_value = input_data.purchase_price + ((monthly_piti + total_monthly_expenses - effective_rental_income) * 12 / 0.08)
        target_coc_price = input_data.purchase_price * 0.93
        fha_max_price = input_data.fha_max_price or 472030

        return {
            "your_housing_cost": your_housing_cost, "rental_income": effective_rental_income,
            "total_monthly_expenses": total_monthly_expenses, "savings_vs_renting": savings_vs_renting,
            "full_rental_income": full_rental_income, "full_rental_cash_flow": full_rental_cash_flow / 12,
            "full_rental_annual": full_rental_cash_flow, "moveout_cap_rate": moveout_cap_rate,
            "loan_amount": result["loan_amount"], "monthly_payment": result["monthly_pi"],
            "monthly_pmi": monthly_pmi, "monthly_piti": monthly_piti,
            "down_payment": result["down_payment"], "closing_costs": result["closing_costs"],
            "total_cash_needed": result["total_cash_required"],
            "monthly_taxes": monthly_taxes, "monthly_insurance": monthly_insurance,
            "maintenance_monthly": maintenance_monthly, "capex_monthly": capex_monthly,
            "utilities_monthly": input_data.utilities_monthly, "total_rent": total_rent,
            "housing_offset": result["housing_cost_offset_pct"] * 100,
            "coc_return": (full_rental_cash_flow / result["total_cash_required"] * 100) if result["total_cash_required"] > 0 else 0,
            "deal_score": min(100, max(0, round(
                50 +
                (20 if your_housing_cost <= 0 else 10 if your_housing_cost <= 500 else 0) +
                (15 if savings_vs_renting >= 1000 else 10 if savings_vs_renting >= 500 else 0) +
                (15 if full_rental_cash_flow > 0 else 0)
            ))),
            "list_price": list_price, "income_value": income_value,
            "target_coc_price": target_coc_price, "fha_max_price": fha_max_price,
        }
    except Exception as e:
        logger.error(f"House Hack worksheet calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/worksheet/wholesale/calculate")
async def calculate_wholesale_worksheet(input_data: WholesaleWorksheetInput, db: DbSession):
    """Calculate Wholesale worksheet metrics."""
    try:
        mao = (input_data.arv * 0.70) - input_data.rehab_costs
        assignment_fee = input_data.investor_price - input_data.contract_price - input_data.marketing_costs
        post_tax_profit = assignment_fee * (1 - input_data.tax_rate)

        a = await resolve_assumptions(db)
        result = calculate_wholesale(
            arv=input_data.arv, estimated_rehab_costs=input_data.rehab_costs,
            assignment_fee=assignment_fee, marketing_costs=input_data.marketing_costs,
            earnest_money_deposit=input_data.earnest_money,
            arv_discount_pct=a.wholesale.target_purchase_discount_pct,
            days_to_close=a.wholesale.days_to_close,
        )

        investor_purchase_costs = input_data.investor_price * input_data.investor_purchase_costs_pct
        down_payment = input_data.investor_price * input_data.investor_down_payment_pct
        amount_financed = input_data.investor_price - down_payment
        total_cash_needed = down_payment + investor_purchase_costs + input_data.rehab_costs
        selling_costs = input_data.arv * input_data.selling_costs_pct
        sale_proceeds = input_data.arv - selling_costs
        investor_all_in = input_data.investor_price + input_data.rehab_costs + investor_purchase_costs
        investor_profit = sale_proceeds - investor_all_in
        investor_roi = (investor_profit / total_cash_needed * 100) if total_cash_needed > 0 else 0
        deal_score = 50
        if assignment_fee > 5000: deal_score += 15
        if assignment_fee > 10000: deal_score += 10
        if investor_roi > 20: deal_score += 15
        if input_data.investor_price < mao: deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))

        return {
            "contract_price": input_data.contract_price, "investor_price": input_data.investor_price,
            "assignment_fee": assignment_fee, "closing_costs": input_data.marketing_costs,
            "earnest_money": input_data.earnest_money, "mao": mao,
            "gross_profit": result["gross_profit"], "net_profit": result["net_profit"],
            "post_tax_profit": post_tax_profit, "roi": result["roi"] * 100,
            "total_cash_at_risk": result["total_cash_at_risk"],
            "investor_all_in": investor_all_in, "investor_purchase_costs": investor_purchase_costs,
            "down_payment": down_payment, "amount_financed": amount_financed,
            "total_cash_needed": total_cash_needed, "selling_costs": selling_costs,
            "sale_proceeds": sale_proceeds, "investor_profit": investor_profit, "investor_roi": investor_roi,
            "deal_viability": result["deal_viability"], "spread_available": result["spread_available"],
            "deal_score": deal_score,
        }
    except Exception as e:
        logger.error(f"Wholesale worksheet calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
