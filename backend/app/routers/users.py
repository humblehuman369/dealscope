"""
Users router for profile and account management.
"""

import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.user_service import user_service
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserWithProfile,
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    OnboardingProgress,
)
from app.schemas.auth import AuthMessage
from app.core.deps import CurrentUser, DbSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


# ===========================================
# User Assumptions Schemas
# ===========================================

class UserAssumptionsResponse(BaseModel):
    """User's saved default assumptions."""
    assumptions: Dict[str, Any]
    has_customizations: bool
    updated_at: Optional[str] = None


class UserAssumptionsUpdate(BaseModel):
    """Update user's default assumptions."""
    assumptions: Dict[str, Any]


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries."""
    result = {**base}
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


# ===========================================
# Current User Profile
# ===========================================

@router.get(
    "/me",
    response_model=UserWithProfile,
    summary="Get current user with profile"
)
async def get_current_user_with_profile(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Get the current user's full information including profile.
    """
    # Reload with profile
    user = await user_service.get_user_by_id(
        db, 
        str(current_user.id), 
        include_profile=True
    )
    
    profile_response = None
    if user.profile:
        profile_response = UserProfileResponse(
            id=str(user.profile.id),
            user_id=str(user.profile.user_id),
            investment_experience=user.profile.investment_experience,
            preferred_strategies=user.profile.preferred_strategies,
            target_markets=user.profile.target_markets,
            investment_budget_min=user.profile.investment_budget_min,
            investment_budget_max=user.profile.investment_budget_max,
            target_cash_on_cash=user.profile.target_cash_on_cash,
            target_cap_rate=user.profile.target_cap_rate,
            risk_tolerance=user.profile.risk_tolerance,
            default_assumptions=user.profile.default_assumptions,
            notification_preferences=user.profile.notification_preferences,
            dashboard_layout=user.profile.dashboard_layout,
            preferred_theme=user.profile.preferred_theme,
            onboarding_completed=user.profile.onboarding_completed,
            onboarding_step=user.profile.onboarding_step,
            created_at=user.profile.created_at,
            updated_at=user.profile.updated_at,
        )
    
    return UserWithProfile(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        last_login=user.last_login,
        has_profile=user.profile is not None,
        onboarding_completed=user.profile.onboarding_completed if user.profile else False,
        profile=profile_response,
        business_name=user.business_name,
        business_type=user.business_type,
        business_address_street=user.business_address_street,
        business_address_city=user.business_address_city,
        business_address_state=user.business_address_state,
        business_address_zip=user.business_address_zip,
        business_address_country=user.business_address_country,
        phone_numbers=user.phone_numbers,
        additional_emails=user.additional_emails,
        social_links=user.social_links,
        license_number=user.license_number,
        license_state=user.license_state,
        bio=user.bio,
    )


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user"
)
async def update_current_user(
    data: UserUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Update the current user's basic information.
    
    - **full_name**: Display name
    - **avatar_url**: URL to avatar image
    """
    user = await user_service.update_user(db, current_user, data)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        last_login=user.last_login,
        has_profile=user.profile is not None,
        onboarding_completed=user.profile.onboarding_completed if user.profile else False,
        business_name=user.business_name,
        business_type=user.business_type,
        business_address_street=user.business_address_street,
        business_address_city=user.business_address_city,
        business_address_state=user.business_address_state,
        business_address_zip=user.business_address_zip,
        business_address_country=user.business_address_country,
        phone_numbers=user.phone_numbers,
        additional_emails=user.additional_emails,
        social_links=user.social_links,
        license_number=user.license_number,
        license_state=user.license_state,
        bio=user.bio,
    )


@router.delete(
    "/me",
    response_model=AuthMessage,
    summary="Delete current user account"
)
async def delete_current_user(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Delete the current user's account and all associated data.
    
    ⚠️ This action is irreversible!
    """
    await user_service.delete_user(db, current_user)
    
    return AuthMessage(
        message="Account deleted successfully",
        success=True
    )


# ===========================================
# Profile Management
# ===========================================

@router.get(
    "/me/profile",
    response_model=UserProfileResponse,
    summary="Get current user's profile"
)
async def get_profile(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Get the current user's investment profile.
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    
    return UserProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        investment_experience=profile.investment_experience,
        preferred_strategies=profile.preferred_strategies,
        target_markets=profile.target_markets,
        investment_budget_min=profile.investment_budget_min,
        investment_budget_max=profile.investment_budget_max,
        target_cash_on_cash=profile.target_cash_on_cash,
        target_cap_rate=profile.target_cap_rate,
        risk_tolerance=profile.risk_tolerance,
        default_assumptions=profile.default_assumptions,
        notification_preferences=profile.notification_preferences,
        dashboard_layout=profile.dashboard_layout,
        preferred_theme=profile.preferred_theme,
        onboarding_completed=profile.onboarding_completed,
        onboarding_step=profile.onboarding_step,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.patch(
    "/me/profile",
    response_model=UserProfileResponse,
    summary="Update profile"
)
async def update_profile(
    data: UserProfileUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Update the current user's investment profile.
    
    All fields are optional - only provided fields will be updated.
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    profile = await user_service.update_profile(db, profile, data)
    
    return UserProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        investment_experience=profile.investment_experience,
        preferred_strategies=profile.preferred_strategies,
        target_markets=profile.target_markets,
        investment_budget_min=profile.investment_budget_min,
        investment_budget_max=profile.investment_budget_max,
        target_cash_on_cash=profile.target_cash_on_cash,
        target_cap_rate=profile.target_cap_rate,
        risk_tolerance=profile.risk_tolerance,
        default_assumptions=profile.default_assumptions,
        notification_preferences=profile.notification_preferences,
        dashboard_layout=profile.dashboard_layout,
        preferred_theme=profile.preferred_theme,
        onboarding_completed=profile.onboarding_completed,
        onboarding_step=profile.onboarding_step,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


# ===========================================
# Onboarding
# ===========================================

@router.post(
    "/me/onboarding",
    response_model=UserProfileResponse,
    summary="Update onboarding progress"
)
async def update_onboarding(
    data: OnboardingProgress,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Update the user's onboarding progress.
    
    - **step**: Current step (0-5)
    - **completed**: Mark onboarding as completed
    - **data**: Optional profile data to save at this step
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    
    # If step includes profile data, update it
    if data.data:
        profile_update = UserProfileUpdate(**data.data)
        profile = await user_service.update_profile(db, profile, profile_update)
    
    # Update onboarding progress
    profile = await user_service.update_onboarding(
        db, profile, data.step, data.completed
    )
    
    return UserProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        investment_experience=profile.investment_experience,
        preferred_strategies=profile.preferred_strategies,
        target_markets=profile.target_markets,
        investment_budget_min=profile.investment_budget_min,
        investment_budget_max=profile.investment_budget_max,
        target_cash_on_cash=profile.target_cash_on_cash,
        target_cap_rate=profile.target_cap_rate,
        risk_tolerance=profile.risk_tolerance,
        default_assumptions=profile.default_assumptions,
        notification_preferences=profile.notification_preferences,
        dashboard_layout=profile.dashboard_layout,
        preferred_theme=profile.preferred_theme,
        onboarding_completed=profile.onboarding_completed,
        onboarding_step=profile.onboarding_step,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post(
    "/me/onboarding/complete",
    response_model=UserProfileResponse,
    summary="Mark onboarding as complete"
)
async def complete_onboarding(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Mark the user's onboarding as complete.
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    profile = await user_service.update_onboarding(db, profile, 5, completed=True)
    
    return UserProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        investment_experience=profile.investment_experience,
        preferred_strategies=profile.preferred_strategies,
        target_markets=profile.target_markets,
        investment_budget_min=profile.investment_budget_min,
        investment_budget_max=profile.investment_budget_max,
        target_cash_on_cash=profile.target_cash_on_cash,
        target_cap_rate=profile.target_cap_rate,
        risk_tolerance=profile.risk_tolerance,
        default_assumptions=profile.default_assumptions,
        notification_preferences=profile.notification_preferences,
        dashboard_layout=profile.dashboard_layout,
        preferred_theme=profile.preferred_theme,
        onboarding_completed=profile.onboarding_completed,
        onboarding_step=profile.onboarding_step,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


# ===========================================
# User Default Assumptions
# ===========================================

@router.get(
    "/me/assumptions",
    response_model=UserAssumptionsResponse,
    summary="Get user's default assumptions",
    tags=["Defaults"]
)
async def get_user_assumptions(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Get the current user's saved default assumptions.
    
    These override system defaults when calculating investment metrics.
    Returns:
    - **assumptions**: User's custom default values
    - **has_customizations**: Whether user has any custom defaults set
    - **updated_at**: When assumptions were last updated
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    
    assumptions = profile.default_assumptions or {}
    has_customizations = bool(assumptions)
    
    return UserAssumptionsResponse(
        assumptions=assumptions,
        has_customizations=has_customizations,
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None
    )


@router.put(
    "/me/assumptions",
    response_model=UserAssumptionsResponse,
    summary="Update user's default assumptions",
    tags=["Defaults"]
)
async def update_user_assumptions(
    data: UserAssumptionsUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Update the current user's default assumptions.
    
    These values will override system defaults in all calculations.
    
    Example request body:
    ```json
    {
        "assumptions": {
            "financing": {
                "down_payment_pct": 0.25,
                "interest_rate": 0.055
            },
            "operating": {
                "vacancy_rate": 0.03,
                "property_management_pct": 0.0
            }
        }
    }
    ```
    
    Only include fields you want to override. Other fields will use system defaults.
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    
    # Merge with existing assumptions (allow partial updates)
    existing = profile.default_assumptions or {}
    merged = _deep_merge(existing, data.assumptions)
    
    # Update profile with new assumptions
    profile_update = UserProfileUpdate(default_assumptions=merged)
    profile = await user_service.update_profile(db, profile, profile_update)
    
    return UserAssumptionsResponse(
        assumptions=profile.default_assumptions or {},
        has_customizations=bool(profile.default_assumptions),
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None
    )


@router.delete(
    "/me/assumptions",
    response_model=UserAssumptionsResponse,
    summary="Reset user's default assumptions",
    tags=["Defaults"]
)
async def reset_user_assumptions(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Reset the current user's default assumptions to system defaults.
    
    This removes all custom overrides and reverts to system defaults.
    """
    profile = await user_service.get_or_create_profile(db, str(current_user.id))
    
    # Clear assumptions
    profile_update = UserProfileUpdate(default_assumptions={})
    profile = await user_service.update_profile(db, profile, profile_update)
    
    return UserAssumptionsResponse(
        assumptions={},
        has_customizations=False,
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None
    )

