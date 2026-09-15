"""JSON-finite guards for IQ Verdict — NaN/Inf must never 500 Discovery.

Root cause: ``calculate_dscr`` returned Inf when annual debt service is $0.
A saved Plan (seller-second 0% IO balloon that replaces the bank loan, or a
stepped-down buy price whose 2nd covers the remaining first) produces that
shape. Starlette JSONResponse uses allow_nan=False, so the verdict 500s with
"Out of range float values are not JSON compliant".
"""

from __future__ import annotations

import json
import math
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.responses import JSONResponse

from app.core.json_safe import dump_json_safe, sanitize_non_finite
from app.db.session import get_db
from app.main import app
from app.schemas.analytics import IQVerdictInput, StrategyResult
from app.schemas.property import AllAssumptions
from app.services.calculators.common import calculate_dscr
from app.services.iq_verdict_service import compute_iq_verdict


# 7026 NW 21st Ave, Miami, FL 33147 (zpid 44156102) — list/tax from the public listing.
# The saved Plan stepped buy price down and kept a 0% IO seller 2nd sized to the
# remaining loan, so bank P&I + seller P&I = $0 and DSCR was Inf.
_MIAMI_HOUSE = dict(
    address="7026 NW 21st Ave, Miami, FL 33147",
    list_price=460_000,
    purchase_price=100_000,
    monthly_rent=2_200,
    property_taxes=5_693,
    insurance=4_600,
    bedrooms=3,
    bathrooms=2.0,
    sqft=1060,
    listing_status="FOR_SALE",
    days_on_market=5,
    price_reductions=5,
    state="FL",
    down_payment_pct=0.20,
    seller_carry_amount=80_000,
    seller_carry_rate=0.0,
    seller_carry_term_years=5,
    seller_carry_interest_only=True,
)


def _ltr(resp):
    return next(s for s in resp.strategies if s.id == "long-term-rental")


class TestCalculateDscrZeroDebt:
    def test_zero_debt_is_none_not_inf(self):
        assert calculate_dscr(12_000, 0) is None

    def test_positive_debt_is_ratio(self):
        assert calculate_dscr(12_000, 10_000) == pytest.approx(1.2)


class TestSanitizeNonFinite:
    def test_converts_nan_and_inf_to_none_and_logs_path(self):
        payload = {
            "strategies": [{"dscr": float("nan"), "capRate": 5.0}],
            "nested": [float("inf"), float("-inf"), 1.5],
        }
        # Patch the module logger — importing app.main replaces root handlers
        # with a JSON formatter, so pytest caplog is empty in CI.
        with patch("app.core.json_safe.logger.warning") as warn:
            out = sanitize_non_finite(payload)
        assert out["strategies"][0]["dscr"] is None
        assert out["strategies"][0]["capRate"] == 5.0
        assert out["nested"] == [None, None, 1.5]
        logged_paths = [call.args[1] for call in warn.call_args_list]
        assert "strategies[0].dscr" in logged_paths
        assert "nested[0]" in logged_paths
        assert "nested[1]" in logged_paths
        json.dumps(out)

    def test_dump_json_safe_strips_inf_on_verdict_shape(self):
        strategy = StrategyResult(
            id="long-term-rental",
            name="Long-Term Rental",
            metric="0.0%",
            metric_label="CoC Return",
            metric_value=0.0,
            score=0,
            rank=1,
            dscr=float("inf"),
        )
        # Bypass compute — prove the response-level guard itself.
        dumped = strategy.model_dump(mode="json", by_alias=True)
        assert math.isinf(dumped["dscr"])
        with pytest.raises(ValueError, match="Out of range float values"):
            JSONResponse(content=dumped)
        safe = sanitize_non_finite(dumped)
        JSONResponse(content=safe)
        json.dumps(safe)
        assert safe["dscr"] is None


class TestVerdictSavedSellerSecondZeroDebt:
    """Saved Plan shape that 500'd Discovery for zpid 44156102 after 15 Sep."""

    def test_dscr_is_none_and_json_serializable(self):
        resp = compute_iq_verdict(IQVerdictInput(**_MIAMI_HOUSE))
        ltr = _ltr(resp)
        assert ltr.dscr is None
        dumped = dump_json_safe(resp, by_alias=True)
        JSONResponse(content=dumped)
        json.dumps(dumped)
        ltr_dump = next(s for s in dumped["strategies"] if s["id"] == "long-term-rental")
        assert ltr_dump["dscr"] is None

    def test_zero_computed_buy_price_is_json_serializable(self):
        """No purchase override + $0 rent → buy_price 0 → no debt → used to Inf DSCR."""
        resp = compute_iq_verdict(
            IQVerdictInput(
                list_price=460_000,
                monthly_rent=0,
                property_taxes=5_693,
                insurance=4_600,
                state="FL",
            )
        )
        dumped = dump_json_safe(resp, by_alias=True)
        JSONResponse(content=dumped)
        json.dumps(dumped)


@pytest.mark.asyncio
async def test_verdict_route_returns_200_for_zero_debt_plan(monkeypatch):
    """POST /analysis/verdict must 200 (not 500) for the saved-plan zero-debt shape.

    Does not use the suite Postgres fixture — quota + assumptions are stubbed
    so this still runs when Docker/OrbStack is unavailable.
    """

    async def _fake_db():
        yield None

    async def _fake_assumptions(db, user=None, zip_code=None):
        return AllAssumptions()

    async def _fake_quota(*args, **kwargs):
        return "counter", "marker", "ip", True

    monkeypatch.setattr("app.routers.analytics.resolve_assumptions", _fake_assumptions)
    monkeypatch.setattr("app.routers.analytics._check_anonymous_quota", _fake_quota)
    app.dependency_overrides[get_db] = _fake_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/v1/analysis/verdict", json=_MIAMI_HOUSE)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        ltr = next(s for s in body["strategies"] if s["id"] == "long-term-rental")
        assert ltr["dscr"] is None
        str_row = next(s for s in body["strategies"] if s["id"] == "short-term-rental")
        if str_row.get("dscr") is not None:
            assert math.isfinite(str_row["dscr"])
    finally:
        app.dependency_overrides.pop(get_db, None)
