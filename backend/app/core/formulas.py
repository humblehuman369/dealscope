"""Core valuation formulas for DealGapIQ.

Pure functions. Optional default kwargs use ``FINANCING`` / ``OPERATING`` for
test and direct-call convenience; production paths should pass explicit values.

Calculation logic lives in ``app.core.valuation``; this module re-exports for
backward compatibility.
"""

import logging

from app.core.valuation.income_value import calculate_buy_price, estimate_income_value

logger = logging.getLogger(__name__)

__all__ = [
    "calculate_buy_price",
    "compute_market_price",
    "estimate_income_value",
]


def _clamp(value: float, lo: float, hi: float, name: str) -> float:
    if value < lo:
        logger.warning("Input '%s' = %s below minimum %s — clamped", name, value, lo)
        return lo
    if value > hi:
        logger.warning("Input '%s' = %s above maximum %s — clamped", name, value, hi)
        return hi
    return value


def compute_market_price(
    is_listed: bool,
    list_price: float | None,
    zestimate: float | None,
    current_value_avm: float | None = None,
    tax_assessed_value: float | None = None,
) -> float | None:
    """Compute Market Price for display and deal gap.

    Listed: Market Price = List Price.
    Off-market: Zestimate only (no blending).
    Sequential fallbacks when primary source unavailable.
    """
    if is_listed and list_price is not None and list_price > 0:
        return round(list_price)
    if zestimate is not None and zestimate > 0:
        return round(zestimate)
    if current_value_avm is not None and current_value_avm > 0:
        return round(current_value_avm)
    if tax_assessed_value is not None and tax_assessed_value > 0:
        return round(tax_assessed_value / 0.75)
    return None
