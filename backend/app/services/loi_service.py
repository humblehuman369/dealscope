"""
LOI Service - Letter of Intent Generation for Wholesale Deals

Generates professional LOIs with intelligent defaults from property analysis.
Supports PDF, HTML, and plain text output formats.

This is DealGapIQ's competitive edge: Analysis → Action in one click.
"""

import io
import base64
import uuid
import logging
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from app.schemas.loi import (
    GenerateLOIRequest, LOIDocument, LOIFormat,
    ContingencyType, BuyerInfo, PropertyInfo, LOITerms
)

logger = logging.getLogger(__name__)


class LOIService:
    """
    Generate professional Letters of Intent for wholesale real estate deals.
    
    Features:
    - Pre-filled from property analysis (MAO, terms, etc.)
    - Professional PDF generation
    - Plain text for quick copy/paste
    - HTML for email integration
    - Customizable contingencies and terms
    """
    
    # Florida-specific default language
    FLORIDA_ASSIGNMENT_CLAUSE = (
        "Buyer reserves the right to assign this agreement to a third party "
        "prior to closing. Seller acknowledges and agrees that the term 'Buyer' "
        "as used herein shall include any assignee of Buyer's interest."
    )
    
    INSPECTION_CLAUSE = (
        "This offer is contingent upon Buyer's satisfactory inspection of the "
        "Property within {days} days of acceptance ('Inspection Period'). During "
        "this period, Buyer may conduct inspections at Buyer's expense. If Buyer "
        "is not satisfied with the results of any inspection, for any reason, "
        "Buyer may terminate this agreement by written notice to Seller, and "
        "earnest money shall be returned to Buyer in full."
    )
    
    TITLE_CLAUSE = (
        "This offer is contingent upon Seller providing clear and marketable "
        "title, free of all liens and encumbrances, to be conveyed by warranty "
        "deed at closing."
    )
    
    AS_IS_CLAUSE = (
        "Buyer is purchasing the Property in 'AS-IS' condition, with any and "
        "all faults. Seller makes no warranties regarding the condition of the "
        "Property."
    )
    
    def __init__(self):
        """Initialize LOI service with document styles."""
        self._init_styles()
    
    def _init_styles(self):
        """Initialize ReportLab paragraph styles."""
        self.styles = getSampleStyleSheet()
        
        # Add custom styles
        self.styles.add(ParagraphStyle(
            name='LOITitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            alignment=TA_CENTER,
            spaceAfter=20,
            textColor=colors.HexColor('#1e3a5f')  # Navy
        ))
        
        self.styles.add(ParagraphStyle(
            name='LOISubtitle',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#666666'),
            spaceAfter=30
        ))
        
        self.styles.add(ParagraphStyle(
            name='LOISection',
            parent=self.styles['Heading2'],
            fontSize=12,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#1e3a5f'),
            spaceBefore=15,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='LOIBody',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            leading=14,
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='LOIDate',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT,
            spaceAfter=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='LOISignature',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceBefore=30
        ))
    
    def generate_loi(self, request: GenerateLOIRequest) -> LOIDocument:
        """
        Generate a complete LOI document from the request.
        
        Args:
            request: Complete LOI generation request with all details
            
        Returns:
            LOIDocument with content in requested format(s)
        """
        loi_id = str(uuid.uuid4())[:8].upper()
        created_at = datetime.now()
        expiration_date = date.today() + timedelta(days=request.terms.offer_expiration_days)
        
        # Generate text content (always needed)
        content_text = self._generate_text(request, loi_id, expiration_date)
        
        # Generate HTML if needed
        content_html = None
        if request.format in [LOIFormat.HTML, LOIFormat.PDF]:
            content_html = self._generate_html(request, loi_id, expiration_date)
        
        # Generate PDF if needed
        pdf_base64 = None
        if request.format == LOIFormat.PDF:
            pdf_bytes = self._generate_pdf(request, loi_id, expiration_date)
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return LOIDocument(
            id=f"LOI-{loi_id}",
            created_at=created_at,
            content_text=content_text,
            content_html=content_html,
            pdf_base64=pdf_base64,
            property_address=request.property_info.full_address,
            offer_price=request.terms.offer_price,
            earnest_money=request.terms.earnest_money,
            inspection_days=request.terms.inspection_period_days,
            closing_days=request.terms.closing_period_days,
            expiration_date=expiration_date,
            buyer_name=request.buyer.display_name,
            seller_name=request.seller.name if request.seller else None,
            format_generated=request.format
        )
    
    def _generate_text(
        self, 
        request: GenerateLOIRequest, 
        loi_id: str,
        expiration_date: date
    ) -> str:
        """Generate plain text version of LOI."""
        buyer = request.buyer
        prop = request.property_info
        terms = request.terms
        seller = request.seller
        
        today = date.today().strftime("%B %d, %Y")
        exp_str = expiration_date.strftime("%B %d, %Y")
        
        # Build the LOI text
        lines = []
        
        # Header
        lines.append("=" * 60)
        lines.append("LETTER OF INTENT TO PURCHASE REAL PROPERTY")
        lines.append(f"LOI Reference: LOI-{loi_id}")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Date: {today}")
        lines.append("")
        
        # Parties
        lines.append("TO: Property Owner / Seller")
        if seller and seller.name:
            lines.append(f"    {seller.name}")
        lines.append(f"    (Property: {prop.full_address})")
        lines.append("")
        lines.append("FROM:")
        lines.append(f"    {buyer.display_name}")
        if buyer.full_address:
            lines.append(f"    {buyer.full_address}")
        if buyer.phone:
            lines.append(f"    Phone: {buyer.phone}")
        if buyer.email:
            lines.append(f"    Email: {buyer.email}")
        lines.append("")
        
        # Property Description
        lines.append("-" * 60)
        lines.append("PROPERTY:")
        lines.append("-" * 60)
        lines.append(f"Address: {prop.full_address}")
        if prop.county:
            lines.append(f"County: {prop.county}")
        if prop.parcel_id:
            lines.append(f"Parcel ID: {prop.parcel_id}")
        if prop.legal_description:
            lines.append(f"Legal Description: {prop.legal_description}")
        
        # Property details if available
        details = []
        if prop.property_type:
            details.append(f"Type: {prop.property_type}")
        if prop.bedrooms:
            details.append(f"Beds: {prop.bedrooms}")
        if prop.bathrooms:
            details.append(f"Baths: {prop.bathrooms}")
        if prop.square_footage:
            details.append(f"Sq Ft: {prop.square_footage:,}")
        if prop.year_built:
            details.append(f"Year: {prop.year_built}")
        if details:
            lines.append(" | ".join(details))
        lines.append("")
        
        # Terms
        lines.append("-" * 60)
        lines.append("PROPOSED TERMS:")
        lines.append("-" * 60)
        lines.append(f"Purchase Price:        ${terms.offer_price:,.2f}")
        lines.append(f"Earnest Money Deposit: ${terms.earnest_money:,.2f}")
        lines.append(f"Earnest Money Holder:  {terms.earnest_money_holder}")
        lines.append(f"Inspection Period:     {terms.inspection_period_days} days from acceptance")
        lines.append(f"Closing:               {terms.closing_period_days} days from end of inspection")
        lines.append(f"Offer Valid Until:     {exp_str}")
        lines.append("")
        
        if terms.seller_concessions > 0:
            lines.append(f"Seller Concessions:    ${terms.seller_concessions:,.2f}")
            lines.append("")
        
        # Financing
        lines.append("-" * 60)
        lines.append("FINANCING:")
        lines.append("-" * 60)
        if terms.is_cash_offer:
            lines.append("This is a CASH offer. No financing contingency.")
            if terms.proof_of_funds_included:
                lines.append("Proof of funds attached / available upon request.")
        else:
            lines.append("Subject to Buyer obtaining satisfactory financing.")
        lines.append("")
        
        # Contingencies
        lines.append("-" * 60)
        lines.append("CONTINGENCIES:")
        lines.append("-" * 60)
        
        if ContingencyType.INSPECTION in terms.contingencies:
            lines.append(f"[X] INSPECTION - {terms.inspection_period_days} day inspection period")
            lines.append(f"    {self.INSPECTION_CLAUSE.format(days=terms.inspection_period_days)}")
            lines.append("")
        
        if ContingencyType.TITLE in terms.contingencies:
            lines.append("[X] TITLE - Clear and marketable title required")
            lines.append(f"    {self.TITLE_CLAUSE}")
            lines.append("")
        
        if ContingencyType.FINANCING in terms.contingencies:
            lines.append("[X] FINANCING - Subject to satisfactory financing terms")
            lines.append("")
        
        if ContingencyType.APPRAISAL in terms.contingencies:
            lines.append("[X] APPRAISAL - Subject to property appraising at purchase price")
            lines.append("")
        
        if ContingencyType.PARTNER_APPROVAL in terms.contingencies:
            lines.append("[X] PARTNER APPROVAL - Subject to approval by Buyer's partner(s)")
            lines.append("")
        
        if ContingencyType.ATTORNEY_REVIEW in terms.contingencies:
            lines.append("[X] ATTORNEY REVIEW - Subject to 3-day attorney review period")
            lines.append("")
        
        # Assignment clause
        if terms.allow_assignment:
            lines.append("-" * 60)
            lines.append("ASSIGNMENT:")
            lines.append("-" * 60)
            lines.append(self.FLORIDA_ASSIGNMENT_CLAUSE)
            lines.append("")
        
        # Additional terms
        lines.append("-" * 60)
        lines.append("ADDITIONAL TERMS:")
        lines.append("-" * 60)
        lines.append(self.AS_IS_CLAUSE)
        lines.append("")
        
        if terms.include_personal_property:
            lines.append("Sale includes all appliances, fixtures, and personal property currently on premises.")
            lines.append("")
        
        if terms.additional_terms:
            lines.append(terms.additional_terms)
            lines.append("")
        
        # Include analysis data if requested
        if request.analysis and request.analysis.include_in_loi:
            lines.append("-" * 60)
            lines.append("OFFER JUSTIFICATION:")
            lines.append("-" * 60)
            if request.analysis.arv:
                lines.append(f"After Repair Value (ARV): ${request.analysis.arv:,.0f}")
            if request.analysis.estimated_rehab:
                lines.append(f"Estimated Rehab Costs:    ${request.analysis.estimated_rehab:,.0f}")
            if request.analysis.max_allowable_offer:
                lines.append(f"Max Allowable Offer:      ${request.analysis.max_allowable_offer:,.0f}")
            lines.append("")
        
        # Non-binding notice
        lines.append("-" * 60)
        lines.append("IMPORTANT NOTICE:")
        lines.append("-" * 60)
        lines.append(
            "This Letter of Intent is a non-binding expression of interest and "
            "is intended to outline the basic terms under which the parties would "
            "consider entering into a binding Purchase and Sale Agreement. This "
            "LOI does not create any obligation on the part of either party to "
            "negotiate or enter into any agreement."
        )
        lines.append("")
        
        # Signature section
        lines.append("-" * 60)
        lines.append("ACCEPTANCE:")
        lines.append("-" * 60)
        lines.append("")
        lines.append("The undersigned acknowledges receipt of this Letter of Intent")
        lines.append("and agrees to the terms outlined above:")
        lines.append("")
        lines.append("BUYER:")
        lines.append("")
        lines.append("_" * 40)
        lines.append(f"{buyer.display_name}")
        lines.append(f"Date: _______________")
        lines.append("")
        lines.append("")
        lines.append("SELLER:")
        lines.append("")
        lines.append("_" * 40)
        if seller and seller.name:
            lines.append(f"{seller.name}")
        else:
            lines.append("Property Owner")
        lines.append(f"Date: _______________")
        lines.append("")
        lines.append("")
        lines.append("=" * 60)
        lines.append(f"Generated by DealGapIQ | LOI-{loi_id} | {today}")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def _generate_html(
        self,
        request: GenerateLOIRequest,
        loi_id: str,
        expiration_date: date
    ) -> str:
        """Generate HTML version of LOI for email or web display."""
        buyer = request.buyer
        prop = request.property_info
        terms = request.terms
        seller = request.seller
        
        today = date.today().strftime("%B %d, %Y")
        exp_str = expiration_date.strftime("%B %d, %Y")
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #333;
            line-height: 1.6;
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #1e3a5f;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #1e3a5f;
            margin: 0;
            font-size: 24px;
        }}
        .header .ref {{
            color: #666;
            font-size: 12px;
            margin-top: 5px;
        }}
        .date {{
            text-align: right;
            color: #666;
            margin-bottom: 20px;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        .section-title {{
            color: #1e3a5f;
            font-weight: bold;
            font-size: 14px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }}
        .terms-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        .terms-table td {{
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }}
        .terms-table td:first-child {{
            font-weight: 500;
            color: #555;
            width: 40%;
        }}
        .terms-table td:last-child {{
            font-weight: 600;
            color: #1e3a5f;
        }}
        .price {{
            font-size: 24px;
            color: #0891b2;
            font-weight: bold;
        }}
        .contingency {{
            background: #f8f9fa;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 8px 0;
            border-left: 3px solid #0891b2;
        }}
        .contingency strong {{
            color: #1e3a5f;
        }}
        .notice {{
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 12px;
        }}
        .signature-section {{
            margin-top: 40px;
        }}
        .signature-line {{
            border-top: 1px solid #333;
            width: 300px;
            margin-top: 50px;
            padding-top: 5px;
        }}
        .footer {{
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 11px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>LETTER OF INTENT TO PURCHASE REAL PROPERTY</h1>
        <div class="ref">Reference: LOI-{loi_id}</div>
    </div>
    
    <div class="date">{today}</div>
    
    <div class="section">
        <div class="section-title">PARTIES</div>
        <p><strong>TO:</strong> Property Owner{f" ({seller.name})" if seller and seller.name else ""}<br>
        <em>{prop.full_address}</em></p>
        
        <p><strong>FROM:</strong> {buyer.display_name}<br>
        {f"{buyer.full_address}<br>" if buyer.full_address else ""}
        {f"Phone: {buyer.phone}<br>" if buyer.phone else ""}
        {f"Email: {buyer.email}" if buyer.email else ""}
        </p>
    </div>
    
    <div class="section">
        <div class="section-title">PROPERTY</div>
        <p><strong>{prop.full_address}</strong></p>
        {f'<p>County: {prop.county} | Parcel ID: {prop.parcel_id}</p>' if prop.parcel_id else ''}
    </div>
    
    <div class="section">
        <div class="section-title">PROPOSED TERMS</div>
        <table class="terms-table">
            <tr>
                <td>Purchase Price</td>
                <td class="price">${terms.offer_price:,.2f}</td>
            </tr>
            <tr>
                <td>Earnest Money Deposit</td>
                <td>${terms.earnest_money:,.2f}</td>
            </tr>
            <tr>
                <td>Inspection Period</td>
                <td>{terms.inspection_period_days} days from acceptance</td>
            </tr>
            <tr>
                <td>Closing</td>
                <td>{terms.closing_period_days} days from end of inspection</td>
            </tr>
            <tr>
                <td>Offer Valid Until</td>
                <td>{exp_str}</td>
            </tr>
            <tr>
                <td>Financing</td>
                <td>{"CASH - No financing contingency" if terms.is_cash_offer else "Subject to financing"}</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title">CONTINGENCIES</div>
        {"".join([f'<div class="contingency"><strong>✓ {c.value.upper()}</strong></div>' for c in terms.contingencies])}
    </div>
    
    {f'''
    <div class="section">
        <div class="section-title">ASSIGNMENT</div>
        <p>{self.FLORIDA_ASSIGNMENT_CLAUSE}</p>
    </div>
    ''' if terms.allow_assignment else ''}
    
    <div class="section">
        <div class="section-title">CONDITION</div>
        <p>{self.AS_IS_CLAUSE}</p>
    </div>
    
    <div class="notice">
        <strong>IMPORTANT:</strong> This Letter of Intent is a non-binding expression of interest 
        and is intended to outline the basic terms under which the parties would consider entering 
        into a binding Purchase and Sale Agreement. This LOI does not create any obligation on 
        the part of either party to negotiate or enter into any agreement.
    </div>
    
    <div class="signature-section">
        <div class="section-title">ACCEPTANCE</div>
        <p>The undersigned acknowledges receipt of this Letter of Intent and agrees to the terms outlined above:</p>
        
        <div style="display: flex; justify-content: space-between;">
            <div>
                <div class="signature-line">
                    {buyer.display_name}<br>
                    <small>BUYER - Date: _______________</small>
                </div>
            </div>
            <div>
                <div class="signature-line">
                    {seller.name if seller and seller.name else "Property Owner"}<br>
                    <small>SELLER - Date: _______________</small>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        Generated by DealGapIQ | LOI-{loi_id} | {today}
    </div>
</body>
</html>
"""
        return html
    
    def _generate_pdf(
        self,
        request: GenerateLOIRequest,
        loi_id: str,
        expiration_date: date
    ) -> bytes:
        """Generate professional PDF version of LOI."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        story = []
        buyer = request.buyer
        prop = request.property_info
        terms = request.terms
        seller = request.seller
        
        today = date.today().strftime("%B %d, %Y")
        exp_str = expiration_date.strftime("%B %d, %Y")
        
        # Title
        story.append(Paragraph(
            "LETTER OF INTENT TO PURCHASE REAL PROPERTY",
            self.styles['LOITitle']
        ))
        story.append(Paragraph(
            f"Reference: LOI-{loi_id}",
            self.styles['LOISubtitle']
        ))
        
        # Date
        story.append(Paragraph(f"Date: {today}", self.styles['LOIDate']))
        
        # Parties Section
        story.append(Paragraph("PARTIES", self.styles['LOISection']))
        
        to_text = f"<b>TO:</b> Property Owner"
        if seller and seller.name:
            to_text += f" ({seller.name})"
        to_text += f"<br/><i>{prop.full_address}</i>"
        story.append(Paragraph(to_text, self.styles['LOIBody']))
        
        from_text = f"<b>FROM:</b> {buyer.display_name}"
        if buyer.full_address:
            from_text += f"<br/>{buyer.full_address}"
        if buyer.phone:
            from_text += f"<br/>Phone: {buyer.phone}"
        if buyer.email:
            from_text += f"<br/>Email: {buyer.email}"
        story.append(Paragraph(from_text, self.styles['LOIBody']))
        
        story.append(Spacer(1, 10))
        
        # Property Section
        story.append(Paragraph("PROPERTY", self.styles['LOISection']))
        
        prop_text = f"<b>{prop.full_address}</b>"
        if prop.county:
            prop_text += f"<br/>County: {prop.county}"
        if prop.parcel_id:
            prop_text += f" | Parcel ID: {prop.parcel_id}"
        if prop.legal_description:
            prop_text += f"<br/>Legal Description: {prop.legal_description}"
        story.append(Paragraph(prop_text, self.styles['LOIBody']))
        
        # Property details table
        details_data = []
        if prop.property_type:
            details_data.append(["Property Type", prop.property_type])
        if prop.bedrooms:
            details_data.append(["Bedrooms", str(prop.bedrooms)])
        if prop.bathrooms:
            details_data.append(["Bathrooms", str(prop.bathrooms)])
        if prop.square_footage:
            details_data.append(["Square Footage", f"{prop.square_footage:,}"])
        if prop.year_built:
            details_data.append(["Year Built", str(prop.year_built)])
        
        if details_data:
            details_table = Table(details_data, colWidths=[2*inch, 4*inch])
            details_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
                ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e3a5f')),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(details_table)
        
        story.append(Spacer(1, 10))
        
        # Terms Section
        story.append(Paragraph("PROPOSED TERMS", self.styles['LOISection']))
        
        terms_data = [
            ["Purchase Price", f"${terms.offer_price:,.2f}"],
            ["Earnest Money Deposit", f"${terms.earnest_money:,.2f}"],
            ["Earnest Money Holder", terms.earnest_money_holder],
            ["Inspection Period", f"{terms.inspection_period_days} days from acceptance"],
            ["Closing", f"{terms.closing_period_days} days from end of inspection"],
            ["Offer Valid Until", exp_str],
            ["Financing", "CASH - No financing contingency" if terms.is_cash_offer else "Subject to financing"],
        ]
        
        if terms.seller_concessions > 0:
            terms_data.append(["Seller Concessions", f"${terms.seller_concessions:,.2f}"])
        
        terms_table = Table(terms_data, colWidths=[2.5*inch, 4*inch])
        terms_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#555555')),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (1, 0), (1, 0), 14),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#0891b2')),  # Price highlight
            ('TEXTCOLOR', (1, 1), (1, -1), colors.HexColor('#1e3a5f')),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#eeeeee')),
        ]))
        story.append(terms_table)
        
        story.append(Spacer(1, 15))
        
        # Contingencies Section
        story.append(Paragraph("CONTINGENCIES", self.styles['LOISection']))
        
        for contingency in terms.contingencies:
            cont_text = f"<b>✓ {contingency.value.upper()}</b>"
            
            if contingency == ContingencyType.INSPECTION:
                cont_text += f"<br/><font size=9>{self.INSPECTION_CLAUSE.format(days=terms.inspection_period_days)}</font>"
            elif contingency == ContingencyType.TITLE:
                cont_text += f"<br/><font size=9>{self.TITLE_CLAUSE}</font>"
            
            story.append(Paragraph(cont_text, self.styles['LOIBody']))
        
        # Assignment Clause
        if terms.allow_assignment:
            story.append(Paragraph("ASSIGNMENT", self.styles['LOISection']))
            story.append(Paragraph(self.FLORIDA_ASSIGNMENT_CLAUSE, self.styles['LOIBody']))
        
        # Condition
        story.append(Paragraph("CONDITION", self.styles['LOISection']))
        story.append(Paragraph(self.AS_IS_CLAUSE, self.styles['LOIBody']))
        
        # Additional Terms
        if terms.additional_terms:
            story.append(Paragraph("ADDITIONAL TERMS", self.styles['LOISection']))
            story.append(Paragraph(terms.additional_terms, self.styles['LOIBody']))
        
        story.append(Spacer(1, 15))
        
        # Non-binding notice
        notice_style = ParagraphStyle(
            name='Notice',
            parent=self.styles['Normal'],
            fontSize=9,
            backColor=colors.HexColor('#fff3cd'),
            borderPadding=10,
            spaceBefore=10,
            spaceAfter=10
        )
        story.append(Paragraph(
            "<b>IMPORTANT:</b> This Letter of Intent is a non-binding expression of interest "
            "and is intended to outline the basic terms under which the parties would consider "
            "entering into a binding Purchase and Sale Agreement. This LOI does not create any "
            "obligation on the part of either party to negotiate or enter into any agreement.",
            notice_style
        ))
        
        # Signature Section
        story.append(Spacer(1, 20))
        story.append(Paragraph("ACCEPTANCE", self.styles['LOISection']))
        story.append(Paragraph(
            "The undersigned acknowledges receipt of this Letter of Intent and agrees "
            "to the terms outlined above:",
            self.styles['LOIBody']
        ))
        
        story.append(Spacer(1, 30))
        
        # Signature lines as table
        sig_data = [
            ["_" * 35, "_" * 35],
            [buyer.display_name, seller.name if seller and seller.name else "Property Owner"],
            ["BUYER", "SELLER"],
            ["Date: _______________", "Date: _______________"],
        ]
        
        sig_table = Table(sig_data, colWidths=[3.25*inch, 3.25*inch])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 2), (-1, 2), colors.HexColor('#666666')),
            ('FONTSIZE', (0, 2), (-1, 2), 8),
        ]))
        story.append(sig_table)
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#dddddd')))
        story.append(Paragraph(
            f"<font size=9 color='#999999'>Generated by DealGapIQ | LOI-{loi_id} | {today}</font>",
            ParagraphStyle(name='Footer', alignment=TA_CENTER, spaceBefore=10)
        ))
        
        # Build PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        logger.info(f"Generated PDF LOI: LOI-{loi_id} for {prop.full_address}")
        
        return pdf_bytes


