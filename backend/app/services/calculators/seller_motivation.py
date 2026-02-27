"""Seller motivation analysis and condition keyword extraction."""

from datetime import UTC
from typing import Any

"""
Seller Motivation Score - Investment Negotiation Leverage

Analyzes multiple data signals to determine seller motivation level
and potential negotiation leverage for investors.

INDICATORS (from Seller Motivation Indicators.csv):

HIGH Signal Strength (weight 3.0):
1. Days on Market (DOM) - Longer DOM = seller fatigue
2. Multiple Price Reductions - Failed pricing strategy
3. Expired/Withdrawn Listing - Failed to sell publicly
4. Pre-Foreclosure/Foreclosure - Financial distress
5. Poor Property Condition - Limited buyer pool (partial: text inference)

MEDIUM-HIGH Signal Strength (weight 2.5):
6. Absentee Ownership - Property treated as asset
7. Tenant Issues - (NOT AVAILABLE - requires property management data)

MEDIUM Signal Strength (weight 2.0):
8. Vacant Property - Carrying costs without utility (partial inference)
9. Out-of-State Owner - Distance reduces attachment
10. Recently Inherited - (PARTIAL - check for $0 last sale)

LOW Signal Strength (weight 1.0) - Counter-indicator:
11. Owner-Occupied, Well-Maintained - Strong resistance to discounts

NOT AVAILABLE (require external data sources):
- Estate/Probate Sale - Requires court records
- Tenant Issues - Requires property management data
"""


