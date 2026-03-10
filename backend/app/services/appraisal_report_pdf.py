"""
DealGapIQ URAR Form 1004 Appraisal Report — PDF Generator

Generates a professional, multi-page appraisal report following the
Uniform Residential Appraisal Report (URAR) structure. Uses WeasyPrint
(HTML → PDF) with the same architecture as property_report_pdf.py.

Report pages:
  1. Cover + Subject
  2. Neighborhood Analysis
  3. Site & Improvements
  4-5. Sales Comparison Adjustment Grid
  6. Reconciliation
  7. Income Approach
  8. Cost Approach
  9. Scope of Work & Disclaimer
"""

import logging
from datetime import datetime
from io import BytesIO

from app.schemas.appraisal_report import AppraisalReportRequest
from app.services.pdf_chart_helpers import get_palette
from app.services.property_report_pdf import _ensure_weasyprint

logger = logging.getLogger(__name__)


def _fmt(val: float | int | None, decimals: int = 0) -> str:
    if val is None:
        return "N/A"
    if decimals == 0:
        return f"{val:,.0f}"
    return f"{val:,.{decimals}f}"


def _fmt_money(val: float | int | None) -> str:
    if val is None:
        return "N/A"
    return f"${val:,.0f}"


def _fmt_pct(val: float | None, decimals: int = 1) -> str:
    if val is None:
        return "N/A"
    return f"{val:.{decimals}f}%"


def _sign_money(val: float | int | None) -> str:
    if val is None:
        return "N/A"
    if val >= 0:
        return f"+${val:,.0f}"
    return f"-${abs(val):,.0f}"


