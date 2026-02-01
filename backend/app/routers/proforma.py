"""
Financial Proforma Router
Endpoints for generating accounting-standard financial proformas
"""

import logging
from typing import Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import StreamingResponse, JSONResponse

from app.schemas.proforma import (
    ProformaRequest,
    ProformaExportResponse,
    FinancialProforma,
)
from app.services.proforma_generator import generate_proforma_data
from app.services.proforma_exporter import ProformaExcelExporter
from app.services.proforma_pdf_exporter import ProformaPDFExporter, WEASYPRINT_AVAILABLE
from app.services.property_service import property_service
from app.core.deps import CurrentUser, OptionalUser

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property not found: {request.address}"
            )
        
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
            return JSONResponse(
                content=proforma.model_dump(),
                media_type="application/json"
            )
        
        elif request.format == "xlsx":
            # Generate Excel file
            exporter = ProformaExcelExporter(proforma)
            buffer = exporter.generate()
            
            filename = f"proforma_{request.property_id}_{request.strategy}_{datetime.now().strftime('%Y%m%d')}.xlsx"
            
            return StreamingResponse(
                buffer,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        
        elif request.format == "pdf":
            if not WEASYPRINT_AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="PDF export requires WeasyPrint. Install with: pip install weasyprint"
                )
            
            # Generate PDF file
            exporter = ProformaPDFExporter(proforma)
            buffer = exporter.generate()
            
            filename = f"proforma_{request.property_id}_{request.strategy}_{datetime.now().strftime('%Y%m%d')}.pdf"
            
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format: {request.format}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating proforma: {str(e)}"
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
    purchase_price: Optional[float] = Query(None, description="Override purchase price"),
    monthly_rent: Optional[float] = Query(None, description="Override monthly rent"),
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property not found: {address}"
            )
        
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
        )
        
        return proforma
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating proforma: {str(e)}"
        )


@router.get(
    "/property/{property_id}/excel",
    summary="Download Excel proforma",
)
async def download_proforma_excel(
    property_id: str,
    current_user: OptionalUser,
    address: str = Query(..., description="Property address for lookup"),
    strategy: str = Query("ltr", description="Investment strategy"),
    land_value_percent: float = Query(0.20, ge=0, le=0.50),
    marginal_tax_rate: float = Query(0.24, ge=0, le=0.50),
    capital_gains_tax_rate: float = Query(0.15, ge=0, le=0.30),
    hold_period_years: int = Query(10, ge=1, le=30),
):
    """
    Download a comprehensive Excel financial proforma.
    
    The Excel file includes 8 tabs:
    1. Property Summary - Asset details and acquisition costs
    2. Income & Expenses - Year 1 operating statement
    3. Cash Flow Projection - Multi-year after-tax projections
    4. Loan Amortization - Full payment schedule
    5. Depreciation - Tax depreciation schedule
    6. Exit Analysis - Capital gains and after-tax proceeds
    7. Returns Summary - IRR, equity multiple, key metrics
    8. Assumptions - All inputs and data sources
    """
    try:
        # Fetch property data using address
        property_data = await property_service.search_property(address)
        
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property not found: {address}"
            )
        
        # Generate proforma data
        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=strategy,
            land_value_percent=land_value_percent,
            marginal_tax_rate=marginal_tax_rate,
            capital_gains_tax_rate=capital_gains_tax_rate,
            hold_period_years=hold_period_years,
        )
        
        # Generate Excel file
        exporter = ProformaExcelExporter(proforma)
        buffer = exporter.generate()
        
        # Create filename
        address_slug = property_data.address.street.replace(" ", "_")[:30] if property_data.address else property_id
        filename = f"Proforma_{address_slug}_{strategy.upper()}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\""
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Excel proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Excel proforma: {str(e)}"
        )


@router.get(
    "/property/{property_id}/pdf",
    summary="Download PDF proforma",
)
async def download_proforma_pdf(
    property_id: str,
    current_user: OptionalUser,
    address: str = Query(..., description="Property address for lookup"),
    strategy: str = Query("ltr", description="Investment strategy"),
    land_value_percent: float = Query(0.20, ge=0, le=0.50),
    marginal_tax_rate: float = Query(0.24, ge=0, le=0.50),
    capital_gains_tax_rate: float = Query(0.15, ge=0, le=0.30),
    hold_period_years: int = Query(10, ge=1, le=30),
):
    """
    Download a professional PDF financial proforma.
    
    The PDF includes:
    - Property summary with key details
    - Acquisition and financing breakdown
    - Year 1 income statement
    - Key investment metrics
    - Multi-year cash flow projections
    - Exit analysis with capital gains
    - Investment returns summary
    - Sensitivity analysis
    
    Note: Requires WeasyPrint to be installed on the server.
    """
    if not WEASYPRINT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF export requires WeasyPrint. Contact support to enable this feature."
        )
    
    try:
        # Fetch property data using address
        property_data = await property_service.search_property(address)
        
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property not found: {address}"
            )
        
        # Generate proforma data
        proforma = await generate_proforma_data(
            property_data=property_data,
            strategy=strategy,
            land_value_percent=land_value_percent,
            marginal_tax_rate=marginal_tax_rate,
            capital_gains_tax_rate=capital_gains_tax_rate,
            hold_period_years=hold_period_years,
        )
        
        # Generate PDF file
        exporter = ProformaPDFExporter(proforma)
        buffer = exporter.generate()
        
        # Create filename
        address_slug = property_data.address.street.replace(" ", "_")[:30] if property_data.address else property_id
        filename = f"Proforma_{address_slug}_{strategy.upper()}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\""
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF proforma: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF proforma: {str(e)}"
        )
