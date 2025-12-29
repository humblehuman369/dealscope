"""
InvestIQ - Real Estate Investment Analytics API
Main FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime
import logging
import os
import sys

# Configure logging FIRST - output to stdout for Railway
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout  # Force stdout instead of stderr
)
logger = logging.getLogger(__name__)

# Log startup immediately
logger.info("=" * 50)
logger.info("INVESTIQ API LOADING...")
logger.info(f"Python version: {sys.version}")
logger.info(f"PORT env: {os.environ.get('PORT', 'not set')}")
logger.info("=" * 50)

try:
    from app.core.config import settings
    logger.info("Config loaded successfully")
except Exception as e:
    logger.error(f"Failed to load config: {e}")
    raise

# Import property schemas from the new location
try:
    from app.schemas.property import (
        PropertySearchRequest, PropertyResponse, AnalyticsRequest, 
        AnalyticsResponse, AllAssumptions, StrategyType,
        SensitivityRequest, SensitivityResponse
    )
    logger.info("Schemas loaded successfully")
except Exception as e:
    logger.error(f"Failed to load schemas: {e}")
    raise

try:
    from app.services.property_service import property_service
    logger.info("Property service loaded successfully")
except Exception as e:
    logger.error(f"Failed to load property service: {e}")
    raise

# Import auth routers (optional - app works without them)
auth_router = None
users_router = None
saved_properties_router = None
admin_router = None
try:
    print(">>> Attempting to load auth routers...", flush=True)
    from app.routers.auth import router as auth_router
    from app.routers.users import router as users_router
    from app.routers.saved_properties import router as saved_properties_router
    from app.routers.admin import router as admin_router
    print(">>> Auth routers loaded successfully!", flush=True)
    logger.info("Auth, saved properties, and admin routers loaded successfully")
except Exception as e:
    import traceback
    print(f">>> AUTH ROUTER ERROR: {e}", flush=True)
    print(f">>> TRACEBACK:\n{traceback.format_exc()}", flush=True)
    logger.error(f"Auth routers failed to load: {e}")

# Import database session for cleanup
try:
    from app.db.session import close_db
    logger.info("Database session module loaded")
except Exception as e:
    logger.warning(f"Database session not available (OK for initial setup): {e}")
    close_db = None


# Lifespan context manager (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup and cleanup on shutdown."""
    # Startup
    logger.info("Starting InvestIQ API lifespan...")
    logger.info(f"RentCast API configured: {'Yes' if settings.RENTCAST_API_KEY else 'No'}")
    logger.info(f"AXESSO API configured: {'Yes' if settings.AXESSO_API_KEY else 'No'}")
    logger.info(f"Database configured: {'Yes' if settings.DATABASE_URL else 'No'}")
    logger.info(f"Auth enabled: {'Yes' if settings.FEATURE_AUTH_REQUIRED else 'Optional'}")
    
    # Create database tables if they don't exist
    if settings.DATABASE_URL and auth_router is not None:
        try:
            from app.db.base import Base
            from app.db.session import get_engine
            engine = get_engine()
            async with engine.begin() as conn:
                # Import all models
                from app.models import User, UserProfile, SavedProperty, PropertyAdjustment, Document, SharedLink
                await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
    
    logger.info("Lifespan startup complete - yielding to app")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down InvestIQ API...")
    if close_db:
        await close_db()
        logger.info("Database connections closed")


