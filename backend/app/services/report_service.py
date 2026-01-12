"""
Report Generation Service for creating PDF and Excel property reports.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from io import BytesIO
import json

from openpyxl import Workbook
from openpyxl.styles import Font, Fill, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

logger = logging.getLogger(__name__)


class ReportService:
    """Service for generating property analysis reports."""
    
    # Brand colors
    BRAND_BLUE = "0465F2"
    BRAND_TEAL = "00E5FF"
    NAVY = "07172E"
    
    # Strategy colors
    STRATEGY_COLORS = {
        "ltr": "0465F2",      # Blue
        "str": "8B5CF6",      # Purple
        "brrrr": "F97316",    # Orange
        "flip": "EC4899",     # Pink
        "house_hack": "22C55E",  # Green
        "wholesale": "22D3EE",   # Cyan
    }
    
    def generate_excel_report(
        self,
        property_data: Dict[str, Any],
        analytics_data: Dict[str, Any],
        assumptions: Optional[Dict[str, Any]] = None,
        include_sensitivity: bool = False,
    ) -> bytes:
        """
        Generate a comprehensive Excel report for a property.
        
        Args:
            property_data: Property details (address, beds, baths, etc.)
            analytics_data: Calculated analytics for all strategies
            assumptions: Assumptions used in calculations
            include_sensitivity: Whether to include sensitivity analysis
        
        Returns:
            Excel file as bytes
        """
        wb = Workbook()
        
        # Remove default sheet
        wb.remove(wb.active)
        
        # Create sheets
        self._create_summary_sheet(wb, property_data, analytics_data)
        self._create_ltr_sheet(wb, property_data, analytics_data.get("ltr"))
        self._create_str_sheet(wb, property_data, analytics_data.get("str"))
        self._create_brrrr_sheet(wb, property_data, analytics_data.get("brrrr"))
        self._create_flip_sheet(wb, property_data, analytics_data.get("flip"))
        self._create_house_hack_sheet(wb, property_data, analytics_data.get("house_hack"))
        self._create_wholesale_sheet(wb, property_data, analytics_data.get("wholesale"))
        
        if assumptions:
            self._create_assumptions_sheet(wb, assumptions)
        
        # Save to bytes
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output.getvalue()
    
    def _create_summary_sheet(
        self, 
        wb: Workbook, 
        property_data: Dict, 
        analytics: Dict
    ):
        """Create the summary comparison sheet."""
        ws = wb.create_sheet("Summary", 0)
        
        # Styles
        header_font = Font(bold=True, size=14, color="FFFFFF")
        header_fill = PatternFill(start_color=self.BRAND_BLUE, end_color=self.BRAND_BLUE, fill_type="solid")
        subheader_font = Font(bold=True, size=11)
        money_font = Font(bold=True, size=12)
        
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Title
        ws.merge_cells('A1:G1')
        ws['A1'] = "InvestIQ Property Analysis Report"
        ws['A1'].font = Font(bold=True, size=18, color=self.BRAND_BLUE)
        ws['A1'].alignment = Alignment(horizontal='center')
        
        # Property Info
        ws['A3'] = "Property Address:"
        ws['A3'].font = Font(bold=True)
        address = property_data.get("address", {})
        ws['B3'] = address.get("full_address", "N/A")
        
        ws['A4'] = "Generated:"
        ws['A4'].font = Font(bold=True)
        ws['B4'] = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        
        # Property Details
        details = property_data.get("details", {})
        ws['A6'] = "Property Details"
        ws['A6'].font = Font(bold=True, size=12)
        ws.merge_cells('A6:B6')
        
        row = 7
        for label, key in [
            ("Property Type", "property_type"),
            ("Bedrooms", "bedrooms"),
            ("Bathrooms", "bathrooms"),
            ("Square Footage", "square_footage"),
            ("Year Built", "year_built"),
            ("Lot Size (sqft)", "lot_size_sqft"),
        ]:
            ws[f'A{row}'] = label
            value = details.get(key, "N/A")
            if key == "square_footage" and value != "N/A":
                value = f"{value:,}"
            ws[f'B{row}'] = value
            row += 1
        
        # Valuation
        valuations = property_data.get("valuations", {})
        ws['A14'] = "Valuations"
        ws['A14'].font = Font(bold=True, size=12)
        ws.merge_cells('A14:B14')
        
        row = 15
        for label, key in [
            ("Current Value (AVM)", "current_value_avm"),
            ("Zestimate", "zestimate"),
            ("Tax Assessment", "tax_assessment"),
        ]:
            ws[f'A{row}'] = label
            value = valuations.get(key)
            ws[f'B{row}'] = f"${value:,.0f}" if value else "N/A"
            row += 1
        
        # Strategy Comparison Header
        ws['A20'] = "Strategy Comparison"
        ws['A20'].font = Font(bold=True, size=14)
        ws.merge_cells('A20:G20')
        
        # Column headers
        headers = ["Strategy", "Cash Required", "Monthly Cash Flow", "Annual Cash Flow", "CoC Return", "Key Metric", "Recommendation"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=21, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center')
            cell.border = thin_border
        
        # Strategy data
        strategies = [
            ("Long-Term Rental", "ltr", "cap_rate", "Cap Rate"),
            ("Short-Term Rental", "str", "break_even_occupancy", "Break-Even Occ."),
            ("BRRRR", "brrrr", "cash_left_in_deal", "Cash Left"),
            ("Fix & Flip", "flip", "net_profit_before_tax", "Net Profit"),
            ("House Hack", "house_hack", "savings_vs_renting_a", "Monthly Savings"),
            ("Wholesale", "wholesale", "assignment_fee", "Assignment Fee"),
        ]
        
        row = 22
        for name, key, metric_key, metric_label in strategies:
            data = analytics.get(key, {})
            if not data:
                continue
                
            ws.cell(row=row, column=1, value=name).border = thin_border
            
            # Cash Required
            cash_req = data.get("total_cash_required") or data.get("total_cash_invested") or data.get("total_cash_at_risk", 0)
            ws.cell(row=row, column=2, value=f"${cash_req:,.0f}" if cash_req else "N/A").border = thin_border
            
            # Monthly Cash Flow
            monthly_cf = data.get("monthly_cash_flow", 0)
            cell = ws.cell(row=row, column=3, value=f"${monthly_cf:,.0f}" if monthly_cf else "N/A")
            cell.border = thin_border
            if monthly_cf and monthly_cf > 0:
                cell.font = Font(color="22C55E", bold=True)
            elif monthly_cf and monthly_cf < 0:
                cell.font = Font(color="EF4444", bold=True)
            
            # Annual Cash Flow
            annual_cf = data.get("annual_cash_flow", 0)
            ws.cell(row=row, column=4, value=f"${annual_cf:,.0f}" if annual_cf else "N/A").border = thin_border
            
            # CoC Return
            coc = data.get("cash_on_cash_return", 0)
            ws.cell(row=row, column=5, value=f"{coc*100:.1f}%" if coc else "N/A").border = thin_border
            
            # Key Metric
            metric_value = data.get(metric_key)
            if metric_key in ["cap_rate", "break_even_occupancy"]:
                display = f"{metric_value*100:.1f}%" if metric_value else "N/A"
            elif metric_key in ["net_profit_before_tax", "cash_left_in_deal", "assignment_fee", "savings_vs_renting_a"]:
                display = f"${metric_value:,.0f}" if metric_value else "N/A"
            else:
                display = str(metric_value) if metric_value else "N/A"
            ws.cell(row=row, column=6, value=display).border = thin_border
            
            # Recommendation
            rec = self._get_recommendation(key, data)
            ws.cell(row=row, column=7, value=rec).border = thin_border
            
            row += 1
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 18
        ws.column_dimensions['C'].width = 18
        ws.column_dimensions['D'].width = 16
        ws.column_dimensions['E'].width = 14
        ws.column_dimensions['F'].width = 16
        ws.column_dimensions['G'].width = 20
    
    def _get_recommendation(self, strategy: str, data: Dict) -> str:
        """Get recommendation emoji and text for a strategy."""
        if strategy == "ltr":
            coc = data.get("cash_on_cash_return", 0)
            if coc >= 0.08:
                return "✅ Strong"
            elif coc >= 0.05:
                return "⚠️ Moderate"
            else:
                return "❌ Weak"
        elif strategy == "str":
            occ = data.get("break_even_occupancy", 1)
            if occ <= 0.5:
                return "✅ Strong"
            elif occ <= 0.7:
                return "⚠️ Moderate"
            else:
                return "❌ Risky"
        elif strategy == "brrrr":
            infinite = data.get("infinite_roi_achieved", False)
            if infinite:
                return "✅ Infinite ROI"
            cash_left = data.get("cash_left_in_deal", 0)
            if cash_left <= 10000:
                return "⚠️ Low Cash"
            else:
                return "❌ High Cash"
        elif strategy == "flip":
            meets_70 = data.get("meets_70_rule", False)
            if meets_70:
                return "✅ Meets 70%"
            else:
                return "⚠️ Above 70%"
        elif strategy == "house_hack":
            savings = data.get("savings_vs_renting_a", 0)
            if savings >= 500:
                return "✅ Great Savings"
            elif savings >= 0:
                return "⚠️ Some Savings"
            else:
                return "❌ Negative"
        elif strategy == "wholesale":
            viability = data.get("deal_viability", "")
            if "good" in viability.lower():
                return "✅ Good Deal"
            elif "marginal" in viability.lower():
                return "⚠️ Marginal"
            else:
                return "❌ Poor"
        return "—"
    
    def _create_ltr_sheet(self, wb: Workbook, property_data: Dict, ltr_data: Optional[Dict]):
        """Create Long-Term Rental analysis sheet."""
        if not ltr_data:
            return
            
        ws = wb.create_sheet("Long-Term Rental")
        self._create_strategy_sheet(ws, "Long-Term Rental", self.STRATEGY_COLORS["ltr"], ltr_data, [
            ("Monthly Gross Rent", "monthly_gross_rent", "currency"),
            ("Vacancy Loss", "vacancy_loss", "currency"),
            ("Net Operating Income", "noi", "currency"),
            ("Monthly Mortgage (P&I)", "monthly_mortgage", "currency"),
            ("Monthly Cash Flow", "monthly_cash_flow", "currency"),
            ("Annual Cash Flow", "annual_cash_flow", "currency"),
            ("Cash-on-Cash Return", "cash_on_cash_return", "percent"),
            ("Cap Rate", "cap_rate", "percent"),
            ("DSCR", "dscr", "number"),
            ("Total Cash Required", "total_cash_required", "currency"),
            ("1% Rule", "one_percent_rule", "percent"),
        ])
    
    def _create_str_sheet(self, wb: Workbook, property_data: Dict, str_data: Optional[Dict]):
        """Create Short-Term Rental analysis sheet."""
        if not str_data:
            return
            
        ws = wb.create_sheet("Short-Term Rental")
        self._create_strategy_sheet(ws, "Short-Term Rental", self.STRATEGY_COLORS["str"], str_data, [
            ("Average Daily Rate", "average_daily_rate", "currency"),
            ("Occupancy Rate", "occupancy_rate", "percent"),
            ("Gross Annual Revenue", "gross_annual_revenue", "currency"),
            ("Net Operating Income", "noi", "currency"),
            ("Monthly Cash Flow", "monthly_cash_flow", "currency"),
            ("Annual Cash Flow", "annual_cash_flow", "currency"),
            ("Cash-on-Cash Return", "cash_on_cash_return", "percent"),
            ("Break-Even Occupancy", "break_even_occupancy", "percent"),
            ("Total Cash Required", "total_cash_required", "currency"),
        ])
    
    def _create_brrrr_sheet(self, wb: Workbook, property_data: Dict, brrrr_data: Optional[Dict]):
        """Create BRRRR analysis sheet."""
        if not brrrr_data:
            return
            
        ws = wb.create_sheet("BRRRR")
        self._create_strategy_sheet(ws, "BRRRR", self.STRATEGY_COLORS["brrrr"], brrrr_data, [
            ("Purchase Price", "purchase_price", "currency"),
            ("Rehab Budget", "rehab_budget", "currency"),
            ("After Repair Value (ARV)", "arv", "currency"),
            ("Total Cash Invested", "total_cash_invested", "currency"),
            ("Refinance Amount", "refinance_amount", "currency"),
            ("Cash Returned", "cash_returned", "currency"),
            ("Cash Left in Deal", "cash_left_in_deal", "currency"),
            ("Post-Refi Cash Flow", "post_refi_monthly_cash_flow", "currency"),
            ("Post-Refi CoC Return", "post_refi_cash_on_cash", "percent"),
            ("Infinite ROI Achieved", "infinite_roi_achieved", "boolean"),
            ("Equity Position", "equity_position", "currency"),
        ])
    
    def _create_flip_sheet(self, wb: Workbook, property_data: Dict, flip_data: Optional[Dict]):
        """Create Fix & Flip analysis sheet."""
        if not flip_data:
            return
            
        ws = wb.create_sheet("Fix & Flip")
        self._create_strategy_sheet(ws, "Fix & Flip", self.STRATEGY_COLORS["flip"], flip_data, [
            ("Purchase Price", "purchase_price", "currency"),
            ("Rehab Budget", "rehab_budget", "currency"),
            ("After Repair Value (ARV)", "arv", "currency"),
            ("Holding Costs", "holding_costs", "currency"),
            ("Selling Costs", "selling_costs", "currency"),
            ("Total Project Cost", "total_project_cost", "currency"),
            ("Net Profit (Before Tax)", "net_profit_before_tax", "currency"),
            ("ROI", "roi", "percent"),
            ("Annualized ROI", "annualized_roi", "percent"),
            ("Meets 70% Rule", "meets_70_rule", "boolean"),
            ("Max Allowable Offer", "max_allowable_offer", "currency"),
        ])
    
    def _create_house_hack_sheet(self, wb: Workbook, property_data: Dict, hh_data: Optional[Dict]):
        """Create House Hack analysis sheet."""
        if not hh_data:
            return
            
        ws = wb.create_sheet("House Hack")
        self._create_strategy_sheet(ws, "House Hack", self.STRATEGY_COLORS["house_hack"], hh_data, [
            ("Total Rental Income", "total_rental_income", "currency"),
            ("Net Housing Cost (A)", "net_housing_cost_scenario_a", "currency"),
            ("Net Housing Cost (B)", "net_housing_cost_scenario_b", "currency"),
            ("Savings vs Renting (A)", "savings_vs_renting_a", "currency"),
            ("Savings vs Renting (B)", "savings_vs_renting_b", "currency"),
            ("ROI on Savings", "roi_on_savings", "percent"),
            ("Total Cash Required", "total_cash_required", "currency"),
            ("Live for Free", "live_for_free", "boolean"),
        ])
    
    def _create_wholesale_sheet(self, wb: Workbook, property_data: Dict, ws_data: Optional[Dict]):
        """Create Wholesale analysis sheet."""
        if not ws_data:
            return
            
        ws = wb.create_sheet("Wholesale")
        self._create_strategy_sheet(ws, "Wholesale", self.STRATEGY_COLORS["wholesale"], ws_data, [
            ("After Repair Value (ARV)", "arv", "currency"),
            ("Max Allowable Offer", "max_allowable_offer", "currency"),
            ("Your Offer Price", "your_offer_price", "currency"),
            ("Assignment Fee", "assignment_fee", "currency"),
            ("Total Cash at Risk", "total_cash_at_risk", "currency"),
            ("Net Profit", "net_profit", "currency"),
            ("ROI", "roi", "percent"),
            ("Deal Viability", "deal_viability", "text"),
        ])
    
    def _create_strategy_sheet(
        self, 
        ws, 
        title: str, 
        color: str, 
        data: Dict, 
        metrics: List[tuple]
    ):
        """Create a standardized strategy analysis sheet."""
        header_fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
        header_font = Font(bold=True, size=14, color="FFFFFF")
        
        # Title
        ws.merge_cells('A1:D1')
        ws['A1'] = f"{title} Analysis"
        ws['A1'].font = header_font
        ws['A1'].fill = header_fill
        ws['A1'].alignment = Alignment(horizontal='center')
        
        ws['A2'] = f"Generated: {datetime.now().strftime('%B %d, %Y')}"
        ws['A2'].font = Font(italic=True, size=10, color="666666")
        
        # Metrics
        row = 4
        for label, key, fmt in metrics:
            ws.cell(row=row, column=1, value=label).font = Font(bold=True)
            
            value = data.get(key)
            if value is None:
                display = "N/A"
            elif fmt == "currency":
                display = f"${value:,.0f}"
            elif fmt == "percent":
                display = f"{value*100:.1f}%"
            elif fmt == "boolean":
                display = "✅ Yes" if value else "❌ No"
            elif fmt == "number":
                display = f"{value:.2f}"
            else:
                display = str(value)
            
            cell = ws.cell(row=row, column=2, value=display)
            
            # Color positive/negative values
            if fmt == "currency" and isinstance(value, (int, float)):
                if value > 0:
                    cell.font = Font(color="22C55E", bold=True)
                elif value < 0:
                    cell.font = Font(color="EF4444", bold=True)
            
            row += 1
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 25
        ws.column_dimensions['B'].width = 20
    
    def _create_assumptions_sheet(self, wb: Workbook, assumptions: Dict):
        """Create assumptions reference sheet."""
        ws = wb.create_sheet("Assumptions")
        
        ws['A1'] = "Assumptions Used in Analysis"
        ws['A1'].font = Font(bold=True, size=14)
        ws.merge_cells('A1:C1')
        
        row = 3
        
        def write_section(title: str, data: Dict, row: int) -> int:
            ws.cell(row=row, column=1, value=title).font = Font(bold=True, size=12)
            row += 1
            for key, value in data.items():
                if isinstance(value, dict):
                    continue
                ws.cell(row=row, column=1, value=key.replace("_", " ").title())
                if isinstance(value, float) and value < 1:
                    ws.cell(row=row, column=2, value=f"{value*100:.1f}%")
                elif isinstance(value, (int, float)):
                    ws.cell(row=row, column=2, value=f"{value:,.2f}")
                else:
                    ws.cell(row=row, column=2, value=str(value))
                row += 1
            return row + 1
        
        for section_name, section_data in assumptions.items():
            if isinstance(section_data, dict):
                row = write_section(section_name.replace("_", " ").title(), section_data, row)
        
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 15


# Singleton instance
report_service = ReportService()

