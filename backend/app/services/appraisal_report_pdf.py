"""
DealGapIQ URAR Form 1004 Appraisal Report — PDF Generator

Generates a professional, multi-page appraisal report following the
Uniform Residential Appraisal Report (URAR) structure. Uses WeasyPrint
(HTML -> PDF) with the same architecture as property_report_pdf.py.

Report pages:
  1. Cover + Subject / Assignment + Neighborhood (combined)
  2. Site Description
  3. Description of Improvements
  4. Sales Comparison Adjustment Grid
  5. Reconciliation + Income Approach (combined)
  6. Cost Approach
  7. Data Sources, Verification & Addendum
  8. Scope of Work, Limiting Conditions & Disclaimer
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
<title>URAR Form 1004 — {address}</title>
<style>{css_content}</style>
{print_script}
</head>
<body>
{body_content}
</body>
</html>"""

    def _build_body(self) -> str:
        pages = [
            self._page_cover_and_neighborhood(),
            self._page_site(),
            self._page_improvements(),
            self._page_sales_comparison(),
            self._page_reconciliation_and_income(),
            self._page_cost(),
            self._page_addendum(),
            self._page_scope_disclaimer(),
        ]
        return "\n".join(pages)

    def _build_html(self) -> str:
        return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>URAR Form 1004 — {self.data.subject_address}</title>
</head><body>{self._build_body()}</body></html>"""

    # ------------------------------------------------------------------
    # Layout helpers
    # ------------------------------------------------------------------

    def _page_header(self, title: str) -> str:
        parts = self.data.subject_address.split(",")
        city_state = ", ".join(parts[1:]).strip() if len(parts) > 1 else ""
        return (
            f'<div class="page-header">'
            f'<div class="logo">DealGap<span class="logo-iq">IQ</span></div>'
            f'<div class="page-header-title">{title}</div>'
            f'<div class="page-header-meta">{city_state}</div>'
            f"</div>"
        )

    def _page_footer(self) -> str:
        return (
            f'<div class="page-footer">'
            f'<div class="footer-brand">DealGapIQ &mdash; Uniform Residential Appraisal Report</div>'
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

    def _detail_row(self, label: str, value: str, bold: bool = False) -> str:
        style = ' style="font-weight:700;"' if bold else ""
        return f'<div class="detail-row"{style}><span>{label}</span><span class="detail-value">{value}</span></div>'

    def _narrative_block(self, text: str | None) -> str:
        if not text:
            return ""
        return f'<p class="narrative">{text}</p>'

    # ------------------------------------------------------------------
    # Shared computed values
    # ------------------------------------------------------------------

    def _subject_parts(self):
        parts = self.data.subject_address.split(",")
        street = parts[0].strip()
        city_state = ", ".join(parts[1:]).strip() if len(parts) > 1 else ""
        return street, city_state

    def _prop_type(self) -> str:
        return (self.data.subject_property_type or "Single Family").replace("_", " ").title()

    def _lot_display(self) -> str:
        lot = self.data.subject_lot_size
        if lot and lot >= 1000:
            acres = lot / 43560
            return f"{lot:,.0f} sf ({acres:.2f} ac)"
        if lot:
            return f"{lot:.2f} acres"
        return "N/A"

    def _age(self) -> int | None:
        return 2026 - self.data.subject_year_built if self.data.subject_year_built else None

    # ------------------------------------------------------------------
    # Page 1: Cover + Subject / Assignment + Neighborhood (combined)
    # ------------------------------------------------------------------

    def _page_cover_and_neighborhood(self) -> str:
        d = self.data
        street, city_state = self._subject_parts()
        ms = d.market_stats
        n = d.narratives
        temp = (ms.market_temperature or "stable") if ms else "stable"
        trend = "Increasing" if temp == "hot" else "Stable" if temp in ("warm", "stable") else "Declining"

        market_cards = ""
        if ms:
            market_cards = f"""
      <div class="grid-3" style="margin-top:10px;">
        <div class="info-card"><div class="info-card-label">Median Sale Price</div><div class="info-card-value">{_fmt_money(ms.median_price)}</div></div>
        <div class="info-card"><div class="info-card-label">Median DOM</div><div class="info-card-value">{ms.median_days_on_market or "N/A"} days</div></div>
        <div class="info-card"><div class="info-card-label">Active Listings</div><div class="info-card-value">{_fmt(ms.total_listings) if ms.total_listings else "N/A"}</div></div>
      </div>
      <div class="grid-3" style="margin-top:8px;">
        <div class="info-card"><div class="info-card-label">New Listings</div><div class="info-card-value">{_fmt(ms.new_listings) if ms.new_listings else "N/A"}</div></div>
        <div class="info-card"><div class="info-card-label">Avg Price/Sq Ft</div><div class="info-card-value">{_fmt_money(ms.avg_price_per_sqft)}</div></div>
        <div class="info-card"><div class="info-card-label">Market Temperature</div><div class="info-card-value">{temp.title()}</div></div>
      </div>"""

        return f"""
