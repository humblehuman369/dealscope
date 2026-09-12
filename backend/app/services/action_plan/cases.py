"""Sort a property payload into one of the nine action-plan cases.

Takes the existing listing payload (a PropertyResponse dict, a nested
``listing`` block, or a flat ListingInfo-shaped dict) and returns one
``ActionPlanCase``. No AI. Never fabricates flags that aren't in the payload.

Priority (first match wins) — distress and special listing types beat the
generic on-market / off-market buckets:

    1. foreclosure or auction
    2. pre-foreclosure
    3. bank-owned
    4. FSBO
    5. expired or on-hold
    6. off-market absentee
    7. off-market owner-occupied
    8. on-market stale (DOM >= 30 or two or more price cuts)
    9. on-market
"""

from __future__ import annotations

from typing import Any

from app.models.action_plan import ActionPlanCase

STALE_DOM_DAYS = 30
STALE_PRICE_CUTS = 2

_FORECLOSURE_STATUS = frozenset(
    {
        "foreclosure",
        "foreclosed",
        "auction",
        "bank owned",
        "bank_owned",
        "bankowned",
        "reo",
    }
)
_PRE_FORECLOSURE_STATUS = frozenset(
    {
        "pre_foreclosure",
        "pre-foreclosure",
        "preforeclosure",
        "short sale",
        "short_sale",
        "shortsale",
    }
)
_FSBO_STATUS = frozenset(
    {
        "fsbo",
        "owner listed",
        "owner_listed",
        "for sale by owner",
        "for_sale_by_owner",
        "by owner",
        "by_owner",
    }
)
_EXPIRED_ON_HOLD_TOKENS = (
    "expired",
    "withdrawn",
    "on hold",
    "on_hold",
    "onhold",
    "temp off market",
    "temp_off_market",
    "temporarily off market",
    "cancelled",
    "canceled",
)
_ON_MARKET_STATUS = frozenset(
    {
        "for_sale",
        "pending",
        "active",
        "coming_soon",
        "coming soon",
        "new",
        "price reduced",
        "price_reduced",
        "listed",
        "for sale",
    }
)
_OFF_MARKET_STATUS = frozenset(
    {
        "off_market",
        "off-market",
        "off market",
        "sold",
        "recently_sold",
        "closed",
        "inactive",
        "for_rent",
        "for rent",
        "other",
    }
)


