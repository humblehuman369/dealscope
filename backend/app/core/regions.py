"""U.S. state → investor discount cohort for regional probability.

Used by IQ Verdict cumulative discount probability (Sale-to-list style cohorts).
See docs/INVESTOR_DISCOUNT_DATA.md for methodology.
"""

from __future__ import annotations

# Keys must match REGIONAL_COHORT_PERCENTAGES in iq_verdict_service.py
SUN_BELT_STATES: frozenset[str] = frozenset(
    {
        "AL",
        "AR",
        "AZ",
        "CO",
        "FL",
        "GA",
        "ID",
        "LA",
        "MS",
        "NC",
        "NM",
        "NV",
        "OK",
        "SC",
        "TN",
        "TX",
        "UT",
    }
)

MIDWEST_AFFORDABILITY_STATES: frozenset[str] = frozenset(
    {
        "IA",
        "IL",
        "IN",
        "KS",
        "KY",
        "MI",
        "MN",
        "MO",
        "MT",
        "ND",
        "NE",
        "OH",
        "PA",
        "SD",
        "WI",
        "WV",
        "WY",
    }
)

COASTAL_NORTHEAST_STATES: frozenset[str] = frozenset(
    {
        "AK",
        "CA",
        "CT",
        "DE",
        "HI",
        "MA",
        "MD",
        "ME",
        "NH",
        "NJ",
        "NY",
        "OR",
        "RI",
        "VA",
        "VT",
        "WA",
    }
)

# District of Columbia — Coastal / Northeast cohort
DISTRICT_CODES: frozenset[str] = frozenset({"DC"})

REGION_DISPLAY_LABELS: dict[str, str] = {
    "national": "U.S.",
    "sun_belt": "Sun Belt",
    "midwest_affordability": "Midwest",
    "coastal_northeast": "Coastal / Northeast",
}


def resolve_investor_probability_region(state: str | None) -> tuple[str, str]:
    """Map a two-letter state code to (distribution_key, human-readable label).

    When state is missing or invalid, returns the national baseline distribution.
    """
    if not state:
        return ("national", REGION_DISPLAY_LABELS["national"])
    code = state.strip().upper()
    if len(code) != 2:
        return ("national", REGION_DISPLAY_LABELS["national"])

    if code in SUN_BELT_STATES:
        return ("sun_belt", REGION_DISPLAY_LABELS["sun_belt"])
    if code in MIDWEST_AFFORDABILITY_STATES:
        return ("midwest_affordability", REGION_DISPLAY_LABELS["midwest_affordability"])
    if code in COASTAL_NORTHEAST_STATES or code in DISTRICT_CODES:
        return ("coastal_northeast", REGION_DISPLAY_LABELS["coastal_northeast"])

    # Unknown territory — fall back to national
    return ("national", REGION_DISPLAY_LABELS["national"])
