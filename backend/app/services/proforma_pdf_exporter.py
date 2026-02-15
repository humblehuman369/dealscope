"""
Financial Proforma PDF Exporter
Generates professional PDF reports using HTML/CSS templates
"""
from typing import Optional
from datetime import datetime
from io import BytesIO
import logging

from app.schemas.proforma import FinancialProforma

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy WeasyPrint import — loaded on first PDF request, not at app startup.
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
        logger.info("WeasyPrint loaded successfully (ProformaPDFExporter)")
        return HTML, CSS
    except Exception as exc:
        WEASYPRINT_AVAILABLE = False
        logger.error(
            "WeasyPrint import FAILED (ProformaPDFExporter) — "
            f"Error: {type(exc).__name__}: {exc}"
        )
        raise


class ProformaPDFExporter:
    """Generate professional PDF proforma reports."""
    
    # DealGapIQ brand colors
    BRAND_PRIMARY = "#0ea5e9"  # Sky blue
    BRAND_DARK = "#1e3a5f"     # Navy
    HIGHLIGHT_GREEN = "#22c55e"
    HIGHLIGHT_RED = "#ef4444"
    
    def __init__(self, proforma: FinancialProforma):
        self.data = proforma
        
    def generate(self) -> BytesIO:
        """Generate PDF report."""
        HTML, CSS = _ensure_weasyprint()
        
        html_content = self._generate_html()
        css_content = self._generate_css()
        
        # Generate PDF
        html = HTML(string=html_content)
        css = CSS(string=css_content)
        
        buffer = BytesIO()
        html.write_pdf(buffer, stylesheets=[css])
        buffer.seek(0)
        
        return buffer
    
    def _generate_html(self) -> str:
        """Generate HTML content for the PDF."""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Financial Proforma - {self.data.property_address}</title>
</head>
<body>
    {self._header_section()}
    {self._property_summary_section()}
    {self._acquisition_financing_section()}
    {self._income_expense_section()}
    {self._key_metrics_section()}
    {self._projections_section()}
    {self._exit_analysis_section()}
    {self._returns_summary_section()}
    {self._sensitivity_section()}
    {self._footer_section()}
</body>
</html>
"""
    
    def _header_section(self) -> str:
        """Generate header with logo and property info."""
        return f"""
<div class="header">
    <div class="logo">
        <span class="logo-text">DealGap<span class="logo-iq">IQ</span></span>
    </div>
    <div class="header-title">
        <h1>Financial Proforma</h1>
        <p class="subtitle">{self.data.property_address}</p>
    </div>
    <div class="header-meta">
        <p>Generated: {datetime.now().strftime('%B %d, %Y')}</p>
        <p>Strategy: {self.data.strategy_type.upper()}</p>
    </div>
</div>
"""
    
    def _property_summary_section(self) -> str:
        """Generate property summary section."""
        prop = self.data.property
        return f"""
<div class="section">
    <h2>Property Summary</h2>
    <div class="grid-2">
        <div class="info-box">
            <h3>Location</h3>
            <p class="address">{prop.address}</p>
            <p>{prop.city}, {prop.state} {prop.zip}</p>
        </div>
        <div class="info-box">
            <h3>Details</h3>
            <table class="details-table">
                <tr><td>Type:</td><td>{prop.property_type}</td></tr>
                <tr><td>Beds/Baths:</td><td>{prop.bedrooms} / {prop.bathrooms}</td></tr>
                <tr><td>Sq Ft:</td><td>{prop.square_feet:,}</td></tr>
                <tr><td>Year Built:</td><td>{prop.year_built}</td></tr>
            </table>
        </div>
    </div>
</div>
"""
    
    def _acquisition_financing_section(self) -> str:
        """Generate acquisition and financing section."""
        acq = self.data.acquisition
        fin = self.data.financing
        return f"""
