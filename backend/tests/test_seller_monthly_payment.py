"""0% seller-carry notes must not amortize principal (interest-only until balloon)."""

from app.services.calculators.common import (
    combined_bank_and_seller_pi,
    seller_monthly_payment,
)


def test_zero_rate_seller_payment_is_zero():
    assert seller_monthly_payment(133_735, 0.0, 5) == 0.0


def test_nonzero_rate_seller_payment_positive():
    pi = seller_monthly_payment(100_000, 0.06, 30)
    assert pi > 0


def test_combined_pi_excludes_zero_rate_seller_component():
    bank_pi, seller_pi, combined = combined_bank_and_seller_pi(
        800_000,
        0.065,
        30,
        133_735,
        0.0,
        5,
    )
    assert seller_pi == 0.0
    assert combined == bank_pi
