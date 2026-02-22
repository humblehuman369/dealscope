"""
DealGapIQ Property Investment Report — PDF Generator

Generates a professional, multi-page property investment report using
WeasyPrint. Supports light (print) and dark (digital) themes.

The report is 11 pages covering:
  1. Cover
  2. Property Overview
  3. Market Position
  4. Investment Structure & Financing
  5. Year 1 Income Statement
  6. Operating Expense Breakdown
  7. Key Investment Metrics
  8. Deal Score & Verdict
  9. 10-Year Financial Projections
 10. Exit Strategy & Tax Implications
 11. Sensitivity Analysis & Disclaimer
"""

import logging
from io import BytesIO
from datetime import datetime
from typing import Optional

from app.schemas.proforma import FinancialProforma
from app.services.pdf_chart_helpers import (
    get_palette,
    generate_donut_chart,
    generate_donut_legend,
    generate_area_chart,
    generate_score_ring,
    generate_metric_card,
    generate_step_item,
    generate_stat_badge,
    generate_gauge_bar,
)
from app.services.pdf_narrative import (
    cover_narrative,
    property_overview_narrative,
    market_narrative,
    financing_narrative,
    income_narrative,
    expense_narrative,
    metrics_narrative,
    deal_score_narrative,
    projections_narrative,
    exit_narrative,
    sensitivity_narrative,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy WeasyPrint import — loaded on first PDF request, not at app startup.
# This prevents blocking or crashing the server if system libs are missing.
# ---------------------------------------------------------------------------
_weasyprint_html = None
_weasyprint_css = None
_weasyprint_checked = False
WEASYPRINT_AVAILABLE = False


def _ensure_weasyprint():
    """Lazy-load WeasyPrint on first use. Returns (HTML, CSS) or raises."""
    global _weasyprint_html, _weasyprint_css, _weasyprint_checked, WEASYPRINT_AVAILABLE

    if _weasyprint_checked:
        if not WEASYPRINT_AVAILABLE:
            raise ImportError(
                "WeasyPrint is not available. Required system libraries may be missing. "
                "See: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html"
            )
        return _weasyprint_html, _weasyprint_css

    _weasyprint_checked = True
    try:
        from weasyprint import HTML, CSS
        _weasyprint_html = HTML
        _weasyprint_css = CSS
        WEASYPRINT_AVAILABLE = True
        logger.info("WeasyPrint loaded successfully — PDF report generation enabled")
        return HTML, CSS
    except Exception as exc:
        WEASYPRINT_AVAILABLE = False
        logger.error(
            "WeasyPrint import FAILED — PDF report generation disabled. "
            f"Error: {type(exc).__name__}: {exc}"
        )
        raise


def _fmt(val: float, decimals: int = 0) -> str:
    if decimals == 0:
        return f"{val:,.0f}"
    return f"{val:,.{decimals}f}"


def _fmt_money(val: float) -> str:
    return f"${val:,.0f}"


def _fmt_pct(val: float, decimals: int = 2) -> str:
    return f"{val:.{decimals}f}%"


def _sign_money(val: float) -> str:
    """Format money with sign indicator for cash flows."""
    if val >= 0:
        return f"${val:,.0f}"
    return f"-${abs(val):,.0f}"


class PropertyReportPDFExporter:
    """Generate a professional property investment report PDF."""

    def __init__(self, proforma: FinancialProforma, theme: str = "light"):
        self.data = proforma
        self.theme = theme if theme in ("light", "dark") else "light"
        self.palette = get_palette(self.theme)
        self.now = datetime.now()

    def generate(self) -> BytesIO:
        """Generate the full PDF report and return as BytesIO (requires WeasyPrint)."""
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
        """Return a self-contained HTML string ready for browser rendering and print-to-PDF.

        No WeasyPrint or system dependencies required. The browser's native
        print dialog (Cmd/Ctrl+P → Save as PDF) produces a professional result
        thanks to embedded @page and page-break CSS rules.

        Args:
            auto_print: If True, injects a small script that opens the browser
                        print dialog automatically after fonts have loaded.
        """
        css_content = self._build_css()
        body_content = self._build_body()

        print_script = ""
        if auto_print:
            print_script = """
<script>
  // Wait for web fonts to load before triggering print
  document.fonts.ready.then(function() {
    setTimeout(function() { window.print(); }, 400);
  });
</script>"""

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DealGapIQ Property Report — {self.data.property_address}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>{css_content}</style>
{print_script}
</head>
<body>
{body_content}
</body>
</html>"""

    # -----------------------------------------------------------------------
    # HTML Assembly
    # -----------------------------------------------------------------------

    def _build_body(self) -> str:
        """Return the inner body content (all pages) without the HTML wrapper."""
        return f"""{self._page_cover()}
{self._page_overview()}
{self._page_market()}
{self._page_financing()}
{self._page_income()}
{self._page_expenses()}
{self._page_metrics()}
{self._page_deal_score()}
{self._page_projections()}
{self._page_exit()}
{self._page_sensitivity()}"""

    def _build_html(self) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DealGapIQ Property Report — {self.data.property_address}</title>
</head>
<body>
{self._page_cover()}
{self._page_overview()}
{self._page_market()}
{self._page_financing()}
{self._page_income()}
{self._page_expenses()}
{self._page_metrics()}
{self._page_deal_score()}
{self._page_projections()}
{self._page_exit()}
{self._page_sensitivity()}
</body>
</html>"""

    # -----------------------------------------------------------------------
    # Reusable layout components
    # -----------------------------------------------------------------------

    def _section_header(self, label: str, title: str) -> str:
        p = self.palette
        return (
            f'<div class="section-header">'
            f'<div class="section-label">{label}</div>'
            f'<h2 class="section-title">{title}</h2>'
            f'<div class="section-rule"></div>'
            f'</div>'
        )

    def _page_header(self, title: str) -> str:
        p = self.palette
        return (
            f'<div class="page-header">'
            f'<div class="logo">DealGap<span class="logo-iq">IQ</span></div>'
            f'<div class="page-header-title">{title}</div>'
            f'<div class="page-header-meta">{self.data.property.city}, {self.data.property.state}</div>'
            f'</div>'
        )

    def _page_footer(self) -> str:
        return (
            f'<div class="page-footer">'
            f'<div class="footer-brand">Generated by DealGapIQ</div>'
            f'<div class="footer-date">{self.now.strftime("%B %d, %Y")}</div>'
            f'</div>'
        )

    def _info_card(self, icon_char: str, label: str, value: str, sublabel: str = "") -> str:
        p = self.palette
        sub = f'<div class="info-card-sub">{sublabel}</div>' if sublabel else ""
        return (
            f'<div class="info-card">'
            f'<div class="info-card-icon">{icon_char}</div>'
            f'<div class="info-card-label">{label}</div>'
            f'<div class="info-card-value">{value}</div>'
            f'{sub}'
            f'</div>'
        )

    def _narrative_block(self, text: str) -> str:
        return f'<p class="narrative">{text}</p>'

    # -----------------------------------------------------------------------
    # Page 1: Cover
    # -----------------------------------------------------------------------

    def _page_cover(self) -> str:
        prop = self.data.property
        p = self.palette
        strategy_label = self.data.strategy_type.replace("_", " ").title()

        # Property address parsing
        address_parts = self.data.property_address.split(",")
        street = address_parts[0].strip() if address_parts else self.data.property_address
        city_state = ", ".join(address_parts[1:]).strip() if len(address_parts) > 1 else f"{prop.city}, {prop.state}"

        lot_acres = prop.lot_size / 43560 if prop.lot_size > 0 else 0

        return f"""
<div class="page cover-page">
  <div class="cover-top-band"></div>
  <div class="cover-content">
    <div class="cover-logo">DealGap<span class="logo-iq">IQ</span></div>
    <div class="cover-badge">{strategy_label} Analysis</div>
    <h1 class="cover-address">{street}</h1>
    <div class="cover-city">{city_state}</div>

    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-icon">&#x1F3E0;</div>
        <div class="cover-stat-value">{prop.bedrooms}</div>
        <div class="cover-stat-label">Bedrooms</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-icon">&#x1F6C1;</div>
        <div class="cover-stat-value">{prop.bathrooms}</div>
        <div class="cover-stat-label">Bathrooms</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-icon">&#x1F4CF;</div>
        <div class="cover-stat-value">{_fmt(prop.square_feet)}</div>
        <div class="cover-stat-label">Sq Ft Living</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-icon">&#x1F333;</div>
        <div class="cover-stat-value">{_fmt(prop.lot_size)}</div>
        <div class="cover-stat-label">Sq Ft Lot</div>
      </div>
    </div>

    {self._narrative_block(cover_narrative(self.data))}
  </div>

  <div class="cover-footer">
    <div class="cover-footer-left">
      <span class="cover-footer-label">Generated</span>
      <span class="cover-footer-value">{self.now.strftime("%B %d, %Y")}</span>
    </div>
    <div class="cover-footer-right">
      <span class="cover-footer-label">Data Source</span>
      <span class="cover-footer-value">{self.data.sources.property_value_source}</span>
    </div>
  </div>
</div>"""

    # -----------------------------------------------------------------------
    # Page 2: Property Overview
    # -----------------------------------------------------------------------

    def _page_overview(self) -> str:
        prop = self.data.property
        acq = self.data.acquisition
        exp = self.data.expenses
        m = self.data.metrics

        return f"""
<div class="page">
  {self._page_header("Property Overview")}
  {self._section_header("PROPERTY DETAILS", "Property Overview")}

  <div class="grid-4">
    {self._info_card("&#x1F4B0;", "List Price", _fmt_money(acq.list_price))}
    {self._info_card("&#x1F4CA;", "Price per Sqft", f"${_fmt(m.price_per_sqft)}")}
    {self._info_card("&#x1F4D0;", "Lot Size", f"{_fmt(prop.lot_size)} sqft",
                      f"{prop.lot_size / 43560:.2f} acres" if prop.lot_size > 0 else "")}
    {self._info_card("&#x1F3D7;", "Year Built", str(prop.year_built))}
  </div>

  <div class="grid-2" style="margin-top:20px;">
    <div class="card">
      <h3 class="card-title">Property Details</h3>
      <div class="detail-row"><span>{prop.bedrooms} spacious bedrooms</span></div>
      <div class="detail-row"><span>{prop.bathrooms} bathrooms</span></div>
      <div class="detail-row"><span>{_fmt(prop.square_feet)} square feet of living space</span></div>
      <div class="detail-row"><span>{prop.property_type.replace('_', ' ').title()}</span></div>
    </div>
    <div class="card">
      <h3 class="card-title">Annual Obligations</h3>
      <div class="detail-row">
        <span>Property taxes</span>
        <span class="detail-value">{_fmt_money(exp.property_taxes)}</span>
      </div>
      <div class="detail-row">
        <span>Insurance estimate</span>
        <span class="detail-value">{_fmt_money(exp.insurance)}</span>
      </div>
      <div class="detail-row">
        <span>HOA fees</span>
        <span class="detail-value">{_fmt_money(exp.hoa_fees) if exp.hoa_fees > 0 else "None"}</span>
      </div>
      <div class="detail-row">
        <span>Maintenance reserves</span>
        <span class="detail-value">{_fmt_money(exp.maintenance)}</span>
      </div>
    </div>
  </div>

  {self._narrative_block(property_overview_narrative(self.data))}
  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 3: Market Position
    # -----------------------------------------------------------------------

    def _page_market(self) -> str:
        prop = self.data.property
        proj = self.data.projections

        return f"""
<div class="page">
  {self._page_header("Market Position")}
  {self._section_header("LOCATION & MARKET", "Prime Location & Market Position")}

  {self._narrative_block(market_narrative(self.data))}

  <div class="grid-3" style="margin-top:24px;">
    <div class="card highlight-card">
      <div class="highlight-card-icon">&#x1F4CD;</div>
      <h3 class="card-title">Strategic Location</h3>
      <p class="card-text">
        Prime position in {prop.city} with access to major transportation corridors,
        employment centers, and amenities that drive consistent tenant demand.
      </p>
    </div>
    <div class="card highlight-card">
      <div class="highlight-card-icon">&#x1F3EB;</div>
      <h3 class="card-title">Community Appeal</h3>
      <p class="card-text">
        Local school districts, parks, and neighborhood amenities enhance rental
        appeal and support long-term property value appreciation.
      </p>
    </div>
    <div class="card highlight-card">
      <div class="highlight-card-icon">&#x1F4C8;</div>
      <h3 class="card-title">Market Strength</h3>
      <p class="card-text">
        The local market supports {_fmt_pct(proj.appreciation_rate)} annual appreciation
        assumptions with limited inventory and strong buyer demand from relocating professionals.
      </p>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 4: Investment Structure & Financing
    # -----------------------------------------------------------------------

    def _page_financing(self) -> str:
        acq = self.data.acquisition
        fin = self.data.financing
        p = self.palette

        steps = [
            generate_step_item(
                1, "Down Payment",
                _fmt_money(fin.down_payment),
                f"{fin.down_payment_percent:.0f}% initial equity investment",
                self.theme
            ),
            generate_step_item(
                2, "Loan Amount",
                _fmt_money(fin.loan_amount),
                f"Financed at {fin.interest_rate:.2f}% over {fin.loan_term_years} years",
                self.theme
            ),
            generate_step_item(
                3, "Monthly Payment",
                _fmt_money(fin.monthly_payment),
                "Principal and interest payment",
                self.theme
            ),
            generate_step_item(
                4, "Closing Costs",
                _fmt_money(acq.closing_costs),
                "Acquisition expenses including title, escrow, and lender fees",
                self.theme, is_last=True
            ),
        ]

        return f"""
<div class="page">
  {self._page_header("Investment Structure")}
  {self._section_header("ACQUISITION & FINANCING", "Investment Structure & Financing")}

  {self._narrative_block(financing_narrative(self.data))}

  <div class="grid-2" style="margin-top:24px;">
    <div>
      {''.join(steps)}
    </div>
    <div>
      <div class="hero-card">
        <div class="hero-card-label">Total Investment</div>
        <div class="hero-card-value">{_fmt_money(acq.total_acquisition_cost)}</div>
        <div class="hero-card-sub">Complete acquisition package including all costs and reserves</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card-title">Financing Summary</h3>
        <div class="detail-row">
          <span>Loan Type</span>
          <span class="detail-value">{fin.loan_type}</span>
        </div>
        <div class="detail-row">
          <span>Interest Rate</span>
          <span class="detail-value">{fin.interest_rate:.2f}%</span>
        </div>
        <div class="detail-row">
          <span>Term</span>
          <span class="detail-value">{fin.loan_term_years} years</span>
        </div>
        <div class="detail-row">
          <span>Total Interest (Life of Loan)</span>
          <span class="detail-value">{_fmt_money(fin.total_interest_over_life)}</span>
        </div>
      </div>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 5: Year 1 Income Statement
    # -----------------------------------------------------------------------

    def _page_income(self) -> str:
        inc = self.data.income
        exp = self.data.expenses
        m = self.data.metrics
        p = self.palette

        cf_color = p["positive"] if m.monthly_cash_flow >= 0 else p["negative"]

        steps = [
            generate_step_item(1, "Gross Scheduled Rent", _fmt_money(inc.annual_gross_rent),
                               f"Based on RentCast estimate of {_fmt_money(inc.monthly_rent)}/month", self.theme),
            generate_step_item(2, f"Less Vacancy Allowance ({inc.vacancy_percent:.0f}%)",
                               f"-{_fmt_money(inc.vacancy_allowance)}",
                               f"Conservative {inc.vacancy_percent:.0f}% vacancy rate", self.theme),
            generate_step_item(3, "Effective Gross Income", _fmt_money(inc.effective_gross_income),
                               "Net rental income post-vacancy", self.theme),
            generate_step_item(4, "Total Operating Expenses", f"-{_fmt_money(exp.total_operating_expenses)}",
                               "Taxes, insurance, maintenance & operational costs", self.theme),
            generate_step_item(5, "Net Operating Income", _fmt_money(m.net_operating_income),
                               "Income before mortgage payments", self.theme),
            generate_step_item(6, "Annual Debt Service", f"-{_fmt_money(m.annual_debt_service)}",
                               "P&I payments on mortgage", self.theme),
            generate_step_item(7, "Pre-Tax Cash Flow", _sign_money(m.annual_cash_flow),
                               "Net income after all obligations", self.theme, is_last=True),
        ]

        return f"""
<div class="page">
  {self._page_header("Year 1 Income")}
  {self._section_header("INCOME STATEMENT", "Year 1 Income Statement")}

  {self._narrative_block(income_narrative(self.data))}

  <div style="margin-top:20px;">
    {''.join(steps)}
  </div>

  <div class="metrics-bar" style="margin-top:24px;">
    <div class="metrics-bar-item">
      <div class="metrics-bar-label">Gross Rent</div>
      <div class="metrics-bar-value">{_fmt_money(inc.annual_gross_rent)}</div>
    </div>
    <div class="metrics-bar-item">
      <div class="metrics-bar-label">NOI</div>
      <div class="metrics-bar-value">{_fmt_money(m.net_operating_income)}</div>
    </div>
    <div class="metrics-bar-item">
      <div class="metrics-bar-label">Debt Service</div>
      <div class="metrics-bar-value">-{_fmt_money(m.annual_debt_service)}</div>
    </div>
    <div class="metrics-bar-item">
      <div class="metrics-bar-label">Monthly Cash Flow</div>
      <div class="metrics-bar-value" style="color:{cf_color}">{_sign_money(m.monthly_cash_flow)}</div>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 6: Operating Expense Breakdown
    # -----------------------------------------------------------------------

    def _page_expenses(self) -> str:
        exp = self.data.expenses

        # Build segments for donut chart
        segments = [
            ("Property Taxes", exp.property_taxes),
            ("Insurance", exp.insurance),
            ("Maintenance", exp.maintenance),
            ("CapEx Reserve", exp.cap_ex_reserve),
        ]
        if exp.management > 0:
            segments.append(("Management", exp.management))
        if exp.utilities > 0:
            segments.append(("Utilities", exp.utilities))
        if exp.hoa_fees > 0:
            segments.append(("HOA Fees", exp.hoa_fees))
        if exp.pest_control > 0:
            segments.append(("Pest Control", exp.pest_control))
        if exp.landscaping > 0:
            segments.append(("Landscaping", exp.landscaping))

        # Sort by value descending
        segments.sort(key=lambda x: x[1], reverse=True)

        donut = generate_donut_chart(
            segments, self.theme, width=200, height=200,
            inner_label="Total", inner_value=_fmt_money(exp.total_operating_expenses)
        )
        legend_segments = [(label, val, _fmt_money(val)) for label, val in segments]
        legend = generate_donut_legend(legend_segments, self.theme)

        return f"""
<div class="page">
  {self._page_header("Operating Expenses")}
  {self._section_header("EXPENSE ANALYSIS", "Operating Expense Breakdown")}

  <div class="grid-2" style="margin-top:20px;">
    <div style="display:flex;justify-content:center;align-items:center;">
      {donut}
    </div>
    <div>
      <h3 class="card-title" style="margin-bottom:12px;">Expense Category Breakdown</h3>
      {legend}
    </div>
  </div>

  {self._narrative_block(expense_narrative(self.data))}

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 7: Key Investment Metrics
    # -----------------------------------------------------------------------

    def _page_metrics(self) -> str:
        m = self.data.metrics
        r = self.data.returns

        # Determine assessments
        def assess(val, good, fair):
            if val >= good:
                return "STRONG"
            if val >= fair:
                return "FAIR"
            return "BELOW"

        cap_assess = assess(m.cap_rate, 6.0, 4.0)
        coc_assess = assess(m.cash_on_cash_return, 8.0, 0.0)
        dscr_assess = assess(m.dscr, 1.25, 1.0)
        irr_assess = assess(r.irr, 15.0, 10.0)

        cards = [
            generate_metric_card(
                "Cap Rate", _fmt_pct(m.cap_rate), cap_assess,
                "Net operating income as percentage of purchase price",
                self.theme
            ),
            generate_metric_card(
                "Cash-on-Cash", _fmt_pct(m.cash_on_cash_return), coc_assess,
                "Annual return on invested equity capital",
                self.theme
            ),
            generate_metric_card(
                "DSCR", f"{m.dscr:.2f}", dscr_assess,
                "Debt service coverage ratio — income relative to debt",
                self.theme
            ),
            generate_metric_card(
                "IRR", _fmt_pct(r.irr), irr_assess,
                f"Projected IRR over {self.data.exit.hold_period_years}-year hold period",
                self.theme
            ),
        ]

        return f"""
<div class="page">
  {self._page_header("Key Metrics")}
  {self._section_header("INVESTMENT METRICS", "Key Investment Metrics")}

  <div class="grid-2-metrics" style="margin-top:20px;">
    {cards[0]}
    {cards[1]}
  </div>
  <div class="grid-2-metrics" style="margin-top:12px;">
    {cards[2]}
    {cards[3]}
  </div>

  <div class="card" style="margin-top:24px;">
    <h3 class="card-title">Why These Metrics Matter</h3>
    {self._narrative_block(metrics_narrative(self.data))}
  </div>

  <div class="card" style="margin-top:16px;">
    <h3 class="card-title">Additional Metrics</h3>
    <div class="detail-row">
      <span>Gross Rent Multiplier</span>
      <span class="detail-value">{m.gross_rent_multiplier:.1f}</span>
    </div>
    <div class="detail-row">
      <span>1% Rule</span>
      <span class="detail-value">{_fmt_pct(m.one_percent_rule)}</span>
    </div>
    <div class="detail-row">
      <span>Break-Even Occupancy</span>
      <span class="detail-value">{_fmt_pct(m.break_even_occupancy, 1)}</span>
    </div>
    <div class="detail-row">
      <span>Price per Sqft</span>
      <span class="detail-value">${_fmt(m.price_per_sqft)}</span>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 8: Deal Score & Verdict
    # -----------------------------------------------------------------------

    def _page_deal_score(self) -> str:
        ds = self.data.deal_score
        m = self.data.metrics
        r = self.data.returns
        p = self.palette

        score_ring = generate_score_ring(
            ds.score, 100, self.theme, size=140, grade=ds.grade
        )

        # Return factor bars
        cap_bar = generate_gauge_bar(m.cap_rate, 12.0, 6.0, self.theme, width=180)
        coc_bar = generate_gauge_bar(
            max(0, m.cash_on_cash_return), 20.0, 8.0, self.theme, width=180
        )
        dscr_bar = generate_gauge_bar(m.dscr, 2.0, 1.25, self.theme, width=180)

        return f"""
<div class="page">
  {self._page_header("Deal Score")}
  {self._section_header("DEALGAPIQ VERDICT", "Deal Score & Verdict")}

  <div class="grid-2" style="margin-top:20px;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
      {score_ring}
      <div class="verdict-label">{ds.verdict}</div>
    </div>
    <div>
      {self._narrative_block(deal_score_narrative(self.data))}

      <div class="card" style="margin-top:16px;">
        <h3 class="card-title">Return Factor Benchmarks</h3>
        <div class="gauge-row">
          <span class="gauge-label">Cap Rate</span>
          {cap_bar}
          <span class="gauge-value">{_fmt_pct(m.cap_rate)}</span>
        </div>
        <div class="gauge-row">
          <span class="gauge-label">Cash-on-Cash</span>
          {coc_bar}
          <span class="gauge-value">{_fmt_pct(m.cash_on_cash_return)}</span>
        </div>
        <div class="gauge-row">
          <span class="gauge-label">DSCR</span>
          {dscr_bar}
          <span class="gauge-value">{m.dscr:.2f}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:20px;">
    <div class="detail-row">
      <span>Income Value</span>
      <span class="detail-value">{_fmt_money(ds.income_value)}</span>
    </div>
    <div class="detail-row">
      <span>Discount Required</span>
      <span class="detail-value">{abs(ds.discount_required):.1f}%</span>
    </div>
    <div class="detail-row">
      <span>Equity Multiple ({self.data.exit.hold_period_years}yr)</span>
      <span class="detail-value">{r.equity_multiple:.2f}x</span>
    </div>
    <div class="detail-row">
      <span>Average Annual Return</span>
      <span class="detail-value">{_fmt_pct(r.average_annual_return)}</span>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 9: 10-Year Financial Projections
    # -----------------------------------------------------------------------

    def _page_projections(self) -> str:
        proj = self.data.projections
        fin = self.data.financing
        acq = self.data.acquisition
        p = self.palette
        years = len(proj.annual_projections)

        # Chart data
        labels = [f"Yr {i+1}" for i in range(years)]
        prop_values = proj.property_values[:years]
        equity_values = proj.equity_positions[:years]

        area_chart = generate_area_chart(
            labels, prop_values, equity_values,
            "Property Value", "Equity Position",
            self.theme, width=520, height=220
        )

        # Stat badges
        initial_equity = fin.down_payment
        final_equity = equity_values[-1] if equity_values else initial_equity
        equity_growth = ((final_equity - initial_equity) / initial_equity * 100) if initial_equity > 0 else 0

        initial_value = acq.purchase_price
        final_value = prop_values[-1] if prop_values else initial_value
        appreciation = ((final_value - initial_value) / initial_value * 100) if initial_value > 0 else 0

        initial_balance = fin.loan_amount
        final_balance = proj.loan_balances[-1] if proj.loan_balances else initial_balance
        paydown_pct = ((initial_balance - final_balance) / initial_balance * 100) if initial_balance > 0 else 0

        badges = (
            f'<div style="display:flex;gap:12px;margin-top:20px;">'
            f'{generate_stat_badge("Equity Growth", f"{equity_growth:.0f}%", p["positive"], self.theme)}'
            f'{generate_stat_badge("Appreciation", f"{appreciation:.0f}%", p["brand"], self.theme)}'
            f'{generate_stat_badge("Loan Paydown", f"{paydown_pct:.0f}%", p["warning"] if self.theme == "dark" else "#D97706", self.theme)}'
            f'</div>'
        )

        # Projection table (compact)
        rows = ""
        for i, ap in enumerate(proj.annual_projections[:years]):
            cf_color = p["positive"] if ap.pre_tax_cash_flow >= 0 else p["negative"]
            rows += (
                f'<tr>'
                f'<td style="font-weight:600;">Year {i+1}</td>'
                f'<td class="money">{_fmt_money(ap.gross_rental_income)}</td>'
                f'<td class="money">{_fmt_money(ap.operating_expenses)}</td>'
                f'<td class="money">{_fmt_money(ap.net_operating_income)}</td>'
                f'<td class="money" style="color:{cf_color}">{_sign_money(ap.pre_tax_cash_flow)}</td>'
                f'<td class="money">{_fmt_money(prop_values[i])}</td>'
                f'<td class="money">{_fmt_money(equity_values[i])}</td>'
                f'</tr>'
            )

        return f"""
<div class="page">
  {self._page_header("Projections")}
  {self._section_header("FINANCIAL PROJECTIONS", f"{years}-Year Financial Projections")}

  {self._narrative_block(projections_narrative(self.data))}

  <div style="margin-top:20px;">
    {area_chart}
  </div>

  {badges}

  <table class="projection-table" style="margin-top:20px;">
    <thead>
      <tr>
        <th>Year</th><th>Gross Rent</th><th>OpEx</th><th>NOI</th>
        <th>Cash Flow</th><th>Prop Value</th><th>Equity</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>

  <p class="table-note">
    Growth assumptions: Rent {_fmt_pct(proj.rent_growth_rate, 1)}/yr,
    Expenses {_fmt_pct(proj.expense_growth_rate, 1)}/yr,
    Appreciation {_fmt_pct(proj.appreciation_rate, 1)}/yr
  </p>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 10: Exit Strategy & Tax Implications
    # -----------------------------------------------------------------------

    def _page_exit(self) -> str:
        e = self.data.exit
        r = self.data.returns
        fin = self.data.financing

        steps = [
            generate_step_item(1, "Projected Sale Price", _fmt_money(e.projected_sale_price),
                               f"Based on {_fmt_pct(e.appreciation_rate)} annual appreciation through year {e.hold_period_years}",
                               self.theme),
            generate_step_item(2, "Sale Deductions", f"-{_fmt_money(e.total_sale_costs)}",
                               f"Broker commissions ({e.broker_commission_percent*100:.0f}%) and closing costs",
                               self.theme),
            generate_step_item(3, "Loan Payoff", f"-{_fmt_money(e.remaining_loan_balance)}",
                               f"Remaining mortgage balance after {e.hold_period_years} years",
                               self.theme),
            generate_step_item(4, "Pre-Tax Proceeds", _fmt_money(e.net_sale_proceeds),
                               "Before capital gains and depreciation recapture",
                               self.theme, is_last=True),
        ]

        p = self.palette

        return f"""
<div class="page">
  {self._page_header("Exit Strategy")}
  {self._section_header("DISPOSITION ANALYSIS", "Exit Strategy & Tax Implications")}

  {self._narrative_block(exit_narrative(self.data))}

  <div class="grid-2" style="margin-top:24px;">
    <div>
      {''.join(steps)}
    </div>
    <div>
      <div class="card">
        <h3 class="card-title">Tax Liability Breakdown</h3>
        <div class="detail-row">
          <span>Depreciation recapture (25%)</span>
          <span class="detail-value" style="color:{p['negative']}">{_fmt_money(e.depreciation_recapture_tax)}</span>
        </div>
        <div class="detail-row">
          <span>Capital gains tax ({e.capital_gains_tax_rate*100:.0f}%)</span>
          <span class="detail-value" style="color:{p['negative']}">{_fmt_money(e.capital_gains_tax)}</span>
        </div>
        <div class="detail-row" style="border-top:2px solid {p['border']};padding-top:10px;font-weight:700;">
          <span>Total tax on sale</span>
          <span class="detail-value" style="color:{p['negative']}">{_fmt_money(e.total_tax_on_sale)}</span>
        </div>
      </div>

      <div class="hero-card" style="margin-top:16px;">
        <div class="hero-card-label">After-Tax Proceeds</div>
        <div class="hero-card-value">{_fmt_money(e.after_tax_proceeds)}</div>
        <div class="hero-card-sub">{r.equity_multiple:.2f}x equity multiple on {_fmt_money(fin.down_payment)} invested</div>
      </div>

      <div class="callout-box" style="margin-top:16px;">
        <strong>1031 Exchange Opportunity:</strong> Consider deferring capital gains taxation
        by reinvesting proceeds into qualifying replacement properties within the IRS timeline.
      </div>
    </div>
  </div>

  {self._page_footer()}
</div>"""

    # -----------------------------------------------------------------------
    # Page 11: Sensitivity Analysis & Disclaimer
    # -----------------------------------------------------------------------

    def _page_sensitivity(self) -> str:
        s = self.data.sensitivity
        p = self.palette

        # Purchase price sensitivity table
        pp_rows = ""
        for scenario in (s.purchase_price or []):
            pp_rows += (
                f'<tr>'
                f'<td>{scenario.change_percent:+.0f}%</td>'
                f'<td class="money">{_fmt_money(scenario.absolute_value)}</td>'
                f'<td class="money">{_fmt_pct(scenario.irr)}</td>'
                f'<td class="money">{_fmt_pct(scenario.cash_on_cash)}</td>'
                f'</tr>'
            )

        rent_rows = ""
        for scenario in (s.rent or []):
            rent_rows += (
                f'<tr>'
                f'<td>{scenario.change_percent:+.0f}%</td>'
                f'<td class="money">{_fmt_money(scenario.absolute_value)}</td>'
                f'<td class="money">{_fmt_pct(scenario.irr)}</td>'
                f'<td class="money">{_fmt_pct(scenario.cash_on_cash)}</td>'
                f'</tr>'
            )

        pp_table = ""
        if pp_rows:
            pp_table = f"""
      <div class="card">
        <h3 class="card-title">Purchase Price Sensitivity</h3>
        <table class="sensitivity-table">
          <thead><tr><th>Change</th><th>Price</th><th>IRR</th><th>CoC</th></tr></thead>
          <tbody>{pp_rows}</tbody>
        </table>
      </div>"""

        rent_table = ""
        if rent_rows:
            rent_table = f"""
      <div class="card">
        <h3 class="card-title">Rent Sensitivity</h3>
        <table class="sensitivity-table">
          <thead><tr><th>Change</th><th>Rent</th><th>IRR</th><th>CoC</th></tr></thead>
          <tbody>{rent_rows}</tbody>
        </table>
      </div>"""

        return f"""
<div class="page">
  {self._page_header("Sensitivity & Sources")}
  {self._section_header("RISK ANALYSIS", "Sensitivity Analysis")}

  {self._narrative_block(sensitivity_narrative(self.data))}

  <div class="grid-2" style="margin-top:20px;">
    {pp_table}
    {rent_table}
  </div>

  <div class="card" style="margin-top:24px;">
    <h3 class="card-title">Data Sources</h3>
    <div class="detail-row">
      <span>RentCast Estimate</span>
      <span class="detail-value">{self.data.sources.rent_estimate_source}</span>
    </div>
    <div class="detail-row">
      <span>Property Value</span>
      <span class="detail-value">{self.data.sources.property_value_source}</span>
    </div>
    <div class="detail-row">
      <span>Tax Data</span>
      <span class="detail-value">{self.data.sources.tax_data_source}</span>
    </div>
    <div class="detail-row">
      <span>Market Data</span>
      <span class="detail-value">{self.data.sources.market_data_source}</span>
    </div>
    <div class="detail-row">
      <span>Data Freshness</span>
      <span class="detail-value">{self.data.sources.data_freshness}</span>
    </div>
  </div>

  <div class="disclaimer">
    This report is for informational purposes only and does not constitute financial,
    tax, or legal advice. Actual results may vary based on market conditions, property
    management, and other factors. All projections are based on the assumptions stated
    herein and should be independently verified. Consult with qualified professionals
    before making investment decisions.
  </div>

  <div class="final-footer">
    <div class="logo" style="font-size:18px;">DealGap<span class="logo-iq">IQ</span></div>
    <div class="footer-date">Report generated {self.now.strftime("%B %d, %Y at %I:%M %p")}</div>
  </div>
</div>"""

    # -----------------------------------------------------------------------
    # CSS
    # -----------------------------------------------------------------------

    def _build_css(self) -> str:
        p = self.palette
        is_dark = self.theme == "dark"

        # Theme-specific card shadows
        card_shadow = "0 1px 4px rgba(0,0,0,0.06)" if not is_dark else "0 2px 8px rgba(0,0,0,0.4)"
        hero_gradient = (
            f"linear-gradient(135deg, {p['brand']} 0%, #0284c7 100%)"
            if not is_dark else
            f"linear-gradient(135deg, #0C1220 0%, #1E293B 100%)"
        )
        hero_border = "none" if not is_dark else f"1px solid {p['brand']}40"

        return f"""
@page {{
    size: letter;
    margin: 0;
}}

@font-face {{
    font-family: 'Inter';
    src: url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf') format('truetype');
    font-weight: 400;
}}
@font-face {{
    font-family: 'Inter';
    src: url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf') format('truetype');
    font-weight: 600;
}}
@font-face {{
    font-family: 'Inter';
    src: url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf') format('truetype');
    font-weight: 700;
}}

* {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}}

body {{
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    color: {p["text_primary"]};
    background: {p["bg"]};
}}

/* ===== PAGE ===== */

.page {{
    width: 8.5in;
    min-height: 11in;
    padding: 0.6in 0.65in;
    page-break-after: always;
    position: relative;
    background: {p["bg"]};
}}

.page:last-child {{
    page-break-after: auto;
}}

/* ===== COVER PAGE ===== */

.cover-page {{
    display: flex;
    flex-direction: column;
    padding: 0;
}}

.cover-top-band {{
    height: 8px;
    background: linear-gradient(90deg, {p["brand"]}, {"#0284c7" if not is_dark else "#2DD4BF"});
}}

.cover-content {{
    flex: 1;
    padding: 60px 60px 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}}

.cover-logo {{
    font-size: 28px;
    font-weight: 700;
    color: {p["text_primary"]};
    margin-bottom: 40px;
}}

.cover-badge {{
    display: inline-block;
    padding: 5px 16px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: {p["brand"]};
    background: {p["brand"]}15;
    border: 1px solid {p["brand"]}30;
    margin-bottom: 16px;
    align-self: flex-start;
}}

.cover-address {{
    font-size: 36px;
    font-weight: 700;
    color: {p["text_primary"]};
    line-height: 1.1;
    margin-bottom: 8px;
}}

.cover-city {{
    font-size: 16px;
    color: {p["text_secondary"]};
    margin-bottom: 40px;
}}

.cover-stats {{
    display: flex;
    gap: 32px;
    margin-bottom: 40px;
    padding: 24px 0;
    border-top: 1px solid {p["border"]};
    border-bottom: 1px solid {p["border"]};
}}

.cover-stat {{
    text-align: center;
}}

.cover-stat-icon {{
    font-size: 20px;
    margin-bottom: 6px;
}}

.cover-stat-value {{
    font-size: 22px;
    font-weight: 700;
    color: {p["text_primary"]};
    font-variant-numeric: tabular-nums;
}}

.cover-stat-label {{
    font-size: 10px;
    font-weight: 600;
    color: {p["text_tertiary"]};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 2px;
}}

.cover-footer {{
    display: flex;
    justify-content: space-between;
    padding: 20px 60px;
    border-top: 1px solid {p["border"]};
}}

.cover-footer-label {{
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: {p["text_tertiary"]};
    display: block;
    margin-bottom: 2px;
}}

.cover-footer-value {{
    font-size: 11px;
    font-weight: 600;
    color: {p["text_secondary"]};
}}

/* ===== PAGE HEADER & FOOTER ===== */

.page-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 2px solid {p["brand"]};
    margin-bottom: 24px;
}}

.page-header-title {{
    font-size: 12px;
    font-weight: 700;
    color: {p["text_secondary"]};
    text-transform: uppercase;
    letter-spacing: 0.06em;
}}

.page-header-meta {{
    font-size: 10px;
    color: {p["text_tertiary"]};
}}

.logo {{
    font-size: 16px;
    font-weight: 700;
    color: {p["text_primary"]};
}}

.logo-iq {{
    color: {p["brand"]};
}}

.page-footer {{
    position: absolute;
    bottom: 0.5in;
    left: 0.65in;
    right: 0.65in;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid {p["border"]};
}}

.footer-brand {{
    font-size: 9px;
    font-weight: 600;
    color: {p["text_tertiary"]};
}}

.footer-date {{
    font-size: 9px;
    color: {p["text_tertiary"]};
}}

/* ===== SECTION HEADER ===== */

.section-header {{
    margin-bottom: 20px;
}}

.section-label {{
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: {p["brand"]};
    margin-bottom: 4px;
}}

.section-title {{
    font-size: 20px;
    font-weight: 700;
    color: {p["text_primary"]};
    margin-bottom: 8px;
}}

.section-rule {{
    width: 48px;
    height: 3px;
    background: {p["brand"]};
    border-radius: 2px;
}}

/* ===== GRIDS ===== */

.grid-2 {{
    display: flex;
    gap: 20px;
}}

.grid-2 > * {{
    flex: 1;
}}

.grid-3 {{
    display: flex;
    gap: 16px;
}}

.grid-3 > * {{
    flex: 1;
}}

.grid-4 {{
    display: flex;
    gap: 14px;
}}

.grid-4 > * {{
    flex: 1;
}}

.grid-2-metrics {{
    display: flex;
    gap: 14px;
}}

.grid-2-metrics > * {{
    flex: 1;
}}

/* ===== CARDS ===== */

.card {{
    background: {p["card_bg"]};
    border: 1px solid {p["border"]};
    border-radius: 10px;
    padding: 18px;
}}

.card-title {{
    font-size: 12px;
    font-weight: 700;
    color: {p["text_primary"]};
    margin-bottom: 12px;
}}

.card-text {{
    font-size: 11px;
    color: {p["text_secondary"]};
    line-height: 1.55;
}}

/* ===== INFO CARD ===== */

.info-card {{
    background: {p["card_bg"]};
    border: 1px solid {p["border"]};
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    border-top: 3px solid {p["brand"]};
}}

.info-card-icon {{
    font-size: 18px;
    margin-bottom: 6px;
}}

.info-card-label {{
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: {p["text_tertiary"]};
    margin-bottom: 4px;
}}

.info-card-value {{
    font-size: 18px;
    font-weight: 700;
    color: {p["text_primary"]};
    font-variant-numeric: tabular-nums;
}}

.info-card-sub {{
    font-size: 10px;
    color: {p["text_tertiary"]};
    margin-top: 2px;
}}

/* ===== HIGHLIGHT CARD ===== */

.highlight-card {{
    border-top: 3px solid {p["brand"]};
}}

.highlight-card-icon {{
    font-size: 22px;
    margin-bottom: 8px;
}}

/* ===== DETAIL ROWS ===== */

.detail-row {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 0;
    border-bottom: 1px solid {p["border"]};
    font-size: 11px;
    color: {p["text_secondary"]};
}}

.detail-row:last-child {{
    border-bottom: none;
}}

.detail-value {{
    font-weight: 600;
    color: {p["text_primary"]};
    font-variant-numeric: tabular-nums;
}}

/* ===== HERO CARD ===== */

.hero-card {{
    background: {hero_gradient};
    border: {hero_border};
    border-radius: 12px;
    padding: 24px;
    text-align: center;
}}

.hero-card-label {{
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: {"rgba(255,255,255,0.8)" if not is_dark else p["text_tertiary"]};
    margin-bottom: 6px;
}}

.hero-card-value {{
    font-size: 32px;
    font-weight: 700;
    color: {"white" if not is_dark else p["brand"]};
    font-variant-numeric: tabular-nums;
    margin-bottom: 6px;
}}

.hero-card-sub {{
    font-size: 11px;
    color: {"rgba(255,255,255,0.7)" if not is_dark else p["text_secondary"]};
}}

/* ===== NARRATIVE ===== */

.narrative {{
    font-size: 11px;
    line-height: 1.65;
    color: {p["text_secondary"]};
    margin-bottom: 4px;
}}

/* ===== METRICS BAR ===== */

.metrics-bar {{
    display: flex;
    background: {hero_gradient};
    border: {hero_border};
    border-radius: 10px;
    padding: 16px;
}}

.metrics-bar-item {{
    flex: 1;
    text-align: center;
}}

.metrics-bar-label {{
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: {"rgba(255,255,255,0.7)" if not is_dark else p["text_tertiary"]};
    margin-bottom: 4px;
}}

.metrics-bar-value {{
    font-size: 16px;
    font-weight: 700;
    color: {"white" if not is_dark else p["text_primary"]};
    font-variant-numeric: tabular-nums;
}}

/* ===== VERDICT ===== */

.verdict-label {{
    font-size: 13px;
    font-weight: 700;
    color: {p["text_primary"]};
    text-align: center;
    padding: 6px 20px;
    border-radius: 100px;
    background: {p["card_bg"]};
    border: 1px solid {p["border"]};
}}

/* ===== GAUGE ROWS ===== */

.gauge-row {{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid {p["border"]};
}}

.gauge-row:last-child {{
    border-bottom: none;
}}

.gauge-label {{
    font-size: 10px;
    font-weight: 600;
    color: {p["text_secondary"]};
    min-width: 75px;
}}

.gauge-value {{
    font-size: 11px;
    font-weight: 700;
    color: {p["text_primary"]};
    font-variant-numeric: tabular-nums;
    min-width: 45px;
    text-align: right;
}}

/* ===== TABLES ===== */

.projection-table, .sensitivity-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
}}

.projection-table th, .sensitivity-table th {{
    background: {p["brand_dark"] if not is_dark else "#101828"};
    color: {"white" if not is_dark else p["text_secondary"]};
    padding: 8px 6px;
    text-align: left;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}}

.projection-table td, .sensitivity-table td {{
    padding: 6px;
    border-bottom: 1px solid {p["border"]};
    font-variant-numeric: tabular-nums;
    color: {p["text_primary"]};
}}

.projection-table tr:nth-child(even), .sensitivity-table tr:nth-child(even) {{
    background: {p["card_bg"]};
}}

td.money {{
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}}

.table-note {{
    font-size: 9px;
    color: {p["text_tertiary"]};
    margin-top: 8px;
    font-style: italic;
}}

/* ===== CALLOUT BOX ===== */

.callout-box {{
    background: {p["brand"]}10;
    border: 1px solid {p["brand"]}30;
    border-left: 3px solid {p["brand"]};
    border-radius: 8px;
    padding: 14px 16px;
    font-size: 11px;
    color: {p["text_secondary"]};
    line-height: 1.55;
}}

.callout-box strong {{
    color: {p["text_primary"]};
}}

/* ===== DISCLAIMER ===== */

.disclaimer {{
    margin-top: 24px;
    padding: 16px;
    background: {p["card_bg"]};
    border: 1px solid {p["border"]};
    border-radius: 8px;
    font-size: 9px;
    color: {p["text_tertiary"]};
    line-height: 1.5;
}}

.final-footer {{
    margin-top: 24px;
    text-align: center;
}}

.final-footer .footer-date {{
    margin-top: 6px;
}}
"""
