/**
 * Subscription constants — single source of truth for entitlement
 * and product identifiers used across RevenueCat, App Store Connect,
 * Google Play, and the backend billing system.
 *
 * The entitlement ID must match exactly what's configured in the
 * RevenueCat dashboard. Case-sensitive, space-included.
 *
 * Product IDs must match what is configured in App Store Connect and
 * Google Play Console. Apple permanently reserves deleted product IDs,
 * which is why `monthly2` exists — `monthly` was used in an earlier
 * submission and can never be reused.
 *
 * NOTE: The purchase flow does NOT read these constants. It uses
 * RevenueCat packages (resolved by `packageType`) so product ID changes
 * happen in App Store Connect + RevenueCat, not here. These constants
 * exist for reference, logging, backend cross-checks, and restore flows.
 */

export const PRO_ENTITLEMENT_ID = 'DealGapIQ Pro'

/**
 * App Store Connect product IDs — must exactly match what's configured
 * in App Store Connect → DealGapIQ → Monetization → Subscriptions AND
 * what RevenueCat references in its Product Catalog. Mismatch = broken IAP.
 */
export const IOS_MONTHLY_PRODUCT_ID = 'com.monthly.dealgapiq'
export const IOS_YEARLY_PRODUCT_ID = 'com.yearly.dealgapiq'

export const FREE_ANALYSES_PER_MONTH = 3
