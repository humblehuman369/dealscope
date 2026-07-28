"""Location lookup used by the directory search inputs (/api/geo).

Reference data only — no user or property records — so this is gated on being
signed in rather than on a Pro entitlement. Directory results themselves stay
gated in their own routers.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser
from app.schemas.geo import ZipLocationResponse
from app.services.zip_geo import resolve_zip

router = APIRouter(prefix="/api/geo", tags=["Geo"])


@router.get(
    "/zip/{zip_code}",
    response_model=ZipLocationResponse,
    responses={404: {"description": "ZIP not recognized"}},
    summary="Resolve a ZIP code to state and county",
)
async def get_zip_location(zip_code: str, current_user: CurrentUser):
    """Resolve a 5-digit ZIP (ZIP+4 accepted) to its state and county."""
    location = resolve_zip(zip_code)
    if location is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ZIP code not recognized",
        )
    return ZipLocationResponse(
        zip=location.zip_code,
        state=location.state,
        county=location.county,
        counties=list(location.counties),
    )
