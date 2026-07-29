"""Shared shapes for the lender and cash buyer directory APIs.

The two directories return the same envelope around different records. Declaring
the pagination half once means a change to it cannot land on one directory and
miss the other.

The record list itself stays on each subclass, under its own name (``lenders``,
``buyers``). A single generic field would have been tidier, but both frontends
read `page.lenders` / `page.buyers` off the response, so renaming it is a
breaking wire change for no benefit.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DirectoryListResponse(BaseModel):
    """Pagination envelope. Subclasses add the records under their own key."""

    total: int
    page: int
    limit: int
    totalPages: int = Field(serialization_alias="totalPages")

    model_config = {"populate_by_name": True}
