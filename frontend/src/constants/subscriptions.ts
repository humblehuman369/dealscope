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

export const IOS_MONTHLY_PRODUCT_ID = 'com.dealgapiq.mobile.monthly2'
export const IOS_YEARLY_PRODUCT_ID = 'com.dealgapiq.mobile.pro.yearly'
export const IOS_LIFETIME_PRODUCT_ID = 'com.dealgapiq.mobile.pro.lifetime'

export const FREE_ANALYSES_PER_MONTH = 3
