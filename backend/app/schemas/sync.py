"""
Sync schemas for bidirectional data synchronization.
"""

from typing import Any

from pydantic import BaseModel, Field


class SyncPullRequest(BaseModel):
    """Request to pull changes since a given timestamp."""

    since: int | None = Field(
        None, description="Unix timestamp (seconds). Only return changes after this time. If null, return all data."
    )
    tables: list[str] = Field(
        default=["scanned_properties", "portfolio_properties", "settings"], description="Tables to sync"
    )
    limit: int = Field(default=100, ge=1, le=500, description="Max records per table")


class SyncRecord(BaseModel):
    """A single synced record with metadata."""

    id: str
    table_name: str
    action: str = Field(description="create, update, or delete")
    data: dict[str, Any] | None = Field(None, description="Record data (null for deletes)")
    updated_at: int = Field(description="Unix timestamp of last update")
    created_at: int = Field(description="Unix timestamp of creation")


class SyncPullResponse(BaseModel):
    """Response containing changes since the requested timestamp."""

    scanned_properties: list[SyncRecord] = Field(default_factory=list)
    portfolio_properties: list[SyncRecord] = Field(default_factory=list)
    settings: list[SyncRecord] = Field(default_factory=list)
    server_time: int = Field(description="Current server time (Unix timestamp)")
    has_more: bool = Field(default=False, description="Whether there are more records to fetch")
    next_since: int | None = Field(None, description="Use this as 'since' for next request if has_more is true")


class SyncPushRequest(BaseModel):
    """Request to push local changes to server."""

    changes: list[SyncRecord]
    client_time: int = Field(description="Client's current time (Unix timestamp)")


class SyncPushResult(BaseModel):
    """Result of a single sync push operation."""

    id: str
    success: bool
    error: str | None = None
    server_updated_at: int | None = None
    conflict: bool = False
    resolution: str | None = None  # "local_wins" or "server_wins"


class SyncPushResponse(BaseModel):
    """Response from pushing changes."""

    results: list[SyncPushResult]
    server_time: int
    processed: int
    failed: int
