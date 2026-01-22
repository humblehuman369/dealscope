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
    from app.services.calculators import (
        calculate_ltr, calculate_str, calculate_brrrr,
        calculate_flip, calculate_house_hack, calculate_wholesale
    )
    logger.info("Property service loaded successfully")
except Exception as e:
    logger.error(f"Failed to load property service: {e}")
    raise

# Import auth routers (optional - app works without them)
auth_router = None
users_router = None
saved_properties_router = None
admin_router = None
loi_router = None
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

# Import LOI router (Letter of Intent - Wholesale feature)
try:
    from app.routers.loi import router as loi_router
    logger.info("LOI router loaded successfully")
except Exception as e:
    logger.warning(f"LOI router failed to load (OK for initial setup): {e}")
    loi_router = None

# Import Search History router
search_history_router = None
try:
    from app.routers.search_history import router as search_history_router
    logger.info("Search history router loaded successfully")
except Exception as e:
    logger.warning(f"Search history router failed to load: {e}")
    search_history_router = None

# Import Reports router
reports_router = None
try:
    from app.routers.reports import router as reports_router
    logger.info("Reports router loaded successfully")
except Exception as e:
    logger.warning(f"Reports router failed to load: {e}")
    reports_router = None

# Import Documents router
documents_router = None
try:
    from app.routers.documents import router as documents_router
    logger.info("Documents router loaded successfully")
except Exception as e:
    logger.warning(f"Documents router failed to load: {e}")
    documents_router = None

# Import Billing router
billing_router = None
try:
    from app.routers.billing import router as billing_router
    logger.info("Billing router loaded successfully")
except Exception as e:
    logger.warning(f"Billing router failed to load: {e}")
    billing_router = None

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
    
    # Log DATABASE_URL format (masked for security) to debug Railway connection
    if settings.DATABASE_URL:
        db_url = settings.DATABASE_URL
        # Extract host from URL for debugging
        if "@" in db_url and "/" in db_url:
            host_part = db_url.split("@")[1].split("/")[0] if "@" in db_url else "unknown"
            logger.info(f"Database host: {host_part}")
            logger.info(f"Is Railway URL: {'railway' in db_url.lower()}")
            logger.info(f"Is production: {settings.is_production}")
    
    # Create database tables if they don't exist
    # Note: Alembic removed from start command due to hanging issues
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

# LOI (Letter of Intent) router - Wholesale feature
if loi_router is not None:
    app.include_router(loi_router, prefix="/api/v1")
    logger.info("LOI router included")

# Search History router
if search_history_router is not None:
    app.include_router(search_history_router)
    logger.info("Search history router included")

# Reports router
if reports_router is not None:
    app.include_router(reports_router)
    logger.info("Reports router included")

# Documents router
if documents_router is not None:
    app.include_router(documents_router)
    logger.info("Documents router included")

# Billing router
if billing_router is not None:
    app.include_router(billing_router)
    logger.info("Billing router included")


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
            "loi": "/api/v1/loi",
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
# IQ VERDICT ANALYSIS ENDPOINT
# ============================================

from pydantic import BaseModel, Field
from app.core.defaults import (
    FINANCING, OPERATING, STR, REHAB, BRRRR, FLIP, HOUSE_HACK, WHOLESALE, GROWTH,
    DEFAULT_TARGET_PURCHASE_PCT, estimate_breakeven_price, calculate_target_purchase_price,
    get_all_defaults
)


class IQVerdictInput(BaseModel):
    """Input for IQ Verdict multi-strategy analysis."""
    list_price: float = Field(..., description="Property list price")
    monthly_rent: Optional[float] = Field(None, description="Monthly rent (estimated if not provided)")
    property_taxes: Optional[float] = Field(None, description="Annual property taxes")
    insurance: Optional[float] = Field(None, description="Annual insurance")
    bedrooms: int = Field(3, description="Number of bedrooms")
    bathrooms: float = Field(2, description="Number of bathrooms")
    sqft: Optional[int] = Field(None, description="Square footage")
    arv: Optional[float] = Field(None, description="After Repair Value")
    average_daily_rate: Optional[float] = Field(None, description="STR average daily rate")
    occupancy_rate: Optional[float] = Field(None, description="STR occupancy rate (0.0-1.0)")


class StrategyResult(BaseModel):
    """Result for a single strategy."""
    id: str
    name: str
    metric: str
    metric_label: str
    metric_value: float
    score: int
    rank: int
    badge: Optional[str] = None


class IQVerdictResponse(BaseModel):
    """Response from IQ Verdict analysis."""
    deal_score: int
    deal_verdict: str
    verdict_description: str
    discount_percent: float
    strategies: List[StrategyResult]
    purchase_price: float  # The recommended purchase price (95% of breakeven)
    breakeven_price: float
    list_price: float
    # Inputs used for calculation (for transparency/debugging)
    inputs_used: dict
    defaults_used: dict


def _normalize_score(value: float, min_value: float, max_value: float) -> int:
    """Convert a metric to 0-100 scale."""
    if value <= min_value:
        return 0
    if value >= max_value:
        return 100
    return round(((value - min_value) / (max_value - min_value)) * 100)


def _format_compact_currency(value: float) -> str:
    """Format currency for compact display."""
    if abs(value) >= 1000000:
        return f"${value / 1000000:.1f}M"
    if abs(value) >= 1000:
        return f"${round(value / 1000)}K"
    return f"${round(value):,}"


def _calculate_monthly_mortgage(principal: float, annual_rate: float, years: int) -> float:
    """Calculate monthly mortgage payment."""
    if annual_rate == 0:
        return principal / (years * 12)
    monthly_rate = annual_rate / 12
    num_payments = years * 12
    return principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
           ((1 + monthly_rate) ** num_payments - 1)


def _calculate_ltr_strategy(
    price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
) -> dict:
    """Calculate LTR strategy metrics using centralized defaults."""
    down_payment = price * FINANCING.down_payment_pct
    closing_costs = price * FINANCING.closing_costs_pct
    loan_amount = price - down_payment
    total_cash = down_payment + closing_costs
    monthly_pi = _calculate_monthly_mortgage(loan_amount, FINANCING.interest_rate, FINANCING.loan_term_years)
    annual_debt = monthly_pi * 12
    annual_rent = monthly_rent * 12
    effective_income = annual_rent * (1 - OPERATING.vacancy_rate)
    op_ex = property_taxes + insurance + (annual_rent * OPERATING.property_management_pct) + (annual_rent * OPERATING.maintenance_pct)
    noi = effective_income - op_ex
    annual_cash_flow = noi - annual_debt
    coc = annual_cash_flow / total_cash if total_cash > 0 else 0
    score = _normalize_score(coc * 100, 0, 12)
    
    return {
        "id": "long-term-rental",
        "name": "Long-Term Rental",
        "metric": f"{coc * 100:.1f}%",
        "metric_label": "CoC Return",
        "metric_value": coc * 100,
        "score": score,
    }


def _calculate_str_strategy(
    price: float,
    adr: float,
    occupancy: float,
    property_taxes: float,
    insurance: float,
) -> dict:
    """Calculate STR strategy metrics using centralized defaults."""
    down_payment = price * FINANCING.down_payment_pct
    closing_costs = price * FINANCING.closing_costs_pct
    total_cash = down_payment + closing_costs + STR.furniture_setup_cost
    loan_amount = price - down_payment
    monthly_pi = _calculate_monthly_mortgage(loan_amount, FINANCING.interest_rate, FINANCING.loan_term_years)
    annual_debt = monthly_pi * 12
    annual_revenue = adr * 365 * occupancy
    mgmt_fee = annual_revenue * STR.str_management_pct
    platform_fees = annual_revenue * STR.platform_fees_pct
    utilities = OPERATING.utilities_monthly * 12
    supplies = STR.supplies_monthly * 12
    maintenance = annual_revenue * OPERATING.maintenance_pct
    op_ex = property_taxes + insurance + mgmt_fee + platform_fees + utilities + supplies + maintenance
    noi = annual_revenue - op_ex
    annual_cash_flow = noi - annual_debt
    coc = annual_cash_flow / total_cash if total_cash > 0 else 0
    score = _normalize_score(coc * 100, 0, 15)
    
    return {
        "id": "short-term-rental",
        "name": "Short-Term Rental",
        "metric": f"{coc * 100:.1f}%",
        "metric_label": "CoC Return",
        "metric_value": coc * 100,
        "score": score,
    }