<div class="section">
    <h2>Acquisition & Financing</h2>
    <div class="grid-2">
        <div class="info-box">
            <h3>Acquisition Costs</h3>
            <table class="financial-table">
                <tr><td>Purchase Price:</td><td class="money">${acq.purchase_price:,.0f}</td></tr>
                <tr><td>Closing Costs:</td><td class="money">${acq.closing_costs:,.0f}</td></tr>
                <tr><td>Rehab Costs:</td><td class="money">${acq.rehab_costs:,.0f}</td></tr>
                <tr class="total"><td>Total:</td><td class="money">${acq.total_acquisition_cost:,.0f}</td></tr>
            </table>
        </div>
        <div class="info-box">
            <h3>Financing Terms</h3>
            <table class="financial-table">
                <tr><td>Down Payment:</td><td class="money">${fin.down_payment:,.0f} ({fin.down_payment_percent:.0f}%)</td></tr>
                <tr><td>Loan Amount:</td><td class="money">${fin.loan_amount:,.0f}</td></tr>
                <tr><td>Interest Rate:</td><td>{fin.interest_rate:.2f}%</td></tr>
                <tr><td>Loan Term:</td><td>{fin.loan_term_years} years</td></tr>
                <tr class="total"><td>Monthly P&I:</td><td class="money">${fin.monthly_payment:,.0f}</td></tr>
            </table>
        </div>
    </div>
</div>
"""
    
    def _income_expense_section(self) -> str:
        """Generate income and expense section."""
        inc = self.data.income
        exp = self.data.expenses
        metrics = self.data.metrics
        return f"""
<div class="section">
    <h2>Year 1 Income Statement</h2>
    <div class="grid-2">
        <div class="info-box">
            <h3>Income</h3>
            <table class="financial-table">
                <tr><td>Gross Rent:</td><td class="money">${inc.annual_gross_rent:,.0f}</td></tr>
                <tr><td>Vacancy ({inc.vacancy_percent:.0f}%):</td><td class="money negative">-${inc.vacancy_allowance:,.0f}</td></tr>
                <tr class="total"><td>Effective Gross Income:</td><td class="money">${inc.effective_gross_income:,.0f}</td></tr>
            </table>
        </div>
        <div class="info-box">
            <h3>Operating Expenses</h3>
            <table class="financial-table">
                <tr><td>Property Taxes:</td><td class="money">${exp.property_taxes:,.0f}</td></tr>
                <tr><td>Insurance:</td><td class="money">${exp.insurance:,.0f}</td></tr>
                <tr><td>Management:</td><td class="money">${exp.management:,.0f}</td></tr>
                <tr><td>Maintenance:</td><td class="money">${exp.maintenance:,.0f}</td></tr>
                <tr><td>Utilities:</td><td class="money">${exp.utilities:,.0f}</td></tr>
                <tr><td>CapEx Reserve:</td><td class="money">${exp.cap_ex_reserve:,.0f}</td></tr>
                <tr class="total"><td>Total OpEx:</td><td class="money">${exp.total_operating_expenses:,.0f}</td></tr>
            </table>
        </div>
    </div>
    <div class="highlight-box">
        <div class="metric-row">
            <div class="metric">
                <span class="metric-label">NOI</span>
                <span class="metric-value">${metrics.net_operating_income:,.0f}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Annual Cash Flow</span>
                <span class="metric-value {'positive' if metrics.annual_cash_flow >= 0 else 'negative'}">${metrics.annual_cash_flow:,.0f}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Monthly Cash Flow</span>
                <span class="metric-value {'positive' if metrics.monthly_cash_flow >= 0 else 'negative'}">${metrics.monthly_cash_flow:,.0f}</span>
            </div>
        </div>
    </div>
</div>
"""
    
    def _key_metrics_section(self) -> str:
        """Generate key metrics section."""
        m = self.data.metrics
        return f"""
