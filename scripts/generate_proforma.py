"""
DealGap IQ — Financial Proforma Excel Generator
Generates a multi-sheet Excel workbook with formulas, formatting, and charts.
"""

import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, LineChart, Reference
from copy import copy

# ─── Palette ───────────────────────────────────────────────────────────────────
WHITE = "FFFFFF"
BLACK = "000000"
DARK_BG = "0C1220"
HEADER_BG = "1A2332"
ACCENT_BLUE = "3B82F6"
ACCENT_GREEN = "22C55E"
ACCENT_RED = "EF4444"
ACCENT_YELLOW = "F59E0B"
LIGHT_GRAY = "F1F5F9"
MED_GRAY = "94A3B8"
ROW_ALT = "F8FAFC"
BORDER_COLOR = "CBD5E1"

# ─── Reusable styles ──────────────────────────────────────────────────────────
thin_border = Border(
    left=Side(style="thin", color=BORDER_COLOR),
    right=Side(style="thin", color=BORDER_COLOR),
    top=Side(style="thin", color=BORDER_COLOR),
    bottom=Side(style="thin", color=BORDER_COLOR),
)

header_font = Font(name="Calibri", bold=True, size=11, color=WHITE)
header_fill = PatternFill(start_color=HEADER_BG, end_color=HEADER_BG, fill_type="solid")
title_font = Font(name="Calibri", bold=True, size=14, color=ACCENT_BLUE)
section_font = Font(name="Calibri", bold=True, size=12, color=HEADER_BG)
bold_font = Font(name="Calibri", bold=True, size=11)
normal_font = Font(name="Calibri", size=11)
small_font = Font(name="Calibri", size=10, color=MED_GRAY)
money_fmt = '#,##0.00'
pct_fmt = '0.0%'
int_fmt = '#,##0'
acct_fmt = '$#,##0.00'
acct_fmt_neg = '$#,##0.00;[Red]($#,##0.00)'

green_font = Font(name="Calibri", bold=True, size=11, color=ACCENT_GREEN)
red_font = Font(name="Calibri", bold=True, size=11, color=ACCENT_RED)
green_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
red_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
yellow_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
alt_fill = PatternFill(start_color=ROW_ALT, end_color=ROW_ALT, fill_type="solid")
light_fill = PatternFill(start_color=LIGHT_GRAY, end_color=LIGHT_GRAY, fill_type="solid")
blue_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")


def style_header_row(ws, row, max_col):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border


def style_data_row(ws, row, max_col, is_alt=False):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = normal_font
        cell.border = thin_border
        if is_alt:
            cell.fill = alt_fill


def style_total_row(ws, row, max_col):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = bold_font
        cell.border = Border(
            top=Side(style="double", color=HEADER_BG),
            bottom=Side(style="double", color=HEADER_BG),
            left=Side(style="thin", color=BORDER_COLOR),
            right=Side(style="thin", color=BORDER_COLOR),
        )
        cell.fill = light_fill


