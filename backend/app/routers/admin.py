"""
Admin router for platform administration.

Access is controlled by RBAC permissions via ``require_permission``.
The legacy ``SuperUser`` dependency is no longer used here.
"""

import logging
from typing import Optional, List
from pathlib import Path
import json

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from app.core.deps import DbSession, require_permission
from app.models.user import User
from app.models.audit_log import AuditAction
from app.repositories.audit_repository import audit_repo
from app.services.admin_service import admin_service
from app.schemas.admin import (
    AdminUserResponse, AdminUserUpdate, PlatformStats,
    AdminAssumptionsResponse, MetricsGlossaryResponse,
)
from app.schemas.property import AllAssumptions
from app.services.assumptions_service import (
    get_assumptions_record,
    get_default_assumptions,
    upsert_default_assumptions,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


# ===========================================
# Platform Statistics
# ===========================================

@router.get(
    "/stats",
    response_model=PlatformStats,
    summary="Get platform statistics",
    dependencies=[Depends(require_permission("admin:stats"))],
)
async def get_platform_stats(
    db: DbSession,
):
    """Get overall platform statistics. Requires ``admin:stats`` permission."""
    stats = await admin_service.get_platform_stats(db)
    return PlatformStats(**stats)


# ===========================================
# User Management
# ===========================================

_MAX_OFFSET = 10_000  # Hard ceiling to prevent deep-pagination perf degradation


@router.get(
    "/users",
    response_model=List[AdminUserResponse],
    summary="List all users",
    dependencies=[Depends(require_permission("admin:users"))],
)
async def list_users(
    db: DbSession,
    response: Response,
    search: Optional[str] = Query(None, description="Search by email or name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_superuser: Optional[bool] = Query(None, description="Filter by admin status"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0, le=_MAX_OFFSET),
    order_by: str = Query("created_at_desc", description="Order by field"),
):
    """List all users with optional filtering.

    Requires ``admin:users`` permission.
    Returns ``X-Total-Count`` header for frontend pagination.
    """
    users, total = await admin_service.list_users(
        db=db,
        search=search,
        is_active=is_active,
        is_superuser=is_superuser,
        limit=limit,
        offset=offset,
        order_by=order_by,
    )
    response.headers["X-Total-Count"] = str(total)
    return [AdminUserResponse(**user) for user in users]


# ===========================================
# Assumptions & Metrics Glossary
# ===========================================

@router.get(
    "/assumptions",
    response_model=AdminAssumptionsResponse,
    summary="Get admin default assumptions",
    dependencies=[Depends(require_permission("admin:assumptions"))],
)
async def get_admin_assumptions(
    db: DbSession,
):
    """Get the current default assumptions for calculations."""
    record = await get_assumptions_record(db)
    assumptions = await get_default_assumptions(db)

    updated_by = None
    updated_by_email = None
    updated_at = None

    if record:
        updated_at = record.updated_at
        if record.updated_by_user:
            updated_by = record.updated_by_user.full_name or str(record.updated_by_user.id)
            updated_by_email = record.updated_by_user.email
        elif record.updated_by:
            updated_by = str(record.updated_by)

    return AdminAssumptionsResponse(
        assumptions=assumptions,
        updated_at=updated_at,
        updated_by=updated_by,
        updated_by_email=updated_by_email
    )


@router.put(
    "/assumptions",
    response_model=AdminAssumptionsResponse,
    summary="Update admin default assumptions",
)
async def update_admin_assumptions(
    payload: AllAssumptions,
    request: Request,
    db: DbSession,
    admin_user: User = Depends(require_permission("admin:assumptions")),
):
    """Update default assumptions used in calculations."""
    record = await upsert_default_assumptions(db, payload, admin_user.id)

    # Audit trail for assumption changes
    await audit_repo.log(
        db,
        action=AuditAction.ADMIN_UPDATE_ASSUMPTIONS,
        user_id=admin_user.id,
        ip_address=request.client.host if request.client else None,
        metadata={"changed_fields": list(payload.model_dump(exclude_unset=True).keys())},
    )

    updated_by = admin_user.full_name or str(admin_user.id)
    updated_by_email = admin_user.email

    return AdminAssumptionsResponse(
        assumptions=payload,
        updated_at=record.updated_at,
        updated_by=updated_by,
        updated_by_email=updated_by_email,
    )


@router.get(
    "/metrics-glossary",
    response_model=MetricsGlossaryResponse,
    summary="Get metrics glossary",
    dependencies=[Depends(require_permission("admin:metrics"))],
)
async def get_metrics_glossary():
    """Return a formula glossary for admin display."""
    # Try multiple path resolution strategies
    possible_paths = [
        Path(__file__).resolve().parents[1] / "data" / "metrics_glossary.json",  # app/data/
        Path(__file__).resolve().parents[2] / "app" / "data" / "metrics_glossary.json",  # from routers up
        Path("/app/app/data/metrics_glossary.json"),  # Railway absolute path
        Path("app/data/metrics_glossary.json"),  # Relative from working dir
    ]
    
    glossary_path = None
    for path in possible_paths:
        logger.info(f"Trying glossary path: {path} (exists: {path.exists()})")
        if path.exists():
            glossary_path = path
            break
    
    if glossary_path is None:
        logger.error(f"Metrics glossary not found. Tried paths: {possible_paths}")
        raise HTTPException(status_code=404, detail=f"Metrics glossary not found. __file__={__file__}")

    with glossary_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    return MetricsGlossaryResponse(data=data)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserResponse,
    summary="Get user details",
    dependencies=[Depends(require_permission("admin:users"))],
)
async def get_user(
    user_id: str,
    db: DbSession,
):
    """Get detailed information about a specific user."""
    from uuid import UUID as _UUID

    user = await admin_service.get_user_by_id(db, _UUID(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    counts = await admin_service._get_user_property_counts(db, [user.id])
    saved_count = counts.get(user.id, 0)

    return AdminUserResponse(
        id=str(user.id), email=user.email, full_name=user.full_name,
        avatar_url=user.avatar_url, is_active=user.is_active,
        is_verified=user.is_verified, is_superuser=user.is_superuser,
        created_at=user.created_at, last_login=user.last_login,
        saved_properties_count=saved_count,
    )


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserResponse,
    summary="Update user",
)
async def update_user(
    user_id: str,
    data: AdminUserUpdate,
    request: Request,
    db: DbSession,
    admin_user: User = Depends(require_permission("admin:users")),
):
    """Update a user's information or status."""
    from uuid import UUID as _UUID

    user = await admin_service.get_user_by_id(db, _UUID(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if str(user.id) == str(admin_user.id) and data.is_superuser is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own admin privileges")
    if str(user.id) == str(admin_user.id) and data.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot disable your own account")

    update_data = data.model_dump(exclude_unset=True)
    updated_user = await admin_service.update_user(db, user.id, update_data)

    # Audit trail
    await audit_repo.log(
        db,
        action=AuditAction.ADMIN_UPDATE_USER,
        user_id=admin_user.id,
        ip_address=request.client.host if request.client else None,
        metadata={
            "target_user_id": str(user.id),
            "target_email": user.email,
            "changes": update_data,
        },
    )

    logger.info(f"Admin {admin_user.email} updated user {user.email}: {update_data}")

    counts = await admin_service._get_user_property_counts(db, [user.id])
    saved_count = counts.get(user.id, 0)

    return AdminUserResponse(
        id=str(updated_user.id), email=updated_user.email, full_name=updated_user.full_name,
        avatar_url=updated_user.avatar_url, is_active=updated_user.is_active,
        is_verified=updated_user.is_verified, is_superuser=updated_user.is_superuser,
        created_at=updated_user.created_at, last_login=updated_user.last_login,
        saved_properties_count=saved_count,
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
)
async def delete_user(
    user_id: str,
    request: Request,
    db: DbSession,
    admin_user: User = Depends(require_permission("admin:users")),
):
    """Delete a user and all their data."""
    from uuid import UUID as _UUID

    user = await admin_service.get_user_by_id(db, _UUID(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if str(user.id) == str(admin_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    logger.warning(f"Admin {admin_user.email} deleting user {user.email}")

    # Audit trail — log BEFORE delete so the target user data is captured
    await audit_repo.log(
        db,
        action=AuditAction.ADMIN_DELETE_USER,
        user_id=admin_user.id,
        ip_address=request.client.host if request.client else None,
        metadata={
            "target_user_id": str(user.id),
            "target_email": user.email,
        },
    )

    await admin_service.delete_user(db, user.id)


# ===========================================
# Cache Management
# ===========================================

@router.delete(
    "/cache/property",
    summary="Clear property cache",
    response_model=dict,
)
async def clear_property_cache(
    address: Optional[str] = Query(None, description="Address to clear. Omit to flush all property keys."),
    admin_user: User = Depends(require_permission("admin:manage")),
):
    """Clear cached property data. Pass `address` for a single property, or omit to flush all."""
    from app.services.cache_service import get_cache_service
    cache = get_cache_service()
    if address:
        ok = await cache.clear_property_cache(address)
        return {"cleared": 1 if ok else 0, "address": address}

    if cache.use_redis and cache.redis_client:
        keys = []
        async for key in cache.redis_client.scan_iter(match="property:*"):
            keys.append(key)
        async for key in cache.redis_client.scan_iter(match="calc:*"):
            keys.append(key)
        async for key in cache.redis_client.scan_iter(match="prop_id:*"):
            keys.append(key)
        if keys:
            await cache.redis_client.delete(*keys)
        return {"cleared": len(keys), "backend": "redis"}

    count = len(cache._memory_cache)
    cache._memory_cache.clear()
    return {"cleared": count, "backend": "memory"}
