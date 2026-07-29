"""The seed's guard against unit errors in lender ratio fields.

`max_ltv`, `max_arv` and the interest rates are stored as fractions (0.925 means
92.5%). A dollar amount landing in one of those columns used to reach the lender
card through the pre-formatted `display` cache — `oakwoodlending.com` rendered
"Max ARV 50000000%". Pure functions, so no database is needed here.
"""

from scripts.seed_lenders import load_lenders, reject_impossible_ratios, row_values


def _row(**overrides):
    row = {
        "domain": "example.com",
        "company_name": "Example Capital",
        "website": "https://example.com",
        "contact_type": "phone_email",
        "nationwide": False,
        "states_served": ["FL"],
        "loan_products": ["fix_flip"],
        "display": {},
    }
    row.update(overrides)
    return row


def test_a_dollar_amount_in_a_ratio_field_is_nulled_not_rescaled():
    values = row_values(
        _row(max_arv=500_000.0, display={"max_arv": "50000000%", "term": "12 mo"})
    )

    # Nulled rather than repaired: 500000.0 could mean 0.5, 0.75, or a loan
    # amount in the wrong column, and the UI must show nothing over a guess.
    assert values["max_arv"] is None
    # The presentation cache is the part that actually reached the card.
    assert "max_arv" not in values["display"]
    assert values["display"]["term"] == "12 mo"


def test_the_shipped_dataset_has_exactly_one_out_of_range_ratio():
    offenders = {
        row["domain"]: reject_impossible_ratios(dict(row))
        for row in load_lenders()
        if reject_impossible_ratios(dict(row))
    }

    # Pins the one known data-quality bug. A regenerated dataset introducing
    # more should fail here rather than quietly nulling extra terms.
    assert offenders == {"oakwoodlending.com": ["max_arv=500000.0"]}


def test_a_published_zero_percent_rate_survives():
    # investinvermont.org really does publish 0% — a subsidised programme, not a
    # unit error. Rejecting zero would delete a true term.
    values = row_values(
        _row(
            min_interest_rate=0.0,
            max_interest_rate=0.0,
            display={"interest_rate": "0%"},
        )
    )

    assert values["min_interest_rate"] == 0.0
    assert values["max_interest_rate"] == 0.0
    assert values["display"]["interest_rate"] == "0%"


def test_valid_ratios_and_point_counts_pass_through():
    values = row_values(
        _row(
            max_ltv=0.925,
            max_arv=0.75,
            min_interest_rate=0.0799,
            max_interest_rate=1.0,
            # Points are counts, not ratios, and run well above 1.0.
            min_points=1.5,
            max_points=10.0,
            display={"max_ltv": "92.5%", "points": "1.5 pts"},
        )
    )

    assert values["max_ltv"] == 0.925
    assert values["max_arv"] == 0.75
    assert values["min_interest_rate"] == 0.0799
    assert values["max_interest_rate"] == 1.0
    assert values["min_points"] == 1.5
    assert values["max_points"] == 10.0
    assert values["display"] == {"max_ltv": "92.5%", "points": "1.5 pts"}


def test_rejecting_a_ratio_does_not_mutate_the_source_dataset():
    row = _row(max_arv=500_000.0, display={"max_arv": "50000000%"})

    row_values(row)

    assert row["max_arv"] == 500_000.0
    assert row["display"] == {"max_arv": "50000000%"}


def test_a_non_numeric_ratio_is_rejected_rather_than_raising():
    # A pre-deploy seed crash blocks the whole deploy, so a bad type must not
    # escape as a TypeError.
    values = row_values(_row(max_ltv="unknown", display={"max_ltv": "unknown"}))

    assert values["max_ltv"] is None
    assert "max_ltv" not in values["display"]
