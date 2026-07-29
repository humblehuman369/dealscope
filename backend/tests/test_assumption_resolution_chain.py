"""Precedence of the assumption resolution chain.

Two layers of defaults are configurable: the admin dashboard sets the platform
baseline, and each user can override it for their own analyses. Everything that
scores a deal has to agree on which value wins, or the same property produces
different numbers on different screens.

Order, lowest precedence first:
    schema defaults → admin DB → ZIP market → user profile → per-request

These are unit tests: the DB reads are stubbed so the precedence logic itself is
what gets exercised, without a Postgres fixture.
"""

import pytest
from app.core.defaults import FINANCING, OPERATING
from app.schemas.property import AllAssumptions
from app.services import assumption_resolver
from app.services.assumption_resolver import (
    resolve_assumption_layers,
    resolve_assumptions,
)
from app.services.deal_maker_service import DealMakerService

# 33460 → FL_SOUTH: vacancy 0.05, appreciation 0.06 in MARKET_ADJUSTMENTS.
ZIP_FL = "33460"


class _Profile:
    def __init__(self, default_assumptions):
        self.default_assumptions = default_assumptions


@pytest.fixture
def chain(monkeypatch):
    """Stub the two DB reads; returns a setter for the admin and user layers."""

    state = {"admin": AllAssumptions(), "profile": None}

    async def fake_admin(_db):
        return state["admin"]

    async def fake_profile(_self, _db, _user_id):
        return state["profile"]

    monkeypatch.setattr(assumption_resolver, "get_default_assumptions", fake_admin)
    monkeypatch.setattr(
        assumption_resolver.user_service.__class__, "get_profile", fake_profile, raising=False
    )

    def configure(admin: dict | None = None, user: dict | None = None):
        if admin is not None:
            state["admin"] = AllAssumptions.model_validate(admin)
        state["profile"] = _Profile(user) if user is not None else None

    return configure


class _User:
    id = "11111111-1111-1111-1111-111111111111"


USER = _User()


class TestPrecedence:
    async def test_no_admin_row_and_no_user_yields_schema_defaults(self, chain):
        chain()

        resolved = await resolve_assumptions(None)

        assert resolved.financing.interest_rate == FINANCING.interest_rate
        assert resolved.operating.vacancy_rate == OPERATING.vacancy_rate

    async def test_admin_overrides_the_schema_default(self, chain):
        chain(admin={"financing": {"interest_rate": 0.08}})

        resolved = await resolve_assumptions(None)

        assert resolved.financing.interest_rate == 0.08

    async def test_user_overrides_the_admin_default(self, chain):
        chain(
            admin={"financing": {"interest_rate": 0.08}},
            user={"financing": {"interest_rate": 0.05}},
        )

        resolved = await resolve_assumptions(None, user=USER)

        assert resolved.financing.interest_rate == 0.05

    async def test_anonymous_callers_get_the_admin_default(self, chain):
        chain(
            admin={"financing": {"interest_rate": 0.08}},
            user={"financing": {"interest_rate": 0.05}},
        )

        resolved = await resolve_assumptions(None)

        # No user passed → the saved profile must not leak into the result.
        assert resolved.financing.interest_rate == 0.08

    async def test_user_beats_the_regional_market_table(self, chain):
        # The whole point of saving your own defaults: an explicit choice should
        # not be overwritten by a regional average.
        chain(user={"operating": {"vacancy_rate": 0.12}})

        resolved = await resolve_assumptions(None, user=USER, zip_code=ZIP_FL)

        assert resolved.operating.vacancy_rate == 0.12

    async def test_market_applies_when_the_user_has_no_opinion(self, chain):
        chain(user={"financing": {"interest_rate": 0.05}})

        resolved = await resolve_assumptions(None, user=USER, zip_code=ZIP_FL)

        assert resolved.operating.vacancy_rate == 0.05  # FL_SOUTH
        assert resolved.financing.interest_rate == 0.05

    async def test_per_request_overrides_beat_everything(self, chain):
        chain(
            admin={"financing": {"interest_rate": 0.08}},
            user={"financing": {"interest_rate": 0.05}},
        )

        resolved = await resolve_assumptions(
            None, {"financing": {"interest_rate": 0.03}}, user=USER
        )

        assert resolved.financing.interest_rate == 0.03

    async def test_market_appreciation_lands_where_calculators_read_it(self, chain):
        # AllAssumptions keeps growth rates top-level; nesting them under a
        # "growth" key silently drops the adjustment.
        chain()

        resolved = await resolve_assumptions(None, zip_code=ZIP_FL)

        assert resolved.appreciation_rate == 0.06


