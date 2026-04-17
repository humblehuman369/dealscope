"""
Map search router — viewport / polygon based property listing search,
plus Mashvisor investment heatmap and neighborhood intelligence.
"""

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.core.deps import OptionalUser
from app.schemas.property import (
    HeatmapPolygon,
    HeatmapRequest,
    HeatmapResponse,
    MapSearchRequest,
    MapSearchResponse,
    NeighborhoodListResponse,
    NeighborhoodOverview,
    NeighborhoodSummary,
)
from app.services.api_clients import MashvisorClient
from app.services.cache_service import get_cache_service
from app.services.map_search_service import map_search_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Map Search"])

HEATMAP_CACHE_TTL = 86400  # 24 hours
NEIGHBORHOOD_LIST_CACHE_TTL = 604800  # 7 days
NEIGHBORHOOD_OVERVIEW_CACHE_TTL = 86400  # 24 hours


def _get_mashvisor() -> MashvisorClient | None:
    if not settings.MASHVISOR_RAPIDAPI_KEY:
        return None
    return MashvisorClient(
        api_key=settings.MASHVISOR_RAPIDAPI_KEY,
        rapidapi_host=settings.MASHVISOR_RAPIDAPI_HOST,
    )


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


@router.post("/map/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    request: HeatmapRequest,
    current_user: OptionalUser = None,
):
    """Return investment heatmap polygons for a bounding box from Mashvisor."""
    client = _get_mashvisor()
    if not client:
        raise HTTPException(status_code=503, detail="Mashvisor not configured")

    cache = get_cache_service()
    cache_key = f"mashvisor:heatmap:{request.state}:{request.metric_type}:{request.sw_lat:.2f}:{request.sw_lng:.2f}:{request.ne_lat:.2f}:{request.ne_lng:.2f}"
    try:
        cached = await cache.get(cache_key)
        if cached:
            return HeatmapResponse(**cached)
    except Exception:
        pass

    try:
        resp = await client.heatmap(
            state=request.state,
            sw_lat=request.sw_lat,
            sw_lng=request.sw_lng,
            ne_lat=request.ne_lat,
            ne_lng=request.ne_lng,
            metric_type=request.metric_type,
        )
    except Exception as e:
        logger.exception("Heatmap Mashvisor API call failed")
        raise HTTPException(status_code=503, detail=f"Heatmap unavailable: {e!s}")

    if not resp.success or not resp.data:
        raise HTTPException(status_code=503, detail="Heatmap data unavailable")

    content = resp.data.get("content", {})
    raw_polygons = content.get("results", []) if isinstance(content, dict) else content
    if not isinstance(raw_polygons, list):
        raw_polygons = []

    polygons = []
    for p in raw_polygons:
        if not isinstance(p, dict):
            continue
        # The metric value field name varies by metric_type (e.g. airbnb_coc,
        # airbnb_rental, traditional_coc, occupancy_rate, etc.)
        metric_value = p.get("value")
        if metric_value is None:
            for k in ("airbnb_coc", "airbnb_rental", "traditional_coc",
                       "traditional_rental", "occupancy_rate", "listing_price"):
                if p.get(k) is not None:
                    metric_value = p[k]
                    break
        polygons.append(HeatmapPolygon(
            id=p.get("id", 0),
            boundary=p.get("boundary", ""),
            color=p.get("color"),
            border_color=p.get("border_color"),
            color_level=p.get("color_level"),
            value=metric_value,
            airbnb_coc=p.get("airbnb_coc"),
        ))

    result = HeatmapResponse(
        polygons=polygons,
        metric_type=request.metric_type,
        total_count=len(polygons),
    )
    try:
        await cache.set(cache_key, result.model_dump(), ttl=HEATMAP_CACHE_TTL)
    except Exception:
        logger.warning("Failed to cache heatmap result")
    return result


