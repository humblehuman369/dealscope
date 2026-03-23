"""
Map search router — viewport / polygon based property listing search.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.core.deps import OptionalUser
from app.schemas.property import MapSearchRequest, MapSearchResponse
from app.services.map_search_service import map_search_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Map Search"])


@router.post("/properties/search-area", response_model=MapSearchResponse)
async def search_area(
    request: MapSearchRequest,
    current_user: OptionalUser = None,
):
    """
    Search for property listings within a map viewport or drawn polygon.

    Accepts bounding box coordinates (north/south/east/west) and optional
    polygon vertices. Returns lightweight listing objects suitable for map
    marker display.
    """
    if request.north <= request.south:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="north must be greater than south",
        )
    if request.east <= request.west:
        # Viewport crosses the antimeridian (e.g. Alaska) — normalize by
        # clamping to the western hemisphere so the search still works.
        request.west = -165.0
        if request.east < request.west:
            request.east = -65.0

    try:
        return await map_search_service.search(request)
    except Exception as e:
        logger.exception("Map search failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Map search unavailable: {e!s}",
        )