<div class="page cover-page">
  <div class="cover-top-band"></div>
  <div class="cover-content">

    <div class="cover-section-top">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="cover-logo">DealGap<span class="logo-iq">IQ</span></div>
        <div class="cover-badge">Uniform Residential Appraisal Report</div>
      </div>
      <h1 class="cover-address">{street}</h1>
      <div class="cover-city">{city_state}</div>
      <div class="cover-stats-line">{self._prop_type()} &nbsp;&middot;&nbsp; {d.subject_beds} Bed / {d.subject_baths} Bath &nbsp;&middot;&nbsp; {_fmt(d.subject_sqft)} sq ft &nbsp;&middot;&nbsp; Built {d.subject_year_built} &nbsp;&middot;&nbsp; {self._lot_display()}</div>

      <div class="cover-summary-cards">
        <div class="cover-value-card">
          <div class="cover-value-label">Opinion of Market Value</div>
          <div class="cover-value-amount">{_fmt_money(d.market_value)}</div>
          <div class="cover-value-range">Range: {_fmt_money(d.range_low)} &mdash; {_fmt_money(d.range_high)}</div>
        </div>
        <div class="cover-value-card cover-value-card-arv">
          <div class="cover-value-label">After Repair Value (ARV)</div>
          <div class="cover-value-amount">{_fmt_money(d.arv)}</div>
          <div class="cover-value-range">Confidence: {d.confidence:.0f}%</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 class="card-title">Subject Property</h3>
          {self._detail_row("Property Address", d.subject_address)}
          {self._detail_row("Property Type", self._prop_type())}
          {self._detail_row("Bedrooms / Bathrooms", f"{d.subject_beds} / {d.subject_baths}")}
          {self._detail_row("Gross Living Area", f"{_fmt(d.subject_sqft)} sq ft")}
          {self._detail_row("Year Built / Age", f"{d.subject_year_built} / {self._age() or 'N/A'} yrs")}
          {self._detail_row("Site Area", self._lot_display())}
          {self._detail_row("List / Contract Price", _fmt_money(d.list_price) if d.list_price else "Not currently listed")}
          {self._detail_row("Est. Rehab Cost", _fmt_money(d.rehab_cost) if d.rehab_cost else "None")}
        </div>
        <div class="card">
          <h3 class="card-title">Assignment</h3>
          {self._detail_row("Property Rights Appraised", "Fee Simple")}
          {self._detail_row("Assignment Type", "Investment Analysis")}
          {self._detail_row("Intended Use", "Investment decision support")}
          {self._detail_row("Intended User", "Investor / Client")}
          {self._detail_row("Effective Date", self.now.strftime("%B %d, %Y"))}
          {self._detail_row("Report Date", self.now.strftime("%B %d, %Y"))}
          {self._detail_row("Report Type", "Desktop &mdash; Exterior Only")}
          {self._detail_row("Data Sources", "MLS, Public Records, RentCast, Zillow, Redfin")}
        </div>
      </div>
    </div>

    <div class="section-divider"></div>

    <div class="cover-section-bottom">
      <div class="section-header">
        <div class="section-label">NEIGHBORHOOD</div>
        <h2 class="section-title">Market Conditions &amp; Neighborhood Analysis</h2>
        <div class="section-rule"></div>
      </div>

      {self._narrative_block(n.neighborhood if n and n.neighborhood else "")}
      {market_cards}

      <div class="grid-2" style="margin-top:12px;">
        <div class="card">
          <h3 class="card-title">Neighborhood Characteristics</h3>
          {self._detail_row("Location", "Urban / Suburban / Rural")}
          {self._detail_row("Built-Up", "Over 75% / 25&ndash;75% / Under 25%")}
          {self._detail_row("Growth Rate", trend)}
          {self._detail_row("Property Values", trend)}
          {self._detail_row("Demand/Supply", "Shortage" if temp == "hot" else "In Balance" if temp in ("warm", "stable") else "Over Supply")}
          {self._detail_row("Marketing Time", f"{ms.median_days_on_market} days" if ms and ms.median_days_on_market else "Under 3 mos")}
        </div>
        <div class="card">
          <h3 class="card-title">Market Conditions (Form 1004MC)</h3>
          {self._detail_row("Predominant Price Range", f"{_fmt_money(ms.median_price)} (median)" if ms and ms.median_price else "See comparable sales")}
          {self._detail_row("Predominant Age Range", f"{self._age() or 'N/A'} yrs (subject)")}
          {self._detail_row("Present Land Use", "Residential &mdash; Single Family")}
          {self._detail_row("Land Use Change", "Not Likely")}
          {self._detail_row("Comps Analyzed", str(len(d.comp_adjustments)))}
          {self._detail_row("Form", "Fannie Mae 1004 / Freddie Mac 70")}
        </div>
      </div>
    </div>

  </div>
  <div class="cover-footer">
    <div><span class="cover-footer-label">Effective Date</span><span class="cover-footer-value">{self.now.strftime("%B %d, %Y")}</span></div>
    <div><span class="cover-footer-label">Data Sources</span><span class="cover-footer-value">MLS, Public Records, RentCast, Zillow, Redfin</span></div>
  </div>
</div>"""

    # ------------------------------------------------------------------
    # Page 3: Site
    # ------------------------------------------------------------------

    def _page_site(self) -> str:
        d = self.data
        n = d.narratives
        sd = d.site_data

        site_narrative = n.site if n and n.site else ""

        zoning = sd.zoning_classification if sd and sd.zoning_classification else "Verify &mdash; local records"
        compliance = sd.zoning_compliance if sd and sd.zoning_compliance else "Assumed legal conforming"
        flood = sd.flood_zone if sd and sd.flood_zone else "Verify &mdash; FEMA map"
        fema_map = sd.fema_map_number if sd and sd.fema_map_number else "Not available"
        fema_date = f" ({sd.fema_map_date})" if sd and sd.fema_map_date else ""
        elec = sd.electricity if sd and sd.electricity else "Public (assumed)"
        gas = sd.gas if sd and sd.gas else "Public (assumed)"
        water = sd.water if sd and sd.water else "Public (assumed)"
        sewer = sd.sewer if sd and sd.sewer else "Public (assumed)"
        topo = sd.topography if sd and sd.topography else "Assumed level &mdash; verify inspection"
        shape = sd.lot_shape if sd and sd.lot_shape else "Assumed typical &mdash; verify survey"
        view = sd.view if sd and sd.view else "Residential"
        easements = sd.easements if sd and sd.easements else "None apparent &mdash; verify title report"
        encroachments = sd.encroachments if sd and sd.encroachments else "None apparent &mdash; verify survey"

        return f"""