def _calculate_brrrr_strategy(
    price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    arv: float,
    rehab_cost: float,
) -> dict:
    """Calculate BRRRR strategy metrics using centralized defaults."""
    initial_cash = (price * 0.10) + rehab_cost + (price * FINANCING.closing_costs_pct)
    refi_loan = arv * BRRRR.refinance_ltv
    cash_back = refi_loan - (price * 0.90)
    cash_left = max(0, initial_cash - max(0, cash_back))
    recovery_pct = ((initial_cash - cash_left) / initial_cash * 100) if initial_cash > 0 else 0
    
    monthly_pi = _calculate_monthly_mortgage(refi_loan, BRRRR.refinance_interest_rate, BRRRR.refinance_term_years)
    annual_debt = monthly_pi * 12
    annual_rent = monthly_rent * 12
    effective_income = annual_rent * (1 - OPERATING.vacancy_rate)
    op_ex = property_taxes + insurance + (annual_rent * OPERATING.property_management_pct) + (annual_rent * OPERATING.maintenance_pct)
    noi = effective_income - op_ex
    annual_cash_flow = noi - annual_debt
    coc = annual_cash_flow / cash_left if cash_left > 0 else (999 if annual_cash_flow > 0 else 0)
    
    score = _normalize_score(recovery_pct, 0, 100)
    display_coc = "Infinite" if coc > 100 else f"{coc * 100:.1f}%"
    
    return {
        "id": "brrrr",
        "name": "BRRRR",
        "metric": display_coc,
        "metric_label": "CoC Return",
        "metric_value": recovery_pct,
        "score": score,
    }


def _calculate_flip_strategy(
    price: float,
    arv: float,
    rehab_cost: float,
    property_taxes: float,
    insurance: float,
) -> dict:
    """Calculate Flip strategy metrics using centralized defaults."""
    purchase_costs = price * FINANCING.closing_costs_pct
    holding_months = FLIP.holding_period_months
    holding_costs = (
        (price * FLIP.hard_money_rate / 12 * holding_months) +
        (property_taxes / 12 * holding_months) +
        (insurance / 12 * holding_months)
    )
    selling_costs = arv * FLIP.selling_costs_pct
    total_investment = price + purchase_costs + rehab_cost + holding_costs
    net_profit = arv - total_investment - selling_costs
    roi = net_profit / total_investment if total_investment > 0 else 0
    score = _normalize_score(roi * 100, 0, 30)
    
    return {
        "id": "fix-and-flip",
        "name": "Fix & Flip",
        "metric": _format_compact_currency(net_profit),
        "metric_label": "Profit",
        "metric_value": net_profit,
        "score": score,
    }


def _calculate_house_hack_strategy(
    price: float,
    monthly_rent: float,
    bedrooms: int,
    property_taxes: float,
    insurance: float,
) -> dict:
    """Calculate House Hack strategy metrics using centralized defaults."""
    total_beds = max(bedrooms, 2)
    rooms_rented = max(1, total_beds - 1)
    rent_per_room = monthly_rent / total_beds
    rental_income = rent_per_room * rooms_rented
    
    down_payment = price * HOUSE_HACK.fha_down_payment_pct
    closing_costs = price * FINANCING.closing_costs_pct
    loan_amount = price - down_payment
    monthly_pi = _calculate_monthly_mortgage(loan_amount, FINANCING.interest_rate, FINANCING.loan_term_years)
    monthly_taxes = property_taxes / 12
    monthly_insurance = insurance / 12
    pmi = loan_amount * HOUSE_HACK.fha_mip_rate / 12
    maintenance = rental_income * OPERATING.maintenance_pct
    vacancy = rental_income * OPERATING.vacancy_rate
    
    monthly_expenses = monthly_pi + monthly_taxes + monthly_insurance + pmi + maintenance + vacancy
    housing_offset = (rental_income / monthly_expenses * 100) if monthly_expenses > 0 else 0
    score = _normalize_score(housing_offset, 0, 100)
    
    return {
        "id": "house-hack",
        "name": "House Hack",
        "metric": f"{round(housing_offset)}%",
        "metric_label": "Savings",
        "metric_value": housing_offset,
        "score": score,
    }


def _calculate_wholesale_strategy(
    price: float,
    arv: float,
    rehab_cost: float,
) -> dict:
    """Calculate Wholesale strategy metrics using centralized defaults."""
    wholesale_fee = price * 0.007
    mao = (arv * 0.70) - rehab_cost - wholesale_fee
    assignment_fee = mao - (price * 0.85)
    assignment_pct = (assignment_fee / price * 100) if price > 0 else 0
    score = _normalize_score(assignment_pct, 0, 3)
    
    return {
        "id": "wholesale",
        "name": "Wholesale",
        "metric": _format_compact_currency(max(0, assignment_fee)),
        "metric_label": "Assignment",
        "metric_value": assignment_fee,
        "score": score,
    }


def _calculate_opportunity_score(breakeven_price: float, list_price: float) -> tuple[int, float, str]:
    """
    Calculate Deal Score based on discount from list price to breakeven.
    
    The Deal Score methodology:
    - Score is based on what discount from list price is needed to reach breakeven
    - Smaller discount = better opportunity (higher score)
    
    Grading thresholds (discount %):
    - 0-5%: Strong Opportunity (score 90-100)
    - 5-10%: Great Opportunity (score 80-90)
    - 10-15%: Moderate Opportunity (score 70-80)
    - 15-25%: Potential Opportunity (score 50-70)
    - 25-35%: Mild Opportunity (score 30-50)
    - 35-45%: Weak Opportunity (score 10-30)
    - 45%+: Poor Opportunity (score 0-10)
    
    Returns: (score, discount_percent, verdict)
    """
    if list_price <= 0:
        return (0, 100.0, "Invalid")
    
    # Calculate discount percentage from list price to breakeven
    discount_pct = ((list_price - breakeven_price) / list_price) * 100
    
    # Handle edge cases
    if discount_pct < 0:
        # Breakeven is ABOVE list price - very strong opportunity
        discount_pct = 0
    
    # Score: inversely proportional to discount needed
    # 0% discount = 100 score, 50% discount = 0 score
    score = max(0, min(100, round(100 - discount_pct * 2)))
    
    # Determine verdict based on discount percentage
    if discount_pct <= 5:
        verdict = "Strong Opportunity"
    elif discount_pct <= 10:
        verdict = "Great Opportunity"
    elif discount_pct <= 15:
        verdict = "Moderate Opportunity"
    elif discount_pct <= 25:
        verdict = "Potential Opportunity"
    elif discount_pct <= 35:
        verdict = "Mild Opportunity"
    elif discount_pct <= 45:
        verdict = "Weak Opportunity"
    else:
        verdict = "Poor Opportunity"
    
    return (score, discount_pct, verdict)


def _get_deal_verdict(score: int) -> str:
    """Get deal verdict based on score (legacy - use _calculate_opportunity_score)."""
    if score >= 90:
        return "Strong Opportunity"
    if score >= 80:
        return "Great Opportunity"
    if score >= 70:
        return "Moderate Opportunity"
    if score >= 50:
        return "Potential Opportunity"
    if score >= 30:
        return "Mild Opportunity"
    if score >= 10:
        return "Weak Opportunity"
    return "Poor Opportunity"


