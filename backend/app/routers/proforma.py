"""
Financial Proforma Router
Endpoints for generating accounting-standard financial proformas
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from app.core.deps import OptionalUser, ProUser
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
