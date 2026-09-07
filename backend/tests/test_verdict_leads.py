"""Verdict-email capture: validation and email+address dedupe."""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.verdict_lead import VerdictLead

pytestmark = pytest.mark.asyncio


async def test_email_address_pair_is_unique(db_session):
    db_session.add(VerdictLead(email="a@b.com", address="1 Oak St", attribution={}, consent=True))
    await db_session.commit()

    db_session.add(VerdictLead(email="a@b.com", address="1 Oak St", attribution={}, consent=True))
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

    db_session.add(VerdictLead(email="a@b.com", address="2 Pine St", attribution={}, consent=True))
    await db_session.commit()
    rows = (await db_session.execute(select(VerdictLead))).scalars().all()
    assert len(rows) == 2
