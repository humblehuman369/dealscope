# DealGapIQ — In-App Purchase Setup Instructions

## Goal

Configure Apple App Store Connect and RevenueCat so the iOS app can sell
DealGapIQ Pro subscriptions via Apple's In-App Purchase system. The app was
rejected by Apple because IAP was not working — products were not properly
connected between App Store Connect and RevenueCat.

---

## Current State

- **App Bundle ID:** `com.dealgapiq.mobile`
- **RevenueCat Project ID:** `projd3d13e41`
- **RevenueCat Entitlement:** `DealGapIQ Pro` (already exists, has 3 products from Test Store)
- **RevenueCat Offering:** `default` (already exists, has 3 packages)
- **Stripe Pricing (must match):** $39.99/month, $349.99/year ($29.17/mo billed annually)

### What already exists

**In App Store Connect:**
- A subscription group named `DealGapIQ Pro` (just created)
- A yearly subscription inside that group (just created, may have incomplete metadata)
- The monthly product ID `com.dealgapiq.mobile.pro.monthly` is PERMANENTLY RESERVED and cannot be reused (Apple does not allow reusing deleted product IDs)

**In RevenueCat:**
- Three products under "DealGapIQ (App Store)" — all show "Could not check" status
- Three products under "Test Store" (test environment, ignore these)
- One entitlement: `DealGapIQ Pro`
- One offering: `default` with 3 packages

---

## Part 1: App Store Connect — Subscriptions

### 1A. Complete the Yearly Subscription

Navigate to: **App Store Connect → DealGapIQ → Distribution → Subscriptions → DealGapIQ Pro group → Yearly subscription**

Ensure ALL of these fields are filled in:

| Field | Value |
|-------|-------|
| **Reference Name** | DealGapIQ Pro Yearly |
| **Product ID** | `com.dealgapiq.mobile.pro.yearly` |
| **Subscription Duration** | 1 Year |

**Subscription Pricing:**
- Base country: United States
- Price: **$349.99/year** (Apple price tier that returns exactly $349.99 via StoreKit)

**App Store Localization** (click + to add English if not present):

| Field | Value |
|-------|-------|
| **Display Name** | DealGapIQ Pro |
| **Description** | Unlimited property analysis, AI-powered investment insights, and advanced deal scoring. |

**Review Information:**
- Upload a screenshot showing the subscription purchase UI in the app (the UpgradeModal)
- Review Notes: `This auto-renewable subscription unlocks DealGapIQ Pro, providing unlimited property analysis, AI deal scoring, and investment strategy tools. Users can subscribe from the upgrade prompt in the app.`

### 1B. Create the Monthly Subscription

Navigate to: **DealGapIQ Pro subscription group → click + (or "Create Subscription")**

IMPORTANT: Use this product ID since `com.dealgapiq.mobile.pro.monthly` and
`com.dealgapiq.mobile.monthly` are permanently reserved (Apple does not allow reusing deleted product IDs):

| Field | Value |
|-------|-------|
| **Reference Name** | DealGapIQ Pro Monthly |
| **Product ID** | `com.dealgapiq.mobile.monthly2` |
| **Subscription Duration** | 1 Month |

**Subscription Pricing:**
- Base country: United States
- Price: **$39.99/month** (Apple price tier that returns exactly $39.99 via StoreKit)

**App Store Localization:**

| Field | Value |
|-------|-------|
| **Display Name** | DealGapIQ Pro |
| **Description** | Unlimited property analysis, AI-powered investment insights, and advanced deal scoring. |

**Review Information:**
- Same screenshot as yearly
- Same review notes as yearly

### 1C. Create Lifetime (Non-Consumable In-App Purchase)

This is optional for initial submission. If you want to include it:

Navigate to: **App Store Connect → DealGapIQ → Distribution → In-App Purchases → click +**

| Field | Value |
|-------|-------|
| **Reference Name** | DealGapIQ Pro Lifetime |
| **Product ID** | `com.dealgapiq.mobile.pro.lifetime` |
| **Type** | Non-Consumable |
| **Price** | Choose appropriate tier (e.g., $299.99 or $499.99) |

Same localization and review info pattern as above.

### 1D. Get the App-Specific Shared Secret

Navigate to: **App Store Connect → DealGapIQ → General → App Information**

