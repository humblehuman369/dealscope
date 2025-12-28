"""
User service for profile and account management.
"""

from typing import Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.user import User, UserProfile
from app.schemas.user import UserUpdate, UserProfileCreate, UserProfileUpdate

logger = logging.getLogger(__name__)


class UserService:
    """
    Service for user and profile operations.
    """
    
    # ===========================================
    # User Operations
    # ===========================================
    
    async def get_user_by_id(
        self,
        db: AsyncSession,
        user_id: str,
        include_profile: bool = True
    ) -> Optional[User]:
        """Get a user by ID with optional profile."""
        query = select(User).where(User.id == user_id)
        
        if include_profile:
            query = query.options(selectinload(User.profile))
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_user(
        self,
        db: AsyncSession,
        user: User,
        data: UserUpdate
    ) -> User:
        """Update user's basic info."""
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User updated: {user.email}")
        
        return user
    
    async def delete_user(
        self,
        db: AsyncSession,
        user: User
    ) -> bool:
        """Delete a user and all associated data."""
        await db.delete(user)
        await db.commit()
        
        logger.info(f"User deleted: {user.email}")
        
        return True
    
    # ===========================================
    # Profile Operations
    # ===========================================
    
    async def get_profile(
        self,
        db: AsyncSession,
        user_id: str
    ) -> Optional[UserProfile]:
        """Get a user's profile."""
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def create_profile(
        self,
        db: AsyncSession,
        user_id: str,
        data: UserProfileCreate
    ) -> UserProfile:
        """Create a user profile."""
        profile_data = data.model_dump(exclude_unset=True)
        profile = UserProfile(user_id=user_id, **profile_data)
        
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        logger.info(f"Profile created for user: {user_id}")
        
        return profile
    
    async def update_profile(
        self,
        db: AsyncSession,
        profile: UserProfile,
        data: UserProfileUpdate
    ) -> UserProfile:
        """Update a user's profile."""
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        await db.commit()
        await db.refresh(profile)
        
        logger.info(f"Profile updated for user: {profile.user_id}")
        
        return profile
    
    async def update_onboarding(
        self,
        db: AsyncSession,
        profile: UserProfile,
        step: int,
        completed: bool = False
    ) -> UserProfile:
        """Update onboarding progress."""
        profile.onboarding_step = step
        
        if completed:
            profile.onboarding_completed = True
        
        await db.commit()
        await db.refresh(profile)
        
        return profile
    
    async def get_or_create_profile(
        self,
        db: AsyncSession,
        user_id: str
    ) -> UserProfile:
        """Get existing profile or create a new one."""
        profile = await self.get_profile(db, user_id)
        
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.add(profile)
            await db.commit()
            await db.refresh(profile)
        
        return profile


# Singleton instance
user_service = UserService()

