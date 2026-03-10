"""
Financial Proforma Router
Endpoints for generating accounting-standard financial proformas
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from app.core.deps import OptionalUser, ProUser
from app.schemas.appraisal_report import AppraisalReportRequest
from app.schemas.proforma import (
    FinancialProforma,
    ProformaExportResponse,
    ProformaRequest,
)
from app.services.brrrr_exporter import BRRRRExcelExporter
from app.services.flip_exporter import FlipExcelExporter
from app.services.house_hack_exporter import HouseHackExcelExporter
from app.services.proforma_exporter import ProformaExcelExporter
from app.services.proforma_generator import generate_proforma_data
from app.schemas.appraisal_report import NarrativesPayload
from app.services.appraisal_narrative_service import AppraisalNarrativeService
from app.services.appraisal_report_pdf import AppraisalReportPDFExporter
from app.services.property_report_pdf import PropertyReportPDFExporter
from app.services.property_service import property_service
from app.services.str_exporter import STRExcelExporter
from app.services.wholesale_exporter import WholesaleExcelExporter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/proforma", tags=["Proforma"])


@router.post(
    "/generate",
    summary="Generate financial proforma",
    response_model=ProformaExportResponse,
)
async def generate_proforma(
    request: ProformaRequest,
    current_user: OptionalUser,
):
    """
    Generate a comprehensive financial proforma for a property.

    The proforma includes:
    - Property summary and acquisition details
    - Income and expense breakdown (Year 1)
    - Multi-year cash flow projections with after-tax analysis
    - Full loan amortization schedule
    - Depreciation schedule for tax purposes
    - Exit/disposition analysis with capital gains
    - Investment return metrics (IRR, equity multiple, etc.)
    - All assumptions and data sources

    Supports export formats:
    - **xlsx**: Excel workbook with multiple tabs
    - **json**: Raw proforma data structure
    - **pdf**: PDF report (coming soon)
    """
    try:
        # Fetch property data using address
        property_data = await property_service.search_property(request.address)

        if not property_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Property not found: {request.address}")

        # Generate proforma data
        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=request.strategy,
            land_value_percent=request.land_value_percent,
            marginal_tax_rate=request.marginal_tax_rate,
            capital_gains_tax_rate=request.capital_gains_tax_rate,
            hold_period_years=request.hold_period_years,
            purchase_price_override=request.purchase_price,
            monthly_rent_override=request.monthly_rent,
        )

        if request.format == "json":
            # Return raw JSON data
            return JSONResponse(content=proforma.model_dump(), media_type="application/json")

        elif request.format == "xlsx":
            # Generate Excel file
            exporter = ProformaExcelExporter(proforma)
            buffer = exporter.generate()

            filename = f"proforma_{request.property_id}_{request.strategy}_{datetime.now().strftime('%Y%m%d')}.xlsx"

            return StreamingResponse(
                buffer,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )

        elif request.format == "pdf":
            # Generate PDF report using new DealGapIQ report exporter
            # WeasyPrint is lazy-loaded on first call to generate()
            try:
                exporter = PropertyReportPDFExporter(proforma, theme="light")
                buffer = exporter.generate()
            except ImportError as exc:
                logger.error(f"PDF export failed — WeasyPrint not available: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="PDF export is temporarily unavailable. The server is missing required system libraries. Please try again later or contact support.",
                )

            filename = (
                f"DealGapIQ_Report_{request.property_id}_{request.strategy}_{datetime.now().strftime('%Y%m%d')}.pdf"
            )

            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )

        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported format: {request.format}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating proforma: {e!s}"
        )


@router.get(
    "/property/{property_id}",
    summary="Get proforma data for a property",
    response_model=FinancialProforma,
)
async def get_proforma(
    property_id: str,
    current_user: OptionalUser,
    address: str = Query(..., description="Property address for lookup"),
    strategy: str = Query("ltr", description="Investment strategy: ltr, str, brrrr, flip, house_hack, wholesale"),
    land_value_percent: float = Query(0.20, ge=0, le=0.50, description="Land value as percent of purchase price"),
    marginal_tax_rate: float = Query(0.24, ge=0, le=0.50, description="Marginal income tax rate"),
    capital_gains_tax_rate: float = Query(0.15, ge=0, le=0.30, description="Long-term capital gains tax rate"),
    hold_period_years: int = Query(10, ge=1, le=30, description="Investment hold period in years"),
    purchase_price: float | None = Query(None, description="Override purchase price"),
    monthly_rent: float | None = Query(None, description="Override monthly rent"),
    interest_rate: float | None = Query(None, description="Override interest rate (decimal, e.g. 0.065)"),
    down_payment_pct: float | None = Query(None, description="Override down payment (decimal, e.g. 0.20)"),
    property_taxes: float | None = Query(None, description="Override annual property taxes"),
    insurance: float | None = Query(None, description="Override annual insurance"),
):
    """
    Get financial proforma data for a property as JSON.

    Use this endpoint to fetch proforma data for display in the UI.
    For downloadable Excel exports, use POST /generate with format=xlsx.
    """
    try:
        # Fetch property data using address
        property_data = await property_service.search_property(address)

        if not property_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Property not found: {address}")

        # Generate proforma data
        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=strategy,
            land_value_percent=land_value_percent,
            marginal_tax_rate=marginal_tax_rate,
            capital_gains_tax_rate=capital_gains_tax_rate,
            hold_period_years=hold_period_years,
            purchase_price_override=purchase_price,
            monthly_rent_override=monthly_rent,
            interest_rate_override=interest_rate,
            down_payment_pct_override=down_payment_pct,
            property_taxes_override=property_taxes,
            insurance_override=insurance,
        )

        return proforma

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating proforma: {e!s}"
        )


@router.get(
    "/property/{property_id}/excel",
    summary="Download Excel proforma",
)
async def download_proforma_excel(
    property_id: str,
    current_user: ProUser,
    address: str = Query(..., description="Property address for lookup"),
    strategy: str = Query("ltr", description="Investment strategy"),
    land_value_percent: float = Query(0.20, ge=0, le=0.50),
    marginal_tax_rate: float = Query(0.24, ge=0, le=0.50),
    capital_gains_tax_rate: float = Query(0.15, ge=0, le=0.30),
    hold_period_years: int = Query(10, ge=1, le=30),
    # User override params (from DealMaker adjustments)
    purchase_price: float | None = Query(None, description="Override purchase price"),
    monthly_rent: float | None = Query(None, description="Override monthly rent"),
    interest_rate: float | None = Query(None, description="Override interest rate (%)"),
    down_payment_pct: float | None = Query(None, description="Override down payment (%)"),
    property_taxes: float | None = Query(None, description="Override annual property taxes"),
    insurance: float | None = Query(None, description="Override annual insurance"),
    # Wholesale-specific params
    wholesale_fee: float | None = Query(None, description="Wholesale assignment fee override"),
    amv: float | None = Query(None, description="After-market value override"),
):
    """
    Download a comprehensive Excel financial proforma.

    For **wholesale** strategy, generates a deal-specific proforma with:
    1. Deal Summary — property + strategy overview
    2. Deal Structure — MAO, contract price, assignment fee
    3. Costs & Profit — earnest money, marketing, net profit, ROI
    4. Buyer Analysis — rent estimate, AMV, buyer's numbers
    5. Deal Viability — spread, viability grade, income targets
    6. Assumptions — all inputs + data sources

    For all other strategies, generates a standard 8-tab proforma:
    1. Property Summary  2. Income & Expenses  3. Cash Flow Projection
    4. Loan Amortization 5. Depreciation  6. Exit Analysis
    7. Returns Summary   8. Assumptions
    """
    try:
        # Fetch property data using address
        property_data = await property_service.search_property(address)

        if not property_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Property not found: {address}")

        # Generate proforma data
        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=strategy,
            land_value_percent=land_value_percent,
            marginal_tax_rate=marginal_tax_rate,
            capital_gains_tax_rate=capital_gains_tax_rate,
            hold_period_years=hold_period_years,
            purchase_price_override=purchase_price,
            monthly_rent_override=monthly_rent,
            interest_rate_override=interest_rate,
            down_payment_pct_override=down_payment_pct,
            property_taxes_override=property_taxes,
            insurance_override=insurance,
        )

        # Dispatch to strategy-specific exporter
        logger.info(f"[PROFORMA EXPORT] strategy={strategy!r}")
        if strategy == "wholesale":
            exporter = WholesaleExcelExporter(
                proforma,
                rent_estimate=monthly_rent,
                amv=amv,
                wholesale_fee=wholesale_fee,
            )
        elif strategy == "flip":
            exporter = FlipExcelExporter(proforma)
        elif strategy == "brrrr":
            exporter = BRRRRExcelExporter(proforma)
        elif strategy == "str":
            exporter = STRExcelExporter(proforma)
        elif strategy == "house_hack":
            exporter = HouseHackExcelExporter(proforma)
        else:
            exporter = ProformaExcelExporter(proforma)

        buffer = exporter.generate()

        # Create filename
        address_slug = property_data.address.street.replace(" ", "_")[:30] if property_data.address else property_id
        filename = f"DealGapIQ_{strategy.upper()}_Proforma_{address_slug}_{datetime.now().strftime('%Y%m%d')}.xlsx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Excel proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating Excel proforma: {e!s}"
        )


@router.get(
    "/property/{property_id}/pdf",
    summary="Download PDF property investment report",
)
async def download_proforma_pdf(
    property_id: str,
    current_user: ProUser,
    address: str = Query(..., description="Property address for lookup"),
    strategy: str = Query("ltr", description="Investment strategy"),
    theme: str = Query("light", description="Report theme: 'light' for print, 'dark' for digital"),
    land_value_percent: float = Query(0.20, ge=0, le=0.50),
    marginal_tax_rate: float = Query(0.24, ge=0, le=0.50),
    capital_gains_tax_rate: float = Query(0.15, ge=0, le=0.30),
    hold_period_years: int = Query(10, ge=1, le=30),
    # User override params (from DealMaker adjustments)
    purchase_price: float | None = Query(None, description="Override purchase price"),
    monthly_rent: float | None = Query(None, description="Override monthly rent"),
    interest_rate: float | None = Query(None, description="Override interest rate (decimal, e.g. 0.065)"),
    down_payment_pct: float | None = Query(None, description="Override down payment (decimal, e.g. 0.20)"),
    property_taxes: float | None = Query(None, description="Override annual property taxes"),
    insurance: float | None = Query(None, description="Override annual insurance"),
):
    """
    Download an DealGapIQ Property Investment Report as PDF.

    The 11-page report includes:
    - Cover page with property summary
    - Property overview and annual obligations
    - Market position and location analysis
    - Investment structure and financing details
    - Year 1 income statement with waterfall
    - Operating expense breakdown with donut chart
    - Key investment metrics (Cap Rate, CoC, DSCR, IRR)
    - Deal score and DealGapIQ verdict
    - 10-year financial projections with charts
    - Exit strategy and tax implications
    - Sensitivity analysis and data sources

    Supports light theme (print-optimized) and dark theme (digital).
    Requires WeasyPrint to be installed on the server.
    """
    # Validate theme
    if theme not in ("light", "dark"):
        theme = "light"

    try:
        # Fetch property data using address
        property_data = await property_service.search_property(address)

        if not property_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Property not found: {address}")

        # Generate proforma data
        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=strategy,
            land_value_percent=land_value_percent,
            marginal_tax_rate=marginal_tax_rate,
            capital_gains_tax_rate=capital_gains_tax_rate,
            hold_period_years=hold_period_years,
            purchase_price_override=purchase_price,
            monthly_rent_override=monthly_rent,
            interest_rate_override=interest_rate,
            down_payment_pct_override=down_payment_pct,
            property_taxes_override=property_taxes,
            insurance_override=insurance,
        )

        # Generate PDF using new DealGapIQ report exporter
        try:
            exporter = PropertyReportPDFExporter(proforma, theme=theme)
            buffer = exporter.generate()
        except ImportError as exc:
            logger.error(f"PDF report failed — WeasyPrint not available: {exc}")
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="PDF export is temporarily unavailable. The server is missing required system libraries. Please try again later or contact support.",
            )

        # Create filename
        address_slug = property_data.address.street.replace(" ", "_")[:30] if property_data.address else property_id
        theme_suffix = f"_{theme}" if theme == "dark" else ""
        filename = (
            f"DealGapIQ_Report_{address_slug}_{strategy.upper()}{theme_suffix}_{datetime.now().strftime('%Y%m%d')}.pdf"
        )

        return StreamingResponse(
            buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating PDF report: {e!s}"
        )


@router.get(
    "/property/{property_id}/report",
    summary="View property investment report as HTML (browser print-to-PDF)",
    response_class=HTMLResponse,
)
async def view_proforma_report(
    property_id: str,
    current_user: ProUser,
    address: str = Query(..., description="Property address for lookup"),
    strategy: str = Query("ltr", description="Investment strategy"),
    theme: str = Query("light", description="Report theme: 'light' for print, 'dark' for digital"),
    auto_print: bool = Query(True, description="Auto-trigger browser print dialog"),
    land_value_percent: float = Query(0.20, ge=0, le=0.50),
    marginal_tax_rate: float = Query(0.24, ge=0, le=0.50),
    capital_gains_tax_rate: float = Query(0.15, ge=0, le=0.30),
    hold_period_years: int = Query(10, ge=1, le=30),
    purchase_price: float | None = Query(None, description="Override purchase price"),
    monthly_rent: float | None = Query(None, description="Override monthly rent"),
    interest_rate: float | None = Query(None, description="Override interest rate (decimal, e.g. 0.065)"),
    down_payment_pct: float | None = Query(None, description="Override down payment (decimal, e.g. 0.20)"),
    property_taxes: float | None = Query(None, description="Override annual property taxes"),
    insurance: float | None = Query(None, description="Override annual insurance"),
):
    """
    Render the DealGapIQ Property Investment Report as a browser-viewable HTML page.

    The page is styled for print-to-PDF: open in a new tab, then use Cmd/Ctrl+P
    to save as PDF. If ``auto_print=true`` (default) the browser print dialog
    opens automatically after fonts have loaded.

    **No WeasyPrint or system dependencies required.**
    """
    if theme not in ("light", "dark"):
        theme = "light"

    try:
        property_data = await property_service.search_property(address)

        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property not found: {address}",
            )

        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=strategy,
            land_value_percent=land_value_percent,
            marginal_tax_rate=marginal_tax_rate,
            capital_gains_tax_rate=capital_gains_tax_rate,
            hold_period_years=hold_period_years,
            purchase_price_override=purchase_price,
            monthly_rent_override=monthly_rent,
            interest_rate_override=interest_rate,
            down_payment_pct_override=down_payment_pct,
            property_taxes_override=property_taxes,
            insurance_override=insurance,
        )

        exporter = PropertyReportPDFExporter(proforma, theme=theme)
        html_content = exporter.generate_html(auto_print=auto_print)

        return HTMLResponse(content=html_content)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating HTML report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {e!s}",
        )


# ---------------------------------------------------------------------------
# Appraisal Report (URAR Form 1004)
# ---------------------------------------------------------------------------


def _generate_narratives(request: AppraisalReportRequest) -> AppraisalReportRequest:
    """Populate narratives on the request with AI when enabled.

    Reliability-first behavior:
    - If AI is disabled, use deterministic template narratives.
    - If AI is enabled but fails, fall back to templates instead of failing export.
    """
    def _template_narratives() -> NarrativesPayload:
        comps_used = len(request.comp_adjustments or [])
        return NarrativesPayload(
            neighborhood=(
                "The subject property is located in a predominantly residential market area. "
                "Available market indicators suggest typical exposure times and pricing behavior "
                "for comparable housing in this location."
            ),
            site=(
                "The subject site size and utility are consistent with residential use in the area. "
                "Zoning, flood zone, and utility details should be verified through local records."
            ),
            improvements=(
                f"The subject improvements include approximately {request.subject_sqft:,.0f} square feet, "
                f"{request.subject_beds} bedrooms, and {request.subject_baths} bathrooms built in "
                f"{request.subject_year_built}. Interior condition and quality assumptions are based "
                "on available third-party data."
            ),
            reconciliation=(
                f"The Sales Comparison Approach is given primary weight based on {comps_used} comparable sales. "
                f"The indicated market value is ${request.market_value:,.0f} with a confidence level of "
                f"{request.confidence:.0f}%."
            ),
            income_approach=(
                "The Income Approach is presented as secondary support where rental data is available. "
                "Applicability is limited for owner-occupied residential properties."
            ),
            cost_approach=(
                "The Cost Approach is included for reference with limited reliability due to the absence of "
                "full replacement-cost and land-sales support data."
            ),
            scope_of_work=(
                "This report is a desktop analysis using public records and third-party API data. "
                "No physical inspection was performed. The report is for investment analysis and is "
                "not a licensed appraisal or BPO."
            ),
        )

    if request.narratives and request.narratives.reconciliation:
        return request

    if not request.generate_ai_narratives:
        request.narratives = _template_narratives()
        return request

    svc = AppraisalNarrativeService()

    property_data = {
        "address": {"full_address": request.subject_address, "city": "", "state": ""},
        "details": {
            "property_type": request.subject_property_type,
            "bedrooms": request.subject_beds,
            "bathrooms": request.subject_baths,
            "square_footage": request.subject_sqft,
            "year_built": request.subject_year_built,
            "lot_size": request.subject_lot_size,
            **(request.property_details.model_dump() if request.property_details else {}),
        },
    }

    parts = request.subject_address.split(",")
    if len(parts) >= 2:
        property_data["address"]["city"] = parts[1].strip().split()[0] if len(parts) > 1 else ""
        property_data["address"]["state"] = parts[-1].strip().split()[0] if parts[-1].strip() else ""

    ms = request.market_stats.model_dump() if request.market_stats else {}
    comps = [c.model_dump() for c in request.comp_adjustments]

    appraisal_data = {
        "market_value": request.market_value,
        "arv": request.arv,
        "confidence": request.confidence,
        "adjusted_price_value": request.adjusted_price_value,
        "price_per_sqft_value": request.price_per_sqft_value,
        "comp_adjustments": comps,
        "grm": request.rental_data.grm if request.rental_data else None,
        "cap_rate": request.rental_data.cap_rate if request.rental_data else None,
    }

    rd = None
    if request.rental_data:
        rd = {
            "monthly_rent": request.rental_data.monthly_rent,
            "iq_estimate": request.rental_data.monthly_rent,
        }

    fallback = _template_narratives()

    def _safe(fn, fallback_text: str) -> str:
        try:
            text = fn()
            return text if text else fallback_text
        except Exception as exc:
            logger.warning("Narrative generation fallback applied: %s", exc)
            return fallback_text

    request.narratives = NarrativesPayload(
        neighborhood=_safe(lambda: svc.generate_neighborhood_narrative(property_data, ms, comps), fallback.neighborhood),
        site=_safe(lambda: svc.generate_site_narrative(property_data), fallback.site),
        improvements=_safe(lambda: svc.generate_improvements_narrative(property_data), fallback.improvements),
        reconciliation=_safe(lambda: svc.generate_reconciliation_narrative(appraisal_data), fallback.reconciliation),
        income_approach=_safe(
            lambda: svc.generate_income_approach_narrative(rd, appraisal_data),
            fallback.income_approach,
        ),
        cost_approach=_safe(
            lambda: svc.generate_cost_approach_narrative(property_data, request.market_value),
            fallback.cost_approach,
        ),
        scope_of_work=_safe(lambda: svc.generate_scope_of_work(property_data), fallback.scope_of_work),
    )

    return request


@router.post(
    "/appraisal-report/pdf",
    summary="Generate URAR Form 1004 appraisal report PDF",
)
async def generate_appraisal_report_pdf(
    request: AppraisalReportRequest,
    current_user: OptionalUser,
):
    """
    Generate a URAR Form 1004 appraisal report PDF from user-selected
    comparable sales and their adjustments. Optionally generates AI-powered
    narratives for Neighborhood, Improvements, Reconciliation, Income Approach,
    Cost Approach, and Scope of Work sections via Anthropic Claude.
    """
    try:
        request = _generate_narratives(request)
        exporter = AppraisalReportPDFExporter(request)
        buffer = exporter.generate()
    except ImportError as exc:
        logger.error(f"Appraisal PDF export failed — WeasyPrint not available: {exc}")
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF export is temporarily unavailable. The server is missing required system libraries.",
        )
    except Exception as exc:
        # Reliability-first behavior: if PDF rendering fails for any runtime reason
        # (font engine, WeasyPrint internals, etc.), trigger frontend HTML fallback.
        logger.error("Appraisal PDF generation error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=(
                "PDF generation temporarily unavailable for this report. "
                "Falling back to HTML print view."
            ),
        )

    safe_address = "".join(c if c.isalnum() or c in " -" else "" for c in request.subject_address).strip().replace(" ", "-")[:60]
    filename = f"DealGapIQ_URAR_{safe_address}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/appraisal-report/html",
    summary="View URAR appraisal report as HTML (browser print-to-PDF)",
    response_class=HTMLResponse,
)
async def view_appraisal_report_html(
    request: AppraisalReportRequest,
    current_user: OptionalUser,
    auto_print: bool = Query(True, description="Auto-trigger browser print dialog"),
):
    """
    Render the URAR appraisal report as browser-viewable HTML for print-to-PDF.
    No WeasyPrint or system dependencies required.
    """
    try:
        request = _generate_narratives(request)
        exporter = AppraisalReportPDFExporter(request)
        html_content = exporter.generate_html(auto_print=auto_print)
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Error generating appraisal HTML report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating appraisal report: {e!s}",
        )