class AppraisalReportPDFExporter:
    """Generate a URAR Form 1004 appraisal report PDF."""

    def __init__(self, data: AppraisalReportRequest):
        self.data = data
        self.theme = data.theme if data.theme in ("light", "dark") else "light"
        self.palette = get_palette(self.theme)
        self.now = datetime.now()

    def generate(self) -> BytesIO:
        HTML, CSS = _ensure_weasyprint()
        html_content = self._build_html()
        css_content = self._build_css()
        html = HTML(string=html_content)
        css = CSS(string=css_content)
        buffer = BytesIO()
        html.write_pdf(buffer, stylesheets=[css])
        buffer.seek(0)
        return buffer

    def generate_html(self, auto_print: bool = True) -> str:
        css_content = self._build_css()
        body_content = self._build_body()
        print_script = ""
        if auto_print:
            print_script = """
<script>
  document.fonts.ready.then(function() {
    setTimeout(function() { window.print(); }, 400);
  });
</script>"""
        address = self.data.subject_address
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>URAR Appraisal Report — {address}</title>
<style>{css_content}</style>
{print_script}
</head>
<body>
{body_content}
</body>
</html>"""

    def _build_body(self) -> str:
        pages = [
            self._page_cover(),
            self._page_neighborhood(),
            self._page_site_improvements(),
            self._page_adjustments(),
            self._page_reconciliation(),
            self._page_income(),
            self._page_cost(),
            self._page_scope_disclaimer(),
        ]
        return "\n".join(pages)

    def _build_html(self) -> str:
        return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>URAR Appraisal Report — {self.data.subject_address}</title>
</head><body>{self._build_body()}</body></html>"""

    # ------------------------------------------------------------------
    # Layout helpers
    # ------------------------------------------------------------------

    def _page_header(self, section_num: str, title: str) -> str:
        parts = self.data.subject_address.split(",")
        city_state = ", ".join(parts[1:]).strip() if len(parts) > 1 else ""
        return (
            f'<div class="page-header">'
            f'<div class="logo">DealGap<span class="logo-iq">IQ</span></div>'
            f'<div class="page-header-title">Section {section_num}: {title}</div>'
            f'<div class="page-header-meta">{city_state}</div>'
            f"</div>"
        )

    def _page_footer(self) -> str:
        return (
            f'<div class="page-footer">'
            f'<div class="footer-brand">DealGapIQ URAR Form 1004</div>'
            f'<div class="footer-date">{self.now.strftime("%B %d, %Y")}</div>'
            f"</div>"
        )

    def _section_header(self, label: str, title: str) -> str:
        return (
            f'<div class="section-header">'
            f'<div class="section-label">{label}</div>'
            f'<h2 class="section-title">{title}</h2>'
            f'<div class="section-rule"></div>'
            f"</div>"
        )

    def _detail_row(self, label: str, value: str) -> str:
        return (
            f'<div class="detail-row">'
            f"<span>{label}</span>"
            f'<span class="detail-value">{value}</span>'
            f"</div>"
        )

    def _narrative_block(self, text: str | None) -> str:
        if not text:
            return ""
        return f'<p class="narrative">{text}</p>'

    # ------------------------------------------------------------------
    # Page 1: Cover + Subject
    # ------------------------------------------------------------------

    def _page_cover(self) -> str:
        d = self.data
        parts = d.subject_address.split(",")
        street = parts[0].strip()
        city_state = ", ".join(parts[1:]).strip() if len(parts) > 1 else ""

        lot_display = f"{d.subject_lot_size:,.0f} sqft" if d.subject_lot_size >= 1000 else f"{d.subject_lot_size:.2f} acres"
        ptype = (d.subject_property_type or "Single Family").replace("_", " ").title()

        pd = d.property_details
        stories_html = f'<div class="cover-stat"><div class="cover-stat-value">{pd.stories}</div><div class="cover-stat-label">Stories</div></div>' if pd and pd.stories else ""

        return f"""
<div class="page cover-page">
  <div class="cover-top-band"></div>
  <div class="cover-content">
    <div class="cover-logo">DealGap<span class="logo-iq">IQ</span></div>
    <div class="cover-badge">URAR Comparable Sales Appraisal Report</div>
    <h1 class="cover-address">{street}</h1>
    <div class="cover-city">{city_state}</div>

    <div class="cover-stats">
      <div class="cover-stat"><div class="cover-stat-value">{ptype}</div><div class="cover-stat-label">Type</div></div>
      <div class="cover-stat"><div class="cover-stat-value">{d.subject_beds}</div><div class="cover-stat-label">Beds</div></div>
      <div class="cover-stat"><div class="cover-stat-value">{d.subject_baths}</div><div class="cover-stat-label">Baths</div></div>
      <div class="cover-stat"><div class="cover-stat-value">{_fmt(d.subject_sqft)}</div><div class="cover-stat-label">Sq Ft</div></div>
      <div class="cover-stat"><div class="cover-stat-value">{d.subject_year_built}</div><div class="cover-stat-label">Year Built</div></div>
      <div class="cover-stat"><div class="cover-stat-value">{lot_display}</div><div class="cover-stat-label">Lot</div></div>
      {stories_html}
    </div>

    <div class="cover-summary-cards">
      <div class="cover-value-card">
        <div class="cover-value-label">Market Value (As-Is)</div>
        <div class="cover-value-amount">{_fmt_money(d.market_value)}</div>
        <div class="cover-value-range">Range: {_fmt_money(d.range_low)} — {_fmt_money(d.range_high)}</div>
      </div>
      <div class="cover-value-card cover-value-card-arv">
        <div class="cover-value-label">After Repair Value (ARV)</div>
        <div class="cover-value-amount">{_fmt_money(d.arv)}</div>
        <div class="cover-value-range">Confidence: {d.confidence:.0f}%</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3 class="card-title">Subject Property</h3>
      {self._detail_row("Address", d.subject_address)}
      {self._detail_row("Property Type", ptype)}
      {self._detail_row("Beds / Baths", f"{d.subject_beds} / {d.subject_baths}")}
      {self._detail_row("GLA (Above Grade)", f"{_fmt(d.subject_sqft)} sqft")}
      {self._detail_row("Year Built", str(d.subject_year_built))}
      {self._detail_row("Lot Size", lot_display)}
      {self._detail_row("List Price", _fmt_money(d.list_price) if d.list_price else "Not listed")}
      {self._detail_row("Rehab Estimate", _fmt_money(d.rehab_cost) if d.rehab_cost else "None")}
      {self._detail_row("Assignment Type", "Investment Analysis")}
      {self._detail_row("Property Rights", "Fee Simple")}
    </div>
  </div>
  <div class="cover-footer">
    <div><span class="cover-footer-label">Report Date</span><span class="cover-footer-value">{self.now.strftime("%B %d, %Y")}</span></div>
    <div><span class="cover-footer-label">Data Sources</span><span class="cover-footer-value">RentCast, Zillow, Redfin, Public Records</span></div>
  </div>
</div>"""

    # ------------------------------------------------------------------
    # Page 2: Neighborhood
    # ------------------------------------------------------------------

    def _page_neighborhood(self) -> str:
        d = self.data
        ms = d.market_stats
        n = d.narratives

        narrative_text = n.neighborhood if n and n.neighborhood else ""

        market_cards = ""
        if ms:
            market_cards = f"""
    <div class="grid-3" style="margin-top:20px;">
      <div class="info-card">
        <div class="info-card-label">Median Price</div>
        <div class="info-card-value">{_fmt_money(ms.median_price)}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Median DOM</div>
        <div class="info-card-value">{ms.median_days_on_market or "N/A"} days</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Active Listings</div>
        <div class="info-card-value">{_fmt(ms.total_listings) if ms.total_listings else "N/A"}</div>
      </div>
    </div>
    <div class="grid-3" style="margin-top:12px;">
      <div class="info-card">
        <div class="info-card-label">New Listings</div>
        <div class="info-card-value">{_fmt(ms.new_listings) if ms.new_listings else "N/A"}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Avg $/SqFt</div>
        <div class="info-card-value">{_fmt_money(ms.avg_price_per_sqft)}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Market Temp</div>
        <div class="info-card-value">{(ms.market_temperature or "N/A").title()}</div>
      </div>
    </div>"""

        return f"""
<div class="page">
  {self._page_header("2", "Neighborhood")}
  {self._section_header("NEIGHBORHOOD ANALYSIS", "Market Conditions & Housing Trends")}

  {self._narrative_block(narrative_text)}
  {market_cards}

  <div class="card" style="margin-top:20px;">
    <h3 class="card-title">Market Indicators</h3>
    {self._detail_row("Location Type", "Residential")}
    {self._detail_row("Property Values", (ms.market_temperature or "Stable").title() if ms else "Stable")}
    {self._detail_row("Demand/Supply", "Balanced" if not ms or not ms.market_temperature else ("High demand" if ms.market_temperature == "hot" else "Balanced" if ms.market_temperature == "warm" else "Soft demand"))}
    {self._detail_row("Marketing Time", f"{ms.median_days_on_market} days (median)" if ms and ms.median_days_on_market else "Typical for area")}
    {self._detail_row("Price Range", f"{_fmt_money(ms.median_price)} median" if ms and ms.median_price else "See comps")}
    {self._detail_row("Comps Analyzed", str(len(d.comp_adjustments)))}
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 3: Site & Improvements
    # ------------------------------------------------------------------

    def _page_site_improvements(self) -> str:
        d = self.data
        pd = d.property_details
        n = d.narratives
        lot = d.subject_lot_size
        lot_acres = lot / 43560 if lot and lot >= 1000 else None

        site_narrative = n.site if n and n.site else ""
        imp_narrative = n.improvements if n and n.improvements else ""

        imp_rows = ""
        if pd:
            if pd.heating_type:
                imp_rows += self._detail_row("Heating", pd.heating_type)
            if pd.cooling_type:
                imp_rows += self._detail_row("Cooling", pd.cooling_type)
            if pd.exterior_type:
                imp_rows += self._detail_row("Exterior", pd.exterior_type)
            if pd.roof_type:
                imp_rows += self._detail_row("Roof", pd.roof_type)
            if pd.foundation_type:
                imp_rows += self._detail_row("Foundation", pd.foundation_type)
            if pd.has_garage is not None:
                gs = f" ({pd.garage_spaces}-car)" if pd.garage_spaces else ""
                imp_rows += self._detail_row("Garage", f"Yes{gs}" if pd.has_garage else "No")
            if pd.has_pool is not None:
                imp_rows += self._detail_row("Pool", "Yes" if pd.has_pool else "No")
            if pd.has_fireplace is not None:
                imp_rows += self._detail_row("Fireplace", "Yes" if pd.has_fireplace else "No")

        current_year = 2026
        age = current_year - d.subject_year_built if d.subject_year_built else None

        return f"""