<div class="page">
  {self._page_header("Site")}
  {self._section_header("SITE", "Site Description")}

  {self._narrative_block(site_narrative)}

  <div class="grid-2" style="margin-top:16px;">
    <div class="card">
      <h3 class="card-title">Site Characteristics</h3>
      {self._detail_row("Dimensions", "See plat/survey")}
      {self._detail_row("Site Area", self._lot_display())}
      {self._detail_row("Shape", shape)}
      {self._detail_row("View", view)}
      {self._detail_row("Topography", topo)}
      {self._detail_row("Drainage", "Assumed adequate")}
      {self._detail_row("Landscaping", "Typical for area")}
      {self._detail_row("Driveway Surface", "Verify inspection")}
    </div>
    <div class="card">
      <h3 class="card-title">Zoning, Utilities &amp; Compliance</h3>
      {self._detail_row("Zoning Classification", zoning)}
      {self._detail_row("Zoning Compliance", compliance)}
      {self._detail_row("Highest &amp; Best Use", "Present use &mdash; residential")}
      {self._detail_row("Flood Zone", flood)}
      {self._detail_row("FEMA Map #", f"{fema_map}{fema_date}")}
      {self._detail_row("Electricity", elec)}
      {self._detail_row("Gas", gas)}
      {self._detail_row("Water", water)}
      {self._detail_row("Sewer", sewer)}
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Adverse Conditions</h3>
    {self._detail_row("Easements", easements)}
    {self._detail_row("Encroachments", encroachments)}
    {self._detail_row("Special Assessments", "None known")}
    {self._detail_row("Environmental", "No adverse conditions observed from desktop review")}
  </div>

  <div class="callout-box" style="margin-top:12px;">
    <strong>Note:</strong> Site data is based on available public records and assumptions.
    Zoning, flood zone, utilities, easements, and topography should be verified through
    local municipal records, a current survey, and FEMA flood maps.
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 4: Description of Improvements
    # ------------------------------------------------------------------

    def _page_improvements(self) -> str:
        d = self.data
        pd = d.property_details
        n = d.narratives
        age = self._age()
        effective_age = max(1, int(age * 0.75)) if age else None

        imp_narrative = n.improvements if n and n.improvements else ""

        ht = pd.heating_type if pd and pd.heating_type else "Verify"
        ct = pd.cooling_type if pd and pd.cooling_type else "Verify"
        ext = pd.exterior_type if pd and pd.exterior_type else "Verify"
        roof = pd.roof_type if pd and pd.roof_type else "Verify"
        fdn = pd.foundation_type if pd and pd.foundation_type else "Verify"

        garage_desc = "None"
        if pd and pd.has_garage:
            garage_desc = f"Attached &mdash; {pd.garage_spaces}-car" if pd.garage_spaces else "Yes"
        elif pd and pd.has_garage is not None:
            garage_desc = "None"
        parking = pd.parking_type if pd and pd.parking_type else None

        pool = "Yes" if pd and pd.has_pool else "No" if pd and pd.has_pool is not None else "Verify"
        fp = "Yes" if pd and pd.has_fireplace else "No" if pd and pd.has_fireplace is not None else "Verify"
        hoa = f"${pd.hoa_fees_monthly:,.0f}/mo" if pd and pd.hoa_fees_monthly else "None reported"

        return f"""
<div class="page">
  {self._page_header("Description of Improvements")}
  {self._section_header("IMPROVEMENTS", "Description of Improvements")}

  {self._narrative_block(imp_narrative)}

  <div class="grid-2" style="margin-top:16px;">
    <div class="card">
      <h3 class="card-title">General Description</h3>
      {self._detail_row("Units", "One")}
      {self._detail_row("Stories", str(pd.stories) if pd and pd.stories else "Verify")}
      {self._detail_row("Type (Det./Att.)", "Detached" if "single" in self._prop_type().lower() else self._prop_type())}
      {self._detail_row("Design (Style)", self._prop_type())}
      {self._detail_row("Existing / Proposed", "Existing")}
      {self._detail_row("Year Built", str(d.subject_year_built))}
      {self._detail_row("Actual Age", f"{age} years" if age else "N/A")}
      {self._detail_row("Effective Age", f"{effective_age} years (est.)" if effective_age else "N/A")}
    </div>
    <div class="card">
      <h3 class="card-title">Exterior Description</h3>
      {self._detail_row("Foundation", fdn)}
      {self._detail_row("Exterior Walls", ext)}
      {self._detail_row("Roof Surface", roof)}
      {self._detail_row("Gutters &amp; Downspouts", "Verify")}
      {self._detail_row("Window Type", "Verify")}
      {self._detail_row("Storm Sash / Insulated", "Verify")}
      {self._detail_row("Screens", "Verify")}
    </div>
  </div>

  <div class="grid-2" style="margin-top:12px;">
    <div class="card">
      <h3 class="card-title">Interior &amp; Systems</h3>
      {self._detail_row("Floors", "Verify &mdash; inspection needed")}
      {self._detail_row("Walls", "Verify &mdash; inspection needed")}
      {self._detail_row("Trim/Finish", "Verify &mdash; inspection needed")}
      {self._detail_row("Heating Type", ht)}
      {self._detail_row("Cooling Type", ct)}
      {self._detail_row("Fuel", "Verify")}
      {self._detail_row("Fireplace(s)", fp)}
    </div>
    <div class="card">
      <h3 class="card-title">Room Count &amp; Amenities</h3>
      {self._detail_row("Total Rooms", "Verify")}
      {self._detail_row("Bedrooms", str(d.subject_beds))}
      {self._detail_row("Bathrooms", str(d.subject_baths))}
      {self._detail_row("GLA (Above Grade)", f"{_fmt(d.subject_sqft)} sq ft")}
      {self._detail_row("Basement", "Verify")}
      {self._detail_row("Car Storage", garage_desc)}
      {self._detail_row("Parking", parking if parking else garage_desc)}
      {self._detail_row("Pool", pool)}
      {self._detail_row("Patio / Deck", "Verify")}
      {self._detail_row("HOA", hoa)}
    </div>
  </div>

  <div class="card" style="margin-top:12px;">
    <h3 class="card-title">Condition &amp; Quality</h3>
    {self._detail_row("Overall Condition", "Average (assumed) &mdash; inspection required")}
    {self._detail_row("Overall Quality", "Average (assumed) &mdash; inspection required")}
    {self._detail_row("Physical Deficiencies", "None observed from desktop review")}
    {self._detail_row("Functional Adequacy", "Assumed adequate for market area")}
    {self._detail_row("Neighborhood Conformity", "Appears conforming based on comparable data")}
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 5: Sales Comparison Approach
    # ------------------------------------------------------------------

    def _page_sales_comparison(self) -> str:
        d = self.data
        p = self.palette
        comps = d.comp_adjustments

        if not comps:
            return ""

        n_comps = len(comps)
        comp_headers = "".join(f"<th>Comp {i + 1}</th>" for i in range(n_comps))

        def _adj_cell(val: float) -> str:
            color = p["positive"] if val >= 0 else p["negative"]
            return f'<td class="money" style="color:{color}">{_sign_money(val)}</td>'

        def _text_cell(val: str) -> str:
            return f"<td>{val}</td>"

        subj_street = self._subject_parts()[0]

        rows: list[str] = []

        # --- Property Data ---
        r = f"<tr><td class='row-label'>Address</td><td>{subj_street}</td>"
        for c in comps:
            r += f"<td>{c.comp_address.split(',')[0].strip()}</td>"
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Proximity</td><td>&mdash;</td>"
        for c in comps:
            r += f"<td>{c.distance_miles:.2f} mi</td>" if c.distance_miles is not None else "<td>&mdash;</td>"
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Sale Price</td><td>&mdash;</td>"
        for c in comps:
            r += f'<td class="money">{_fmt_money(c.base_price)}</td>'
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Price/GLA</td><td>&mdash;</td>"
        for c in comps:
            r += f'<td class="money">${c.price_per_sqft:,.0f}</td>'
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Data Source</td><td>MLS / Public Rec.</td>"
        for _c in comps:
            r += _text_cell("MLS / Public Rec.")
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Verification Source</td><td>&mdash;</td>"
        for _c in comps:
            r += _text_cell("Public Records")
        rows.append(r + "</tr>")

        # --- Sale/Financing ---
        sale_section = (
            f'<tr class="adj-header"><td class="row-label" colspan="{n_comps + 2}">Sale &amp; Financing</td></tr>'
        )
        rows.append(sale_section)

        r = "<tr><td class='row-label adj-label'>Sale Date</td><td>&mdash;</td>"
        for c in comps:
            r += f"<td>{c.sale_date or '&mdash;'}</td>"
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label adj-label'>Financing Type</td><td>&mdash;</td>"
        for _c in comps:
            r += _text_cell("Conv.")
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label adj-label'>Concessions</td><td>&mdash;</td>"
        for _c in comps:
            r += _text_cell("None reported")
        rows.append(r + "</tr>")

        # --- Description ---
        desc_section = f'<tr class="adj-header"><td class="row-label" colspan="{n_comps + 2}">Description</td></tr>'
        rows.append(desc_section)

        r = f"<tr><td class='row-label adj-label'>Property Type</td><td>{self._prop_type()}</td>"
        for _c in comps:
            r += _text_cell("SFR")
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label adj-label'>Condition</td><td>Average</td>"
        for _c in comps:
            r += _text_cell("Average")
        rows.append(r + "</tr>")

        r = f"<tr><td class='row-label adj-label'>Year Built</td><td>{d.subject_year_built}</td>"
        for c in comps:
            r += f"<td>{c.year_built}</td>"
        rows.append(r + "</tr>")

        r = f"<tr><td class='row-label adj-label'>Bedrooms</td><td>{d.subject_beds}</td>"
        for c in comps:
            r += f"<td>{c.beds}</td>"
        rows.append(r + "</tr>")

        r = f"<tr><td class='row-label adj-label'>Bathrooms</td><td>{d.subject_baths}</td>"
        for c in comps:
            r += f"<td>{c.baths}</td>"
        rows.append(r + "</tr>")

        r = f"<tr><td class='row-label adj-label'>GLA (Sq Ft)</td><td>{_fmt(d.subject_sqft)}</td>"
        for c in comps:
            r += f"<td>{_fmt(c.sqft)}</td>"
        rows.append(r + "</tr>")

        r = f"<tr><td class='row-label adj-label'>Lot Size</td><td>{self._lot_display()}</td>"
        for _c in comps:
            r += _text_cell("See records")
        rows.append(r + "</tr>")

        # --- Adjustments ---
        adj_section = f'<tr class="adj-header"><td class="row-label" colspan="{n_comps + 2}">Adjustments</td></tr>'
        rows.append(adj_section)

        for label, attr in [
            ("Size (GLA)", "size_adjustment"),
            ("Bedroom", "bedroom_adjustment"),
            ("Bathroom", "bathroom_adjustment"),
            ("Age/Condition", "age_adjustment"),
            ("Lot Size", "lot_adjustment"),
        ]:
            r = f"<tr><td class='row-label adj-label'>{label}</td><td>&mdash;</td>"
            for c in comps:
                r += _adj_cell(getattr(c, attr))
            rows.append(r + "</tr>")

        r = "<tr><td class='row-label adj-label'>Financing/Conc.</td><td>&mdash;</td>"
        for _c in comps:
            r += _text_cell("$0")
        rows.append(r + "</tr>")

        # --- Totals ---
        total_section = f'<tr class="adj-header"><td class="row-label" colspan="{n_comps + 2}">Results</td></tr>'
        rows.append(total_section)

        r = '<tr class="total-row"><td class="row-label">Net Adjustment</td><td>&mdash;</td>'
        for c in comps:
            r += _adj_cell(c.total_adjustment)
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Net Adj. %</td><td>&mdash;</td>"
        for c in comps:
            npct = c.net_adjustment_pct
            flag = ""
            if npct is not None and abs(npct) > 15:
                flag = f' style="color:{p["negative"]};font-weight:700;"'
            r += f"<td{flag}>{_fmt_pct(npct)}</td>" if npct is not None else "<td>&mdash;</td>"
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Gross Adj. %</td><td>&mdash;</td>"
        for c in comps:
            gpct = c.gross_adjustment_pct
            flag = ""
            if gpct is not None and gpct > 25:
                flag = f' style="color:{p["negative"]};font-weight:700;"'
            r += f"<td{flag}>{_fmt_pct(gpct)}</td>" if gpct is not None else "<td>&mdash;</td>"
        rows.append(r + "</tr>")

        r = '<tr class="total-row"><td class="row-label">Adjusted Sale Price</td><td>&mdash;</td>'
        for c in comps:
            r += f'<td class="money" style="font-weight:700;">{_fmt_money(c.adjusted_price)}</td>'
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Similarity Score</td><td>&mdash;</td>"
        for c in comps:
            color = (
                p["positive"]
                if c.similarity_score >= 80
                else (p["warning"] if c.similarity_score >= 60 else p["negative"])
            )
            r += f'<td style="color:{color};font-weight:600;">{c.similarity_score:.0f}%</td>'
        rows.append(r + "</tr>")

        r = "<tr><td class='row-label'>Weight</td><td>&mdash;</td>"
        for c in comps:
            r += f'<td style="font-weight:600;">{c.weight * 100:.1f}%</td>'
        rows.append(r + "</tr>")

        all_rows = "\n      ".join(rows)

        return f"""
