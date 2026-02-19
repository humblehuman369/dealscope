"""
Investment Strategy Calculators — package re-exports.

All public symbols are re-exported here so existing imports like
``from app.services.calculators import calculate_ltr`` continue to work.
"""

from app.services.calculators.common import (
    CalculationInputError,
    validate_financial_inputs,
    calculate_monthly_mortgage,
    calculate_noi,
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
    calculate_grm,
    run_sensitivity_analysis,
)
from app.services.calculators.ltr import calculate_ltr, calculate_ltr_breakeven
from app.services.calculators.str_calc import calculate_str
from app.services.calculators.brrrr import calculate_brrrr
from app.services.calculators.flip import calculate_flip
from app.services.calculators.house_hack import calculate_house_hack
from app.services.calculators.wholesale import calculate_wholesale
from app.services.calculators.scoring import (
    AVAILABILITY_RANKINGS,
    get_availability_ranking,
    calculate_dom_score,
    calculate_deal_gap_score,
    calculate_deal_opportunity_score,
)
from app.services.calculators.seller_motivation import (
    calculate_seller_motivation,
    extract_condition_keywords,
)

__all__ = [
    "CalculationInputError",
    "validate_financial_inputs",
    "calculate_monthly_mortgage",
    "calculate_noi",
    "calculate_cap_rate",
    "calculate_cash_on_cash",
    "calculate_dscr",
    "calculate_grm",
    "run_sensitivity_analysis",
    "calculate_ltr",
    "calculate_ltr_breakeven",
    "calculate_str",
    "calculate_brrrr",
    "calculate_flip",
    "calculate_house_hack",
    "calculate_wholesale",
    "AVAILABILITY_RANKINGS",
    "get_availability_ranking",
    "calculate_dom_score",
    "calculate_deal_gap_score",
    "calculate_deal_opportunity_score",
    "calculate_seller_motivation",
    "extract_condition_keywords",
]
