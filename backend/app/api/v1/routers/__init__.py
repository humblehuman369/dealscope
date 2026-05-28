"""
API v1 router manifest.

This module is the single source of truth for which routers are exposed under
the `/api/v1` prefix.  During the Phase 2 transition it re-exports the
existing router modules so that the public surface remains unchanged.

Later, individual routers can be moved into this package (or kept in
`app.routers` with compatibility shims).
"""

import importlib
import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Router manifest for v1 – same logical routers as the legacy manifest,
# but now served under the versioned package.
_V1_ROUTER_MANIFEST: list[tuple[str, str]] = [
    ("Auth", "app.routers.auth"),
    ("Users", "app.routers.users"),
    ("Saved Properties", "app.routers.saved_properties"),
    ("Admin", "app.routers.admin"),
    ("Property", "app.routers.property"),
    ("Health", "app.routers.health"),
    ("Analytics", "app.routers.analytics"),
    ("Worksheet", "app.routers.worksheet"),
    ("Comparison", "app.routers.comparison"),
    ("LOI", "app.routers.loi"),
    ("Search History", "app.routers.search_history"),
    ("Reports", "app.routers.reports"),
    ("Proforma", "app.routers.proforma"),
    ("Documents", "app.routers.documents"),
    ("Billing", "app.routers.billing"),
    ("Buyer Directory", "app.routers.buyer_directory"),
    ("Buyers", "app.routers.buyers"),
    ("Saved Contacts", "app.routers.saved_contacts"),
    ("Sync", "app.routers.sync"),
    ("Defaults", "app.routers.defaults"),
    ("Devices", "app.routers.devices"),
    ("Map Search", "app.routers.map_search"),
    ("Rehab", "app.routers.rehab"),
    ("Jobs", "app.routers.jobs"),
]


def _try_load_router(name: str, import_path: str) -> APIRouter | None:
    """Import a router module, returning ``None`` on failure."""
    try:
        mod = importlib.import_module(import_path)
        logger.info(f"{name} router loaded successfully (v1)")
        return mod.router
    except Exception as e:
        logger.warning(f"{name} router failed to load: {e}")
        return None


def get_all_routers() -> list[tuple[str, APIRouter]]:
    """Load and return all v1 routers as ``(name, router)`` pairs."""
    loaded: list[tuple[str, APIRouter]] = []
    for name, path in _V1_ROUTER_MANIFEST:
        router = _try_load_router(name, path)
        if router is not None:
            loaded.append((name, router))
    return loaded
