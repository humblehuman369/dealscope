"""
Saved Properties router for user's property portfolio management.
"""

import logging
import uuid
from datetime import UTC

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, Response, UploadFile, status
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import DatabaseError, IntegrityError

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.schema_guard import is_schema_mismatch, log_schema_mismatch
from app.models.saved_property import FlipStage as FlipStageORM
from app.models.saved_property import PropertyStatus
from app.schemas.budget import (
    BudgetExpenseCreate,
    BudgetExpenseOut,
    BudgetLinePctCompleteUpdate,
    BudgetSeedRequest,
    BudgetSummaryOut,
    ParsedReceipt,
    ReceiptUploadResponse,
)
from app.schemas.contact import ContactCreate, ContactOut, ContactUpdate
from app.schemas.deal_maker import (
    DealMakerRecordUpdate,
    DealMakerResponse,
)
from app.schemas.saved_property import (
    ActiveFlipSummary,
    BulkStatusUpdate,
    FlipStageUpdate,
    PropertyAdjustmentCreate,
    PropertyAdjustmentResponse,
    SavedPropertyCreate,
    SavedPropertyResponse,
    SavedPropertySummary,
    SavedPropertyUpdate,
)
from app.schemas.task import TaskCreate, TaskOut, TaskReorderRequest, TaskUpdate, UpcomingTaskOut
from app.schemas.timeline import NoteCreate, TimelineEvent
from app.services.billing_service import billing_service
from app.services.budget_service import budget_service
from app.services.contact_service import contact_service
from app.services.deal_maker_service import DealMakerService
from app.services.document_service import ALLOWED_TYPES as DOC_ALLOWED_TYPES
from app.services.document_service import document_service
from app.services.receipt_parser_service import receipt_parser_service
from app.services.saved_property_service import sanitize_for_json_storage, saved_property_service
from app.services.search_history_service import search_history_service
from app.services.task_service import task_service
from app.services.timeline_service import timeline_service

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
        flip_stage=saved.flip_stage,
        flip_stage_entered_at=saved.flip_stage_entered_at,
        acquired_at=saved.acquired_at,
        rehab_started_at=saved.rehab_started_at,
        listed_at=saved.listed_at,
        sold_at=saved.sold_at,
        sold_price=saved.sold_price,
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
        status_changed_at=saved.status_changed_at,
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
    zpid: str | None = Query(None, description="Zillow property ID to check"),
):
    """
    Check if a property is already saved by the current user.
    Returns saved property id and status if found, or null.
    """
    try:
        saved = await saved_property_service.get_by_address_or_id(
            db=db,
            user_id=str(current_user.id),
            external_id=external_id,
            address=address,
            zpid=zpid,
        )
    except Exception as exc:
        # Schema-mismatch fallback: pretend the property isn't saved so the
        # frontend's save toggle stays clickable. See app/core/schema_guard.py.
        if not is_schema_mismatch(exc):
            raise
        log_schema_mismatch("GET /properties/saved/check", exc)
        return {"is_saved": False, "saved_property_id": None, "status": None, "saved_at": None}

    if saved:
        return {
            "is_saved": True,
            "saved_property_id": str(saved.id),
            "status": saved.status.value if saved.status else "prospecting",
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

    try:
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
    except Exception as exc:
        # Schema-mismatch fallback: render the page as "no properties yet"
        # rather than a hard 500. See app/core/schema_guard.py.
        if not is_schema_mismatch(exc):
            raise
        log_schema_mismatch("GET /properties/saved", exc)
        response.headers["X-Total-Count"] = "0"
        return []

    response.headers["X-Total-Count"] = str(total)

    # Variance is rendered on Owned cards only — fetch it just for those
    # rows. ``budget_service.build_summary`` does its own DB roundtrip per
    # property, so limiting the lookup to owned rows keeps the list endpoint
    # cheap for the typical case where most rows are pre-purchase.
    owned_variance: dict[str, str | None] = {}
    owned_rows = [p for p in properties if p.status == PropertyStatus.OWNED]
    if owned_rows:
        uid_str = str(current_user.id)
        for p in owned_rows:
            try:
                budget = await budget_service.get_budget_for_property(db, str(p.id), uid_str)
                if budget:
                    summary = await budget_service.build_summary(db, budget)
                    owned_variance[str(p.id)] = summary.get("variance_pct")
            except Exception as exc:
                # Same defensive posture as the active-flips endpoint — a
                # missing budget table during a deploy gap shouldn't break
                # the dashboard. See app/core/schema_guard.py.
                if not is_schema_mismatch(exc):
                    raise
                log_schema_mismatch("GET /properties/saved:budget_enrichment", exc)

    # Bulk-load open task counts in a single GROUP BY — avoids the N+1 we'd
    # get from per-property summary calls. Skip when the page is empty.
    task_counts: dict[str, dict[str, int]] = {}
    if properties:
        try:
            from datetime import datetime as _dt

            from sqlalchemy import and_ as _and
            from sqlalchemy import func as _func
            from sqlalchemy import select as _select

            from app.models.task import PropertyTask

            now_utc = _dt.now(UTC)
            ids = [p.id for p in properties]
            stmt = (
                _select(
                    PropertyTask.saved_property_id,
                    _func.count().filter(PropertyTask.completed_at.is_(None)).label("open"),
                    _func.count()
                    .filter(
                        _and(
                            PropertyTask.completed_at.is_(None),
                            PropertyTask.due_date.is_not(None),
                            PropertyTask.due_date < now_utc,
                        )
                    )
                    .label("overdue"),
                )
                .where(PropertyTask.saved_property_id.in_(ids))
                .group_by(PropertyTask.saved_property_id)
            )
            rows = (await db.execute(stmt)).all()
            for prop_id, open_count, overdue in rows:
                task_counts[str(prop_id)] = {"open": int(open_count), "overdue": int(overdue)}
        except Exception as exc:
            # Tasks table may not exist yet during a deploy gap.
            if not is_schema_mismatch(exc):
                raise
            log_schema_mismatch("GET /properties/saved:task_count_enrichment", exc)

    return [
        SavedPropertySummary(
            id=str(p.id),
            address_street=p.address_street,
            address_city=p.address_city,
            address_state=p.address_state,
            address_zip=p.address_zip,
            nickname=p.nickname,
            status=p.status,
            flip_stage=p.flip_stage,
            flip_stage_entered_at=p.flip_stage_entered_at,
            acquired_at=p.acquired_at,
            rehab_started_at=p.rehab_started_at,
            listed_at=p.listed_at,
            sold_at=p.sold_at,
            sold_price=p.sold_price,
            tags=p.tags,
            color_label=p.color_label,
            priority=p.priority,
            best_strategy=p.best_strategy,
            best_cash_flow=p.best_cash_flow,
            best_coc_return=p.best_coc_return,
            saved_at=p.saved_at,
            last_viewed_at=p.last_viewed_at,
            updated_at=p.updated_at,
            status_changed_at=p.status_changed_at,
            budget_variance_pct=owned_variance.get(str(p.id)),
            task_count_open=task_counts.get(str(p.id), {}).get("open", 0),
            task_count_overdue=task_counts.get(str(p.id), {}).get("overdue", 0),
        )
        for p in properties
    ]


@router.get("/stats", summary="Get saved properties statistics")
async def get_saved_properties_stats(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get statistics about saved properties (counts by status, etc.)."""
    try:
        return await saved_property_service.get_stats(db, str(current_user.id))
    except Exception as exc:
        # Schema-mismatch fallback: dashboard counters render as zeros instead
        # of erroring. See app/core/schema_guard.py.
        if not is_schema_mismatch(exc):
            raise
        log_schema_mismatch("GET /properties/saved/stats", exc)
        return {
            "total": 0,
            "by_status": {status.value: 0 for status in PropertyStatus},
        }


@router.get("/active-flips", response_model=list[ActiveFlipSummary], summary="Active flips (flip-cycle pipeline)")
async def list_active_flips_endpoint(
    current_user: CurrentUser,
    db: DbSession,
    include_sold: bool = Query(False, description="Include properties in Sold stage"),
):
    """Properties with a flip_stage set — Acquisition / Rehab / Listed / (optional Sold)."""
    try:
        rows = await saved_property_service.list_active_flips(db, str(current_user.id), include_sold=include_sold)
    except Exception as exc:
        # Schema-mismatch fallback: Pipeline page renders the "no active flips
        # yet" empty state instead of erroring. See app/core/schema_guard.py.
        if not is_schema_mismatch(exc):
            raise
        log_schema_mismatch("GET /properties/saved/active-flips", exc)
        return []

    out: list[ActiveFlipSummary] = []
    uid = str(current_user.id)
    for p in rows:
        variance_pct: str | None = None
        try:
            budget = await budget_service.get_budget_for_property(db, str(p.id), uid)
            if budget:
                summary = await budget_service.build_summary(db, budget)
                variance_pct = summary.get("variance_pct")
        except Exception as exc:
            # Budget tables (rehab_budgets / budget_lines / budget_expenses)
            # may not exist yet during a deploy gap. Don't let that block the
            # whole pipeline — render the card without a budget badge.
            if not is_schema_mismatch(exc):
                raise
            log_schema_mismatch("GET /properties/saved/active-flips:budget_enrichment", exc)
            variance_pct = None
        out.append(
            ActiveFlipSummary(
                id=str(p.id),
                address_street=p.address_street,
                address_city=p.address_city,
                address_state=p.address_state,
                address_zip=p.address_zip,
                nickname=p.nickname,
                status=p.status,
                flip_stage=p.flip_stage,
                flip_stage_entered_at=p.flip_stage_entered_at,
                acquired_at=p.acquired_at,
                rehab_started_at=p.rehab_started_at,
                listed_at=p.listed_at,
                sold_at=p.sold_at,
                sold_price=p.sold_price,
                tags=p.tags,
                color_label=p.color_label,
                priority=p.priority,
                best_strategy=p.best_strategy,
                best_cash_flow=p.best_cash_flow,
                best_coc_return=p.best_coc_return,
                saved_at=p.saved_at,
                last_viewed_at=p.last_viewed_at,
                updated_at=p.updated_at,
                status_changed_at=p.status_changed_at,
                budget_variance_pct=variance_pct,
            )
        )
    return out


@router.get(
    "/tasks/upcoming",
    response_model=list[UpcomingTaskOut],
    summary="Tasks due soon across all of the user's properties",
)
async def list_upcoming_tasks(
    current_user: CurrentUser,
    db: DbSession,
    days: int = Query(7, ge=1, le=60),
    include_overdue: bool = Query(True),
    limit: int = Query(50, ge=1, le=100),
):
    """Drives the dashboard "Due this week" widget. Includes overdue items by
    default — they're the highest-signal ones the user needs to see."""
    try:
        rows = await task_service.list_upcoming_for_user(
            db,
            str(current_user.id),
            days_ahead=days,
            include_overdue=include_overdue,
            limit=limit,
        )
    except Exception as exc:
        # Tasks table may not exist yet during a deploy gap — render an empty
        # widget rather than a hard 500.
        if not is_schema_mismatch(exc):
            raise
        log_schema_mismatch("GET /properties/saved/tasks/upcoming", exc)
        return []
    return rows


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
    if not current_user.is_superuser and not subscription.can_save_property():
        props_limit = subscription.tier_properties_limit()
        if subscription.is_premium():
            detail = "Unable to save property. Please contact support."
        else:
            detail = (
                f"Property save limit reached ({subscription.properties_count}/{props_limit} properties). "
                "Upgrade to Pro for unlimited saves."
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

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

        # Mark the corresponding search history entry as saved
        try:
            await search_history_service.mark_as_saved(
                db=db,
                user_id=str(current_user.id),
                property_cache_id=saved.external_property_id,
                zpid=saved.zpid,
                full_address=saved.full_address,
            )
        except Exception as e:
            logger.warning("Failed to mark search history as saved: %s", e)

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


@router.patch(
    "/{property_id}/flip-stage",
    response_model=SavedPropertyResponse,
    summary="Update flip-cycle stage (Acquisition / Rehab / Listed / Sold)",
)
async def update_flip_stage_endpoint(
    property_id: str,
    body: FlipStageUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Advance or move the post-acquisition flip pipeline."""
    stage_orm = FlipStageORM(body.stage.value)
    saved = await saved_property_service.update_flip_stage(
        db,
        property_id=property_id,
        user_id=str(current_user.id),
        stage=stage_orm,
        sold_price=body.sold_price,
    )
    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    deal_maker = None
    if saved.deal_maker_record:
        deal_maker = DealMakerService.from_dict(saved.deal_maker_record)
    return _build_saved_property_response(saved, deal_maker=deal_maker)


@router.post(
    "/{property_id}/budget/seed",
    response_model=BudgetSummaryOut,
    summary="Seed rehab budget from estimator selections",
)
async def seed_rehab_budget(
    property_id: str,
    body: BudgetSeedRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    selections = [s.model_dump(by_alias=True) for s in body.selections]
    try:
        budget = await budget_service.seed_budget(
            db,
            property_id,
            current_user.id,
            selections,
            body.contingency_pct,
            body.notes,
        )
        summary = await budget_service.build_summary(db, budget)
        return BudgetSummaryOut(**summary)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Budget baseline is locked")
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")


@router.get(
    "/{property_id}/budget",
    response_model=BudgetSummaryOut,
    summary="Get rehab budget summary (estimate vs actual)",
)
async def get_rehab_budget_summary(property_id: str, current_user: CurrentUser, db: DbSession):
    budget = await budget_service.get_budget_for_property(db, property_id, str(current_user.id))
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget for this property")
    summary = await budget_service.build_summary(db, budget)
    return BudgetSummaryOut(**summary)


@router.post("/{property_id}/budget/lock", response_model=BudgetSummaryOut, summary="Lock budget baseline")
async def lock_rehab_budget(property_id: str, current_user: CurrentUser, db: DbSession):
    b = await budget_service.lock_baseline(db, property_id, str(current_user.id))
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget for this property")
    summary = await budget_service.build_summary(db, b)
    return BudgetSummaryOut(**summary)


@router.post(
    "/{property_id}/budget/expenses",
    response_model=BudgetExpenseOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add an actual expense line",
)
async def add_budget_expense(
    property_id: str,
    body: BudgetExpenseCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    budget = await budget_service.get_budget_for_property(db, property_id, str(current_user.id))
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget for this property")
    line_id = uuid.UUID(body.budget_line_id) if body.budget_line_id else None
    receipt_id = uuid.UUID(body.receipt_document_id) if body.receipt_document_id else None
    ex = await budget_service.add_expense(
        db,
        budget,
        user_id=current_user.id,
        amount=body.amount,
        spent_on=body.spent_on,
        budget_line_id=line_id,
        vendor=body.vendor,
        description=body.description,
        receipt_document_id=receipt_id,
    )
    return BudgetExpenseOut(
        id=str(ex.id),
        budget_id=str(ex.budget_id),
        budget_line_id=str(ex.budget_line_id) if ex.budget_line_id else None,
        amount=str(ex.amount),
        spent_on=ex.spent_on,
        vendor=ex.vendor,
        description=ex.description,
        receipt_document_id=str(ex.receipt_document_id) if ex.receipt_document_id else None,
        created_at=ex.created_at,
    )


@router.patch(
    "/{property_id}/budget/lines/{line_id}/pct_complete",
    response_model=BudgetSummaryOut,
    summary="Update % complete on a single budget line",
)
async def update_budget_line_pct_complete(
    property_id: str,
    line_id: str,
    body: BudgetLinePctCompleteUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    line = await budget_service.update_line_pct_complete(
        db, property_id, str(current_user.id), line_id, body.pct_complete
    )
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget line not found")
    budget = await budget_service.get_budget_for_property(db, property_id, str(current_user.id))
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget for this property")
    summary = await budget_service.build_summary(db, budget)
    return BudgetSummaryOut(**summary)


@router.post(
    "/{property_id}/budget/receipts/parse",
    response_model=ReceiptUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a receipt + parse it with AI",
)
async def upload_and_parse_receipt(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
):
    """Stores the receipt as a Document and runs Claude vision against it.

    Returns ``{document_id, parsed}``. ``parsed`` may be null if the AI is
    disabled (no API key) or returned nothing usable — the frontend still
    has the document_id and shows an empty editable expense form so the
    user can type values manually.
    """
    # Verify ownership early; reuse the budget-line lookup so we can pass
    # available lines to the parser as classification context.
    budget = await budget_service.get_budget_for_property(db, property_id, str(current_user.id))
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget for this property")

    if not file.content_type or file.content_type not in DOC_ALLOWED_TYPES:
        allowed = ", ".join(sorted(DOC_ALLOWED_TYPES))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {allowed}",
        )

    content = await file.read()

    # 1) Persist the file as a generic Document — even when parsing fails the
    # upload is durable and linkable from BudgetExpense via receipt_document_id.
    from io import BytesIO

    from app.models.document import DocumentType

    try:
        document = await document_service.upload_document(
            db=db,
            user_id=str(current_user.id),
            file=BytesIO(content),
            filename=file.filename or "receipt",
            content_type=file.content_type,
            file_size=len(content),
            document_type=DocumentType.OTHER,
            property_id=property_id,
            description="Receipt (AI-parsed)",
        )
    except Exception as exc:
        logger.error("Receipt upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Receipt upload failed",
        )

    # 2) Pull the budget's line summary as classification context for the AI.
    summary = await budget_service.build_summary(db, budget)
    available_lines = [
        {"id": ln["id"], "label": ln["label"], "category_id": ln.get("category_id", "")}
        for ln in summary.get("lines", [])
    ]

    parsed_dict = await receipt_parser_service.parse(
        image_bytes=content,
        mime_type=file.content_type,
        available_lines=available_lines,
    )
    parsed = ParsedReceipt(**parsed_dict) if parsed_dict else None

    return ReceiptUploadResponse(document_id=str(document.id), parsed=parsed)


@router.delete(
    "/{property_id}/budget/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a budget expense line",
)
async def delete_budget_expense(
    property_id: str,
    expense_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    ok = await budget_service.delete_expense(db, expense_id, str(current_user.id), property_id=property_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")


# ===========================================
# Property Tasks
# ===========================================


def _task_to_out(task) -> TaskOut:
    return TaskOut(
        id=str(task.id),
        saved_property_id=str(task.saved_property_id),
        title=task.title,
        notes=task.notes,
        due_date=task.due_date,
        completed_at=task.completed_at,
        sort_order=task.sort_order,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get(
    "/{property_id}/tasks",
    response_model=list[TaskOut],
    summary="List tasks for a saved property",
)
async def list_property_tasks(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    tasks = await task_service.list_for_property(db, property_id, str(current_user.id))
    if tasks is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return [_task_to_out(t) for t in tasks]


@router.post(
    "/{property_id}/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a task on a saved property",
)
async def create_property_task(
    property_id: str,
    body: TaskCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    task = await task_service.create(db, property_id, str(current_user.id), body)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return _task_to_out(task)


@router.patch(
    "/{property_id}/tasks/{task_id}",
    response_model=TaskOut,
    summary="Update a task (toggle complete, edit fields)",
)
async def update_property_task(
    property_id: str,
    task_id: str,
    body: TaskUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    task = await task_service.update(db, task_id, str(current_user.id), body)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _task_to_out(task)


@router.delete(
    "/{property_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
)
async def delete_property_task(
    property_id: str,
    task_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    ok = await task_service.delete(db, task_id, str(current_user.id))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


@router.post(
    "/{property_id}/tasks/reorder",
    response_model=list[TaskOut],
    summary="Reorder tasks by sending IDs in their new desired order",
)
async def reorder_property_tasks(
    property_id: str,
    body: TaskReorderRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    updated = await task_service.reorder_for_property(db, property_id, str(current_user.id), body.task_ids)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    # Return the property's tasks in their new order so the client can
    # rehydrate without a separate GET. Re-list ensures the response includes
    # tasks not in the reorder request (they keep prior sort_order).
    fresh = await task_service.list_for_property(db, property_id, str(current_user.id))
    if fresh is None:
        return [_task_to_out(t) for t in updated]
    return [_task_to_out(t) for t in fresh]


@router.post(
    "/{property_id}/tasks/seed",
    response_model=list[TaskOut],
    status_code=status.HTTP_201_CREATED,
    summary="Seed common tasks for the property's current stage",
)
async def seed_property_tasks(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a small set of suggested tasks based on the property's pipeline
    state (and strategy + flip stage for owned properties). Skips items whose
    title already exists, so calling twice is safe.
    """
    created = await task_service.seed_for_property(db, property_id, str(current_user.id))
    if created is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return [_task_to_out(t) for t in created]


# ===========================================
# Property Contacts
# ===========================================


def _contact_to_out(c) -> ContactOut:
    return ContactOut(
        id=str(c.id),
        saved_property_id=str(c.saved_property_id),
        name=c.name,
        role=c.role,
        company=c.company,
        phone=c.phone,
        email=c.email,
        notes=c.notes,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get(
    "/{property_id}/contacts",
    response_model=list[ContactOut],
    summary="List contacts for a saved property",
)
async def list_property_contacts(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    contacts = await contact_service.list_for_property(db, property_id, str(current_user.id))
    if contacts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return [_contact_to_out(c) for c in contacts]


@router.post(
    "/{property_id}/contacts",
    response_model=ContactOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a contact (seller, agent, lender, etc.)",
)
async def create_property_contact(
    property_id: str,
    body: ContactCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    contact = await contact_service.create(db, property_id, str(current_user.id), body)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return _contact_to_out(contact)


@router.patch(
    "/{property_id}/contacts/{contact_id}",
    response_model=ContactOut,
    summary="Update a contact",
)
async def update_property_contact(
    property_id: str,
    contact_id: str,
    body: ContactUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    contact = await contact_service.update(db, contact_id, str(current_user.id), body)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return _contact_to_out(contact)


@router.delete(
    "/{property_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a contact",
)
async def delete_property_contact(
    property_id: str,
    contact_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    ok = await contact_service.delete(db, contact_id, str(current_user.id))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")


# ===========================================
# Property Timeline (Activity)
# ===========================================


@router.get(
    "/{property_id}/timeline",
    response_model=list[TimelineEvent],
    summary="Per-property activity timeline",
)
async def list_property_timeline(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(100, ge=1, le=500),
):
    events = await timeline_service.list_for_property(db, property_id, str(current_user.id), limit=limit)
    if events is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return events


@router.post(
    "/{property_id}/timeline/notes",
    response_model=TimelineEvent,
    status_code=status.HTTP_201_CREATED,
    summary="Add a user-authored note to the timeline",
)
async def add_property_note(
    property_id: str,
    body: NoteCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    adj = await timeline_service.add_note(db, property_id, str(current_user.id), body.text)
    if adj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return TimelineEvent(
        id=f"adj:{adj.id}",
        kind="note",
        occurred_at=adj.created_at,
        title=adj.reason or "Note",
        body=None,
        meta={"adjustment_id": str(adj.id)},
    )


@router.delete(
    "/{property_id}/timeline/notes/{adjustment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user-authored note",
)
async def delete_property_note(
    property_id: str,
    adjustment_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    ok = await timeline_service.delete_note(db, property_id, str(current_user.id), adjustment_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")


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

    # Get or rebuild DealMakerRecord.
    # NOTE: from_dict returns None when the stored record is missing fields
    # that the current schema requires (older saves, partial migrations).
    # Treat that the same as "no record yet" and seed a fresh one from the
    # property snapshot + PATCH payload so users on legacy data can still
    # apply Appraiser values without hitting a 500.
    record = DealMakerService.from_dict(saved.deal_maker_record) if saved.deal_maker_record else None
    if record is None:
        zip_code = saved.address_zip or (
            saved.property_data_snapshot.get("zipCode") if saved.property_data_snapshot else None
        )
        snapshot = dict(saved.property_data_snapshot or {})
        updates_dict = updates.model_dump(exclude_unset=True)
        if updates_dict.get("market_value_override"):
            mv = updates_dict["market_value_override"]
            snapshot.setdefault("listPrice", mv)
            snapshot.setdefault("list_price", mv)
        if updates_dict.get("arv"):
            snapshot.setdefault("arv", updates_dict["arv"])
        if updates_dict.get("monthly_rent_override"):
            rent = updates_dict["monthly_rent_override"]
            snapshot.setdefault("monthlyRent", rent)
            snapshot.setdefault("rent_estimate", rent)
        record = DealMakerService.create_from_property_data(
            property_data=snapshot,
            zip_code=zip_code,
        )

    # Apply updates and recalculate metrics
    updated_record = DealMakerService.update_record(record, updates)

    # Save to database (sanitize so JSONB never gets inf/nan)
    saved.deal_maker_record = sanitize_for_json_storage(DealMakerService.to_dict(updated_record))
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

    # Get or rebuild DealMakerRecord. ``from_dict`` returns None if the stored
    # record can't satisfy the current schema (legacy saves) — rebuild from
    # snapshot and persist so the user is back on a clean record.
    record = DealMakerService.from_dict(saved.deal_maker_record) if saved.deal_maker_record else None
    if record is None:
        zip_code = saved.address_zip or (
            saved.property_data_snapshot.get("zipCode") if saved.property_data_snapshot else None
        )
        record = DealMakerService.create_from_property_data(
            property_data=saved.property_data_snapshot or {},
            zip_code=zip_code,
        )

        saved.deal_maker_record = sanitize_for_json_storage(DealMakerService.to_dict(record))
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
    # Fetch identifiers before deletion so we can unmark search history
    saved = await saved_property_service.get_by_id(db=db, property_id=property_id, user_id=str(current_user.id))
    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    _ext_id = saved.external_property_id
    _zpid = saved.zpid
    _addr = saved.full_address

    deleted = await saved_property_service.delete_property(
        db=db,
        property_id=property_id,
        user_id=str(current_user.id),
    )

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    try:
        await search_history_service.unmark_as_saved(
            db=db,
            user_id=str(current_user.id),
            property_cache_id=_ext_id,
            zpid=_zpid,
            full_address=_addr,
        )
    except Exception as e:
        logger.warning("Failed to unmark search history as saved: %s", e)


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
