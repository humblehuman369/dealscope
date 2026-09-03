"""
Saved map searches router.

Pro-gated: a saved search that alerts is a recurring provider query on the
user's behalf, so it sits with the other paid capabilities rather than on the
free tier. Free users get the panel with an upgrade prompt (the frontend
renders the gate), not a 404.

Alert scheduling has a second gate on top of the plan gate: the search itself
must be on the cheap dispatch path. That check runs here at write time — the
cron re-checks it, but refusing at write time is what lets the UI explain
*why* rather than silently never sending.
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.deps import DbSession, ProUser
from app.models.saved_map_search import MAX_SAVED_SEARCHES_PER_USER, AlertFrequency
from app.schemas.saved_map_search import (
    SavedMapSearchCreate,
    SavedMapSearchList,
    SavedMapSearchResponse,
    SavedMapSearchUpdate,
)
from app.services import saved_map_search_service as service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/saved-map-searches", tags=["Saved Map Searches"])


def _to_response(search) -> SavedMapSearchResponse:
    response = SavedMapSearchResponse.model_validate(search)
    response.alert_ineligible_reason = service.ineligible_reason(search)
    return response


@router.get("", response_model=SavedMapSearchList, summary="List saved map searches")
async def list_saved_searches(current_user: ProUser, db: DbSession):
    searches = await service.list_for_user(db, current_user.id)
    return SavedMapSearchList(
        searches=[_to_response(s) for s in searches],
        total=len(searches),
        max_allowed=MAX_SAVED_SEARCHES_PER_USER,
    )


@router.post(
    "",
    response_model=SavedMapSearchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save the current map viewport, boundary and filters",
)
async def create_saved_search(
    payload: SavedMapSearchCreate,
    current_user: ProUser,
    db: DbSession,
):
    if payload.north <= payload.south:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="north must be greater than south",
        )
    if payload.east <= payload.west:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="east must be greater than west",
        )

    if await service.is_at_limit(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"You've reached the limit of {MAX_SAVED_SEARCHES_PER_USER} saved "
                "searches. Delete one to save another."
            ),
        )

    search = service.build(current_user.id, payload)

    if search.alert_frequency != AlertFrequency.OFF:
        reason = service.ineligible_reason(search)
        if reason:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=reason)

    db.add(search)
    await db.commit()
    await db.refresh(search)
    return _to_response(search)


@router.patch(
    "/{search_id}",
    response_model=SavedMapSearchResponse,
    summary="Rename a saved search or change its alert schedule",
)
async def update_saved_search(
    search_id: uuid.UUID,
    payload: SavedMapSearchUpdate,
    current_user: ProUser,
    db: DbSession,
):
    search = await service.get_for_user(db, current_user.id, search_id)
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved search not found")

    if payload.name is not None:
        search.name = payload.name

    if payload.alert_frequency is not None:
        if payload.alert_frequency != AlertFrequency.OFF:
            reason = service.ineligible_reason(search)
            if reason:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=reason
                )
        search.alert_frequency = payload.alert_frequency

    await db.commit()
    await db.refresh(search)
    return _to_response(search)


@router.delete(
    "/{search_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved search",
)
async def delete_saved_search(
    search_id: uuid.UUID,
    current_user: ProUser,
    db: DbSession,
):
    search = await service.get_for_user(db, current_user.id, search_id)
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved search not found")
    await db.delete(search)
    await db.commit()
