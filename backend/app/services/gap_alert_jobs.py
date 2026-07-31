"""
Gap Alerts v1 — daily list-price re-check for pipeline properties.

For saved properties still in the pre-purchase funnel (prospecting, pursuing,
negotiating), re-fetch the property's current list price and compare it to the
last price we observed (falling back to the save-time snapshot). A meaningful
drop means the user's deal gap just improved — that's the single highest-value
moment to pull them back into the app, so we push a ``property_alerts``
notification and advance the stored baseline so the same drop never fires
twice.

Designed for the cron-gated jobs router (same model as
``send_overdue_task_digests``): run once daily. Each check is one
``PropertyService.search_property`` call (Redis-cached, 24h TTL), so
``max_checks`` caps provider spend per run.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import PropertyStatus, SavedProperty
from app.services.property_service import property_service
from app.services.push_notification_service import push_service

logger = logging.getLogger(__name__)

# Only pre-purchase deals: once it's owned/passed/archived a price change is noise.
WATCHED_STATUSES = (
    PropertyStatus.PROSPECTING,
    PropertyStatus.PURSUING,
    PropertyStatus.NEGOTIATING,
    PropertyStatus.UNDER_CONTRACT,
)

# Ignore sub-1% wiggle — relist rounding and feed noise, not a real reprice.
MIN_DROP_PCT = 0.01


def _snapshot_list_price(snapshot: dict[str, Any] | None) -> float | None:
    """Best-effort list price from the save-time snapshot (both key spellings)."""
    if not snapshot:
        return None
    for key in ("listPrice", "list_price"):
        value = snapshot.get(key)
        if isinstance(value, (int, float)) and value > 0:
            return float(value)
    return None


def _current_list_price(response: Any) -> float | None:
    """Current asking price from a fresh PropertyResponse (listing only —
    zestimate moves for modeling reasons, not seller decisions)."""
    listing = getattr(response, "listing", None)
    price = getattr(listing, "list_price", None) if listing else None
    if isinstance(price, (int, float)) and price > 0:
        return float(price)
    return None


def _format_alert(street: str, old_price: float, new_price: float) -> tuple[str, str]:
    drop_pct = (old_price - new_price) / old_price * 100
    title = f"Price drop: {street}"
    body = (
        f"${old_price:,.0f} → ${new_price:,.0f} ({drop_pct:.1f}% lower). "
        "Your deal gap just improved — rerun the numbers."
    )
    return title, body


async def send_gap_alerts(db: AsyncSession, *, max_checks: int = 25) -> dict[str, int]:
    """Check up to ``max_checks`` watched properties for list-price drops.

    Prioritizes the least-recently-checked properties so the whole watchlist
    rotates through over successive runs even when it exceeds ``max_checks``.

    Returns {checked, price_drops, alerts_sent, errors} for cron logging.
    """
    result = await db.execute(
        select(SavedProperty)
        .where(SavedProperty.status.in_(WATCHED_STATUSES))
        .order_by(SavedProperty.price_checked_at.asc().nulls_first())
        .limit(max_checks)
    )
    properties = list(result.scalars().all())

    now = datetime.now(UTC)
    checked = 0
    price_drops = 0
    alerts_sent = 0
    errors = 0

    for prop in properties:
        address = prop.full_address or ", ".join(
            [p for p in (prop.address_street, prop.address_city, prop.address_state, prop.address_zip) if p]
        )
        if not address:
            continue

        try:
            response = await property_service.search_property(address, zpid=prop.zpid)
        except Exception as exc:
            errors += 1
            logger.warning("Gap alert price check failed for %s: %s", prop.id, exc)
            continue

        checked += 1
        prop.price_checked_at = now

        current = _current_list_price(response)
        if current is None:
            # Delisted or off-market — nothing to compare; keep the old baseline.
            continue

        baseline = (
            float(prop.last_known_list_price)
            if prop.last_known_list_price is not None
            else _snapshot_list_price(prop.property_data_snapshot)
        )
        # Advance the baseline first so a failure to push doesn't re-alert forever.
        prop.last_known_list_price = Decimal(str(current))

        if baseline is None or current >= baseline * (1 - MIN_DROP_PCT):
            continue

        price_drops += 1
        title, body = _format_alert(prop.address_street, baseline, current)
        try:
            await push_service.send_to_user(
                db,
                prop.user_id,
                title=title,
                body=body,
                data={
                    "type": "gap_alert",
                    "saved_property_id": str(prop.id),
                    "old_price": baseline,
                    "new_price": current,
                },
                category="property_alerts",
                channel_id="property-alerts",
            )
            alerts_sent += 1
        except Exception as exc:
            errors += 1
            logger.warning("Failed to send gap alert for property %s: %s", prop.id, exc)

    await db.commit()

    return {
        "checked": checked,
        "price_drops": price_drops,
        "alerts_sent": alerts_sent,
        "errors": errors,
    }
