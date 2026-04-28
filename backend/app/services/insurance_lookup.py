"""
County-level landlord insurance estimates from ACS-based ratios + state calibration.

Data: backend/app/data/landlord_insurance/{county_rates,state_calibration}.json
Rebuilt from data/DealGapIQ_Landlord_Insurance_Dataset.xlsx via
scripts/build_landlord_insurance_data.py
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final

# Must stay in sync with build_landlord_insurance_data.py
_STATE_FULL_TO_ABBREV: Final[dict[str, str]] = {
    "Alabama": "AL",
    "Alaska": "AK",
    "Arizona": "AZ",
    "Arkansas": "AR",
    "California": "CA",
    "Colorado": "CO",
    "Connecticut": "CT",
    "Delaware": "DE",
    "District of Columbia": "DC",
    "Florida": "FL",
    "Georgia": "GA",
    "Hawaii": "HI",
    "Idaho": "ID",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kansas": "KS",
    "Kentucky": "KY",
    "Louisiana": "LA",
    "Maine": "ME",
    "Maryland": "MD",
    "Massachusetts": "MA",
    "Michigan": "MI",
    "Minnesota": "MN",
    "Mississippi": "MS",
    "Missouri": "MO",
    "Montana": "MT",
    "Nebraska": "NE",
    "Nevada": "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    "Ohio": "OH",
    "Oklahoma": "OK",
    "Oregon": "OR",
    "Pennsylvania": "PA",
    "Puerto Rico": "PR",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    "Tennessee": "TN",
    "Texas": "TX",
    "Utah": "UT",
    "Vermont": "VT",
    "Virginia": "VA",
    "Washington": "WA",
    "West Virginia": "WV",
    "Wisconsin": "WI",
    "Wyoming": "WY",
}

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "landlord_insurance"
_COUNTY_INDEX: dict[tuple[str, str], dict[str, Any]] = {}
_STATE_CALIBRATION: dict[str, float] = {}
_LOADED: bool = False


@dataclass(frozen=True, slots=True)
class CountyInsuranceRecord:
    geoid: str
    county: str
    state: str
    state_full: str
    ratio: float
    median_home_value: int | None
    avg_ho_insurance_annual: float | None


def _load_json() -> None:
    global _COUNTY_INDEX, _STATE_CALIBRATION, _LOADED
    if _LOADED:
        return
    cr_path = _DATA_DIR / "county_rates.json"
    sc_path = _DATA_DIR / "state_calibration.json"
    if not cr_path.is_file() or not sc_path.is_file():
        _LOADED = True
        return
    with open(cr_path, encoding="utf-8") as f:
        rows: list[dict[str, Any]] = json.load(f)
    for r in rows:
        st = str(r.get("state", "")).upper().strip()
        cname = r.get("county")
        if not st or not cname:
            continue
        key = (st, _normalize_county_for_key(str(cname)))
        if key[1] is None:
            continue
        _COUNTY_INDEX[key] = r
    with open(sc_path, encoding="utf-8") as f:
        raw_cal = json.load(f)
    _STATE_CALIBRATION = {str(k).upper(): float(v) for k, v in raw_cal.items()}
    _LOADED = True


def resolve_state_abbrev(state: str | None) -> str | None:
    """RentCast / UI may pass 'FL' or 'Florida'."""
    if not state:
        return None
    s = str(state).strip()
    if len(s) == 2 and s.isalpha():
        return s.upper()
    # Title-case match for full names
    ab = _STATE_FULL_TO_ABBREV.get(s) or _STATE_FULL_TO_ABBREV.get(s.title())
    return ab


def _normalize_county_for_key(name: str) -> str | None:
    """
    Match build script county labels: drop County/Parish/Borough/… suffixes,
    lower-case, collapse space. 'Palm Beach County' -> 'palm beach'.
    """
    n = name.strip().lower()
    if not n:
        return None
    for suf in (
        " city and borough",
        " municipality",
        " county",
        " parish",
        " borough",
        " census area",
        " municipio",
    ):
        if n.endswith(suf):
            n = n[: -len(suf)].strip()
            break
    n = re.sub(r"\s+", " ", n).strip()
    return n or None


def normalize_county_name(name: str | None) -> str | None:
    """Public helper for tests — same as internal key normalization."""
    if not name:
        return None
    return _normalize_county_for_key(name)


def lookup_county_insurance(state: str | None, county: str | None) -> CountyInsuranceRecord | None:
    _load_json()
    st = resolve_state_abbrev(state)
    ck = _normalize_county_for_key(str(county or "")) if county else None
    if not st or not ck:
        return None
    r = _COUNTY_INDEX.get((st, ck))
    if not r:
        return None
    return CountyInsuranceRecord(
        geoid=str(r["geoid"]),
        county=str(r["county"]),
        state=str(r["state"]),
        state_full=str(r["state_full"]),
        ratio=float(r["ratio"]),
        median_home_value=int(r["median_home_value"]) if r.get("median_home_value") is not None else None,
        avg_ho_insurance_annual=float(r["avg_ho_insurance_annual"])
        if r.get("avg_ho_insurance_annual") is not None
        else None,
    )


def get_state_calibration_multiplier(state: str | None) -> float | None:
    """ACS → current-year dollars; returns None if state unknown in calibration file."""
    _load_json()
    st = resolve_state_abbrev(state)
    if not st:
        return None
    if st in _STATE_CALIBRATION:
        return _STATE_CALIBRATION[st]
    return None


def estimate_landlord_insurance_annual(
    home_value: float,
    state: str | None,
    county: str | None,
) -> float | None:
    """
    market annual = round(home_value * county_ratio * state_multiplier)

    Returns None if county or state calibration cannot be resolved (caller
    should fall back to zip/state insurance_rate).
    """
    if not home_value or home_value <= 0:
        return None
    rec = lookup_county_insurance(state, county)
    mult = get_state_calibration_multiplier(state)
    if rec is None or mult is None:
        return None
    return round(home_value * rec.ratio * mult)


_load_json()