<div class="page">
  {self._page_header("Sales Comparison Approach")}
  {self._section_header("SALES COMPARISON APPROACH", "Comparable Sales Grid")}

  <p class="narrative">
    The Sales Comparison Approach compares the subject to recent comparable sales and
    adjusts for differences in characteristics. Positive adjustments indicate the comparable
    is inferior to the subject; negative adjustments indicate superiority. Net adjustments
    exceeding 15% or gross adjustments exceeding 25% of sale price are flagged.
  </p>

  <table class="adj-table">
    <thead>
      <tr><th class="row-label-header">Feature</th><th>Subject</th>{comp_headers}</tr>
    </thead>
    <tbody>
      {all_rows}
    </tbody>
  </table>

  <div class="callout-box" style="margin-top:12px;">
    <strong>Indicated Value by Sales Comparison:</strong> {_fmt_money(d.market_value)}
    &nbsp;&mdash;&nbsp; Based on {n_comps} comparable sales with weighted hybrid methodology
    (40% adjusted price, 40% price/sq ft, 20% blended).
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 5: Reconciliation + Income Approach (combined)
    # ------------------------------------------------------------------

    def _page_reconciliation_and_income(self) -> str:
        d = self.data
        p = self.palette
        n = d.narratives
        rd = d.rental_data
        age = self._age()

        recon_narrative = n.reconciliation if n and n.reconciliation else ""
        income_narrative = n.income_approach if n and n.income_approach else ""
        conf_color = p["positive"] if d.confidence >= 80 else (p["warning"] if d.confidence >= 60 else p["negative"])

        income_indicated = None
        if rd and rd.monthly_rent and rd.grm:
            income_indicated = rd.monthly_rent * rd.grm

        cd = d.cost_data
        if cd and cd.site_value is not None:
            land_value = cd.site_value
        else:
            land_value = d.market_value * 0.20 if d.market_value else None
        if cd and cd.replacement_cost_per_sqft is not None:
            total_cost_new = cd.total_cost_new or (
                cd.replacement_cost_per_sqft * d.subject_sqft if d.subject_sqft else None
            )
        else:
            total_cost_new = d.market_value * 0.80 if d.market_value else None
        if cd and cd.physical_depreciation_pct is not None:
            dep_pct = cd.physical_depreciation_pct / 100
        else:
            dep_pct = min(age / 50.0, 0.80) if age else 0
        func_dep = cd.functional_depreciation if cd and cd.functional_depreciation else 0
        ext_dep = cd.external_depreciation if cd and cd.external_depreciation else 0
        phys_dep = (total_cost_new or 0) * dep_pct
        dep_value = (total_cost_new or 0) - phys_dep - func_dep - ext_dep
        cost_indicated = (land_value or 0) + max(dep_value, 0)

        # --- Income section (bottom half) ---
        income_section = ""
        if rd and rd.monthly_rent:
            annual_rent = rd.monthly_rent * 12
            income_value = annual_rent * rd.grm / 12 if rd.grm else None
            egi = annual_rent * (1 - (rd.vacancy_rate or 5) / 100)
            income_section = f"""
      <div class="section-header">
        <div class="section-label">INCOME APPROACH</div>
        <h2 class="section-title">Income Capitalization Analysis</h2>
        <div class="section-rule"></div>
      </div>

      {self._narrative_block(income_narrative)}

      <div class="grid-2" style="margin-top:10px;">
        <div class="card">
          <h3 class="card-title">Rental Market Data</h3>
          {self._detail_row("Estimated Market Rent", f"{_fmt_money(rd.monthly_rent)}/mo")}
          {self._detail_row("Rent Range", f"{_fmt_money(rd.rent_range_low)} &mdash; {_fmt_money(rd.rent_range_high)}" if rd.rent_range_low and rd.rent_range_high else "N/A")}
          {self._detail_row("Annual Gross Rent", _fmt_money(annual_rent))}
          {self._detail_row("Vacancy &amp; Collection Loss", _fmt_pct(rd.vacancy_rate) if rd.vacancy_rate else "5.0%")}
          {self._detail_row("Effective Gross Income", _fmt_money(egi))}
          {self._detail_row("Data Source", "RentCast, Zillow Rent Zestimate, Redfin")}
        </div>
        <div class="card">
          <h3 class="card-title">Income Valuation</h3>
          {self._detail_row("Gross Rent Multiplier (GRM)", f"{rd.grm:.1f}" if rd.grm else "N/A")}
          {self._detail_row("Capitalization Rate", _fmt_pct(rd.cap_rate) if rd.cap_rate else "N/A")}
          {self._detail_row("Net Operating Income", _fmt_money(rd.noi) if rd.noi else "N/A")}
          {self._detail_row("Indicated Value (GRM)", _fmt_money(income_value) if income_value else "N/A")}
          {self._detail_row("Applicability", "Secondary &mdash; owner-occupied market")}
        </div>
      </div>"""
        else:
            income_section = """
      <div class="section-header">
        <div class="section-label">INCOME APPROACH</div>
        <h2 class="section-title">Income Capitalization Analysis</h2>
        <div class="section-rule"></div>
      </div>
      <p class="narrative">The Income Approach was not developed due to insufficient rental market data. This approach is typically given limited weight for owner-occupied single-family residential properties.</p>"""

        return f"""
<div class="page combined-page">
  {self._page_header("Reconciliation &amp; Income Approach")}

  <div class="combined-section-top">
    {self._section_header("RECONCILIATION", "Final Opinion of Market Value")}

    {self._narrative_block(recon_narrative)}

    <div class="card" style="margin-top:10px;">
      <h3 class="card-title">Indicated Value by Each Approach</h3>
      {self._detail_row("Sales Comparison Approach", _fmt_money(d.market_value), bold=True)}
      {self._detail_row("  Adjusted Price Method (40%)", _fmt_money(d.adjusted_price_value))}
      {self._detail_row("  Price/Sq Ft Method (40%)", _fmt_money(d.price_per_sqft_value))}
      {self._detail_row("  Blended Average (20%)", _fmt_money((d.adjusted_price_value + d.price_per_sqft_value) / 2))}
      {self._detail_row("  Weighted Avg $/Sq Ft", f"${d.weighted_average_ppsf:,.0f}")}
      {self._detail_row("Income Approach", _fmt_money(income_indicated) if income_indicated else "Not developed")}
      {self._detail_row("Cost Approach", _fmt_money(cost_indicated) if cost_indicated else "Not developed")}
    </div>

    <div class="grid-2" style="margin-top:12px;">
      <div>
        <div class="hero-card">
          <div class="hero-card-label">Opinion of Market Value</div>
          <div class="hero-card-value">{_fmt_money(d.market_value)}</div>
          <div class="hero-card-sub">as of {self.now.strftime("%B %d, %Y")}</div>
        </div>

        <div class="card" style="margin-top:10px;">
          <h3 class="card-title">Value Range</h3>
          {self._detail_row("Low", _fmt_money(d.range_low))}
          {self._detail_row("High", _fmt_money(d.range_high))}
          {self._detail_row("Spread", _fmt_money(d.range_high - d.range_low))}
        </div>
      </div>
      <div>
        <div class="card">
          <h3 class="card-title">Confidence Assessment</h3>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div class="conf-ring" style="border-color:{conf_color};"><span class="conf-ring-value" style="color:{conf_color};">{d.confidence:.0f}%</span></div>
            <div>
              <div style="font-weight:700;color:{conf_color};font-size:12px;">{"HIGH" if d.confidence >= 80 else "MODERATE" if d.confidence >= 60 else "LOW"}</div>
              <div style="font-size:9px;color:{p["text_secondary"]};">{len(d.comp_adjustments)} comps analyzed</div>
            </div>
          </div>
          {self._detail_row("Avg Similarity", f"{sum(c.similarity_score for c in d.comp_adjustments) / max(len(d.comp_adjustments), 1):.0f}%")}
          {self._detail_row("Approach Weight", "Sales Comparison &mdash; Primary")}
        </div>

        <div class="card" style="margin-top:10px;">
          <h3 class="card-title">After Repair Value (ARV)</h3>
          {self._detail_row("As-Is Market Value", _fmt_money(d.market_value))}
          {self._detail_row("Rehab Cost" if d.rehab_cost and d.rehab_cost > 0 else "Appreciation Premium", _fmt_money(d.rehab_cost) if d.rehab_cost and d.rehab_cost > 0 else _fmt_money(d.arv - d.market_value))}
          {self._detail_row("ARV", _fmt_money(d.arv), bold=True)}
        </div>
      </div>
    </div>

    <div class="callout-box" style="margin-top:10px;">
      <strong>Opinion of Value:</strong> As of {self.now.strftime("%B %d, %Y")}, the opinion of market value is
      <strong>{_fmt_money(d.market_value)}</strong>. The Sales Comparison Approach is given primary weight.
    </div>
  </div>

  <div class="section-divider"></div>

  <div class="combined-section-bottom">
    {income_section}
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 8: Cost Approach
    # ------------------------------------------------------------------

    def _page_cost(self) -> str:
        d = self.data
        n = d.narratives
        cd = d.cost_data
        age = self._age()

        narrative_text = n.cost_approach if n and n.cost_approach else ""

        has_cost_service = cd is not None and cd.replacement_cost_per_sqft is not None

        if cd and cd.site_value is not None:
            land_value = cd.site_value
            land_source = cd.site_value_source or "Comparable land sales"
        else:
            land_pct = 0.20
            land_value = d.market_value * land_pct if d.market_value else None
            land_source = f"{int(land_pct * 100)}% of sales comparison value"

        if has_cost_service and cd:
            cost_per_sqft = cd.replacement_cost_per_sqft
            total_cost_new = cd.total_cost_new or (
                cost_per_sqft * d.subject_sqft if cost_per_sqft and d.subject_sqft else None
            )
            cost_sqft_display = f"${cost_per_sqft:,.0f}" if cost_per_sqft else "N/A"
            cost_source = "Cost service data"
        else:
            total_cost_new = d.market_value * 0.80 if d.market_value else None
            cost_sqft_display = "N/A &mdash; cost service needed"
            cost_source = "Not available"

        if cd and cd.physical_depreciation_pct is not None:
            dep_pct = cd.physical_depreciation_pct / 100
        else:
            dep_pct = min(age / 50.0, 0.80) if age else 0

        func_dep = cd.functional_depreciation if cd and cd.functional_depreciation else 0
        ext_dep = cd.external_depreciation if cd and cd.external_depreciation else 0

        phys_dep_amt = total_cost_new * dep_pct if total_cost_new else 0
        dep_value = (total_cost_new or 0) - phys_dep_amt - func_dep - ext_dep
        cost_indicated = (land_value or 0) + max(dep_value, 0)

        effective_age = max(1, int(age * 0.75)) if age else None

        limitation = ""
        if not has_cost_service:
            limitation = """
  <div class="callout-box" style="margin-top:12px;">
    <strong>Limitation:</strong> Reproduction/replacement cost new data and comparable
    land sales were not available for this desktop analysis. The Cost Approach is presented
    with limited reliability and is given secondary weight in the reconciliation.
    Integration of a cost service (e.g., Marshall &amp; Swift) and comparable land
    sales would improve this approach.
  </div>"""

        return f"""