def _get_verdict_description(score: int, top_strategy: dict) -> str:
    """Get verdict description."""
    name = top_strategy["name"]
    metric = top_strategy["metric"]
    label = top_strategy["metric_label"]
    
    if score >= 80:
        return f"Excellent potential across multiple strategies. {name} shows best returns."
    if score >= 60:
        return f"Good investment opportunity. {name} is your strongest option at {metric} {label}."
    if score >= 40:
        return f"Moderate opportunity. Consider {name} for best results, but review numbers carefully."
    return f"This property shows limited investment potential. {name} is the best option available."


@app.post("/api/v1/analysis/verdict", response_model=IQVerdictResponse)
async def calculate_iq_verdict(input_data: IQVerdictInput):
    """
    Calculate IQ Verdict multi-strategy analysis.
    
    This endpoint analyzes a property across all investment strategies
    and returns ranked results with deal scores.
    
    Key features:
    - Uses centralized default assumptions from backend
    - Calculates target purchase price as 95% of breakeven
    - No frontend calculations needed
    """
    try:
        list_price = input_data.list_price
        
        # Use provided data or estimate from list price
        # NOTE: 0.7% of list price is the "1% rule" for monthly rent estimate
        monthly_rent = input_data.monthly_rent or (list_price * 0.007)
        property_taxes = input_data.property_taxes or (list_price * 0.012)  # ~1.2% is typical
        insurance = input_data.insurance or (list_price * OPERATING.insurance_pct)  # 1%
        arv = input_data.arv or (list_price * 1.15)
        rehab_cost = arv * REHAB.renovation_budget_pct
        adr = input_data.average_daily_rate or ((monthly_rent / 30) * 1.5)
        occupancy = input_data.occupancy_rate or 0.65
        bedrooms = input_data.bedrooms
        
        # Log inputs for debugging
        logger.info(f"IQ Verdict inputs: list_price=${list_price:,.0f}, monthly_rent=${monthly_rent:,.0f}, "
                   f"property_taxes=${property_taxes:,.0f}, insurance=${insurance:,.0f}")
        logger.info(f"  Provided values: rent={input_data.monthly_rent}, taxes={input_data.property_taxes}, "
                   f"insurance={input_data.insurance}")
        
        # Calculate breakeven and target purchase price
        breakeven = estimate_breakeven_price(monthly_rent, property_taxes, insurance)
        target_price = calculate_target_purchase_price(list_price, monthly_rent, property_taxes, insurance)
        
        # Log calculation results
        logger.info(f"  Breakeven=${breakeven:,.0f}, Target Purchase=${target_price:,.0f}")
        
        # Calculate all strategies using target price (95% of breakeven)
        strategies = [
            _calculate_ltr_strategy(target_price, monthly_rent, property_taxes, insurance),
            _calculate_str_strategy(target_price, adr, occupancy, property_taxes, insurance),
            _calculate_brrrr_strategy(target_price, monthly_rent, property_taxes, insurance, arv, rehab_cost),
            _calculate_flip_strategy(target_price, arv, rehab_cost, property_taxes, insurance),
            _calculate_house_hack_strategy(target_price, monthly_rent, bedrooms, property_taxes, insurance),
            _calculate_wholesale_strategy(target_price, arv, rehab_cost),
        ]
        
        # Fixed display order: LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale
        # Assign ranks 1-6 in fixed order (no sorting by score)
        for i, strategy in enumerate(strategies):
            strategy["rank"] = i + 1
            score = strategy["score"]
            
            # Assign badges based on individual score thresholds only
            if score >= 80:
                strategy["badge"] = "Strong"
            elif score >= 60:
                strategy["badge"] = "Good"
            else:
                strategy["badge"] = None
        
        # Calculate Deal Score based on discount from list to breakeven
        # This is the core opportunity-based scoring methodology
        deal_score, discount_pct, deal_verdict = _calculate_opportunity_score(breakeven, list_price)
        
        # Get highest-scoring strategy for description (display order is fixed, but description uses best)
        top_strategy = max(strategies, key=lambda x: x["score"])
        
        return IQVerdictResponse(
            deal_score=deal_score,
            deal_verdict=deal_verdict,
            verdict_description=_get_verdict_description(deal_score, top_strategy),
            discount_percent=round(discount_pct, 1),
            strategies=[StrategyResult(**s) for s in strategies],
            purchase_price=target_price,  # Recommended purchase price (95% of breakeven)
            breakeven_price=breakeven,
            list_price=list_price,
            inputs_used={
                "monthly_rent": monthly_rent,
                "property_taxes": property_taxes,
                "insurance": insurance,
                "arv": arv,
                "rehab_cost": rehab_cost,
                "bedrooms": bedrooms,
                "provided_rent": input_data.monthly_rent,
                "provided_taxes": input_data.property_taxes,
                "provided_insurance": input_data.insurance,
            },
            defaults_used=get_all_defaults(),
        )
        
    except Exception as e:
        logger.error(f"IQ Verdict analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/defaults")
async def get_default_assumptions():
    """
    Get all default assumptions used in calculations.
    
    Returns the centralized default values for all investment strategies.
    Frontend should use these values for display and form defaults.
    """
    return get_all_defaults()


# ============================================
# DEAL SCORE CALCULATION ENDPOINT
# ============================================

class DealScoreInput(BaseModel):
    """Input for Deal Score calculation."""
    list_price: float = Field(..., description="Original property list price")
    purchase_price: float = Field(..., description="User's purchase price (what they want to pay)")
    monthly_rent: float = Field(..., description="Monthly rent")
    property_taxes: float = Field(..., description="Annual property taxes")
    insurance: float = Field(..., description="Annual insurance")
    # Optional overrides for calculation parameters
    vacancy_rate: Optional[float] = Field(None, description="Vacancy rate (e.g., 0.01 = 1%)")
    maintenance_pct: Optional[float] = Field(None, description="Maintenance % of rent")
    management_pct: Optional[float] = Field(None, description="Management % of rent")
    down_payment_pct: Optional[float] = Field(None, description="Down payment %")
    interest_rate: Optional[float] = Field(None, description="Interest rate (e.g., 0.06 = 6%)")
    loan_term_years: Optional[int] = Field(None, description="Loan term in years")


class DealScoreResponse(BaseModel):
    """Response from Deal Score calculation."""
    deal_score: int
    deal_verdict: str
    discount_percent: float
    breakeven_price: float
    purchase_price: float
    list_price: float
    # Calculation details for transparency
    calculation_details: dict


