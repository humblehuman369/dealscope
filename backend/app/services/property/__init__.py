"""
Property domain services package.

This package decomposes the former monolithic PropertyService into focused,
single-responsibility modules:

- cache.py        – cache invalidation rules and helpers (pure functions)
- providers.py    – external data provider clients (RentCast, AXESSO, Redfin, etc.)
- valuation.py    – valuation aggregation and IQ estimate computation
- rental.py       – rental market statistics and comps
- export.py       – property export / proforma data shaping
- orchestrator.py – thin coordinator (PropertyService) that composes the above

The public API remains stable; existing imports of PropertyService continue to work.
"""

from app.services.property.cache import (
    _PROPERTY_CACHE_FORMULA_VERSION,
    _should_invalidate_cache,
    _strip_property_cache_meta,
)
from app.services.property.orchestrator import PropertyService

__all__ = [
    "_PROPERTY_CACHE_FORMULA_VERSION",
    "PropertyService",
    "_should_invalidate_cache",
    "_strip_property_cache_meta",
]
