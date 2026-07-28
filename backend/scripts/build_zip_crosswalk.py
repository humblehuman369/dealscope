"""Build the ZIP -> (state, counties) crosswalk used by directory geo search.

Primary source is the US Census 2020 ZCTA-to-County relationship file, which is
authoritative and carries county assignments. It covers ZCTAs only (~33.8k), so
USPS ZIPs with no ZCTA -- PO-box-only and single-point ZIPs -- are topped up from
an optional supplemental CSV that maps the remaining ZIPs to a state.

    python backend/scripts/build_zip_crosswalk.py [--supplement <export.csv>]

The supplement is any CSV with ``states_served`` and ``zip_codes_served`` columns
(pipe-delimited), e.g. a lender export whose ZIP lists are state expansions.
Only ZIPs absent from the Census data are taken from it, and they get a state
with no county.

Writes backend/app/data/zip_crosswalk.json. Each entry is ``[state, ...counties]``
with counties ordered by land area within the ZIP, largest first:

    {"33460": ["FL", "Palm Beach County"], "00501": ["NY"]}
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "backend" / "app" / "data"
COUNTY_RATES_PATH = DATA_DIR / "landlord_insurance" / "county_rates.json"
OUT_PATH = DATA_DIR / "zip_crosswalk.json"

CENSUS_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/"
    "tab20_zcta520_county20_natl.txt"
)


def load_state_by_fips() -> dict[str, str]:
    """State FIPS prefix -> USPS abbreviation, from the in-repo county table."""
    counties = json.loads(COUNTY_RATES_PATH.read_text(encoding="utf-8"))
    by_fips: dict[str, str] = {}
    for county in counties:
        by_fips[county["geoid"][:2]] = county["state"]
    return by_fips


def fetch_census(path: Path | None) -> str:
    if path is not None:
        return path.read_text(encoding="utf-8-sig")
    with urllib.request.urlopen(CENSUS_URL, timeout=180) as response:
        return response.read().decode("utf-8-sig")


def parse_census(text: str, state_by_fips: dict[str, str]) -> dict[str, list[tuple[str, str]]]:
    """ZIP -> [(state, county), ...] ordered by that part's land area, largest first."""
    parts: dict[str, list[tuple[int, str, str]]] = defaultdict(list)
    for row in csv.DictReader(io.StringIO(text), delimiter="|"):
        zip_code = row["GEOID_ZCTA5_20"]
        county_fips = row["GEOID_COUNTY_20"]
        if not zip_code or not county_fips:
            continue
        state = state_by_fips.get(county_fips[:2])
        if state is None:
            continue  # territory outside the 50 states + DC
        area = int(row["AREALAND_PART"] or 0)
        parts[zip_code].append((area, state, row["NAMELSAD_COUNTY_20"]))

    return {
        zip_code: [(state, county) for _, state, county in sorted(entries, reverse=True)]
        for zip_code, entries in parts.items()
    }


def resolve_state(candidates: list[tuple[str, str]], usps_state: str | None) -> str:
    """Pick the state for a ZIP whose parts may straddle a state line.

    Land area is a poor tie-breaker for border ZIPs — it tracks acreage rather
    than where the post office is. So when a ZIP genuinely spans states and USPS
    names one of them, USPS wins. When Census sees only one state, Census wins:
    a USPS claim outside that state is a data error, not a border case.
    """
    census_states = {state for state, _ in candidates}
    if usps_state in census_states and len(census_states) > 1:
        return usps_state
    return candidates[0][0]


def parse_supplement(path: Path) -> dict[str, str]:
    """ZIP -> state, recovered from pipe-delimited state/ZIP expansion columns."""
    csv.field_size_limit(sys.maxsize)
    with path.open(encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    def states_of(row: dict[str, str]) -> list[str]:
        return row["states_served"].split("|") if row["states_served"] else []

    def zips_of(row: dict[str, str]) -> set[str]:
        return set(row["zip_codes_served"].split("|")) if row["zip_codes_served"] else set()

    state_zips: dict[str, set[str]] = {
        states_of(row)[0]: zips_of(row) for row in rows if len(states_of(row)) == 1
    }
    while True:
        progressed = False
        for row in rows:
            unknown = [s for s in states_of(row) if s not in state_zips]
            if len(unknown) == 1:
                known = {z for s in states_of(row) if s in state_zips for z in state_zips[s]}
                state_zips[unknown[0]] = zips_of(row) - known
                progressed = True
        if not progressed:
            break

    return {zip_code: state for state, zips in state_zips.items() for zip_code in zips}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--supplement", type=Path, help="CSV of USPS ZIPs missing from Census")
    parser.add_argument("--census-file", type=Path, help="Local copy of the Census file")
    args = parser.parse_args()

    state_by_fips = load_state_by_fips()
    census = parse_census(fetch_census(args.census_file), state_by_fips)
    usps_states = parse_supplement(args.supplement) if args.supplement else {}

    crosswalk: dict[str, list[str]] = {}
    border_resolved = 0
    for zip_code, candidates in census.items():
        usps_state = usps_states.get(zip_code)
        state = resolve_state(candidates, usps_state)
        if usps_state is not None and usps_state != candidates[0][0] and state == usps_state:
            border_resolved += 1
        counties = list(dict.fromkeys(c for s, c in candidates if s == state))
        crosswalk[zip_code] = [state, *counties]

    supplement_count = 0
    for zip_code, state in usps_states.items():
        if zip_code not in crosswalk:
            crosswalk[zip_code] = [state]
            supplement_count += 1
    census_count = len(census)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "US Census 2020 ZCTA-to-County relationship file",
        "zips": dict(sorted(crosswalk.items())),
    }
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    with_county = sum(1 for value in crosswalk.values() if len(value) > 1)
    print(
        f"{len(crosswalk):,} ZIPs "
        f"({census_count:,} Census + {supplement_count:,} supplemental state-only), "
        f"{with_county:,} with county, {border_resolved:,} border ZIPs resolved to USPS state "
        f"-> {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KB)"
    )


if __name__ == "__main__":
    main()
