"""Tests for Appraiser override fields on DealMakerRecord."""

import json

from starlette.responses import JSONResponse

from app.schemas.deal_maker import DealMakerRecord, DealMakerRecordUpdate, DealMakerResponse, InitialAssumptions
from app.services.deal_maker_service import DealMakerService


def _minimal_record(**kwargs) -> DealMakerRecord:
    initial = InitialAssumptions()
    base = dict(
        list_price=400_000,
        rent_estimate=2_500,
        property_taxes=5_000,
        insurance=4_000,
        initial_assumptions=initial,
        buy_price=340_000,
        arv=450_000,
        monthly_rent=2_500,
    )
    base.update(kwargs)
    return DealMakerRecord(**base)


def test_update_record_persists_market_value_override():
    record = _minimal_record()
    updated = DealMakerService.update_record(
        record,
        DealMakerRecordUpdate(market_value_override=425_000),
    )
    assert updated.market_value_override == 425_000


def test_update_record_persists_monthly_rent_override():
    record = _minimal_record()
    updated = DealMakerService.update_record(
        record,
        DealMakerRecordUpdate(monthly_rent_override=2_800),
    )
    assert updated.monthly_rent_override == 2_800


def test_calculate_metrics_uses_market_value_override_for_deal_gap():
    record = _minimal_record(
        market_value_override=500_000,
        buy_price=400_000,
        list_price=400_000,
    )
    metrics = DealMakerService.calculate_metrics(record)
    assert metrics.deal_gap_pct is not None
    # deal_gap = (market_override - buy) / market_override = 100k / 500k = 0.2
    assert abs(metrics.deal_gap_pct - 0.2) < 0.001


def test_calculate_metrics_uses_monthly_rent_override_for_noi():
    record = _minimal_record(monthly_rent=2_000, monthly_rent_override=3_000)
    metrics_default = DealMakerService.calculate_metrics(record)
    record_no_override = _minimal_record(monthly_rent=3_000, monthly_rent_override=None)
    metrics_same = DealMakerService.calculate_metrics(record_no_override)
    assert metrics_default.gross_income == metrics_same.gross_income


def test_from_dict_tolerates_stale_valuation_snapshot_in_cached_metrics():
    """PATCH /deal-maker must not 500 when JSONB has an old valuation_snapshot shape."""
    initial = InitialAssumptions()
    stored = {
        "list_price": 400_000,
        "rent_estimate": 2_500,
        "property_taxes": 5_000,
        "insurance": 4_000,
        "initial_assumptions": initial.model_dump(),
        "buy_price": 340_000,
        "arv": 450_000,
        "monthly_rent": 2_500,
        "cached_metrics": {
            "cap_rate": 0.05,
            "valuation_snapshot": {"noi": 10_000},
        },
    }
    record = DealMakerService.from_dict(stored)
    updated = DealMakerService.update_record(
        record,
        DealMakerRecordUpdate(market_value_override=425_000),
    )
    assert updated.market_value_override == 425_000
    assert updated.cached_metrics is not None
    assert updated.cached_metrics.valuation_snapshot is not None


def test_from_dict_returns_none_when_record_missing_required_fields():
    """Legacy saved records missing now-required fields should return None
    instead of raising, so PATCH /deal-maker can fall back to rebuilding
    from property_data_snapshot."""
    initial = InitialAssumptions()
    base = {
        "list_price": 400_000,
        "rent_estimate": 2_500,
        "property_taxes": 5_000,
        "insurance": 4_000,
        "initial_assumptions": initial.model_dump(),
        "buy_price": 340_000,
        "arv": 450_000,
        "monthly_rent": 2_500,
    }

    # list_price is None on an old record
    bad = {**base, "list_price": None}
    assert DealMakerService.from_dict(bad) is None

    # Whole arv field nulled out
    bad = {**base, "arv": None}
    assert DealMakerService.from_dict(bad) is None

    # monthly_rent nulled out
    bad = {**base, "monthly_rent": None}
    assert DealMakerService.from_dict(bad) is None


def test_from_dict_recovers_when_initial_assumptions_shape_is_invalid():
    """A corrupt initial_assumptions dict should be dropped (Pydantic re-fills
    from defaults) instead of bringing the whole record down."""
    initial = InitialAssumptions()
    stored = {
        "list_price": 400_000,
        "rent_estimate": 2_500,
        "property_taxes": 5_000,
        "insurance": 4_000,
        "initial_assumptions": {"bad": "shape"},
        "buy_price": 340_000,
        "arv": 450_000,
        "monthly_rent": 2_500,
    }
    record = DealMakerService.from_dict(stored)
    assert record is not None
    # Defaults were applied — record is still usable for PATCH
    assert record.initial_assumptions is not None
    _ = DealMakerService.update_record(record, DealMakerRecordUpdate(arv=500_000))


def test_update_record_metrics_are_json_serializable_when_buy_price_is_zero():
    """PATCH /deal-maker must not 500 when buy_price=0 and rent override yields inf CoC."""
    initial = InitialAssumptions()
    stored = {
        "list_price": 0,
        "rent_estimate": 0,
        "property_taxes": 0,
        "insurance": 0,
        "initial_assumptions": initial.model_dump(),
        "buy_price": 0,
        "arv": 0,
        "monthly_rent": 0,
    }
    record = DealMakerService.from_dict(stored)
    assert record is not None
    updated = DealMakerService.update_record(
        record,
        DealMakerRecordUpdate(monthly_rent_override=2_800, monthly_rent=2_800),
    )
    metrics = updated.cached_metrics
    assert metrics is not None
    assert metrics.cash_on_cash is None

    resp = DealMakerResponse(
        record=updated,
        cash_needed=metrics.total_cash_needed,
        deal_gap=metrics.deal_gap_pct,
        annual_profit=metrics.annual_cash_flow,
        cap_rate=metrics.cap_rate,
        coc_return=metrics.cash_on_cash,
        monthly_payment=metrics.monthly_payment,
    )
    # Starlette JSONResponse uses strict JSON — inf/nan must not reach the wire.
    JSONResponse(content=resp.model_dump(mode="json"))
    json.dumps(resp.model_dump(mode="json"))


def test_update_record_seeds_buy_price_from_market_value_override_when_zero():
    record = _minimal_record(buy_price=0, list_price=0)
    updated = DealMakerService.update_record(
        record,
        DealMakerRecordUpdate(market_value_override=848_586),
    )
    assert updated.market_value_override == 848_586
    assert updated.buy_price == 848_586
    assert updated.list_price == 848_586
