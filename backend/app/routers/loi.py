"""
LOI Router - Letter of Intent API Endpoints

Provides endpoints for generating, saving, and managing LOIs
for wholesale real estate deals.
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Optional, List
import base64
import io
import logging

from app.schemas.loi import (
    GenerateLOIRequest, LOIDocument, LOIFormat,
    LOIUserPreferences, LOIHistoryItem, LOITemplateInfo,
    BuyerInfo, PropertyInfo, LOITerms, ContingencyType
)
from app.services.loi_service import loi_service, generate_loi_from_analysis
from app.core.deps import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/loi", tags=["Letter of Intent"])


# ============================================
# LOI GENERATION ENDPOINTS
# ============================================

@router.post("/generate", response_model=LOIDocument)
async def generate_loi(
    request: GenerateLOIRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Generate a Letter of Intent from provided details.
    
    This is the main endpoint for LOI generation. The frontend collects
    all the necessary information and sends it here for processing.
    
    Returns the LOI in the requested format (PDF, text, or HTML).
    """
    try:
        logger.info(f"Generating LOI for property: {request.property_info.full_address}")
        
        loi_doc = loi_service.generate_loi(request)
        
        logger.info(f"LOI generated successfully: {loi_doc.id}")
        
        return loi_doc
        
    except ValueError as e:
        logger.warning(f"LOI validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid LOI request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to generate LOI: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate LOI: {str(e)}"
        )


@router.post("/generate/pdf")
async def generate_loi_pdf(
    request: GenerateLOIRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Generate LOI and return as downloadable PDF file.
    
    This endpoint returns the PDF directly for download rather than
    as a base64 encoded string in JSON.
    """
    try:
        # Force PDF format
        request.format = LOIFormat.PDF
        loi_doc = loi_service.generate_loi(request)
        
        if not loi_doc.pdf_base64:
            raise HTTPException(status_code=422, detail="PDF generation failed - missing required data")
        
        # Decode base64 to bytes
        pdf_bytes = base64.b64decode(loi_doc.pdf_base64)
        
        # Create filename
        address_slug = request.property_info.address.replace(" ", "_").replace(",", "")[:30]
        filename = f"LOI_{address_slug}_{loi_doc.id}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"PDF LOI validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to generate PDF LOI: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {str(e)}"
        )


@router.post("/generate/from-analysis", response_model=LOIDocument)
async def generate_loi_from_wholesale_analysis(
    property_data: dict,
    wholesale_calc: dict,
    buyer_info: dict,
    custom_terms: Optional[dict] = None,
    format: str = "pdf",
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Generate LOI directly from wholesale analysis results.
    
    This is a convenience endpoint that takes the raw output from
    the wholesale calculator and property scan, and generates an LOI
    without requiring the frontend to restructure the data.
    
    Ideal for the "one-click" LOI generation from the analysis page.
    """
    try:
        loi_doc = generate_loi_from_analysis(
            property_data=property_data,
            wholesale_calc=wholesale_calc,
            buyer_info=buyer_info,
            custom_terms=custom_terms,
            format=format
        )
        
        return loi_doc
        
    except ValueError as e:
        logger.warning(f"LOI from analysis validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to generate LOI from analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate LOI: {str(e)}"
        )


# ============================================
# QUICK GENERATION (Simplified)
# ============================================

@router.post("/quick-generate", response_model=LOIDocument)
async def quick_generate_loi(
    # Property basics
    property_address: str,
    property_city: str,
    property_state: str = "FL",
    property_zip: str = "",
    # Offer details
    offer_price: float = 0,
    earnest_money: float = 1000,
    inspection_days: int = 14,
    closing_days: int = 30,
    # Buyer info
    buyer_name: str = "Buyer",
    buyer_company: Optional[str] = None,
    buyer_email: Optional[str] = None,
    buyer_phone: Optional[str] = None,
    # Options
    include_assignment: bool = True,
    format: str = "pdf",
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Quick LOI generation with minimal required fields.
    
    This is the simplest way to generate an LOI - just provide the
    property address and offer price, and reasonable defaults are used
    for everything else.
    """
    try:
        request = GenerateLOIRequest(
            buyer=BuyerInfo(
                name=buyer_name,
                company=buyer_company,
                email=buyer_email,
                phone=buyer_phone
            ),
            property_info=PropertyInfo(
                address=property_address,
                city=property_city,
                state=property_state,
                zip_code=property_zip
            ),
            terms=LOITerms(
                offer_price=offer_price,
                earnest_money=earnest_money,
                inspection_period_days=inspection_days,
                closing_period_days=closing_days,
                allow_assignment=include_assignment,
                contingencies=[ContingencyType.INSPECTION, ContingencyType.TITLE]
            ),
            format=LOIFormat(format)
        )
        
        return loi_service.generate_loi(request)
        
    except ValueError as e:
        logger.warning(f"Quick LOI validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Quick LOI generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate LOI: {str(e)}"
        )


# ============================================
# TEMPLATES & PREFERENCES
# ============================================

@router.get("/templates", response_model=List[LOITemplateInfo])
async def get_loi_templates():
    """
    Get available LOI templates.
    
    Returns a list of template options that can be used for LOI generation.
    Currently returns the default Florida wholesale template.
    """
    return [
        LOITemplateInfo(
            id="fl-wholesale-standard",
            name="Florida Wholesale - Standard",
            description="Standard LOI for wholesale real estate deals in Florida. Includes assignment clause and standard contingencies.",
            is_default=True,
            state_specific="FL"
        ),
        LOITemplateInfo(
            id="fl-wholesale-aggressive",
            name="Florida Wholesale - Aggressive",
            description="Shorter inspection period, minimal contingencies. For motivated sellers.",
            is_default=False,
            state_specific="FL"
        ),
        LOITemplateInfo(
            id="general-wholesale",
            name="General Wholesale",
            description="Generic wholesale LOI template suitable for any state.",
            is_default=False,
            state_specific=None
        ),
    ]


@router.get("/preferences", response_model=LOIUserPreferences)
async def get_user_preferences(
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get user's saved LOI preferences.
    
    Returns default preferences if user hasn't saved any.
    In the future, this will pull from the user's profile.
    """
    # TODO: Load from database based on current_user
    # For now, return defaults
    return LOIUserPreferences(
        default_earnest_money=1000,
        default_inspection_days=14,
        default_closing_days=30,
        default_contingencies=[ContingencyType.INSPECTION, ContingencyType.TITLE],
        always_assign=True,
        preferred_format=LOIFormat.PDF
    )


@router.post("/preferences", response_model=LOIUserPreferences)
async def save_user_preferences(
    preferences: LOIUserPreferences,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Save user's LOI preferences.
    
    These preferences will be used as defaults for future LOI generation.
    """
    # TODO: Save to database
    logger.info(f"Saving LOI preferences for user")
    return preferences


# ============================================
# LOI HISTORY (Future Feature)
# ============================================

@router.get("/history", response_model=List[LOIHistoryItem])
async def get_loi_history(
    limit: int = 20,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get user's LOI history.
    
    Returns a list of previously generated LOIs.
    This is a placeholder for future implementation.
    """
    # TODO: Implement LOI storage and retrieval
    return []


@router.get("/history/{loi_id}", response_model=LOIDocument)
async def get_loi_by_id(
    loi_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get a specific LOI by ID.
    
    Retrieves a previously generated LOI from history.
    """
    # TODO: Implement LOI retrieval
    raise HTTPException(
        status_code=404,
        detail=f"LOI {loi_id} not found"
    )

