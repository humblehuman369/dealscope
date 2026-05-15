"""
API v1 – current stable version.

All routers under this package are served at `/api/v1/...`.
Future versions (v2, v3) will live alongside this package.
"""

from app.api.v1.routers import get_all_routers

__all__ = ["get_all_routers"]