def listing_from_payload(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Accept a PropertyResponse, a ``listing`` block, or a flat listing dict."""
    if not payload:
        return {}
    listing = payload.get("listing")
    if isinstance(listing, dict):
        return listing
    return payload


def _norm(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower().replace("-", " ").replace("_", " ")


def _status_key(listing: dict[str, Any]) -> str:
    return _norm(listing.get("listing_status"))


def _truthy(value: Any) -> bool:
    return value is True


def _int_or_none(value: Any) -> int | None:
    if value is None or value is False:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _price_cut_count(listing: dict[str, Any]) -> int:
    counted = _int_or_none(listing.get("price_reduction_count"))
    if counted is not None:
        return counted
    history = listing.get("price_history")
    if not isinstance(history, list):
        return 0
    cuts = 0
    for event in history:
        if not isinstance(event, dict):
            continue
        rate = event.get("price_change_rate")
        try:
            if rate is not None and float(rate) < 0:
                cuts += 1
                continue
        except (TypeError, ValueError):
            pass
        label = _norm(event.get("event"))
        if "price change" in label or "price cut" in label or "price reduc" in label:
            # A "Price change" with no rate is still a cut when the event
            # name says so — we never invent a count from missing data.
            if "increase" not in label:
                cuts += 1
    return cuts


def _is_foreclosure_or_auction(listing: dict[str, Any]) -> bool:
    if _truthy(listing.get("is_foreclosure")) or _truthy(listing.get("is_auction")):
        return True
    status = _status_key(listing)
    seller = _norm(listing.get("seller_type"))
    return status in _FORECLOSURE_STATUS or seller in {"foreclosure", "auction"}


def _is_pre_foreclosure(listing: dict[str, Any]) -> bool:
    if _truthy(listing.get("is_pre_foreclosure")):
        return True
    status = _status_key(listing)
    seller = _norm(listing.get("seller_type"))
    return status in _PRE_FORECLOSURE_STATUS or seller in {"preforeclosure", "pre foreclosure"}


def _is_bank_owned(listing: dict[str, Any]) -> bool:
    if _truthy(listing.get("is_bank_owned")):
        return True
    status = _status_key(listing)
    seller = _norm(listing.get("seller_type"))
    return status in {"bank owned", "reo"} or seller in {"bankowned", "bank owned", "reo"}


def _is_fsbo(listing: dict[str, Any]) -> bool:
    if _truthy(listing.get("is_fsbo")):
        return True
    status = _status_key(listing)
    seller = _norm(listing.get("seller_type"))
    return status in _FSBO_STATUS or seller in {"fsbo"}


def _is_expired_or_on_hold(listing: dict[str, Any]) -> bool:
    status = _status_key(listing)
    if not status:
        return False
    compact = status.replace(" ", "")
    for token in _EXPIRED_ON_HOLD_TOKENS:
        if token.replace(" ", "") in compact or token in status:
            return True
    return False


def _is_on_market(listing: dict[str, Any]) -> bool:
    status = _status_key(listing)
    if status in _ON_MARKET_STATUS or status in _FSBO_STATUS:
        return True
    if status in _OFF_MARKET_STATUS:
        return False
    if status in _FORECLOSURE_STATUS or status in _PRE_FORECLOSURE_STATUS:
        return False
    # ``is_off_market`` defaults to True on ListingInfo — do not treat the
    # default as a real off-market signal when listing_status says listed.
    if _truthy(listing.get("is_off_market")):
        return False
    if listing.get("is_off_market") is False:
        return True
    return False


def _is_absentee(listing: dict[str, Any]) -> bool:
    if _truthy(listing.get("is_absentee_owner")):
        return True
    if listing.get("is_owner_occupied") is False:
        return True
    return False


def _is_stale(listing: dict[str, Any]) -> bool:
    dom = _int_or_none(listing.get("days_on_market"))
    if dom is not None and dom >= STALE_DOM_DAYS:
        return True
    return _price_cut_count(listing) >= STALE_PRICE_CUTS


def sort_case(payload: dict[str, Any] | None) -> ActionPlanCase:
    """Return the single case for this property payload."""
    listing = listing_from_payload(payload)

    if _is_foreclosure_or_auction(listing):
        return ActionPlanCase.FORECLOSURE_OR_AUCTION
    if _is_pre_foreclosure(listing):
        return ActionPlanCase.PRE_FORECLOSURE
    if _is_bank_owned(listing):
        return ActionPlanCase.BANK_OWNED
    if _is_fsbo(listing):
        return ActionPlanCase.FSBO
    if _is_expired_or_on_hold(listing):
        return ActionPlanCase.EXPIRED_OR_ON_HOLD
    if not _is_on_market(listing):
        if _is_absentee(listing):
            return ActionPlanCase.OFF_MARKET_ABSENTEE
        return ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED
    if _is_stale(listing):
        return ActionPlanCase.ON_MARKET_STALE
    return ActionPlanCase.ON_MARKET


CASE_LABELS: dict[ActionPlanCase, str] = {
    ActionPlanCase.ON_MARKET: "On market",
    ActionPlanCase.ON_MARKET_STALE: "On market · stale",
    ActionPlanCase.EXPIRED_OR_ON_HOLD: "Expired or on hold",
    ActionPlanCase.OFF_MARKET_ABSENTEE: "Off market · absentee owner",
    ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED: "Off market · owner-occupied",
    ActionPlanCase.PRE_FORECLOSURE: "Pre-foreclosure",
    ActionPlanCase.FORECLOSURE_OR_AUCTION: "Foreclosure or auction",
    ActionPlanCase.BANK_OWNED: "Bank-owned",
    ActionPlanCase.FSBO: "For sale by owner",
}
