/**
 * Price Utilities — matches frontend/src/lib/priceUtils.ts
 *
 * Utility functions for price labels and price target management.
 * Used across IQ Verdict, Financial Breakdown, and Report exports.
 */

// =============================================================================
// PRICE TARGET TYPES
// =============================================================================

export type PriceTarget = 'breakeven' | 'targetBuy' | 'wholesale';

// =============================================================================
// PRICE LABEL FUNCTIONS
// =============================================================================

/**
 * Get the appropriate price label based on property status.
 *
 * @param isOffMarket Whether the property is off-market
 * @param status      The listing status (e.g., 'PENDING', 'FOR_SALE')
 */
export function getPriceLabel(
  isOffMarket?: boolean,
  status?: string,
): string {
  if (isOffMarket) return 'Est. Market Value';
  if (status === 'PENDING') return 'List Price (Pending)';
  return 'List Price';
}

/** Get the label for a price target. */
export function getPriceTargetLabel(target: PriceTarget): string {
  switch (target) {
    case 'breakeven':
      return 'Breakeven';
    case 'targetBuy':
      return 'Target Buy';
    case 'wholesale':
      return 'Wholesale';
  }
}

/** Get the description for a price target. */
export function getPriceTargetDescription(target: PriceTarget): string {
  switch (target) {
    case 'breakeven':
      return 'Max price for $0 cashflow';
    case 'targetBuy':
      return 'Positive Cashflow';
    case 'wholesale':
      return '30% net discount for assignment';
  }
}

/**
 * Check if property is off-market based on listing status.
 */
export function isPropertyOffMarket(listingStatus?: string): boolean {
  return (
    !listingStatus ||
    listingStatus === 'OFF_MARKET' ||
    listingStatus === 'SOLD' ||
    listingStatus === 'FOR_RENT'
  );
}

/** Get price label with "At" prefix for comparison contexts. */
export function getAtPriceLabel(
  isOffMarket?: boolean,
  status?: string,
): string {
  return `At ${getPriceLabel(isOffMarket, status)}`;
}

/** Get returns label with price context. */
export function getReturnsAtPriceLabel(isOffMarket?: boolean): string {
  const priceType = isOffMarket ? 'Est. Market Value' : 'List Price';
  return `Returns at ${priceType}`;
}
