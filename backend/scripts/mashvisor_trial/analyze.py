#!/usr/bin/env python3
"""
Mashvisor Trial Data Analysis
==============================
Analyzes the raw JSON responses from the trial pull and produces
a structured report comparing Mashvisor's data to DealGapIQ's current stack.
"""

import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean, median

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "mashvisor_trial"


def load_category(category: str) -> dict[str, dict]:
    """Load all JSON files from a category directory."""
    cat_dir = DATA_DIR / category
    if not cat_dir.exists():
        return {}
    results = {}
    for f in sorted(cat_dir.glob("*.json")):
        with open(f) as fh:
            results[f.stem] = json.load(fh)
    return results


def analyze_str():
    """Analyze STR (Short-Term Rental) data."""
    files = load_category("str")
    print("\n" + "=" * 70)
    print("A. SHORT-TERM RENTAL (STR) ANALYTICS")
    print("=" * 70)

    lookups = {k: v for k, v in files.items() if "_lookup_" in k}
    comps = {k: v for k, v in files.items() if "_comps_" in k}
    historical = {k: v for k, v in files.items() if "_historical_" in k}
    prop_types = {k: v for k, v in files.items() if "_property_types" in k}
    nearby = {k: v for k, v in files.items() if "_nearby" in k}

    print(f"\n  Files: {len(lookups)} lookups, {len(comps)} comps, "
          f"{len(historical)} historical, {len(prop_types)} property types, {len(nearby)} nearby")

    success_lookups = {k: v for k, v in lookups.items()
                       if v.get("status") == "success" and isinstance(v.get("content"), dict)}
    print(f"  Successful lookups: {len(success_lookups)}/{len(lookups)} ({len(success_lookups)/max(len(lookups),1)*100:.0f}%)")

    occupancies = []
    adrs = []
    sample_sizes = []
    fallback_count = 0
    low_sample_count = 0
    negative_cf_count = 0

    for k, v in success_lookups.items():
        c = v["content"]
        occ = c.get("median_occupancy_rate")
        adr = c.get("median_night_rate")
        ss = c.get("sample_size")
        fb = c.get("city_insights_fallback", False)
        cf = c.get("cash_flow")

        if occ is not None:
            occupancies.append(occ)
        if adr is not None:
            adrs.append(adr)
        if ss is not None:
            sample_sizes.append(ss)
        if fb:
            fallback_count += 1
        if ss is not None and ss < 30:
            low_sample_count += 1
        if cf is not None and cf < 0:
            negative_cf_count += 1

    print(f"\n  --- Occupancy Rate ---")
    if occupancies:
        print(f"  Mashvisor median occupancy: {median(occupancies):.1f}%")
        print(f"  Mashvisor mean occupancy:   {mean(occupancies):.1f}%")
        print(f"  Mashvisor range:            {min(occupancies):.0f}% - {max(occupancies):.0f}%")
        print(f"  DealGapIQ hardcoded default: 65%")
        below_65 = sum(1 for o in occupancies if o < 65)
        print(f"  Addresses where Mashvisor < 65%: {below_65}/{len(occupancies)} ({below_65/len(occupancies)*100:.0f}%)")
        print(f"  >>> VERDICT: {'Mashvisor shows MUCH LOWER occupancy than default' if below_65/len(occupancies) > 0.6 else 'Mixed results'}")

    print(f"\n  --- Average Daily Rate (ADR) ---")
    if adrs:
        print(f"  Mashvisor median ADR: ${median(adrs):.0f}")
        print(f"  Mashvisor mean ADR:   ${mean(adrs):.0f}")
        print(f"  Mashvisor range:      ${min(adrs):.0f} - ${max(adrs):.0f}")
        print(f"  DealGapIQ fallback:   $200 flat")

    print(f"\n  --- Data Confidence ---")
    if sample_sizes:
        print(f"  Median sample size:     {median(sample_sizes):.0f} comps")
        print(f"  Mean sample size:       {mean(sample_sizes):.0f} comps")
        print(f"  Range:                  {min(sample_sizes)} - {max(sample_sizes)}")
        print(f"  Low sample (<30):       {low_sample_count}/{len(sample_sizes)} ({low_sample_count/len(sample_sizes)*100:.0f}%)")
    print(f"  City-level fallback:    {fallback_count}/{len(success_lookups)} ({fallback_count/max(len(success_lookups),1)*100:.0f}%)")
    print(f"  Negative cash flow:     {negative_cf_count}/{len(success_lookups)} ({negative_cf_count/max(len(success_lookups),1)*100:.0f}%)")

    success_hist = {k: v for k, v in historical.items()
                    if v.get("status") == "success" and isinstance(v.get("content"), dict)}
    print(f"\n  --- Seasonality (Historical Performance) ---")
    print(f"  Successful historical: {len(success_hist)}/{len(historical)}")
    yoy_occ_changes = []
    yoy_income_changes = []
    for k, v in success_hist.items():
        c = v["content"]
        if c.get("occupancy_yoy_changes") is not None:
            yoy_occ_changes.append(c["occupancy_yoy_changes"])
        if c.get("rental_income_yoy_changes") is not None:
            yoy_income_changes.append(c["rental_income_yoy_changes"])
    if yoy_occ_changes:
        print(f"  Occupancy YoY change (median): {median(yoy_occ_changes):.1f}%")
        declining = sum(1 for y in yoy_occ_changes if y < 0)
        print(f"  Markets with declining occupancy: {declining}/{len(yoy_occ_changes)} ({declining/len(yoy_occ_changes)*100:.0f}%)")
    if yoy_income_changes:
        print(f"  Income YoY change (median):    {median(yoy_income_changes):.1f}%")

    success_comps = {k: v for k, v in comps.items()
                     if v.get("status") == "success"}
    print(f"\n  --- STR Comps ---")
    print(f"  Successful comp pulls: {len(success_comps)}/{len(comps)}")
    comp_counts = []
    for k, v in success_comps.items():
        content = v.get("content", {})
        listings = content.get("results", []) if isinstance(content, dict) else content
        if isinstance(listings, list):
            comp_counts.append(len(listings))
    if comp_counts:
        print(f"  Median comps returned: {median(comp_counts):.0f}")
        print(f"  Range:                 {min(comp_counts)} - {max(comp_counts)}")

    print(f"\n  NET-NEW VALUE: HIGH")
    print(f"  - Replaces hardcoded occupancy=0.65 and ADR=$200")
    print(f"  - Adds seasonality, comps, YoY trends")
    print(f"  - Confidence signals (sample_size, fallback flag)")


