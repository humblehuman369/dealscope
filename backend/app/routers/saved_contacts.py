"""
Saved directory contacts router — lenders and cash buyers saved by Paid Pro users.
"""

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import DbSession, PaidProUser
from app.schemas.saved_directory_contact import (
    DirectoryEntityTypeLiteral,
    SavedDirectoryContactCheckResponse,
    SavedDirectoryContactCreate,
    SavedDirectoryContactList,
    SavedDirectoryContactResponse,
)
from app.services.saved_directory_contact_service import saved_directory_contact_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/saved-contacts", tags=["Saved Contacts"])

_VALID_ENTITY_TYPES = frozenset({"lender", "buyer"})


def _to_response(row) -> SavedDirectoryContactResponse:
    return SavedDirectoryContactResponse(
        id=str(row.id),
        user_id=str(row.user_id),
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        snapshot=row.snapshot or {},
        created_at=row.created_at,
    )


@router.get("/check", response_model=SavedDirectoryContactCheckResponse, summary="Check if contact is saved")
async def check_saved_contact(
    current_user: PaidProUser,
    db: DbSession,
    entity_type: DirectoryEntityTypeLiteral = Query(...),
    entity_id: int = Query(..., ge=1),
):
    if entity_type not in _VALID_ENTITY_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid entity_type")

    row = await saved_directory_contact_service.check_saved(
        db, str(current_user.id), entity_type, entity_id
    )
    if row:
        return SavedDirectoryContactCheckResponse(is_saved=True, saved_contact_id=str(row.id))
    return SavedDirectoryContactCheckResponse(is_saved=False, saved_contact_id=None)


@router.get("", response_model=SavedDirectoryContactList, summary="List saved directory contacts")
async def list_saved_contacts(
    current_user: PaidProUser,
    db: DbSession,
    entity_type: DirectoryEntityTypeLiteral | None = Query(None),
):
    if entity_type is not None and entity_type not in _VALID_ENTITY_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid entity_type")

    rows = await saved_directory_contact_service.list_contacts(
        db, str(current_user.id), entity_type=entity_type
    )
    total = await saved_directory_contact_service.count_contacts(
        db, str(current_user.id), entity_type=entity_type
    )
    return SavedDirectoryContactList(
        items=[_to_response(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=SavedDirectoryContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a directory contact",
)
async def create_saved_contact(
    current_user: PaidProUser,
    db: DbSession,
    body: SavedDirectoryContactCreate,
):
    if body.entity_type not in _VALID_ENTITY_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid entity_type")

    try:
        row = await saved_directory_contact_service.save_contact(
            db, str(current_user.id), body
        )
        await db.commit()
        await db.refresh(row)
        return _to_response(row)
    except ValueError as exc:
        await db.rollback()
        msg = str(exc)
        if msg == "buyer not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg) from exc
        if msg == "already saved":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg) from exc


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Unsave a contact")
async def delete_saved_contact(
    contact_id: str,
    current_user: PaidProUser,
    db: DbSession,
):
    deleted = await saved_directory_contact_service.delete_contact(
        db, contact_id, str(current_user.id)
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    await db.commit()
