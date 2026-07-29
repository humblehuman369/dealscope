"""Tests for directory_service_area — the shared "who covers this location?" table.

The load-bearing property is equivalence: a state lookup through the new table
must return exactly what the old ``states_served`` array filter returned. If that
ever diverges, lender search results silently change.
"""

import pytest
from app.models.directory_service_area import DirectoryServiceArea
from app.models.lender import Lender
from scripts.backfill_service_area import SOURCE_LENDER_STATES, backfill_lender_states
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def empty_service_area(db_session):
    """Start every test from an empty table.

    The backfill is a real script that may already have been run against this
    database, and those rows are committed. Clearing inside the test transaction
    makes each test's starting state explicit without destroying anything —
    teardown rolls the delete back.
    """
    await db_session.execute(delete(DirectoryServiceArea))
    await db_session.flush()


@pytest.fixture
async def backfilled(db_session, seeded_lenders):
    """Derive lender coverage inside the test transaction, rolled back after."""
    await backfill_lender_states(db_session, dry_run=False)
    await db_session.flush()
    return seeded_lenders


async def _states_in_dataset(db_session) -> list[str]:
    rows = await db_session.execute(
        select(func.distinct(func.unnest(Lender.states_served)))
    )
    return sorted(row[0] for row in rows.all())


# ---------------------------------------------------------------------------
# Equivalence with the array filter it replaces
# ---------------------------------------------------------------------------


async def test_state_rows_match_states_served_for_every_state(db_session, backfilled):
    """The property that makes this table safe to query instead of the array."""
    states = await _states_in_dataset(db_session)
    assert len(states) == 51  # 50 states + DC

    divergent = []
    for state in states:
        from_array = {
            row[0]
            for row in (
                await db_session.execute(
                    select(Lender.id).where(
                        Lender.is_active.is_(True),
                        Lender.states_served.contains([state]),
                    )
                )
            ).all()
        }
        from_table = {
            row[0]
            for row in (
                await db_session.execute(
                    select(DirectoryServiceArea.entity_id).where(
                        DirectoryServiceArea.entity_type == "lender",
                        DirectoryServiceArea.scope == "state",
                        DirectoryServiceArea.state == state,
                    )
                )
            ).all()
        }
        if from_array != from_table:
            divergent.append((state, len(from_array), len(from_table)))

    assert divergent == []


async def test_nationwide_marker_matches_the_flag(db_session, backfilled):
    flagged = {
        row[0]
        for row in (
            await db_session.execute(
                select(Lender.id).where(
                    Lender.is_active.is_(True), Lender.nationwide.is_(True)
                )
            )
        ).all()
    }
    marked = {
        row[0]
        for row in (
            await db_session.execute(
                select(DirectoryServiceArea.entity_id).where(
                    DirectoryServiceArea.entity_type == "lender",
                    DirectoryServiceArea.scope == "nationwide",
                )
            )
        ).all()
    }
    assert flagged == marked
    assert flagged


async def test_nationwide_lenders_still_get_explicit_state_rows(db_session, backfilled):
    """The marker is a convenience, not a substitute — otherwise a state query
    would need a nationwide special case and equivalence would depend on it."""
    nationwide_id = (
        await db_session.execute(
            select(Lender.id).where(Lender.nationwide.is_(True)).limit(1)
        )
    ).scalar_one()

    state_rows = (
        await db_session.execute(
            select(func.count())
            .select_from(DirectoryServiceArea)
            .where(
                DirectoryServiceArea.entity_type == "lender",
                DirectoryServiceArea.entity_id == nationwide_id,
                DirectoryServiceArea.scope == "state",
            )
        )
    ).scalar_one()
    assert state_rows == 51


# ---------------------------------------------------------------------------
# Derivation hygiene
# ---------------------------------------------------------------------------


async def test_backfill_is_idempotent(db_session, backfilled):
    before = (
        await db_session.execute(select(func.count()).select_from(DirectoryServiceArea))
    ).scalar_one()

    await backfill_lender_states(db_session, dry_run=False)
    await db_session.flush()

    after = (
        await db_session.execute(select(func.count()).select_from(DirectoryServiceArea))
    ).scalar_one()
    assert after == before


async def test_every_row_is_tagged_with_its_derivation(db_session, backfilled):
    """`source` is what lets a later pass refresh its own rows only."""
    sources = {
        row[0]
        for row in (
            await db_session.execute(select(func.distinct(DirectoryServiceArea.source)))
        ).all()
    }
    assert sources == {SOURCE_LENDER_STATES}


async def test_inactive_lenders_are_not_given_coverage(db_session, seeded_lenders):
    lender_id = (await db_session.execute(select(Lender.id).limit(1))).scalar_one()
    await db_session.execute(
        Lender.__table__.update().where(Lender.id == lender_id).values(is_active=False)
    )
    await backfill_lender_states(db_session, dry_run=False)
    await db_session.flush()

    rows = (
        await db_session.execute(
            select(func.count())
            .select_from(DirectoryServiceArea)
            .where(DirectoryServiceArea.entity_id == lender_id)
        )
    ).scalar_one()
    assert rows == 0


async def test_dry_run_writes_nothing(db_session, seeded_lenders):
    planned = await backfill_lender_states(db_session, dry_run=True)
    assert planned > 0

    written = (
        await db_session.execute(select(func.count()).select_from(DirectoryServiceArea))
    ).scalar_one()
    assert written == 0


# ---------------------------------------------------------------------------
# The scope invariant is enforced by the database, not by convention
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("label", "values"),
    [
        ("nationwide carrying a state", "('lender', 1, 'nationwide', 'FL', NULL, 't')"),
        ("state scope with no state", "('lender', 1, 'state', NULL, NULL, 't')"),
        ("county scope with no fips", "('lender', 1, 'county', 'FL', NULL, 't')"),
        ("unknown entity type", "('agent', 1, 'state', 'FL', NULL, 't')"),
    ],
)
async def test_malformed_coverage_rows_are_rejected(db_session, label, values):
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                "INSERT INTO directory_service_area "
                "(entity_type, entity_id, scope, state, county_fips, source) "
                f"VALUES {values}"
            )
        )
    await db_session.rollback()


async def test_county_rows_must_reference_a_real_county(db_session):
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                "INSERT INTO directory_service_area "
                "(entity_type, entity_id, scope, state, county_fips, source) "
                "VALUES ('buyer', 1, 'county', 'FL', '99999', 't')"
            )
        )
    await db_session.rollback()
