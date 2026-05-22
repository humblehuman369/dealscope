"""
Reports router for generating downloadable property analysis reports.

Endpoints:
- /property/{id}/excel - Comprehensive Excel report with all strategies
- /property/{id}/financial-statements - Focused NOI, DSCR, Pro Forma report
- /property/{id}/csv - Simple CSV summary
- /saved/{id}/excel - Report for saved properties
"""

import logging
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.deps import DbSession, OptionalUser, ProUser
from app.core.exceptions import ExternalAPIError
from app.schemas.deal_maker import DealMakerRecord
from app.schemas.reports import ComprehensiveExcelRequest
from app.services.assumption_resolver import _resolve_insurance_annual, resolve_assumptions
from app.services.comprehensive_excel_exporter import comprehensive_excel_exporter
from app.services.proforma_generator import generate_proforma_data
from app.services.property_service import property_service
from app.services.report_service import report_service
from app.services.resilience import CircuitOpenError
from app.services.saved_property_service import saved_property_service
from app.services.verdict_assumptions import (
    apply_verdict_input_to_assumptions,
    deal_maker_record_to_verdict_overrides,
    merge_verdict_input,
    patch_property_from_verdict_input,
    resolve_purchase_price,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


async def _load_property_for_export(property_id: str, address: str):
    """Cached property first; search by address when cache miss."""
    property_data = await property_service.get_cached_property(property_id)
    if property_data:
        return property_data
    try:
        return await property_service.search_property(address)
    except (ExternalAPIError, CircuitOpenError) as e:
        logger.warning("Property data unavailable for export %s: %s", address, e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Data providers are temporarily unavailable. Please try again in a few minutes.",
        )


# ===========================================
# Report Generation
# ===========================================


@router.post(
    "/property/{property_id}/comprehensive-excel",
    summary="Download comprehensive Excel proforma with all 6 strategy worksheets",
)
async def download_comprehensive_excel(
    property_id: str,
    body: ComprehensiveExcelRequest,
    current_user: ProUser,
    db: DbSession,
):
    """
    Strategy page export: accounting proforma + financial statements + one worksheet
    per investment strategy, using live verdict inputs and optional saved deal record.
    """
    property_data = await _load_property_for_export(property_id, body.address)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found. Please analyze the property first.",
        )

    verdict_input = body.verdict_input
    if body.saved_property_id:
        saved = await saved_property_service.get_by_id(
            db=db,
            property_id=body.saved_property_id,
            user_id=str(current_user.id),
        )
        if saved and saved.deal_maker_record:
            try:
                record = (
                    saved.deal_maker_record
                    if isinstance(saved.deal_maker_record, DealMakerRecord)
                    else DealMakerRecord.model_validate(saved.deal_maker_record)
                )
                saved_overrides = deal_maker_record_to_verdict_overrides(record)
                verdict_input = merge_verdict_input(verdict_input, saved_overrides)
            except Exception as e:
                logger.warning("Could not merge saved deal_maker_record: %s", e)

    assumptions = await resolve_assumptions(db)
    user_keys = apply_verdict_input_to_assumptions(assumptions, verdict_input)
    patched_property = patch_property_from_verdict_input(property_data, verdict_input)
    purchase_price = resolve_purchase_price(verdict_input, assumptions)
    assumptions.financing.purchase_price = purchase_price
    if assumptions.operating.insurance_annual is None:
        assumptions.operating.insurance_annual = _resolve_insurance_annual(
            assumptions.operating, purchase_price
        )

    try:
        analytics = await property_service.calculate_analytics(
            property_id=property_id,
            assumptions=assumptions,
            strategies=None,
            property_data=patched_property,
        )
    except Exception as e:
        logger.error("Failed to calculate analytics for comprehensive export: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate analytics for export",
        )

    monthly_rent = verdict_input.monthly_rent
    if monthly_rent is None and patched_property.rentals:
        monthly_rent = patched_property.rentals.monthly_rent_ltr

    property_taxes = verdict_input.property_taxes
    if property_taxes is None and patched_property.market:
        property_taxes = patched_property.market.property_taxes_annual

    insurance = verdict_input.insurance
    if insurance is None and patched_property.market:
        insurance = patched_property.market.insurance_annual

    try:
        proforma = await generate_proforma_data(
            property_data=patched_property,
            strategy="ltr",
            purchase_price_override=purchase_price,
            monthly_rent_override=monthly_rent,
            interest_rate_override=verdict_input.interest_rate,
            down_payment_pct_override=verdict_input.down_payment_pct,
            property_taxes_override=property_taxes,
            insurance_override=insurance,
            assumptions=assumptions,
        )
    except Exception as e:
        logger.error("Failed to generate proforma for comprehensive export: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate proforma for export",
        )

    property_dict = patched_property.model_dump(mode="json")
    analytics_dict = analytics.model_dump(mode="json", by_alias=True)
    assumptions_dict = assumptions.model_dump(mode="json", by_alias=True)

    try:
        excel_bytes = comprehensive_excel_exporter.generate(
            property_data=property_dict,
            analytics_data=analytics_dict,
            proforma=proforma,
            assumptions=assumptions_dict,
            active_strategy=body.active_strategy,
            user_override_keys=user_keys,
            include_sensitivity=body.include_sensitivity,
        )
    except Exception as e:
        logger.error("Failed to build comprehensive Excel: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Excel report",
        )

    street = (
        patched_property.address.street.replace(" ", "_").replace(",", "")[:30]
        if patched_property.address
        else "property"
    )
    timestamp = datetime.now().strftime("%Y%m%d")
    filename = f"DealGapIQ_Comprehensive_{street}_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/property/{property_id}/excel", summary="Generate Excel report for a property")
