"""
Search History Service for tracking and retrieving user searches.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_history import SearchHistory
from app.schemas.search_history import SearchHistoryCreate

logger = logging.getLogger(__name__)


class SearchHistoryService:
    """Service for managing search history."""
    
    async def record_search(
        self,
        db: AsyncSession,
        user_id: Optional[str],
        search_query: str,
        property_cache_id: Optional[str] = None,
        zpid: Optional[str] = None,
        address_parts: Optional[Dict[str, str]] = None,
        result_summary: Optional[Dict[str, Any]] = None,
        search_source: str = "web",
        was_successful: bool = True,
        error_message: Optional[str] = None,
    ) -> SearchHistory:
        """
        Record a property search in history.
        
        Args:
            db: Database session
            user_id: User ID (optional for anonymous searches)
            search_query: The full search query/address
            property_cache_id: Reference to cached property data
            zpid: Zillow property ID if available
            address_parts: Parsed address components
            result_summary: Quick summary of property for display
            search_source: Where the search originated
            was_successful: Whether the search found results
            error_message: Error message if search failed
        """
        address_parts = address_parts or {}
        
        search_entry = SearchHistory(
            user_id=UUID(user_id) if user_id else None,
            search_query=search_query,
            address_street=address_parts.get("street"),
            address_city=address_parts.get("city"),
            address_state=address_parts.get("state"),
            address_zip=address_parts.get("zip"),
            property_cache_id=property_cache_id,
            zpid=zpid,
            result_summary=result_summary,
            search_source=search_source,
            was_successful=was_successful,
            error_message=error_message,
        )
        
        db.add(search_entry)
        await db.commit()
        await db.refresh(search_entry)
        
        logger.info(f"Recorded search for user {user_id}: {search_query[:50]}...")
        
        return search_entry
    
    async def get_user_history(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        successful_only: bool = False,
        search_source: Optional[str] = None,
    ) -> List[SearchHistory]:
        """
        Get paginated search history for a user.
        
        Args:
            db: Database session
            user_id: User ID
            limit: Max results to return
            offset: Pagination offset
            successful_only: Filter to successful searches only
            search_source: Filter by source (web, mobile, etc.)
        """
        query = select(SearchHistory).where(
            SearchHistory.user_id == UUID(user_id)
        )
        
        if successful_only:
            query = query.where(SearchHistory.was_successful == True)
        
        if search_source:
            query = query.where(SearchHistory.search_source == search_source)
        
        query = query.order_by(desc(SearchHistory.searched_at))
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def get_history_count(
        self,
        db: AsyncSession,
        user_id: str,
        successful_only: bool = False,
    ) -> int:
        """Get total count of user's search history."""
        query = select(func.count()).select_from(SearchHistory).where(
            SearchHistory.user_id == UUID(user_id)
        )
        
        if successful_only:
            query = query.where(SearchHistory.was_successful == True)
        
        result = await db.execute(query)
        return result.scalar() or 0
    
    async def get_recent_searches(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 5,
    ) -> List[SearchHistory]:
        """Get most recent successful searches for quick access."""
        query = select(SearchHistory).where(
            and_(
                SearchHistory.user_id == UUID(user_id),
                SearchHistory.was_successful == True,
            )
        ).order_by(desc(SearchHistory.searched_at)).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def get_stats(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Get search statistics for a user.
        
        Returns counts, top markets, and recent activity.
        """
        user_uuid = UUID(user_id)
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Total searches
        total_query = select(func.count()).select_from(SearchHistory).where(
            SearchHistory.user_id == user_uuid
        )
        total_result = await db.execute(total_query)
        total_searches = total_result.scalar() or 0
        
        # Successful searches
        success_query = select(func.count()).select_from(SearchHistory).where(
            and_(
                SearchHistory.user_id == user_uuid,
                SearchHistory.was_successful == True,
            )
        )
        success_result = await db.execute(success_query)
        successful_searches = success_result.scalar() or 0
        
        # Saved from search
        saved_query = select(func.count()).select_from(SearchHistory).where(
            and_(
                SearchHistory.user_id == user_uuid,
                SearchHistory.was_saved == True,
            )
        )
        saved_result = await db.execute(saved_query)
        saved_from_search = saved_result.scalar() or 0
        
        # This week
        week_query = select(func.count()).select_from(SearchHistory).where(
            and_(
                SearchHistory.user_id == user_uuid,
                SearchHistory.searched_at >= week_ago,
            )
        )
        week_result = await db.execute(week_query)
        searches_this_week = week_result.scalar() or 0
        
        # This month
        month_query = select(func.count()).select_from(SearchHistory).where(
            and_(
                SearchHistory.user_id == user_uuid,
                SearchHistory.searched_at >= month_ago,
            )
        )
        month_result = await db.execute(month_query)
        searches_this_month = month_result.scalar() or 0
        
        # Top markets (states)
        markets_query = select(
            SearchHistory.address_state,
            func.count().label('count')
        ).where(
            and_(
                SearchHistory.user_id == user_uuid,
                SearchHistory.address_state.isnot(None),
            )
        ).group_by(SearchHistory.address_state).order_by(
            desc(func.count())
        ).limit(5)
        
        markets_result = await db.execute(markets_query)
        top_markets = [
            {"state": row.address_state, "count": row.count}
            for row in markets_result.all()
        ]
        
        # Recent searches
        recent = await self.get_recent_searches(db, user_id, limit=5)
        
        return {
            "total_searches": total_searches,
            "successful_searches": successful_searches,
            "saved_from_search": saved_from_search,
            "searches_this_week": searches_this_week,
            "searches_this_month": searches_this_month,
            "top_markets": top_markets,
            "recent_searches": recent,
        }
    
    async def mark_as_saved(
        self,
        db: AsyncSession,
        user_id: str,
        property_cache_id: str,
    ) -> bool:
        """Mark a search as having resulted in a saved property."""
        query = select(SearchHistory).where(
            and_(
                SearchHistory.user_id == UUID(user_id),
                SearchHistory.property_cache_id == property_cache_id,
            )
        ).order_by(desc(SearchHistory.searched_at)).limit(1)
        
        result = await db.execute(query)
        search_entry = result.scalar_one_or_none()
        
        if search_entry:
            search_entry.was_saved = True
            await db.commit()
            return True
        
        return False
    
    async def delete_entry(
        self,
        db: AsyncSession,
        user_id: str,
        entry_id: str,
    ) -> bool:
        """Delete a single search history entry."""
        query = select(SearchHistory).where(
            and_(
                SearchHistory.id == UUID(entry_id),
                SearchHistory.user_id == UUID(user_id),
            )
        )
        
        result = await db.execute(query)
        entry = result.scalar_one_or_none()
        
        if entry:
            await db.delete(entry)
            await db.commit()
            return True
        
        return False
    
    async def clear_history(
        self,
        db: AsyncSession,
        user_id: str,
        before_date: Optional[datetime] = None,
    ) -> int:
        """
        Clear user's search history.
        
        Args:
            db: Database session
            user_id: User ID
            before_date: Optional date to clear searches before
        
        Returns:
            Number of entries deleted
        """
        from sqlalchemy import delete
        
        query = delete(SearchHistory).where(
            SearchHistory.user_id == UUID(user_id)
        )
        
        if before_date:
            query = query.where(SearchHistory.searched_at < before_date)
        
        result = await db.execute(query)
        await db.commit()
        
        return result.rowcount


# Singleton instance
search_history_service = SearchHistoryService()

