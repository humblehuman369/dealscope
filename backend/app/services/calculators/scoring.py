"""Deal scoring — IQ Verdict, Deal Gap, and availability ranking."""

from typing import Any

"""
Deal Opportunity Score - Investment Price Indicator

The Deal Opportunity Score considers multiple factors to determine
how attractive a property is as an investment opportunity:

1. Deal Gap (50% weight) - ((List Price - Breakeven Price) / List Price) x 100
   - Breakeven is calculated from LTR strategy (market rent less property costs)
   - This is the primary factor as it indicates how much discount is needed

2. Availability Ranking (30% weight) - Based on listing status and motivation:
   - Withdrawn (best) - Seller motivation may be high
   - For Sale - Price Reduced 2+ Times - Seller showing flexibility
   - For Sale - Bank Owned/REO - Banks want to move properties
   - For Sale - FSBO/Individual - More negotiation room
   - For Sale - Agent Listed - Standard listing
   - Off-Market - May find motivated sellers
   - For Rent - Landlord may consider selling
   - Pending - Under Contract - Unlikely to get
   - Sold (Recently) - Not available

3. Days on Market (20% weight) - Combined with Deal Gap:
   - High Deal Gap + High DOM = More negotiation leverage
   - High Deal Gap + Low DOM = Opportunity not yet recognized
   - Low Deal Gap + High DOM = Price may already be fair

Note: Equity % is excluded as mortgage balance data is not available
from the Axesso API. This would require public records data.

Note: BRRRR, Fix & Flip, and Wholesale strategies require physical
inspection for repair estimates. The Deal Score is based on LTR
breakeven since it can be calculated from available market data.
"""


# Availability status rankings (lower = better opportunity)
AVAILABILITY_RANKINGS = {
    "WITHDRAWN": {"rank": 1, "score": 100, "label": "Withdrawn - High Motivation", "motivation": "high"},
    "PRICE_REDUCED": {"rank": 2, "score": 90, "label": "Price Reduced", "motivation": "high"},
    "AUCTION": {"rank": 3, "score": 85, "label": "Auction - Motivated Sale", "motivation": "high"},
    "BANK_OWNED": {"rank": 4, "score": 80, "label": "Bank Owned (REO)", "motivation": "high"},
    "FORECLOSURE": {"rank": 4, "score": 80, "label": "Foreclosure", "motivation": "high"},
    "FSBO": {"rank": 5, "score": 70, "label": "For Sale By Owner", "motivation": "medium"},
    "FOR_SALE": {"rank": 6, "score": 60, "label": "For Sale - Agent Listed", "motivation": "medium"},
    "OFF_MARKET": {"rank": 7, "score": 50, "label": "Off-Market", "motivation": "low"},
    "FOR_RENT": {"rank": 8, "score": 40, "label": "For Rent", "motivation": "low"},
    "PENDING": {"rank": 9, "score": 20, "label": "Pending - Under Contract", "motivation": "low"},
    "SOLD": {"rank": 10, "score": 10, "label": "Recently Sold", "motivation": "low"},
    "UNKNOWN": {"rank": 7, "score": 50, "label": "Unknown Status", "motivation": "low"},
}


