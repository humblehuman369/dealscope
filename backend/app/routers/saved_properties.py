"""
Saved Properties router for user's property portfolio management.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, status, Query

from app.services.saved_property_service import saved_property_service
from app.models.saved_property import PropertyStatus
from app.schemas.saved_property import (
    SavedPropertyCreate,
    SavedPropertyUpdate,
    SavedPropertyResponse,
    SavedPropertySummary,
    PropertyAdjustmentCreate,
    PropertyAdjustmentResponse,
    BulkStatusUpdate,
    BulkTagUpdate,
)
from app.core.deps import CurrentUser, DbSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/properties/saved", tags=["Saved Properties"])


# ===========================================
# List & Stats
# ===========================================

@router.get(
    "",
    response_model=List[SavedPropertySummary],
    summary="List saved properties"
)
async def list_saved_properties(
    current_user: CurrentUser,
    db: DbSession,
    status: Optional[PropertyStatus] = Query(None, description="Filter by status"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    search: Optional[str] = Query(None, description="Search in address, nickname, notes"),
    order_by: str = Query("saved_at_desc", description="Order by field"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List all saved properties for the current user.
    
    Supports filtering by status, tags, and free-text search.
    """
    tag_list = tags.split(",") if tags else None
    
    properties = await saved_property_service.list_properties(
        db=db,
        user_id=str(current_user.id),
        status=status,
        tags=tag_list,
        search=search,
        limit=limit,
        offset=offset,
        order_by=order_by,
    )
    
    # Convert to summary responses
    return [
        SavedPropertySummary(
            id=str(p.id),
            address_street=p.address_street,
            address_city=p.address_city,
            address_state=p.address_state,
            address_zip=p.address_zip,
            nickname=p.nickname,
            status=p.status,
            tags=p.tags,
            color_label=p.color_label,
            priority=p.priority,
            best_strategy=p.last_analytics_result.get("best_strategy") if p.last_analytics_result else None,
            best_cash_flow=p.last_analytics_result.get("best_cash_flow") if p.last_analytics_result else None,
            best_coc_return=p.last_analytics_result.get("best_coc_return") if p.last_analytics_result else None,
            saved_at=p.saved_at,
            last_viewed_at=p.last_viewed_at,
            updated_at=p.updated_at,
        )
        for p in properties
    ]


