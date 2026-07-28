"""Export the lender directory to CSV: current data + a field-level gap spec.

Run after regenerating ``app/data/lenders.json`` to refresh both artifacts:

    python backend/scripts/export_lenders_csv.py

Outputs (docs/lenders/):
  lenders-current.csv    flattened dump of every record in lenders.json
  lender-data-spec.csv   target schema for the Postgres migration, annotated
                         with how well the current dataset fills each field
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
LENDERS_JSON = REPO_ROOT / "backend" / "app" / "data" / "lenders.json"
OUT_DIR = REPO_ROOT / "docs" / "lenders"

LIST_DELIMITER = "|"

# Scalar columns in the flattened export, in output order.
SCALAR_FIELDS = [
    "id",
    "domain",
    "company_name",
    "website",
    "phone",
    "email",
    "contact_type",
    "city",
    "state",
    "states_served_count",
    "nationwide",
    "description",
    "min_loan_amount",
    "max_loan_amount",
    "max_ltv",
    "max_arv",
    "min_interest_rate",
    "max_interest_rate",
    "min_points",
    "max_points",
    "min_term_months",
    "max_term_months",
    "interest_only",
    "nmls_id",
    "aapl_member",
    "year_founded",
    "credit_check_policy",
    "min_credit_score",
    "no_credit_check",
    "source",
]
LIST_FIELDS = ["states_served", "loan_products"]
DISPLAY_FIELDS = ["loan_range", "max_ltv", "max_arv", "interest_rate", "points", "term"]

# Target schema. Fill stats for `existing` fields are computed from lenders.json;
# `new` fields have no data yet and are what a regenerated dataset must supply.
# (field, category, status, postgres_type, powers_filter, notes)
SPEC: list[tuple[str, str, str, str, str, str]] = [
    # -- identity ---------------------------------------------------------
    ("id", "identity", "existing", "INTEGER PRIMARY KEY", "",
     "Stable across regenerations — saved_directory_contacts.entity_id references it. Never renumber."),
    ("domain", "identity", "existing", "TEXT NOT NULL UNIQUE", "",
     "Natural dedupe key. Use this to upsert rather than id when merging a new scrape."),
    ("company_name", "identity", "existing", "TEXT NOT NULL", "name search", ""),
    ("website", "identity", "existing", "TEXT NOT NULL", "", ""),
    # -- contact ----------------------------------------------------------
    ("phone", "contact", "existing", "TEXT", "", "Null implies web_only contact_type."),
    ("email", "contact", "existing", "TEXT", "", ""),
    ("contact_type", "contact", "existing", "TEXT NOT NULL", "include web-only toggle",
     "Enum: phone_only | email_only | phone_and_email | web_only."),
    # -- HQ location ------------------------------------------------------
    ("city", "location_hq", "existing", "TEXT", "",
     "Headquarters city, NOT a service area. Needed to derive hq_county."),
    ("state", "location_hq", "existing", "CHAR(2)", "",
     "Headquarters state, NOT a service area. Powers the 'HQ in <state>' locality badge."),
    ("hq_county", "location_hq", "new", "TEXT", "",
     "NEW. Format 'Palm Beach County, FL'. Derivable from city+state via the ZIP/county crosswalk."),
    ("hq_zip", "location_hq", "new", "TEXT", "",
     "NEW. 5-digit. Easiest reliable geocoding anchor; derive hq_county and lat/lng from it."),
    ("hq_lat", "location_hq", "new", "NUMERIC(9,6)", "",
     "NEW. Only required if you want radius-based 'lenders near this deal' ranking."),
    ("hq_lng", "location_hq", "new", "NUMERIC(9,6)", "",
     "NEW. Pairs with hq_lat."),
    # -- coverage (the actual gap) ---------------------------------------
    ("states_served", "coverage", "existing", "TEXT[] NOT NULL", "State filter",
     "Only coverage dimension that exists today. 2-letter codes."),
    ("states_served_count", "coverage", "existing", "INTEGER NOT NULL", "",
     "Denormalized len(states_served). Drop it in Postgres and compute, or keep for sort speed."),
    ("nationwide", "coverage", "existing", "BOOLEAN NOT NULL", "",
     "True at 51 states served. Used to rank nationwide shops below local ones."),
    ("counties_served", "coverage", "new", "TEXT[]", "County filter (BLOCKER)",
     "NEW. REQUIRED for a county filter. Format 'Palm Beach County, FL'. Empty array must mean "
     "'not published', never 'serves none' — see coverage_granularity."),
    ("coverage_granularity", "coverage", "new", "TEXT NOT NULL", "result labelling",
     "NEW. REQUIRED. Enum: nationwide | state | county. Tells the UI how precise the match is so "
     "we can say 'licensed in FL' vs 'lends in Palm Beach County' without overstating."),
    ("excluded_states", "coverage", "new", "TEXT[]", "",
     "NEW. Optional. Many 'nationwide' lenders exclude a handful of states (commonly ND, SD, VT, "
     "AZ, MN). Cheap accuracy win — today all 79 nationwide records claim all 51."),
    ("lending_radius_miles", "coverage", "new", "INTEGER", "",
     "NEW. Optional. Alternative to counties_served for local lenders that advertise a radius."),
    ("metro_areas_served", "coverage", "new", "TEXT[]", "",
     "NEW. Optional. CBSA/metro names. Often published when county lists are not."),
    # -- loan terms -------------------------------------------------------
    ("loan_products", "loan_terms", "existing", "TEXT[] NOT NULL", "Loan product filter",
     "Enum values: fix_flip | brrrr | dscr | bridge | rental | refi | construction | commercial."),
    ("description", "loan_terms", "existing", "TEXT", "", ""),
    ("min_loan_amount", "loan_terms", "existing", "INTEGER", "", ""),
    ("max_loan_amount", "loan_terms", "existing", "INTEGER", "'funds at least' filter",
     "Filter compares max_loan_amount >= threshold; nulls currently pass through."),
    ("max_ltv", "loan_terms", "existing", "NUMERIC(4,3)", "", "Decimal, e.g. 0.85."),
    ("max_arv", "loan_terms", "existing", "NUMERIC(4,3)", "", "Decimal."),
    ("min_interest_rate", "loan_terms", "existing", "NUMERIC(5,4)", "", "Decimal, e.g. 0.058."),
    ("max_interest_rate", "loan_terms", "existing", "NUMERIC(5,4)", "", "Decimal."),
    ("min_points", "loan_terms", "existing", "NUMERIC(4,2)", "", ""),
    ("max_points", "loan_terms", "existing", "NUMERIC(4,2)", "", ""),
    ("min_term_months", "loan_terms", "existing", "INTEGER", "", ""),
    ("max_term_months", "loan_terms", "existing", "INTEGER", "", ""),
    ("interest_only", "loan_terms", "existing", "BOOLEAN", "", ""),
    # -- credit -----------------------------------------------------------
    ("credit_check_policy", "credit", "existing", "TEXT", "Credit policy filter",
     "Enum: none | soft_pull | hard_pull."),
    ("min_credit_score", "credit", "existing", "INTEGER", "'no minimum score' filter", ""),
    ("no_credit_check", "credit", "existing", "BOOLEAN", "Credit policy filter",
     "Falls back to credit_check_policy in ('none','soft_pull') when null."),
    # -- trust / provenance ----------------------------------------------
    ("nmls_id", "provenance", "existing", "TEXT", "",
     "Trust signal — currently near-empty. Worth prioritising in the regeneration."),
    ("aapl_member", "provenance", "existing", "BOOLEAN", "", "Trust signal."),
    ("year_founded", "provenance", "existing", "INTEGER", "", "Trust signal."),
    ("source", "provenance", "existing", "TEXT NOT NULL", "",
     "Present in JSON but stripped at the API boundary (not on LenderOut)."),
    ("coverage_source_url", "provenance", "new", "TEXT", "",
     "NEW. STRONGLY RECOMMENDED. The page the coverage claim was read from. Without it, county "
     "claims are unauditable and we cannot honour the no-fake-data rule."),
    ("coverage_verified_at", "provenance", "new", "TIMESTAMPTZ", "",
     "NEW. STRONGLY RECOMMENDED. Lets the UI age out stale coverage instead of asserting it forever."),
    ("last_seen_at", "provenance", "new", "TIMESTAMPTZ", "",
     "NEW. Recommended. Distinguishes 'delisted' from 'missing from this scrape'."),
    ("is_active", "provenance", "new", "BOOLEAN NOT NULL DEFAULT TRUE", "",
     "NEW. Recommended. Soft-delete so saved_directory_contacts never dangle."),
    ("created_at", "provenance", "new", "TIMESTAMPTZ NOT NULL", "",
     "NEW. Standard column on cash_buyers; match it."),
    ("updated_at", "provenance", "new", "TIMESTAMPTZ NOT NULL", "",
     "NEW. Standard column on cash_buyers; match it."),
    # -- separate reference dataset --------------------------------------
    ("zip_crosswalk", "reference_data", "built", "app/data/zip_crosswalk.json", "ZIP search (DONE)",
     "NOT a lender column. ZIP -> (state, counties) for 42,570 ZIPs; 33,774 carry a county. Source: "
     "US Census 2020 ZCTA-to-County relationship file, topped up with USPS-only ZIPs. Rebuild with "
     "backend/scripts/build_zip_crosswalk.py. This already unblocks ZIP search; county filtering "
     "still waits on counties_served."),
]


def load_lenders() -> list[dict[str, Any]]:
    with LENDERS_JSON.open(encoding="utf-8") as f:
        return json.load(f)["lenders"]


def is_filled(value: Any) -> bool:
    if value is None or value == "":
        return False
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def write_current_export(lenders: list[dict[str, Any]], path: Path) -> None:
    header = SCALAR_FIELDS + LIST_FIELDS + [f"display_{f}" for f in DISPLAY_FIELDS]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for lender in lenders:
            display = lender.get("display") or {}
            row = [lender.get(field) for field in SCALAR_FIELDS]
            row += [LIST_DELIMITER.join(lender.get(field) or []) for field in LIST_FIELDS]
            row += [display.get(field) for field in DISPLAY_FIELDS]
            writer.writerow(["" if cell is None else cell for cell in row])


def write_spec(lenders: list[dict[str, Any]], path: Path) -> None:
    total = len(lenders)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "field",
            "category",
            "status",
            "postgres_type",
            "records_populated",
            "fill_pct",
            "powers_filter",
            "notes",
        ])
        for field, category, status, pg_type, powers, notes in SPEC:
            if status == "existing":
                populated = sum(1 for lender in lenders if is_filled(lender.get(field)))
                fill = f"{populated / total * 100:.1f}%" if total else "0.0%"
                populated_cell: str = str(populated)
            else:
                populated_cell, fill = "0", "0.0%"
            writer.writerow([field, category, status, pg_type, populated_cell, fill, powers, notes])


def main() -> None:
    lenders = load_lenders()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_current_export(lenders, OUT_DIR / "lenders-current.csv")
    write_spec(lenders, OUT_DIR / "lender-data-spec.csv")
    print(f"{len(lenders)} lenders -> {OUT_DIR}")


if __name__ == "__main__":
    main()