def calculate_seller_motivation(
    # Days on Market
    days_on_market: int | None = None,
    market_median_dom: int | None = None,
    # Price History
    price_reduction_count: int = 0,
    total_price_reduction_pct: float | None = None,
    # Listing Status
    listing_status: str | None = None,
    is_withdrawn: bool = False,
    # Distress Indicators
    is_foreclosure: bool = False,
    is_pre_foreclosure: bool = False,
    is_bank_owned: bool = False,
    is_auction: bool = False,
    # Ownership
    is_owner_occupied: bool | None = None,
    is_absentee_owner: bool | None = None,
    owner_state: str | None = None,
    property_state: str | None = None,
    # Vacancy (inferred)
    is_likely_vacant: bool | None = None,
    # Condition (text-inferred)
    condition_keywords_found: list[str] | None = None,
    # Inheritance indicator
    last_sale_price: float | None = None,
    # Engagement metrics (from AXESSO)
    favorite_count: int | None = None,
    page_view_count: int | None = None,
    selling_soon_percentile: float | None = None,
    # FSBO
    is_fsbo: bool = False,
    # Market context
    market_temperature: str | None = None,
) -> dict[str, Any]:
    """
    Calculate comprehensive Seller Motivation Score.

    Returns a score from 0-100 with individual indicator breakdown.
    Higher score = more motivated seller = better negotiation leverage.
    """
    from datetime import datetime

    indicators = []

    # ========================================
    # 1. DAYS ON MARKET (HIGH - weight 3.0)
    # ========================================
    dom_indicator = {
        "name": "Days on Market",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": days_on_market,
        "source": "AXESSO",
    }

    if days_on_market is not None:
        dom_indicator["detected"] = True

        # Calculate DOM vs market average multiplier
        dom_multiplier = 1.0
        if market_median_dom and market_median_dom > 0:
            dom_multiplier = days_on_market / market_median_dom

        # Score based on absolute DOM and relative to market
        if days_on_market >= 180:
            dom_indicator["score"] = 100
            dom_indicator["signal_strength"] = "high"
            dom_indicator["description"] = f"{days_on_market} days - Extreme seller fatigue"
        elif days_on_market >= 120:
            dom_indicator["score"] = 85
            dom_indicator["signal_strength"] = "high"
            dom_indicator["description"] = f"{days_on_market} days - Very high seller fatigue"
        elif days_on_market >= 90:
            dom_indicator["score"] = 70
            dom_indicator["signal_strength"] = "high"
            dom_indicator["description"] = f"{days_on_market} days - High seller fatigue"
        elif days_on_market >= 60:
            dom_indicator["score"] = 55
            dom_indicator["signal_strength"] = "medium-high"
            dom_indicator["description"] = f"{days_on_market} days - Moderate seller fatigue"
        elif days_on_market >= 30:
            dom_indicator["score"] = 35
            dom_indicator["signal_strength"] = "medium"
            dom_indicator["description"] = f"{days_on_market} days - Some seller fatigue"
        else:
            dom_indicator["score"] = 15
            dom_indicator["signal_strength"] = "low"
            dom_indicator["description"] = f"{days_on_market} days - Fresh listing"

        # Boost score if significantly above market average
        if dom_multiplier >= 2.0:
            dom_indicator["score"] = min(100, dom_indicator["score"] + 15)
            dom_indicator["description"] += f" ({dom_multiplier:.1f}x market avg)"

    indicators.append(dom_indicator)

    # ========================================
    # 2. MULTIPLE PRICE REDUCTIONS (HIGH - weight 3.0)
    # ========================================
    price_red_indicator = {
        "name": "Price Reductions",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": price_reduction_count,
        "source": "AXESSO",
    }

    if price_reduction_count and price_reduction_count > 0:
        price_red_indicator["detected"] = True

        if price_reduction_count >= 3:
            price_red_indicator["score"] = 100
            price_red_indicator["signal_strength"] = "high"
            price_red_indicator["description"] = f"{price_reduction_count} price cuts - Very motivated"
        elif price_reduction_count == 2:
            price_red_indicator["score"] = 80
            price_red_indicator["signal_strength"] = "high"
            price_red_indicator["description"] = "2 price cuts - Seller adjusting expectations"
        else:
            price_red_indicator["score"] = 50
            price_red_indicator["signal_strength"] = "medium"
            price_red_indicator["description"] = "1 price cut - Initial adjustment"

        # Boost if total reduction is significant
        if total_price_reduction_pct and total_price_reduction_pct > 10:
            price_red_indicator["score"] = min(100, price_red_indicator["score"] + 10)
            price_red_indicator["description"] += f" (total {total_price_reduction_pct:.1f}% off)"

    indicators.append(price_red_indicator)

    # ========================================
    # 3. EXPIRED/WITHDRAWN LISTING (HIGH - weight 3.0)
    # ========================================
    withdrawn_indicator = {
        "name": "Withdrawn/Expired Listing",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": is_withdrawn,
        "source": "AXESSO",
    }

    status_upper = (listing_status or "").upper()
    if is_withdrawn or "WITHDRAWN" in status_upper or "EXPIRED" in status_upper:
        withdrawn_indicator["detected"] = True
        withdrawn_indicator["score"] = 95
        withdrawn_indicator["signal_strength"] = "high"
        withdrawn_indicator["description"] = "Previously listed but didn't sell - High motivation likely"

    indicators.append(withdrawn_indicator)

    # ========================================
    # 4. FORECLOSURE/DISTRESS (HIGH - weight 3.0)
    # ========================================
    foreclosure_indicator = {
        "name": "Foreclosure/Distress",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": None,
        "source": "AXESSO",
    }

    if is_pre_foreclosure:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 100
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "Pre-foreclosure - Urgent timeline, maximum leverage"
        foreclosure_indicator["raw_value"] = "pre-foreclosure"
    elif is_foreclosure:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 95
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "Foreclosure - Bank motivated to sell"
        foreclosure_indicator["raw_value"] = "foreclosure"
    elif is_bank_owned:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 85
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "REO/Bank-owned - Institution wants to clear inventory"
        foreclosure_indicator["raw_value"] = "bank-owned"
    elif is_auction:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 80
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "Auction listing - Seller seeking quick sale"
        foreclosure_indicator["raw_value"] = "auction"

    indicators.append(foreclosure_indicator)

    # ========================================
    # 5. ABSENTEE OWNERSHIP (MEDIUM-HIGH - weight 2.5)
    # ========================================
    absentee_indicator = {
        "name": "Absentee Ownership",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.5,
        "description": "",
        "raw_value": is_absentee_owner,
        "source": "AXESSO/RentCast",
    }

    if is_absentee_owner is True or is_owner_occupied is False:
        absentee_indicator["detected"] = True
        absentee_indicator["score"] = 70
        absentee_indicator["signal_strength"] = "medium-high"
        absentee_indicator["description"] = "Non-owner occupied - Treated as investment, less emotional"

    indicators.append(absentee_indicator)

    # ========================================
    # 6. OUT-OF-STATE OWNER (MEDIUM - weight 2.0)
    # ========================================
    out_of_state_indicator = {
        "name": "Out-of-State Owner",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.0,
        "description": "",
        "raw_value": None,
        "source": "RentCast",
    }

    if owner_state and property_state:
        if owner_state.upper() != property_state.upper():
            out_of_state_indicator["detected"] = True
            out_of_state_indicator["score"] = 65
            out_of_state_indicator["signal_strength"] = "medium"
            out_of_state_indicator["description"] = f"Owner in {owner_state} - Distance reduces attachment"
            out_of_state_indicator["raw_value"] = owner_state

    indicators.append(out_of_state_indicator)

    # ========================================
    # 7. VACANT PROPERTY (MEDIUM - weight 2.0) - Inferred
    # ========================================
    vacant_indicator = {
        "name": "Likely Vacant",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.0,
        "description": "",
        "raw_value": is_likely_vacant,
        "source": "Inferred",
    }

    if is_likely_vacant:
        vacant_indicator["detected"] = True
        vacant_indicator["score"] = 60
        vacant_indicator["signal_strength"] = "medium"
        vacant_indicator["description"] = "Likely vacant - Carrying costs without income"

    indicators.append(vacant_indicator)

    # ========================================
    # 8. POOR CONDITION (HIGH - weight 3.0) - Text inferred
    # ========================================
    condition_indicator = {
        "name": "Poor Condition",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": condition_keywords_found,
        "source": "AXESSO (text analysis)",
    }

    if condition_keywords_found and len(condition_keywords_found) > 0:
        condition_indicator["detected"] = True
        keyword_count = len(condition_keywords_found)
        condition_indicator["score"] = min(100, 50 + (keyword_count * 15))
        condition_indicator["signal_strength"] = "high" if keyword_count >= 2 else "medium-high"
        keywords_str = ", ".join(condition_keywords_found[:3])
        condition_indicator["description"] = f"Condition keywords: {keywords_str}"

    indicators.append(condition_indicator)

    # ========================================
    # 9. RECENTLY INHERITED (MEDIUM - weight 2.0) - Partial
    # ========================================
    inherited_indicator = {
        "name": "Possibly Inherited",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.0,
        "description": "",
        "raw_value": last_sale_price,
        "source": "RentCast",
    }

    # $0 or $1 sale price often indicates gift/inheritance transfer
    if last_sale_price is not None and last_sale_price <= 100:
        inherited_indicator["detected"] = True
        inherited_indicator["score"] = 55
        inherited_indicator["signal_strength"] = "medium"
        inherited_indicator["description"] = f"Last sale at ${last_sale_price:.0f} - Possible inheritance/gift transfer"

    indicators.append(inherited_indicator)

    # ========================================
    # 10. FSBO (MEDIUM-HIGH - weight 2.5)
    # ========================================
    fsbo_indicator = {
        "name": "For Sale By Owner",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.5,
        "description": "",
        "raw_value": is_fsbo,
        "source": "AXESSO",
    }

    if is_fsbo:
        fsbo_indicator["detected"] = True
        fsbo_indicator["score"] = 65
        fsbo_indicator["signal_strength"] = "medium-high"
        fsbo_indicator["description"] = "FSBO - More direct negotiation, no agent buffer"

    indicators.append(fsbo_indicator)

    # ========================================
    # 11. OWNER-OCCUPIED (LOW - Counter indicator)
    # ========================================
    owner_occupied_indicator = {
        "name": "Owner-Occupied",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 1.0,
        "description": "",
        "raw_value": is_owner_occupied,
        "source": "AXESSO/RentCast",
    }

    if is_owner_occupied is True:
        owner_occupied_indicator["detected"] = True
        owner_occupied_indicator["score"] = 20  # Low score = less motivated
        owner_occupied_indicator["signal_strength"] = "low"
        owner_occupied_indicator["description"] = "Owner-occupied - Emotional pricing likely, harder negotiation"

    indicators.append(owner_occupied_indicator)

    # ========================================
    # BONUS: Zillow Selling Soon Percentile
    # ========================================
    if selling_soon_percentile is not None:
        selling_soon_indicator = {
            "name": "Selling Soon Prediction",
            "detected": True,
            "score": int(selling_soon_percentile),
            "signal_strength": "high"
            if selling_soon_percentile >= 70
            else "medium"
            if selling_soon_percentile >= 40
            else "low",
            "weight": 2.0,
            "description": f"Zillow predicts {selling_soon_percentile:.0f}% likelihood to sell soon",
            "raw_value": selling_soon_percentile,
            "source": "AXESSO",
        }
        indicators.append(selling_soon_indicator)

    # ========================================
    # CALCULATE COMPOSITE SCORE
    # ========================================

    # Only include detected indicators in weighted average
    detected_indicators = [i for i in indicators if i["detected"]]

    if detected_indicators:
        total_weight = sum(i["weight"] for i in detected_indicators)
        weighted_sum = sum(i["score"] * i["weight"] for i in detected_indicators)
        base_score = round(weighted_sum / total_weight) if total_weight > 0 else 0
    else:
        base_score = 25  # Default low score if no indicators detected

    # ========================================
    # APPLY MARKET TEMPERATURE MODIFIER
    # ========================================
    # Cold market (buyer's market) = sellers more motivated = +15
    # Warm market (balanced) = no adjustment = +0
    # Hot market (seller's market) = sellers less motivated = -15
    market_modifier = 0
    if market_temperature:
        temp_lower = market_temperature.lower()
        if temp_lower == "cold":
            market_modifier = 15
        elif temp_lower == "hot":
            market_modifier = -15
        # warm = 0 (no change)

    composite_score = min(100, max(0, base_score + market_modifier))

    # Count high-signal indicators
    high_signals = sum(1 for i in detected_indicators if i["signal_strength"] == "high")

    # Determine grade
    if composite_score >= 80:
        grade = "A+"
        label = "Very High Motivation"
        color = "#22c55e"
    elif composite_score >= 65:
        grade = "A"
        label = "High Motivation"
        color = "#22c55e"
    elif composite_score >= 50:
        grade = "B"
        label = "Moderate Motivation"
        color = "#84cc16"
    elif composite_score >= 35:
        grade = "C"
        label = "Low Motivation"
        color = "#f97316"
    elif composite_score >= 20:
        grade = "D"
        label = "Very Low Motivation"
        color = "#f97316"
    else:
        grade = "F"
        label = "Minimal Motivation"
        color = "#ef4444"

    # Determine negotiation leverage and max achievable discount
    # Based on motivation score, map to realistic discount ranges
    if composite_score >= 85:
        leverage = "high"
        discount_range = "15-25%"
        max_achievable_discount = 0.25
    elif composite_score >= 70:
        leverage = "high"
        discount_range = "10-15%"
        max_achievable_discount = 0.18
    elif composite_score >= 50:
        leverage = "medium"
        discount_range = "5-10%"
        max_achievable_discount = 0.12
    elif composite_score >= 30:
        leverage = "low"
        discount_range = "2-5%"
        max_achievable_discount = 0.07
    else:
        leverage = "minimal"
        discount_range = "0-3%"
        max_achievable_discount = 0.04

    # Extract key leverage points (top 3 detected indicators by score)
    sorted_detected = sorted(detected_indicators, key=lambda x: x["score"], reverse=True)
    key_leverage_points = [i["description"] for i in sorted_detected[:3] if i["score"] >= 50]

    # Calculate data completeness
    total_indicator_count = len(indicators)
    indicators_with_data = sum(1 for i in indicators if i["raw_value"] is not None or i["detected"])
    data_completeness = (indicators_with_data / total_indicator_count) * 100 if total_indicator_count > 0 else 0

    return {
        "score": composite_score,
        "base_score": base_score,
        "market_modifier": market_modifier,
        "grade": grade,
        "label": label,
        "color": color,
        "indicators": indicators,
        "high_signals_count": high_signals,
        "total_signals_detected": len(detected_indicators),
        "negotiation_leverage": leverage,
        "recommended_discount_range": discount_range,
        "max_achievable_discount": max_achievable_discount,
        "key_leverage_points": key_leverage_points,
        "dom_vs_market_avg": (days_on_market / market_median_dom) if days_on_market and market_median_dom else None,
        "market_temperature": market_temperature,
        "data_completeness": round(data_completeness, 1),
        "calculated_at": datetime.now(UTC).isoformat(),
    }


