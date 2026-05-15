"""
API package for versioned routers.

This package enables clean API versioning (v1, v2, ...) without polluting the
top-level `app.routers` namespace.  All public routes should eventually live
under `app.api.vN.routers.*`.

Current active version: v1
"""

from app.api.v1 import get_all_routers as get_v1_routers

__all__ = ["get_v1_routers"]