Scroll to **App-Specific Shared Secret**:
- If one exists, click **Manage** and copy it
- If none exists, click **Generate** to create one
- Save this string — you'll paste it into RevenueCat

If you cannot find it under App Information, try:
**App Store Connect → Users and Access → Integrations → App-Specific Shared Secrets**

### 1E. Verify Subscription Status

Both subscriptions should show status **"Ready to Submit"** (or similar non-rejected status). They will be submitted alongside the next binary upload.

---

## Part 2: RevenueCat Configuration

### 2A. Connect App Store Credentials

Navigate to: **RevenueCat → Apps & providers → Configurations → DealGapIQ (App Store)**

Paste the **App-Specific Shared Secret** from step 1D into the shared secret field and save.

This should resolve the "Could not check" status on all products.

### 2B. Fix the Products

The current App Store products in RevenueCat may have incorrect product IDs. Delete them and recreate to match what's in App Store Connect:

1. Go to **Product catalog → Products**
2. Under "DealGapIQ (App Store)", delete all three existing products (they show "Could not check")
3. Recreate them with the EXACT product IDs from App Store Connect:

| Display Name | Identifier | Type |
|-------------|-----------|------|
| Monthly Subscription | `com.dealgapiq.mobile.monthly2` | Subscription |
| Yearly Subscription | `com.dealgapiq.mobile.pro.yearly` | Subscription |
| Lifetime | `com.dealgapiq.mobile.pro.lifetime` | Non-consumable |

After creating each product, the status should show a green checkmark (not "Could not check") if the shared secret is configured correctly.

### 2C. Attach Entitlements

For EACH of the three App Store products:
1. Click **Attach** in the Entitlements column
2. Select **DealGapIQ Pro**
3. Save

All three should show "1 Entitlement" after this step.

### 2D. Configure the Offering Packages

Navigate to: **Product catalog → Offerings → default**

The offering should have these packages mapped to the App Store products:

| Package Identifier | Product |
|-------------------|---------|
| `$rc_monthly` | `com.dealgapiq.mobile.monthly2` (App Store) |
| `$rc_annual` | `com.dealgapiq.mobile.pro.yearly` (App Store) |
| `$rc_lifetime` | `com.dealgapiq.mobile.pro.lifetime` (App Store) |

If the packages currently point to Test Store products, update them to point to the App Store products instead. Each package should reference the App Store product, not the Test Store product.

---

## Part 3: Verification Checklist

After completing Parts 1 and 2, verify:

- [ ] App Store Connect: Monthly subscription status is "Ready to Submit"
- [ ] App Store Connect: Yearly subscription status is "Ready to Submit"
- [ ] App Store Connect: Both have pricing set
- [ ] App Store Connect: Both have localization (display name + description)
- [ ] App Store Connect: Both have review information (screenshot + notes)
- [ ] RevenueCat: Shared secret is saved under App Store app configuration
- [ ] RevenueCat: All App Store products show green status (not "Could not check")
- [ ] RevenueCat: All App Store products are attached to "DealGapIQ Pro" entitlement
- [ ] RevenueCat: Default offering packages point to App Store products (not Test Store)

---

## How the Code Uses RevenueCat (no code changes needed)

The app code does NOT hardcode product IDs. It works like this:

1. `useRevenueCat.ts` calls `Purchases.configure({ apiKey })` with the RevenueCat iOS API key
2. Then calls `Purchases.getOfferings()` which returns ALL packages from the "default" offering
3. `UpgradeModal.tsx` uses `pickRCPackage()` to find packages by `packageType` (`ANNUAL` or `MONTHLY`)
4. The user taps "Start 7-day free trial" → `Purchases.purchasePackage()` triggers Apple's StoreKit payment sheet
5. After purchase, the app calls `/api/v1/billing/sync-iap` to sync the entitlement to the backend

As long as the RevenueCat offering packages are properly configured, the app will automatically load the correct products and prices. No code changes are required.

---

## Environment Variables (already configured)

The iOS API key is set via:
```
NEXT_PUBLIC_REVENUECAT_IOS_KEY=<your key>
```

You can find/verify this key in RevenueCat under: **Apps & providers → API keys**

---

## Support Email (minor)

While in RevenueCat, go to **Customer Center → Support** and set the support email to: `support@dealgapiq.com` (or whatever your support email is). This is optional but recommended.
