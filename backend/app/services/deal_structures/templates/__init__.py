"""Deal-structure templates. Each module exposes ``solve(ctx)`` and ``ID``."""

from . import (
    assumable,
    fha_house_hack,
    larger_down,
    price_negotiation,
    rate_buydown,
    rent_uplift,
    seller_second_zero_balloon,
    sub2,
)

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
    "fha_house_hack",
    "larger_down",
    "price_negotiation",
    "rate_buydown",
    "rent_uplift",
    "seller_second_zero_balloon",
    "sub2",
]
