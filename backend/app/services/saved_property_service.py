"""
SavedProperty service for CRUD operations on user's saved properties.
"""

from typing import Optional, List
from datetime import datetime
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.models.saved_property import SavedProperty, PropertyAdjustment, PropertyStatus
from app.schemas.saved_property import (
    SavedPropertyCreate,
    SavedPropertyUpdate,
    PropertyAdjustmentCreate,
)

logger = logging.getLogger(__name__)


class SavedPropertyService:
    """
    Service for managing saved properties.
    Handles CRUD operations, filtering, and adjustments.
    """
    
    # ===========================================
    # Create Operations
    # ===========================================
    
    async def save_property(
        self,
        db: AsyncSession,
        user_id: str,
        data: SavedPropertyCreate
    ) -> SavedProperty:
        """
        Save a new property for a user.
        """
        # Check if already saved (by external_property_id or address)
        existing = await self.get_by_address_or_id(
            db, 
            user_id, 
            external_id=data.external_property_id,
            address=data.full_address or data.address_street
        )
        
        if existing:
            logger.info(f"Property already saved: {data.address_street}")
            raise ValueError("This property is already in your saved list")
        
        # Create the saved property
        saved_property = SavedProperty(
            user_id=user_id,
            external_property_id=data.external_property_id,
            zpid=data.zpid,
            address_street=data.address_street,
            address_city=data.address_city,
            address_state=data.address_state,
            address_zip=data.address_zip,
            full_address=data.full_address or f"{data.address_street}, {data.address_city}, {data.address_state} {data.address_zip}",
            property_data_snapshot=data.property_data_snapshot,
            status=data.status,
            nickname=data.nickname,
            tags=data.tags or [],
            color_label=data.color_label,
            priority=data.priority,
            notes=data.notes,
        )
        
        db.add(saved_property)
        await db.flush()
        await db.refresh(saved_property)
        
        logger.info(f"Property saved: {saved_property.id} - {data.address_street}")
        return saved_property
    
    # ===========================================
    # Read Operations
    # ===========================================
    
    async def get_by_id(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str
    ) -> Optional[SavedProperty]:
        """Get a saved property by ID, ensuring user ownership."""
        result = await db.execute(
            select(SavedProperty)
            .options(selectinload(SavedProperty.documents))
            .where(
                and_(
                    SavedProperty.id == property_id,
                    SavedProperty.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_address_or_id(
        self,
        db: AsyncSession,
        user_id: str,
        external_id: Optional[str] = None,
        address: Optional[str] = None
    ) -> Optional[SavedProperty]:
        """Check if a property is already saved."""
        conditions = [SavedProperty.user_id == user_id]
        
        if external_id:
            conditions.append(SavedProperty.external_property_id == external_id)
        elif address:
            conditions.append(SavedProperty.full_address.ilike(f"%{address}%"))
        else:
            return None
        
        result = await db.execute(
            select(SavedProperty).where(and_(*conditions))
        )
        return result.scalar_one_or_none()
    
    async def list_properties(
        self,
        db: AsyncSession,
        user_id: str,
        status: Optional[PropertyStatus] = None,
        tags: Optional[List[str]] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        order_by: str = "saved_at_desc"
    ) -> List[SavedProperty]:
        """
        List saved properties with filtering and pagination.
        """
        query = select(SavedProperty).where(SavedProperty.user_id == user_id)
        
        # Apply filters
        if status:
            query = query.where(SavedProperty.status == status)
        
        if tags:
            # Filter properties that have all specified tags
            for tag in tags:
                query = query.where(SavedProperty.tags.contains([tag]))
        
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    SavedProperty.full_address.ilike(search_pattern),
                    SavedProperty.nickname.ilike(search_pattern),
                    SavedProperty.notes.ilike(search_pattern),
                )
            )
        
        # Apply ordering
        if order_by == "saved_at_desc":
            query = query.order_by(SavedProperty.saved_at.desc())
        elif order_by == "saved_at_asc":
            query = query.order_by(SavedProperty.saved_at.asc())
        elif order_by == "priority_desc":
            query = query.order_by(SavedProperty.priority.desc().nullsfirst())
        elif order_by == "status":
            query = query.order_by(SavedProperty.status)
        elif order_by == "address":
            query = query.order_by(SavedProperty.address_street)
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def count_properties(
        self,
        db: AsyncSession,
        user_id: str,
        status: Optional[PropertyStatus] = None
    ) -> int:
        """Count saved properties."""
        query = select(func.count(SavedProperty.id)).where(
            SavedProperty.user_id == user_id
        )
        
        if status:
            query = query.where(SavedProperty.status == status)
        
        result = await db.execute(query)
        return result.scalar() or 0
    
    async def get_stats(
        self,
        db: AsyncSession,
        user_id: str
    ) -> dict:
        """Get statistics about saved properties."""
        # Count by status
        status_counts = {}
        for status in PropertyStatus:
            count = await self.count_properties(db, user_id, status)
            status_counts[status.value] = count
        
        total = sum(status_counts.values())
        
        return {
            "total": total,
            "by_status": status_counts,
        }
    
    # ===========================================
    # Update Operations
    # ===========================================
    
    async def update_property(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        data: SavedPropertyUpdate,
        track_changes: bool = True
    ) -> Optional[SavedProperty]:
        """Update a saved property."""
        saved_property = await self.get_by_id(db, property_id, user_id)
        
        if not saved_property:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if track_changes and hasattr(saved_property, field):
                old_value = getattr(saved_property, field)
                if old_value != value:
                    # Create adjustment record
                    adjustment = PropertyAdjustment(
                        property_id=saved_property.id,
                        adjustment_type=field,
                        previous_value={"value": old_value} if old_value is not None else None,
                        new_value={"value": value} if value is not None else None,
                    )
                    db.add(adjustment)
            
            setattr(saved_property, field, value)
        
        saved_property.updated_at = datetime.utcnow()
        
        await db.flush()
        await db.refresh(saved_property)
        
        logger.info(f"Property updated: {property_id}")
        return saved_property
    
    async def update_status(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        status: PropertyStatus
    ) -> Optional[SavedProperty]:
        """Update just the status of a saved property."""
        return await self.update_property(
            db, 
            property_id, 
            user_id, 
            SavedPropertyUpdate(status=status)
        )
    
    async def bulk_update_status(
        self,
        db: AsyncSession,
        user_id: str,
        property_ids: List[str],
        status: PropertyStatus
    ) -> int:
        """Bulk update status for multiple properties."""
        count = 0
        for pid in property_ids:
            result = await self.update_status(db, pid, user_id, status)
            if result:
                count += 1
        
        logger.info(f"Bulk status update: {count} properties updated to {status.value}")
        return count
    
    # ===========================================
    # Delete Operations
    # ===========================================
    
    async def delete_property(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str
    ) -> bool:
        """Delete a saved property."""
        saved_property = await self.get_by_id(db, property_id, user_id)
        
        if not saved_property:
            return False
        
        db.delete(saved_property)  # delete() is synchronous in SQLAlchemy 2.0
        await db.flush()
        
        logger.info(f"Property deleted: {property_id}")
        return True
    
    async def bulk_delete(
        self,
        db: AsyncSession,
        user_id: str,
        property_ids: List[str]
    ) -> int:
        """Bulk delete properties."""
        count = 0
        for pid in property_ids:
            if await self.delete_property(db, pid, user_id):
                count += 1
        
        logger.info(f"Bulk delete: {count} properties deleted")
        return count
    
    # ===========================================
    # Adjustment History
    # ===========================================
    
    async def get_adjustment_history(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        limit: int = 50
    ) -> List[PropertyAdjustment]:
        """Get adjustment history for a property."""
        # First verify ownership
        saved_property = await self.get_by_id(db, property_id, user_id)
        if not saved_property:
            return []
        
        result = await db.execute(
            select(PropertyAdjustment)
            .where(PropertyAdjustment.property_id == property_id)
            .order_by(PropertyAdjustment.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def add_adjustment(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        data: PropertyAdjustmentCreate
    ) -> Optional[PropertyAdjustment]:
        """Manually add an adjustment record."""
        # Verify ownership
        saved_property = await self.get_by_id(db, property_id, user_id)
        if not saved_property:
            return None
        
        adjustment = PropertyAdjustment(
            property_id=property_id,
            adjustment_type=data.adjustment_type,
            field_name=data.field_name,
            previous_value=data.previous_value,
            new_value=data.new_value,
            reason=data.reason,
        )
        
        db.add(adjustment)
        await db.flush()
        await db.refresh(adjustment)
        
        return adjustment


# Singleton instance
saved_property_service = SavedPropertyService()

