"""Directory usage counters — trial view caps and paid export metering.

Tasks 3.3 / 3.4. All counting is server-side and atomic (Postgres upsert on
the unique (user, kind, period) key), so concurrent requests can never
double-spend a cap, and restarts never reset a meter.

Limits (plan defaults, confirmed in the task brief):
  - Trial record-detail opens: 25 per user per UTC day.
  - Paid CSV / print exports: 200 records per export, 1,000 records per
    monthly billing cycle ("resets on your billing date").
"""

from __future__ import annotations

import calendar
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.directory_usage import DirectoryUsageCounter
from app.models.subscription import Subscription

DAILY_DETAIL_VIEW_LIMIT = 25
EXPORT_MAX_RECORDS = 200
MONTHLY_EXPORT_RECORD_LIMIT = 1_000

KIND_DETAIL_VIEW = "detail_view"
KIND_EXPORT_RECORDS = "export_records"

VIEW_LIMIT_MESSAGE = "Daily view limit reached — resets tomorrow."
EXPORT_LIMIT_MESSAGE = "You've hit this month's export limit. It resets on your billing date."
EXPORTS_PAID_ONLY_MESSAGE = "Exports unlock with your first payment."


def daily_period_key(now: datetime | None = None) -> str:
    """UTC-date key for trial view caps — 'resets tomorrow' means UTC midnight."""
    return (now or datetime.now(UTC)).astimezone(UTC).date().isoformat()


def billing_cycle_key(subscription: Subscription | None, now: datetime | None = None) -> str:
    """Start date of the current *monthly* export cycle, anchored on the billing day.

    The plan's copy is "resets on your billing date": the cycle anchor is the
    day-of-month of ``current_period_start`` (clamped for short months), so a
    user billed on the 15th gets 15th → 15th export months. Annual subscribers
    still get a *monthly* meter on the same anchor day. Without a billing
    anchor (admin comps), calendar months apply.
    """
    now_utc = (now or datetime.now(UTC)).astimezone(UTC)
    anchor_day = 1
    if subscription is not None and subscription.current_period_start is not None:
        anchor_day = subscription.current_period_start.day

    def clamped(year: int, month: int) -> date:
        return date(year, month, min(anchor_day, calendar.monthrange(year, month)[1]))

    cycle_start = clamped(now_utc.year, now_utc.month)
    if now_utc.date() < cycle_start:
        prev_year, prev_month = (
            (now_utc.year - 1, 12) if now_utc.month == 1 else (now_utc.year, now_utc.month - 1)
        )
        cycle_start = clamped(prev_year, prev_month)
    return cycle_start.isoformat()


async def _increment_counter(
    db: AsyncSession,
    user_id: uuid.UUID,
    kind: str,
    period_key: str,
    amount: int,
) -> int:
    """Atomically add ``amount`` and return the post-increment total."""
    stmt = (
        pg_insert(DirectoryUsageCounter)
        .values(
            id=uuid.uuid4(),
            user_id=user_id,
            kind=kind,
            period_key=period_key,
            count=amount,
        )
        .on_conflict_do_update(
            constraint="uq_directory_usage_user_kind_period",
            set_={
                "count": DirectoryUsageCounter.count + amount,
                "updated_at": datetime.now(UTC),
            },
        )
        .returning(DirectoryUsageCounter.count)
    )
    result = await db.execute(stmt)
    total = int(result.scalar_one())
    await db.commit()
    return total


async def get_counter(
    db: AsyncSession,
    user_id: uuid.UUID,
    kind: str,
    period_key: str,
) -> int:
    stmt = select(DirectoryUsageCounter.count).where(
        DirectoryUsageCounter.user_id == user_id,
        DirectoryUsageCounter.kind == kind,
        DirectoryUsageCounter.period_key == period_key,
    )
    result = await db.execute(stmt)
    value = result.scalar_one_or_none()
    return int(value) if value is not None else 0


async def record_detail_view(db: AsyncSession, user_id: uuid.UUID) -> tuple[bool, int]:
    """Count one record-detail open for today. Returns (allowed, used_today).

    Increment-then-check keeps the operation atomic; a rejected request may
    push the counter past the limit, which only makes the cap stricter.
    """
    total = await _increment_counter(db, user_id, KIND_DETAIL_VIEW, daily_period_key(), 1)
    return total <= DAILY_DETAIL_VIEW_LIMIT, min(total, DAILY_DETAIL_VIEW_LIMIT)


async def get_export_usage(
    db: AsyncSession, user_id: uuid.UUID, subscription: Subscription | None
) -> int:
    """Records already exported in the current billing cycle."""
    return await get_counter(
        db, user_id, KIND_EXPORT_RECORDS, billing_cycle_key(subscription)
    )


async def add_export_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    subscription: Subscription | None,
    record_count: int,
) -> int:
    """Meter ``record_count`` exported records; returns the new cycle total."""
    return await _increment_counter(
        db, user_id, KIND_EXPORT_RECORDS, billing_cycle_key(subscription), record_count
    )
