"""Seller-carry notes amortize by default (0% → principal÷term); deferred notes are $0/mo."""

from app.services.calculators.common import (
    combined_bank_and_seller_pi,
    seller_monthly_payment,
)


def test_zero_rate_amortizes_principal_over_term():
    # 0% note pays principal evenly over the term (no interest).
    assert seller_monthly_payment(133_735, 0.0, 5) == 133_735 / (5 * 12)


def test_zero_rate_interest_only_is_deferred():
    # Deferred (interest-only) 0% note pays nothing monthly until the balloon.
    assert seller_monthly_payment(133_735, 0.0, 5, interest_only=True) == 0.0


def test_nonzero_rate_seller_payment_positive():
    pi = seller_monthly_payment(100_000, 0.06, 30)
    assert pi > 0


def test_combined_pi_includes_amortizing_zero_rate_seller_component():
    bank_pi, seller_pi, combined = combined_bank_and_seller_pi(
        800_000,
        0.065,
        30,
        133_735,
        0.0,
        5,
    )
    assert seller_pi == 133_735 / (5 * 12)
    assert combined == bank_pi + seller_pi


def test_combined_pi_excludes_deferred_zero_rate_seller_component():
    bank_pi, seller_pi, combined = combined_bank_and_seller_pi(
        800_000,
        0.065,
        30,
        133_735,
        0.0,
        5,
        seller_interest_only=True,
    )
    assert seller_pi == 0.0
    assert combined == bank_pi
