"""Leftover rows in a reused test DB must not leak into job-scan tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from app.models.linkedin_post import (
    LinkedInAccount,
    LinkedInMediaType,
    LinkedInPost,
    LinkedInPostStatus,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from tests.conftest import wipe_job_scan_tables

pytestmark = pytest.mark.asyncio


async def test_wipe_removes_committed_linkedin_rows(async_engine):
    factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        session.add(
            LinkedInPost(
                batch="bot-2026-09-04",
                key="bot-2026-09-04/dscr-reshare",
                account=LinkedInAccount.FOUNDER,
                scheduled_at=datetime.now(UTC) - timedelta(days=1),
                body="Leftover from a previous run.",
                media_type=LinkedInMediaType.NONE,
                status=LinkedInPostStatus.APPROVED,
                created_by="human",
            )
        )
        await session.commit()

    await wipe_job_scan_tables(async_engine)

    async with factory() as session:
        leftover = (
            await session.execute(select(LinkedInPost).where(LinkedInPost.key == "bot-2026-09-04/dscr-reshare"))
        ).scalar_one_or_none()
        assert leftover is None