@app.post("/api/v1/worksheet/deal-score", response_model=DealScoreResponse)
async def calculate_deal_score(input_data: DealScoreInput):
    """
    Calculate Deal Score for worksheet pages.
    
    This endpoint provides a centralized Deal Score calculation that all
    worksheet pages should use to ensure consistency.
    
    The Deal Score is based on the discount from list price to breakeven:
    - Breakeven = price where cash flow = $0
    - Discount % = (list_price - breakeven) / list_price × 100
    - Score = 100 - (discount % × 2)
    
    Scoring thresholds:
    - 0-5% discount: Strong Opportunity (90-100)
    - 5-10% discount: Great Opportunity (80-90)
    - 10-15% discount: Moderate Opportunity (70-80)
    - 15-25% discount: Potential Opportunity (50-70)
    - 25-35% discount: Mild Opportunity (30-50)
    - 35-45% discount: Weak Opportunity (10-30)
    - 45%+ discount: Poor Opportunity (0-10)
    """
    try:
        list_price = input_data.list_price
        purchase_price = input_data.purchase_price
        monthly_rent = input_data.monthly_rent
        property_taxes = input_data.property_taxes
        insurance = input_data.insurance
        
        # Use provided overrides or defaults
        vacancy = input_data.vacancy_rate if input_data.vacancy_rate is not None else OPERATING.vacancy_rate
        maint_pct = input_data.maintenance_pct if input_data.maintenance_pct is not None else OPERATING.maintenance_pct
        mgmt_pct = input_data.management_pct if input_data.management_pct is not None else OPERATING.property_management_pct
        down_pct = input_data.down_payment_pct if input_data.down_payment_pct is not None else FINANCING.down_payment_pct
        rate = input_data.interest_rate if input_data.interest_rate is not None else FINANCING.interest_rate
        term = input_data.loan_term_years if input_data.loan_term_years is not None else FINANCING.loan_term_years
        
        # Calculate breakeven price
        breakeven = estimate_breakeven_price(
            monthly_rent=monthly_rent,
            property_taxes=property_taxes,
            insurance=insurance,
            down_payment_pct=down_pct,
            interest_rate=rate,
            loan_term_years=term,
            vacancy_rate=vacancy,
            maintenance_pct=maint_pct,
            management_pct=mgmt_pct,
        )
        
        # Calculate Deal Score based on discount from list to breakeven
        deal_score, discount_pct, deal_verdict = _calculate_opportunity_score(breakeven, list_price)
        
        # Log for debugging
        logger.info(f"Deal Score calculation: list=${list_price:,.0f}, purchase=${purchase_price:,.0f}, "
                   f"breakeven=${breakeven:,.0f}, discount={discount_pct:.1f}%, score={deal_score}")
        
        return DealScoreResponse(
            deal_score=deal_score,
            deal_verdict=deal_verdict,
            discount_percent=round(discount_pct, 1),
            breakeven_price=breakeven,
            purchase_price=purchase_price,
            list_price=list_price,
            calculation_details={
                "monthly_rent": monthly_rent,
                "property_taxes": property_taxes,
                "insurance": insurance,
                "vacancy_rate": vacancy,
                "maintenance_pct": maint_pct,
                "management_pct": mgmt_pct,
                "down_payment_pct": down_pct,
                "interest_rate": rate,
                "loan_term_years": term,
            },
        )
        
    except Exception as e:
        logger.error(f"Deal Score calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# WORKSHEET CALCULATION ENDPOINTS
# ============================================


class LTRWorksheetInput(BaseModel):
    """Input parameters for LTR worksheet calculation."""
    purchase_price: float = Field(..., description="Property purchase price")
    monthly_rent: float = Field(..., description="Monthly gross rent")
    property_taxes_annual: float = Field(6000, description="Annual property taxes")
    insurance_annual: float = Field(2000, description="Annual insurance")
    down_payment_pct: float = Field(0.20, description="Down payment percentage (0.20 = 20%)")
    interest_rate: float = Field(0.07, description="Annual interest rate (0.07 = 7%)")
    loan_term_years: int = Field(30, description="Loan term in years")
    closing_costs: float = Field(0, description="Closing costs in dollars")
    rehab_costs: float = Field(0, description="Rehab/renovation costs")
    vacancy_rate: float = Field(0.08, description="Vacancy rate (0.08 = 8%)")
    property_management_pct: float = Field(0.0, description="Property management fee %")
    maintenance_pct: float = Field(0.02, description="Maintenance reserve %")
    capex_pct: float = Field(0.0, description="Capital expenditure reserve %")
    hoa_monthly: float = Field(0, description="Monthly HOA fees")
    arv: float = Field(None, description="After Repair Value")
    sqft: float = Field(None, description="Property square footage")


@app.post("/api/v1/worksheet/ltr/calculate")
async def calculate_ltr_worksheet(input_data: LTRWorksheetInput):
    """
    Calculate LTR worksheet metrics.
    
    Accepts worksheet slider values and returns all calculated metrics
    for display in the interactive worksheet.
    """
    try:
        # Use the backend calculator
        result = calculate_ltr(
            purchase_price=input_data.purchase_price,
            monthly_rent=input_data.monthly_rent,
            property_taxes_annual=input_data.property_taxes_annual,
            hoa_monthly=input_data.hoa_monthly,
            down_payment_pct=input_data.down_payment_pct,
            interest_rate=input_data.interest_rate,
            loan_term_years=input_data.loan_term_years,
            closing_costs_pct=input_data.closing_costs / input_data.purchase_price if input_data.closing_costs > 0 else 0.03,
            vacancy_rate=input_data.vacancy_rate,
            property_management_pct=input_data.property_management_pct,
            maintenance_pct=input_data.maintenance_pct + input_data.capex_pct,
            insurance_annual=input_data.insurance_annual,
        )
        
        # Add worksheet-specific calculations
        arv = input_data.arv or input_data.purchase_price
        sqft = input_data.sqft or 1
        annual_gross_rent = result["annual_gross_rent"]
        
        # Per square foot metrics
        arv_psf = arv / sqft if sqft > 0 else 0
        price_psf = input_data.purchase_price / sqft if sqft > 0 else 0
        rehab_psf = input_data.rehab_costs / sqft if sqft > 0 else 0
        
        # Equity
        equity = arv - input_data.purchase_price
        equity_after_rehab = equity - input_data.rehab_costs
        
        # Total cash needed (including rehab)
        total_cash_needed = result["total_cash_required"] + input_data.rehab_costs
        
        # Expense breakdown for worksheet display
        maintenance_only = annual_gross_rent * input_data.maintenance_pct
        capex_reserve = annual_gross_rent * input_data.capex_pct
        
        # MAO (70% of ARV minus rehab)
        mao = (arv * 0.70) - input_data.rehab_costs
        
        # Recalculate CoC with rehab costs
        annual_cash_flow = result["annual_cash_flow"]
        coc_return = (annual_cash_flow / total_cash_needed * 100) if total_cash_needed > 0 else 0
        
        return {
            # Income
            "gross_income": result["effective_gross_income"],
            "annual_gross_rent": result["annual_gross_rent"],
            "vacancy_loss": result["vacancy_loss"],
            
            # Expenses
            "gross_expenses": result["total_operating_expenses"],
            "property_taxes": result["property_taxes"],
            "insurance": result["insurance"],
            "property_management": result["property_management"],
            "maintenance": result["maintenance"],
            "maintenance_only": maintenance_only,
            "capex": capex_reserve,
            "hoa_fees": result["hoa_fees"],
            
            # Financing
            "loan_amount": result["loan_amount"],
            "down_payment": result["down_payment"],
            "closing_costs": result["closing_costs"],
            "monthly_payment": result["monthly_pi"],
            "annual_debt_service": result["annual_debt_service"],
            
            # Cash Flow
            "noi": result["noi"],
            "monthly_cash_flow": result["monthly_cash_flow"],
            "annual_cash_flow": result["annual_cash_flow"],
            
            # Key Metrics
            "cap_rate": result["cap_rate"] * 100,  # Convert to percentage
            "cash_on_cash_return": coc_return,
            "dscr": result["dscr"],
            "grm": result["grm"],
            "one_percent_rule": result["one_percent_rule"],
            
            # Valuation
            "arv": arv,
            "arv_psf": arv_psf,
            "price_psf": price_psf,
            "rehab_psf": rehab_psf,
            "equity": equity,
            "equity_after_rehab": equity_after_rehab,
            "mao": mao,
            
            # Investment Summary
            "total_cash_needed": total_cash_needed,
            "ltv": (result["loan_amount"] / input_data.purchase_price * 100) if input_data.purchase_price > 0 else 0,
            
            # Deal Score (simplified)
            "deal_score": min(100, max(0, round(
                50 + 
                (15 if result["cap_rate"] >= 0.08 else 10 if result["cap_rate"] >= 0.06 else 0) +
                (15 if coc_return >= 10 else 10 if coc_return >= 8 else 0) +
                (10 if result["dscr"] >= 1.25 else 0) +
                (10 if result["one_percent_rule"] else 0)
            ))),
        }
        
    except Exception as e:
        logger.error(f"LTR worksheet calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class STRWorksheetInput(BaseModel):
    """Input parameters for STR worksheet calculation."""
    purchase_price: float
    list_price: Optional[float] = None
    average_daily_rate: float
    occupancy_rate: float = Field(0.75, description="Occupancy rate (0.75 = 75%)")
    property_taxes_annual: float = 6000
    insurance_annual: float = 2000
    down_payment_pct: float = 0.25
    interest_rate: float = 0.07
    loan_term_years: int = 30
    closing_costs: float = 0
    furnishing_budget: float = 10000
    platform_fees_pct: float = 0.15
    property_management_pct: float = 0.20
    cleaning_cost_per_turn: float = 150
    cleaning_fee_revenue: float = 100
    avg_booking_length: int = 4
    supplies_monthly: float = 100
    utilities_monthly: float = 200
    maintenance_pct: float = 0.05
    capex_pct: float = 0.05


@app.post("/api/v1/worksheet/str/calculate")
async def calculate_str_worksheet(input_data: STRWorksheetInput):
    """Calculate STR worksheet metrics."""
    try:
        result = calculate_str(
            purchase_price=input_data.purchase_price,
            average_daily_rate=input_data.average_daily_rate,
            occupancy_rate=input_data.occupancy_rate,
            property_taxes_annual=input_data.property_taxes_annual,
            down_payment_pct=input_data.down_payment_pct,
            interest_rate=input_data.interest_rate,
            loan_term_years=input_data.loan_term_years,
            closing_costs_pct=input_data.closing_costs / input_data.purchase_price if input_data.closing_costs > 0 else 0.03,
            furniture_setup_cost=input_data.furnishing_budget,
            platform_fees_pct=input_data.platform_fees_pct,
            str_management_pct=input_data.property_management_pct,
            cleaning_cost_per_turnover=input_data.cleaning_cost_per_turn,
            cleaning_fee_revenue=input_data.cleaning_fee_revenue,
            avg_length_of_stay_days=input_data.avg_booking_length,
            supplies_monthly=input_data.supplies_monthly,
            additional_utilities_monthly=input_data.utilities_monthly,
            insurance_annual=input_data.insurance_annual,
            maintenance_annual=input_data.purchase_price * (input_data.maintenance_pct + input_data.capex_pct),
        )

        # Expense breakdown helpers
        supplies_annual = input_data.supplies_monthly * 12
        utilities_annual = input_data.utilities_monthly * 12
        maintenance_annual = input_data.purchase_price * input_data.maintenance_pct
        capex_annual = input_data.purchase_price * input_data.capex_pct

        # Pricing ladder and deal score helpers
        gross_revenue = result["total_gross_revenue"]
        noi = result["noi"]
        annual_debt_service = result["annual_debt_service"]
        total_cash_needed = result["total_cash_required"]

        list_price = input_data.list_price or (input_data.purchase_price * 1.03)

        # Breakeven price where NOI = debt service
        breakeven_price = (
            input_data.purchase_price * (annual_debt_service / noi)
            if noi > 0 else 0
        )

        # 10% CoC target price (based on HTML worksheet heuristic)
        target_cash_flow = total_cash_needed * 0.10
        ten_coc_price = (
            input_data.purchase_price -
            ((target_cash_flow - (noi - annual_debt_service)) / 0.25)
            if total_cash_needed > 0 else 0
        )

        # MAO based on GRM (7x gross revenue)
        mao_price = gross_revenue * 7

        # Discount percent from list
        discount_percent = (
            ((list_price - input_data.purchase_price) / list_price * 100)
            if list_price > 0 else 0
        )

        # Seasonality estimate from base occupancy (percent values)
        base_occ_pct = input_data.occupancy_rate * 100
        seasonality = {
            "summer": min(95, base_occ_pct + 15),
            "spring": min(95, base_occ_pct + 5),
            "fall": max(30, base_occ_pct - 5),
            "winter": max(30, base_occ_pct - 15),
        }

        # Simple deal score heuristic
        cap_rate_pct = result["cap_rate"] * 100
        coc_pct = result["cash_on_cash_return"] * 100
        deal_score = 50
        if cap_rate_pct >= 10:
            deal_score += 15
        elif cap_rate_pct >= 8:
            deal_score += 10
        if coc_pct >= 15:
            deal_score += 15
        elif coc_pct >= 10:
            deal_score += 10
        if result["dscr"] >= 1.25:
            deal_score += 10
        if result["break_even_occupancy"] <= 0.6:
            deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))
        
        return {
            # Revenue
            "gross_revenue": gross_revenue,
            "rental_revenue": result["rental_revenue"],
            "cleaning_fee_revenue": result["cleaning_fee_revenue"],
            "nights_occupied": result["nights_occupied"],
            "num_bookings": result["num_bookings"],
            "revpar": result["revenue_per_available_night"],
            
            # Expenses
            "gross_expenses": result["total_operating_expenses"],
            "platform_fees": result["platform_fees"],
            "str_management": result["str_management"],
            "cleaning_costs": result["cleaning_costs"],
            "property_taxes": result["property_taxes"],
            "insurance": result["insurance"],
            "supplies": supplies_annual,
            "utilities": utilities_annual,
            "maintenance": maintenance_annual,
            "capex": capex_annual,
            
            # Cash Flow
            "noi": result["noi"],
            "monthly_cash_flow": result["monthly_cash_flow"],
            "annual_cash_flow": result["annual_cash_flow"],
            
            # Key Metrics
            "cap_rate": cap_rate_pct,
            "cash_on_cash_return": coc_pct,
            "dscr": result["dscr"],
            "break_even_occupancy": result["break_even_occupancy"] * 100,
            "deal_score": deal_score,
            
            # Financing
            "loan_amount": result["loan_amount"],
            "monthly_payment": result["monthly_pi"],
            "annual_debt_service": annual_debt_service,
            "total_cash_needed": total_cash_needed,

            # Pricing ladder
            "list_price": list_price,
            "breakeven_price": breakeven_price,
            "target_coc_price": ten_coc_price,
            "mao_price": mao_price,
            "discount_percent": discount_percent,

            # Seasonality
            "seasonality": seasonality,
        }
        
    except Exception as e:
        logger.error(f"STR worksheet calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class BRRRRWorksheetInput(BaseModel):
    """Input parameters for BRRRR worksheet calculation."""
    purchase_price: float
    purchase_costs: float = 0
    rehab_costs: float
    arv: float
    sqft: Optional[float] = None
    monthly_rent: float
    property_taxes_annual: float = 6000
    insurance_annual: float = 2000
    utilities_monthly: float = 0
    down_payment_pct: float = 0.20
    loan_to_cost_pct: Optional[float] = None
    interest_rate: float = 0.10
    points: float = 2
    holding_months: int = 6
    refi_ltv: float = 0.75
    refi_interest_rate: float = 0.07
    refi_loan_term: int = 30
    refi_closing_costs: float = 3000
    vacancy_rate: float = 0.08
    property_management_pct: float = 0.08
    maintenance_pct: float = 0.05
    capex_pct: float = 0.05


@app.post("/api/v1/worksheet/brrrr/calculate")
async def calculate_brrrr_worksheet(input_data: BRRRRWorksheetInput):
    """Calculate BRRRR worksheet metrics."""
    try:
        purchase_costs_pct = (
            input_data.purchase_costs / input_data.purchase_price
            if input_data.purchase_costs > 0 else 0.03
        )
        down_payment_pct = (
            1 - (input_data.loan_to_cost_pct / 100)
            if input_data.loan_to_cost_pct is not None else input_data.down_payment_pct
        )

        result = calculate_brrrr(
            market_value=input_data.purchase_price,
            arv=input_data.arv,
            monthly_rent_post_rehab=input_data.monthly_rent,
            property_taxes_annual=input_data.property_taxes_annual,
            purchase_discount_pct=0,  # Already at purchase price
            down_payment_pct=down_payment_pct,
            interest_rate=input_data.interest_rate,
            loan_term_years=1,  # Hard money is short term
            closing_costs_pct=purchase_costs_pct,
            renovation_budget=input_data.rehab_costs,
            holding_period_months=input_data.holding_months,
            refinance_ltv=input_data.refi_ltv,
            refinance_interest_rate=input_data.refi_interest_rate,
            refinance_term_years=input_data.refi_loan_term,
            refinance_closing_costs=input_data.refi_closing_costs,
            vacancy_rate=input_data.vacancy_rate,
            operating_expense_pct=input_data.property_management_pct + input_data.maintenance_pct + input_data.capex_pct,
        )

        sqft = input_data.sqft or 1
        total_rehab = result["renovation_budget"] + result["contingency"]
        all_in_cost = input_data.purchase_price + total_rehab + input_data.purchase_costs
        all_in_pct_arv = (all_in_cost / input_data.arv * 100) if input_data.arv > 0 else 0

        initial_loan_amount = result["initial_loan_amount"]
        loan_to_cost = (
            (initial_loan_amount / (input_data.purchase_price + input_data.rehab_costs)) * 100
            if (input_data.purchase_price + input_data.rehab_costs) > 0 else 0
        )
        loan_to_cost_pct = input_data.loan_to_cost_pct or loan_to_cost

        points_cost = initial_loan_amount * (input_data.points / 100)
        cash_to_close = result["down_payment"] + input_data.purchase_costs + points_cost

        # Holding cost breakdown (rehab period)
        annual_interest = initial_loan_amount * input_data.interest_rate
        holding_interest = annual_interest * (input_data.holding_months / 12)
        holding_taxes = input_data.property_taxes_annual * (input_data.holding_months / 12)
        holding_insurance = input_data.insurance_annual * (input_data.holding_months / 12)
        holding_utilities = input_data.utilities_monthly * input_data.holding_months
        total_holding_costs = holding_interest + holding_taxes + holding_insurance + holding_utilities

        # Refinance summary
        cash_out_at_refi = result["cash_out_at_refinance"]
        total_cash_invested = (
            result["down_payment"] +
            input_data.purchase_costs +
            points_cost +
            total_rehab +
            total_holding_costs
        )
        cash_left_in_deal = total_cash_invested - cash_out_at_refi

        # Cash flow after refi breakdown
        annual_gross_rent = result["annual_gross_rent"]
        vacancy_loss = annual_gross_rent * input_data.vacancy_rate
        effective_income = annual_gross_rent - vacancy_loss
        property_management = effective_income * input_data.property_management_pct
        maintenance = effective_income * input_data.maintenance_pct
        capex = effective_income * input_data.capex_pct
        total_expenses = (
            input_data.property_taxes_annual +
            input_data.insurance_annual +
            property_management +
            maintenance +
            capex
        )
        noi = effective_income - total_expenses
        annual_debt_service = result["new_monthly_pi"] * 12
        annual_cash_flow = noi - annual_debt_service

        cap_rate_arv = (noi / input_data.arv * 100) if input_data.arv > 0 else 0
        cash_on_cash_return = (annual_cash_flow / cash_left_in_deal * 100) if cash_left_in_deal > 0 else float('inf')
        return_on_equity = (annual_cash_flow / result["equity_position"] * 100) if result["equity_position"] > 0 else 0
        total_roi_year1 = (
            (annual_cash_flow + result["equity_position"]) / total_cash_invested * 100
            if total_cash_invested > 0 else 0
        )

        deal_score = 50
        if cash_left_in_deal <= 0:
            deal_score += 20
        elif cash_left_in_deal <= total_cash_invested * 0.25:
            deal_score += 10
        if annual_cash_flow > 0:
            deal_score += 15
        if all_in_pct_arv <= 75:
            deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))
        
        return {
            # Purchase
            "purchase_price": result["purchase_price"],
            "purchase_costs": input_data.purchase_costs,
            "total_rehab": total_rehab,
            "holding_costs": total_holding_costs,
            "holding_interest": holding_interest,
            "holding_taxes": holding_taxes,
            "holding_insurance": holding_insurance,
            "holding_utilities": holding_utilities,
            "all_in_cost": all_in_cost,
            "loan_to_cost_pct": loan_to_cost_pct,
            "loan_amount": initial_loan_amount,
            "cash_to_close": cash_to_close,
            "points_cost": points_cost,
            "total_cash_invested": total_cash_invested,
            
            # Refinance
            "refinance_loan_amount": result["refinance_loan_amount"],
            "cash_out": cash_out_at_refi,
            "cash_left_in_deal": cash_left_in_deal,
            "refinance_costs": result["refinance_costs"],
            "payoff_old_loan": result["original_loan_payoff"],
            
            # Cash Flow
            "annual_gross_rent": annual_gross_rent,
            "vacancy_loss": vacancy_loss,
            "effective_income": effective_income,
            "property_taxes": input_data.property_taxes_annual,
            "insurance": input_data.insurance_annual,
            "property_management": property_management,
            "maintenance": maintenance,
            "capex": capex,
            "total_expenses": total_expenses,
            "noi": noi,
            "monthly_cash_flow": annual_cash_flow / 12,
            "annual_cash_flow": annual_cash_flow,
            "annual_debt_service": annual_debt_service,
            
            # Key Metrics
            "cap_rate_arv": cap_rate_arv,
            "cash_on_cash_return": cash_on_cash_return,
            "return_on_equity": return_on_equity,
            "total_roi_year1": total_roi_year1,
            "equity_position": result["equity_position"],
            "all_in_pct_arv": all_in_pct_arv,
            "infinite_roi_achieved": cash_left_in_deal <= 0,
            "deal_score": deal_score,
            
            # Valuation
            "arv": input_data.arv,
            "arv_psf": (input_data.arv / sqft) if sqft > 0 else 0,
            "price_psf": (input_data.purchase_price / sqft) if sqft > 0 else 0,
            "rehab_psf": (input_data.rehab_costs / sqft) if sqft > 0 else 0,
            "equity_created": input_data.arv - all_in_cost,
        }
        
    except Exception as e:
        logger.error(f"BRRRR worksheet calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class FlipWorksheetInput(BaseModel):
    """Input parameters for Fix & Flip worksheet calculation."""
    purchase_price: float
    purchase_costs: float = 0
    rehab_costs: float
    arv: float
    down_payment_pct: float = 0.10
    interest_rate: float = 0.12
    points: float = 2
    holding_months: float = 6
    property_taxes_annual: float = 4000
    insurance_annual: float = 1500
    utilities_monthly: float = 150
    dumpster_monthly: float = 100
    inspection_costs: float = 0
    contingency_pct: float = 0
    selling_costs_pct: float = 0.08
    capital_gains_rate: float = 0.20
    loan_type: Optional[str] = "interest_only"


@app.post("/api/v1/worksheet/flip/calculate")
async def calculate_flip_worksheet(input_data: FlipWorksheetInput):
    """Calculate Fix & Flip worksheet metrics."""
    try:
        purchase_costs_pct = (
            input_data.purchase_costs / input_data.purchase_price
            if input_data.purchase_costs > 0 else 0.03
        )

        result = calculate_flip(
            market_value=input_data.purchase_price,
            arv=input_data.arv,
            purchase_discount_pct=0,
            hard_money_ltv=1 - input_data.down_payment_pct,
            hard_money_rate=input_data.interest_rate,
            closing_costs_pct=purchase_costs_pct,
            inspection_costs=input_data.inspection_costs,
            renovation_budget=input_data.rehab_costs,
            contingency_pct=input_data.contingency_pct,
            holding_period_months=input_data.holding_months,
            property_taxes_annual=input_data.property_taxes_annual,
            insurance_annual=input_data.insurance_annual,
            utilities_monthly=input_data.utilities_monthly,
            security_maintenance_monthly=input_data.dumpster_monthly,
            selling_costs_pct=input_data.selling_costs_pct,
            capital_gains_rate=input_data.capital_gains_rate,
        )

        loan_amount = result["hard_money_loan"]
        points_cost = loan_amount * (input_data.points / 100)
        loan_to_cost_pct = (
            (loan_amount / (input_data.purchase_price + input_data.rehab_costs)) * 100
            if (input_data.purchase_price + input_data.rehab_costs) > 0 else 0
        )
        if input_data.loan_type == "amortizing":
            monthly_payment = calculate_monthly_mortgage(
                loan_amount, input_data.interest_rate, 30
            )
        else:
            monthly_payment = (loan_amount * input_data.interest_rate) / 12

        monthly_taxes = input_data.property_taxes_annual / 12
        monthly_insurance = input_data.insurance_annual / 12
        monthly_holding_base = monthly_payment + monthly_taxes + monthly_insurance + input_data.utilities_monthly + input_data.dumpster_monthly
        total_holding_costs = monthly_holding_base * input_data.holding_months

        total_renovation = result["total_renovation"]
        all_in_cost = input_data.purchase_price + total_renovation + input_data.purchase_costs
        purchase_rehab_cost = input_data.purchase_price + input_data.rehab_costs
        breakeven_price = result["minimum_sale_for_breakeven"]
        target_fifteen_all_in = (input_data.arv * 0.85) - input_data.rehab_costs - input_data.purchase_costs

        total_cash_required = (
            result["down_payment"] +
            input_data.purchase_costs +
            input_data.inspection_costs +
            points_cost +
            total_renovation +
            total_holding_costs
        )
        total_project_cost = (
            input_data.purchase_price +
            input_data.purchase_costs +
            input_data.inspection_costs +
            total_renovation +
            total_holding_costs
        )
        gross_profit = input_data.arv - total_project_cost
        net_profit_before_tax = result["net_sale_proceeds"] - loan_amount - total_cash_required
        capital_gains_tax = max(0, net_profit_before_tax * input_data.capital_gains_rate)
        net_profit_after_tax = net_profit_before_tax - capital_gains_tax

        roi = net_profit_before_tax / total_cash_required if total_cash_required > 0 else 0
        annualized_roi = roi * (12 / input_data.holding_months) if input_data.holding_months > 0 else 0
        profit_margin = net_profit_before_tax / input_data.arv if input_data.arv > 0 else 0

        roi_pct = roi * 100
        annualized_roi_pct = annualized_roi * 100
        profit_margin_pct = profit_margin * 100

        deal_score = 50
        if roi_pct > 0:
            deal_score += min(25, roi_pct / 4)
        if purchase_rehab_cost < input_data.arv * 0.75:
            deal_score += 15
        if net_profit_before_tax > 15000:
            deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))
        
        return {
            # Costs
            "purchase_price": result["purchase_price"],
            "purchase_costs": input_data.purchase_costs,
            "inspection_costs": input_data.inspection_costs,
            "points_cost": points_cost,
            "total_renovation": total_renovation,
            "total_holding_costs": total_holding_costs,
            "total_project_cost": total_project_cost,
            "total_cash_required": total_cash_required,
            "loan_amount": loan_amount,
            "loan_to_cost_pct": loan_to_cost_pct,
            "monthly_payment": monthly_payment,
            "holding_months": input_data.holding_months,
            
            # Sale
            "arv": input_data.arv,
            "selling_costs": result["total_selling_costs"],
            "net_sale_proceeds": result["net_sale_proceeds"],
            "loan_repayment": loan_amount,
            
            # Profit
            "gross_profit": gross_profit,
            "net_profit_before_tax": net_profit_before_tax,
            "net_profit_after_tax": net_profit_after_tax,
            
            # Key Metrics
            "roi": roi_pct,
            "annualized_roi": annualized_roi_pct,
            "profit_margin": profit_margin_pct,
            "meets_70_rule": result["meets_70_rule"],
            "mao": result["seventy_pct_max_price"],
            "deal_score": deal_score,

            # Pricing ladder
            "all_in_cost": all_in_cost,
            "purchase_rehab_cost": purchase_rehab_cost,
            "breakeven_price": breakeven_price,
            "target_fifteen_all_in": target_fifteen_all_in,
        }
        
    except Exception as e:
        logger.error(f"Flip worksheet calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class HouseHackWorksheetInput(BaseModel):
    """Input parameters for House Hack worksheet calculation."""
    purchase_price: float
    unit_rents: list = Field(default=[0, 0, 0], description="List of unit rents [unit2, unit3, unit4]")
    owner_market_rent: float = 1500
    list_price: Optional[float] = None
    fha_max_price: Optional[float] = None
    property_taxes_annual: float = 6000
    insurance_annual: float = 2000
    down_payment_pct: float = 0.035
    interest_rate: float = 0.07
    loan_term_years: int = 30
    closing_costs: float = 0
    pmi_rate: float = 0.005
    vacancy_rate: float = 0.05
    maintenance_pct: float = 0.05
    capex_pct: float = 0.05
    maintenance_monthly: float = 200
    capex_monthly: float = 100
    utilities_monthly: float = 150
    loan_type: Optional[str] = "conventional"


@app.post("/api/v1/worksheet/househack/calculate")
async def calculate_househack_worksheet(input_data: HouseHackWorksheetInput):
    """Calculate House Hack worksheet metrics."""
    try:
        # Calculate total rental income from other units
        total_rent = sum(input_data.unit_rents)
        rooms_rented = sum(1 for r in input_data.unit_rents if r > 0)
        avg_rent = total_rent / rooms_rented if rooms_rented > 0 else 0
        
        result = calculate_house_hack(
            purchase_price=input_data.purchase_price,
            monthly_rent_per_room=avg_rent,
            rooms_rented=rooms_rented,
            property_taxes_annual=input_data.property_taxes_annual,
            owner_unit_market_rent=input_data.owner_market_rent,
            down_payment_pct=input_data.down_payment_pct,
            interest_rate=input_data.interest_rate,
            loan_term_years=input_data.loan_term_years,
            closing_costs_pct=input_data.closing_costs / input_data.purchase_price if input_data.closing_costs > 0 else 0.03,
            fha_mip_rate=input_data.pmi_rate,
            insurance_annual=input_data.insurance_annual,
            utilities_shared_monthly=input_data.utilities_monthly,
            maintenance_monthly=input_data.maintenance_monthly + input_data.capex_monthly,
        )
        
        maintenance_monthly = (
            total_rent * input_data.maintenance_pct
            if input_data.maintenance_monthly == 0 else input_data.maintenance_monthly
        )
        capex_monthly = (
            total_rent * input_data.capex_pct
            if input_data.capex_monthly == 0 else input_data.capex_monthly
        )
        monthly_taxes = input_data.property_taxes_annual / 12
        monthly_insurance = input_data.insurance_annual / 12
        monthly_pmi = (result["loan_amount"] * input_data.pmi_rate) / 12
        monthly_piti = result["monthly_pi"] + monthly_pmi

        # Calculate adjusted metrics for vacancy
        effective_rental_income = total_rent * (1 - input_data.vacancy_rate)
        total_monthly_expenses = (
            monthly_taxes +
            monthly_insurance +
            maintenance_monthly +
            capex_monthly +
            input_data.utilities_monthly
        )
        your_housing_cost = monthly_piti + total_monthly_expenses - effective_rental_income
        savings_vs_renting = input_data.owner_market_rent - your_housing_cost
        
        # Move-out scenario (as full rental)
        full_rental_income = (total_rent + input_data.owner_market_rent) * (1 - input_data.vacancy_rate)
        full_rental_noi = full_rental_income * 12 - (total_monthly_expenses * 12)
        full_rental_cash_flow = full_rental_noi - (monthly_piti * 12)
        moveout_cap_rate = (full_rental_noi / input_data.purchase_price * 100) if input_data.purchase_price > 0 else 0
        
        list_price = input_data.list_price or (input_data.purchase_price * 1.056)
        breakeven_price = (
            input_data.purchase_price +
            ((monthly_piti + total_monthly_expenses - effective_rental_income) * 12 / 0.08)
        )
        target_coc_price = input_data.purchase_price * 0.93
        fha_max_price = input_data.fha_max_price or 472030

        return {
            # Housing Cost
            "your_housing_cost": your_housing_cost,
            "rental_income": effective_rental_income,
            "total_monthly_expenses": total_monthly_expenses,
            "savings_vs_renting": savings_vs_renting,
            
            # If You Move Out
            "full_rental_income": full_rental_income,
            "full_rental_cash_flow": full_rental_cash_flow / 12,
            "full_rental_annual": full_rental_cash_flow,
            "moveout_cap_rate": moveout_cap_rate,
            
            # Financing
            "loan_amount": result["loan_amount"],
            "monthly_payment": result["monthly_pi"],
            "monthly_pmi": monthly_pmi,
            "monthly_piti": monthly_piti,
            "down_payment": result["down_payment"],
            "closing_costs": result["closing_costs"],
            "total_cash_needed": result["total_cash_required"],

            # Operating Expenses
            "monthly_taxes": monthly_taxes,
            "monthly_insurance": monthly_insurance,
            "maintenance_monthly": maintenance_monthly,
            "capex_monthly": capex_monthly,
            "utilities_monthly": input_data.utilities_monthly,
            "total_rent": total_rent,
            
            # Key Metrics
            "housing_offset": result["housing_cost_offset_pct"] * 100,
            "coc_return": (full_rental_cash_flow / result["total_cash_required"] * 100) if result["total_cash_required"] > 0 else 0,
            "deal_score": min(100, max(0, round(
                50 + 
                (20 if your_housing_cost <= 0 else 10 if your_housing_cost <= 500 else 0) +
                (15 if savings_vs_renting >= 1000 else 10 if savings_vs_renting >= 500 else 0) +
                (15 if full_rental_cash_flow > 0 else 0)
            ))),

            # Pricing ladder
            "list_price": list_price,
            "breakeven_price": breakeven_price,
            "target_coc_price": target_coc_price,
            "fha_max_price": fha_max_price,
        }
        
    except Exception as e:
        logger.error(f"House Hack worksheet calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class WholesaleWorksheetInput(BaseModel):
    """Input parameters for Wholesale worksheet calculation."""
    arv: float
    contract_price: float
    investor_price: float
    rehab_costs: float
    assignment_fee: float = 15000
    marketing_costs: float = 500
    earnest_money: float = 1000
    selling_costs_pct: float = 0.06
    investor_down_payment_pct: float = 0.25
    investor_purchase_costs_pct: float = 0.03
    tax_rate: float = 0.20


@app.post("/api/v1/worksheet/wholesale/calculate")
async def calculate_wholesale_worksheet(input_data: WholesaleWorksheetInput):
    """Calculate Wholesale worksheet metrics."""
    try:
        # Calculate MAO using 70% rule
        mao = (input_data.arv * 0.70) - input_data.rehab_costs
        
        # Calculate assignment fee from prices
        assignment_fee = input_data.investor_price - input_data.contract_price - input_data.marketing_costs
        post_tax_profit = assignment_fee * (1 - input_data.tax_rate)
        
        result = calculate_wholesale(
            arv=input_data.arv,
            estimated_rehab_costs=input_data.rehab_costs,
            assignment_fee=assignment_fee,
            marketing_costs=input_data.marketing_costs,
            earnest_money_deposit=input_data.earnest_money,
        )
        
        # Investor analysis
        investor_purchase_costs = input_data.investor_price * input_data.investor_purchase_costs_pct
        down_payment = input_data.investor_price * input_data.investor_down_payment_pct
        amount_financed = input_data.investor_price - down_payment
        total_cash_needed = down_payment + investor_purchase_costs + input_data.rehab_costs
        selling_costs = input_data.arv * input_data.selling_costs_pct
        sale_proceeds = input_data.arv - selling_costs
        investor_all_in = input_data.investor_price + input_data.rehab_costs + investor_purchase_costs
        investor_profit = sale_proceeds - investor_all_in
        investor_roi = (investor_profit / total_cash_needed * 100) if total_cash_needed > 0 else 0
        
        # Deal score heuristic
        deal_score = 50
        if assignment_fee > 5000:
            deal_score += 15
        if assignment_fee > 10000:
            deal_score += 10
        if investor_roi > 20:
            deal_score += 15
        if input_data.investor_price < mao:
            deal_score += 10
        deal_score = min(100, max(0, round(deal_score)))
        
        return {
            # Deal Structure
            "contract_price": input_data.contract_price,
            "investor_price": input_data.investor_price,
            "assignment_fee": assignment_fee,
            "closing_costs": input_data.marketing_costs,
            "earnest_money": input_data.earnest_money,
            "mao": mao,
            
            # Your Profit
            "gross_profit": result["gross_profit"],
            "net_profit": result["net_profit"],
            "post_tax_profit": post_tax_profit,
            "roi": result["roi"] * 100,
            "total_cash_at_risk": result["total_cash_at_risk"],
            
            # Investor Analysis
            "investor_all_in": investor_all_in,
            "investor_purchase_costs": investor_purchase_costs,
            "down_payment": down_payment,
            "amount_financed": amount_financed,
            "total_cash_needed": total_cash_needed,
            "selling_costs": selling_costs,
            "sale_proceeds": sale_proceeds,
            "investor_profit": investor_profit,
            "investor_roi": investor_roi,
            
            # Deal Viability
            "deal_viability": result["deal_viability"],
            "spread_available": result["spread_available"],
            "deal_score": deal_score,
        }
        
    except Exception as e:
        logger.error(f"Wholesale worksheet calculation error: {str(e)}")
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
# MARKET DATA ENDPOINTS
# ============================================

@app.get("/api/v1/market-data")
async def get_market_data(
    location: str = Query(..., description="City, State format (e.g., 'Delray Beach, FL')")
):
    """
    Get rental market data from Zillow via AXESSO API.
    
    Args:
        location: City, State format (e.g., "Delray Beach, FL")
    
    Returns:
        Market data including median rent, trends, temperature, etc.
    """
    try:
        logger.info(f"Market data request for location: {location}")
        
        result = await property_service.get_market_data(location=location)
        
        if result.get("success"):
            return result.get("data", {})
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to fetch market data")
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market data fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/similar-rent")
async def get_similar_rent(
    zpid: Optional[str] = None,
    url: Optional[str] = None,
    address: Optional[str] = None
):
    """
    Get similar rental properties from Zillow via AXESSO API.
    
    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
        address: Property address
    
    Returns:
        List of similar rental properties
    """
    try:
        if not zpid and not url and not address:
            raise HTTPException(
                status_code=400, 
                detail="At least one of zpid, url, or address is required"
            )
        
        logger.info(f"Similar rent request - zpid: {zpid}, address: {address}")
        
        result = await property_service.get_similar_rent(zpid=zpid, url=url, address=address)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar rent fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/similar-sold")
async def get_similar_sold(
    zpid: Optional[str] = None,
    url: Optional[str] = None,
    address: Optional[str] = None
):
    """
    Get similar sold properties from Zillow via AXESSO API.
    
    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
        address: Property address
    
    Returns:
        List of similar recently sold properties
    """
    try:
        if not zpid and not url and not address:
            raise HTTPException(
                status_code=400, 
                detail="At least one of zpid, url, or address is required"
            )
        
        logger.info(f"Similar sold request - zpid: {zpid}, address: {address}")
        
        result = await property_service.get_similar_sold(zpid=zpid, url=url, address=address)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar sold fetch error: {str(e)}")
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