<div class="section">
    <h2>Key Investment Metrics</h2>
    <div class="metrics-grid">
        <div class="metric-card">
            <span class="metric-name">Cap Rate</span>
            <span class="metric-big-value">{m.cap_rate:.2f}%</span>
        </div>
        <div class="metric-card">
            <span class="metric-name">Cash-on-Cash</span>
            <span class="metric-big-value {'positive' if m.cash_on_cash_return >= 0 else 'negative'}">{m.cash_on_cash_return:.2f}%</span>
        </div>
        <div class="metric-card">
            <span class="metric-name">DSCR</span>
            <span class="metric-big-value">{m.dscr:.2f}</span>
        </div>
        <div class="metric-card">
            <span class="metric-name">GRM</span>
            <span class="metric-big-value">{m.gross_rent_multiplier:.1f}</span>
        </div>
        <div class="metric-card">
            <span class="metric-name">1% Rule</span>
            <span class="metric-big-value">{m.one_percent_rule:.2f}%</span>
        </div>
        <div class="metric-card">
            <span class="metric-name">Break-Even Occ.</span>
            <span class="metric-big-value">{m.break_even_occupancy:.1f}%</span>
        </div>
    </div>
</div>
"""
    
    def _projections_section(self) -> str:
        """Generate multi-year projections table."""
        proj = self.data.projections
        years = min(5, len(proj.annual_projections))  # Show first 5 years
        
        rows = ""
        for i in range(years):
            p = proj.annual_projections[i]
            rows += f"""
            <tr>
                <td>Year {i + 1}</td>
                <td class="money">${p.gross_rental_income:,.0f}</td>
                <td class="money">${p.operating_expenses:,.0f}</td>
                <td class="money">${p.net_operating_income:,.0f}</td>
                <td class="money">${p.total_debt_service:,.0f}</td>
                <td class="money {'positive' if p.after_tax_cash_flow >= 0 else 'negative'}">${p.after_tax_cash_flow:,.0f}</td>
                <td class="money">${proj.property_values[i]:,.0f}</td>
                <td class="money">${proj.equity_positions[i]:,.0f}</td>
            </tr>
            """
        
        return f"""
<div class="section page-break">
    <h2>{proj.hold_period_years}-Year Cash Flow Projection</h2>
    <table class="projection-table">
        <thead>
            <tr>
                <th>Year</th>
                <th>Gross Rent</th>
                <th>OpEx</th>
                <th>NOI</th>
                <th>Debt Svc</th>
                <th>After-Tax CF</th>
                <th>Property Value</th>
                <th>Equity</th>
            </tr>
        </thead>
        <tbody>
            {rows}
        </tbody>
    </table>
    <p class="table-note">Growth assumptions: Rent {proj.rent_growth_rate:.1f}%/yr, Expenses {proj.expense_growth_rate:.1f}%/yr, Appreciation {proj.appreciation_rate:.1f}%/yr</p>
</div>
"""
    
    def _exit_analysis_section(self) -> str:
        """Generate exit analysis section."""
        e = self.data.exit
        return f"""
<div class="section">
    <h2>Exit Analysis (Year {e.hold_period_years})</h2>
    <div class="grid-2">
        <div class="info-box">
            <h3>Sale Proceeds</h3>
            <table class="financial-table">
                <tr><td>Projected Sale Price:</td><td class="money">${e.projected_sale_price:,.0f}</td></tr>
                <tr><td>Broker Commission:</td><td class="money negative">-${e.broker_commission:,.0f}</td></tr>
                <tr><td>Closing Costs:</td><td class="money negative">-${e.closing_costs:,.0f}</td></tr>
                <tr><td>Loan Payoff:</td><td class="money negative">-${e.remaining_loan_balance:,.0f}</td></tr>
                <tr class="total"><td>Net Proceeds:</td><td class="money">${e.net_sale_proceeds:,.0f}</td></tr>
            </table>
        </div>
        <div class="info-box">
            <h3>Tax on Sale</h3>
            <table class="financial-table">
                <tr><td>Total Gain:</td><td class="money">${e.total_gain:,.0f}</td></tr>
                <tr><td>Depreciation Recapture:</td><td class="money">${e.depreciation_recapture:,.0f}</td></tr>
                <tr><td>Recapture Tax (25%):</td><td class="money negative">-${e.depreciation_recapture_tax:,.0f}</td></tr>
                <tr><td>Capital Gains Tax:</td><td class="money negative">-${e.capital_gains_tax:,.0f}</td></tr>
                <tr class="total"><td>After-Tax Proceeds:</td><td class="money highlight">${e.after_tax_proceeds:,.0f}</td></tr>
            </table>
        </div>
    </div>