async def generate_excel_report(
    property_id: str,
    current_user: ProUser,
    include_sensitivity: bool = Query(True, description="Include sensitivity analysis sheet"),
):
    """
    Generate a comprehensive Excel report for a property.

    The report now includes enhanced financial statements:
    - Property summary and details
    - **Cash Flow Statement (NOI format)** - Professional income/expense breakdown
    - **DSCR Qualification Analysis** - Lender requirement checks
    - **10-Year Pro Forma** - Growth projections
    - **Amortization Schedule** - Loan payoff timeline
    - **Sensitivity Analysis** - What-if scenarios (optional)
    - All 6 investment strategy analyses
    - Strategy comparison matrix
    - Assumptions reference

    Returns an Excel file download.
    """
    # Get property data from cache
    property_data = await property_service.get_cached_property(property_id)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Property not found. Please search for the property first."
        )

    # Calculate analytics
    try:
        analytics = await property_service.calculate_analytics(
            property_id=property_id,
            assumptions=None,  # Use defaults
            strategies=None,  # All strategies
        )
    except Exception as e:
        logger.error(f"Failed to calculate analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to calculate analytics for report"
        )

    # Convert to dict for report service
    property_dict = property_data.model_dump() if hasattr(property_data, "model_dump") else property_data
    analytics_dict = analytics.model_dump() if hasattr(analytics, "model_dump") else analytics

    # Generate Excel
    try:
        excel_bytes = report_service.generate_excel_report(
            property_data=property_dict,
            analytics_data=analytics_dict,
            assumptions=None,
            include_sensitivity=include_sensitivity,
        )
    except Exception as e:
        logger.error(f"Failed to generate Excel report: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate Excel report")

    # Generate filename
    address = property_dict.get("address", {})
    street = address.get("street", "property").replace(" ", "_").replace(",", "")[:30]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"DealGapIQ_{street}_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/property/{property_id}/financial-statements",
    summary="Generate comprehensive financial statements (NOI, DSCR, Pro Forma)",
)
async def generate_financial_statements_report(
    property_id: str,
    current_user: ProUser,
):
    """
    Generate a comprehensive financial statements report for lenders/investors.

    This focused report includes:
    - Executive Summary with investment Discovery
    - Property Cash Flow Statement (NOI format)
    - DSCR Qualification Analysis with lender requirements
    - 10-Year Pro Forma Projection
    - Loan Amortization Schedule
    - Sensitivity Analysis (rent, vacancy, interest rate scenarios)

    Returns an Excel file suitable for:
    - Lender presentations
    - Investor pitches
    - Personal investment analysis
    - Due diligence documentation
    """
    # Get property data from cache
    property_data = await property_service.get_cached_property(property_id)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Property not found. Please search for the property first."
        )

    # Calculate analytics
    try:
        analytics = await property_service.calculate_analytics(
            property_id=property_id,
            assumptions=None,  # Use defaults
            strategies=None,  # All strategies
        )
    except Exception as e:
        logger.error(f"Failed to calculate analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to calculate analytics for report"
        )

    # Convert to dict for report service
    property_dict = property_data.model_dump() if hasattr(property_data, "model_dump") else property_data
    analytics_dict = analytics.model_dump() if hasattr(analytics, "model_dump") else analytics

    # Generate Financial Statements Report
    try:
        excel_bytes = report_service.generate_financial_statements_report(
            property_data=property_dict,
            analytics_data=analytics_dict,
            assumptions=None,
        )
    except Exception as e:
        logger.error(f"Failed to generate financial statements report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate financial statements report"
        )

    # Generate filename
    address = property_dict.get("address", {})
    street = address.get("street", "property").replace(" ", "_").replace(",", "")[:30]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"DealGapIQ_Financial_Statements_{street}_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/property/{property_id}/csv", summary="Generate CSV summary for a property")
