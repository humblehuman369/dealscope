"""
Scheduled-notification jobs.

The functions here are designed to be triggered by an external scheduler
(Vercel cron, GitHub Actions, k8s CronJob — anything that can hit an HTTPS
endpoint on a fixed cadence). The jobs router gates the endpoints behind
``settings.CRON_SECRET`` so only your scheduler can fire them.

Idempotency: these jobs don't track "last sent at" per user. Designing
them to be safe to call multiple times per day is the deployer's job —
just run the schedule once daily and you'll get one digest per user.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import SavedProperty
from app.models.task import PropertyTask
from app.services.push_notification_service import push_service

logger = logging.getLogger(__name__)


def _format_message(overdue: int, properties: int) -> tuple[str, str]:
    """Title + body for the digest push."""
    title = f"{overdue} overdue task{'s' if overdue != 1 else ''}"
    body = f"Across {properties} propert{'ies' if properties != 1 else 'y'} in your pipeline"
    return title, body


async def send_overdue_task_digests(db: AsyncSession) -> dict[str, int]:
    """Send one push per user who has at least one overdue open task.

    Returns a small dict suitable for logging / cron-monitor reporting:
        {users_targeted, users_with_devices_notified, errors}.

    The push service silently no-ops for users who:
      - have disabled the ``task_alerts`` category in their preferences, OR
      - have no active device tokens registered.
    Both are counted under ``users_targeted`` regardless.
    """
    now = datetime.now(UTC)

    # One round-trip: per-user counts of overdue open tasks + the distinct
    # property count. Using ``distinct`` on PropertyTask.id is a no-op (the
    # primary key is unique) but it's defensive against unexpected joins.
    result = await db.execute(
        select(
            SavedProperty.user_id,
            func.count(distinct(PropertyTask.id)).label("overdue"),
            func.count(distinct(PropertyTask.saved_property_id)).label("properties"),
        )
        .join(PropertyTask, PropertyTask.saved_property_id == SavedProperty.id)
        .where(
            PropertyTask.completed_at.is_(None),
            PropertyTask.due_date.is_not(None),
            PropertyTask.due_date < now,
        )
        .group_by(SavedProperty.user_id)
    )
    rows = result.all()

    users_targeted = len(rows)
    sent = 0
    errors = 0

    for user_id, overdue, properties in rows:
        if not overdue or not properties:
            continue
        title, body = _format_message(int(overdue), int(properties))
        try:
            await push_service.send_to_user(
                db,
                user_id,
                title=title,
                body=body,
                data={
                    "type": "overdue_tasks",
                    "overdue_count": int(overdue),
                    "property_count": int(properties),
                },
                category="task_alerts",
                channel_id="task-alerts",
            )
            sent += 1
        except Exception as exc:
            errors += 1
            logger.warning("Failed to send overdue digest to user %s: %s", user_id, exc)

    return {
        "users_targeted": users_targeted,
        "users_with_devices_notified": sent,
        "errors": errors,
    }