# Singleton instance
loi_service = LOIService()


def generate_loi_from_analysis(
    property_data: Dict[str, Any],
    wholesale_calc: Dict[str, Any],
    buyer_info: Dict[str, Any],
    custom_terms: Optional[Dict[str, Any]] = None,
    format: str = "pdf"
) -> LOIDocument:
    """
    Convenience function to generate LOI from property analysis results.
    
    This bridges the wholesale calculator output to LOI generation.
    
    Args:
        property_data: Normalized property data from scan
        wholesale_calc: Wholesale calculator results (MAO, spread, etc.)
        buyer_info: Buyer's information
        custom_terms: Optional custom terms override
        format: Output format (pdf, text, html)
    
    Returns:
        Generated LOI document
    """
    # Build PropertyInfo from property data
    property_info = PropertyInfo(
        address=property_data.get("address", ""),
        city=property_data.get("city", ""),
        state=property_data.get("state", "FL"),
        zip_code=property_data.get("zip_code", ""),
        county=property_data.get("county"),
        parcel_id=property_data.get("parcel_id"),
        legal_description=property_data.get("legal_description"),
        property_type=property_data.get("property_type"),
        bedrooms=property_data.get("bedrooms"),
        bathrooms=property_data.get("bathrooms"),
        square_footage=property_data.get("square_footage"),
        year_built=property_data.get("year_built"),
        lot_size=property_data.get("lot_size"),
    )
    
    # Build BuyerInfo
    buyer = BuyerInfo(
        name=buyer_info.get("name", "Buyer"),
        company=buyer_info.get("company"),
        address=buyer_info.get("address"),
        city=buyer_info.get("city"),
        state=buyer_info.get("state"),
        zip_code=buyer_info.get("zip_code"),
        phone=buyer_info.get("phone"),
        email=buyer_info.get("email"),
    )
    
    # Build LOITerms from wholesale calc with optional overrides
    base_terms = {
        "offer_price": wholesale_calc.get("mao") or wholesale_calc.get("seventy_pct_max_offer", 0),
        "earnest_money": wholesale_calc.get("earnest_money", 1000),
        "allow_assignment": True,  # Default for wholesale
        "is_cash_offer": True,
    }
    
    if custom_terms:
        base_terms.update(custom_terms)
    
    terms = LOITerms(**base_terms)
    
    # Build analysis data
    from app.schemas.loi import LOIAnalysisData
    analysis = LOIAnalysisData(
        arv=wholesale_calc.get("arv"),
        estimated_rehab=wholesale_calc.get("estimated_rehab"),
        max_allowable_offer=wholesale_calc.get("seventy_pct_max_offer"),
        deal_viability=wholesale_calc.get("deal_viability"),
        include_in_loi=False,  # Don't include by default
    )
    
    # Create request
    request = GenerateLOIRequest(
        buyer=buyer,
        property_info=property_info,
        terms=terms,
        analysis=analysis,
        format=LOIFormat(format),
    )
    
    return loi_service.generate_loi(request)

