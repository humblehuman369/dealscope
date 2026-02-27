"""
Search History router for viewing and managing property search history.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.search_history import (
    SearchHistoryList,
    SearchHistoryResponse,
    SearchHistoryStats,
)
from app.services.search_history_service import search_history_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/search-history", tags=["Search History"])


# ===========================================
# List & Stats
# ===========================================


@router.get("", response_model=SearchHistoryList, summary="Get search history")
async def get_search_history(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    successful_only: bool = Query(False, description="Only show successful searches"),
    source: str | None = Query(None, description="Filter by source (web, mobile, scanner)"),
):
    """
    Get paginated search history for the current user.

    Returns a list of past property searches with summaries.
    """
    searches = await search_history_service.get_user_history(
        db=db,
        user_id=str(current_user.id),
        limit=limit,
        offset=offset,
        successful_only=successful_only,
        search_source=source,
    )

    total = await search_history_service.get_history_count(
        db=db,
        user_id=str(current_user.id),
        successful_only=successful_only,
    )

    items = [
        SearchHistoryResponse(
            id=str(s.id),
            user_id=str(s.user_id) if s.user_id else None,
            search_query=s.search_query,
            address_street=s.address_street,
            address_city=s.address_city,
            address_state=s.address_state,
            address_zip=s.address_zip,
            property_cache_id=s.property_cache_id,
            zpid=s.zpid,
            result_summary=s.result_summary,
            search_source=s.search_source,
            was_successful=s.was_successful,
            was_saved=s.was_saved,
            searched_at=s.searched_at,
        )
        for s in searches
    ]

    return SearchHistoryList(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/recent", response_model=list[SearchHistoryResponse], summary="Get recent searches")
async def get_recent_searches(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(5, ge=1, le=20),
):
    """
    Get the most recent successful searches for quick access.

    Useful for search autocomplete and "recent searches" dropdown.
    """
    searches = await search_history_service.get_recent_searches(
        db=db,
        user_id=str(current_user.id),
        limit=limit,
    )

    return [
        SearchHistoryResponse(
            id=str(s.id),
            user_id=str(s.user_id) if s.user_id else None,
            search_query=s.search_query,
            address_street=s.address_street,
            address_city=s.address_city,
            address_state=s.address_state,
            address_zip=s.address_zip,
            property_cache_id=s.property_cache_id,
            zpid=s.zpid,
            result_summary=s.result_summary,
            search_source=s.search_source,
            was_successful=s.was_successful,
            was_saved=s.was_saved,
            searched_at=s.searched_at,
        )
        for s in searches
    ]


@router.get("/stats", response_model=SearchHistoryStats, summary="Get search statistics")
async def get_search_stats(
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get search statistics for the current user.

    Includes total searches, top markets, and activity trends.
    """
    stats = await search_history_service.get_stats(
        db=db,
        user_id=str(current_user.id),
    )

    # Convert recent searches to response objects
    recent = [
        SearchHistoryResponse(
            id=str(s.id),
            user_id=str(s.user_id) if s.user_id else None,
            search_query=s.search_query,
            address_street=s.address_street,
            address_city=s.address_city,
            address_state=s.address_state,
            address_zip=s.address_zip,
            property_cache_id=s.property_cache_id,
            zpid=s.zpid,
            result_summary=s.result_summary,
            search_source=s.search_source,
            was_successful=s.was_successful,
            was_saved=s.was_saved,
            searched_at=s.searched_at,
        )
        for s in stats["recent_searches"]
    ]

    return SearchHistoryStats(
        total_searches=stats["total_searches"],
        successful_searches=stats["successful_searches"],
        saved_from_search=stats["saved_from_search"],
        searches_this_week=stats["searches_this_week"],
        searches_this_month=stats["searches_this_month"],
        top_markets=stats["top_markets"],
        recent_searches=recent,
    )


# ===========================================
# Individual Entry Operations
# ===========================================


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a search history entry")
async def delete_search_entry(
    entry_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a single search history entry."""
    deleted = await search_history_service.delete_entry(
        db=db,
        user_id=str(current_user.id),
        entry_id=entry_id,
    )

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search entry not found")


@router.delete("", summary="Clear search history")
async def clear_search_history(
    current_user: CurrentUser,
    db: DbSession,
    before: datetime | None = Query(None, description="Clear entries before this date"),
):
    """
    Clear all search history for the current user.

    Optionally specify a date to only clear entries before that date.
    """
    count = await search_history_service.clear_history(
        db=db,
        user_id=str(current_user.id),
        before_date=before,
    )

    return {"deleted": count, "message": f"Cleared {count} search history entries"}
