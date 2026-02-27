"""
Centralized router registry for DealScope API.

All routers are registered here. ``main.py`` uses ``ALL_ROUTERS`` to
include them via a single loop with no special-casing.

Phase 2 Architecture Cleanup: eliminates the LOI prefix hack and
ad-hoc router list that previously lived in main.py.
"""

import importlib
import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────
# Router manifest — (display_name, module_path)
# Order matters: routers are registered in this order.
# ──────────────────────────────────────────────────

_ROUTER_MANIFEST: list[tuple[str, str]] = [
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
    ("Sync", "app.routers.sync"),
    ("Defaults", "app.routers.defaults"),
    ("Devices", "app.routers.devices"),
]


def _try_load_router(name: str, import_path: str) -> APIRouter | None:
    """Import a router module, returning ``None`` on failure."""
    try:
        mod = importlib.import_module(import_path)
        logger.info(f"{name} router loaded successfully")
        return mod.router
    except Exception as e:
        logger.warning(f"{name} router failed to load: {e}")
        return None


def get_all_routers() -> list[tuple[str, APIRouter]]:
    """Load and return all routers as ``(name, router)`` pairs.

    Routers that fail to import are silently skipped (logged as warnings).
    """
    loaded: list[tuple[str, APIRouter]] = []
    for name, path in _ROUTER_MANIFEST:
        router = _try_load_router(name, path)
        if router is not None:
            loaded.append((name, router))
    return loaded
