"""Shared formatting helpers for deal-structure copy."""


def fmt_money(value: float) -> str:
    """Compact currency: $410K, $1.2M, $7,500."""
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    if abs(value) >= 10_000:
        return f"${round(value / 1000)}K"
    return f"${round(value):,}"


def fmt_money_precise(value: float) -> str:
    """Always show full dollars with thousands separator: $410,000."""
    return f"${round(value):,}"


def fmt_pct_delta(before: float, after: float) -> str:
    """Signed delta as '+6.1%' or '−6.1%'."""
    if before <= 0:
        return ""
    delta = (after - before) / before * 100
    sign = "+" if delta >= 0 else "−"
    return f"{sign}{abs(delta):.1f}%"


def fmt_money_delta(before: float, after: float) -> str:
    """Signed dollar delta as '+$25K' or '−$25K'."""
    delta = after - before
    sign = "+" if delta >= 0 else "−"
    return f"{sign}{fmt_money(abs(delta))}"


def fmt_monthly(value: float) -> str:
    """Monthly dollars with no decimals: $1,941/mo."""
    return f"${round(value):,}/mo"
