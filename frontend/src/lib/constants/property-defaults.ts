/**
 * Centralized fallback defaults for property data.
 * 
 * SINGLE SOURCE OF TRUTH — used across verdict, deal-maker, analyzing,
 * and any other page that needs fallback property values when API data
 * is unavailable or incomplete.
 * 
 * Do NOT hardcode property defaults elsewhere. Import from here.
 */

export const FALLBACK_PROPERTY = {
  beds: 3,
  baths: 2,
  sqft: 1500,
  price: 350_000,
  /** Derived: price * 0.012 */
  get propertyTaxes() { return Math.round(this.price * 0.012) },
  /** Derived: price * 0.01 */
  get insurance() { return Math.round(this.price * 0.01) },
  /** Empty string — do not hardcode a US state */
  state: '',
  zipCode: '',
  city: '',
} as const

/**
 * Financing defaults used for display labels on the verdict page.
 * Actual calculation defaults live in the backend (app.core.defaults).
 */
export const DEFAULT_FINANCING = {
  downPaymentPct: 20,
  interestRate: 6.0,
  loanTermYears: 30,
  closingCostsPct: 3,
  vacancyRate: 5,
  managementRate: 8,
} as const
