"""Phase 4 hardening jobs for the Marketing Ops Hub.

- ``marketing_alerts_job``: once a day, after the bots should have run, look
  for missed or failed bot runs, publisher tokens about to expire, and overdue
  marketing crons. Email the admin list when there is something to say.
  Silence is the healthy signal; the job never emails "all clear".
- ``weekly_rollup_job``: Mondays, write a ``weekly`` brief comparing the last
  7 days to the 7 before from the same rows the scorecard reads. System-
  authored, so it never blocks on a bot having run.

Both are cron-gated (``X-Cron-Token``) like every other job in ``jobs.py``.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.linkedin_post import LinkedInPost, LinkedInPostStatus
from app.models.marketing import BotRun, BotRunStatus, BriefKind
from app.models.x_post import XPost, XPostStatus
from app.schemas.marketing import BriefIn, ScorecardCell
from app.services import marketing_service as svc
from app.services.email_service import email_service
from app.services.linkedin_publisher import token_warnings
from app.services.x_publisher import x_configured
from app.tasks.heartbeat import evaluate_job_health, with_heartbeat

logger = logging.getLogger(__name__)

_HOUR = 3600

# Bots named in docs/marketing/bots/*.md and how stale their last run may be.
# 26h for a daily routine: one missed tick, not a late one.
EXPECTED_BOTS: dict[str, int] = {
    "metrics-analyst": 26 * _HOUR,
    "content-drafter": 26 * _HOUR,
}
# A run left ``running`` this long is a crash, not a slow routine.
STUCK_RUN_SECONDS = 3 * _HOUR
MARKETING_JOBS = ("linkedin_publish", "x_publish", "marketing_metrics")

WEEKLY_ROLLUP_AUTHOR = "system:weekly-rollup"
# Below this prior-week base a percentage move is noise, not a signal.
MOVE_MIN_BASE = 10.0
TOP_MOVES = 5


def _now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


def bot_issues(latest_runs: list[BotRun], *, now: datetime) -> list[str]:
    """Missed, failed, or stuck runs for the bots we expect.

    A bot that has never checked in is a setup task, not an incident, so it is
    not reported here; the health panel already shows it.
    """
    issues: list[str] = []
    by_name = {run.bot_name: run for run in latest_runs}
    for bot_name, max_stale in EXPECTED_BOTS.items():
        run = by_name.get(bot_name)
        if run is None:
            continue
        age = (now - run.started_at).total_seconds()
        if run.status == BotRunStatus.RUNNING.value and age > STUCK_RUN_SECONDS:
            issues.append(
                f"{bot_name}: run {run.id} has been 'running' for {int(age // _HOUR)}h "
                f"(started {run.started_at.isoformat()}); the bot crashed without closing it."
            )
        elif age > max_stale:
            issues.append(
                f"{bot_name}: no run since {run.started_at.isoformat()} "
                f"({int(age // _HOUR)}h ago); expected every {max_stale // _HOUR}h."
            )
        elif run.status == BotRunStatus.FAILED.value:
            detail = (run.error or "no error text").strip().splitlines()[0][:200]
            issues.append(f"{bot_name}: last run failed — {detail}")
    return issues


def integration_issues(jobs_health: dict, *, now: datetime) -> list[str]:
    issues = list(token_warnings(now=now))
    if settings.X_PUBLISH_ENABLED and not x_configured():
        issues.append(
            "X_PUBLISH_ENABLED is true but X_API_KEY / X_ACCESS_TOKEN are not all set; approved X posts cannot publish."
        )
    for name in MARKETING_JOBS:
        job = jobs_health.get(name)
        if not job:
            continue
        if job.get("status") == "overdue":
            issues.append(f"cron {name} is overdue (last success {job.get('last_success') or 'never'}).")
        elif job.get("last_error") and job.get("status") != "ok":
            issues.append(f"cron {name}: {job['last_error']}")
    return issues


async def marketing_alerts_job(db: AsyncSession, *, now: datetime | None = None) -> dict:
    now = now or _now()
    latest_runs = await svc.latest_run_per_bot(db)
    health = await evaluate_job_health(now)
    issues = bot_issues(latest_runs, now=now) + integration_issues(health.get("jobs", {}), now=now)

    recipients = settings.admin_notification_emails_list
    result: dict = {"issues": issues, "recipients": len(recipients), "emailed": False}
    if not issues:
        return result
    if not recipients:
        result["warning"] = "ADMIN_NOTIFICATION_EMAILS is empty; alert logged only"
        logger.warning("marketing alerts (no recipients): %s", issues)
        return result

    dashboard_url = f"{settings.FRONTEND_URL or 'https://dealgapiq.com'}/admin/marketing"
    sent = await email_service.send_marketing_alert_email(
        to=recipients,
        issues=issues,
        dashboard_url=dashboard_url,
        idempotency_key=f"marketing-alerts-{now.date().isoformat()}",
    )
    result["emailed"] = bool(sent.get("success"))
    if not sent.get("success"):
        result["warning"] = f"email failed: {sent.get('error')}"
    return result


run_marketing_alerts = with_heartbeat("marketing_alerts", marketing_alerts_job)


# ---------------------------------------------------------------------------
# Weekly rollup
# ---------------------------------------------------------------------------


def _pct(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / previous * 100.0


def _fmt(value: float | None, metric: str) -> str:
    if value is None:
        return "—"
    if metric == "spend":
        return f"${value:,.2f}"
    return f"{value:,.0f}" if float(value).is_integer() else f"{value:,.1f}"


def _fmt_pct(pct: float | None) -> str:
    if pct is None:
        return "—"
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.0f}%"


def biggest_moves(cells: list[ScorecardCell]) -> list[str]:
    scored: list[tuple[float, str]] = []
    for cell in cells:
        pct = _pct(cell.current, cell.previous)
        if pct is None or (cell.previous or 0) < MOVE_MIN_BASE:
            continue
        scored.append(
            (
                abs(pct),
                f"{cell.channel} {cell.metric} {_fmt_pct(pct)} "
                f"({_fmt(cell.previous, cell.metric)} to {_fmt(cell.current, cell.metric)})",
            )
        )
    scored.sort(key=lambda item: item[0], reverse=True)
    return [text for _, text in scored[:TOP_MOVES]]


def render_rollup_markdown(
    *,
    window_start: date,
    window_end: date,
    cells: list[ScorecardCell],
    linkedin_published: int,
    x_published: int,
    queue: dict[str, dict[str, int]],
    runs: dict[str, int],
    failed_runs: list[BotRun],
    open_prs: list[str],
) -> str:
    lines = [f"## Week of {window_start.isoformat()} to {window_end.isoformat()}", ""]
    if cells:
        lines += ["| Channel | Metric | This week | Prior week | Change | Source |", "|---|---|---|---|---|---|"]
        for cell in cells:
            lines.append(
                f"| {cell.channel} | {cell.metric} | {_fmt(cell.current, cell.metric)} | "
                f"{_fmt(cell.previous, cell.metric)} | {_fmt_pct(_pct(cell.current, cell.previous))} | "
                f"{', '.join(cell.sources)} |"
            )
    else:
        lines.append("No metric rows in the last 14 days. Check the `marketing-metrics` cron and the Analyst bot.")
    lines += [
        "",
        "## Content",
        f"- LinkedIn: {linkedin_published} published this week; "
        f"{queue['linkedin'].get('draft', 0)} draft, {queue['linkedin'].get('approved', 0)} approved waiting.",
        f"- X: {x_published} published this week; "
        f"{queue['x'].get('draft', 0)} draft, {queue['x'].get('approved', 0)} approved waiting.",
    ]
    if open_prs:
        lines.append(f"- Blog drafts in review: {len(open_prs)}")
        lines += [f"  - {item}" for item in open_prs]
    else:
        lines.append("- Blog drafts in review: none")
    lines += [
        "",
        "## Bots",
        f"- Runs this week: {runs.get('succeeded', 0)} succeeded, {runs.get('failed', 0)} failed, "
        f"{runs.get('running', 0)} still open.",
    ]
    for run in failed_runs:
        detail = (run.error or "no error text").strip().splitlines()[0][:160]
        lines.append(f"  - {run.bot_name} {run.routine} on {run.started_at.date().isoformat()}: {detail}")
    lines += [
        "",
        "_Generated by the weekly rollup cron from marketing_metrics_daily. "
        "Rows marked bot_capture were read off dashboards by a bot and are unverified._",
    ]
    return "\n".join(lines)


async def weekly_rollup_job(db: AsyncSession, *, today: date | None = None) -> dict:
    today = today or _now().date()
    scorecard = await svc.build_scorecard(db, days=7, today=today)
    window_start_dt = datetime.combine(scorecard.window_start, datetime.min.time(), tzinfo=UTC)
    window_end_dt = datetime.combine(scorecard.window_end + timedelta(days=1), datetime.min.time(), tzinfo=UTC)

    linkedin_published = (
        await db.execute(
            select(func.count()).where(
                LinkedInPost.status == LinkedInPostStatus.PUBLISHED,
                LinkedInPost.published_at >= window_start_dt,
                LinkedInPost.published_at < window_end_dt,
            )
        )
    ).scalar_one()
    x_published = (
        await db.execute(
            select(func.count()).where(
                XPost.status == XPostStatus.PUBLISHED.value,
                XPost.published_at >= window_start_dt,
                XPost.published_at < window_end_dt,
            )
        )
    ).scalar_one()
    run_rows = (
        (
            await db.execute(
                select(BotRun).where(BotRun.started_at >= window_start_dt, BotRun.started_at < window_end_dt)
            )
        )
        .scalars()
        .all()
    )
    runs: dict[str, int] = {}
    for run in run_rows:
        runs[run.status] = runs.get(run.status, 0) + 1
    failed_runs = [run for run in run_rows if run.status == BotRunStatus.FAILED.value]

    prs, prs_warning = await svc.blog_prs()
    open_prs = [f"{pr.title} — {pr.preview_url or pr.url}" for pr in prs]

    queue = {
        "linkedin": await svc.linkedin_queue_counts(db),
        "x": await svc.x_queue_counts(db),
    }
    body = render_rollup_markdown(
        window_start=scorecard.window_start,
        window_end=scorecard.window_end,
        cells=scorecard.cells,
        linkedin_published=linkedin_published,
        x_published=x_published,
        queue=queue,
        runs=runs,
        failed_runs=failed_runs,
        open_prs=open_prs,
    )
    highlights: dict[str, list[str]] = {"biggest_moves": biggest_moves(scorecard.cells)}
    if open_prs:
        highlights["open_items"] = open_prs
    if prs_warning:
        highlights["warnings"] = [prs_warning]

    try:
        brief = await svc.upsert_brief(
            db,
            BriefIn(date=today, body_md=body, highlights=highlights),
            created_by=WEEKLY_ROLLUP_AUTHOR,
            kind=BriefKind.WEEKLY,
        )
    except svc.BriefLocked:
        return {"date": today.isoformat(), "status": "skipped", "reason": "weekly brief already reviewed"}
    return {"date": today.isoformat(), "status": "written", "brief_id": str(brief.id), "cells": len(scorecard.cells)}


run_weekly_rollup = with_heartbeat("marketing_weekly_rollup", weekly_rollup_job)