</div>
"""
    
    def _returns_summary_section(self) -> str:
        """Generate investment returns summary."""
        r = self.data.returns
        return f"""
<div class="section">
    <h2>Investment Returns Summary</h2>
    <div class="returns-grid">
        <div class="return-card primary">
            <span class="return-label">Internal Rate of Return (IRR)</span>
            <span class="return-value">{r.irr:.1f}%</span>
        </div>
        <div class="return-card">
            <span class="return-label">Equity Multiple</span>
            <span class="return-value">{r.equity_multiple:.2f}x</span>
        </div>
        <div class="return-card">
            <span class="return-label">Total Cash Flows</span>
            <span class="return-value">${r.total_cash_flows:,.0f}</span>
        </div>
        <div class="return-card">
            <span class="return-label">Total Distributions</span>
            <span class="return-value">${r.total_distributions:,.0f}</span>
        </div>
        <div class="return-card">
            <span class="return-label">Average Annual Return</span>
            <span class="return-value">{r.average_annual_return:.1f}%</span>
        </div>
        <div class="return-card">
            <span class="return-label">Payback Period</span>
            <span class="return-value">{r.payback_period_months or 'N/A'} mo</span>
        </div>
    </div>
</div>
"""
    
    def _sensitivity_section(self) -> str:
        """Generate sensitivity analysis section."""
        s = self.data.sensitivity
        
        if not s.purchase_price:
            return ""
        
        # Build purchase price sensitivity table
        pp_rows = ""
        for scenario in s.purchase_price:
            pp_rows += f"""
            <tr>
                <td>{scenario.change_percent:+.0f}%</td>
                <td class="money">${scenario.absolute_value:,.0f}</td>
                <td>{scenario.irr:.1f}%</td>
                <td>{scenario.cash_on_cash:.1f}%</td>
            </tr>
            """
        
        # Build rent sensitivity table
        rent_rows = ""
        for scenario in s.rent:
            rent_rows += f"""
            <tr>
                <td>{scenario.change_percent:+.0f}%</td>
                <td class="money">${scenario.absolute_value:,.0f}</td>
                <td>{scenario.irr:.1f}%</td>
                <td>{scenario.cash_on_cash:.1f}%</td>
            </tr>
            """
        
        return f"""
<div class="section page-break">
    <h2>Sensitivity Analysis</h2>
    <div class="grid-2">
        <div class="info-box">
            <h3>Purchase Price Sensitivity</h3>
            <table class="sensitivity-table">
                <thead>
                    <tr><th>Change</th><th>Price</th><th>IRR</th><th>CoC</th></tr>
                </thead>
                <tbody>
                    {pp_rows}
                </tbody>
            </table>
        </div>
        <div class="info-box">
            <h3>Rent Sensitivity</h3>
            <table class="sensitivity-table">
                <thead>
                    <tr><th>Change</th><th>Rent</th><th>IRR</th><th>CoC</th></tr>
                </thead>
                <tbody>
                    {rent_rows}
                </tbody>
            </table>
        </div>
    </div>
</div>
"""
    
    def _footer_section(self) -> str:
        """Generate footer with disclaimers."""
        return f"""
<div class="footer">
    <p class="disclaimer">
        This proforma is for informational purposes only and does not constitute financial, tax, or legal advice.
        Actual results may vary. Consult with qualified professionals before making investment decisions.
    </p>
    <p class="branding">
        Generated by DealGapIQ | {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
    </p>
</div>
"""
    
    def _generate_css(self) -> str:
        """Generate CSS for the PDF."""
        return f"""
@page {{
    size: letter;
    margin: 0.75in;
}}

* {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}}

body {{
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #1a1a1a;
}}

.header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid {self.BRAND_PRIMARY};
    padding-bottom: 15px;
    margin-bottom: 20px;
}}

.logo-text {{
    font-size: 24pt;
    font-weight: bold;
    color: {self.BRAND_DARK};
}}

.logo-iq {{
    color: {self.BRAND_PRIMARY};
}}