@router.get("/map/neighborhoods/{state}/{city}", response_model=NeighborhoodListResponse)
async def get_neighborhoods(
    state: str,
    city: str,
    current_user: OptionalUser = None,
):
    """Return all neighborhoods for a city with lat/lng for map labels."""
    client = _get_mashvisor()
    if not client:
        raise HTTPException(status_code=503, detail="Mashvisor not configured")

    cache = get_cache_service()
    cache_key = f"mashvisor:neighborhoods:{state}:{city}"
    cached = await cache.get(cache_key)
    if cached:
        return NeighborhoodListResponse(**cached)

    resp = await client.city_neighborhoods(state=state, city=city)
    if not resp.success or not resp.data:
        raise HTTPException(status_code=503, detail="Neighborhood data unavailable")

    content = resp.data.get("content", {})
    raw = content.get("results", []) if isinstance(content, dict) else content
    if not isinstance(raw, list):
        raw = []

    neighborhoods = []
    for n in raw:
        if not isinstance(n, dict):
            continue
        neighborhoods.append(NeighborhoodSummary(
            id=n.get("id", 0),
            name=n.get("name", ""),
            city=n.get("city", city),
            state=n.get("state", state),
            latitude=n.get("latitude"),
            longitude=n.get("longitude"),
        ))

    result = NeighborhoodListResponse(
        neighborhoods=neighborhoods,
        city=city,
        state=state,
        total_count=len(neighborhoods),
    )
    await cache.set(cache_key, result.model_dump(), ttl=NEIGHBORHOOD_LIST_CACHE_TTL)
    return result


@router.get("/map/neighborhood/{neighborhood_id}", response_model=NeighborhoodOverview)
async def get_neighborhood_overview(
    neighborhood_id: int,
    state: str = Query(..., description="Two-letter state code"),
    current_user: OptionalUser = None,
):
    """Return investment scorecard for a single neighborhood."""
    client = _get_mashvisor()
    if not client:
        raise HTTPException(status_code=503, detail="Mashvisor not configured")

    cache = get_cache_service()
    cache_key = f"mashvisor:neighborhood:{neighborhood_id}:{state}"
    cached = await cache.get(cache_key)
    if cached:
        return NeighborhoodOverview(**cached)

    resp = await client.neighborhood_overview(neighborhood_id=neighborhood_id, state=state)
    if not resp.success or not resp.data:
        raise HTTPException(status_code=503, detail="Neighborhood overview unavailable")

    c = resp.data.get("content", {})
    if not isinstance(c, dict):
        raise HTTPException(status_code=503, detail="Unexpected response shape")

    airbnb = c.get("airbnb_rental", {}) or {}
    traditional = c.get("traditional_rental", {}) or {}

    result = NeighborhoodOverview(
        id=c.get("id"),
        name=c.get("name"),
        city=c.get("city"),
        state=c.get("state"),
        walkscore=c.get("walkscore"),
        transitscore=c.get("transitscore"),
        bikescore=c.get("bikescore"),
        mashmeter=c.get("mashMeter"),
        mashmeter_stars=c.get("mashMeterStars"),
        median_price=c.get("median_price"),
        price_per_sqft=c.get("price_per_sqft"),
        num_of_properties=c.get("num_of_properties"),
        num_of_airbnb_properties=c.get("num_of_airbnb_properties"),
        avg_occupancy=c.get("avg_occupancy"),
        avg_days_on_market=c.get("average_days_on_market"),
        recommended_strategy=c.get("strategy"),
        airbnb_cap_rate=airbnb.get("cap_rate"),
        airbnb_rental_income=airbnb.get("rental_income"),
        airbnb_coc=airbnb.get("roi"),
        traditional_cap_rate=traditional.get("cap_rate"),
        traditional_rental_income=traditional.get("rental_income"),
        traditional_coc=traditional.get("roi"),
        sale_price_trend_1yr=c.get("sale_price_trends_last_1_year"),
        sale_price_trend_3yr=c.get("sale_price_trends_last_3_years"),
        sale_price_trend_5yr=c.get("sale_price_trends_last_5_years"),
        sold_last_month=c.get("number_of_sold_properties_last_month"),
        sold_last_year=c.get("number_of_sold_properties_last_year"),
    )
    await cache.set(cache_key, result.model_dump(), ttl=NEIGHBORHOOD_OVERVIEW_CACHE_TTL)
    return result