async def generate_csv_report(
    property_id: str,
    current_user: OptionalUser,
):
    """
    Generate a simple CSV summary of all strategy metrics.

    Useful for importing into spreadsheets or other tools.
    """
    # Get property data from cache
    property_data = await property_service.get_cached_property(property_id)
    if not property_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Calculate analytics
    try:
        analytics = await property_service.calculate_analytics(
            property_id=property_id,
            assumptions=None,
            strategies=None,
        )
    except Exception as e:
        logger.error(f"Failed to calculate analytics: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to calculate analytics")

    # Build CSV content
    lines = []
    lines.append("Strategy,Cash Required,Monthly Cash Flow,Annual Cash Flow,CoC Return,Cap Rate,Key Metric")

    analytics_dict = analytics.model_dump() if hasattr(analytics, "model_dump") else analytics

    strategies = [
        ("Long-Term Rental", "ltr"),
        ("Short-Term Rental", "str"),
        ("BRRRR", "brrrr"),
        ("Fix & Flip", "flip"),
        ("House Hack", "house_hack"),
        ("Wholesale", "wholesale"),
    ]

    for name, key in strategies:
        data = analytics_dict.get(key, {})
        if not data:
            continue

        cash_req = (
            data.get("total_cash_required") or data.get("total_cash_invested") or data.get("total_cash_at_risk", 0)
        )
        monthly_cf = data.get("monthly_cash_flow", 0)
        annual_cf = data.get("annual_cash_flow", 0)
        coc = data.get("cash_on_cash_return", 0)
        cap = data.get("cap_rate", 0)

        # Key metric varies by strategy
        if key == "flip":
            key_metric = data.get("net_profit_before_tax", 0)
        elif key == "wholesale":
            key_metric = data.get("assignment_fee", 0)
        elif key == "brrrr":
            key_metric = data.get("cash_left_in_deal", 0)
        else:
            key_metric = monthly_cf

        lines.append(
            f"{name},{cash_req:.0f},{monthly_cf:.0f},{annual_cf:.0f},{coc * 100:.1f}%,{cap * 100:.1f}%,{key_metric:.0f}"
        )

    csv_content = "\n".join(lines)

    # Generate filename
    address = property_data.address if hasattr(property_data, "address") else property_data.get("address", {})
    if hasattr(address, "street"):
        street = address.street
    else:
        street = address.get("street", "property")
    street = street.replace(" ", "_").replace(",", "")[:30]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"DealGapIQ_{street}_{timestamp}.csv"

    return StreamingResponse(
        BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/saved/{saved_property_id}/excel", summary="Generate Excel report for a saved property")
async def generate_saved_property_report(
    saved_property_id: str,
    current_user: ProUser,
    db: DbSession,
    include_sensitivity: bool = Query(True, description="Include sensitivity analysis"),
):
    """
    Generate an Excel report for a saved property.

    Uses the saved property's custom adjustments and assumptions
    for personalized analysis. Includes all enhanced financial statements.
    """
    from app.services.saved_property_service import saved_property_service

    # Get saved property
    saved = await saved_property_service.get_by_id(
        db=db,
        property_id=saved_property_id,
        user_id=str(current_user.id),
    )

    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved property not found")

    # Use cached property data from saved property
    property_data = saved.property_data_snapshot or {}

    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No property data available for this saved property"
        )

    # Use saved analytics or recalculate
    analytics_data = saved.last_analytics_result or {}

    if not analytics_data:
        # Need to recalculate - for now return error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No analytics data available. Please analyze the property first.",
        )

    # Generate Excel
    try:
        excel_bytes = report_service.generate_excel_report(
            property_data=property_data,
            analytics_data=analytics_data,
            assumptions=saved.custom_assumptions,
        )
    except Exception as e:
        logger.error(f"Failed to generate Excel report: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate Excel report")

    # Generate filename
    street = (saved.nickname or saved.address_street).replace(" ", "_").replace(",", "")[:30]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"DealGapIQ_{street}_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