def get_availability_ranking(
    listing_status: str | None = None,
    seller_type: str | None = None,
    is_foreclosure: bool = False,
    is_bank_owned: bool = False,
    is_fsbo: bool = False,
    is_auction: bool = False,
    price_reductions: int = 0,
) -> dict[str, Any]:
    """
    Get availability ranking based on listing status and seller type.

    Returns dict with: status, rank, score, label, motivation_level
    """
    status = (listing_status or "").upper()
    seller = (seller_type or "").upper()

    # Check for withdrawn
    if "WITHDRAWN" in status:
        ranking = AVAILABILITY_RANKINGS["WITHDRAWN"]
        return {"status": "WITHDRAWN", **ranking}

    # Check for price reductions (2+ times = motivated)
    if ("FOR_SALE" in status or "SALE" in status) and price_reductions and price_reductions >= 2:
        ranking = AVAILABILITY_RANKINGS["PRICE_REDUCED"]
        return {
            "status": "PRICE_REDUCED",
            "rank": ranking["rank"],
            "score": ranking["score"],
            "label": f"Price Reduced {price_reductions}x",
            "motivation": ranking["motivation"],
        }

    # Check for auction (highly motivated - must sell)
    if is_auction or "AUCTION" in status or "AUCTION" in seller:
        ranking = AVAILABILITY_RANKINGS["AUCTION"]
        return {"status": "AUCTION", **ranking}

    # Check for bank owned / foreclosure
    if is_bank_owned or "BANK" in seller:
        ranking = AVAILABILITY_RANKINGS["BANK_OWNED"]
        return {"status": "BANK_OWNED", **ranking}

    if is_foreclosure or "FORECLOSURE" in seller:
        ranking = AVAILABILITY_RANKINGS["FORECLOSURE"]
        return {"status": "FORECLOSURE", **ranking}

    # Check for FSBO
    if is_fsbo or "FSBO" in seller or "OWNER" in seller:
        ranking = AVAILABILITY_RANKINGS["FSBO"]
        return {"status": "FSBO", **ranking}

    # Check for standard for sale
    if "FOR_SALE" in status or "SALE" in status:
        ranking = AVAILABILITY_RANKINGS["FOR_SALE"]
        return {"status": "FOR_SALE", **ranking}

    # Check for off-market
    if "OFF_MARKET" in status or "OFF" in status:
        ranking = AVAILABILITY_RANKINGS["OFF_MARKET"]
        return {"status": "OFF_MARKET", **ranking}

    # Check for rent
    if "FOR_RENT" in status or "RENT" in status:
        ranking = AVAILABILITY_RANKINGS["FOR_RENT"]
        return {"status": "FOR_RENT", **ranking}

    # Check for pending
    if "PENDING" in status or "CONTRACT" in status:
        ranking = AVAILABILITY_RANKINGS["PENDING"]
        return {"status": "PENDING", **ranking}

    # Check for sold
    if "SOLD" in status:
        ranking = AVAILABILITY_RANKINGS["SOLD"]
        return {"status": "SOLD", **ranking}

    # Unknown
    ranking = AVAILABILITY_RANKINGS["UNKNOWN"]
    return {"status": "UNKNOWN", **ranking}


def calculate_dom_score(
    days_on_market: int | None,
    deal_gap_percent: float,
) -> dict[str, Any]:
    """
    Calculate Days on Market score with Deal Gap context.

    The relationship between DOM and Deal Gap:
    - High Deal Gap + High DOM = Strong negotiation leverage
    - High Deal Gap + Low DOM = Opportunity not yet recognized
    - Low Deal Gap + High DOM = Price may already be fair
    - Low Deal Gap + Low DOM = Hot property, move fast
    """
    if days_on_market is None:
        return {"days": None, "score": 50, "leverage": "unknown"}

    days = days_on_market

    # DOM thresholds (in days)
    LOW_DOM = 30
    MEDIUM_DOM = 60
    HIGH_DOM = 120

    # Deal Gap thresholds (in %)
    LOW_GAP = 10
    HIGH_GAP = 25

    if deal_gap_percent >= HIGH_GAP:
        # High Deal Gap - DOM increases leverage
        if days >= HIGH_DOM:
            return {"days": days, "score": 100, "leverage": "high"}
        elif days >= MEDIUM_DOM:
            return {"days": days, "score": 85, "leverage": "high"}
        elif days >= LOW_DOM:
            return {"days": days, "score": 70, "leverage": "medium"}
        else:
            return {"days": days, "score": 60, "leverage": "medium"}
    elif deal_gap_percent >= LOW_GAP:
        # Medium Deal Gap
        if days >= HIGH_DOM:
            return {"days": days, "score": 70, "leverage": "medium"}
        elif days >= MEDIUM_DOM:
            return {"days": days, "score": 60, "leverage": "medium"}
        elif days >= LOW_DOM:
            return {"days": days, "score": 50, "leverage": "medium"}
        else:
            return {"days": days, "score": 45, "leverage": "low"}
    else:
        # Low Deal Gap - already close to fair price
        if days >= HIGH_DOM:
            return {"days": days, "score": 50, "leverage": "low"}
        elif days >= MEDIUM_DOM:
            return {"days": days, "score": 40, "leverage": "low"}
        else:
            return {"days": days, "score": 30, "leverage": "low"}


