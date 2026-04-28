"""Deal-structure templates. Each module exposes a single ``solve(ctx)`` function."""

from app.services.deal_structures.templates import price_negotiation, rent_uplift, seller_second_zero_balloon

ALL_TEMPLATES = [
    price_negotiation,
    seller_second_zero_balloon,
    rent_uplift,
]

__all__ = ["ALL_TEMPLATES", "price_negotiation", "rent_uplift", "seller_second_zero_balloon"]