.header-title h1 {{
    font-size: 18pt;
    color: {self.BRAND_DARK};
    margin-bottom: 5px;
}}

.header-title .subtitle {{
    font-size: 11pt;
    color: #666;
}}

.header-meta {{
    text-align: right;
    font-size: 9pt;
    color: #666;
}}

.section {{
    margin-bottom: 25px;
}}

.page-break {{
    page-break-before: always;
}}

h2 {{
    font-size: 14pt;
    color: {self.BRAND_DARK};
    border-bottom: 2px solid {self.BRAND_PRIMARY};
    padding-bottom: 5px;
    margin-bottom: 15px;
}}

h3 {{
    font-size: 11pt;
    color: {self.BRAND_DARK};
    margin-bottom: 10px;
}}

.grid-2 {{
    display: flex;
    gap: 20px;
}}

.grid-2 > div {{
    flex: 1;
}}

.info-box {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
}}

.address {{
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 5px;
}}

.details-table, .financial-table {{
    width: 100%;
    border-collapse: collapse;
}}

.details-table td, .financial-table td {{
    padding: 4px 0;
}}

.details-table td:first-child, .financial-table td:first-child {{
    color: #666;
}}

.details-table td:last-child, .financial-table td:last-child {{
    text-align: right;
    font-weight: 500;
}}

.financial-table .total td {{
    border-top: 1px solid #ccc;
    font-weight: bold;
    padding-top: 8px;
}}

.money {{
    font-family: 'Courier New', monospace;
}}

.positive {{
    color: {self.HIGHLIGHT_GREEN};
}}

.negative {{
    color: {self.HIGHLIGHT_RED};
}}

.highlight {{
    color: {self.BRAND_PRIMARY};
    font-weight: bold;
}}

.highlight-box {{
    background: linear-gradient(135deg, {self.BRAND_DARK} 0%, #2d5a87 100%);
    border-radius: 8px;
    padding: 20px;
    margin-top: 15px;
}}

.metric-row {{
    display: flex;
    justify-content: space-around;
}}

.metric {{
    text-align: center;
    color: white;
}}

.metric-label {{
    display: block;
    font-size: 9pt;
    opacity: 0.8;
    margin-bottom: 5px;
}}

.metric-value {{
    font-size: 18pt;
    font-weight: bold;
}}

.metrics-grid {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}}

.metric-card {{
    flex: 1 1 30%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
    text-align: center;
}}

.metric-name {{
    display: block;
    font-size: 9pt;
    color: #666;
    margin-bottom: 5px;
}}

.metric-big-value {{
    font-size: 16pt;
    font-weight: bold;
    color: {self.BRAND_DARK};
}}

.projection-table, .sensitivity-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
}}

.projection-table th, .sensitivity-table th {{
    background: {self.BRAND_DARK};
    color: white;
    padding: 8px 5px;
    text-align: left;
}}

.projection-table td, .sensitivity-table td {{
    padding: 6px 5px;
    border-bottom: 1px solid #e2e8f0;
}}

.projection-table tr:nth-child(even), .sensitivity-table tr:nth-child(even) {{
    background: #f8fafc;
}}

.table-note {{
    font-size: 8pt;
    color: #666;
    margin-top: 10px;
    font-style: italic;
}}

.returns-grid {{
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
}}

.return-card {{
    flex: 1 1 30%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
    text-align: center;
}}

.return-card.primary {{
    background: linear-gradient(135deg, {self.BRAND_PRIMARY} 0%, #0284c7 100%);
    color: white;
}}

.return-card.primary .return-label {{
    color: rgba(255,255,255,0.9);
}}

.return-card.primary .return-value {{
    color: white;
}}

.return-label {{
    display: block;
    font-size: 9pt;
    color: #666;
    margin-bottom: 5px;
}}

.return-value {{
    font-size: 16pt;
    font-weight: bold;
    color: {self.BRAND_DARK};
}}

.footer {{
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
}}

.disclaimer {{
    font-size: 8pt;
    color: #999;
    margin-bottom: 10px;
}}

.branding {{
    font-size: 9pt;
    color: {self.BRAND_DARK};
    font-weight: 500;
}}
"""