def calculate_deal_gap_score(
    income_value: float,
    list_price: float,
) -> dict[str, Any]:
    """
    Calculate the Deal Gap score from income value and list price.

    Deal Gap = ((List Price - Income Value) / List Price) x 100
    """
    if list_price <= 0:
        return {"income_value": income_value, "list_price": list_price, "gap_amount": 0, "gap_percent": 0, "score": 0}

    gap_amount = list_price - income_value
    gap_percent = max(0, (gap_amount / list_price) * 100)

    # Score is inverse of gap (lower gap = higher score)
    # 0% gap = 100 score, 45%+ gap = 0 score
    score = max(0, min(100, round(100 - (gap_percent * 100 / 45))))

    return {
        "income_value": income_value,
        "list_price": list_price,
        "gap_amount": gap_amount,
        "gap_percent": gap_percent,
        "score": score,
    }


def calculate_deal_opportunity_score(
    income_value: float,
    list_price: float,
    listing_status: str | None = None,
    seller_type: str | None = None,
    is_foreclosure: bool = False,
    is_bank_owned: bool = False,
    is_fsbo: bool = False,
    is_auction: bool = False,
    price_reductions: int = 0,
    days_on_market: int | None = None,
    market_temperature: str | None = None,
) -> dict[str, Any]:
    """
    Calculate IQ Verdict Score (Deal Opportunity Score).

    The score answers: "How likely can you negotiate the required discount?"

    Formula:
    1. Deal Gap % = (List Price - Income Value) / List Price (required discount)
    2. Motivation = Seller signals + Market condition modifier
    3. IQ Score = Probability of achieving Deal Gap given Motivation

    Args:
        income_value: LTR income value (from market rent less costs)
        list_price: Current list price (or estimated value if off-market)
        listing_status: Property listing status (FOR_SALE, OFF_MARKET, etc.)
        seller_type: Type of seller (Agent, FSBO, BankOwned, etc.)
        is_foreclosure: Whether property is a foreclosure
        is_bank_owned: Whether property is bank-owned/REO
        is_fsbo: Whether property is for sale by owner
        is_auction: Whether property is an auction listing
        price_reductions: Number of price reductions
        days_on_market: Days the property has been listed
        market_temperature: Market condition (hot, warm, cold) from AXESSO

    Returns:
        Dict with score, grade, label, color, deal_gap, motivation details
    """
    # ========================================
    # STEP 1: Calculate Deal Gap %
    # ========================================
    deal_gap_info = calculate_deal_gap_score(income_value, list_price)
    deal_gap_pct = deal_gap_info["gap_percent"]  # This is the required discount %

    # ========================================
    # STEP 2: Calculate Motivation Score
    # ========================================
    # Get base motivation from availability/seller signals
    availability = get_availability_ranking(
        listing_status=listing_status,
        seller_type=seller_type,
        is_foreclosure=is_foreclosure,
        is_bank_owned=is_bank_owned,
        is_fsbo=is_fsbo,
        is_auction=is_auction,
        price_reductions=price_reductions,
    )
    base_motivation = availability["score"]

    # Add DOM bonus (longer = more motivated)
    dom_bonus = 0
    if days_on_market is not None:
        if days_on_market >= 180:
            dom_bonus = 20
        elif days_on_market >= 120:
            dom_bonus = 15
        elif days_on_market >= 90:
            dom_bonus = 10
        elif days_on_market >= 60:
            dom_bonus = 5

    # Apply market temperature modifier
    # Cold (buyer's market) = sellers more motivated = +15
    # Hot (seller's market) = sellers less motivated = -15
    market_modifier = 0
    if market_temperature:
        temp_lower = market_temperature.lower()
        if temp_lower == "cold":
            market_modifier = 15
        elif temp_lower == "hot":
            market_modifier = -15

    motivation_score = min(100, max(0, base_motivation + dom_bonus + market_modifier))

    # ========================================
    # STEP 3: Map Motivation to Max Achievable Discount
    # ========================================
    # Higher motivation = larger discount possible
    # Formula: max_achievable = (motivation / 100) * 0.25 (0-25% range)
    max_achievable_discount = (motivation_score / 100) * 0.25

    # ========================================
    # STEP 4: Calculate IQ Verdict Score (Probability)
    # ========================================
    # Score reflects how achievable the required Deal Gap is
    deal_gap_decimal = deal_gap_pct / 100  # Convert to decimal

    if deal_gap_decimal <= 0:
        # No discount needed - good deal at asking price, but never 100 (no guarantees)
        iq_score = 90
    elif max_achievable_discount <= 0:
        # No negotiation power
        iq_score = max(0, 30 - deal_gap_pct * 2)
    elif deal_gap_decimal <= max_achievable_discount * 0.6:
        # Deal gap within comfortable range (90-100)
        ratio = deal_gap_decimal / (max_achievable_discount * 0.6)
        iq_score = round(90 + (1 - ratio) * 10)
    elif deal_gap_decimal <= max_achievable_discount:
        # Deal gap within achievable range (70-90)
        ratio = (deal_gap_decimal - max_achievable_discount * 0.6) / (max_achievable_discount * 0.4)
        iq_score = round(70 + (1 - ratio) * 20)
    elif deal_gap_decimal <= max_achievable_discount * 1.5:
        # Deal gap is a stretch but possible (40-70)
        ratio = (deal_gap_decimal - max_achievable_discount) / (max_achievable_discount * 0.5)
        iq_score = round(40 + (1 - ratio) * 30)
    else:
        # Deal gap is unlikely (0-40)
        excess = deal_gap_decimal - max_achievable_discount * 1.5
        iq_score = max(0, round(40 - excess * 200))  # Steep drop-off

    # Ensure score is in valid range (capped at 90 — no deal is guaranteed)
    iq_score = min(90, max(0, iq_score))

    # ========================================
    # STEP 5: Determine Grade and Label
    # ========================================
    if iq_score >= 90:
        grade = "A+"
        label = "Strong Buy"
        color = "#22c55e"  # green-500
    elif iq_score >= 80:
        grade = "A"
        label = "Good Buy"
        color = "#22c55e"  # green-500
    elif iq_score >= 65:
        grade = "B"
        label = "Moderate"
        color = "#84cc16"  # lime-500
    elif iq_score >= 50:
        grade = "C"
        label = "Stretch"
        color = "#f97316"  # orange-500
    elif iq_score >= 30:
        grade = "D"
        label = "Unlikely"
        color = "#f97316"  # orange-500
    else:
        grade = "F"
        label = "Pass"
        color = "#ef4444"  # red-500

    # Motivation label
    if motivation_score >= 80:
        motivation_label = "Very High"
    elif motivation_score >= 60:
        motivation_label = "High"
    elif motivation_score >= 40:
        motivation_label = "Medium"
    elif motivation_score >= 20:
        motivation_label = "Low"
    else:
        motivation_label = "Very Low"

    return {
        "score": iq_score,
        "grade": grade,
        "label": label,
        "color": color,
        # Deal Gap details (the required discount)
        "deal_gap_percent": deal_gap_pct,
        "deal_gap_amount": deal_gap_info["gap_amount"],
        "income_value": income_value,
        "list_price": list_price,
        # Motivation details
        "motivation": {
            "score": motivation_score,
            "label": motivation_label,
            "base_score": base_motivation,
            "dom_bonus": dom_bonus,
            "market_modifier": market_modifier,
            "market_temperature": market_temperature,
            "availability_status": availability["status"],
            "availability_label": availability["label"],
        },
        # Achievability
        "max_achievable_discount": round(max_achievable_discount * 100, 1),  # as %
        "probability_interpretation": label,
        # Legacy compatibility
        "factors": {
            "deal_gap": deal_gap_info,
            "availability": availability,
            "days_on_market": {"days": days_on_market, "bonus": dom_bonus},
        },
        "discount_percent": deal_gap_pct,
    }
