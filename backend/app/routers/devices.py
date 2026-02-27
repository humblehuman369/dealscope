"""
Device token router — register / unregister push notification tokens.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field

from app.core.deps import CurrentUser, DbSession
from app.models.device_token import DevicePlatform
from app.services.device_service import device_service
from app.services.push_notification_service import push_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/devices", tags=["Devices"])


# ── Schemas ──────────────────────────────────────────────────────────


class DeviceRegisterRequest(BaseModel):
    """Request body for registering a push token."""

    token: str = Field(..., min_length=1, max_length=255, description="Expo push token")
    device_platform: DevicePlatform = Field(..., description="ios or android")
    device_name: str | None = Field(None, max_length=255, description="Human-readable device name")


class DeviceRegisterResponse(BaseModel):
    """Response after successful registration."""

    id: str
    token: str
    device_platform: str
    device_name: str | None
    is_active: bool


class DeviceListResponse(BaseModel):
    """A device in the list response."""

    id: str
    token: str
    device_platform: str
    device_name: str | None
    is_active: bool
    last_used_at: str | None
    created_at: str


# ── Endpoints ────────────────────────────────────────────────────────


@router.post(
    "/register",
    response_model=DeviceRegisterResponse,
    status_code=status.HTTP_200_OK,
    summary="Register a push notification token",
)
async def register_device(
    body: DeviceRegisterRequest,
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
):
    """
    Register or re-activate an Expo push token for the authenticated user.

    Idempotent — calling this multiple times with the same token is safe.
    The token is globally unique; if it was previously owned by another
    user it will be reassigned to the current user.
    """
    # Check if this is the user's first device (for welcome notification)
    existing_devices = await device_service.list_user_devices(db, current_user.id)
    is_first_device = len(existing_devices) == 0

    device = await device_service.register_token(
        db,
        user_id=current_user.id,
        token=body.token,
        device_platform=body.device_platform,
        device_name=body.device_name,
    )

    # Send a welcome notification on first device registration
    if is_first_device:
        background_tasks.add_task(
            push_service.send_to_tokens,
            db,
            [body.token],
            title="Welcome to DealGapIQ!",
            body="Scan any property to get instant investment analysis across 6 strategies.",
            data={"type": "scan"},
        )

    return DeviceRegisterResponse(
        id=str(device.id),
        token=device.token,
        device_platform=device.device_platform.value,
        device_name=device.device_name,
        is_active=device.is_active,
    )


@router.delete(
    "/{token}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unregister a push notification token",
)
async def unregister_device(
    token: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Deactivate a device token (e.g., on logout).

    The token is not deleted — just marked inactive so it won't
    receive further notifications.
    """
    deactivated = await device_service.unregister_token(
        db,
        user_id=current_user.id,
        token=token,
    )
    if not deactivated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device token not found",
        )


@router.get(
    "",
    response_model=list[DeviceListResponse],
    summary="List registered devices",
)
async def list_devices(
    current_user: CurrentUser,
    db: DbSession,
):
    """List all registered device tokens for the current user."""
    devices = await device_service.list_user_devices(db, current_user.id)

    return [
        DeviceListResponse(
            id=str(d.id),
            token=d.token,
            device_platform=d.device_platform.value,
            device_name=d.device_name,
            is_active=d.is_active,
            last_used_at=d.last_used_at.isoformat() if d.last_used_at else None,
            created_at=d.created_at.isoformat(),
        )
        for d in devices
    ]
