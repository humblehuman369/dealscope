"""
URAR Appraisal Narrative Service — generates professional appraisal narratives
using Anthropic Claude with template-based fallback.

Each method produces a single narrative paragraph for a specific Form 1004
section. When ANTHROPIC_API_KEY is not configured or the API call fails,
a template-based fallback is returned instead.
"""

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_anthropic_client = None
_anthropic_checked = False
ANTHROPIC_AVAILABLE = False


def _ensure_anthropic():
    """Lazy-load the Anthropic client on first use."""
    global _anthropic_client, _anthropic_checked, ANTHROPIC_AVAILABLE

    if _anthropic_checked:
        return _anthropic_client

    _anthropic_checked = True
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set — AI narratives disabled, using templates")
        return None

    try:
        import anthropic

        # Keep narrative generation fast and non-blocking for report downloads.
        _anthropic_client = anthropic.Anthropic(
            api_key=api_key,
            timeout=8.0,
            max_retries=1,
        )
        ANTHROPIC_AVAILABLE = True
        logger.info("Anthropic client initialized — AI narratives enabled")
        return _anthropic_client
    except Exception as exc:
        logger.error("Anthropic client init failed: %s", exc)
        return None


SYSTEM_PROMPT = """You are a professional real estate appraiser writing sections of a Uniform Residential Appraisal Report (URAR, Form 1004). Write in a factual, objective, third-person tone consistent with appraisal industry standards. Use specific data values when provided. Keep each narrative to 1-2 concise paragraphs. Do not include section headers or titles — return only the narrative text. Do not fabricate data not provided to you. If data is insufficient for a conclusion, state that additional inspection or data is needed."""


def _fmt_money(val: float | int | None) -> str:
    if val is None:
        return "N/A"
    return f"${val:,.0f}"


def _fmt_pct(val: float | None, decimals: int = 1) -> str:
    if val is None:
        return "N/A"
    return f"{val:.{decimals}f}%"


def _call_claude(prompt: str) -> str | None:
    """Send a prompt to Claude and return the text response, or None on failure."""
    client = _ensure_anthropic()
    if not client:
        return None

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception as exc:
        logger.error("Claude API call failed: %s", exc)
        return None


class AppraisalNarrativeService:
    """Generate URAR-compliant narrative sections via Claude with template fallback."""

    def generate_neighborhood_narrative(
        self,
        property_data: dict[str, Any],
        market_stats: dict[str, Any] | None = None,
        comps: list[dict[str, Any]] | None = None,
    ) -> str:
        details = property_data.get("details", {})
        address = property_data.get("address", {})
        ms = market_stats or {}

        prompt = f"""Write a URAR Neighborhood section narrative for:
Property: {address.get("full_address", "Subject property")}
Property Type: {details.get("property_type", "Single Family")}
City/State: {address.get("city", "")}, {address.get("state", "")}
Median Sale Price: {_fmt_money(ms.get("median_price"))}
Median Days on Market: {ms.get("median_days_on_market", "N/A")}
Total Active Listings: {ms.get("total_listings", "N/A")}
New Listings: {ms.get("new_listings", "N/A")}
Market Temperature: {ms.get("market_temperature", "N/A")}
Avg Price/SqFt: {_fmt_money(ms.get("avg_price_per_sqft"))}
Number of Comps Analyzed: {len(comps) if comps else "N/A"}

Describe the neighborhood character, market conditions (supply/demand, price trends, marketing time), and housing trends."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        # Template fallback
        city = address.get("city", "the area")
        temp = ms.get("market_temperature", "stable")
        dom = ms.get("median_days_on_market")
        med_price = ms.get("median_price")

        trend_desc = "stable" if temp in (None, "warm") else ("increasing" if temp == "hot" else "declining")
        dom_desc = f"a median of {dom} days on market" if dom else "typical marketing times"
        price_desc = (
            f"a median sale price of {_fmt_money(med_price)}" if med_price else "prices consistent with the area"
        )

        return (
            f"The subject property is located in {city}, a predominantly residential area "
            f"with {trend_desc} property values. The market reflects {dom_desc} and "
            f"{price_desc}. Housing demand appears "
            f"{'strong' if temp == 'hot' else 'balanced' if temp in (None, 'warm') else 'soft'} "
            f"based on available listing data."
        )

    def generate_site_narrative(
        self,
        property_data: dict[str, Any],
    ) -> str:
        details = property_data.get("details", {})
        lot = details.get("lot_size")
        lot_acres = lot / 43560 if lot and lot > 0 else None

        prompt = f"""Write a URAR Site section narrative for:
Lot Size: {f"{lot:,} sqft" if lot else "N/A"}{f" ({lot_acres:.2f} acres)" if lot_acres else ""}
Property Type: {details.get("property_type", "N/A")}

