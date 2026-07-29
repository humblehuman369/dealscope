"""Tests for PropertyService insurance estimation (insurance_pct × property value).

The percentage is the admin dashboard's `operating.insurance_pct`. It is resolved
inside PropertyService rather than passed in by callers, because the derived
figure lands in the address-keyed property cache that every caller shares — one
caller omitting it would poison the cached value for all of them.
"""

import sys

import pytest
from app.core.defaults import OPERATING
from app.schemas.property import AllAssumptions
from app.services.property_service import property_service

# `app.services.property_service` as an attribute resolves to the singleton, not
# the module — the package re-exports the instance under the same name.
property_service_module = sys.modules[type(property_service).__module__]


def test_estimate_insurance_value_iq_times_pct():
    out = property_service._estimate_insurance({"value_iq_estimate": 500_000})
    assert out == round(500_000 * OPERATING.insurance_pct, 2)


def test_estimate_insurance_falls_back_zestimate_list_price():
    out = property_service._estimate_insurance(
        {"zestimate": 400_000, "list_price": 100_000},
    )
    assert out == round(400_000 * OPERATING.insurance_pct, 2)


def test_estimate_insurance_no_value_returns_none():
    assert property_service._estimate_insurance({}) is None


def test_estimate_insurance_uses_the_supplied_pct():
    out = property_service._estimate_insurance({"value_iq_estimate": 500_000}, 0.006)
    assert out == 3_000.0


class TestAdminPctResolution:
    async def test_resolves_the_admin_configured_pct(self, monkeypatch):
        async def fake_defaults(_session):
            return AllAssumptions.model_validate({"operating": {"insurance_pct": 0.004}})

        monkeypatch.setattr(property_service_module, "get_default_assumptions", fake_defaults)

        assert await property_service._resolve_insurance_pct() == 0.004

    async def test_falls_back_to_the_constant_when_the_lookup_fails(self, monkeypatch):
        # A degraded database must not strip insurance out of every response.
        async def boom(_session):
            raise RuntimeError("no database")

        monkeypatch.setattr(property_service_module, "get_default_assumptions", boom)

        assert await property_service._resolve_insurance_pct() == OPERATING.insurance_pct


class TestCachedRecompute:
    """`market.insurance_annual` is recomputed on the way out of the cache.

    Without this an admin's change to insurance_pct would not reach an already
    cached property for up to 24h, and the figure feeds the Deal Maker record's
    `annual_insurance` — so it is a money value, not just a display one.
    """

    def _cached(self, **market):
        return {
            "valuations": {"value_iq_estimate": 500_000},
            "listing": {"list_price": 480_000},
            "market": {"insurance_annual": 5_000.0, "hoa_fees_monthly": 250, **market},
        }

    def test_stale_cached_figure_is_replaced(self):
        out = property_service._apply_insurance_to_cached(self._cached(), 0.006)

        assert out["market"]["insurance_annual"] == 3_000.0

    def test_sibling_market_fields_survive(self):
        out = property_service._apply_insurance_to_cached(self._cached(), 0.006)

        assert out["market"]["hoa_fees_monthly"] == 250

    def test_the_cached_dict_is_not_mutated(self):
        cached = self._cached()

        property_service._apply_insurance_to_cached(cached, 0.006)

        # The blob is written back to Redis elsewhere; mutating it in place would
        # persist a value derived from whoever happened to read it last.
        assert cached["market"]["insurance_annual"] == 5_000.0

    def test_falls_back_to_list_price_when_no_valuation(self):
        cached = {
            "valuations": {},
            "listing": {"list_price": 480_000},
            "market": {"insurance_annual": 5_000.0},
        }

        out = property_service._apply_insurance_to_cached(cached, 0.01)

        assert out["market"]["insurance_annual"] == 4_800.0

    def test_no_value_yields_none_rather_than_a_fabricated_amount(self):
        cached = {"valuations": {}, "listing": {}, "market": {"insurance_annual": 5_000.0}}

        out = property_service._apply_insurance_to_cached(cached, 0.01)

        assert out["market"]["insurance_annual"] is None

    @pytest.mark.parametrize("missing", ["valuations", "listing", "market"])
    def test_tolerates_missing_sections(self, missing):
        cached = self._cached()
        del cached[missing]

        out = property_service._apply_insurance_to_cached(cached, 0.01)

        assert "insurance_annual" in out["market"]