# Create FastAPI app with lifespan
app = FastAPI(
    title="InvestIQ API",
    description="""
    Real Estate Investment Analytics Platform - Analyze properties across 6 investment strategies.
    
    ## Features
    - **Property Search**: Fetch property data from RentCast & AXESSO APIs
    - **6 Strategy Analysis**: LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale
    - **User Authentication**: Register, login, profile management
    - **Saved Properties**: Save and track properties with custom adjustments
    - **Document Storage**: Upload documents for each property
    - **Sharing**: Generate shareable links for property analysis
    
    ## Authentication
    Protected endpoints require a Bearer token. Get a token via `/api/v1/auth/login`.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# INCLUDE ROUTERS
# ============================================

# Auth & User routes (only if available)
if auth_router is not None:
    app.include_router(auth_router)
    logger.info("Auth router included")
if users_router is not None:
    app.include_router(users_router)
    logger.info("Users router included")
if saved_properties_router is not None:
    app.include_router(saved_properties_router)
    logger.info("Saved properties router included")
if admin_router is not None:
    app.include_router(admin_router)
    logger.info("Admin router included")


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "auth_required": settings.FEATURE_AUTH_REQUIRED,
            "dashboard_enabled": settings.FEATURE_DASHBOARD_ENABLED,
            "document_upload": settings.FEATURE_DOCUMENT_UPLOAD_ENABLED,
            "sharing": settings.FEATURE_SHARING_ENABLED,
        }
    }


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "InvestIQ API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "strategies": [
            "Long-Term Rental",
            "Short-Term Rental", 
            "BRRRR",
            "Fix & Flip",
            "House Hacking",
            "Wholesale"
        ],
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "properties": "/api/v1/properties",
            "analytics": "/api/v1/analytics",
        }
    }


# ============================================
# PROPERTY ENDPOINTS (EXISTING - PRESERVED)
# ============================================

@app.post("/api/v1/properties/search", response_model=PropertyResponse)
async def search_property(request: PropertySearchRequest):
    """
    Search for a property by address.
    
    Fetches data from RentCast and AXESSO APIs, normalizes into unified schema.
    Returns property details, valuations, rental estimates, and data provenance.
    """
    try:
        # Build full address
        address_parts = [request.address]
        if request.city:
            address_parts.append(request.city)
        if request.state:
            address_parts.append(request.state)
        if request.zip_code:
            address_parts.append(request.zip_code)
        
        full_address = ", ".join(address_parts)
        
        logger.info(f"Searching for property: {full_address}")
        
        result = await property_service.search_property(full_address)
        return result
        
    except Exception as e:
        logger.error(f"Property search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    """
    Get cached property data by ID.
    """
    try:
        if property_id not in property_service._property_cache:
            raise HTTPException(status_code=404, detail="Property not found")
        
        return property_service._property_cache[property_id]["data"]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get property error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/properties/demo/sample", response_model=PropertyResponse)
async def get_demo_property():
    """
    Get sample/demo property data.
    
    Returns the Palm Beach County sample property from the Excel workbook
    for testing and demonstration purposes.
    """
    try:
        return property_service.get_mock_property()
    except Exception as e:
        logger.error(f"Demo property error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ANALYTICS ENDPOINTS (EXISTING - PRESERVED)
# ============================================

@app.post("/api/v1/analytics/calculate", response_model=AnalyticsResponse)
async def calculate_analytics(request: AnalyticsRequest):
    """
    Calculate investment analytics for a property.
    
    Computes metrics for all 6 strategies (or specified subset):
    - Long-Term Rental (LTR)
    - Short-Term Rental (STR/Airbnb)
    - BRRRR (Buy, Rehab, Rent, Refinance, Repeat)
    - Fix & Flip
    - House Hacking
    - Wholesale
    
    Uses provided assumptions or defaults from Assumptions Reference.
    """
    try:
        logger.info(f"Calculating analytics for property: {request.property_id}")
        
        result = await property_service.calculate_analytics(
            property_id=request.property_id,
            assumptions=request.assumptions,
            strategies=request.strategies
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Analytics calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/analytics/{property_id}/quick")
async def quick_analytics(
    property_id: str,
    purchase_price: Optional[float] = None,
    down_payment_pct: float = Query(0.20, ge=0, le=1),
    interest_rate: float = Query(0.075, ge=0, le=0.3)
):
    """
    Quick analytics with minimal parameters.
    
    Returns summary metrics for all strategies using default assumptions
    with optional overrides for key financing terms.
    """
    try:
        assumptions = AllAssumptions()
        if purchase_price:
            assumptions.financing.purchase_price = purchase_price
        assumptions.financing.down_payment_pct = down_payment_pct
        assumptions.financing.interest_rate = interest_rate
        
        result = await property_service.calculate_analytics(
            property_id=property_id,
            assumptions=assumptions
        )
        
        # Return summary only
        return {
            "property_id": property_id,
            "summary": {
                "ltr": {
                    "monthly_cash_flow": result.ltr.monthly_cash_flow if result.ltr else None,
                    "cash_on_cash_return": result.ltr.cash_on_cash_return if result.ltr else None,
                    "cap_rate": result.ltr.cap_rate if result.ltr else None
                },
                "str": {
                    "monthly_cash_flow": result.str.monthly_cash_flow if result.str else None,
                    "cash_on_cash_return": result.str.cash_on_cash_return if result.str else None,
                    "break_even_occupancy": result.str.break_even_occupancy if result.str else None
                },
                "brrrr": {
                    "cash_left_in_deal": result.brrrr.cash_left_in_deal if result.brrrr else None,
                    "infinite_roi_achieved": result.brrrr.infinite_roi_achieved if result.brrrr else None,
                    "equity_position": result.brrrr.equity_position if result.brrrr else None
                },
                "flip": {
                    "net_profit": result.flip.net_profit_before_tax if result.flip else None,
                    "roi": result.flip.roi if result.flip else None,
                    "meets_70_rule": result.flip.meets_70_rule if result.flip else None
                },
                "house_hack": {
                    "net_housing_cost": result.house_hack.net_housing_cost_scenario_a if result.house_hack else None,
                    "savings_vs_renting": result.house_hack.savings_vs_renting_a if result.house_hack else None
                },
                "wholesale": {
                    "net_profit": result.wholesale.net_profit if result.wholesale else None,
                    "roi": result.wholesale.roi if result.wholesale else None,
                    "deal_viability": result.wholesale.deal_viability if result.wholesale else None
                }
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Quick analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ASSUMPTIONS ENDPOINTS (EXISTING - PRESERVED)
# ============================================

@app.get("/api/v1/assumptions/defaults")
async def get_default_assumptions():
    """
    Get default assumptions for all strategies.
    
    Returns the Assumptions Reference from the Excel workbook
    with recommended default values for each parameter.
    """
    defaults = AllAssumptions()
    return {
        "assumptions": defaults.model_dump(),
        "descriptions": {
            "financing": {
                "down_payment_pct": "Down payment as percentage of purchase price (0.20 = 20%)",
                "interest_rate": "Annual mortgage interest rate (0.075 = 7.5%)",
                "loan_term_years": "Loan term in years (typically 30)",
                "closing_costs_pct": "Buyer closing costs as percentage (0.03 = 3%)"
            },
            "operating": {
                "vacancy_rate": "Expected vacancy as percentage (0.05 = 5%)",
                "property_management_pct": "Property management fee as % of rent",
                "maintenance_pct": "Maintenance reserve as % of rent"
            },
            "str": {
                "platform_fees_pct": "Airbnb/VRBO platform fees (0.15 = 15%)",
                "str_management_pct": "STR property management fee",
                "cleaning_cost_per_turnover": "Cost per guest turnover"
            },
            "brrrr": {
                "refinance_ltv": "Loan-to-value ratio for cash-out refinance (0.75 = 75%)",
                "purchase_discount_pct": "Target discount below market for distressed purchase"
            },
            "flip": {
                "hard_money_rate": "Annual interest rate for hard money loan",
                "selling_costs_pct": "Total selling costs including commission"
            },
            "house_hack": {
                "fha_down_payment_pct": "FHA minimum down payment (0.035 = 3.5%)",
                "fha_mip_rate": "FHA mortgage insurance premium rate"
            },
            "wholesale": {
                "assignment_fee": "Target wholesale assignment fee",
                "target_purchase_discount_pct": "70% rule discount from ARV"
            }
        }
    }


# ============================================
# SENSITIVITY ANALYSIS ENDPOINTS (EXISTING - PRESERVED)
# ============================================

@app.post("/api/v1/sensitivity/analyze")
async def run_sensitivity_analysis(request: SensitivityRequest):
    """
    Run sensitivity analysis on a key variable.
    
    Shows how KPIs change as the selected variable varies by ±5%, ±10%, etc.
    Useful for understanding investment risk and break-even points.
    """
    try:
        # Get base property
        if request.property_id not in property_service._property_cache:
            raise HTTPException(status_code=404, detail="Property not found")
        
        property_data = property_service._property_cache[request.property_id]["data"]
        
        # Map variable name to actual value (with None safety checks)
        variable_mapping = {
            "purchase_price": request.assumptions.financing.purchase_price or property_data.valuations.current_value_avm or 425000,
            "interest_rate": request.assumptions.financing.interest_rate,
            "down_payment_pct": request.assumptions.financing.down_payment_pct,
            "monthly_rent": property_data.rentals.monthly_rent_ltr or 2100,
            "occupancy_rate": property_data.rentals.occupancy_rate or 0.75,
            "average_daily_rate": property_data.rentals.average_daily_rate or 200
        }
        
        base_value = variable_mapping.get(request.variable)
        if base_value is None:
            raise HTTPException(status_code=400, detail=f"Unknown variable: {request.variable}")
        
        results = []
        for variation in request.range_pct:
            # Create modified assumptions
            modified = request.assumptions.model_copy(deep=True)
            
            # Apply variation
            if request.variable == "purchase_price":
                modified.financing.purchase_price = base_value * (1 + variation)
            elif request.variable == "interest_rate":
                modified.financing.interest_rate = base_value * (1 + variation)
            elif request.variable == "down_payment_pct":
                modified.financing.down_payment_pct = base_value * (1 + variation)
            
            # Calculate analytics
            analytics = await property_service.calculate_analytics(
                property_id=request.property_id,
                assumptions=modified,
                strategies=request.strategies
            )
            
            result_row = {
                "variation_pct": variation,
                "variable_value": base_value * (1 + variation),
                "results": {}
            }
            
            if analytics.ltr:
                result_row["results"]["ltr_cash_flow"] = analytics.ltr.annual_cash_flow
                result_row["results"]["ltr_coc"] = analytics.ltr.cash_on_cash_return
            if analytics.str:
                result_row["results"]["str_cash_flow"] = analytics.str.annual_cash_flow
                result_row["results"]["str_coc"] = analytics.str.cash_on_cash_return
            if analytics.flip:
                result_row["results"]["flip_profit"] = analytics.flip.net_profit_before_tax
                result_row["results"]["flip_roi"] = analytics.flip.roi
            
            results.append(result_row)
        
        return SensitivityResponse(
            property_id=request.property_id,
            variable=request.variable,
            baseline_value=base_value,
            results=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sensitivity analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PHOTOS ENDPOINTS (EXISTING - PRESERVED)
# ============================================

@app.get("/api/v1/photos")
async def get_property_photos(
    zpid: Optional[str] = None,
    url: Optional[str] = None
):
    """
    Get property photos from Zillow via AXESSO API.
    
    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
    
    Returns:
        List of photo URLs for the property
    """
    try:
        if not zpid and not url:
            raise HTTPException(
                status_code=400, 
                detail="Either zpid or url parameter is required"
            )
        
        logger.info(f"Fetching photos for zpid={zpid}, url={url}")
        
        # Get photos from AXESSO client
        result = await property_service.get_property_photos(zpid=zpid, url=url)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photos fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# COMPARISON ENDPOINTS (EXISTING - PRESERVED)
# ============================================

@app.get("/api/v1/comparison/{property_id}")
async def get_strategy_comparison(property_id: str):
    """
    Get side-by-side comparison of all strategies.
    
    Returns the Scenario Comparison view from the Excel workbook
    with rankings and recommendations.
    """
    try:
        assumptions = AllAssumptions()
        analytics = await property_service.calculate_analytics(
            property_id=property_id,
            assumptions=assumptions
        )
        
        comparison = {
            "property_id": property_id,
            "strategies": {
                "ltr": {
                    "name": "Long-Term Rental",
                    "initial_investment": analytics.ltr.total_cash_required if analytics.ltr else None,
                    "year1_cash_flow": analytics.ltr.annual_cash_flow if analytics.ltr else None,
                    "year1_roi": analytics.ltr.cash_on_cash_return if analytics.ltr else None,
                    "risk_level": "Low",
                    "time_horizon": "10+ years",
                    "active_management": "Low"
                },
                "str": {
                    "name": "Short-Term Rental",
                    "initial_investment": analytics.str.total_cash_required if analytics.str else None,
                    "year1_cash_flow": analytics.str.annual_cash_flow if analytics.str else None,
                    "year1_roi": analytics.str.cash_on_cash_return if analytics.str else None,
                    "risk_level": "Medium",
                    "time_horizon": "5-10 years",
                    "active_management": "High"
                },
                "brrrr": {
                    "name": "BRRRR",
                    "initial_investment": analytics.brrrr.total_cash_invested if analytics.brrrr else None,
                    "year1_cash_flow": analytics.brrrr.post_refi_annual_cash_flow if analytics.brrrr else None,
                    "year1_roi": analytics.brrrr.post_refi_cash_on_cash if analytics.brrrr else None,
                    "risk_level": "Medium",
                    "time_horizon": "2-5 years",
                    "active_management": "Medium"
                },
                "flip": {
                    "name": "Fix & Flip",
                    "initial_investment": analytics.flip.total_cash_required if analytics.flip else None,
                    "total_profit": analytics.flip.net_profit_before_tax if analytics.flip else None,
                    "year1_roi": analytics.flip.annualized_roi if analytics.flip else None,
                    "risk_level": "High",
                    "time_horizon": "6 months",
                    "active_management": "High"
                },
                "house_hack": {
                    "name": "House Hacking",
                    "initial_investment": analytics.house_hack.total_cash_required if analytics.house_hack else None,
                    "monthly_savings": analytics.house_hack.savings_vs_renting_a if analytics.house_hack else None,
                    "year1_roi": analytics.house_hack.roi_on_savings if analytics.house_hack else None,
                    "risk_level": "Low",
                    "time_horizon": "1+ years",
                    "active_management": "Medium"
                },
                "wholesale": {
                    "name": "Wholesale",
                    "initial_investment": analytics.wholesale.total_cash_at_risk if analytics.wholesale else None,
                    "total_profit": analytics.wholesale.net_profit if analytics.wholesale else None,
                    "roi": analytics.wholesale.roi if analytics.wholesale else None,
                    "risk_level": "Medium",
                    "time_horizon": "30-45 days",
                    "active_management": "High"
                }
            },
            "recommendations": [
                {
                    "profile": "First-time investor, limited capital",
                    "recommended": "House Hacking",
                    "reason": "Lowest down payment (3.5% FHA), live for free while building equity"
                },
                {
                    "profile": "Passive income, long-term wealth",
                    "recommended": "Long-Term Rental",
                    "reason": "Stable cash flow, low management, appreciation + principal paydown"
                },
                {
                    "profile": "Maximize revenue in tourism area",
                    "recommended": "Short-Term Rental",
                    "reason": "Higher revenue potential if market supports STR"
                },
                {
                    "profile": "Scale portfolio quickly",
                    "recommended": "BRRRR",
                    "reason": "Recycle capital to buy multiple properties"
                },
                {
                    "profile": "Active investor, quick profits",
                    "recommended": "Fix & Flip",
                    "reason": "Fast returns but requires renovation expertise"
                },
                {
                    "profile": "No capital, strong network",
                    "recommended": "Wholesale",
                    "reason": "No money down, earn assignment fees"
                }
            ]
        }
        
        return comparison
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LOCAL DEVELOPMENT
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