def extract_condition_keywords(description: str | None) -> list[str]:
    """
    Extract keywords from property description that indicate poor condition.

    These keywords suggest the property needs work and may have a limited
    buyer pool, giving investors negotiation leverage.
    """
    if not description:
        return []

    # Normalize text
    text = description.lower()

    # Keywords indicating property needs work (investor opportunities)
    condition_keywords = [
        "as-is",
        "as is",
        "sold as-is",
        "sold as is",
        "fixer",
        "fixer-upper",
        "fixer upper",
        "handyman",
        "tlc",
        "needs tlc",
        "needs work",
        "needs updating",
        "investor special",
        "investor opportunity",
        "investor",
        "cash only",
        "cash buyers",
        "cash buyer",
        "estate sale",
        "estate",
        "probate",
        "motivated seller",
        "motivated",
        "must sell",
        "bring your contractor",
        "bring contractor",
        "cosmetic",
        "needs cosmetic",
        "deferred maintenance",
        "maintenance needed",
        "priced to sell",
        "price to sell",
        "diamond in the rough",
        "potential",
        "foreclosure",
        "bank owned",
        "reo",
        "vacant",
        "unoccupied",
    ]

    found_keywords = []
    for keyword in condition_keywords:
        if keyword in text:
            # Avoid duplicates (e.g., "as-is" and "as is")
            normalized = keyword.replace("-", " ").strip()
            if normalized not in [k.replace("-", " ") for k in found_keywords]:
                found_keywords.append(keyword)

    return found_keywords