<div class="page">
  {self._page_header("Cost Approach")}
  {self._section_header("COST APPROACH", "Cost to Reproduce / Replace")}

  {self._narrative_block(narrative_text)}

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Cost Approach Calculation</h3>
    {self._detail_row("Estimated Site Value", _fmt_money(land_value))}
    {self._detail_row("  Source of Site Value", land_source)}
    {self._detail_row("Dwelling Cost New", cost_source)}
    {self._detail_row("  Sq Ft of GLA", f"{_fmt(d.subject_sqft)}")}
    {self._detail_row("  Cost/Sq Ft", cost_sqft_display)}
    {self._detail_row("Garage / Carport", "Included in dwelling estimate")}
    {self._detail_row("Total Est. Cost New", _fmt_money(total_cost_new))}
    {self._detail_row("Less: Physical Depreciation", f"{_fmt_pct(dep_pct * 100, 0)} ({_fmt_money(phys_dep_amt)})")}
    {self._detail_row("  Actual Age", f"{age} years" if age else "N/A")}
    {self._detail_row("  Effective Age", f"{effective_age} years (est.)" if effective_age else "N/A")}
    {self._detail_row("  Economic Life", "50 years (est.)")}
    {self._detail_row("Less: Functional Depreciation", _fmt_money(func_dep))}
    {self._detail_row("Less: External Depreciation", _fmt_money(ext_dep))}
    {self._detail_row("Depreciated Value of Improvements", _fmt_money(dep_value))}
    {self._detail_row("+ Site Value", _fmt_money(land_value))}
    {self._detail_row("Indicated Value by Cost Approach", _fmt_money(cost_indicated), bold=True)}
  </div>
  {limitation}

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 9: Data Sources, Verification & Addendum
    # ------------------------------------------------------------------

    def _page_addendum(self) -> str:
        d = self.data
        comps = d.comp_adjustments
        p = self.palette

        comp_rows = ""
        for i, c in enumerate(comps):
            short_addr = c.comp_address.split(",")[0].strip()
            net_flag = ""
            if c.net_adjustment_pct is not None and abs(c.net_adjustment_pct) > 15:
                net_flag = f' style="color:{p["negative"]};font-weight:700;"'
            gross_flag = ""
            if c.gross_adjustment_pct is not None and c.gross_adjustment_pct > 25:
                gross_flag = f' style="color:{p["negative"]};font-weight:700;"'
            dist_cell = f"<td>{c.distance_miles:.2f} mi</td>" if c.distance_miles is not None else "<td>&mdash;</td>"

            comp_rows += (
                f"<tr>"
                f'<td style="font-weight:600;">Comp {i + 1}</td>'
                f"<td>{short_addr}</td>"
                f'<td class="money">{_fmt_money(c.base_price)}</td>'
                f'<td class="money">{_fmt_money(c.adjusted_price)}</td>'
                f"<td{net_flag}>{_fmt_pct(c.net_adjustment_pct)}</td>"
                f"<td{gross_flag}>{_fmt_pct(c.gross_adjustment_pct)}</td>"
                f"{dist_cell}"
                f"<td>{c.similarity_score:.0f}%</td>"
                f"<td>{c.weight * 100:.1f}%</td>"
                f"</tr>"
            )

        return f"""
<div class="page">
  {self._page_header("Data Sources &amp; Addendum")}
  {self._section_header("ADDENDUM", "Comparable Sales Summary &amp; Data Verification")}

  <div class="card">
    <h3 class="card-title">Comparable Sales Detail</h3>
    <table class="summary-table">
      <thead>
        <tr><th></th><th>Address</th><th>Sale Price</th><th>Adj. Price</th><th>Net Adj%</th><th>Gross Adj%</th><th>Dist.</th><th>Similarity</th><th>Weight</th></tr>
      </thead>
      <tbody>{comp_rows}</tbody>
    </table>
  </div>

  <div class="grid-2" style="margin-top:16px;">
    <div class="card">
      <h3 class="card-title">Adjustment Factors Applied</h3>
      {self._detail_row("GLA Size", "$100 per sq ft difference")}
      {self._detail_row("Bedroom Count", "$15,000 per bedroom")}
      {self._detail_row("Bathroom Count", "$10,000 per bathroom")}
      {self._detail_row("Age / Condition", "$1,500 per year difference")}
      {self._detail_row("Lot Size", "$25,000 per acre difference")}
      {self._detail_row("Financing / Concessions", "None applied (all conv.)")}
    </div>
    <div class="card">
      <h3 class="card-title">Methodology &amp; Weighting</h3>
      {self._detail_row("Valuation Method", "Weighted Hybrid")}
      {self._detail_row("Adjusted Price Weight", "40%")}
      {self._detail_row("Price/Sq Ft Weight", "40%")}
      {self._detail_row("Hybrid Blend Weight", "20%")}
      {self._detail_row("Similarity Scoring", "Weighted composite")}
      <p style="font-size:8px;color:{p["text_tertiary"]};margin-top:6px;">
        Components: Location 25% &middot; Size 25% &middot; Bed/Bath 20% &middot; Age 15% &middot; Lot 15%
      </p>
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Data Sources &amp; Verification</h3>
    {self._detail_row("Property Data", "RentCast property records, public assessor data")}
    {self._detail_row("Value Estimates", "RentCast AVM, Zillow Zestimate, Redfin Estimate")}
    {self._detail_row("Comparable Sales", "MLS via Zillow/AXESSO API, verified against public records")}
    {self._detail_row("Rental Estimates", "RentCast, Zillow Rent Zestimate, Redfin Rental Estimate")}
    {self._detail_row("Market Statistics", "RentCast market data (zip-code level)")}
    {self._detail_row("Mortgage Rates", "Zillow mortgage rate data")}
    {self._detail_row("Tax Data", "County assessor via RentCast, Zillow")}
    {self._detail_row("Verification Level", "Desktop &mdash; no physical inspection performed")}
  </div>

  <div class="callout-box" style="margin-top:12px;">
    <strong>URAR Guideline Note:</strong> Net adjustments exceeding &plusmn;15% or gross
    adjustments exceeding 25% of sale price require additional support. Flagged values
    are shown in red above. All adjustments reflect standardized factors and have not
    been individually verified through paired-sales analysis.
  </div>

  {self._page_footer()}
</div>"""

    # ------------------------------------------------------------------
    # Page 10: Scope of Work, Limiting Conditions & Disclaimer
    # ------------------------------------------------------------------

    def _page_scope_disclaimer(self) -> str:
        d = self.data
        n = d.narratives
        p = self.palette

        scope_text = n.scope_of_work if n and n.scope_of_work else ""

        return f"""
<div class="page">
  {self._page_header("Scope of Work &amp; Limiting Conditions")}
  {self._section_header("SCOPE OF WORK", "Limiting Conditions, Assumptions &amp; Certifications")}

  {self._narrative_block(scope_text)}

  <div class="grid-2" style="margin-top:16px;">
    <div class="card">
      <h3 class="card-title">Scope of Work Performed</h3>
      {self._detail_row("Type of Inspection", "Desktop &mdash; Exterior-Only")}
      {self._detail_row("Interior Inspection", "Not performed")}
      {self._detail_row("Comparable Inspection", "Not performed")}
      {self._detail_row("Analysis Type", "Sales Comparison (primary)")}
      {self._detail_row("Income Approach", "Developed" if d.rental_data and d.rental_data.monthly_rent else "Not developed")}
      {self._detail_row("Cost Approach", "Developed (limited)")}
      {self._detail_row("Market Analysis", "Desktop research")}
    </div>
    <div class="card">
      <h3 class="card-title">Extraordinary Assumptions</h3>
      {self._detail_row("Condition", "Assumed average &mdash; no inspection")}
      {self._detail_row("Zoning", "Assumed legal conforming")}
      {self._detail_row("Flood Zone", "Not independently verified")}
      {self._detail_row("Environmental", "No adverse conditions assumed")}
      {self._detail_row("Title", "Assumed clear &amp; marketable")}
      {self._detail_row("Encumbrances", "None assumed")}
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Limiting Conditions</h3>
    <ol style="font-size:9px;color:{p["text_secondary"]};padding-left:16px;line-height:1.7;">
      <li>This report is for investment analysis purposes only and is not a licensed appraisal, BPO, or CMA prepared by a state-certified or licensed appraiser.</li>
      <li>No physical inspection of the subject property or comparable sales was performed. All observations are based on publicly available data.</li>
      <li>The appraiser has no present or prospective interest in the subject property and has not performed services regarding the subject within the prior three years.</li>
      <li>The value opinion is contingent upon the extraordinary assumptions stated herein. If any assumption is found to be false, the value opinion may be affected.</li>
      <li>This report assumes responsible ownership and competent property management.</li>
      <li>Information furnished by others is believed to be reliable, but no warranty is given for its accuracy.</li>
      <li>Zoning, flood zone, environmental conditions, easements, and encumbrances have not been independently verified and should be confirmed through appropriate sources.</li>
    </ol>
  </div>

  <div class="disclaimer">
    <strong>Important Disclaimer:</strong> This report is generated by DealGapIQ for
    investment analysis purposes only. It is <strong>not</strong> a licensed appraisal
    prepared in conformance with USPAP (Uniform Standards of Professional Appraisal Practice).
    Values presented are estimates based on available data and standardized adjustment factors.
    Actual property values may differ based on condition, features, market conditions, and
    factors not captured in this desktop analysis. This report should not be used as a
    substitute for a professional appraisal performed by a state-certified appraiser.
  </div>

  <div class="final-footer">
    <div class="logo" style="font-size:18px;">DealGap<span class="logo-iq">IQ</span></div>
    <div style="font-size:9px;color:{p["text_tertiary"]};margin-top:4px;">Uniform Residential Appraisal Report &mdash; Form 1004 Format</div>
    <div class="footer-date">Report generated {self.now.strftime("%B %d, %Y at %I:%M %p")}</div>
  </div>
</div>"""

    # ------------------------------------------------------------------
    # CSS
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
body {{ font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 10px; line-height: 1.5; color: {p["text_primary"]}; background: {p["bg"]}; }}
.page {{ width: 8.5in; min-height: 11in; padding: 0.55in 0.6in; page-break-after: always; position: relative; background: {p["bg"]}; }}
.page:last-child {{ page-break-after: auto; }}

