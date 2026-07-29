"""The request flow both directories share.

`/api/lenders` and `/api/buyers` answer the same four questions — stats, a
filtered page, an export, one record — under the same access rules, the same
pagination cap and the same export meter. Only the filters, the columns and the
copy differ. Before this module those flows were two near-identical copies, which
is how the page cap ended up defined twice with nothing keeping the two in step.

Each directory supplies a :class:`DirectorySpec` describing what is genuinely
different; everything else happens here.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, TypeVar

from fastapi import HTTPException, Response, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.services.directory_export import build_csv, build_print_html
from app.services.directory_gates import require_paid_export, require_view_access
from app.services.directory_usage import (
    EXPORT_LIMIT_MESSAGE,
    EXPORT_MAX_RECORDS,
    MONTHLY_EXPORT_RECORD_LIMIT,
    add_export_usage,
    get_export_usage,
)
from app.services.entitlements import Entitlement, resolve_entitlement

logger = logging.getLogger(__name__)

# Plan spec: list pagination is capped at 25 records per page. One definition —
# it was previously declared in lenders_service and again in routers/buyers.
MAX_PAGE_SIZE = 25

T = TypeVar("T")


@dataclass(frozen=True)
class DirectorySpec:
    """What differs between the two directories.

    ``count_total`` is a callable rather than a number because it is only needed
    to fill in the teaser on a 403. Passing the count itself meant every
    authorised request paid for a ``COUNT(*)`` whose result was thrown away.
    """

    slug: str
    """Used for the export filename and log lines: "lenders", "buyers"."""

    export_title: str
    """Human title on the print export."""

    pro_message: str
    """Upgrade copy shown to a free user."""

    count_total: Callable[[AsyncSession], Awaitable[int]]

    export_headers: Sequence[str]

    export_row: Callable[[Any], Sequence[str]]
    """One record to one row of strings, in ``export_headers`` order."""


async def gate_view(db: AsyncSession, user: Any, spec: DirectorySpec) -> None:
    """Refuse anyone who is not a paid subscriber."""
    await require_view_access(
        db,
        user,
        pro_message=spec.pro_message,
        count_total=lambda: spec.count_total(db),
    )


async def stats_teaser(
    db: AsyncSession, user: Any, spec: DirectorySpec
) -> JSONResponse | None:
    """The free-tier marketing teaser: a 401 carrying only the total.

    Returns ``None`` when the caller is entitled to the real stats.
    """
    if await resolve_entitlement(db, user.id) != Entitlement.FREE:
        return None
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"total": await spec.count_total(db)},
    )


async def guard(operation: str, fetch: Callable[[], Awaitable[T]]) -> T:
    """Run a query, turning an unexpected failure into a 500 with stable copy.

    Deliberate 4xx responses raised inside ``fetch`` pass straight through.
    """
    try:
        return await fetch()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("%s failed: %s", operation, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load {operation}",
        ) from e


async def run_export(
    db: AsyncSession,
    user: Any,
    spec: DirectorySpec,
    *,
    fmt: str,
    fetch: Callable[[int], Awaitable[Sequence[Any]]],
) -> Response:
    """Gate, meter, and render an export.

    ``fetch`` receives the record cap and must apply it in SQL, so the database
    never materialises rows the export is not allowed to include. The meter is
    charged for what was actually written, after the rows exist.
    """
    subscription: Subscription | None = await require_paid_export(
        db,
        user,
        pro_message=spec.pro_message,
        count_total=lambda: spec.count_total(db),
    )

    used = await get_export_usage(db, user.id, subscription)
    remaining = MONTHLY_EXPORT_RECORD_LIMIT - used
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "EXPORT_LIMIT_REACHED", "message": EXPORT_LIMIT_MESSAGE},
        )

    records = await fetch(min(EXPORT_MAX_RECORDS, remaining))
    rows = [list(spec.export_row(record)) for record in records]

    new_total = await add_export_usage(db, user.id, subscription, len(rows))
    logger.info(
        "%s export: user=%s fmt=%s records=%s cycle_total=%s",
        spec.slug, user.id, fmt, len(rows), new_total,
    )

    meter_headers = {
        "X-Export-Records": str(len(rows)),
        "X-Export-Cycle-Used": str(new_total),
        "X-Export-Cycle-Limit": str(MONTHLY_EXPORT_RECORD_LIMIT),
    }
    headers = list(spec.export_headers)

    if fmt == "print":
        return HTMLResponse(
            content=build_print_html(
                spec.export_title,
                f"{len(rows)} records · exported {datetime.now(UTC).strftime('%B %d, %Y')}",
                headers,
                rows,
            ),
            headers=meter_headers,
        )

    filename = f"dealgapiq-{spec.slug}-{datetime.now(UTC).strftime('%Y%m%d')}.csv"
    return Response(
        content=build_csv(headers, rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            **meter_headers,
        },
    )
