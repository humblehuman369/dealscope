"""Build the canonical county seed file from the US Census Gazetteer.

    cd backend && python -m scripts.build_counties_data [--gazetteer <file.txt>]

Downloads the Gazetteer unless --gazetteer points at a local copy. Writes
backend/app/data/geo/counties.json, the seed source for the ``geo_counties``
table (see backend/scripts/seed_geo_counties.py).

Everything the Gazetteer lists is included, Puerto Rico included, because
zip_crosswalk.json already resolves 132 PR ZIPs and the two datasets have to
join cleanly.

Connecticut needs special handling. It replaced its eight county governments
with nine planning regions for statistical purposes in 2022, so the 2024
Gazetteer lists the new regions while zip_crosswalk.json — built from the
2020-vintage ZCTA relationship file — still references the old counties for 445
CT ZIPs. Both vintages are emitted so either joins; the retired counties are
flagged ``is_current: false``.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import urllib.request
import zipfile
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "backend" / "app" / "data" / "geo" / "counties.json"

GAZETTEER_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_counties_national.zip"
)
SOURCE_LABEL = "US Census 2024 Gazetteer — counties"

# Connecticut's pre-2022 counties, still referenced by the 2020-vintage ZCTA data
# behind zip_crosswalk.json. FIPS and names taken from that same Census file, so
# the join is guaranteed to resolve. No centroid: the Gazetteer no longer
# publishes one for a retired geography, and inventing one would be a guess.
RETIRED_COUNTIES: list[dict[str, object]] = [
    {"fips": "09001", "name": "Fairfield County", "state": "CT"},
    {"fips": "09003", "name": "Hartford County", "state": "CT"},
    {"fips": "09005", "name": "Litchfield County", "state": "CT"},
    {"fips": "09007", "name": "Middlesex County", "state": "CT"},
    {"fips": "09009", "name": "New Haven County", "state": "CT"},
    {"fips": "09011", "name": "New London County", "state": "CT"},
    {"fips": "09013", "name": "Tolland County", "state": "CT"},
    {"fips": "09015", "name": "Windham County", "state": "CT"},
]

# Census county names carry a state-specific suffix: "County" in most states,
# "Parish" in LA, "Borough"/"Census Area"/"City and Borough"/"Municipality" in AK,
# and a lowercase "city" for independent cities ("Baltimore city"). Capitalised
# "City" is part of the name itself, so "Carson City" must survive intact — hence
# the lowercase-only alternative here.
_SUFFIX = re.compile(r"\s+(County|Parish|Census Area|City and Borough|Borough|Municipality|Municipio|city)$")


def short_name(name: str) -> str:
    """Strip the governmental suffix: "Palm Beach County" -> "Palm Beach".

    Names with no suffix (District of Columbia, Connecticut's planning regions)
    are returned unchanged.
    """
    return _SUFFIX.sub("", name)


def fetch_gazetteer(path: Path | None) -> str:
    """Read the Gazetteer county file. It is UTF-8 ("Doña Ana County")."""
    if path is not None:
        return path.read_text(encoding="utf-8")

    with urllib.request.urlopen(GAZETTEER_URL, timeout=180) as response:
        payload = response.read()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        name = next(n for n in archive.namelist() if n.endswith(".txt"))
        return archive.read(name).decode("utf-8")


def parse(text: str) -> list[dict[str, object]]:
    counties: list[dict[str, object]] = []
    for raw in csv.DictReader(io.StringIO(text), delimiter="\t"):
        row = {key.strip(): (value or "").strip() for key, value in raw.items()}
        name = row["NAME"]
        counties.append(
            {
                "fips": row["GEOID"],
                "name": name,
                "short_name": short_name(name),
                "state": row["USPS"],
                "lat": float(row["INTPTLAT"]),
                "lng": float(row["INTPTLONG"]),
                "is_current": True,
            }
        )

    current = {county["fips"] for county in counties}
    for retired in RETIRED_COUNTIES:
        if retired["fips"] in current:
            continue  # the Gazetteer reinstated it; its own row wins
        counties.append(
            {
                "fips": retired["fips"],
                "name": retired["name"],
                "short_name": short_name(str(retired["name"])),
                "state": retired["state"],
                "lat": None,
                "lng": None,
                "is_current": False,
            }
        )

    return sorted(counties, key=lambda county: county["fips"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gazetteer", type=Path, help="Local copy of the Gazetteer county file")
    args = parser.parse_args()

    counties = parse(fetch_gazetteer(args.gazetteer))

    seen = {county["fips"] for county in counties}
    if len(seen) != len(counties):
        raise SystemExit("Duplicate county FIPS in source data")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(UTC).isoformat(),
                "source": SOURCE_LABEL,
                "counties": counties,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    states = len({county["state"] for county in counties})
    retired = sum(1 for county in counties if not county["is_current"])
    print(
        f"{len(counties):,} counties across {states} states "
        f"({len(counties) - retired:,} current + {retired} retired) "
        f"-> {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KB)"
    )


if __name__ == "__main__":
    main()
