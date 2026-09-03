"""
SavedMapSearch model — a stored map viewport (or drawn farm boundary) plus its
filters, optionally on an email alert schedule for new inventory.

Two design points carry the cost guardrails that make scheduled alerts
affordable, and both live on this table:

``alert_frequency`` is capped at daily/weekly rather than continuous, and
``last_alert_sent_at`` enforces that cap in the job itself — so a
misconfigured cron that fires hourly still cannot email an investor hourly.

``seen_address_keys`` is what makes an alert mean *new*. It holds the
canonical address keys observed on the previous run, so the job emails the
difference rather than the whole result set. It is trimmed to
``SEEN_KEYS_CAP`` with currently-listed keys retained first, which bounds the
row while never evicting a property that is still on the market (evicting one
would re-announce it as new).
"""

import enum
import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User

# Per-user ceiling. Every alert-enabled search is a scheduled provider query,
# so this is the per-user bound on what the cron can spend.
MAX_SAVED_SEARCHES_PER_USER = 25

# A viewport returns at most 500 rows, so this remembers roughly three runs'
# worth of turnover — long enough that a listing flickering out of one result
# set and back into the next is not announced twice.
SEEN_KEYS_CAP = 1500

# Enforced in the job, not just the schedule. The cron interval is the *upper*
# bound on how often we look; these are the lower bound on how often we email.
# Both sit slightly under their nominal period so a cron that drifts a few
# minutes later each day doesn't skip a send.
MIN_ALERT_INTERVAL: dict[str, timedelta] = {
    "daily": timedelta(hours=20),
    "weekly": timedelta(days=6),
}


class AlertFrequency(enum.StrEnum):
    """How often a saved search may email its owner about new inventory."""

    OFF = "off"
    DAILY = "daily"
    WEEKLY = "weekly"


class SavedMapSearch(Base):
    """A saved map search, optionally on a new-inventory email schedule."""

    __tablename__ = "saved_map_searches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Viewport bounds. Always present, including for polygon searches — the
    # polygon's bounding box is what gets queried, then clipped.
    north: Mapped[float] = mapped_column(Float, nullable=False)
    south: Mapped[float] = mapped_column(Float, nullable=False)
    east: Mapped[float] = mapped_column(Float, nullable=False)
    west: Mapped[float] = mapped_column(Float, nullable=False)

    # Drawn farm boundary as [[lat, lng], ...]; None for a plain viewport.
    polygon: Mapped[list[list[float]] | None] = mapped_column(JSONB, nullable=True)

    # The MapSearchRequest filter fields, stored as given so a saved search
    # replays exactly what the investor was looking at.
    filters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # values_callable so Postgres stores "off"/"daily"/"weekly" rather than
    # SQLAlchemy's default of the member *names*. The cron's partial index
    # predicate is written against these values.
    alert_frequency: Mapped[AlertFrequency] = mapped_column(
        SQLEnum(
            AlertFrequency,
            name="alertfrequency",
            values_callable=lambda enum_cls: [m.value for m in enum_cls],
        ),
        nullable=False,
        default=AlertFrequency.OFF,
    )

    # Null until the first alert run, which seeds the baseline without
    # emailing — otherwise the first alert would be "500 new listings".
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_alert_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    seen_address_keys: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    user: Mapped["User"] = relationship("User", backref="saved_map_searches")

    def is_alert_due(self, now: datetime) -> bool:
        """Whether enough time has passed to email this search again."""
        if self.alert_frequency == AlertFrequency.OFF:
            return False
        if self.last_alert_sent_at is None:
            return True
        interval = MIN_ALERT_INTERVAL.get(str(self.alert_frequency))
        if interval is None:
            return False
        return now - self.last_alert_sent_at >= interval

    def merge_seen_keys(self, current_keys: list[str]) -> list[str]:
        """Fold this run's keys into the remembered set, newest kept first.

        Currently-listed keys lead, so the trim only ever evicts properties
        that have already left the market.
        """
        current_unique = list(dict.fromkeys(current_keys))
        current_set = set(current_unique)
        retained = [k for k in (self.seen_address_keys or []) if k not in current_set]
        return (current_unique + retained)[:SEEN_KEYS_CAP]