Note that zoning, flood zone, utilities, and easement data are not available for this analysis. State this limitation briefly."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        lot_desc = f"{lot:,} square feet" if lot else "not available"
        acres_desc = f" ({lot_acres:.2f} acres)" if lot_acres else ""
        return (
            f"The subject site has a lot size of {lot_desc}{acres_desc}. "
            f"Zoning classification, flood zone determination, utility details, "
            f"and easement information were not available for this analysis and "
            f"should be verified through local municipal records."
        )

    def generate_improvements_narrative(
        self,
        property_data: dict[str, Any],
    ) -> str:
        d = property_data.get("details", {})
        current_year = 2026
        year_built = d.get("year_built")
        age = current_year - year_built if year_built else None

        features = []
        if d.get("heating_type"):
            features.append(f"{d['heating_type']} heating")
        if d.get("cooling_type"):
            features.append(f"{d['cooling_type']} cooling")
        if d.get("has_garage"):
            gs = d.get("garage_spaces")
            features.append(f"{gs}-car garage" if gs else "garage")
        if d.get("has_pool"):
            features.append("pool")
        if d.get("has_fireplace"):
            features.append("fireplace")
        if d.get("roof_type"):
            features.append(f"{d['roof_type']} roof")
        if d.get("exterior_type"):
            features.append(f"{d['exterior_type']} exterior")
        if d.get("foundation_type"):
            features.append(f"{d['foundation_type']} foundation")

        prompt = f"""Write a URAR Improvements section narrative for:
Property Type: {d.get("property_type", "Single Family")}
Year Built: {year_built or "N/A"}
Actual Age: {f"{age} years" if age else "N/A"}
Stories: {d.get("stories", "N/A")}
Bedrooms: {d.get("bedrooms", "N/A")}
Bathrooms: {d.get("bathrooms", "N/A")}
GLA (Sq Ft): {f"{d['square_footage']:,}" if d.get("square_footage") else "N/A"}
Features: {", ".join(features) if features else "Not available"}

Describe the physical characteristics, estimate effective age, and note that interior inspection was not conducted."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        beds = d.get("bedrooms", "N/A")
        baths = d.get("bathrooms", "N/A")
        sqft = d.get("square_footage")
        stories = d.get("stories")
        ptype = (d.get("property_type") or "single family").replace("_", " ").title()

        sqft_desc = f"{sqft:,} square feet of gross living area" if sqft else "an undetermined gross living area"
        story_desc = f", {stories}-story" if stories else ""
        age_desc = f" The improvements have an actual age of {age} years." if age else ""
        feat_desc = f" Features include {', '.join(features)}." if features else ""

        return (
            f"The subject is a {ptype}{story_desc} dwelling with {beds} bedrooms, "
            f"{baths} bathrooms, and {sqft_desc}. The home was built in "
            f"{year_built or 'an unknown year'}.{age_desc}{feat_desc} "
            f"Interior condition was not inspected; this analysis relies on "
            f"available public data sources."
        )

    def generate_reconciliation_narrative(
        self,
        appraisal_data: dict[str, Any],
    ) -> str:
        mv = appraisal_data.get("market_value", 0)
        arv = appraisal_data.get("arv", 0)
        conf = appraisal_data.get("confidence", 0)
        adj_val = appraisal_data.get("adjusted_price_value", 0)
        ppsf_val = appraisal_data.get("price_per_sqft_value", 0)
        n_comps = len(appraisal_data.get("comp_adjustments", []))
        income_value = appraisal_data.get("income_indicated_value")
        grm = appraisal_data.get("grm")

        prompt = f"""Write a URAR Reconciliation section narrative:
Sales Comparison Indicated Value: {_fmt_money(mv)}
Adjusted Price Method: {_fmt_money(adj_val)}
Price/SqFt Method: {_fmt_money(ppsf_val)}
ARV (After Repair Value): {_fmt_money(arv)}
Confidence Score: {conf:.0f}%
Number of Comps: {n_comps}
Income Approach Indicated Value: {_fmt_money(income_value) if income_value else "Not developed"}
GRM: {f"{grm:.1f}" if grm else "N/A"}

