"""
Admin router for platform administration.
Requires superuser privileges for all endpoints.
"""

import logging
from typing import Optional, List, Any
from pathlib import Path
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.core.deps import SuperUser, DbSession
from app.models.user import User
from app.models.saved_property import SavedProperty
from app.schemas.property import AllAssumptions
from app.services.assumptions_service import (
    get_assumptions_record,
    get_default_assumptions,
    upsert_default_assumptions,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


# ===========================================
# Schemas
# ===========================================

class AdminUserResponse(BaseModel):
    """User response for admin view."""
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_verified: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime]
    saved_properties_count: int = 0
    
    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    """Schema for admin updating a user."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_superuser: Optional[bool] = None


class PlatformStats(BaseModel):
    """Platform statistics."""
    total_users: int
    active_users: int
    total_properties_saved: int
    new_users_30d: int
    verified_users: int
    admin_users: int


class AdminAssumptionsResponse(BaseModel):
    """Response for admin assumption defaults."""
    assumptions: AllAssumptions
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_by_email: Optional[EmailStr] = None


class MetricsGlossaryResponse(BaseModel):
    """Metrics glossary payload."""
    data: Any


# ===========================================
# Platform Statistics
# ===========================================

@router.get(
    "/stats",
    response_model=PlatformStats,
    summary="Get platform statistics"
)
async def get_platform_stats(
    admin_user: SuperUser,
    db: DbSession
):
    """
    Get overall platform statistics.
    
    Requires superuser privileges.
    """
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    # Active users (logged in within 30 days)
    active_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login >= thirty_days_ago,
            User.is_active == True
        )
    )
    active_users = active_users_result.scalar() or 0
    
    # Total saved properties
    total_properties_result = await db.execute(select(func.count(SavedProperty.id)))
    total_properties = total_properties_result.scalar() or 0
    
    # New users in last 30 days
    new_users_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    )
    new_users_30d = new_users_result.scalar() or 0
    
    # Verified users
    verified_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_verified == True)
    )
    verified_users = verified_users_result.scalar() or 0
    
    # Admin users
    admin_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_superuser == True)
    )
    admin_users = admin_users_result.scalar() or 0
    
    return PlatformStats(
        total_users=total_users,
        active_users=active_users,
        total_properties_saved=total_properties,
        new_users_30d=new_users_30d,
        verified_users=verified_users,
        admin_users=admin_users
    )


# ===========================================
# User Management
# ===========================================

@router.get(
    "/users",
    response_model=List[AdminUserResponse],
    summary="List all users"
)
async def list_users(
    admin_user: SuperUser,
    db: DbSession,
    search: Optional[str] = Query(None, description="Search by email or name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_superuser: Optional[bool] = Query(None, description="Filter by admin status"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at_desc", description="Order by field")
):
    """
    List all users with optional filtering.
    
    Requires superuser privileges.
    """
    query = select(User)
    
    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (User.email.ilike(search_pattern)) |
            (User.full_name.ilike(search_pattern))
        )
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    if is_superuser is not None:
        query = query.where(User.is_superuser == is_superuser)
    
    # Apply ordering
    if order_by == "created_at_desc":
        query = query.order_by(User.created_at.desc())
    elif order_by == "created_at_asc":
        query = query.order_by(User.created_at.asc())
    elif order_by == "email_asc":
        query = query.order_by(User.email.asc())
    elif order_by == "last_login_desc":
        query = query.order_by(User.last_login.desc().nullsfirst())
    else:
        query = query.order_by(User.created_at.desc())
    
    # Apply pagination
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Get saved property counts for each user
    user_ids = [user.id for user in users]
    
    if user_ids:
        counts_query = select(
            SavedProperty.user_id,
            func.count(SavedProperty.id).label('count')
        ).where(
            SavedProperty.user_id.in_(user_ids)
        ).group_by(SavedProperty.user_id)
        
        counts_result = await db.execute(counts_query)
        counts_map = {row.user_id: row.count for row in counts_result}
    else:
        counts_map = {}
    
    return [
        AdminUserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            last_login=user.last_login,
            saved_properties_count=counts_map.get(user.id, 0)
        )
        for user in users
    ]


# ===========================================
# Assumptions & Metrics Glossary
# ===========================================

@router.get(
    "/assumptions",
    response_model=AdminAssumptionsResponse,
    summary="Get admin default assumptions"
)
async def get_admin_assumptions(
    admin_user: SuperUser,
    db: DbSession
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
    summary="Update admin default assumptions"
)
async def update_admin_assumptions(
    payload: AllAssumptions,
    admin_user: SuperUser,
    db: DbSession
):
    """Update default assumptions used in calculations."""
    record = await upsert_default_assumptions(db, payload, admin_user.id)

    updated_by = admin_user.full_name or str(admin_user.id)
    updated_by_email = admin_user.email

    return AdminAssumptionsResponse(
        assumptions=payload,
        updated_at=record.updated_at,
        updated_by=updated_by,
        updated_by_email=updated_by_email
    )


@router.get(
    "/metrics-glossary",
    response_model=MetricsGlossaryResponse,
    summary="Get metrics glossary"
)
async def get_metrics_glossary(
    admin_user: SuperUser
):
    """Return a formula glossary for admin display."""
    glossary_path = Path(__file__).resolve().parents[1] / "data" / "metrics_glossary.json"

    if not glossary_path.exists():
        raise HTTPException(status_code=404, detail="Metrics glossary not found")

    with glossary_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    return MetricsGlossaryResponse(data=data)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserResponse,
    summary="Get user details"
)
async def get_user(
    user_id: str,
    admin_user: SuperUser,
    db: DbSession
):
    """
    Get detailed information about a specific user.
    
    Requires superuser privileges.
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get saved property count
    count_result = await db.execute(
        select(func.count(SavedProperty.id)).where(SavedProperty.user_id == user.id)
    )
    saved_count = count_result.scalar() or 0
    
    return AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        last_login=user.last_login,
        saved_properties_count=saved_count
    )


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserResponse,
    summary="Update user"
)
async def update_user(
    user_id: str,
    data: AdminUserUpdate,
    admin_user: SuperUser,
    db: DbSession
):
    """
    Update a user's information or status.
    
    Requires superuser privileges.
    
    Can update:
    - full_name
    - is_active (enable/disable account)
    - is_verified (verify email)
    - is_superuser (grant/revoke admin)
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from removing their own admin status
    if str(user.id) == str(admin_user.id) and data.is_superuser is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )
    
    # Prevent admin from disabling their own account
    if str(user.id) == str(admin_user.id) and data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disable your own account"
        )
    
    # Apply updates
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    logger.info(f"Admin {admin_user.email} updated user {user.email}: {update_data}")
    
    # Get saved property count
    count_result = await db.execute(
        select(func.count(SavedProperty.id)).where(SavedProperty.user_id == user.id)
    )
    saved_count = count_result.scalar() or 0
    
    return AdminUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        last_login=user.last_login,
        saved_properties_count=saved_count
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user"
)
async def delete_user(
    user_id: str,
    admin_user: SuperUser,
    db: DbSession
):
    """
    Delete a user and all their data.
    
    Requires superuser privileges.
    
    ⚠️ This action is irreversible!
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deleting themselves
    if str(user.id) == str(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    logger.warning(f"Admin {admin_user.email} deleting user {user.email}")
    
    await db.delete(user)
    await db.commit()