def auto_width(ws, min_width=10, max_width=28):
    for col_cells in ws.columns:
        col_letter = get_column_letter(col_cells[0].column)
        max_len = min_width
        for cell in col_cells:
            if cell.value is not None:
                max_len = max(max_len, min(len(str(cell.value)) + 3, max_width))
        ws.column_dimensions[col_letter].width = max_len


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 1 — Dashboard / Summary
# ══════════════════════════════════════════════════════════════════════════════
def build_dashboard(wb):
    ws = wb.active
    ws.title = "Dashboard"
    ws.sheet_properties.tabColor = ACCENT_BLUE

    ws.merge_cells("A1:F1")
    ws["A1"] = "DealGap IQ — Financial Proforma"
    ws["A1"].font = Font(name="Calibri", bold=True, size=18, color=ACCENT_BLUE)
    ws["A1"].alignment = Alignment(horizontal="left")

    ws.merge_cells("A2:F2")
    ws["A2"] = "Breakeven & Profitability Analysis  |  April 2026"
    ws["A2"].font = Font(name="Calibri", size=12, color=MED_GRAY)

    # ── KPI Cards ──
    r = 4
    kpis = [
        ("Monthly Burn (0 subs)", "$386.83", ACCENT_RED),
        ("Breakeven Subscribers", "12 Pro", ACCENT_BLUE),
        ("Blended Net ARPU", "$34.12/mo", ACCENT_GREEN),
        ("Margin @ 100 Subs", "88%", ACCENT_GREEN),
        ("Primary Cost Driver", "RentCast (51%)", ACCENT_YELLOW),
        ("First Scale Trigger", "~80–200 subs", ACCENT_YELLOW),
    ]
    for i, (label, value, color) in enumerate(kpis):
        col = (i % 3) * 2 + 1
        row = r if i < 3 else r + 3
        ws.cell(row=row, column=col, value=label).font = Font(name="Calibri", size=10, color=MED_GRAY)
        ws.cell(row=row, column=col).alignment = Alignment(horizontal="center")
        ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + 1)
        val_cell = ws.cell(row=row + 1, column=col, value=value)
        val_cell.font = Font(name="Calibri", bold=True, size=16, color=color)
        val_cell.alignment = Alignment(horizontal="center")
        ws.merge_cells(start_row=row + 1, start_column=col, end_row=row + 1, end_column=col + 1)

    # ── Pricing ──
    r = 11
    ws.cell(row=r, column=1, value="SUBSCRIPTION PRICING").font = section_font
    r += 1
    headers = ["Tier", "Monthly", "Annual", "Eff. Monthly (Annual)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))
    r += 1
    for row_data in [
        ("Starter (Free)", 0, 0, 0),
        ("Pro", 39.99, 349.99, 29.17),
    ]:
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if c > 1:
                cell.number_format = acct_fmt
        style_data_row(ws, r, len(headers), r % 2 == 0)
        r += 1

    # ── Net Revenue ──
    r += 1
    ws.cell(row=r, column=1, value="NET REVENUE AFTER PROCESSING FEES").font = section_font
    r += 1
    headers = ["Channel", "Fee Structure", "Monthly Net", "Annual Net (/mo)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))
    r += 1
    net_data = [
        ("Stripe (Web)", "2.9% + $0.30/txn", 38.53, 28.30),
        ("Apple IAP (15% SBP)", "15% commission", 33.99, 24.79),
        ("Google Play (15%)", "15% commission", 33.99, 24.79),
    ]
    for row_data in net_data:
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if c >= 3:
                cell.number_format = acct_fmt
        style_data_row(ws, r, len(headers), r % 2 == 0)
        r += 1

    # ── Blended ARPU ──
    r += 1
    ws.cell(row=r, column=1, value="BLENDED NET ARPU").font = section_font
    r += 1
    headers = ["Segment", "Mix %", "Net $/mo", "Contribution"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))
    r += 1
    arpu_data = [
        ("Web — Monthly", 0.52, 38.53, 20.04),
        ("Web — Annual", 0.28, 28.30, 7.92),
        ("iOS — Monthly", 0.13, 33.99, 4.42),
        ("iOS — Annual", 0.07, 24.79, 1.74),
    ]
    for row_data in arpu_data:
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if c == 2:
                cell.number_format = pct_fmt
            elif c >= 3:
                cell.number_format = acct_fmt
        style_data_row(ws, r, len(headers), r % 2 == 0)
        r += 1
    # Total row
    for c, v in enumerate(["Blended ARPU (net)", 1.0, "", 34.12], 1):
        cell = ws.cell(row=r, column=c, value=v)
        if c == 2:
            cell.number_format = pct_fmt
        elif c == 4:
            cell.number_format = acct_fmt
    style_total_row(ws, r, len(headers))

    auto_width(ws, min_width=12, max_width=30)
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 2 — Fixed Costs
# ══════════════════════════════════════════════════════════════════════════════
def build_fixed_costs(wb):
    ws = wb.create_sheet("Fixed Costs")
    ws.sheet_properties.tabColor = ACCENT_RED

    ws.merge_cells("A1:G1")
    ws["A1"] = "Fixed Monthly Costs — Current Plans"
    ws["A1"].font = title_font

    r = 3
    headers = ["#", "Service", "Plan", "Monthly Cost", "Included Quota", "Overage Rate", "Notes"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))

    costs = [
        (1, "RentCast API", "Growth", 199.00, "5,000 req/mo", "$0.03/req", "Primary data provider"),
        (2, "Zillow / AXESSO API", "Production", 82.00, "100,000 req/mo", "n/a", "€75 ≈ $82 USD"),
        (3, "RapidAPI — Redfin", "Pro", 15.00, "~1,000+ req/mo", "n/a", "Verify quota in dashboard"),
        (4, "RapidAPI — Realtor", "Pro", 15.00, "~1,000+ req/mo", "n/a", "Verify quota in dashboard"),
        (5, "Railway", "Pro", 20.00, "$20 usage credit", "Usage-based", "Backend hosting"),
        (6, "Vercel", "Pro", 20.00, "Standard limits", "Usage-based", "Frontend hosting"),
        (7, "Expo (EAS)", "Starter", 19.00, "3K MAUs", "n/a", "$45 build credit"),
        (8, "Apple Developer", "Annual", 8.25, "—", "—", "$99/yr amortized"),
        (9, "Google Play Developer", "One-time", 2.08, "—", "—", "$25 amortized 12 mo"),
        (10, "Domain (dealgapiq.com)", "Annual", 1.50, "—", "—", "~$18/yr amortized"),
        (11, "Anthropic (Claude)", "Pay-per-use", 5.00, "—", "~$0.01/call", "Appraisal narratives"),
        (12, "Google Maps Platform", "Pay-as-you-go", 0.00, "$200/mo free credit", "Pay-as-you-go", "Autocomplete + Geocoding"),
        (13, "Sentry", "Free", 0.00, "5K errors/mo", "n/a", "Error monitoring"),
        (14, "Resend", "Free", 0.00, "3,000 emails/mo", "n/a", "Transactional email"),
        (15, "RevenueCat", "Free", 0.00, "< $2,500 MTR", "1% above", "Mobile IAP management"),
    ]

    for i, row_data in enumerate(costs):
        r += 1
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if c == 4:
                cell.number_format = acct_fmt
        style_data_row(ws, r, len(headers), i % 2 == 1)

    # Total
    r += 1
    ws.cell(row=r, column=1, value="")
    ws.cell(row=r, column=2, value="TOTAL FIXED COSTS")
    ws.cell(row=r, column=3, value="")
    total_cell = ws.cell(row=r, column=4)
    total_cell.value = f"=SUM(D4:D{r-1})"
    total_cell.number_format = acct_fmt
    style_total_row(ws, r, len(headers))
    total_row = r

    # ── Additional / Verify Costs ──
    r += 2
    ws.merge_cells(f"A{r}:G{r}")
    ws.cell(row=r, column=1, value="Additional Costs to Consider (Not in Total)").font = section_font
    r += 1
    headers2 = ["", "Item", "", "Est. Monthly Cost", "", "", "Notes"]
    for c, h in enumerate(headers2, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers2))

    addl = [
        ("", "GitHub (private repos)", "", "0–4", "", "", "Free for individual; Team $4/user/mo"),
        ("", "Cursor IDE", "", "20", "", "", "Development tool subscription"),
        ("", "Accounting / Bookkeeping", "", "0–50", "", "", "Manual or service"),
        ("", "Business Insurance", "", "0–100", "", "", "E&O / general liability"),
        ("", "Legal (entity, ToS)", "", "~50", "", "", "$600/yr amortized"),
        ("", "Marketing / Ads", "", "0+", "", "", "Variable; CAC dependent"),
        ("", "Founder Salary", "", "0+", "", "", "Critical at scale"),
    ]
    for i, row_data in enumerate(addl):
        r += 1
        for c, v in enumerate(row_data, 1):
            ws.cell(row=r, column=c, value=v)
        style_data_row(ws, r, len(headers2), i % 2 == 1)

    auto_width(ws, min_width=10, max_width=32)
    ws.sheet_view.showGridLines = False
    return total_row


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 3 — Profitability Model
# ══════════════════════════════════════════════════════════════════════════════
def build_profitability(wb):
    ws = wb.create_sheet("Profitability")
    ws.sheet_properties.tabColor = ACCENT_GREEN

    ws.merge_cells("A1:I1")
    ws["A1"] = "Profitability by Subscriber Count"
    ws["A1"].font = title_font

    # ── Assumptions box ──
    ws.merge_cells("A3:D3")
    ws["A3"] = "MODEL ASSUMPTIONS"
    ws["A3"].font = section_font

    assumptions = [
        ("Blended Net ARPU", 34.12, acct_fmt),
        ("Activity Rate", 0.60, pct_fmt),
        ("Searches/Active Sub/Mo", 15, int_fmt),
        ("Cache Hit Rate", 0.30, pct_fmt),
        ("Cold Searches/Active Sub", 10.5, "0.0"),
        ("RentCast Calls/Search", 4, int_fmt),
        ("RentCast Calls/Active Sub/Mo", 42, int_fmt),
        ("Fixed Costs/Month", 386.83, acct_fmt),
        ("Anthropic $/Narrative", 0.01, "$0.000"),
    ]
    r = 4
    for label, val, fmt in assumptions:
        ws.cell(row=r, column=1, value=label).font = Font(name="Calibri", size=10, color=MED_GRAY)
        cell = ws.cell(row=r, column=2, value=val)
        cell.number_format = fmt
        cell.font = bold_font
        r += 1

    arpu_row = 4      # B4
    activity_row = 5   # B5
    fixed_row = 11     # B11
    anthro_row = 12    # B12

    # ── Main profitability table ──
    r = 15
    headers = [
        "Paid Subs", "Active (60%)", "Gross Revenue",
        "Net Revenue", "Fixed Costs", "RentCast Overage",
        "Anthropic", "Total Costs", "Monthly Profit/Loss", "Operating Margin"
    ]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))

    sub_levels = [1, 5, 10, 12, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000]

    for i, subs in enumerate(sub_levels):
        r += 1
        row = r

        # A: Paid Subs
        ws.cell(row=row, column=1, value=subs)

        # B: Active subs = A * activity rate
        ws.cell(row=row, column=2).value = f"=A{row}*$B$5"
        ws.cell(row=row, column=2).number_format = int_fmt

        # C: Gross Revenue = subs * $39.99 weighted
        gross_price = 36.99  # blended gross (accounts for annual mix)
        ws.cell(row=row, column=3).value = f"=A{row}*36.99"
        ws.cell(row=row, column=3).number_format = acct_fmt

        # D: Net Revenue = subs * blended ARPU
        ws.cell(row=row, column=4).value = f"=A{row}*$B$4"
        ws.cell(row=row, column=4).number_format = acct_fmt

        # E: Fixed Costs
        # At 300+ subs, RentCast upgrades to Scale ($449 vs $199 = +$250)
        # At 500+ subs, Expo upgrades (+$180), Railway increases (+$40)
        if subs >= 500:
            ws.cell(row=row, column=5).value = f"=$B$11+250+180+40"
        elif subs >= 300:
            ws.cell(row=row, column=5).value = f"=$B$11+250"
        else:
            ws.cell(row=row, column=5).value = f"=$B$11"
        ws.cell(row=row, column=5).number_format = acct_fmt

        # F: RentCast Overage
        # = MAX(0, active_subs * 42 - plan_included) * overage_rate
        if subs >= 300:
            # Scale plan: 25,000 included, $0.015 overage
            ws.cell(row=row, column=6).value = f"=MAX(0, B{row}*42 - 25000)*0.015"
        else:
            # Growth plan: 5,000 included, $0.03 overage
            ws.cell(row=row, column=6).value = f"=MAX(0, B{row}*42 - 5000)*0.03"
        ws.cell(row=row, column=6).number_format = acct_fmt

        # G: Anthropic = active * 15 searches * $0.01
        ws.cell(row=row, column=7).value = f"=B{row}*15*$B$12"
        ws.cell(row=row, column=7).number_format = acct_fmt

        # H: Total Costs = Fixed + RentCast Overage + Anthropic
        ws.cell(row=row, column=8).value = f"=E{row}+F{row}+G{row}"
        ws.cell(row=row, column=8).number_format = acct_fmt

        # I: Profit/Loss = Net Revenue - Total Costs
        ws.cell(row=row, column=9).value = f"=D{row}-H{row}"
        ws.cell(row=row, column=9).number_format = acct_fmt_neg

        # J: Operating Margin = Profit / Net Revenue
        ws.cell(row=row, column=10).value = f"=IF(D{row}>0, I{row}/D{row}, 0)"
        ws.cell(row=row, column=10).number_format = pct_fmt

        style_data_row(ws, row, len(headers), i % 2 == 1)

        # Color the profit/loss cell
        profit_cell = ws.cell(row=row, column=9)
        if subs < 12:
            profit_cell.font = red_font
        else:
            profit_cell.font = green_font

    last_data_row = r

    # ── Profit/Loss chart ──
    chart = BarChart()
    chart.type = "col"
    chart.title = "Monthly Profit/Loss by Subscriber Count"
    chart.y_axis.title = "$ / Month"
    chart.x_axis.title = "Paid Subscribers"
    chart.style = 10
    chart.width = 28
    chart.height = 14

    cats = Reference(ws, min_col=1, min_row=16, max_row=last_data_row)
    data = Reference(ws, min_col=9, min_row=15, max_row=last_data_row)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.shape = 4
    ws.add_chart(chart, f"A{last_data_row + 3}")

    # ── Margin chart ──
    chart2 = LineChart()
    chart2.title = "Operating Margin %"
    chart2.y_axis.title = "Margin"
    chart2.y_axis.numFmt = '0%'
    chart2.x_axis.title = "Paid Subscribers"
    chart2.style = 10
    chart2.width = 28
    chart2.height = 14

    data2 = Reference(ws, min_col=10, min_row=15, max_row=last_data_row)
    chart2.add_data(data2, titles_from_data=True)
    chart2.set_categories(cats)
    ws.add_chart(chart2, f"A{last_data_row + 20}")

    auto_width(ws, min_width=12, max_width=22)
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 4 — API Capacity
# ══════════════════════════════════════════════════════════════════════════════
def build_api_capacity(wb):
    ws = wb.create_sheet("API Capacity")
    ws.sheet_properties.tabColor = ACCENT_YELLOW

    ws.merge_cells("A1:H1")
    ws["A1"] = "API Capacity & Scaling Triggers"
    ws["A1"].font = title_font

    # ── Calls per search ──
    ws["A3"] = "API CALLS PER COLD PROPERTY SEARCH"
    ws["A3"].font = section_font
    r = 4
    headers = ["Provider", "Calls/Search", "Calls/Active Sub/Mo", "Included Quota", "Max Active Subs", "Max Paid Subs (60%)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))

    providers = [
        ("RentCast", 4, 42, 5000, 119, 198),
        ("Zillow / AXESSO", 1.5, 16, 100000, 6250, 10417),
        ("Redfin (RapidAPI)", 2, 21, "~1,000+", "~48+", "~80+"),
        ("Realtor (RapidAPI)", 2, 21, "~1,000+", "~48+", "~80+"),
    ]
    for i, row_data in enumerate(providers):
        r += 1
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if isinstance(v, (int, float)) and c >= 4:
                cell.number_format = int_fmt
        style_data_row(ws, r, len(headers), i % 2 == 1)
    r += 1
    ws.cell(row=r, column=1, value="TOTAL")
    ws.cell(row=r, column=2, value=9.5)
    ws.cell(row=r, column=3, value=100)
    style_total_row(ws, r, len(headers))

    # ── RentCast scaling detail ──
    r += 2
    ws.cell(row=r, column=1, value="RENTCAST SCALING ANALYSIS").font = section_font
    r += 1
    headers2 = ["Paid Subs", "Active Subs", "RentCast Calls/Mo", "Within Growth (5K)?",
                 "Growth Overage Cost", "Scale Plan Cost", "Optimal Plan", "Monthly API Cost"]
    for c, h in enumerate(headers2, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers2))

    rc_scenarios = [
        (12, 7, 294, "Yes", 0, 449, "Growth ($199)", 199),
        (25, 15, 630, "Yes", 0, 449, "Growth ($199)", 199),
        (50, 30, 1260, "Yes", 0, 449, "Growth ($199)", 199),
        (100, 60, 2520, "Yes", 0, 449, "Growth ($199)", 199),
        (119, 71, 4982, "At limit", 0, 449, "Growth ($199)", 199),
        (200, 120, 5040, "NO", 1.20, 449, "Growth ($199 + ovg)", 200.20),
        (300, 180, 7560, "NO", 76.80, 449, "Scale ($449)", 449),
        (500, 300, 12600, "NO", 228.00, 449, "Scale ($449)", 449),
        (750, 450, 18900, "NO", 417.00, 449, "Scale ($449)", 449),
        (1000, 600, 25200, "NO", 606.00, 452.00, "Scale ($449 + ovg)", 452),
    ]

    for i, row_data in enumerate(rc_scenarios):
        r += 1
        for c, v in enumerate(row_data, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if c in (3,):
                cell.number_format = int_fmt
            elif c in (5, 6, 8):
                cell.number_format = acct_fmt
        style_data_row(ws, r, len(headers2), i % 2 == 1)

        status_cell = ws.cell(row=r, column=4)
        if status_cell.value == "NO":
            status_cell.fill = red_fill
            status_cell.font = Font(name="Calibri", bold=True, size=11, color=ACCENT_RED)
        elif status_cell.value == "At limit":
            status_cell.fill = yellow_fill
        elif status_cell.value == "Yes":
            status_cell.fill = green_fill

    # ── Scaling triggers ──
    r += 2
    ws.cell(row=r, column=1, value="INFRASTRUCTURE SCALING TRIGGERS").font = section_font
    r += 1
    headers3 = ["Subscriber Threshold", "Trigger", "Action Required", "Monthly Cost Impact"]
    for c, h in enumerate(headers3, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers3))

    triggers = [
        ("~80 subs", "RapidAPI quotas (verify)", "Upgrade Redfin + Realtor plans", "+$20–50/mo each"),
        ("~200 subs", "RentCast 5K limit", "Pay overage or evaluate Scale", "+$0–250/mo"),
        ("~300 subs", "RentCast overage > Scale cost", "Upgrade to Scale ($449)", "+$250/mo"),
        ("~500 subs", "Railway compute scaling", "Higher resource consumption", "+$20–80/mo"),
        ("~500 subs", "Expo 3K MAU limit", "Upgrade to Production ($199)", "+$180/mo"),
        ("~1,000 subs", "Vercel bandwidth/functions", "Team or Enterprise plan", "+$20–100/mo"),
        ("~2,500 subs", "RevenueCat $2,500 MTR", "1% of mobile MTR", "~$25–100/mo"),
        ("~5,000 subs", "Zillow 100K limit", "Upgrade to Business (€150)", "+$82/mo"),
    ]
    for i, row_data in enumerate(triggers):
        r += 1
        for c, v in enumerate(row_data, 1):
            ws.cell(row=r, column=c, value=v)
        style_data_row(ws, r, len(headers3), i % 2 == 1)

    auto_width(ws, min_width=12, max_width=35)
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 5 — Sensitivity Analysis
# ══════════════════════════════════════════════════════════════════════════════
def build_sensitivity(wb):
    ws = wb.create_sheet("Sensitivity")
    ws.sheet_properties.tabColor = "8B5CF6"

    ws.merge_cells("A1:G1")
    ws["A1"] = "Breakeven Sensitivity Analysis"
    ws["A1"].font = title_font

    # ── By Channel Mix ──
    ws["A3"] = "BREAKEVEN BY CHANNEL MIX"
    ws["A3"].font = section_font
    r = 4
    headers = ["Scenario", "Blended Net ARPU", "Fixed Costs", "Breakeven Subs"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))

    scenarios = [
        ("100% Web Monthly (best case)", 38.53, 386.83),
        ("100% Web Annual", 28.30, 386.83),
        ("Blended (base case)", 34.12, 386.83),
        ("100% iOS Monthly", 33.99, 386.83),
        ("100% iOS Annual (worst case)", 24.79, 386.83),
        ("Heavy mobile (40% mobile)", 31.95, 386.83),
        ("Heavy annual (70% annual)", 30.24, 386.83),
    ]
    for i, (scenario, arpu, fixed) in enumerate(scenarios):
        r += 1
        ws.cell(row=r, column=1, value=scenario)
        ws.cell(row=r, column=2, value=arpu).number_format = acct_fmt
        ws.cell(row=r, column=3, value=fixed).number_format = acct_fmt
        import math
        be = math.ceil(fixed / arpu)
        ws.cell(row=r, column=4, value=be)
        style_data_row(ws, r, len(headers), i % 2 == 1)

    # ── By Price Point ──
    r += 2
    ws.cell(row=r, column=1, value="BREAKEVEN BY PRICE POINT (Web Monthly Only)").font = section_font
    r += 1
    headers2 = ["Monthly Price", "Stripe Net", "Breakeven Subs", "Monthly Rev @ 50 Subs", "Annual Rev @ 50 Subs"]
    for c, h in enumerate(headers2, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers2))

    prices = [19.99, 24.99, 29.99, 34.99, 39.99, 44.99, 49.99, 59.99, 79.99]
    for i, price in enumerate(prices):
        r += 1
        stripe_net = price * (1 - 0.029) - 0.30
        be = math.ceil(386.83 / stripe_net)
        rev_50 = stripe_net * 50
        rev_annual = rev_50 * 12

        ws.cell(row=r, column=1, value=price).number_format = acct_fmt
        ws.cell(row=r, column=2, value=stripe_net).number_format = acct_fmt
        ws.cell(row=r, column=3, value=be)
        ws.cell(row=r, column=4, value=rev_50).number_format = acct_fmt
        ws.cell(row=r, column=5, value=rev_annual).number_format = acct_fmt
        style_data_row(ws, r, len(headers2), i % 2 == 1)

        if price == 39.99:
            for c in range(1, len(headers2) + 1):
                ws.cell(row=r, column=c).fill = blue_fill
                ws.cell(row=r, column=c).font = bold_font

    # ── By Churn Rate ──
    r += 2
    ws.cell(row=r, column=1, value="SUBSCRIBER RETENTION IMPACT (Starting: 50 subs)").font = section_font
    r += 1
    headers3 = ["Monthly Churn", "Avg Lifetime (mo)", "LTV (Net)", "12-Mo Retained Subs", "12-Mo Cumulative Revenue"]
    for c, h in enumerate(headers3, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers3))

    churns = [0.03, 0.05, 0.07, 0.10, 0.12, 0.15, 0.20]
    for i, churn in enumerate(churns):
        r += 1
        lifetime = 1 / churn
        ltv = lifetime * 34.12
        retained = 50 * ((1 - churn) ** 12)
        cumulative_rev = sum(50 * ((1 - churn) ** m) * 34.12 for m in range(12))

        ws.cell(row=r, column=1, value=churn).number_format = pct_fmt
        ws.cell(row=r, column=2, value=round(lifetime, 1)).number_format = "0.0"
        ws.cell(row=r, column=3, value=round(ltv, 2)).number_format = acct_fmt
        ws.cell(row=r, column=4, value=round(retained, 0)).number_format = int_fmt
        ws.cell(row=r, column=5, value=round(cumulative_rev, 0)).number_format = acct_fmt
        style_data_row(ws, r, len(headers3), i % 2 == 1)

    auto_width(ws, min_width=12, max_width=35)
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 6 — 12-Month Projection
# ══════════════════════════════════════════════════════════════════════════════
def build_12mo_projection(wb):
    ws = wb.create_sheet("12-Month Projection")
    ws.sheet_properties.tabColor = ACCENT_GREEN

    ws.merge_cells("A1:N1")
    ws["A1"] = "12-Month Financial Projection"
    ws["A1"].font = title_font

    ws["A3"] = "GROWTH ASSUMPTIONS"
    ws["A3"].font = section_font
    ws.cell(row=4, column=1, value="Starting subscribers (Month 1)").font = small_font
    ws.cell(row=4, column=2, value=5).font = bold_font
    ws.cell(row=5, column=1, value="Monthly subscriber growth rate").font = small_font
    ws.cell(row=5, column=2, value=0.25).font = bold_font
    ws.cell(row=5, column=2).number_format = pct_fmt
    ws.cell(row=6, column=1, value="Monthly churn rate").font = small_font
    ws.cell(row=6, column=2, value=0.07).font = bold_font
    ws.cell(row=6, column=2).number_format = pct_fmt

    r = 8
    months = ["", "Mo 1", "Mo 2", "Mo 3", "Mo 4", "Mo 5", "Mo 6",
              "Mo 7", "Mo 8", "Mo 9", "Mo 10", "Mo 11", "Mo 12", "TOTAL"]
    for c, h in enumerate(months, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(months))

    # Growth model: net_subs = prev * (1 + growth - churn)
    import math
    start_subs = 5
    growth = 0.25
    churn = 0.07
    arpu = 34.12
    fixed = 386.83

    rows_data = {
        "New Subscribers": [],
        "Churned Subscribers": [],
        "Ending Subscribers": [],
        "": [],
        "Gross Revenue": [],
        "Net Revenue": [],
        "Fixed Costs": [],
        "Variable Costs": [],
        "Total Costs": [],
        " ": [],
        "Net Profit/Loss": [],
        "Cumulative P/L": [],
        "Operating Margin": [],
    }

    cumulative = 0
    prev_subs = 0

    for m in range(12):
        if m == 0:
            new = start_subs
            churned = 0
            ending = start_subs
        else:
            new = math.ceil(prev_subs * growth)
            churned = math.ceil(prev_subs * churn)
            ending = prev_subs + new - churned

        prev_subs = ending
        net_rev = ending * arpu
        gross_rev = ending * 36.99

        active = math.ceil(ending * 0.6)
        rc_calls = active * 42
        rc_overage = max(0, rc_calls - 5000) * 0.03
        anthropic = active * 15 * 0.01
        variable = rc_overage + anthropic

        if ending >= 500:
            fixed_m = fixed + 250 + 180 + 40
        elif ending >= 300:
            fixed_m = fixed + 250
        else:
            fixed_m = fixed

        total_costs = fixed_m + variable
        profit = net_rev - total_costs
        cumulative += profit
        margin = profit / net_rev if net_rev > 0 else 0

        rows_data["New Subscribers"].append(new)
        rows_data["Churned Subscribers"].append(churned)
        rows_data["Ending Subscribers"].append(ending)
        rows_data[""].append("")
        rows_data["Gross Revenue"].append(round(gross_rev, 2))
        rows_data["Net Revenue"].append(round(net_rev, 2))
        rows_data["Fixed Costs"].append(round(fixed_m, 2))
        rows_data["Variable Costs"].append(round(variable, 2))
        rows_data["Total Costs"].append(round(total_costs, 2))
        rows_data[" "].append("")
        rows_data["Net Profit/Loss"].append(round(profit, 2))
        rows_data["Cumulative P/L"].append(round(cumulative, 2))
        rows_data["Operating Margin"].append(margin)

    for label, values in rows_data.items():
        r += 1
        ws.cell(row=r, column=1, value=label)

        if label in ("", " "):
            continue

        is_money = label not in ("New Subscribers", "Churned Subscribers", "Ending Subscribers", "Operating Margin")

        for c, v in enumerate(values, 2):
            cell = ws.cell(row=r, column=c, value=v)
            if label == "Operating Margin":
                cell.number_format = pct_fmt
            elif is_money:
                cell.number_format = acct_fmt_neg if label in ("Net Profit/Loss", "Cumulative P/L") else acct_fmt
            else:
                cell.number_format = int_fmt

        # Total column (col 14)
        if label in ("New Subscribers", "Churned Subscribers"):
            ws.cell(row=r, column=14, value=sum(values)).number_format = int_fmt
        elif label == "Ending Subscribers":
            ws.cell(row=r, column=14, value=values[-1]).number_format = int_fmt
        elif label == "Operating Margin":
            total_rev = sum(rows_data["Net Revenue"])
            total_profit = sum(rows_data["Net Profit/Loss"])
            ws.cell(row=r, column=14, value=total_profit / total_rev if total_rev else 0).number_format = pct_fmt
        elif is_money:
            ws.cell(row=r, column=14, value=round(sum(values), 2)).number_format = acct_fmt_neg if "Profit" in label or "Cumulative" in label else acct_fmt

        # Style
        if label in ("Ending Subscribers", "Net Revenue", "Total Costs", "Net Profit/Loss", "Cumulative P/L"):
            ws.cell(row=r, column=1).font = bold_font
            for c in range(1, 15):
                ws.cell(row=r, column=c).font = bold_font
                ws.cell(row=r, column=c).border = thin_border
            if label == "Net Profit/Loss":
                for c in range(2, 15):
                    cell = ws.cell(row=r, column=c)
                    if isinstance(cell.value, (int, float)):
                        if cell.value >= 0:
                            cell.font = green_font
                        else:
                            cell.font = red_font
        else:
            ws.cell(row=r, column=1).font = normal_font
            for c in range(1, 15):
                ws.cell(row=r, column=c).border = thin_border

    last_row = r

    # ── Subscriber growth chart ──
    chart = LineChart()
    chart.title = "Subscriber Growth & Profitability"
    chart.y_axis.title = "Count / $"
    chart.style = 10
    chart.width = 28
    chart.height = 14

    # Find the rows for Ending Subscribers and Net Profit/Loss
    sub_row = None
    profit_row = None
    for check_r in range(9, last_row + 1):
        val = ws.cell(row=check_r, column=1).value
        if val == "Ending Subscribers":
            sub_row = check_r
        elif val == "Net Profit/Loss":
            profit_row = check_r

    if sub_row and profit_row:
        cats = Reference(ws, min_col=2, max_col=13, min_row=8)
        data_subs = Reference(ws, min_col=1, max_col=13, min_row=sub_row)
        data_profit = Reference(ws, min_col=1, max_col=13, min_row=profit_row)
        chart.add_data(data_subs, from_rows=True, titles_from_data=True)
        chart.add_data(data_profit, from_rows=True, titles_from_data=True)
        chart.set_categories(cats)
    ws.add_chart(chart, f"A{last_row + 3}")

    auto_width(ws, min_width=10, max_width=16)
    ws.column_dimensions["A"].width = 22
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 7 — 3-Year Projection
# ══════════════════════════════════════════════════════════════════════════════
def build_3yr_projection(wb):
    ws = wb.create_sheet("3-Year Projection")
    ws.sheet_properties.tabColor = "8B5CF6"

    ws.merge_cells("A1:E1")
    ws["A1"] = "3-Year Annual Projection"
    ws["A1"].font = title_font

    r = 3
    headers = ["Metric", "Year 1 (avg 30 subs)", "Year 2 (avg 150 subs)", "Year 3 (avg 500 subs)"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))

    data = [
        ("Avg Paid Subscribers", 30, 150, 500),
        ("", "", "", ""),
        ("Annual Gross Revenue", 13320, 66600, 222000),
        ("Payment Processing Fees", -1037, -5184, -17280),
        ("Annual Net Revenue", 12283, 61416, 204720),
        ("", "", "", ""),
        ("Infrastructure (fixed)", -4642, -6444, -12204),
        ("Variable API Costs", -60, -1140, -10080),
        ("Anthropic AI", -54, -270, -900),
        ("RevenueCat (1% mobile MTR)", 0, -184, -614),
        ("Total Operating Costs", -4756, -8038, -23798),
        ("", "", "", ""),
        ("Annual Operating Profit", 7527, 53378, 180922),
        ("Operating Margin", 0.613, 0.869, 0.884),
        ("", "", "", ""),
        ("Monthly Avg Profit", 627, 4448, 15077),
    ]

    for i, row_data in enumerate(data):
        r += 1
        label = row_data[0]
        ws.cell(row=r, column=1, value=label)

        if label == "":
            continue

        for c, v in enumerate(row_data[1:], 2):
            cell = ws.cell(row=r, column=c, value=v)
            if label == "Operating Margin":
                cell.number_format = pct_fmt
            elif label == "Avg Paid Subscribers":
                cell.number_format = int_fmt
            elif isinstance(v, (int, float)):
                cell.number_format = acct_fmt_neg

        is_key = label in ("Annual Net Revenue", "Total Operating Costs", "Annual Operating Profit", "Monthly Avg Profit")
        if is_key:
            style_total_row(ws, r, len(headers))
        else:
            style_data_row(ws, r, len(headers), i % 2 == 1)

        if label == "Annual Operating Profit":
            for c in range(2, 5):
                ws.cell(row=r, column=c).font = green_font

    auto_width(ws, min_width=14, max_width=28)
    ws.column_dimensions["A"].width = 30
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# SHEET 8 — Risks & Optimization
# ══════════════════════════════════════════════════════════════════════════════
def build_risks(wb):
    ws = wb.create_sheet("Risks & Optimization")
    ws.sheet_properties.tabColor = ACCENT_RED

    ws.merge_cells("A1:D1")
    ws["A1"] = "Key Risks & Cost Optimization"
    ws["A1"].font = title_font

    ws["A3"] = "KEY RISKS"
    ws["A3"].font = section_font
    r = 4
    headers = ["Risk", "Impact", "Probability", "Mitigation"]
    for c, h in enumerate(headers, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers))

    risks = [
        ("RentCast price increase", "High — 51% of costs", "Medium", "Optimize caching; negotiate volume pricing"),
        ("AXESSO/Zillow API discontinued", "Critical — lose Zestimate", "Low", "Build fallback to direct Zillow API"),
        ("RapidAPI plan changes", "Medium — lose Redfin/Realtor", "Low", "Evaluate direct API access"),
        ("Apple rejects SBP (15%→30%)", "Medium — mobile margin drops", "Low", "Web-first acquisition strategy"),
        ("Low annual conversion rate", "Medium — lower blended ARPU", "Medium", "Incentivize annual with deeper discount"),
        ("High churn (>10%/mo)", "High — never reach scale", "Medium", "Focus on retention, feature value"),
        ("Free tier API abuse", "Medium — consumes paid quota", "Medium", "Enforce rate limits; reduce free cap"),
        ("Competitor with free tier", "High — pricing pressure", "Medium", "Differentiate on IQ Estimate quality"),
    ]
    for i, row_data in enumerate(risks):
        r += 1
        for c, v in enumerate(row_data, 1):
            ws.cell(row=r, column=c, value=v)
        style_data_row(ws, r, len(headers), i % 2 == 1)

        impact_cell = ws.cell(row=r, column=2)
        if "Critical" in str(impact_cell.value) or "High" in str(impact_cell.value):
            impact_cell.fill = red_fill
        elif "Medium" in str(impact_cell.value):
            impact_cell.fill = yellow_fill

    r += 2
    ws["A" + str(r)] = "COST OPTIMIZATION LEVERS"
    ws["A" + str(r)].font = section_font
    r += 1
    headers2 = ["Optimization", "Est. Savings", "Effort", "Priority"]
    for c, h in enumerate(headers2, 1):
        ws.cell(row=r, column=c, value=h)
    style_header_row(ws, r, len(headers2))

    optimizations = [
        ("Extend cache TTL 24h → 48-72h", "30–50% fewer API calls", "Low", "P0 — Immediate"),
        ("Lazy-load Redfin/Realtor on drill-down", "~40% fewer RapidAPI calls", "Medium", "P1 — Next sprint"),
        ("Annual billing incentives", "Better cash flow, lower churn", "Low", "P1"),
        ("Batch RentCast calls where possible", "~10% fewer RentCast calls", "Medium", "P2"),
        ("Negotiate enterprise pricing @ 500 subs", "10–30% cost reduction", "Low", "P2 — When applicable"),
        ("Reduce free tier from 3 to 2 analyses", "~33% fewer free API calls", "Low", "P3 — If needed"),
    ]
    for i, row_data in enumerate(optimizations):
        r += 1
        for c, v in enumerate(row_data, 1):
            ws.cell(row=r, column=c, value=v)
        style_data_row(ws, r, len(headers2), i % 2 == 1)

        priority_cell = ws.cell(row=r, column=4)
        if "P0" in str(priority_cell.value):
            priority_cell.fill = red_fill
        elif "P1" in str(priority_cell.value):
            priority_cell.fill = yellow_fill
        elif "P2" in str(priority_cell.value):
            priority_cell.fill = green_fill

    auto_width(ws, min_width=14, max_width=40)
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    wb = openpyxl.Workbook()

    build_dashboard(wb)
    build_fixed_costs(wb)
    build_profitability(wb)
    build_api_capacity(wb)
    build_sensitivity(wb)
    build_12mo_projection(wb)
    build_3yr_projection(wb)
    build_risks(wb)

    output_path = "/Users/bradgeisen/IQ-Data/dealscope/docs/DealGapIQ_Financial_Proforma.xlsx"
    wb.save(output_path)
    print(f"Proforma saved to: {output_path}")
    print(f"Sheets: {wb.sheetnames}")


if __name__ == "__main__":
    main()
