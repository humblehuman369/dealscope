"""
Saved Properties router for user's property portfolio management.
"""

import logging
from datetime import UTC

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response, status
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import DatabaseError, IntegrityError

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.models.saved_property import PropertyStatus
from app.schemas.deal_maker import (
    DealMakerRecordUpdate,
    DealMakerResponse,
)
from app.schemas.saved_property import (
    BulkStatusUpdate,
    PropertyAdjustmentCreate,
    PropertyAdjustmentResponse,
    SavedPropertyCreate,
    SavedPropertyResponse,
    SavedPropertySummary,
    SavedPropertyUpdate,
)
from app.services.billing_service import billing_service
from app.services.deal_maker_service import DealMakerService
from app.services.saved_property_service import saved_property_service

logger = logging.getLogger(__name__)


def _build_saved_property_response(
    saved,
    *,
    deal_maker=None,
    best_strategy=None,
    best_cash_flow=None,
    best_coc_return=None,
    document_count: int = 0,
    adjustment_count: int = 0,
) -> SavedPropertyResponse:
    """Build a SavedPropertyResponse from a SavedProperty model instance.

    Centralises the 30-field constructor so every endpoint returns the
    same shape without field-list duplication.
    """
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
        tags=saved.tags or [],
        color_label=saved.color_label,
        priority=saved.priority,
        property_data_snapshot=saved.property_data_snapshot or {},
        custom_purchase_price=saved.custom_purchase_price,
        custom_rent_estimate=saved.custom_rent_estimate,
        custom_arv=saved.custom_arv,
        custom_rehab_budget=saved.custom_rehab_budget,
        custom_daily_rate=saved.custom_daily_rate,
        custom_occupancy_rate=saved.custom_occupancy_rate,
        custom_assumptions=saved.custom_assumptions or {},
        deal_maker_record=deal_maker,
        notes=saved.notes,
        best_strategy=best_strategy,
        best_cash_flow=best_cash_flow,
        best_coc_return=best_coc_return,
        last_analytics_result=saved.last_analytics_result,
        analytics_calculated_at=saved.analytics_calculated_at,
        data_refreshed_at=saved.data_refreshed_at,
        saved_at=saved.saved_at,
        last_viewed_at=saved.last_viewed_at,
        updated_at=saved.updated_at,
        document_count=document_count,
        adjustment_count=adjustment_count,
    )


router = APIRouter(prefix="/api/v1/properties/saved", tags=["Saved Properties"])


# ===========================================
# Lookup / Check
# ===========================================


@router.get("/check", summary="Check if a property is saved")
async def check_property_saved(
    current_user: CurrentUser,
    db: DbSession,
    address: str | None = Query(None, description="Full address to check"),
    external_id: str | None = Query(None, description="External property ID to check"),
):
    """
    Check if a property is already saved by the current user.
    Returns saved property id and status if found, or null.
    """
    saved = await saved_property_service.get_by_address_or_id(
        db=db,
        user_id=str(current_user.id),
        external_id=external_id,
        address=address,
    )

    if saved:
        return {
            "is_saved": True,
            "saved_property_id": str(saved.id),
            "status": saved.status.value if saved.status else "watching",
            "saved_at": saved.saved_at,
        }

    return {"is_saved": False, "saved_property_id": None, "status": None, "saved_at": None}


# ===========================================
# List & Stats
# ===========================================

_MAX_OFFSET = 10_000  # Hard ceiling to prevent deep-pagination perf degradation


@router.get("", response_model=list[SavedPropertySummary], summary="List saved properties")
async def list_saved_properties(
    current_user: CurrentUser,
    db: DbSession,
    response: Response,
    status: PropertyStatus | None = Query(None, description="Filter by status"),
    tags: str | None = Query(None, description="Filter by tags (comma-separated)"),
    search: str | None = Query(None, description="Search in address, nickname, notes"),
    order_by: str = Query("saved_at_desc", description="Order by field"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0, le=_MAX_OFFSET),
):
    """
    List all saved properties for the current user.

    Supports filtering by status, tags, and free-text search.
    Returns ``X-Total-Count`` header for frontend pagination.
    """
    tag_list = tags.split(",") if tags else None

    properties, total = await saved_property_service.list_properties(
        db=db,
        user_id=str(current_user.id),
        status=status,
        tags=tag_list,
        search=search,
        limit=limit,
        offset=offset,
        order_by=order_by,
    )

    response.headers["X-Total-Count"] = str(total)

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
            best_strategy=p.best_strategy,
            best_cash_flow=p.best_cash_flow,
            best_coc_return=p.best_coc_return,
            saved_at=p.saved_at,
            last_viewed_at=p.last_viewed_at,
            updated_at=p.updated_at,
        )
        for p in properties
    ]


