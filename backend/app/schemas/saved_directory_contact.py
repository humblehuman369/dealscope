"""Schemas for saved directory contacts (lenders and buyers)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

DirectoryEntityTypeLiteral = Literal["lender", "buyer"]

MAX_SNAPSHOT_BYTES = 16_384


class SavedDirectoryContactCreate(BaseModel):
    entity_type: DirectoryEntityTypeLiteral
    entity_id: int = Field(..., ge=1)
    snapshot: dict[str, Any] = Field(default_factory=dict)

    @field_validator("snapshot")
    @classmethod
    def validate_snapshot_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        import json

        encoded = json.dumps(v, default=str)
        if len(encoded.encode("utf-8")) > MAX_SNAPSHOT_BYTES:
            raise ValueError("snapshot exceeds maximum size")
        return v


class SavedDirectoryContactResponse(BaseModel):
    id: str
    user_id: str
    entity_type: DirectoryEntityTypeLiteral
    entity_id: int
    snapshot: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedDirectoryContactList(BaseModel):
    items: list[SavedDirectoryContactResponse]
    total: int


class SavedDirectoryContactCheckResponse(BaseModel):
    is_saved: bool
    saved_contact_id: str | None = None