.cover-page {{ display: flex; flex-direction: column; padding: 0; }}
.cover-top-band {{ height: 6px; background: linear-gradient(90deg, {p["brand"]}, {"#0284c7" if not is_dark else "#2DD4BF"}); }}
.cover-content {{ flex: 1; padding: 28px 52px 14px; display: flex; flex-direction: column; justify-content: space-between; }}
.cover-section-top {{ }}
.cover-section-bottom {{ }}
.cover-logo {{ font-size: 24px; font-weight: 700; color: {p["text_primary"]}; }}
.cover-badge {{ display: inline-block; padding: 4px 14px; border-radius: 100px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: {p["brand"]}; background: {p["brand"]}15; border: 1px solid {p["brand"]}30; }}
.cover-address {{ font-size: 24px; font-weight: 700; color: {p["text_primary"]}; line-height: 1.15; margin-bottom: 3px; margin-top: 8px; }}
.cover-city {{ font-size: 12px; color: {p["text_secondary"]}; margin-bottom: 4px; }}
.cover-stats-line {{ font-size: 10px; font-weight: 600; color: {p["text_tertiary"]}; margin-bottom: 14px; }}
.cover-summary-cards {{ display: flex; gap: 12px; margin-bottom: 14px; }}
.cover-value-card {{ flex: 1; background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 8px; padding: 10px; text-align: center; border-top: 3px solid {p["text_secondary"]}; }}
.cover-value-card-arv {{ border-top-color: {p["brand"]}; }}
.cover-value-label {{ font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {p["text_tertiary"]}; margin-bottom: 2px; }}
.cover-value-amount {{ font-size: 20px; font-weight: 700; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; margin-bottom: 2px; }}
.cover-value-range {{ font-size: 8px; color: {p["text_tertiary"]}; }}
.cover-footer {{ display: flex; justify-content: space-between; padding: 12px 52px; border-top: 1px solid {p["border"]}; }}
.cover-footer-label {{ font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {p["text_tertiary"]}; display: block; margin-bottom: 2px; }}
.cover-footer-value {{ font-size: 9px; font-weight: 600; color: {p["text_secondary"]}; }}

