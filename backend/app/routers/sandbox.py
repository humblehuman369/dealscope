"""Activation Arc Phase 0 (B2) — sandbox endpoint.

Thin HTTP layer for the Build Your Deal sandbox recompute. Designed for
slider responsiveness (≤100ms p95 target) — pure function, no DB, no
external calls. The frontend caches the verdict response and replays the
base inputs on every slider drag.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.sandbox import SandboxRequest, SandboxResponse
from app.services.sandbox import recompute_gap

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analytics"])


@router.post("/api/v1/analysis/sandbox", response_model=SandboxResponse)
def calculate_sandbox(request: SandboxRequest) -> SandboxResponse:
    """Recompute Deal Gap + motivating tier + cash flow given slider adjustments.

    Pure compute — no DB read, no external calls. Safe to invoke on every
    slider drag from the verdict-page Build Your Deal sandbox.
    """
    try:
        return recompute_gap(request)
    except Exception as e:  # noqa: BLE001 — boundary handler
        logger.error("Sandbox recompute error: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
