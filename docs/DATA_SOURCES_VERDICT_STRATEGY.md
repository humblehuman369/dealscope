# How Verdict and Strategy Pages Get Their Numbers (4370 Ruth Ln Example)

## Why you don't see "AXESSO" or "RentCast" on the page

DealGapIQ **does** pull from Zillow (via AXESSO) and RentCast. The Verdict and Strategy pages **do not show raw source labels** by design—they show only the *derived* values (Market Price, Target Buy, Income Value, Monthly Rent). So it can look like "no data from AXESSO or Rentcast" even when both were used.

---

## Intended data flow for 4370 Ruth Ln (off-market)

1. **User enters address**  
   `4370 Ruth Ln, Delray Beach, FL 33445`

2. **Frontend** calls  
   `POST /api/v1/properties/search` with `{ "address": "4370 Ruth Ln, Delray Beach, FL 33445" }`.

3. **Backend (PropertyService)**  
   - Calls **RentCast**: property, value estimate (AVM), rent estimate.  
   - Calls **Zillow (AXESSO)** `search-by-address`: returns zpid, zestimate, rentZestimate, homeStatus, taxAssessedValue, etc.  
   - **Normalizer** (api_clients.DataNormalizer) merges into a single schema:  
     - `zestimate` ← AXESSO `zestimate` (e.g. $683,000)  
     - `current_value_avm` ← RentCast `price` or AXESSO `zestimate` (per priority)  
     - `tax_assessed_value` ← RentCast or AXESSO  
     - `listing_status` ← AXESSO `homeStatus` (e.g. OFF_MARKET)

4. **Market Price (off-market)**  
   Backend computes:  
   - If both: **Market Price = (Zestimate + RentCast AVM) / 2**  
   - If one missing: use the other  
   - If both missing: use **Income Value** (from rent/taxes/insurance)  
   - Last resort: **Tax assessed value / 0.75**  

   Result is in `valuations.market_price` and (after verdict) in `list_price` in the verdict response.

5. **Response to frontend**  
   Property response includes:  
   `valuations: { zestimate, current_value_avm, market_price, tax_assessed_value, ... }`,  
   plus rents, taxes, etc.  
   **None of these are labeled "Zillow" or "RentCast" on the Verdict/Strategy UI**—only the single "Market" or "Market Price" value is shown.

6. **Verdict request**  
   Frontend sends to `POST /api/v1/analysis/verdict`:  
   `list_price` (or market price), `is_listed: false`, `zestimate`, `current_value_avm`, `tax_assessed_value`, plus rent, taxes, insurance, etc.  
   Backend uses these to recompute Market Price when off-market, then returns Income Value, Target Buy, deal score, and all strategy metrics.

7. **Strategy page**  
   Uses the same property and verdict data; "Market Price" and "Monthly Rent" there are the same backend-derived numbers (or frontend fallbacks if API didn’t return them).

---

## Why you might have seen wrong numbers (e.g. Market $76,900)

- **Stale cache**  
  Cached property responses from before the Market Price formula change didn’t have `market_price` or had the old logic. Cache hits kept returning that.  
  **Fix:** Cache hits now re-apply the current Market Price formula (see `_apply_market_price_to_cached` in property_service).

- **Zestimate/AVM not in normalized data**  
  If the AXESSO response was nested (e.g. under a `searchResult` key) and the normalizer only looked at top-level `zestimate`, it would have been missing.  
  **Fix:** The **data_normalizer** (used in some paths) was updated to treat a top-level response with `zestimate`/`zpid` as the property object.  
  **Note:** The **property** search flow uses **api_clients.DataNormalizer**, which expects `axesso_data` to have top-level `zestimate` (or nested via dot notation). If your AXESSO search-by-address response uses a different shape, that normalizer may need the same “top-level as property” handling.

- **RentCast or AXESSO not returning data**  
  If API keys are missing, the address format doesn’t match, or the provider returns no/empty data, then:  
  - No zestimate and no AVM → backend falls back to Income Value, then tax/0.75.  
  - If the only value was tax_assessed_value (e.g. ~$57,675), then tax/0.75 ≈ **$76,900**—which matches the wrong Market you saw.

- **Different data on Strategy vs Verdict**  
  Strategy can use a different code path or cached run; e.g. "Market Price $380,000" on Strategy vs "Market $76,900" on Verdict can happen if one request had valuations and the other didn’t, or cache differed.

---

## How to confirm Zillow and RentCast are used

1. **Backend logs**  
   On property search you should see logs like:  
   - "Zillow data retrieved - zpid: ..., zestimate: $..., rentZestimate: $..."  
   - Or "Zillow search failed for: ..." if AXESSO failed.

2. **Property API response**  
   Call `POST /api/v1/properties/search` with the address and inspect the JSON:  
   - `valuations.zestimate` (Zillow)  
   - `valuations.current_value_avm` (RentCast or Zillow)  
   - `valuations.market_price` (our formula).

3. **RentCast PDF**  
   Your RentCast sheet for 4370 Ruth Ln should show an AVM/value estimate and rent. If those match what we use, then RentCast is in the pipeline; the UI just doesn’t label them.

---

## Optional UI improvement

To make sources visible without changing logic, we can add a short line under "Market" or "Market Price" when both sources are present, e.g.:  
**"From Zestimate + RentCast AVM"**  
and when only one is present: **"From Zestimate"** or **"From RentCast AVM"** (using the same backend fields that already drive the number).

This doc is the single place that describes how Verdict and Strategy get their numbers from AXESSO and RentCast even when the UI doesn’t name them.