@router.get(
    "/stats",
    summary="Get saved properties statistics"
)
async def get_saved_properties_stats(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get statistics about saved properties (counts by status, etc.)."""
    return await saved_property_service.get_stats(db, str(current_user.id))


# ===========================================
# Bulk Operations (MUST be before /{property_id} routes)
# ===========================================

@router.post(
    "/bulk/status",
    summary="Bulk update property status"
)
async def bulk_update_status(
    data: BulkStatusUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update status for multiple properties at once."""
    count = await saved_property_service.bulk_update_status(
        db=db,
        user_id=str(current_user.id),
        property_ids=data.property_ids,
        status=data.status,
    )
    
    return {"updated": count, "status": data.status.value}


@router.delete(
    "/bulk",
    summary="Bulk delete properties"
)
async def bulk_delete_properties(
    property_ids: List[str],
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete multiple properties at once."""
    count = await saved_property_service.bulk_delete(
        db=db,
        user_id=str(current_user.id),
        property_ids=property_ids,
    )
    
    return {"deleted": count}


# ===========================================
# CRUD Operations
# ===========================================

@router.post(
    "",
    response_model=SavedPropertyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a property"
)
async def save_property(
    data: SavedPropertyCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Save a property to the user's portfolio.
    
    Includes property data snapshot at time of save.
    """
    try:
        saved = await saved_property_service.save_property(
            db=db,
            user_id=str(current_user.id),
            data=data,
        )
        
        return SavedPropertyResponse(
            id=str(saved.id),
            user_id=str(saved.user_id),
            external_property_id=saved.external_property_id,
            zpid=saved.zpid,
            address_street=saved.address_street,
            address_city=saved.address_city,
            address_state=saved.address_state,
            address_zip=saved.address_zip,
            full_address=saved.full_address,
            nickname=saved.nickname,
            status=saved.status,
            tags=saved.tags,
            color_label=saved.color_label,
            priority=saved.priority,
            property_data_snapshot=saved.property_data_snapshot,
            custom_purchase_price=saved.custom_purchase_price,
            custom_rent_estimate=saved.custom_rent_estimate,
            custom_arv=saved.custom_arv,
            custom_rehab_budget=saved.custom_rehab_budget,
            custom_daily_rate=saved.custom_daily_rate,
            custom_occupancy_rate=saved.custom_occupancy_rate,
            custom_assumptions=saved.custom_assumptions,
            notes=saved.notes,
            best_strategy=None,
            best_cash_flow=None,
            best_coc_return=None,
            last_analytics_result=saved.last_analytics_result,
            analytics_calculated_at=saved.analytics_calculated_at,
            data_refreshed_at=saved.data_refreshed_at,
            saved_at=saved.saved_at,
            last_viewed_at=saved.last_viewed_at,
            updated_at=saved.updated_at,
            document_count=0,
            adjustment_count=0,
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{property_id}",
    response_model=SavedPropertyResponse,
    summary="Get a saved property"
)
async def get_saved_property(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a specific saved property by ID."""
    saved = await saved_property_service.get_by_id(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
    )
    
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Update last viewed
    saved.last_viewed_at = saved.updated_at  # We'll update this properly later
    
    doc_count = len(saved.documents) if saved.documents else 0
    
    return SavedPropertyResponse(
        id=str(saved.id),
        user_id=str(saved.user_id),
        external_property_id=saved.external_property_id,
        zpid=saved.zpid,
        address_street=saved.address_street,
        address_city=saved.address_city,
        address_state=saved.address_state,
        address_zip=saved.address_zip,
        full_address=saved.full_address,
        nickname=saved.nickname,
        status=saved.status,
        tags=saved.tags,
        color_label=saved.color_label,
        priority=saved.priority,
        property_data_snapshot=saved.property_data_snapshot,
        custom_purchase_price=saved.custom_purchase_price,
        custom_rent_estimate=saved.custom_rent_estimate,
        custom_arv=saved.custom_arv,
        custom_rehab_budget=saved.custom_rehab_budget,
        custom_daily_rate=saved.custom_daily_rate,
        custom_occupancy_rate=saved.custom_occupancy_rate,
        custom_assumptions=saved.custom_assumptions,
        notes=saved.notes,
        best_strategy=saved.last_analytics_result.get("best_strategy") if saved.last_analytics_result else None,
        best_cash_flow=saved.last_analytics_result.get("best_cash_flow") if saved.last_analytics_result else None,
        best_coc_return=saved.last_analytics_result.get("best_coc_return") if saved.last_analytics_result else None,
        last_analytics_result=saved.last_analytics_result,
        analytics_calculated_at=saved.analytics_calculated_at,
        data_refreshed_at=saved.data_refreshed_at,
        saved_at=saved.saved_at,
        last_viewed_at=saved.last_viewed_at,
        updated_at=saved.updated_at,
        document_count=doc_count,
        adjustment_count=0,  # TODO: Add adjustment count
    )


@router.patch(
    "/{property_id}",
    response_model=SavedPropertyResponse,
    summary="Update a saved property"
)
async def update_saved_property(
    property_id: str,
    data: SavedPropertyUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a saved property's details, adjustments, or status."""
    saved = await saved_property_service.update_property(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
        data=data,
    )
    
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    return SavedPropertyResponse(
        id=str(saved.id),
        user_id=str(saved.user_id),
        external_property_id=saved.external_property_id,
        zpid=saved.zpid,
        address_street=saved.address_street,
        address_city=saved.address_city,
        address_state=saved.address_state,
        address_zip=saved.address_zip,
        full_address=saved.full_address,
        nickname=saved.nickname,
        status=saved.status,
        tags=saved.tags,
        color_label=saved.color_label,
        priority=saved.priority,
        property_data_snapshot=saved.property_data_snapshot,
        custom_purchase_price=saved.custom_purchase_price,
        custom_rent_estimate=saved.custom_rent_estimate,
        custom_arv=saved.custom_arv,
        custom_rehab_budget=saved.custom_rehab_budget,
        custom_daily_rate=saved.custom_daily_rate,
        custom_occupancy_rate=saved.custom_occupancy_rate,
        custom_assumptions=saved.custom_assumptions,
        notes=saved.notes,
        best_strategy=None,
        best_cash_flow=None,
        best_coc_return=None,
        last_analytics_result=saved.last_analytics_result,
        analytics_calculated_at=saved.analytics_calculated_at,
        data_refreshed_at=saved.data_refreshed_at,
        saved_at=saved.saved_at,
        last_viewed_at=saved.last_viewed_at,
        updated_at=saved.updated_at,
        document_count=0,
        adjustment_count=0,
    )


@router.delete(
    "/{property_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved property"
)
async def delete_saved_property(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a saved property."""
    deleted = await saved_property_service.delete_property(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )


# ===========================================
# Adjustment History
# ===========================================

@router.get(
    "/{property_id}/adjustments",
    response_model=List[PropertyAdjustmentResponse],
    summary="Get property adjustment history"
)
async def get_adjustment_history(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(50, ge=1, le=100),
):
    """Get the history of adjustments made to a saved property."""
    adjustments = await saved_property_service.get_adjustment_history(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
        limit=limit,
    )
    
    return [
        PropertyAdjustmentResponse(
            id=str(a.id),
            property_id=str(a.property_id),
            adjustment_type=a.adjustment_type,
            field_name=a.field_name,
            previous_value=a.previous_value,
            new_value=a.new_value,
            reason=a.reason,
            created_at=a.created_at,
        )
        for a in adjustments
    ]


@router.post(
    "/{property_id}/adjustments",
    response_model=PropertyAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an adjustment record"
)
async def add_adjustment(
    property_id: str,
    data: PropertyAdjustmentCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Manually add an adjustment record to a property."""
    adjustment = await saved_property_service.add_adjustment(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
        data=data,
    )
    
    if not adjustment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    return PropertyAdjustmentResponse(
        id=str(adjustment.id),
        property_id=str(adjustment.property_id),
        adjustment_type=adjustment.adjustment_type,
        field_name=adjustment.field_name,
        previous_value=adjustment.previous_value,
        new_value=adjustment.new_value,
        reason=adjustment.reason,
        created_at=adjustment.created_at,
    )