.section-divider {{ margin: 8px 0; border-top: 2px solid {p["brand"]}; }}

.combined-page {{ display: flex; flex-direction: column; }}
.combined-page .page-header {{ flex-shrink: 0; }}
.combined-page .page-footer {{ position: absolute; }}
.combined-section-top {{ }}
.combined-section-bottom {{ }}

.page-header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid {p["brand"]}; margin-bottom: 16px; }}
.page-header-title {{ font-size: 10px; font-weight: 700; color: {p["text_secondary"]}; text-transform: uppercase; letter-spacing: 0.06em; }}
.page-header-meta {{ font-size: 9px; color: {p["text_tertiary"]}; }}
.logo {{ font-size: 14px; font-weight: 700; color: {p["text_primary"]}; }}
.logo-iq {{ color: {p["brand"]}; }}
.page-footer {{ position: absolute; bottom: 0.45in; left: 0.6in; right: 0.6in; display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid {p["border"]}; }}
.footer-brand {{ font-size: 8px; font-weight: 600; color: {p["text_tertiary"]}; }}
.footer-date {{ font-size: 8px; color: {p["text_tertiary"]}; }}

.section-header {{ margin-bottom: 12px; }}
.section-label {{ font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: {p["brand"]}; margin-bottom: 3px; }}
.section-title {{ font-size: 16px; font-weight: 700; color: {p["text_primary"]}; margin-bottom: 5px; }}
.section-rule {{ width: 40px; height: 3px; background: {p["brand"]}; border-radius: 2px; }}

