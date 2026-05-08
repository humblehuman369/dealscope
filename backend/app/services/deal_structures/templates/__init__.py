"""Deal-structure templates. Each module exposes ``solve(ctx)`` and ``ID``."""

from . import (
    assumable,
    blended_plan,
    fha_house_hack,
    headline_conventional_blend,
    larger_down,
    price_negotiation,
    rate_buydown,
    rent_uplift,
    seller_second_zero_balloon,
    sub2,
)

# ALL_TEMPLATES drives the four-path selector cascade. Templates that are
# invoked independently (blended_plan from the engine, headline_conventional_blend
# from the engine for the verdict-page headline) are intentionally excluded.
ALL_TEMPLATES = [
    price_negotiation,
    seller_second_zero_balloon,
    rent_uplift,
    sub2,
    rate_buydown,
    larger_down,
    assumable,
    fha_house_hack,
]

__all__ = [
    "ALL_TEMPLATES",
    "assumable",
    "blended_plan",
    "fha_house_hack",
    "headline_conventional_blend",
    "larger_down",
    "price_negotiation",
    "rate_buydown",
    "rent_uplift",
    "seller_second_zero_balloon",
    "sub2",
]