Explain which approach received most weight, the consistency of value indications, and state the final opinion of market value. Note this is not a licensed appraisal."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        return (
            f"The Sales Comparison Approach is given greatest weight in this analysis "
            f"as it most directly reflects market behavior for properties of this type. "
            f"Based on {n_comps} comparable sales, the adjusted price method indicates "
            f"{_fmt_money(adj_val)} and the price-per-square-foot method indicates "
            f"{_fmt_money(ppsf_val)}. Using a weighted hybrid methodology, the indicated "
            f"market value is {_fmt_money(mv)} with a confidence score of {conf:.0f}%. "
            f"The After Repair Value is estimated at {_fmt_money(arv)}."
        )

    def generate_income_approach_narrative(
        self,
        rental_data: dict[str, Any] | None = None,
        appraisal_data: dict[str, Any] | None = None,
    ) -> str:
        rd = rental_data or {}
        monthly_rent = rd.get("monthly_rent") or rd.get("iq_estimate")
        grm = appraisal_data.get("grm") if appraisal_data else None
        cap_rate = appraisal_data.get("cap_rate") if appraisal_data else None
        market_value = appraisal_data.get("market_value", 0) if appraisal_data else 0

        annual_rent = monthly_rent * 12 if monthly_rent else None
        income_value = annual_rent * grm / 12 if annual_rent and grm else None

        prompt = f"""Write a URAR Income Approach section narrative:
Monthly Rent Estimate: {_fmt_money(monthly_rent)}
Annual Gross Rent: {_fmt_money(annual_rent)}
Gross Rent Multiplier: {f"{grm:.1f}" if grm else "N/A"}
Cap Rate: {_fmt_pct(cap_rate) if cap_rate else "N/A"}
Indicated Value (Income): {_fmt_money(income_value) if income_value else "N/A"}
Sales Comparison Value: {_fmt_money(market_value)}

Describe the income approach methodology, rent estimate support, and indicated value. Note limited applicability for owner-occupied residential properties."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        if not monthly_rent:
            return (
                "The Income Approach was not developed due to insufficient rental data. "
                "This approach is typically given limited weight for owner-occupied "
                "single-family residential properties."
            )

        rent_desc = _fmt_money(monthly_rent)
        grm_desc = f" Using a gross rent multiplier of {grm:.1f}" if grm else ""
        income_desc = f", the income approach indicates a value of {_fmt_money(income_value)}" if income_value else ""
        return (
            f"The estimated market rent for the subject is {rent_desc} per month "
            f"({_fmt_money(annual_rent)} annually) based on comparable rental data."
            f"{grm_desc}{income_desc}. The Income Approach is given secondary weight "
            f"as this is primarily an owner-occupied market."
        )

    def generate_cost_approach_narrative(
        self,
        property_data: dict[str, Any],
        market_value: float | None = None,
    ) -> str:
        d = property_data.get("details", {})
        year_built = d.get("year_built")
        sqft = d.get("square_footage")
        lot = d.get("lot_size")
        current_year = 2026
        age = current_year - year_built if year_built else None
        land_pct = 0.20
        land_value = market_value * land_pct if market_value else None

        prompt = f"""Write a URAR Cost Approach section narrative:
Year Built: {year_built or "N/A"}
Age: {f"{age} years" if age else "N/A"}
GLA: {f"{sqft:,} sqft" if sqft else "N/A"}
Lot Size: {f"{lot:,} sqft" if lot else "N/A"}
Estimated Land Value ({land_pct * 100:.0f}%): {_fmt_money(land_value)}
Sales Comparison Value: {_fmt_money(market_value)}

Note that reproduction/replacement cost data is not available. The cost approach is presented with limited reliability. Estimate depreciation using straight-line method over the building's age."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        if not market_value or not age:
            return (
                "The Cost Approach was not fully developed due to insufficient data. "
                "Reproduction or replacement cost estimates and comparable land sales "
                "were not available for this analysis."
            )

        depreciation_pct = min(age / 50.0, 0.80)
        improvement_value = market_value * (1 - land_pct)
        depreciated_value = improvement_value * (1 - depreciation_pct)
        cost_indicated = (land_value or 0) + depreciated_value

        return (
            f"The estimated site value is {_fmt_money(land_value)} based on "
            f"{land_pct * 100:.0f}% of the sales comparison indicated value. "
            f"Using an estimated depreciation of {depreciation_pct * 100:.0f}% "
            f"(straight-line over {age} years), the depreciated improvement value "
            f"is approximately {_fmt_money(depreciated_value)}. The Cost Approach "
            f"indicates a value of approximately {_fmt_money(cost_indicated)}. "
            f"This approach is given limited weight due to the absence of "
            f"reproduction cost data and comparable land sales."
        )

    def generate_scope_of_work(
        self,
        property_data: dict[str, Any],
    ) -> str:
        prompt = """Write a brief URAR Scope of Work / Limiting Conditions statement for a desktop appraisal report. Include:
- This is a desktop analysis, not a physical inspection
- Data sources include public records, MLS data, and third-party APIs
- Values are estimates for investment analysis purposes
- This is NOT a licensed appraisal or BPO
- The report should not be used as a substitute for a professional appraisal
Keep it to 1-2 paragraphs."""

        ai_text = _call_claude(prompt)
        if ai_text:
            return ai_text

        return (
            "This report is a desktop comparative market analysis prepared using "
            "publicly available data sources including MLS records, county assessor "
            "data, and third-party property information APIs. No physical inspection "
            "of the subject property or comparable sales was conducted. "
            "This analysis is intended for investment evaluation purposes only "
            "and does not constitute a licensed appraisal, Broker Price Opinion "
            "(BPO), or Comparative Market Analysis (CMA) prepared by a licensed "
            "appraiser. The values presented are estimates and may differ from "
            "actual market values. Users should consult with licensed appraisers "
            "and qualified real estate professionals before making investment decisions."
        )
