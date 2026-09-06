"""STR occupancy must stay None when no provider supplied it."""

from app.schemas.property import RentalData
from app.services.property_service import property_service


def test_rental_data_occupancy_defaults_to_none():
    rentals = RentalData(monthly_rent_ltr=2100)
    assert rentals.occupancy_rate is None


def test_estimate_adr_none_when_mashvisor_monthly_without_occupancy():
    assert property_service._estimate_adr({"str_monthly_revenue_mashvisor": 3000}) is None


def test_estimate_adr_from_mashvisor_when_occupancy_present():
    adr = property_service._estimate_adr(
        {
            "str_monthly_revenue_mashvisor": 3000,
            "occupancy_rate": 0.50,
        }
    )
    assert adr == 3000 / 30 / 0.50


def test_estimate_adr_ltr_heuristic_does_not_invent_occupancy():
    adr = property_service._estimate_adr({"monthly_rent_ltr": 3000})
    assert adr == (3000 / 30) * 2.5
