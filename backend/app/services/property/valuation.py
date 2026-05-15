"""
Valuation aggregation and IQ estimate computation.

This module will own:
- Normalization via DataNormalizer (from api_clients)
- _compute_iq_estimates logic
- Building ValuationData and provenance
- Any future weighted-average or outlier-filtering rules

It will be the single source of truth for "what is the best current value
and rental estimate for this property?"
"""

from __future__ import annotations

# Placeholder – implementation will be migrated from property_service.py