class TestPartialOverrides:
    async def test_overriding_one_field_leaves_its_siblings_alone(self, chain):
        chain(
            admin={"financing": {"interest_rate": 0.08, "loan_term_years": 15}},
            user={"financing": {"interest_rate": 0.05}},
        )

        resolved = await resolve_assumptions(None, user=USER)

        assert resolved.financing.interest_rate == 0.05
        assert resolved.financing.loan_term_years == 15

    async def test_a_zero_override_is_honoured(self, chain):
        # 0% management is a real choice (self-managing), not an absent value.
        chain(admin={"operating": {"property_management_pct": 0.08}}, user={"operating": {"property_management_pct": 0}})

        resolved = await resolve_assumptions(None, user=USER)

        assert resolved.operating.property_management_pct == 0

    async def test_a_null_override_does_not_erase_the_admin_value(self, chain):
        chain(
            admin={"financing": {"interest_rate": 0.08}},
            user={"financing": {"interest_rate": None}},
        )

        resolved = await resolve_assumptions(None, user=USER)

        assert resolved.financing.interest_rate == 0.08

    async def test_an_empty_profile_is_not_treated_as_an_override(self, chain):
        chain(admin={"financing": {"interest_rate": 0.08}}, user={})

        resolved = await resolve_assumptions(None, user=USER)

        assert resolved.financing.interest_rate == 0.08


class TestLayerReporting:
    async def test_layers_are_reported_separately(self, chain):
        chain(
            admin={"financing": {"interest_rate": 0.08}},
            user={"financing": {"interest_rate": 0.05}},
        )

        layers = await resolve_assumption_layers(None, user=USER, zip_code=ZIP_FL)

        assert layers.system_defaults["financing"]["interest_rate"] == 0.08
        assert layers.user_overrides == {"financing": {"interest_rate": 0.05}}
        assert layers.region == "FL_SOUTH"
        assert layers.assumptions.financing.interest_rate == 0.05

    async def test_a_failed_profile_read_does_not_break_the_analysis(self, monkeypatch, chain):
        chain(admin={"financing": {"interest_rate": 0.08}})

        async def boom(_self, _db, _user_id):
            raise RuntimeError("profile table unavailable")

        monkeypatch.setattr(
            assumption_resolver.user_service.__class__, "get_profile", boom, raising=False
        )

        resolved = await resolve_assumptions(None, user=USER)

        assert resolved.financing.interest_rate == 0.08


class TestDealMakerBaseline:
    """`initial_assumptions` is locked at creation, so it must be seeded from the
    resolved chain — a wrong baseline here is frozen for the life of the record."""

    def test_locked_baseline_uses_the_resolved_values(self):
        resolved = AllAssumptions.model_validate(
            {
                "financing": {"interest_rate": 0.05, "down_payment_pct": 0.25},
                "operating": {"vacancy_rate": 0.12, "capex_pct": 0.02},
            }
        )

        initial = DealMakerService.resolve_initial_assumptions(None, resolved)

        assert initial.interest_rate == 0.05
        assert initial.down_payment_pct == 0.25
        assert initial.vacancy_rate == 0.12

    def test_capex_comes_from_the_resolved_operating_values(self):
        # Previously hardcoded to 0.05 regardless of what anyone configured.
        resolved = AllAssumptions.model_validate({"operating": {"capex_pct": 0.02}})

        initial = DealMakerService.resolve_initial_assumptions(None, resolved)

        assert initial.capex_pct == 0.02

    def test_market_does_not_overwrite_the_resolved_user_choice(self):
        # The resolver already layered market-then-user, so re-applying the
        # regional average here would invert that precedence.
        resolved = AllAssumptions.model_validate({"operating": {"vacancy_rate": 0.12}})

        initial = DealMakerService.resolve_initial_assumptions(ZIP_FL, resolved)

        assert initial.vacancy_rate == 0.12
        assert initial.market_region == "FL_SOUTH"

    def test_market_still_applies_when_nothing_was_resolved(self):
        initial = DealMakerService.resolve_initial_assumptions(ZIP_FL)

        assert initial.vacancy_rate == 0.05  # FL_SOUTH
        assert initial.market_region == "FL_SOUTH"