@router.get("/stats", summary="Get saved properties statistics")
async def get_saved_properties_stats(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get statistics about saved properties (counts by status, etc.)."""
    return await saved_property_service.get_stats(db, str(current_user.id))


# ===========================================
# Bulk Operations (MUST be before /{property_id} routes)
# ===========================================


@router.post("/bulk/status", summary="Bulk update property status")
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


@router.delete("/bulk", summary="Bulk delete properties")
async def bulk_delete_properties(
    property_ids: list[str],
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


@router.post("", response_model=SavedPropertyResponse, status_code=status.HTTP_201_CREATED, summary="Save a property")
async def save_property(
    data: SavedPropertyCreate,
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
):
    """
    Save a property to the user's portfolio.

    Includes property data snapshot at time of save.
    Also creates a DealMakerRecord with resolved defaults locked at save time.
    Enforces subscription property limit (Starter: 10, Pro: unlimited).
    """
    subscription = await billing_service.get_or_create_subscription(db, current_user.id)
    if not subscription.can_save_property():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Property save limit reached ({subscription.properties_limit} properties). Upgrade to Pro for unlimited saves.",
        )

    logger.info(f"Save property request received for user {current_user.id}")
    logger.debug(
        f"Property data: address={data.address_street}, zpid={data.zpid}, external_id={data.external_property_id}"
    )
    try:
        # If no deal_maker_record provided, create one from property data
        # Make this optional - if it fails, we can still save the property
        deal_maker_record_obj = None
        if not data.deal_maker_record and data.property_data_snapshot:
            try:
                zip_code = data.address_zip or data.property_data_snapshot.get("zipCode")
                deal_maker_record_obj = DealMakerService.create_from_property_data(
                    property_data=data.property_data_snapshot,
                    zip_code=zip_code,
                )
            except Exception as e:
                # Log the error but don't fail the save operation
                logger.warning(
                    f"Failed to create DealMakerRecord for property save: {e!s}. "
                    f"Property will be saved without DealMakerRecord."
                )
                logger.debug(f"DealMakerRecord creation error details: {e}", exc_info=True)

        # Update data with deal_maker_record if we successfully created one
        # Only do this if data.deal_maker_record is not already set
        if deal_maker_record_obj is not None and not data.deal_maker_record:
            # Create updated data dict with deal_maker_record
            # Convert DealMakerRecord to dict first to ensure proper serialization
            try:
                # Convert DealMakerRecord object to dict if needed
                deal_maker_dict = None
                if hasattr(deal_maker_record_obj, "model_dump"):
                    deal_maker_dict = deal_maker_record_obj.model_dump(mode="json")
                elif isinstance(deal_maker_record_obj, dict):
                    deal_maker_dict = deal_maker_record_obj
                else:
                    # Unexpected type, skip adding it
                    logger.warning(f"Unexpected deal_maker_record_obj type: {type(deal_maker_record_obj)}")

                if deal_maker_dict is not None:
                    data_dict = data.model_dump(exclude_unset=True)
                    data_dict["deal_maker_record"] = deal_maker_dict
                    data = SavedPropertyCreate(**data_dict)
            except (PydanticValidationError, Exception) as validation_error:
                logger.warning(
                    f"Failed to validate SavedPropertyCreate with DealMakerRecord: {validation_error}. "
                    f"Saving without DealMakerRecord."
                )
                logger.debug(f"Validation error details: {validation_error}", exc_info=True)
                # Fall back to original data without deal_maker_record
                # Don't modify the original data object, just continue without deal_maker_record
                # The service will handle None deal_maker_record

        saved = await saved_property_service.save_property(
            db=db,
            user_id=str(current_user.id),
            data=data,
        )

        # Reconstruct DealMakerRecord from stored dict for response
        # Note: We return the DealMakerRecord object, but if reconstruction fails,
        # we can still return the response without it
        deal_maker = None
        if saved.deal_maker_record:
            try:
                # saved.deal_maker_record is already a dict, convert to DealMakerRecord object
                if isinstance(saved.deal_maker_record, dict):
                    deal_maker = DealMakerService.from_dict(saved.deal_maker_record)
                elif hasattr(saved.deal_maker_record, "model_dump"):
                    # Already a DealMakerRecord object
                    deal_maker = saved.deal_maker_record
                else:
                    logger.warning(f"Unexpected deal_maker_record type: {type(saved.deal_maker_record)}")
            except Exception as e:
                logger.warning(f"Failed to reconstruct DealMakerRecord: {e!s}")
                logger.debug(f"DealMakerRecord reconstruction error details: {e}", exc_info=True)
                # Continue without deal_maker - property is still saved

        # Send push notification in background (non-blocking).
        # IMPORTANT: Background tasks run AFTER the response is sent, so the
        # request-scoped ``db`` session is already closed.  We must create a
        # fresh session inside the task.
        try:
            from app.services.push_notification_service import push_service

            address_display = saved.full_address or saved.address_street or "Property"
            _user_id = current_user.id
            _full_address = saved.full_address or saved.address_street

            async def _send_save_notification():
                from app.db.session import get_session_factory

                factory = get_session_factory()
                async with factory() as task_db:
                    try:
                        await push_service.send_to_user(
                            task_db,
                            _user_id,
                            title="Property Saved",
                            body=f"{address_display} added to your watchlist.",
                            data={"type": "property", "address": _full_address},
                            category="property_alerts",
                            channel_id="property-alerts",
                        )
                        await task_db.commit()
                    except Exception as exc:
                        await task_db.rollback()
                        logger.warning("Background save notification failed: %s", exc)

            background_tasks.add_task(_send_save_notification)
        except Exception as notify_exc:
            logger.warning("Failed to queue save notification: %s", notify_exc)

        # Build response
        try:
            return _build_saved_property_response(saved, deal_maker=deal_maker)
        except (PydanticValidationError, ValueError, TypeError) as response_error:
            logger.error(f"Failed to construct SavedPropertyResponse: {response_error}", exc_info=True)
            logger.error(f"Saved property ID: {saved.id}, User ID: {saved.user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Property saved but response construction failed: {str(response_error) if settings.DEBUG else 'Internal error'}",
            )
        except Exception as response_error:
            logger.error(f"Unexpected error constructing SavedPropertyResponse: {response_error}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Property saved but response construction failed: {str(response_error) if settings.DEBUG else 'Internal error'}",
            )

    except ValueError as e:
        # Check if it's a duplicate property error
        error_msg = str(e)
        if "already in your saved list" in error_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
    except IntegrityError as e:
        # Database constraint violation (e.g., duplicate key)
        logger.error(f"Database integrity error saving property: {e!s}", exc_info=True)
        error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="This property is already in your saved list"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database constraint violation. Please check your input."
            if settings.DEBUG
            else "Failed to save property. Please try again.",
        )
    except DatabaseError as e:
        # Other database errors
        logger.error(f"Database error saving property: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
            if settings.DEBUG
            else "Failed to save property. Please try again or contact support.",
        )
    except HTTPException:
        # Re-raise HTTPExceptions as-is (they already have proper format)
        raise
    except ExceptionGroup as eg:
        # Handle ExceptionGroup (Python 3.11+)
        logger.error(f"ExceptionGroup error saving property: {eg}", exc_info=True)
        # Extract the first exception from the group for error message
        first_exception = eg.exceptions[0] if eg.exceptions else eg
        error_message = (
            str(first_exception) if settings.DEBUG else "Failed to save property. Please try again or contact support."
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_message)
    except Exception as e:
        # Catch all other exceptions and log them properly
        logger.error(f"Unexpected error saving property: {e!s}", exc_info=True)
        logger.error(f"Exception type: {type(e).__name__}", exc_info=True)
        # In production, don't expose internal error details
        error_message = str(e) if settings.DEBUG else "Failed to save property. Please try again or contact support."
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_message)


@router.get("/{property_id}", response_model=SavedPropertyResponse, summary="Get a saved property")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Update last viewed timestamp
    from datetime import datetime

    saved.last_viewed_at = datetime.now(UTC)
    await db.commit()

    doc_count = len(saved.documents) if saved.documents else 0

    # Reconstruct DealMakerRecord from stored dict
    deal_maker = None
    if saved.deal_maker_record:
        deal_maker = DealMakerService.from_dict(saved.deal_maker_record)

    return _build_saved_property_response(
        saved,
        deal_maker=deal_maker,
        best_strategy=saved.best_strategy,
        best_cash_flow=saved.best_cash_flow,
        best_coc_return=saved.best_coc_return,
        document_count=doc_count,
    )


@router.patch("/{property_id}", response_model=SavedPropertyResponse, summary="Update a saved property")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Reconstruct DealMakerRecord from stored dict
    deal_maker = None
    if saved.deal_maker_record:
        deal_maker = DealMakerService.from_dict(saved.deal_maker_record)

    return _build_saved_property_response(saved, deal_maker=deal_maker)


@router.patch("/{property_id}/deal-maker", response_model=DealMakerResponse, summary="Update Deal Maker values")
async def update_deal_maker(
    property_id: str,
    updates: DealMakerRecordUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update Deal Maker values for a saved property.

    This is the primary endpoint for Deal Maker UI changes.
    Updates are persisted immediately and metrics are recalculated.

    Note: initial_assumptions cannot be changed - they are locked at save time.
    """
    # Get the saved property
    saved = await saved_property_service.get_by_id(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
    )

    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Get or create DealMakerRecord
    if saved.deal_maker_record:
        record = DealMakerService.from_dict(saved.deal_maker_record)
    else:
        # Create from property data if doesn't exist
        zip_code = saved.address_zip or (
            saved.property_data_snapshot.get("zipCode") if saved.property_data_snapshot else None
        )
        record = DealMakerService.create_from_property_data(
            property_data=saved.property_data_snapshot or {},
            zip_code=zip_code,
        )

    # Apply updates and recalculate metrics
    updated_record = DealMakerService.update_record(record, updates)

    # Save to database
    saved.deal_maker_record = DealMakerService.to_dict(updated_record)
    await db.commit()
    await db.refresh(saved)

    # Return response with convenience fields
    metrics = updated_record.cached_metrics

    return DealMakerResponse(
        record=updated_record,
        cash_needed=metrics.total_cash_needed if metrics else None,
        deal_gap=metrics.deal_gap_pct if metrics else None,
        annual_profit=metrics.annual_cash_flow if metrics else None,
        cap_rate=metrics.cap_rate if metrics else None,
        coc_return=metrics.cash_on_cash if metrics else None,
        monthly_payment=metrics.monthly_payment if metrics else None,
    )


@router.get("/{property_id}/deal-maker", response_model=DealMakerResponse, summary="Get Deal Maker record")
async def get_deal_maker(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get the Deal Maker record for a saved property.

    Returns the full DealMakerRecord with cached metrics.
    If no record exists, one will be created from property data.
    """
    saved = await saved_property_service.get_by_id(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
    )

    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Get or create DealMakerRecord
    if saved.deal_maker_record:
        record = DealMakerService.from_dict(saved.deal_maker_record)
    else:
        # Create from property data if doesn't exist
        zip_code = saved.address_zip or (
            saved.property_data_snapshot.get("zipCode") if saved.property_data_snapshot else None
        )
        record = DealMakerService.create_from_property_data(
            property_data=saved.property_data_snapshot or {},
            zip_code=zip_code,
        )

        # Save the newly created record
        saved.deal_maker_record = DealMakerService.to_dict(record)
        await db.commit()
        await db.refresh(saved)

    metrics = record.cached_metrics

    return DealMakerResponse(
        record=record,
        cash_needed=metrics.total_cash_needed if metrics else None,
        deal_gap=metrics.deal_gap_pct if metrics else None,
        annual_profit=metrics.annual_cash_flow if metrics else None,
        cap_rate=metrics.cap_rate if metrics else None,
        coc_return=metrics.cash_on_cash if metrics else None,
        monthly_payment=metrics.monthly_payment if metrics else None,
    )


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a saved property")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")


# ===========================================
# Adjustment History
# ===========================================


@router.get(
    "/{property_id}/adjustments",
    response_model=list[PropertyAdjustmentResponse],
    summary="Get property adjustment history",
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
    summary="Add an adjustment record",
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

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
