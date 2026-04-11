/**
 * Subscription constants — single source of truth for entitlement
 * and product identifiers used across RevenueCat, App Store Connect,
 * and the backend billing system.
 *
 * The entitlement ID must match exactly what's configured in the
 * RevenueCat dashboard. Case-sensitive, space-included.
 */

export const PRO_ENTITLEMENT_ID = 'DealGapIQ Pro'

export const MONTHLY_PRODUCT_ID = 'com.dealgapiq.mobile.monthly2'
export const YEARLY_PRODUCT_ID = 'com.dealgapiq.mobile.pro.yearly'
export const LIFETIME_PRODUCT_ID = 'com.dealgapiq.mobile.pro.lifetime'

export const FREE_ANALYSES_PER_MONTH = 3
