"""
Investment Strategy Calculators — package re-exports.

All public symbols are re-exported here so existing imports like
``from app.services.calculators import calculate_ltr`` continue to work.
"""

from app.services.calculators.brrrr import calculate_brrrr
from app.services.calculators.common import (
    CalculationInputError,
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
    calculate_grm,
    calculate_monthly_mortgage,
    calculate_noi,
    run_sensitivity_analysis,
    validate_financial_inputs,
)
from app.services.calculators.flip import calculate_flip
from app.services.calculators.house_hack import calculate_house_hack
from app.services.calculators.ltr import calculate_ltr, calculate_ltr_breakeven
from app.services.calculators.scoring import (
    AVAILABILITY_RANKINGS,
    calculate_deal_gap_score,
    calculate_deal_opportunity_score,
    calculate_dom_score,
    get_availability_ranking,
)
from app.services.calculators.seller_motivation import (
    calculate_seller_motivation,
    extract_condition_keywords,
)
from app.services.calculators.str_calc import calculate_str
from app.services.calculators.wholesale import calculate_wholesale

__all__ = [
    "AVAILABILITY_RANKINGS",
    "CalculationInputError",
    "calculate_brrrr",
    "calculate_cap_rate",
    "calculate_cash_on_cash",
    "calculate_deal_gap_score",
    "calculate_deal_opportunity_score",
    "calculate_dom_score",
    "calculate_dscr",
    "calculate_flip",
    "calculate_grm",
    "calculate_house_hack",
    "calculate_ltr",
    "calculate_ltr_breakeven",
    "calculate_monthly_mortgage",
    "calculate_noi",
    "calculate_seller_motivation",
    "calculate_str",
    "calculate_wholesale",
    "extract_condition_keywords",
    "get_availability_ranking",
    "run_sensitivity_analysis",
    "validate_financial_inputs",
]