<div class="page">
  {self._page_header("3", "Site & Improvements")}

  {self._section_header("SITE DESCRIPTION", "Site")}
  <div class="card">
    {self._detail_row("Lot Size", f"{_fmt(lot)} sqft" + (f" ({lot_acres:.2f} acres)" if lot_acres else ""))}
    {self._detail_row("Zoning", "Not available — verify with local records")}
    {self._detail_row("Flood Zone", "Not available — verify FEMA maps")}
    {self._detail_row("Utilities", "Assumed public — verify with municipality")}
    {self._detail_row("Highest & Best Use", "Residential — as improved")}
  </div>
  {self._narrative_block(site_narrative)}

  {self._section_header("IMPROVEMENTS", "Description of Improvements")}
  <div class="grid-2" style="margin-top:12px;">
    <div class="card">
      <h3 class="card-title">General</h3>
      {self._detail_row("Property Type", (d.subject_property_type or "Single Family").replace("_", " ").title())}
      {self._detail_row("Stories", str(pd.stories) if pd and pd.stories else "N/A")}
      {self._detail_row("Year Built", str(d.subject_year_built))}
      {self._detail_row("Actual Age", f"{age} years" if age else "N/A")}
      {self._detail_row("Bedrooms", str(d.subject_beds))}
      {self._detail_row("Bathrooms", str(d.subject_baths))}
      {self._detail_row("GLA", f"{_fmt(d.subject_sqft)} sqft")}
    </div>
    <div class="card">
      <h3 class="card-title">Features & Systems</h3>
      {imp_rows if imp_rows else self._detail_row("Features", "Data not available — physical inspection needed")}
    </div>
  </div>
  {self._narrative_block(imp_narrative)}

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 4(-5): Sales Comparison Adjustment Grid
    # ------------------------------------------------------------------

    def _page_adjustments(self) -> str:
        d = self.data
        p = self.palette
        comps = d.comp_adjustments

        if not comps:
            return ""

        comp_headers = "".join(f"<th>Comp {i + 1}</th>" for i in range(len(comps)))

        def _adj_cell(val: float) -> str:
            color = p["positive"] if val >= 0 else p["negative"]
            return f'<td class="money" style="color:{color}">{_sign_money(val)}</td>'

        subj_parts = d.subject_address.split(",")
        subj_street = subj_parts[0].strip()

        addr_row = f"<tr><td class='row-label'>Address</td><td>{subj_street}</td>"
        for c in comps:
            addr_row += f"<td>{c.comp_address.split(',')[0].strip()}</td>"
        addr_row += "</tr>"

        price_row = f"<tr><td class='row-label'>Sale Price</td><td>—</td>"
        for c in comps:
            price_row += f'<td class="money">{_fmt_money(c.base_price)}</td>'
        price_row += "</tr>"

        beds_row = f"<tr><td class='row-label'>Bedrooms</td><td>{d.subject_beds}</td>"
        for c in comps:
            beds_row += f"<td>{c.beds}</td>"
        beds_row += "</tr>"

        baths_row = f"<tr><td class='row-label'>Bathrooms</td><td>{d.subject_baths}</td>"
        for c in comps:
            baths_row += f"<td>{c.baths}</td>"
        baths_row += "</tr>"

        sqft_row = f"<tr><td class='row-label'>GLA (SqFt)</td><td>{_fmt(d.subject_sqft)}</td>"
        for c in comps:
            sqft_row += f"<td>{_fmt(c.sqft)}</td>"
        sqft_row += "</tr>"

        year_row = f"<tr><td class='row-label'>Year Built</td><td>{d.subject_year_built}</td>"
        for c in comps:
            year_row += f"<td>{c.year_built}</td>"
        year_row += "</tr>"

        date_row = f"<tr><td class='row-label'>Sale Date</td><td>—</td>"
        for c in comps:
            date_row += f"<td>{c.sale_date or '—'}</td>"
        date_row += "</tr>"

        dist_row = f"<tr><td class='row-label'>Proximity</td><td>—</td>"
        for c in comps:
            dist_row += f"<td>{c.distance_miles:.1f} mi</td>" if c.distance_miles is not None else "<td>—</td>"
        dist_row += "</tr>"

        ppsf_row = f"<tr><td class='row-label'>$/SqFt</td><td>—</td>"
        for c in comps:
            ppsf_row += f'<td class="money">${c.price_per_sqft:,.0f}</td>'
        ppsf_row += "</tr>"

        adj_section = f'<tr class="adj-header"><td class="row-label" colspan="{len(comps) + 2}">Adjustments</td></tr>'

        size_row = f"<tr><td class='row-label adj-label'>Size (GLA)</td><td>—</td>"
        for c in comps:
            size_row += _adj_cell(c.size_adjustment)
        size_row += "</tr>"

        bed_row = f"<tr><td class='row-label adj-label'>Bedroom</td><td>—</td>"
        for c in comps:
            bed_row += _adj_cell(c.bedroom_adjustment)
        bed_row += "</tr>"

        bath_row = f"<tr><td class='row-label adj-label'>Bathroom</td><td>—</td>"
        for c in comps:
            bath_row += _adj_cell(c.bathroom_adjustment)
        bath_row += "</tr>"

        age_row = f"<tr><td class='row-label adj-label'>Age</td><td>—</td>"
        for c in comps:
            age_row += _adj_cell(c.age_adjustment)
        age_row += "</tr>"

        lot_row = f"<tr><td class='row-label adj-label'>Lot Size</td><td>—</td>"
        for c in comps:
            lot_row += _adj_cell(c.lot_adjustment)
        lot_row += "</tr>"

        total_row = f'<tr class="total-row"><td class="row-label">Net Adjustment</td><td>—</td>'
        for c in comps:
            total_row += _adj_cell(c.total_adjustment)
        total_row += "</tr>"

        gross_row = f"<tr><td class='row-label'>Gross Adj %</td><td>—</td>"
        for c in comps:
            gpct = c.gross_adjustment_pct
            gross_row += f"<td>{_fmt_pct(gpct)}</td>" if gpct is not None else "<td>—</td>"
        gross_row += "</tr>"

        net_row = f"<tr><td class='row-label'>Net Adj %</td><td>—</td>"
        for c in comps:
            npct = c.net_adjustment_pct
            net_row += f"<td>{_fmt_pct(npct)}</td>" if npct is not None else "<td>—</td>"
        net_row += "</tr>"

        adjusted_row = f'<tr class="total-row"><td class="row-label">Adjusted Price</td><td>—</td>'
        for c in comps:
            adjusted_row += f'<td class="money" style="font-weight:700;">{_fmt_money(c.adjusted_price)}</td>'
        adjusted_row += "</tr>"

        sim_row = f"<tr><td class='row-label'>Similarity</td><td>—</td>"
        for c in comps:
            color = p["positive"] if c.similarity_score >= 80 else (p["warning"] if c.similarity_score >= 60 else p["negative"])
            sim_row += f'<td style="color:{color};font-weight:600;">{c.similarity_score:.0f}%</td>'
        sim_row += "</tr>"

        wt_row = f"<tr><td class='row-label'>Weight</td><td>—</td>"
        for c in comps:
            wt_row += f'<td style="font-weight:600;">{c.weight * 100:.1f}%</td>'
        wt_row += "</tr>"

        return f"""
<div class="page">
  {self._page_header("5", "Sales Comparison Approach")}
  {self._section_header("SALES COMPARISON", "Comparable Sales Adjustment Grid")}

  <p class="narrative">
    The Sales Comparison Approach compares the subject to recent comparable sales,
    adjusting for differences in physical characteristics. Positive adjustments indicate
    the comparable is inferior; negative adjustments indicate superiority.
  </p>

  <table class="adj-table">
    <thead>
      <tr>
        <th class="row-label-header">Feature</th>
        <th>Subject</th>
        {comp_headers}
      </tr>
    </thead>
    <tbody>
      {addr_row}
      {price_row}
      {beds_row}
      {baths_row}
      {sqft_row}
      {year_row}
      {date_row}
      {dist_row}
      {ppsf_row}
      {adj_section}
      {size_row}
      {bed_row}
      {bath_row}
      {age_row}
      {lot_row}
      {total_row}
      {gross_row}
      {net_row}
      {adjusted_row}
      {sim_row}
      {wt_row}
    </tbody>
  </table>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 6: Reconciliation
    # ------------------------------------------------------------------

    def _page_reconciliation(self) -> str:
        d = self.data
        p = self.palette
        n = d.narratives

        narrative_text = n.reconciliation if n and n.reconciliation else ""

        conf_color = p["positive"] if d.confidence >= 80 else (p["warning"] if d.confidence >= 60 else p["negative"])

        return f"""
