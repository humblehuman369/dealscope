"""
Centralized router registry for DealScope API (legacy compatibility layer).

Phase 2: This module now re-exports the authoritative v1 manifest from
`app.api.v1.routers`.  Direct imports of `app.routers.get_all_routers` will
continue to work during the transition, but new code should import from
`app.api.v1`.
"""

from app.api.v1.routers import get_all_routers

__all__ = ["get_all_routers"]
