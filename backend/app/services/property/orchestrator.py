"""
PropertyService orchestrator – thin coordinator for the property domain.

After Phase 2 completion this class will be < 700 LOC and will only:
- Hold references to CacheManager, ProviderAggregator, ValuationAggregator, etc.
- Implement the public `search_property` and `get_property_export_data` APIs
- Delegate all heavy lifting to the focused sub-modules

During the migration, this file will gradually receive code moved out of the
original monolithic property_service.py.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class PropertyService:
    """Main entry point for property search and analysis.

    After the full Phase 2 split, this class becomes a lightweight orchestrator
    that composes:
        - Cache layer (services.property.cache)
        - Provider clients (services.property.providers)
        - Valuation logic (services.property.valuation)
        - Rental intelligence (services.property.rental)
        - Export shaping (services.property.export)
    """

    def __init__(self, db: AsyncSession | None = None):
        # During migration the old implementation still lives in
        # property_service.py.  Once extraction is complete, this __init__
        # will wire the sub-components.
        self.db = db

    # Public API methods will be implemented here after migration.
    # For now the original PropertyService in property_service.py is still
    # the active implementation.
