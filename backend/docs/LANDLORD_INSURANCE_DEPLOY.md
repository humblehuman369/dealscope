# Landlord insurance (county) — post-deploy

After deploying a change to [`app/services/insurance_lookup.py`](../app/services/insurance_lookup.py) or the JSON under [`app/data/landlord_insurance/`](../app/data/landlord_insurance/), **cached property responses may still show the previous annual insurance** for up to 24 hours.

`market.insurance_annual` is only treated as “missing” in the property cache staleness check when the value is `null` ([`property_service.py`](../app/services/property_service.py) `missing_insurance`). Existing non-null entries are not re-estimated until TTL.

**Recommended (one-time after deploy):** call the admin cache flush for all properties:

```http
DELETE /api/v1/admin/cache/property
```

No `address` query parameter — this clears all `property:*` keys in Redis (and related calc keys; see [admin router](../app/routers/admin.py)). Requires a user with `admin:manage`.

To rebuild county JSON from the workbook in `data/DealGapIQ_Landlord_Insurance_Dataset.xlsx` after an ACS update:

```bash
python backend/scripts/build_landlord_insurance_data.py
```

Commit the updated `county_rates.json` / `state_calibration.json` and deploy.
