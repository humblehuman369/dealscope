# Wellington property — cache flush & verification

Addresses from the mobile vs web Verdict mismatch investigation.

## Step 1 — Exact Redis cache keys (backend `CacheService.generate_key`)

| Input address | Normalized (lowercase, USA stripped) | Redis key |
|---------------|----------------------------------------|-----------|
| `3783 Moon Bay Circle, Wellington, FL 33414` | `3783 moon bay circle, wellington, fl 33414` | `property:0c7f2619c694637c` |
| `3783 Moon Bay Cir, Wellington, FL 33414` | `3783 moon bay cir, wellington, fl 33414` | `property:0c4bcc0b2ba31ab6` |
| `3783 Moon Bay Circle, Wellington, FL 33414, USA` | same as first row | `property:0c7f2619c694637c` |

`Circle` and `, USA` resolve to the **same** key. `Cir` is a **different** key — this is why two devices can get different provider snapshots (e.g. Mashvisor present in one cache entry, missing in the other).

Recompute anytime:

```bash
python3 scripts/diagnostics/flush_property_cache.py
```

## Step 2 — Clear cache (choose one)

### A. Admin API (matches production `DELETE /api/v1/admin/cache/property`)

Requires: user with `admin:manage` permission, JWT in `Authorization: Bearer`.

Set `API_BASE_URL` to your FastAPI base (e.g. Railway host; **no** `/api` suffix — the path is added by the script).

```bash
export API_BASE_URL="https://YOUR_API_HOST"
export ADMIN_BEARER_TOKEN="eyJ..."

python3 scripts/diagnostics/flush_property_cache.py --api
```

Or with `curl` (run each; URL-encode the address in the query string):

```bash
export API_BASE_URL="https://YOUR_API_HOST"
export ADMIN_BEARER_TOKEN="eyJ..."

for addr in \
  "3783 Moon Bay Circle, Wellington, FL 33414" \
  "3783 Moon Bay Cir, Wellington, FL 33414" \
  "3783 Moon Bay Circle, Wellington, FL 33414, USA"
do
  q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$addr")
  curl -sS -X DELETE \
    -H "Authorization: Bearer ${ADMIN_BEARER_TOKEN}" \
    -H "Accept: application/json" \
    "${API_BASE_URL}/api/v1/admin/cache/property?address=${q}"
  echo
done
```

### B. Direct Redis `DEL` (ops / local)

If you have `REDIS_URL` (e.g. Railway Redis):

```bash
export REDIS_URL="redis://:password@host:6379/0"
pip install redis  # if needed
python3 scripts/diagnostics/flush_property_cache.py --redis-del
```

Or `redis-cli`:

```text
DEL property:0c7f2619c694637c
DEL property:0c4bcc0b2ba31ab6
```

## Step 3 — Web browser (sessionStorage)

1. Open `https://dealgapiq.com` in the browser you use for the web test.
2. DevTools → **Application** → **Session Storage** → `https://dealgapiq.com`.
3. Remove any key starting with `dealMaker_` that includes `3783` or `Moon Bay` (or clear all site data for a clean test).
4. Hard refresh (empty cache + hard reload).

## Step 4 — Re-run analysis on web

1. Search: `3783 Moon Bay Circle, Wellington, FL 33414` (or the same string you use for a fair A/B).
2. Record: **Target Buy**, **Income Value**, **Deal Gap %**, **Price Gap %**.
3. Open **Data Sources** and list rent providers (confirm whether **Mashvisor** appears).

## Step 5 — Compare to mobile reference (from screenshots)

| Metric | Mobile reference | Web (after flush) |
|--------|------------------|-------------------|
| Target Buy | ~$588,030 | (fill in) |
| Income Value | ~$618,979 | (fill in) |
| Deal Gap | ~-12.5% | (fill in) |
| Mashvisor in rent sources | yes | (yes/no) |

## Step 6 — Decide code fix (after results)

- **Web matches mobile + Mashvisor appears:** partial cache snapshot issue → add `mashvisor_absent` / `realtor_absent` to staleness in `backend/app/services/property_service.py` (mirror `zillow_absent` / `redfin_absent`). Optionally add address suffix canonicalization so one property cannot split across two cache keys.
- **Match but no Mashvisor:** rent divergence likely from another provider (e.g. RentCast) for `Cir` vs `Circle` → prioritize cache-key / address normalization.
- **No match after flush:** investigate `dealMaker` overrides, auth, or a non-cache path.
