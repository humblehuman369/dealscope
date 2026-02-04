"""
Sync router for bidirectional data synchronization.
Handles pull (server -> client) and push (client -> server) operations.
"""

import logging
import time
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, status, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.sync import (
    SyncPullRequest,
    SyncPullResponse,
    SyncRecord,
    SyncPushRequest,
    SyncPushResponse,
    SyncPushResult,
)
from app.services.sync_service import sync_service

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
        records = await sync_service.pull_scanned_properties(
            db=db,
            user_id=current_user.id,
            since_ts=since_ts,
            limit=limit
        )
        for record in records:
            response.scanned_properties.append(SyncRecord(**record))
            latest_ts = max(latest_ts, record["updated_at"])
            total_records += 1
    
    # Sync portfolio/saved properties
    if "portfolio_properties" in request.tables:
        records = await sync_service.pull_portfolio_properties(
            db=db,
            user_id=current_user.id,
            since_ts=since_ts,
            limit=limit
        )
        for record in records:
            response.portfolio_properties.append(SyncRecord(**record))
            latest_ts = max(latest_ts, record["updated_at"])
            total_records += 1
    
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
    return await sync_service.get_sync_status(db=db, user_id=current_user.id)