<div class="page">
  {self._page_header("6", "Reconciliation")}
  {self._section_header("RECONCILIATION", "Final Opinion of Value")}

  {self._narrative_block(narrative_text)}

  <div class="grid-2" style="margin-top:24px;">
    <div>
      <div class="card">
        <h3 class="card-title">Indicated Values by Approach</h3>
        {self._detail_row("Sales Comparison (40% adj price)", _fmt_money(d.adjusted_price_value))}
        {self._detail_row("Sales Comparison (40% $/sqft)", _fmt_money(d.price_per_sqft_value))}
        {self._detail_row("Blended Average (20%)", _fmt_money((d.adjusted_price_value + d.price_per_sqft_value) / 2))}
        {self._detail_row("Weighted Avg $/SqFt", f"${d.weighted_average_ppsf:,.0f}/sqft")}
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card-title">Confidence Assessment</h3>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div class="conf-ring" style="border-color:{conf_color};">
            <span class="conf-ring-value" style="color:{conf_color};">{d.confidence:.0f}%</span>
          </div>
          <div>
            <div style="font-weight:700;color:{conf_color};font-size:13px;">{"HIGH" if d.confidence >= 80 else "MODERATE" if d.confidence >= 60 else "LOW"} CONFIDENCE</div>
            <div style="font-size:10px;color:{p["text_secondary"]};">Based on {len(d.comp_adjustments)} comps</div>
          </div>
        </div>
        {self._detail_row("Comps Used", str(len(d.comp_adjustments)))}
        {self._detail_row("Avg Similarity", f"{sum(c.similarity_score for c in d.comp_adjustments) / max(len(d.comp_adjustments), 1):.0f}%")}
      </div>
    </div>

    <div>
      <div class="hero-card">
        <div class="hero-card-label">Opinion of Market Value</div>
        <div class="hero-card-value">{_fmt_money(d.market_value)}</div>
        <div class="hero-card-sub">Range: {_fmt_money(d.range_low)} — {_fmt_money(d.range_high)}</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card-title">After Repair Value</h3>
        {self._detail_row("Market Value (As-Is)", _fmt_money(d.market_value))}
        {self._detail_row("Rehab Cost" if d.rehab_cost and d.rehab_cost > 0 else "Premium", _fmt_money(d.rehab_cost) if d.rehab_cost and d.rehab_cost > 0 else _fmt_money(d.arv - d.market_value))}
        <div class="detail-row" style="border-top:2px solid {p["border"]};padding-top:10px;font-weight:700;">
          <span>ARV</span>
          <span class="detail-value" style="color:{p["brand"]};font-size:16px;">{_fmt_money(d.arv)}</span>
        </div>
      </div>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 7: Income Approach
    # ------------------------------------------------------------------

    def _page_income(self) -> str:
        d = self.data
        n = d.narratives
        rd = d.rental_data

        narrative_text = n.income_approach if n and n.income_approach else ""

        if not rd:
            return f"""
<div class="page">
  {self._page_header("7", "Income Approach")}
  {self._section_header("INCOME APPROACH", "Rental Income Analysis")}
  <p class="narrative">The Income Approach was not developed due to insufficient rental data for the subject property.</p>
  {self._page_footer()}
</div>"""

        annual_rent = rd.monthly_rent * 12 if rd.monthly_rent else None
        income_value = annual_rent * rd.grm / 12 if annual_rent and rd.grm else None

        return f"""
<div class="page">
  {self._page_header("7", "Income Approach")}
  {self._section_header("INCOME APPROACH", "Rental Income Analysis")}

  {self._narrative_block(narrative_text)}

  <div class="grid-2" style="margin-top:20px;">
    <div class="card">
      <h3 class="card-title">Rental Data</h3>
      {self._detail_row("Monthly Rent Estimate", _fmt_money(rd.monthly_rent))}
      {self._detail_row("Rent Range", f"{_fmt_money(rd.rent_range_low)} — {_fmt_money(rd.rent_range_high)}" if rd.rent_range_low and rd.rent_range_high else "N/A")}
      {self._detail_row("Annual Gross Rent", _fmt_money(annual_rent))}
      {self._detail_row("Vacancy Rate", _fmt_pct(rd.vacancy_rate) if rd.vacancy_rate else "N/A")}
    </div>
    <div class="card">
      <h3 class="card-title">Income Valuation</h3>
      {self._detail_row("Gross Rent Multiplier", f"{rd.grm:.1f}" if rd.grm else "N/A")}
      {self._detail_row("Cap Rate", _fmt_pct(rd.cap_rate) if rd.cap_rate else "N/A")}
      {self._detail_row("NOI", _fmt_money(rd.noi) if rd.noi else "N/A")}
      {self._detail_row("Indicated Value (Income)", _fmt_money(income_value) if income_value else "N/A")}
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 8: Cost Approach
    # ------------------------------------------------------------------

    def _page_cost(self) -> str:
        d = self.data
        n = d.narratives

        narrative_text = n.cost_approach if n and n.cost_approach else ""

        age = 2026 - d.subject_year_built if d.subject_year_built else None
        land_pct = 0.20
        land_value = d.market_value * land_pct if d.market_value else None
        improvement_value = d.market_value * (1 - land_pct) if d.market_value else None
        depreciation_pct = min(age / 50.0, 0.80) if age else 0
        depreciated_value = improvement_value * (1 - depreciation_pct) if improvement_value else None
        cost_indicated = (land_value or 0) + (depreciated_value or 0)

        return f"""