def analyze_regulations():
    """Analyze STR regulatory data."""
    files = load_category("regulatory")
    print("\n" + "=" * 70)
    print("B. STR REGULATIONS")
    print("=" * 70)

    success = {k: v for k, v in files.items() if v.get("status") == "success"}
    failed = {k: v for k, v in files.items() if v.get("status") != "success"}

    print(f"\n  Total cities tested: {len(files)}")
    print(f"  Successful:          {len(success)} ({len(success)/max(len(files),1)*100:.0f}%)")
    print(f"  No data:             {len(failed)}")

    ratings = Counter()
    for k, v in success.items():
        content = v.get("content", {})
        regs = content.get("list", [])
        if isinstance(regs, list):
            for reg in regs:
                if isinstance(reg, dict):
                    ratings[reg.get("rating", "Unknown")] += 1

    if ratings:
        print(f"\n  Rating distribution:")
        for rating, count in ratings.most_common():
            print(f"    {rating}: {count}")

    print(f"\n  Cities with NO regulatory data: {', '.join(sorted(failed.keys()))}")
    print(f"\n  NET-NEW VALUE: HIGH")
    print(f"  - DealGapIQ has ZERO regulatory awareness today")
    print(f"  - {len(success)/max(len(files),1)*100:.0f}% coverage across tested cities")


def analyze_ltr():
    """Analyze LTR (Long-Term Rental) data."""
    files = load_category("ltr")
    print("\n" + "=" * 70)
    print("C. LONG-TERM RENTAL (LTR) ANALYTICS")
    print("=" * 70)

    lookups = {k: v for k, v in files.items() if "_lookup" in k}
    rates = {k: v for k, v in files.items() if "_rates_" in k}

    success_lookups = {k: v for k, v in lookups.items()
                       if v.get("status") == "success" and isinstance(v.get("content"), dict)}

    print(f"\n  Lookup files: {len(lookups)} (success: {len(success_lookups)})")
    print(f"  Rates files:  {len(rates)}")

    rents = []
    for k, v in success_lookups.items():
        c = v["content"]
        rent = c.get("median_rental_income")
        if rent:
            rents.append(rent)

    if rents:
        print(f"\n  --- Traditional Rent Estimates ---")
        print(f"  Mashvisor median rent: ${median(rents):.0f}/mo")
        print(f"  Mashvisor mean rent:   ${mean(rents):.0f}/mo")
        print(f"  Range:                 ${min(rents):.0f} - ${max(rents):.0f}")

    trad_rates = {k: v for k, v in rates.items()
                  if "_traditional" in k and v.get("status") == "success"}
    airbnb_rates = {k: v for k, v in rates.items()
                    if "_airbnb" in k and v.get("status") == "success"}

    print(f"\n  --- Rental Rates by Source ---")
    print(f"  Traditional rates (successful): {len(trad_rates)}")
    print(f"  Airbnb rates (successful):      {len(airbnb_rates)}")

    print(f"\n  NET-NEW VALUE: LOW")
    print(f"  - DealGapIQ already blends rent from 4 sources")
    print(f"  - Mashvisor as 5th source = marginal accuracy lift")
    print(f"  - Arbitrage comparison (airbnb vs traditional rates by bedroom) is interesting but niche")