.grid-2 {{ display: flex; gap: 14px; }}
.grid-2 > * {{ flex: 1; }}
.grid-3 {{ display: flex; gap: 10px; }}
.grid-3 > * {{ flex: 1; }}

.card {{ background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 8px; padding: 14px; }}
.card-title {{ font-size: 10px; font-weight: 700; color: {p["text_primary"]}; margin-bottom: 8px; }}
.info-card {{ background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 8px; padding: 12px; text-align: center; border-top: 3px solid {p["brand"]}; }}
.info-card-label {{ font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: {p["text_tertiary"]}; margin-bottom: 3px; }}
.info-card-value {{ font-size: 14px; font-weight: 700; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; }}

.detail-row {{ display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid {p["border"]}; font-size: 9px; color: {p["text_secondary"]}; }}
.detail-row:last-child {{ border-bottom: none; }}
.detail-value {{ font-weight: 600; color: {p["text_primary"]}; font-variant-numeric: tabular-nums; }}

.hero-card {{ background: {hero_gradient}; border: {hero_border}; border-radius: 10px; padding: 18px; text-align: center; }}
.hero-card-label {{ font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: {"rgba(255,255,255,0.8)" if not is_dark else p["text_tertiary"]}; margin-bottom: 5px; }}
.hero-card-value {{ font-size: 26px; font-weight: 700; color: {"white" if not is_dark else p["brand"]}; font-variant-numeric: tabular-nums; margin-bottom: 5px; }}
.hero-card-sub {{ font-size: 9px; color: {"rgba(255,255,255,0.7)" if not is_dark else p["text_secondary"]}; }}

.narrative {{ font-size: 9px; line-height: 1.65; color: {p["text_secondary"]}; margin-bottom: 6px; }}

.callout-box {{ background: {p["brand"]}10; border: 1px solid {p["brand"]}30; border-left: 3px solid {p["brand"]}; border-radius: 6px; padding: 10px 12px; font-size: 9px; color: {p["text_secondary"]}; line-height: 1.55; }}
.callout-box strong {{ color: {p["text_primary"]}; }}

.conf-ring {{ width: 48px; height: 48px; border-radius: 50%; border: 4px solid {p["brand"]}; display: flex; align-items: center; justify-content: center; background: {p["bg"]}; }}
.conf-ring-value {{ font-size: 12px; font-weight: 700; color: {p["brand"]}; }}

.adj-table {{ width: 100%; border-collapse: collapse; font-size: {"7px" if len(self.data.comp_adjustments) > 5 else "8px"}; margin-top: 10px; }}
.adj-table th {{ background: {p["brand_dark"] if not is_dark else "#101828"}; color: {"white" if not is_dark else p["text_secondary"]}; padding: 5px 3px; text-align: center; font-size: {"6px" if len(self.data.comp_adjustments) > 5 else "7px"}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }}
.adj-table th:first-child, .row-label-header {{ text-align: left; min-width: 60px; }}
.adj-table td {{ padding: 3px; border-bottom: 1px solid {p["border"]}; font-variant-numeric: tabular-nums; color: {p["text_primary"]}; text-align: center; }}
.adj-table tr:nth-child(even) {{ background: {p["card_bg"]}; }}
.row-label {{ text-align: left !important; font-weight: 600; color: {p["text_secondary"]}; white-space: nowrap; }}
.adj-label {{ padding-left: 8px !important; font-weight: 500 !important; }}
.adj-header td {{ background: {p["brand"]}10; font-weight: 700 !important; color: {p["brand"]} !important; text-transform: uppercase; letter-spacing: 0.04em; font-size: 7px; padding: 4px 3px; border-top: 2px solid {p["brand"]}40; }}
.total-row td {{ border-top: 2px solid {p["border"]}; font-weight: 700; }}
td.money {{ font-weight: 600; font-variant-numeric: tabular-nums; }}

.summary-table {{ width: 100%; border-collapse: collapse; font-size: 8px; }}
.summary-table th {{ background: {p["brand_dark"] if not is_dark else "#101828"}; color: {"white" if not is_dark else p["text_secondary"]}; padding: 6px 4px; text-align: left; font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }}
.summary-table td {{ padding: 4px; border-bottom: 1px solid {p["border"]}; font-variant-numeric: tabular-nums; color: {p["text_primary"]}; }}
.summary-table tr:nth-child(even) {{ background: {p["card_bg"]}; }}

.disclaimer {{ margin-top: 16px; padding: 12px; background: {p["card_bg"]}; border: 1px solid {p["border"]}; border-radius: 6px; font-size: 8px; color: {p["text_tertiary"]}; line-height: 1.6; }}
.disclaimer strong {{ color: {p["text_secondary"]}; }}
.final-footer {{ margin-top: 16px; text-align: center; }}
.final-footer .footer-date {{ margin-top: 4px; font-size: 8px; color: {p["text_tertiary"]}; }}
"""
