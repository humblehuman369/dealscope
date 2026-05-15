"""
External data provider clients for property information.

This module will contain the logic currently embedded in PropertyService:
- _fetch_raw_rentcast
- _fetch_raw_axesso / _unwrap_axesso_property
- _fetch_rentcast_provider, _fetch_zillow_provider, etc.
- Redfin, Realtor, Mashvisor adapters

Goal: isolate all network I/O and third-party API interaction so the
orchestrator can focus on coordination and the valuation/rental modules
can focus on business logic.
"""

from __future__ import annotations

# Placeholder – implementation will be migrated from property_service.py in
# subsequent steps of the Phase 2 refactor.