<div class="page">
  {self._page_header("8", "Cost Approach")}
  {self._section_header("COST APPROACH", "Cost to Reproduce/Replace")}

  {self._narrative_block(narrative_text)}

  <div class="grid-2" style="margin-top:20px;">
    <div class="card">
      <h3 class="card-title">Site Value</h3>
      {self._detail_row("Land Value Estimate", _fmt_money(land_value))}
      {self._detail_row("Basis", f"{land_pct*100:.0f}% of market value")}
      {self._detail_row("Lot Size", f"{_fmt(d.subject_lot_size)} sqft")}
    </div>
    <div class="card">
      <h3 class="card-title">Depreciation</h3>
      {self._detail_row("Actual Age", f"{age} years" if age else "N/A")}
      {self._detail_row("Depreciation", _fmt_pct(depreciation_pct * 100, 0))}
      {self._detail_row("Improvement Value", _fmt_money(improvement_value))}
      {self._detail_row("Depreciated Value", _fmt_money(depreciated_value))}
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Cost Approach Summary</h3>
    {self._detail_row("Estimated Site Value", _fmt_money(land_value))}
    {self._detail_row("+ Depreciated Improvements", _fmt_money(depreciated_value))}
    <div class="detail-row" style="border-top:2px solid {self.palette["border"]};padding-top:10px;font-weight:700;">
      <span>Indicated Value (Cost)</span>
      <span class="detail-value">{_fmt_money(cost_indicated)}</span>
    </div>
  </div>

  <div class="callout-box" style="margin-top:16px;">
    <strong>Limitation:</strong> Reproduction/replacement cost data and comparable
    land sales were not available. The Cost Approach is presented with limited
    reliability and should be given secondary weight.
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 9: Scope of Work & Disclaimer
    # ------------------------------------------------------------------

    def _page_scope_disclaimer(self) -> str:
        d = self.data
        n = d.narratives
        comps = d.comp_adjustments

        scope_text = n.scope_of_work if n and n.scope_of_work else ""

        comp_rows = ""
        for i, c in enumerate(comps):
            short_addr = c.comp_address.split(",")[0].strip()
            comp_rows += (
                f"<tr>"
                f'<td style="font-weight:600;">Comp {i + 1}</td>'
                f"<td>{short_addr}</td>"
                f'<td class="money">{_fmt_money(c.base_price)}</td>'
                f'<td class="money">{_fmt_money(c.adjusted_price)}</td>'
                f"<td>{c.similarity_score:.0f}%</td>"
                f"<td>{c.weight * 100:.1f}%</td>"
                f"</tr>"
            )

        return f"""
<div class="page">
  {self._page_header("9", "Scope of Work & Disclaimer")}
  {self._section_header("SCOPE OF WORK", "Limiting Conditions & Assumptions")}

  {self._narrative_block(scope_text)}

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Comparable Sales Summary</h3>
    <table class="summary-table">
      <thead>
        <tr><th></th><th>Address</th><th>Sale Price</th><th>Adj. Price</th><th>Similarity</th><th>Weight</th></tr>
      </thead>
      <tbody>{comp_rows}</tbody>
    </table>
  </div>

  <div class="grid-2" style="margin-top:20px;">
    <div class="card">
      <h3 class="card-title">Adjustment Factors</h3>
      {self._detail_row("Size (per sqft)", "$100")}
      {self._detail_row("Bedroom (per unit)", "$15,000")}
      {self._detail_row("Bathroom (per unit)", "$10,000")}
      {self._detail_row("Age (per year)", "$1,500")}
      {self._detail_row("Lot (per acre)", "$25,000")}
    </div>
    <div class="card">
      <h3 class="card-title">Methodology</h3>
      {self._detail_row("Adjusted Price Weight", "40%")}
      {self._detail_row("Price/SqFt Weight", "40%")}
      {self._detail_row("Hybrid Blend Weight", "20%")}
      {self._detail_row("Similarity Scoring", "Weighted")}
      <p style="font-size:9px;color:{self.palette["text_tertiary"]};margin-top:8px;">
        Location 25% &middot; Size 25% &middot; Bed/Bath 20% &middot; Age 15% &middot; Lot 15%
      </p>
    </div>
  </div>

  <div class="disclaimer">
    <strong>Important Disclaimer:</strong> This report is generated by DealGapIQ for
    investment analysis purposes only. It is <strong>not</strong> a licensed appraisal,
    BPO, or CMA prepared by a licensed appraiser. Values are estimates based on
    available comparable sales data and standardized adjustment factors. Actual property
    values may differ based on condition, features, market conditions, and other factors.
    This report should not be used as a substitute for a professional appraisal.
  </div>

  <div class="final-footer">
    <div class="logo" style="font-size:18px;">DealGap<span class="logo-iq">IQ</span></div>
    <div class="footer-date">Report generated {self.now.strftime("%B %d, %Y at %I:%M %p")}</div>
  </div>
</div>"""

    # ------------------------------------------------------------------
    # CSS (reuses palette from property_report_pdf.py)
    # ------------------------------------------------------------------

    def _build_css(self) -> str:
        p = self.palette
        is_dark = self.theme == "dark"
        hero_gradient = (
            f"linear-gradient(135deg, {p['brand']} 0%, #0284c7 100%)"
            if not is_dark
            else "linear-gradient(135deg, #0C1220 0%, #1E293B 100%)"
        )
        hero_border = "none" if not is_dark else f"1px solid {p['brand']}40"

        return f"""
@page {{ size: letter; margin: 0; }}

@font-face {{ font-family: 'Inter'; src: url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf') format('truetype'); font-weight: 400; }}
@font-face {{ font-family: 'Inter'; src: url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf') format('truetype'); font-weight: 600; }}
@font-face {{ font-family: 'Inter'; src: url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf') format('truetype'); font-weight: 700; }}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.5; color: {p["text_primary"]}; background: {p["bg"]}; }}
.page {{ width: 8.5in; min-height: 11in; padding: 0.6in 0.65in; page-break-after: always; position: relative; background: {p["bg"]}; }}
.page:last-child {{ page-break-after: auto; }}

/* Cover */
.cover-page {{ display: flex; flex-direction: column; padding: 0; }}
.cover-top-band {{ height: 8px; background: linear-gradient(90deg, {p["brand"]}, {"#0284c7" if not is_dark else "#2DD4BF"}); }}
.cover-content {{ flex: 1; padding: 40px 60px 20px; display: flex; flex-direction: column; }}
.cover-logo {{ font-size: 28px; font-weight: 700; color: {p["text_primary"]}; margin-bottom: 24px; }}
.cover-badge {{ display: inline-block; padding: 5px 16px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: {p["brand"]}; background: {p["brand"]}15; border: 1px solid {p["brand"]}30; margin-bottom: 12px; align-self: flex-start; }}
.cover-address {{ font-size: 28px; font-weight: 700; color: {p["text_primary"]}; line-height: 1.1; margin-bottom: 4px; }}
.cover-city {{ font-size: 14px; color: {p["text_secondary"]}; margin-bottom: 20px; }}
.cover-stats {{ display: flex; gap: 20px; margin-bottom: 20px; padding: 16px 0; border-top: 1px solid {p["border"]}; border-bottom: 1px solid {p["border"]}; flex-wrap: wrap; }}
.cover-stat {{ text-align: center; }}
.cover-stat-value {{ font-size: 16px; font-weight: 700; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; }}
.cover-stat-label {{ font-size: 8px; font-weight: 600; color: {p["text_tertiary"]}; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }}
.cover-summary-cards {{ display: flex; gap: 16px; margin-bottom: 16px; }}
.cover-value-card {{ flex: 1; background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 10px; padding: 14px; text-align: center; border-top: 3px solid {p["text_secondary"]}; }}
.cover-value-card-arv {{ border-top-color: {p["brand"]}; }}
.cover-value-label {{ font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {p["text_tertiary"]}; margin-bottom: 4px; }}
.cover-value-amount {{ font-size: 22px; font-weight: 700; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; margin-bottom: 4px; }}
.cover-value-range {{ font-size: 9px; color: {p["text_tertiary"]}; }}
.cover-footer {{ display: flex; justify-content: space-between; padding: 16px 60px; border-top: 1px solid {p["border"]}; }}
.cover-footer-label {{ font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {p["text_tertiary"]}; display: block; margin-bottom: 2px; }}
.cover-footer-value {{ font-size: 10px; font-weight: 600; color: {p["text_secondary"]}; }}

/* Page header/footer */
.page-header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid {p["brand"]}; margin-bottom: 20px; }}
.page-header-title {{ font-size: 11px; font-weight: 700; color: {p["text_secondary"]}; text-transform: uppercase; letter-spacing: 0.06em; }}
.page-header-meta {{ font-size: 10px; color: {p["text_tertiary"]}; }}
.logo {{ font-size: 16px; font-weight: 700; color: {p["text_primary"]}; }}
.logo-iq {{ color: {p["brand"]}; }}
.page-footer {{ position: absolute; bottom: 0.5in; left: 0.65in; right: 0.65in; display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid {p["border"]}; }}
.footer-brand {{ font-size: 9px; font-weight: 600; color: {p["text_tertiary"]}; }}
.footer-date {{ font-size: 9px; color: {p["text_tertiary"]}; }}

/* Section header */
.section-header {{ margin-bottom: 16px; }}
.section-label {{ font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: {p["brand"]}; margin-bottom: 4px; }}
.section-title {{ font-size: 18px; font-weight: 700; color: {p["text_primary"]}; margin-bottom: 6px; }}
.section-rule {{ width: 48px; height: 3px; background: {p["brand"]}; border-radius: 2px; }}

/* Grids */
.grid-2 {{ display: flex; gap: 16px; }}
.grid-2 > * {{ flex: 1; }}
.grid-3 {{ display: flex; gap: 12px; }}
.grid-3 > * {{ flex: 1; }}

/* Cards */
.card {{ background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 10px; padding: 16px; }}
.card-title {{ font-size: 11px; font-weight: 700; color: {p["text_primary"]}; margin-bottom: 10px; }}
.info-card {{ background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 10px; padding: 14px; text-align: center; border-top: 3px solid {p["brand"]}; }}
.info-card-label {{ font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {p["text_tertiary"]}; margin-bottom: 4px; }}
.info-card-value {{ font-size: 16px; font-weight: 700; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; }}

/* Detail rows */
.detail-row {{ display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid {p["border"]}; font-size: 10px; color: {p["text_secondary"]}; }}
.detail-row:last-child {{ border-bottom: none; }}
.detail-value {{ font-weight: 600; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; }}

/* Hero card */
.hero-card {{ background: {hero_gradient}; border: {hero_border}; border-radius: 12px; padding: 20px; text-align: center; }}
.hero-card-label {{ font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: {"rgba(255,255,255,0.8)" if not is_dark else p["text_tertiary"]}; margin-bottom: 6px; }}
.hero-card-value {{ font-size: 28px; font-weight: 700; color: {"white" if not is_dark else p["brand"]}; font-variant-numeric: tabular-nums; margin-bottom: 6px; }}
.hero-card-sub {{ font-size: 10px; color: {"rgba(255,255,255,0.7)" if not is_dark else p["text_secondary"]}; }}

/* Narrative */
.narrative {{ font-size: 10px; line-height: 1.65; color: {p["text_secondary"]}; margin-bottom: 8px; }}

/* Callout */
.callout-box {{ background: {p["brand"]}10; border: 1px solid {p["brand"]}30; border-left: 3px solid {p["brand"]}; border-radius: 8px; padding: 12px 14px; font-size: 10px; color: {p["text_secondary"]}; line-height: 1.55; }}
.callout-box strong {{ color: {p["text_primary"]}; }}

/* Confidence ring */
.conf-ring {{ width: 52px; height: 52px; border-radius: 50%; border: 4px solid {p["brand"]}; display: flex; align-items: center; justify-content: center; background: {p["bg"]}; }}
.conf-ring-value {{ font-size: 13px; font-weight: 700; color: {p["brand"]}; }}

/* Adjustment table */
.adj-table {{ width: 100%; border-collapse: collapse; font-size: {"8px" if len(self.data.comp_adjustments) > 5 else "9px"}; margin-top: 12px; }}
.adj-table th {{ background: {p["brand_dark"] if not is_dark else "#101828"}; color: {"white" if not is_dark else p["text_secondary"]}; padding: 6px 4px; text-align: center; font-size: {"7px" if len(self.data.comp_adjustments) > 5 else "8px"}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }}
.adj-table th:first-child, .row-label-header {{ text-align: left; min-width: 65px; }}
.adj-table td {{ padding: 4px; border-bottom: 1px solid {p["border"]}; font-variant-numeric: tabular-nums; color: {p["text_primary"]}; text-align: center; }}
.adj-table tr:nth-child(even) {{ background: {p["card_bg"]}; }}
.row-label {{ text-align: left !important; font-weight: 600; color: {p["text_secondary"]}; white-space: nowrap; }}
.adj-label {{ padding-left: 10px !important; font-weight: 500 !important; }}
.adj-header td {{ background: {p["brand"]}10; font-weight: 700 !important; color: {p["brand"]} !important; text-transform: uppercase; letter-spacing: 0.04em; font-size: 8px; padding: 5px 4px; border-top: 2px solid {p["brand"]}40; }}
.total-row td {{ border-top: 2px solid {p["border"]}; font-weight: 700; }}
td.money {{ font-weight: 600; font-variant-numeric: tabular-nums; }}

/* Summary table */
.summary-table {{ width: 100%; border-collapse: collapse; font-size: 9px; }}
.summary-table th {{ background: {p["brand_dark"] if not is_dark else "#101828"}; color: {"white" if not is_dark else p["text_secondary"]}; padding: 7px 5px; text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }}
.summary-table td {{ padding: 5px; border-bottom: 1px solid {p["border"]}; font-variant-numeric: tabular-nums; color: {p["text_primary"]}; }}
.summary-table tr:nth-child(even) {{ background: {p["card_bg"]}; }}

/* Disclaimer */
.disclaimer {{ margin-top: 20px; padding: 14px; background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 8px; font-size: 9px; color: {p["text_tertiary"]}; line-height: 1.6; }}
.disclaimer strong {{ color: {p["text_secondary"]}; }}
.final-footer {{ margin-top: 20px; text-align: center; }}
.final-footer .footer-date {{ margin-top: 6px; }}
"""
