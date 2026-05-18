"""Normalize financing rates for valuation (decimal vs percent, unset vs zero)."""

from app.core.defaults import FINANCING


def normalize_annual_rate(
    rate: float | None,
    *,
    fallback: float | None = None,
) -> float:
    """Return annual interest rate as decimal (e.g. 0.08 for 8%).

    - ``None`` or ``<= 0`` → ``fallback`` (or platform default); zero is treated as unset
      because investment loans are never priced at 0% in this model.
    - Values ``> 1`` are interpreted as percent (8 → 0.08).
  """
    base = fallback if fallback is not None else FINANCING.interest_rate
    if rate is None or rate <= 0:
        return base
    if rate > 1:
        rate = rate / 100
    return min(max(rate, 0.0), 0.30)
