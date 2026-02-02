/**
 * Price Utilities
 * 
 * Utility functions for price labels and price target management.
 * Used across mobile analytics components.
 */

// =============================================================================
// PRICE TARGET TYPES
// =============================================================================

export type PriceTarget = 'breakeven' | 'targetBuy' | 'wholesale'

// =============================================================================
// PRICE LABEL FUNCTIONS
// =============================================================================

/**
 * Get the appropriate price label based on property status
 * 
 * @param isOffMarket - Whether the property is off-market
 * @param status - The listing status (e.g., 'PENDING', 'FOR_SALE')
 * @returns The appropriate label: 'Est. Market Value', 'List Price (Pending)', or 'List Price'
 */
export function getPriceLabel(isOffMarket?: boolean, status?: string): string {
  if (isOffMarket) return 'Est. Market Value'
  if (status === 'PENDING') return 'List Price (Pending)'
  return 'List Price'
}

/**
 * Get the label for a price target
 * 
 * @param target - The price target type
 * @returns Human-readable label for the price target
 */
export function getPriceTargetLabel(target: PriceTarget): string {
  switch (target) {
    case 'breakeven': return 'Breakeven'
    case 'targetBuy': return 'Target Buy'
    case 'wholesale': return 'Wholesale'
  }
}

/**
 * Get the description for a price target
 * 
 * @param target - The price target type
 * @returns Description of what the price target means
 */
export function getPriceTargetDescription(target: PriceTarget): string {
  switch (target) {
    case 'breakeven': return 'Max price for $0 cashflow'
    case 'targetBuy': return 'Positive Cashflow'
    case 'wholesale': return '30% net discount for assignment'
  }
}

/**
 * Check if property is off-market based on listing status
 * 
 * @param listingStatus - The listing status from the property
 * @returns true if property is considered off-market
 */
export function isPropertyOffMarket(listingStatus?: string): boolean {
  return !listingStatus || 
    listingStatus === 'OFF_MARKET' || 
    listingStatus === 'SOLD' ||
    listingStatus === 'FOR_RENT'
}

/**
 * Get price label with "At" prefix for comparison contexts
 * 
 * @param isOffMarket - Whether the property is off-market
 * @param status - The listing status
 * @returns Label with "At" prefix (e.g., "At List Price", "At Est. Market Value")
 */
export function getAtPriceLabel(isOffMarket?: boolean, status?: string): string {
  const baseLabel = getPriceLabel(isOffMarket, status)
  return `At ${baseLabel}`
}

/**
 * Get returns label with price context
 * 
 * @param isOffMarket - Whether the property is off-market
 * @returns Label for returns (e.g., "Returns at List Price", "Returns at Est. Market Value")
 */
export function getReturnsAtPriceLabel(isOffMarket?: boolean): string {
  const priceType = isOffMarket ? 'Est. Market Value' : 'List Price'
  return `Returns at ${priceType}`
}