def analyze_property():
    """Analyze property-level data."""
    files = load_category("property")
    print("\n" + "=" * 70)
    print("D. PROPERTY DATA (attributes, tax, sales, AVM, comps)")
    print("=" * 70)

    info = {k: v for k, v in files.items() if "_info" in k}
    investment = {k: v for k, v in files.items() if "_investment" in k}
    taxes = {k: v for k, v in files.items() if "_taxes" in k}
    transactions = {k: v for k, v in files.items() if "_transactions" in k}
    estimates = {k: v for k, v in files.items() if "_estimates" in k}
    nearby = {k: v for k, v in files.items() if "_nearby" in k}

    success_info = {k: v for k, v in info.items()
                    if v.get("status") == "success" and v.get("content")}
    success_inv = {k: v for k, v in investment.items()
                   if v.get("status") == "success" and v.get("content")}
    success_nearby = {k: v for k, v in nearby.items()
                      if v.get("status") == "success" and v.get("content")}

    print(f"\n  Property lookups: {len(info)} (matched: {len(success_info)}, {len(success_info)/max(len(info),1)*100:.0f}%)")
    print(f"  Investment:       {len(investment)} (success: {len(success_inv)})")
    print(f"  Taxes:            {len(taxes)}")
    print(f"  Transactions:     {len(transactions)}")
    print(f"  Estimates (AVM):  {len(estimates)}")
    print(f"  Nearby (comps):   {len(nearby)} (success: {len(success_nearby)})")

    if success_info:
        fields_present = Counter()
        for k, v in success_info.items():
            c = v.get("content", {})
            if isinstance(c, dict):
                for field in ["beds", "baths", "sqft", "year_built", "lot_size",
                              "property_type", "list_price", "tax_amount", "hoa_dues",
                              "mls_id", "owner_name", "last_sale_price", "last_sale_date"]:
                    if c.get(field) is not None:
                        fields_present[field] += 1
        if fields_present:
            print(f"\n  Fields populated across {len(success_info)} matched properties:")
            for field, count in fields_present.most_common():
                print(f"    {field}: {count}/{len(success_info)} ({count/len(success_info)*100:.0f}%)")

    nearby_counts = []
    for k, v in success_nearby.items():
        content = v.get("content", {})
        results = content.get("results", []) if isinstance(content, dict) else content
        if isinstance(results, list):
            nearby_counts.append(len(results))
    if nearby_counts:
        print(f"\n  --- Nearby Comps (for ARV) ---")
        print(f"  Median nearby props: {median(nearby_counts):.0f}")
        print(f"  Range:               {min(nearby_counts)} - {max(nearby_counts)}")

    print(f"\n  NET-NEW VALUE: LOW for attributes/tax/AVM (redundant)")
    print(f"  MEDIUM for /property/nearby (comp-based ARV replacement)")


def analyze_owner():
    """Analyze owner data."""
    files = load_category("owner")
    print("\n" + "=" * 70)
    print("E. OWNER / SKIP-TRACE DATA")
    print("=" * 70)

    contact = {k: v for k, v in files.items() if "_contact" in k}
    demographics = {k: v for k, v in files.items() if "_demographics" in k}
    lifeint = {k: v for k, v in files.items() if "_lifeint" in k}
    finhouse = {k: v for k, v in files.items() if "_finhouse" in k}

    print(f"\n  Total owner files: {len(files)}")
    print(f"  Contact:      {len(contact)}")
    print(f"  Demographics: {len(demographics)}")
    print(f"  Lifestyle:    {len(lifeint)}")
    print(f"  Financials:   {len(finhouse)}")

    success_contact = {k: v for k, v in contact.items()
                       if v.get("status") == "success" and v.get("content")}
    print(f"\n  Successful contacts: {len(success_contact)}/{len(contact)}")

    if success_contact:
        fields = Counter()
        for k, v in success_contact.items():
            c = v.get("content", {})
            if isinstance(c, dict):
                for field in ["first_name", "last_name", "phone", "email",
                              "mailing_address", "owner_type"]:
                    if c.get(field):
                        fields[field] += 1
        if fields:
            print(f"  Fields populated:")
            for field, count in fields.most_common():
                print(f"    {field}: {count}/{len(success_contact)}")

    for cat_name, cat_data in [("demographics", demographics),
                                ("lifestyle", lifeint), ("financials", finhouse)]:
        success = {k: v for k, v in cat_data.items()
                   if v.get("status") == "success" and v.get("content")}
        print(f"\n  {cat_name.title()} success: {len(success)}/{len(cat_data)}")
        if success:
            sample = list(success.values())[0]
            content = sample.get("content", {})
            if isinstance(content, dict):
                print(f"    Sample fields: {list(content.keys())[:10]}")

    print(f"\n  NET-NEW VALUE: MEDIUM-HIGH for motivated-seller detection")
    print(f"  - Owner type (LLC vs individual), tenure, out-of-state status")
    print(f"  - Enriches existing seller_motivation scoring in iq_verdict_service.py")


