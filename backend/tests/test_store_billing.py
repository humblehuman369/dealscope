from types import SimpleNamespace

from app.schemas.billing import PlanType
from app.services.store_billing import (
    is_native_store_client,
    is_revenuecat_backed,
    mark_revenuecat,
    product_looks_annual,
    resolve_plan_type,
)


class _FakeRequest:
    def __init__(self, headers: dict[str, str]):
        self.headers = headers


def test_native_client_header():
    assert is_native_store_client(_FakeRequest({"x-dgiq-client-type": "mobile"}))
    assert not is_native_store_client(_FakeRequest({"x-dgiq-client-type": "desktop"}))
    assert not is_native_store_client(_FakeRequest({}))


def test_product_looks_annual():
    assert product_looks_annual("dealgapiq_pro_annual")
    assert product_looks_annual("$rc_annual")
    assert product_looks_annual("pro:yearly")
    assert not product_looks_annual("dealgapiq_pro_monthly")
    assert not product_looks_annual(None)


def test_comp_is_not_revenuecat_backed():
    sub = SimpleNamespace(extra_data=None)
    assert not is_revenuecat_backed(sub)


def test_mark_revenuecat_sets_source_and_product():
    sub = SimpleNamespace(extra_data=None, tier=SimpleNamespace(value="pro"), stripe_price_id=None)
    mark_revenuecat(sub, product_id="dealgapiq_pro_annual")
    assert is_revenuecat_backed(sub)
    assert resolve_plan_type(sub) == PlanType.PRO_ANNUAL


def test_legacy_last_revenuecat_event_counts_as_store_backed():
    sub = SimpleNamespace(extra_data={"last_revenuecat_event": "INITIAL_PURCHASE"})
    assert is_revenuecat_backed(sub)


def test_stripe_yearly_price_wins(monkeypatch):
    from app.core import config as config_mod

    monkeypatch.setattr(config_mod.settings, "STRIPE_PRICE_PRO_YEARLY", "price_year")
    sub = SimpleNamespace(
        extra_data=None,
        tier=SimpleNamespace(value="pro"),
        stripe_price_id="price_year",
    )
    assert resolve_plan_type(sub) == PlanType.PRO_ANNUAL
