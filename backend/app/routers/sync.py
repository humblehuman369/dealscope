"""
Sync router for bidirectional data synchronization.
Handles pull (server -> client) and push (client -> server) operations.
"""

import logging
import time
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, DbSession
from app.schemas.sync import (
    SyncPullRequest,
    SyncPullResponse,
    SyncRecord,
    SyncPushRequest,
    SyncPushResponse,
    SyncPushResult,
)
from app.models.saved_property import SavedProperty
from app.models.search_history import SearchHistory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sync", tags=["Sync"])


# ===========================================
# Pull Sync (Server -> Client)
# ===========================================

@router.post(
    "/pull",
    response_model=SyncPullResponse,
    summary="Pull changes from server"
)
async def pull_sync(
    request: SyncPullRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Pull changes since a given timestamp.
    
    This endpoint returns all records that have been created or modified
    since the provided timestamp, allowing clients to sync their local
    database with the server.
    
    For initial sync, omit the 'since' parameter to get all data.
    """
    user_id = str(current_user.id)
    since_ts = request.since or 0
    server_time = int(time.time())
    limit = request.limit
    
    response = SyncPullResponse(
        server_time=server_time,
        has_more=False,
    )
    
    # Track the latest timestamp we've seen for pagination
    latest_ts = since_ts
    total_records = 0
    
    # Sync scanned properties (from search history for this user)
    if "scanned_properties" in request.tables:
        try:
            query = (
                select(SearchHistory)
                .where(
                    and_(
                        SearchHistory.user_id == current_user.id,
                        SearchHistory.search_source == "scanner",
                        SearchHistory.searched_at >= since_ts if since_ts > 0 else True,
                    )
                )
                .order_by(SearchHistory.searched_at.asc())
                .limit(limit)
            )
            
            result = await db.execute(query)
            searches = result.scalars().all()
            
            for s in searches:
                ts = int(s.searched_at.timestamp()) if s.searched_at else server_time
                response.scanned_properties.append(
                    SyncRecord(
                        id=str(s.id),
                        table_name="scanned_properties",
                        action="create",  # We don't track soft deletes for now
                        data={
                            "id": str(s.id),
                            "address": s.address_street or s.search_query,
                            "city": s.address_city,
                            "state": s.address_state,
                            "zip": s.address_zip,
                            "property_data": s.result_summary,
                            "scanned_at": ts,
                            "is_favorite": False,  # Would need a favorites table
                        },
                        updated_at=ts,
                        created_at=ts,
                    )
                )
                latest_ts = max(latest_ts, ts)
                total_records += 1
                
        except Exception as e:
            logger.error(f"Error syncing scanned_properties: {e}")
    
    # Sync portfolio/saved properties
    if "portfolio_properties" in request.tables:
        try:
            query = (
                select(SavedProperty)
                .where(
                    and_(
                        SavedProperty.user_id == current_user.id,
                        SavedProperty.updated_at >= since_ts if since_ts > 0 else True,
                    )
                )
                .order_by(SavedProperty.updated_at.asc())
                .limit(limit)
            )
            
            result = await db.execute(query)
            properties = result.scalars().all()
            
            for p in properties:
                ts = int(p.updated_at.timestamp()) if p.updated_at else server_time
                created = int(p.created_at.timestamp()) if p.created_at else ts
                response.portfolio_properties.append(
                    SyncRecord(
                        id=str(p.id),
                        table_name="portfolio_properties",
                        action="update" if p.updated_at != p.created_at else "create",
                        data={
                            "id": str(p.id),
                            "address": p.address_street,
                            "city": p.address_city,
                            "state": p.address_state,
                            "zip": p.address_zip,
                            "purchase_price": p.purchase_price,
                            "strategy": p.strategy,
                            "property_data": p.property_snapshot,
                            "notes": p.notes,
                        },
                        updated_at=ts,
                        created_at=created,
                    )
                )
                latest_ts = max(latest_ts, ts)
                total_records += 1
                
        except Exception as e:
            logger.error(f"Error syncing portfolio_properties: {e}")
    
    # Check if there are more records
    if total_records >= limit:
        response.has_more = True
        response.next_since = latest_ts
    
    logger.info(f"Pull sync for user {user_id}: {total_records} records since {since_ts}")
    
    return response


@router.get(
    "/status",
    summary="Get sync status"
)
async def get_sync_status(
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get the current sync status for the user.
    
    Returns counts and last modification times for each syncable table.
    """
    user_id = str(current_user.id)
    server_time = int(time.time())
    
    # Count scanned properties
    scanned_count_query = (
        select(SearchHistory)
        .where(
            and_(
                SearchHistory.user_id == current_user.id,
                SearchHistory.search_source == "scanner",
            )
        )
    )
    scanned_result = await db.execute(scanned_count_query)
    scanned_count = len(scanned_result.scalars().all())
    
    # Count saved properties
    saved_count_query = select(SavedProperty).where(SavedProperty.user_id == current_user.id)
    saved_result = await db.execute(saved_count_query)
    saved_count = len(saved_result.scalars().all())
    
    return {
        "server_time": server_time,
        "tables": {
            "scanned_properties": {
                "count": scanned_count,
            },
            "portfolio_properties": {
                "count": saved_count,
            },
        },
    }
