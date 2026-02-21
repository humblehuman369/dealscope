"""
Property data export service — Excel report with RentCast, AXESSO, and Verdict/Strategy sheets.
"""
import json
import logging
from io import BytesIO
from typing import Any, Dict, List, Tuple

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.utils import get_column_letter

logger = logging.getLogger(__name__)


def _flatten_to_rows(obj: Any, prefix: str = "") -> List[Tuple[str, Any]]:
    """Convert nested dict/list to (key_path, value) rows. Keys are dot-separated."""
    rows: List[Tuple[str, Any]] = []
    if obj is None:
        rows.append((prefix or "value", None))
        return rows
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, (dict, list)) and not (isinstance(v, dict) and v and all(isinstance(x, (str, int, float, bool, type(None))) for x in v.values())):
                rows.extend(_flatten_to_rows(v, key))
            else:
                if isinstance(v, (dict, list)):
                    v = json.dumps(v) if v else ""
                rows.append((key, v))
        return rows
    if isinstance(obj, list):
        for i, item in enumerate(obj):
            key = f"{prefix}[{i}]"
            if isinstance(item, (dict, list)):
                rows.extend(_flatten_to_rows(item, key))
            else:
                rows.append((key, item))
        return rows
    rows.append((prefix or "value", obj))
    return rows


def _sheet_from_flat(ws: Any, rows: List[Tuple[str, Any]], title: str) -> None:
    """Write a sheet with Key, Value columns from (key, value) rows."""
    ws.append(["Key", "Value"])
    ws.cell(row=1, column=1).font = Font(bold=True)
    ws.cell(row=1, column=2).font = Font(bold=True)
    for key, value in rows:
        ws.append([key, value])
    ws.column_dimensions["A"].width = 50
    ws.column_dimensions["B"].width = 40


def _build_rentcast_rows(raw: Dict[str, Any]) -> List[Tuple[str, Any]]:
    """Build flat key/value rows for RentCast sheet (skip internal keys)."""
    out: List[Tuple[str, Any]] = []
    for k, v in raw.items():
        if k.startswith("_"):
            continue
        out.extend(_flatten_to_rows(v, k) if isinstance(v, (dict, list)) else [(k, v)])
    return out


def _build_axesso_rows(raw: Dict[str, Any]) -> List[Tuple[str, Any]]:
    """Build flat key/value rows for AXESSO sheet."""
    out: List[Tuple[str, Any]] = []
    for k, v in raw.items():
        if k in ("address", "fetched_at"):
            out.append((k, v))
            continue
        out.extend(_flatten_to_rows(v, k) if isinstance(v, (dict, list)) else [(k, v)])
    return out


def _build_calculated_rows(verdict: Dict[str, Any], property_data: Dict[str, Any]) -> List[Tuple[str, str]]:
    """Build Calculated sheet: Verdict and Strategy metrics as Label, Value rows."""
    rows: List[Tuple[str, str]] = []
    v = verdict

    def fmt(x: Any) -> str:
        if x is None:
            return ""
        if isinstance(x, float):
            return f"{x:,.2f}" if abs(x) < 1e10 else str(x)
        return str(x)

    # Core verdict
    rows.append(("Deal Score", fmt(v.get("dealScore") or v.get("deal_score"))))
    rows.append(("Deal Verdict", v.get("dealVerdict") or v.get("deal_verdict") or ""))
    rows.append(("Verdict Description", v.get("verdictDescription") or v.get("verdict_description") or ""))
    rows.append(("List Price", fmt(v.get("listPrice") or v.get("list_price"))))
    rows.append(("Income Value", fmt(v.get("incomeValue") or v.get("income_value"))))
    rows.append(("Purchase Price (Target Buy)", fmt(v.get("purchasePrice") or v.get("purchase_price"))))
    rows.append(("Discount %", fmt(v.get("discountPercent") or v.get("discount_percent"))))
    rows.append(("Deal Gap %", fmt(v.get("dealGapPercent") or v.get("deal_gap_percent") or v.get("opportunity_factors", {}).get("deal_gap"))))
    rows.append(("Wholesale MAO", fmt(v.get("wholesaleMao") or v.get("wholesale_mao"))))

    # Opportunity factors
    of = v.get("opportunityFactors") or v.get("opportunity_factors") or {}
    rows.append(("Seller Motivation Score", fmt(of.get("motivation"))))
    rows.append(("Motivation Label", of.get("motivationLabel") or of.get("motivation_label") or ""))
    rows.append(("Buyer Market", of.get("buyerMarket") or of.get("buyer_market") or ""))

    # Return factors (primary strategy)
    rf = v.get("returnFactors") or v.get("return_factors") or {}
    rows.append(("Cap Rate %", fmt(rf.get("capRate") or rf.get("cap_rate"))))
    rows.append(("Cash on Cash %", fmt(rf.get("cashOnCash") or rf.get("cash_on_cash"))))
    rows.append(("DSCR", fmt(rf.get("dscr"))))

    # Strategies table
    strategies = v.get("strategies") or []
    rows.append(("", ""))
    rows.append(("Strategy", "Metric | Score | Cap Rate | CoC | DSCR | Cash Flow"))
    for s in strategies:
        name = s.get("name") or s.get("id") or ""
        metric = s.get("metric") or ""
        score = s.get("score")
        cap = s.get("cap_rate")
        coc = s.get("cash_on_cash")
        dscr = s.get("dscr")
        acf = s.get("annual_cash_flow") or s.get("annualCashFlow")
        mcf = s.get("monthly_cash_flow") or s.get("monthlyCashFlow")
        row_val = f"{metric} | {score} | {fmt(cap)} | {fmt(coc)} | {fmt(dscr)} | ACF: {fmt(acf)} MCF: {fmt(mcf)}"
        rows.append((name, row_val))

    return rows


def generate_property_data_excel(export_data: Dict[str, Any]) -> bytes:
    """
    Generate a 3-sheet Excel workbook from get_property_export_data() result.

    Sheets:
    1. RentCast Data — raw RentCast API data (property, value_estimate, rent_estimate, market_statistics)
    2. AXESSO Data — raw AXESSO/Zillow API data (search_by_address, property_details)
    3. Calculated — Verdict and Strategy metrics (deal score, list price, income value, target buy, strategies)
    """
    wb = Workbook()
    raw_rentcast = export_data.get("raw_rentcast") or {}
    raw_axesso = export_data.get("raw_axesso") or {}
    verdict = export_data.get("verdict") or {}
    property_data = export_data.get("property") or {}

    # Sheet 1: RentCast
    ws_rc = wb.active
    ws_rc.title = "RentCast Data"
    rentcast_rows = _build_rentcast_rows(raw_rentcast)
    _sheet_from_flat(ws_rc, rentcast_rows, "RentCast Data")

    # Sheet 2: AXESSO
    ws_ax = wb.create_sheet("AXESSO Data", 1)
    axesso_rows = _build_axesso_rows(raw_axesso)
    _sheet_from_flat(ws_ax, axesso_rows, "AXESSO Data")

    # Sheet 3: Calculated (Verdict + Strategy)
    ws_calc = wb.create_sheet("Calculated (Verdict & Strategy)", 2)
    calc_rows = _build_calculated_rows(verdict, property_data)
    ws_calc.append(["Label", "Value"])
    ws_calc.cell(row=1, column=1).font = Font(bold=True)
    ws_calc.cell(row=1, column=2).font = Font(bold=True)
    for label, value in calc_rows:
        ws_calc.append([label, value])
    ws_calc.column_dimensions["A"].width = 35
    ws_calc.column_dimensions["B"].width = 55

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()
