"""
Sync Service - Business logic for bidirectional data synchronization.

Handles pull (server -> client) and push (client -> server) operations.
Extracted from the sync router to maintain separation of concerns.
"""

import logging
import time
from typing import Any
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import SavedProperty
from app.models.search_history import SearchHistory

logger = logging.getLogger(__name__)


class SyncService:
    """Service for data synchronization operations."""

    async def pull_scanned_properties(
        self, db: AsyncSession, user_id: UUID, since_ts: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        """
        Pull scanned properties (from search history) since a timestamp.

        Args:
            db: Database session
            user_id: User ID to sync for
            since_ts: Unix timestamp to sync from
            limit: Maximum records to return

        Returns:
            List of sync records with property data
        """
        try:
            query = (
                select(SearchHistory)
                .where(
                    and_(
                        SearchHistory.user_id == user_id,
                        SearchHistory.search_source == "scanner",
                        SearchHistory.searched_at >= since_ts if since_ts > 0 else True,
                    )
                )
                .order_by(SearchHistory.searched_at.asc())
                .limit(limit)
            )

            result = await db.execute(query)
            searches = result.scalars().all()

            server_time = int(time.time())
            records = []

            for s in searches:
                ts = int(s.searched_at.timestamp()) if s.searched_at else server_time
                records.append(
                    {
                        "id": str(s.id),
                        "table_name": "scanned_properties",
                        "action": "create",
                        "data": {
                            "id": str(s.id),
                            "address": s.address_street or s.search_query,
                            "city": s.address_city,
                            "state": s.address_state,
                            "zip": s.address_zip,
                            "property_data": s.result_summary,
                            "scanned_at": ts,
                            "is_favorite": False,
                        },
                        "updated_at": ts,
                        "created_at": ts,
                    }
                )

            return records

        except Exception as e:
            logger.error(f"Error syncing scanned_properties: {e}")
            return []

    async def pull_portfolio_properties(
        self, db: AsyncSession, user_id: UUID, since_ts: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        """
        Pull saved/portfolio properties since a timestamp.

        Args:
            db: Database session
            user_id: User ID to sync for
            since_ts: Unix timestamp to sync from
            limit: Maximum records to return

        Returns:
            List of sync records with property data
        """
        try:
            query = (
                select(SavedProperty)
                .where(
                    and_(
                        SavedProperty.user_id == user_id,
                        SavedProperty.updated_at >= since_ts if since_ts > 0 else True,
                    )
                )
                .order_by(SavedProperty.updated_at.asc())
                .limit(limit)
            )

            result = await db.execute(query)
            properties = result.scalars().all()

            server_time = int(time.time())
            records = []

            for p in properties:
                ts = int(p.updated_at.timestamp()) if p.updated_at else server_time
                created = int(p.created_at.timestamp()) if p.created_at else ts
                records.append(
                    {
                        "id": str(p.id),
                        "table_name": "portfolio_properties",
                        "action": "update" if p.updated_at != p.created_at else "create",
                        "data": {
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
                        "updated_at": ts,
                        "created_at": created,
                    }
                )

            return records

        except Exception as e:
            logger.error(f"Error syncing portfolio_properties: {e}")
            return []

    async def get_sync_status(self, db: AsyncSession, user_id: UUID) -> dict[str, Any]:
        """
        Get sync status for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with counts for each table
        """
        server_time = int(time.time())

        # Count scanned properties
        scanned_count_query = select(SearchHistory).where(
            and_(
                SearchHistory.user_id == user_id,
                SearchHistory.search_source == "scanner",
            )
        )
        scanned_result = await db.execute(scanned_count_query)
        scanned_count = len(scanned_result.scalars().all())

        # Count saved properties
        saved_count_query = select(SavedProperty).where(SavedProperty.user_id == user_id)
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


# Singleton instance
sync_service = SyncService()
