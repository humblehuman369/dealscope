"""Stripe vs App Store / Play Billing helpers.

Native shells send ``X-DGIQ-Client-Type: mobile``. Store IAP is recorded on
the subscription row via ``extra_data.billing_source = revenuecat`` so the
hourly sweeper can expire IAP without touching admin comps (no Stripe id and
no RevenueCat marker).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.billing import PlanType

logger = logging.getLogger(__name__)

NATIVE_IAP_REQUIRED_DETAIL = (
    "Subscriptions on iOS and Android must be purchased through the App Store or Google Play."
)

BILLING_SOURCE_REVENUECAT = "revenuecat"


def is_native_store_client(request: Request) -> bool:
    return (request.headers.get("x-dgiq-client-type") or "").lower() == "mobile"


def is_revenuecat_backed(subscription: Any) -> bool:
    extra = subscription.extra_data or {}
    if extra.get("billing_source") == BILLING_SOURCE_REVENUECAT:
        return True
    return bool(extra.get("last_revenuecat_event"))


def mark_revenuecat(subscription: Any, *, product_id: str | None = None) -> None:
    extra = dict(subscription.extra_data or {})
    extra["billing_source"] = BILLING_SOURCE_REVENUECAT
    if product_id:
        extra["iap_product_id"] = product_id
    subscription.extra_data = extra


def product_looks_annual(product_id: str | None) -> bool:
    if not product_id:
        return False
    lower = product_id.lower()
    return "annual" in lower or "yearly" in lower


def resolve_plan_type(subscription: Any) -> PlanType:
    if getattr(subscription.tier, "value", subscription.tier) != "pro":
        return PlanType.STARTER
    yearly_price = settings.STRIPE_PRICE_PRO_YEARLY
    if yearly_price and subscription.stripe_price_id == yearly_price:
        return PlanType.PRO_ANNUAL
    extra = subscription.extra_data or {}
    if product_looks_annual(extra.get("iap_product_id")):
        return PlanType.PRO_ANNUAL
    return PlanType.PRO_MONTHLY


async def cancel_billing_for_deleted_account(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Best-effort: stop Stripe and delete the RevenueCat subscriber before the user row goes away."""
    from app.services.billing_service import billing_service

    subscription = await billing_service.get_subscription(db, user_id)
    if subscription and subscription.stripe_subscription_id:
        ok, message = await billing_service.cancel_subscription(
            db,
            user_id,
            cancel_immediately=True,
            reason="account_deleted",
        )
        if not ok:
            logger.warning(
                "Account delete: Stripe cancel failed for user %s: %s",
                user_id,
                message,
            )

    rc_key = settings.REVENUECAT_API_KEY
    if not rc_key:
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.delete(
                f"https://api.revenuecat.com/v1/subscribers/{user_id}",
                headers={"Authorization": f"Bearer {rc_key}"},
            )
        if resp.status_code >= 400 and resp.status_code != 404:
            logger.warning(
                "Account delete: RevenueCat subscriber delete returned %s for user %s",
                resp.status_code,
                user_id,
            )
    except Exception:
        logger.warning("Account delete: RevenueCat subscriber delete failed for user %s", user_id, exc_info=True)
