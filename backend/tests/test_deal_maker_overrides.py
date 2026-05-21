"""Tests for Appraiser override fields on DealMakerRecord."""

from app.schemas.deal_maker import DealMakerRecord, DealMakerRecordUpdate, InitialAssumptions
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