def analyze_neighborhood():
    """Analyze neighborhood/market data."""
    files = load_category("neighborhood")
    print("\n" + "=" * 70)
    print("F. NEIGHBORHOOD / MARKET ANALYTICS")
    print("=" * 70)

    city_inv = {k: v for k, v in files.items() if "_city_investment" in k}
    top_markets = {k: v for k, v in files.items() if "_top_markets" in k}
    neighborhoods = {k: v for k, v in files.items() if "_neighborhoods" in k and "_overview" not in k and "_airbnb" not in k}
    overviews = {k: v for k, v in files.items() if "_overview_" in k}
    airbnb_details = {k: v for k, v in files.items() if "_airbnb_" in k}
    trends = {k: v for k, v in files.items() if "trends_" in k}

    print(f"\n  City investment:   {len(city_inv)}")
    print(f"  Top markets:       {len(top_markets)}")
    print(f"  Neighborhoods:     {len(neighborhoods)}")
    print(f"  Overviews:         {len(overviews)}")
    print(f"  Airbnb details:    {len(airbnb_details)}")
    print(f"  Trends:            {len(trends)}")

    success_city = {k: v for k, v in city_inv.items()
                    if v.get("status") == "success" and isinstance(v.get("content"), dict)}
    print(f"\n  City investment success: {len(success_city)}/{len(city_inv)}")

    if success_city:
        sample = list(success_city.values())[0]
        content = sample.get("content", {})
        print(f"  Sample fields: {list(content.keys())[:15]}")

        cap_rates_airbnb = []
        cap_rates_trad = []
        for k, v in success_city.items():
            c = v["content"]
            if c.get("airbnb_cap_rate"):
                cap_rates_airbnb.append(c["airbnb_cap_rate"])
            if c.get("traditional_cap_rate"):
                cap_rates_trad.append(c["traditional_cap_rate"])

        if cap_rates_airbnb:
            print(f"\n  --- Market Cap Rates ---")
            print(f"  Airbnb cap rate (median):      {median(cap_rates_airbnb):.2f}%")
            print(f"  Traditional cap rate (median):  {median(cap_rates_trad):.2f}%" if cap_rates_trad else "")
            print(f"  Range (Airbnb):                {min(cap_rates_airbnb):.2f}% - {max(cap_rates_airbnb):.2f}%")

    print(f"\n  NET-NEW VALUE: MEDIUM-HIGH (requires new UI surface)")
    print(f"  - City-level cap rates, optimal strategy, rental rate benchmarks")
    print(f"  - No equivalent in DealGapIQ today")
    print(f"  - Powers a 'Market IQ' product surface")


def summary():
    """Print executive summary."""
    print("\n" + "=" * 70)
    print("EXECUTIVE SUMMARY")
    print("=" * 70)
    print("""
  Category                    | Net-New Value | Coverage | Recommendation
  ----------------------------|---------------|----------|----------------
  A. STR analytics            | HIGH          | See above| INTEGRATE (Phase 1)
  B. STR regulations          | HIGH          | See above| INTEGRATE (Phase 1)
  C. LTR analytics            | LOW           | Good     | SKIP (redundant)
  D. Property data            | LOW-MEDIUM    | Partial  | CHERRY-PICK (/nearby only)
  E. Owner data               | MEDIUM-HIGH   | Partial  | INTEGRATE (Phase 2)
  F. Neighborhood/market      | MEDIUM-HIGH   | Good     | INTEGRATE (Phase 3)

  SUBSCRIPTION RECOMMENDATION: YES — subscribe at entry tier ($129/mo).
  Primary value: STR + regulations (Phase 1) + owner data (Phase 2).
  Skip: LTR (redundant), property attributes/tax/AVM (redundant).
    """)


def main():
    print("=" * 70)
    print("MASHVISOR TRIAL DATA ANALYSIS")
    print(f"Data directory: {DATA_DIR}")
    total = sum(1 for _ in DATA_DIR.rglob("*.json"))
    print(f"Total files: {total}")
    print("=" * 70)

    analyze_str()
    analyze_regulations()
    analyze_ltr()
    analyze_property()
    analyze_owner()
    analyze_neighborhood()
    summary()


if __name__ == "__main__":
    main()
