/**
 * @deprecated LOCAL CALCULATIONS — MIGRATION IN PROGRESS
 *
 * The primary consumers (StrategyAnalyticsContainer, DesktopStrategyAnalyticsContainer)
 * have been migrated to backend-only calculations via:
 *   - frontend/src/hooks/useIQAnalysis.ts  (POST /api/v1/analysis/verdict + worksheets)
 *   - frontend/src/hooks/useDealMakerBackendCalc.ts  (POST /api/v1/worksheet/{strategy}/calculate)
 *
 * This file is retained for TYPE EXPORTS ONLY (IQTargetResult, TargetAssumptions).
 * The calculation functions (calculateIQTarget, getMetricsAtPrice, etc.) are still
 * used by secondary features (StrategyMetricsContent helpers, worksheet calculators)
 * and will be removed once those are also migrated.
 *
 * DO NOT add new calculation logic here.
 *
 * Original description:
 * DealGapIQ - IQ Target Price Calculation Engine
 * The IQ Target Price is the recommended purchase price that achieves
 * profitable returns for each investment strategy.
 */

// ============================================
// TYPES
// ============================================

export interface IQTargetResult {
  targetPrice: number
  discountFromList: number
  discountPercent: number
  breakeven: number
  breakevenPercent: number
  rationale: string
  highlightedMetric: string
  secondaryMetric: string
  // Key metrics at target price
  monthlyCashFlow: number
  cashOnCash: number
  capRate: number
  dscr: number
  // For BRRRR
  cashLeftInDeal?: number
  cashRecoveryPercent?: number
  equityCreated?: number
  // For Flip
  netProfit?: number
  roi?: number
  // For House Hack
  effectiveHousingCost?: number
  monthlySavings?: number
  // For Wholesale
  assignmentFee?: number
  mao?: number
}

export interface TargetAssumptions {
  listPrice: number
  // Financing
  downPaymentPct: number
  interestRate: number
  loanTermYears: number
  closingCostsPct: number
  // Income
  monthlyRent: number
  averageDailyRate: number
  occupancyRate: number
  vacancyRate: number
  // Expenses
  propertyTaxes: number
  insurance: number
  managementPct: number
  maintenancePct: number
  // Rehab/ARV (for BRRRR, Flip, Wholesale)
  rehabCost: number
  arv: number
  holdingPeriodMonths: number
  sellingCostsPct: number
  // House Hack
  roomsRented: number
  totalBedrooms: number
  // Wholesale
  wholesaleFeePct: number
  // Growth assumptions (optional)
  rentGrowth?: number
  appreciationRate?: number
  expenseGrowth?: number
}

// ============================================
// DEFAULT CONSTANTS (FALLBACKS ONLY)
// ============================================
// 
// IMPORTANT: These constants are FALLBACK values for when the API cannot be reached.
// Components should use the useDefaults() hook to get values from the backend.
// These values MUST match backend/app/core/defaults.py to ensure consistency.
//
// DO NOT import these constants directly in components. Use useDefaults() instead.
// These are exported for utility functions that need a fallback.

/**
 * Default buy discount percentage below breakeven
 * 5% means buying at 95% of breakeven (breakeven × (1 - 0.05))
 * ensuring immediate profitability
 * 
 * @deprecated Use useDefaults() hook instead - defaults.brrrr.buy_discount_pct
 */
export const DEFAULT_BUY_DISCOUNT_PCT = 0.05

/**
 * Default insurance as percentage of purchase price
 * 
 * @deprecated Use useDefaults() hook instead - defaults.operating.insurance_pct
 */
export const DEFAULT_INSURANCE_PCT = 0.01

/**
 * Default renovation budget as percentage of ARV
 * 
 * @deprecated Use useDefaults() hook instead - defaults.rehab.renovation_budget_pct
 */
export const DEFAULT_RENOVATION_BUDGET_PCT = 0.05

/**
 * Default holding costs as percentage of purchase price (annual)
 * 
 * @deprecated Use useDefaults() hook instead - defaults.rehab.holding_costs_pct
 */
export const DEFAULT_HOLDING_COSTS_PCT = 0.01

/**
 * Default refinance closing costs as percentage of refinance amount
 * 
 * @deprecated Use useDefaults() hook instead - defaults.brrrr.refinance_closing_costs_pct
 */
export const DEFAULT_REFINANCE_CLOSING_COSTS_PCT = 0.03

// ============================================
// BREAKEVEN ESTIMATION HELPER
// ============================================

/**
 * Estimate breakeven purchase price for LTR based on basic property data.
 * This is a simplified calculation used for setting initial purchase price values.
 * 
 * Breakeven is where monthly cash flow = $0
 * At breakeven: NOI = Annual Debt Service
 * 
 * IMPORTANT: Default parameter values are fallbacks that match backend/app/core/defaults.py.
 * Callers should provide values from useDefaults() hook when available.
 * 
 * @param params.vacancyRate - From useDefaults().defaults.operating.vacancy_rate
 * @param params.maintenancePct - From useDefaults().defaults.operating.maintenance_pct
 * @param params.managementPct - From useDefaults().defaults.operating.property_management_pct
 * @param params.downPaymentPct - From useDefaults().defaults.financing.down_payment_pct
 * @param params.interestRate - From useDefaults().defaults.financing.interest_rate
 * @param params.loanTermYears - From useDefaults().defaults.financing.loan_term_years
 */
export function estimateLTRBreakeven(params: {
  monthlyRent: number
  propertyTaxes: number
  insurance: number
  vacancyRate?: number
  maintenancePct?: number
  managementPct?: number
  downPaymentPct?: number
  interestRate?: number
  loanTermYears?: number
}): number {
  // FALLBACK VALUES - should match backend/app/core/defaults.py
  const {
    monthlyRent,
    propertyTaxes,
    insurance,
    vacancyRate = 0.01,      // OPERATING.vacancy_rate
    maintenancePct = 0.05,   // OPERATING.maintenance_pct
    managementPct = 0,       // OPERATING.property_management_pct
    downPaymentPct = 0.20,   // FINANCING.down_payment_pct
    interestRate = 0.06,     // FINANCING.interest_rate
    loanTermYears = 30,      // FINANCING.loan_term_years
  } = params

  // Calculate annual gross income
  const annualGrossRent = monthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate)
  
  // Calculate operating expenses (not including debt service)
  const annualMaintenance = effectiveGrossIncome * maintenancePct
  const annualManagement = effectiveGrossIncome * managementPct
  const operatingExpenses = propertyTaxes + insurance + annualMaintenance + annualManagement
  
  // NOI = Effective Gross Income - Operating Expenses
  const noi = effectiveGrossIncome - operatingExpenses
  
  if (noi <= 0) {
    // Property can't break even at any price (negative NOI)
    return 0
  }
  
  // At breakeven: NOI = Annual Debt Service
  // Annual Debt Service = Monthly Payment * 12
  // Monthly Payment = Loan Amount * (r * (1+r)^n) / ((1+r)^n - 1)
  // Loan Amount = Purchase Price * (1 - Down Payment %)
  
  // So we need to solve for Purchase Price where:
  // NOI = (Purchase Price * (1 - downPaymentPct)) * (monthlyRate * (1+monthlyRate)^n) / ((1+monthlyRate)^n - 1) * 12
  
  const monthlyRate = interestRate / 12
  const numPayments = loanTermYears * 12
  const ltvRatio = 1 - downPaymentPct
  
  // Mortgage constant (annual payment per $ of loan)
  const mortgageConstant = (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                           (Math.pow(1 + monthlyRate, numPayments) - 1) * 12
  
  // Solve for purchase price: NOI = PurchasePrice * LTV * MortgageConstant
  // PurchasePrice = NOI / (LTV * MortgageConstant)
  const breakeven = noi / (ltvRatio * mortgageConstant)
  
  return Math.round(breakeven)
}

/**
 * Calculate buy price as breakeven minus the buy discount
 * Formula: Buy Price = Breakeven × (1 - Buy Discount %)
 */
export function calculateBuyPrice(params: {
  monthlyRent: number
  propertyTaxes: number
  insurance: number
  listPrice: number
  vacancyRate?: number
  maintenancePct?: number
  managementPct?: number
  downPaymentPct?: number
  interestRate?: number
  loanTermYears?: number
  buyDiscountPct?: number
}): number {
  const discountPct = params.buyDiscountPct ?? DEFAULT_BUY_DISCOUNT_PCT
  const breakeven = estimateLTRBreakeven(params)
  
  if (breakeven <= 0) {
    // Can't estimate breakeven, fall back to list price
    return params.listPrice
  }
  
  // Buy price = Breakeven × (1 - Buy Discount %)
  const buyPrice = Math.round(breakeven * (1 - discountPct))
  
  // Return the buy price, but cap at list price (can't pay more than list)
  return Math.min(buyPrice, params.listPrice)
}

/**
 * Alias for calculateBuyPrice - calculates initial purchase price
 * as 95% of estimated breakeven (5% discount by default)
 */
export const calculateInitialPurchasePrice = calculateBuyPrice

/**
 * Calculate initial rehab budget as 5% of ARV
 */
export function calculateInitialRehabBudget(arv: number): number {
  return Math.round(arv * DEFAULT_RENOVATION_BUDGET_PCT)
}

// ============================================
// DEAL OPPORTUNITY SCORE CALCULATION
// ============================================

/**
 * Deal Opportunity Score - Investment Price Indicator
 * 
 * The Deal Opportunity Score considers multiple factors to determine
 * how attractive a property is as an investment opportunity:
 * 
 * 1. Deal Gap (50% weight) - ((List Price - Breakeven Price) / List Price) × 100
 *    - Breakeven is calculated from LTR strategy (market rent less property costs)
 *    - This is the primary factor as it indicates how much discount is needed
 * 
 * 2. Availability Ranking (30% weight) - Based on listing status and motivation:
 *    - Withdrawn (best) - Seller motivation may be high
 *    - For Sale – Price Reduced 2+ Times - Seller showing flexibility
 *    - For Sale - Bank Owned/REO - Banks want to move properties
 *    - For Sale – FSBO/Individual - More negotiation room
 *    - For Sale - Agent Listed - Standard listing
 *    - Off-Market - May find motivated sellers
 *    - For Rent - Landlord may consider selling
 *    - Pending – Under Contract - Unlikely to get
 *    - Sold (Recently) - Not available
 * 
 * 3. Days on Market (20% weight) - Combined with Deal Gap:
 *    - High Deal Gap + High DOM = More negotiation leverage
 *    - High Deal Gap + Low DOM = Opportunity not yet recognized
 *    - Low Deal Gap + High DOM = Price may already be fair
 * 
 * Note: Equity % is excluded as mortgage balance data is not available
 * from the Axesso API. This would require public records data.
 * 
 * Note: BRRRR, Fix & Flip, and Wholesale strategies require physical
 * inspection for repair estimates. The Deal Score is based on LTR
 * breakeven since it can be calculated from available market data.
 */

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * Availability status for opportunity ranking.
 * Lower rank number = better opportunity.
 */
export type AvailabilityStatus = 
  | 'WITHDRAWN'
  | 'PRICE_REDUCED'
  | 'BANK_OWNED'
  | 'FSBO'
  | 'AGENT_LISTED'
  | 'OFF_MARKET'
  | 'FOR_RENT'
  | 'PENDING'
  | 'SOLD'
  | 'UNKNOWN'

export interface AvailabilityInfo {
  status: AvailabilityStatus
  rank: number              // 1-9 (1 = best opportunity)
  score: number             // 0-100 (inverted rank score)
  label: string             // Human-readable label
  motivationLevel: 'high' | 'medium' | 'low'
}

export interface DealOpportunityFactors {
  // Deal Gap (LTR-based breakeven)
  dealGap: {
    breakevenPrice: number
    listPrice: number
    gapAmount: number       // List Price - Breakeven
    gapPercent: number      // ((List - Breakeven) / List) × 100
    score: number           // 0-100 (lower gap = higher score)
  }
  
  // Availability/Listing Status
  availability: AvailabilityInfo
  
  // Days on Market
  daysOnMarket: {
    days: number | null
    score: number           // 0-100 (factors DOM with Deal Gap)
    leverage: 'high' | 'medium' | 'low' | 'unknown'
  }
  
  // Weights used in calculation
  weights: {
    dealGap: number
    availability: number
    daysOnMarket: number
  }
}

export interface DealOpportunityScore {
  // Overall composite score
  score: number             // 0-100 weighted composite
  grade: OpportunityGrade
  label: string             // "Strong Opportunity", etc.
  color: string             // For UI display
  
  // Component scores
  factors: DealOpportunityFactors
  
  // Legacy compatibility
  discountPercent: number   // Same as dealGap.gapPercent
  breakevenPrice: number
  listPrice: number
}

// Legacy type alias for backward compatibility
export type OpportunityScore = DealOpportunityScore

/**
 * Get availability ranking based on listing status and seller type.
 * 
 * Ranking (best to worst opportunity):
 * 1. Withdrawn - Was for sale but didn't sell (motivated seller)
 * 2. Price Reduced 2+ Times - Seller showing flexibility
 * 3. Bank Owned/REO - Banks want to move properties
 * 4. FSBO/Individual - More negotiation room, no agent commission
 * 5. Agent Listed - Standard listing
 * 6. Off-Market - May find motivated sellers through outreach
 * 7. For Rent - Landlord may consider selling
 * 8. Pending/Under Contract - Unlikely to get
 * 9. Sold - Not available
 */
export function getAvailabilityRanking(params: {
  listingStatus?: string | null
  sellerType?: string | null
  isForeclosure?: boolean
  isBankOwned?: boolean
  isFsbo?: boolean
  isAuction?: boolean
  priceReductions?: number
}): AvailabilityInfo {
  const {
    listingStatus,
    sellerType,
    isForeclosure = false,
    isBankOwned = false,
    isFsbo = false,
    priceReductions = 0,
  } = params
  
  const status = listingStatus?.toUpperCase() || ''
  const seller = sellerType?.toUpperCase() || ''
  
  // Rank 1: Withdrawn listings
  if (status === 'WITHDRAWN' || status.includes('WITHDRAWN')) {
    return {
      status: 'WITHDRAWN',
      rank: 1,
      score: 100,
      label: 'Withdrawn - High Motivation',
      motivationLevel: 'high'
    }
  }
  
  // Rank 2: Price reduced 2+ times (seller very motivated)
  if ((status === 'FOR_SALE' || status.includes('SALE')) && priceReductions >= 2) {
    return {
      status: 'PRICE_REDUCED',
      rank: 2,
      score: 90,
      label: `Price Reduced ${priceReductions}x`,
      motivationLevel: 'high'
    }
  }
  
  // Rank 3: Bank Owned / REO / Foreclosure
  if (isBankOwned || isForeclosure || seller.includes('BANK') || seller.includes('FORECLOSURE')) {
    return {
      status: 'BANK_OWNED',
      rank: 3,
      score: 80,
      label: isBankOwned ? 'Bank Owned (REO)' : 'Foreclosure',
      motivationLevel: 'high'
    }
  }
  
  // Rank 4: FSBO / Individual
  if (isFsbo || seller === 'FSBO' || seller.includes('OWNER')) {
    return {
      status: 'FSBO',
      rank: 4,
      score: 70,
      label: 'For Sale By Owner',
      motivationLevel: 'medium'
    }
  }
  
  // Rank 5: Standard Agent Listed (For Sale)
  if (status === 'FOR_SALE' || status.includes('SALE')) {
    return {
      status: 'AGENT_LISTED',
      rank: 5,
      score: 60,
      label: 'For Sale - Agent Listed',
      motivationLevel: 'medium'
    }
  }
  
  // Rank 6: Off-Market
  if (status === 'OFF_MARKET' || status.includes('OFF')) {
    return {
      status: 'OFF_MARKET',
      rank: 6,
      score: 50,
      label: 'Off-Market',
      motivationLevel: 'low'
    }
  }
  
  // Rank 7: For Rent
  if (status === 'FOR_RENT' || status.includes('RENT')) {
    return {
      status: 'FOR_RENT',
      rank: 7,
      score: 40,
      label: 'For Rent',
      motivationLevel: 'low'
    }
  }
  
  // Rank 8: Pending / Under Contract
  if (status === 'PENDING' || status.includes('PENDING') || status.includes('CONTRACT')) {
    return {
      status: 'PENDING',
      rank: 8,
      score: 20,
      label: 'Pending - Under Contract',
      motivationLevel: 'low'
    }
  }
  
  // Rank 9: Sold
  if (status === 'SOLD' || status.includes('SOLD')) {
    return {
      status: 'SOLD',
      rank: 9,
      score: 10,
      label: 'Recently Sold',
      motivationLevel: 'low'
    }
  }
  
  // Unknown status
  return {
    status: 'UNKNOWN',
    rank: 6, // Default to off-market equivalent
    score: 50,
    label: 'Unknown Status',
    motivationLevel: 'low'
  }
}

/**
 * Calculate Days on Market score with Deal Gap context.
 * 
 * The relationship between DOM and Deal Gap:
 * - High Deal Gap + High DOM = Strong negotiation leverage (seller may be desperate)
 * - High Deal Gap + Low DOM = Opportunity not yet recognized by market
 * - Low Deal Gap + High DOM = Price may already be fair (not much room)
 * - Low Deal Gap + Low DOM = Hot property, move fast if interested
 */
export function calculateDOMScore(params: {
  daysOnMarket: number | null | undefined
  dealGapPercent: number
}): {
  days: number | null
  score: number
  leverage: 'high' | 'medium' | 'low' | 'unknown'
} {
  const { daysOnMarket, dealGapPercent } = params
  
  if (daysOnMarket === null || daysOnMarket === undefined) {
    return { days: null, score: 50, leverage: 'unknown' }
  }
  
  const days = daysOnMarket
  
  // DOM thresholds (in days)
  const lowDOM = 30
  const mediumDOM = 60
  const highDOM = 120
  
  // Deal Gap thresholds (in %)
  const lowGap = 10
  const highGap = 25
  
  let score: number
  let leverage: 'high' | 'medium' | 'low'
  
  if (dealGapPercent >= highGap) {
    // High Deal Gap - DOM increases leverage
    if (days >= highDOM) {
      score = 100  // Best: high gap + very long DOM
      leverage = 'high'
    } else if (days >= mediumDOM) {
      score = 85
      leverage = 'high'
    } else if (days >= lowDOM) {
      score = 70  // Good opportunity, may have more room
      leverage = 'medium'
    } else {
      score = 60  // New listing with pricing issue - good if you move fast
      leverage = 'medium'
    }
  } else if (dealGapPercent >= lowGap) {
    // Medium Deal Gap
    if (days >= highDOM) {
      score = 70
      leverage = 'medium'
    } else if (days >= mediumDOM) {
      score = 60
      leverage = 'medium'
    } else if (days >= lowDOM) {
      score = 50
      leverage = 'medium'
    } else {
      score = 45
      leverage = 'low'
    }
  } else {
    // Low Deal Gap - already close to fair price
    if (days >= highDOM) {
      score = 50  // Long DOM suggests market has priced it correctly
      leverage = 'low'
    } else if (days >= mediumDOM) {
      score = 40
      leverage = 'low'
    } else {
      score = 30  // Hot market, fair price
      leverage = 'low'
    }
  }
  
  return { days, score, leverage }
}

/**
 * Calculate the Deal Gap score from breakeven and list price.
 * 
 * Deal Gap = ((List Price - Breakeven Price) / List Price) × 100
 * 
 * A positive gap means the list price is above breakeven (need discount).
 * A negative gap means property is already profitable at list price.
 */
export function calculateDealGapScore(
  breakevenPrice: number,
  listPrice: number
): {
  breakevenPrice: number
  listPrice: number
  gapAmount: number
  gapPercent: number
  score: number
} {
  if (listPrice <= 0) {
    return {
      breakevenPrice,
      listPrice,
      gapAmount: 0,
      gapPercent: 0,
      score: 0
    }
  }
  
  const gapAmount = listPrice - breakevenPrice
  const gapPercent = Math.max(0, (gapAmount / listPrice) * 100)
  
  // Score is inverse of gap (lower gap = higher score)
  // 0% gap = 100 score
  // 45%+ gap = 0 score
  const score = Math.max(0, Math.min(100, Math.round(100 - (gapPercent * 100 / 45))))
  
  return {
    breakevenPrice,
    listPrice,
    gapAmount,
    gapPercent,
    score
  }
}

/**
 * Calculate comprehensive Deal Opportunity Score.
 * 
 * Weights:
 * - Deal Gap: 50% (primary factor - how much discount needed)
 * - Availability: 30% (seller motivation and listing status)
 * - Days on Market: 20% (negotiation leverage context)
 * 
 * @param breakevenPrice - LTR breakeven price (from market rent less costs)
 * @param listPrice - Current list price (or estimated value if off-market)
 * @param options - Additional context for availability and DOM scoring
 */
export function calculateDealOpportunityScore(
  breakevenPrice: number,
  listPrice: number,
  options?: {
    listingStatus?: string | null
    sellerType?: string | null
    isForeclosure?: boolean
    isBankOwned?: boolean
    isFsbo?: boolean
    isAuction?: boolean
    priceReductions?: number
    daysOnMarket?: number | null
  }
): DealOpportunityScore {
  // Weights for composite score
  const weights = {
    dealGap: 0.50,
    availability: 0.30,
    daysOnMarket: 0.20
  }
  
  // Calculate Deal Gap score (50% weight)
  const dealGap = calculateDealGapScore(breakevenPrice, listPrice)
  
  // Calculate Availability score (30% weight)
  const availability = getAvailabilityRanking({
    listingStatus: options?.listingStatus,
    sellerType: options?.sellerType,
    isForeclosure: options?.isForeclosure,
    isBankOwned: options?.isBankOwned,
    isFsbo: options?.isFsbo,
    isAuction: options?.isAuction,
    priceReductions: options?.priceReductions,
  })
  
  // Calculate Days on Market score (20% weight)
  const daysOnMarket = calculateDOMScore({
    daysOnMarket: options?.daysOnMarket,
    dealGapPercent: dealGap.gapPercent
  })
  
  // Calculate weighted composite score
  const compositeScore = Math.round(
    (dealGap.score * weights.dealGap) +
    (availability.score * weights.availability) +
    (daysOnMarket.score * weights.daysOnMarket)
  )
  
  // Determine grade and label based on composite score
  let grade: OpportunityGrade
  let label: string
  let color: string
  
  if (compositeScore >= 85) {
    grade = 'A+'
    label = 'Strong Opportunity'
    color = '#22c55e' // green-500
  } else if (compositeScore >= 70) {
    grade = 'A'
    label = 'Great Opportunity'
    color = '#22c55e' // green-500
  } else if (compositeScore >= 55) {
    grade = 'B'
    label = 'Moderate Opportunity'
    color = '#84cc16' // lime-500
  } else if (compositeScore >= 40) {
    grade = 'C'
    label = 'Potential Opportunity'
    color = '#f97316' // orange-500
  } else if (compositeScore >= 25) {
    grade = 'D'
    label = 'Weak Opportunity'
    color = '#f97316' // orange-500
  } else {
    grade = 'F'
    label = 'Poor Opportunity'
    color = '#ef4444' // red-500
  }
  
  return {
    score: compositeScore,
    grade,
    label,
    color,
    factors: {
      dealGap,
      availability,
      daysOnMarket,
      weights
    },
    // Legacy compatibility
    discountPercent: dealGap.gapPercent,
    breakevenPrice,
    listPrice
  }
}

/**
 * Legacy function for backward compatibility.
 * Use calculateDealOpportunityScore for full functionality.
 */
export function calculateOpportunityScore(
  breakevenPrice: number,
  listPrice: number
): OpportunityScore {
  return calculateDealOpportunityScore(breakevenPrice, listPrice)
}

/**
 * Get opportunity score from IQ Target result (legacy)
 * Convenience function that extracts breakeven and list price from IQ Target
 */
export function getOpportunityScoreFromTarget(
  iqTarget: IQTargetResult,
  listPrice: number
): OpportunityScore {
  return calculateOpportunityScore(iqTarget.breakeven, listPrice)
}

/**
 * Get full deal opportunity score from IQ Target with listing context
 */
export function getDealOpportunityScoreFromTarget(
  iqTarget: IQTargetResult,
  listPrice: number,
  listingInfo?: {
    listingStatus?: string | null
    sellerType?: string | null
    isForeclosure?: boolean
    isBankOwned?: boolean
    isFsbo?: boolean
    isAuction?: boolean
    priceReductions?: number
    daysOnMarket?: number | null
  }
): DealOpportunityScore {
  return calculateDealOpportunityScore(
    iqTarget.breakeven,
    listPrice,
    listingInfo
  )
}

// ============================================
// STRATEGY-SPECIFIC CALCULATIONS
// ============================================

function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) return principal / (years * 12)
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1)
}

function calculateLTRMetrics(purchasePrice: number, a: TargetAssumptions) {
  const downPayment = purchasePrice * a.downPaymentPct
  const closingCosts = purchasePrice * a.closingCostsPct
  const loanAmount = purchasePrice - downPayment
  const totalCashRequired = downPayment + closingCosts
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears)
  const annualDebtService = monthlyPI * 12
  const annualGrossRent = a.monthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - a.vacancyRate)
  const totalOpEx = a.propertyTaxes + a.insurance + (annualGrossRent * a.managementPct) + (annualGrossRent * a.maintenancePct)
  const noi = effectiveGrossIncome - totalOpEx
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
  
  return { monthlyCashFlow, annualCashFlow, capRate, cashOnCash, dscr, noi, totalCashRequired }
}

function calculateSTRMetrics(purchasePrice: number, a: TargetAssumptions) {
  const downPayment = purchasePrice * a.downPaymentPct
  const closingCosts = purchasePrice * a.closingCostsPct
  const loanAmount = purchasePrice - downPayment
  const totalCashRequired = downPayment + closingCosts
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears)
  const annualDebtService = monthlyPI * 12
  const annualGrossRent = a.averageDailyRate * 365 * a.occupancyRate
  const managementFee = annualGrossRent * 0.20
  const platformFees = annualGrossRent * 0.03
  const utilities = 3600
  const supplies = 2400
  const totalOpEx = a.propertyTaxes + a.insurance + managementFee + platformFees + utilities + supplies + (annualGrossRent * a.maintenancePct)
  const noi = annualGrossRent - totalOpEx
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
  
  return { monthlyCashFlow, annualCashFlow, capRate, cashOnCash, dscr, noi, annualGrossRent, totalCashRequired }
}

function calculateBRRRRMetrics(purchasePrice: number, a: TargetAssumptions) {
  const initialCash = (purchasePrice * 0.30) + a.rehabCost + (purchasePrice * a.closingCostsPct)
  const allInCost = purchasePrice + a.rehabCost + (purchasePrice * a.closingCostsPct)
  const refinanceLoanAmount = a.arv * 0.75
  const cashBack = refinanceLoanAmount - (purchasePrice * 0.70)
  const cashLeftInDeal = Math.max(0, initialCash - Math.max(0, cashBack))
  const cashRecoveryPercent = initialCash > 0 ? ((initialCash - cashLeftInDeal) / initialCash) * 100 : 0
  const monthlyPI = calculateMonthlyMortgage(refinanceLoanAmount, a.interestRate, a.loanTermYears)
  const annualDebtService = monthlyPI * 12
  const annualGrossRent = a.monthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - a.vacancyRate)
  const totalOpEx = a.propertyTaxes + a.insurance + (annualGrossRent * a.managementPct) + (annualGrossRent * a.maintenancePct)
  const noi = effectiveGrossIncome - totalOpEx
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const cashOnCash = cashLeftInDeal > 0 ? annualCashFlow / cashLeftInDeal : Infinity
  const equityCreated = a.arv - refinanceLoanAmount
  
  return { 
    monthlyCashFlow, annualCashFlow, cashOnCash, 
    initialCash, allInCost, cashBack, cashLeftInDeal, cashRecoveryPercent, equityCreated,
    noi, refinanceLoanAmount
  }
}

function calculateFlipMetrics(purchasePrice: number, a: TargetAssumptions) {
  const purchaseCosts = purchasePrice * a.closingCostsPct
  const holdingCosts = (purchasePrice * (a.interestRate / 12) * a.holdingPeriodMonths) + 
    ((a.propertyTaxes / 12) * a.holdingPeriodMonths) + 
    ((a.insurance / 12) * a.holdingPeriodMonths)
  const sellingCosts = a.arv * a.sellingCostsPct
  const totalInvestment = purchasePrice + purchaseCosts + a.rehabCost + holdingCosts
  const netProfit = a.arv - totalInvestment - sellingCosts
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0
  const annualizedROI = roi * (12 / a.holdingPeriodMonths)
  const flipMargin = a.arv - purchasePrice - a.rehabCost
  
  // 70% Rule check
  const maxPurchase70Rule = (a.arv * 0.70) - a.rehabCost
  const passes70Rule = purchasePrice <= maxPurchase70Rule
  
  return { 
    netProfit, roi, annualizedROI, totalInvestment, flipMargin,
    holdingCosts, sellingCosts, purchaseCosts, passes70Rule, maxPurchase70Rule
  }
}

function calculateHouseHackMetrics(purchasePrice: number, a: TargetAssumptions) {
  const totalBedrooms = a.totalBedrooms || 4
  const roomsRented = a.roomsRented || Math.max(1, totalBedrooms - 1)
  const rentPerRoom = a.monthlyRent / totalBedrooms
  const monthlyRentalIncome = rentPerRoom * roomsRented
  const downPayment = purchasePrice * 0.035 // FHA
  const closingCosts = purchasePrice * a.closingCostsPct
  const totalCashRequired = downPayment + closingCosts
  const loanAmount = purchasePrice - downPayment
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears)
  const monthlyTaxes = a.propertyTaxes / 12
  const monthlyInsurance = a.insurance / 12
  const pmi = loanAmount * 0.0085 / 12 // PMI estimate for FHA
  const monthlyExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + pmi + (monthlyRentalIncome * a.vacancyRate) + (monthlyRentalIncome * a.maintenancePct)
  const effectiveHousingCost = monthlyExpenses - monthlyRentalIncome
  const marketRent = rentPerRoom * 1.2
  const monthlySavings = marketRent - effectiveHousingCost
  const housingCostOffset = monthlyRentalIncome / monthlyExpenses
  
  return { 
    totalCashRequired, monthlyRentalIncome, effectiveHousingCost, monthlySavings, 
    monthlyPI, roomsRented, totalBedrooms, rentPerRoom, housingCostOffset, monthlyExpenses, pmi
  }
}

function calculateWholesaleMetrics(purchasePrice: number, a: TargetAssumptions) {
  const wholesaleFee = a.listPrice * a.wholesaleFeePct
  const mao = (a.arv * 0.70) - a.rehabCost - wholesaleFee
  const assignmentFee = mao - purchasePrice
  const purchasePctOfArv = a.arv > 0 ? purchasePrice / a.arv : 1
  const endBuyerProfit = a.arv - mao - a.rehabCost
  const roiOnEMD = (assignmentFee / 5000) * 100 // Assuming $5K EMD
  
  return { 
    mao, assignmentFee, wholesaleFee, purchasePctOfArv, 
    endBuyerProfit, roiOnEMD
  }
}

// ============================================
// IQ TARGET CALCULATION - Main Functions
// ============================================

/**
 * Calculate IQ Target Price for Long-Term Rental
 * Target: $200+/month cash flow with 8%+ Cash-on-Cash
 */
export function calculateLTRTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice
  
  // Binary search to find price that yields ~$200/month cash flow
  let low = listPrice * 0.60
  let high = listPrice
  let targetPrice = listPrice * 0.85 // Initial guess
  
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const metrics = calculateLTRMetrics(mid, a)
    
    if (metrics.monthlyCashFlow >= 200 && metrics.monthlyCashFlow <= 600) {
      targetPrice = mid
      break
    } else if (metrics.monthlyCashFlow < 200) {
      high = mid
    } else {
      low = mid
    }
    targetPrice = mid
  }
  
  // Calculate final metrics at target price
  const finalMetrics = calculateLTRMetrics(targetPrice, a)
  
  // Find breakeven price (where cash flow = 0) using binary search
  let breakevenLow = listPrice * 0.30
  let breakevenHigh = listPrice * 1.10
  let breakeven = targetPrice // Default to target if we can't find breakeven
  
  // Check if breakeven exists within range
  const lowMetrics = calculateLTRMetrics(breakevenLow, a)
  const highMetrics = calculateLTRMetrics(breakevenHigh, a)
  
  if (lowMetrics.monthlyCashFlow > 0 && highMetrics.monthlyCashFlow < 0) {
    // Binary search to find exact breakeven
    for (let i = 0; i < 30; i++) {
      const mid = (breakevenLow + breakevenHigh) / 2
      const midMetrics = calculateLTRMetrics(mid, a)
      
      if (Math.abs(midMetrics.monthlyCashFlow) < 10) {
        // Close enough to zero
        breakeven = mid
        break
      } else if (midMetrics.monthlyCashFlow > 0) {
        // Still positive, go higher (higher price = lower cash flow)
        breakevenLow = mid
      } else {
        // Negative, go lower
        breakevenHigh = mid
      }
      breakeven = mid
    }
  } else if (lowMetrics.monthlyCashFlow <= 0) {
    // Even at 30% of list, cash flow is negative - no viable breakeven
    breakeven = breakevenLow
  } else {
    // Cash flow is positive even at 110% of list - breakeven is above list
    breakeven = breakevenHigh
  }
  
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`
  
  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    breakeven: Math.round(breakeven / 1000) * 1000,
    breakevenPercent: (breakeven / listPrice) * 100,
    rationale: 'At this price you achieve positive',
    highlightedMetric: `${formatCurrency(finalMetrics.monthlyCashFlow)}/mo cash flow`,
    secondaryMetric: formatPercent(finalMetrics.cashOnCash),
    monthlyCashFlow: finalMetrics.monthlyCashFlow,
    cashOnCash: finalMetrics.cashOnCash,
    capRate: finalMetrics.capRate,
    dscr: finalMetrics.dscr
  }
}

/**
 * Calculate IQ Target Price for Short-Term Rental
 * Target: $500+/month cash flow with higher CoC than LTR
 */
export function calculateSTRTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice
  
  let low = listPrice * 0.60
  let high = listPrice
  let targetPrice = listPrice * 0.85
  
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const metrics = calculateSTRMetrics(mid, a)
    
    if (metrics.monthlyCashFlow >= 500 && metrics.monthlyCashFlow <= 1500) {
      targetPrice = mid
      break
    } else if (metrics.monthlyCashFlow < 500) {
      high = mid
    } else {
      low = mid
    }
    targetPrice = mid
  }
  
  const finalMetrics = calculateSTRMetrics(targetPrice, a)
  
  // Find breakeven price (where cash flow = 0) using binary search
  let breakevenLow = listPrice * 0.30
  let breakevenHigh = listPrice * 1.10
  let breakeven = targetPrice
  
  const lowMetrics = calculateSTRMetrics(breakevenLow, a)
  const highMetrics = calculateSTRMetrics(breakevenHigh, a)
  
  if (lowMetrics.monthlyCashFlow > 0 && highMetrics.monthlyCashFlow < 0) {
    for (let i = 0; i < 30; i++) {
      const mid = (breakevenLow + breakevenHigh) / 2
      const midMetrics = calculateSTRMetrics(mid, a)
      
      if (Math.abs(midMetrics.monthlyCashFlow) < 10) {
        breakeven = mid
        break
      } else if (midMetrics.monthlyCashFlow > 0) {
        breakevenLow = mid
      } else {
        breakevenHigh = mid
      }
      breakeven = mid
    }
  } else if (lowMetrics.monthlyCashFlow <= 0) {
    breakeven = breakevenLow
  } else {
    breakeven = breakevenHigh
  }
  
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`
  
  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    breakeven: Math.round(breakeven / 1000) * 1000,
    breakevenPercent: (breakeven / listPrice) * 100,
    rationale: 'At this price you achieve strong STR',
    highlightedMetric: `${formatCurrency(finalMetrics.monthlyCashFlow)}/mo cash flow`,
    secondaryMetric: formatPercent(finalMetrics.cashOnCash),
    monthlyCashFlow: finalMetrics.monthlyCashFlow,
    cashOnCash: finalMetrics.cashOnCash,
    capRate: finalMetrics.capRate,
    dscr: finalMetrics.dscr
  }
}

/**
 * Calculate IQ Target Price for BRRRR
 * Target: 100% cash recovery (infinite returns)
 */
export function calculateBRRRRTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice
  
  // For BRRRR, target is where cash recovery >= 100%
  let low = listPrice * 0.50
  let high = listPrice * 0.80
  let targetPrice = listPrice * 0.65
  
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const metrics = calculateBRRRRMetrics(mid, a)
    
    // Aim for 95-105% cash recovery
    if (metrics.cashRecoveryPercent >= 95 && metrics.cashRecoveryPercent <= 105) {
      targetPrice = mid
      break
    } else if (metrics.cashRecoveryPercent < 95) {
      high = mid
    } else {
      low = mid
    }
    targetPrice = mid
  }
  
  const finalMetrics = calculateBRRRRMetrics(targetPrice, a)
  
  // Breakeven is where we get 80% cash recovery using binary search
  let breakevenLow = listPrice * 0.30
  let breakevenHigh = listPrice * 0.90
  let breakeven = targetPrice
  
  const lowMetrics = calculateBRRRRMetrics(breakevenLow, a)
  const highMetrics = calculateBRRRRMetrics(breakevenHigh, a)
  
  // Target 80% recovery as breakeven
  const targetRecovery = 80
  if (lowMetrics.cashRecoveryPercent > targetRecovery && highMetrics.cashRecoveryPercent < targetRecovery) {
    for (let i = 0; i < 30; i++) {
      const mid = (breakevenLow + breakevenHigh) / 2
      const midMetrics = calculateBRRRRMetrics(mid, a)
      
      if (Math.abs(midMetrics.cashRecoveryPercent - targetRecovery) < 2) {
        breakeven = mid
        break
      } else if (midMetrics.cashRecoveryPercent > targetRecovery) {
        breakevenLow = mid
      } else {
        breakevenHigh = mid
      }
      breakeven = mid
    }
  } else if (lowMetrics.cashRecoveryPercent <= targetRecovery) {
    breakeven = breakevenLow
  } else {
    breakeven = breakevenHigh
  }
  
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  
  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    breakeven: Math.round(breakeven / 1000) * 1000,
    breakevenPercent: (breakeven / listPrice) * 100,
    rationale: 'At this price you recover',
    highlightedMetric: `${Math.round(finalMetrics.cashRecoveryPercent)}% of your cash`,
    secondaryMetric: `${formatCurrency(finalMetrics.equityCreated)} equity`,
    monthlyCashFlow: finalMetrics.monthlyCashFlow,
    cashOnCash: finalMetrics.cashOnCash,
    capRate: 0,
    dscr: 0,
    cashLeftInDeal: finalMetrics.cashLeftInDeal,
    cashRecoveryPercent: finalMetrics.cashRecoveryPercent,
    equityCreated: finalMetrics.equityCreated
  }
}

/**
 * Calculate IQ Target Price for Fix & Flip
 * Target: $30K+ profit with 25%+ ROI
 */
export function calculateFlipTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice
  
  // For flip, use 70% rule as baseline, then refine
  const maxPer70Rule = (a.arv * 0.70) - a.rehabCost
  let targetPrice = Math.min(maxPer70Rule, listPrice * 0.75)
  
  // Find price that yields $30K+ profit
  let low = listPrice * 0.50
  let high = Math.min(maxPer70Rule, listPrice)
  
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const metrics = calculateFlipMetrics(mid, a)
    
    if (metrics.netProfit >= 30000 && metrics.netProfit <= 80000) {
      targetPrice = mid
      break
    } else if (metrics.netProfit < 30000) {
      high = mid
    } else {
      low = mid
    }
    targetPrice = mid
  }
  
  const finalMetrics = calculateFlipMetrics(targetPrice, a)
  
  // Breakeven is where profit = 0 using binary search
  let breakevenLow = listPrice * 0.30
  let breakevenHigh = listPrice * 1.10
  let breakeven = targetPrice
  
  const lowMetrics = calculateFlipMetrics(breakevenLow, a)
  const highMetrics = calculateFlipMetrics(breakevenHigh, a)
  
  if (lowMetrics.netProfit > 0 && highMetrics.netProfit < 0) {
    for (let i = 0; i < 30; i++) {
      const mid = (breakevenLow + breakevenHigh) / 2
      const midMetrics = calculateFlipMetrics(mid, a)
      
      if (Math.abs(midMetrics.netProfit) < 1000) {
        breakeven = mid
        break
      } else if (midMetrics.netProfit > 0) {
        breakevenLow = mid
      } else {
        breakevenHigh = mid
      }
      breakeven = mid
    }
  } else if (lowMetrics.netProfit <= 0) {
    breakeven = breakevenLow
  } else {
    breakeven = breakevenHigh
  }
  
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`
  
  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    breakeven: Math.round(breakeven / 1000) * 1000,
    breakevenPercent: (breakeven / listPrice) * 100,
    rationale: 'At this price you achieve',
    highlightedMetric: formatCurrency(finalMetrics.netProfit) + ' profit',
    secondaryMetric: formatPercent(finalMetrics.roi) + ' ROI',
    monthlyCashFlow: 0,
    cashOnCash: 0,
    capRate: 0,
    dscr: 0,
    netProfit: finalMetrics.netProfit,
    roi: finalMetrics.roi
  }
}

/**
 * Calculate IQ Target Price for House Hack
 * Target: $0 or negative housing cost (free living)
 */
export function calculateHouseHackTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice
  
  // Target is where effective housing cost <= $0
  let low = listPrice * 0.60
  let high = listPrice
  let targetPrice = listPrice * 0.85
  
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const metrics = calculateHouseHackMetrics(mid, a)
    
    // Aim for $0-$200 effective cost
    if (metrics.effectiveHousingCost <= 200 && metrics.effectiveHousingCost >= -200) {
      targetPrice = mid
      break
    } else if (metrics.effectiveHousingCost > 200) {
      high = mid
    } else {
      low = mid
    }
    targetPrice = mid
  }
  
  const finalMetrics = calculateHouseHackMetrics(targetPrice, a)
  
  // Breakeven is where housing cost equals typical rent using binary search
  const typicalRent = a.monthlyRent / a.totalBedrooms * 1.2
  let breakevenLow = listPrice * 0.30
  let breakevenHigh = listPrice * 1.10
  let breakeven = targetPrice
  
  const lowMetrics = calculateHouseHackMetrics(breakevenLow, a)
  const highMetrics = calculateHouseHackMetrics(breakevenHigh, a)
  
  // For house hack, breakeven is where effective cost = typical rent
  if (lowMetrics.effectiveHousingCost < typicalRent && highMetrics.effectiveHousingCost > typicalRent) {
    for (let i = 0; i < 30; i++) {
      const mid = (breakevenLow + breakevenHigh) / 2
      const midMetrics = calculateHouseHackMetrics(mid, a)
      
      if (Math.abs(midMetrics.effectiveHousingCost - typicalRent) < 50) {
        breakeven = mid
        break
      } else if (midMetrics.effectiveHousingCost < typicalRent) {
        breakevenLow = mid
      } else {
        breakevenHigh = mid
      }
      breakeven = mid
    }
  } else if (lowMetrics.effectiveHousingCost >= typicalRent) {
    breakeven = breakevenLow
  } else {
    breakeven = breakevenHigh
  }
  
  const formatCurrency = (v: number) => `$${Math.abs(Math.round(v)).toLocaleString()}`
  
  const isFreeHousing = finalMetrics.effectiveHousingCost <= 0
  
  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    breakeven: Math.round(breakeven / 1000) * 1000,
    breakevenPercent: (breakeven / listPrice) * 100,
    rationale: isFreeHousing ? 'At this price you live for' : 'At this price your housing cost is only',
    highlightedMetric: isFreeHousing ? 'FREE' : `${formatCurrency(finalMetrics.effectiveHousingCost)}/mo`,
    secondaryMetric: `Save ${formatCurrency(finalMetrics.monthlySavings)}/mo`,
    monthlyCashFlow: 0,
    cashOnCash: 0,
    capRate: 0,
    dscr: 0,
    effectiveHousingCost: finalMetrics.effectiveHousingCost,
    monthlySavings: finalMetrics.monthlySavings
  }
}

/**
 * Calculate IQ Target Price for Wholesale
 * Target: $10K+ assignment fee
 */
export function calculateWholesaleTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice
  
  // MAO is the ceiling - find price that leaves $10K+ fee
  const maoCalc = calculateWholesaleMetrics(listPrice, a)
  const mao = maoCalc.mao
  
  // Target = MAO - desired assignment fee
  let targetPrice = mao - 12000 // Leave $12K assignment fee room
  targetPrice = Math.max(targetPrice, listPrice * 0.50) // Don't go below 50% of list
  
  const finalMetrics = calculateWholesaleMetrics(targetPrice, a)
  
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  
  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    breakeven: Math.round(mao / 1000) * 1000, // MAO is breakeven for wholesale
    breakevenPercent: (mao / listPrice) * 100,
    rationale: 'At this price you earn',
    highlightedMetric: formatCurrency(finalMetrics.assignmentFee) + ' assignment fee',
    secondaryMetric: `${Math.round(finalMetrics.roiOnEMD)}% ROI on EMD`,
    monthlyCashFlow: 0,
    cashOnCash: 0,
    capRate: 0,
    dscr: 0,
    assignmentFee: finalMetrics.assignmentFee,
    mao: mao
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'

export function calculateIQTarget(strategyId: StrategyId, assumptions: TargetAssumptions): IQTargetResult {
  switch (strategyId) {
    case 'ltr':
      return calculateLTRTarget(assumptions)
    case 'str':
      return calculateSTRTarget(assumptions)
    case 'brrrr':
      return calculateBRRRRTarget(assumptions)
    case 'flip':
      return calculateFlipTarget(assumptions)
    case 'house_hack':
      return calculateHouseHackTarget(assumptions)
    case 'wholesale':
      return calculateWholesaleTarget(assumptions)
    default:
      return calculateLTRTarget(assumptions)
  }
}

/**
 * Get metrics at a specific price point (for comparison views)
 */
export function getMetricsAtPrice(
  strategyId: StrategyId, 
  purchasePrice: number, 
  assumptions: TargetAssumptions
) {
  switch (strategyId) {
    case 'ltr':
      return calculateLTRMetrics(purchasePrice, assumptions)
    case 'str':
      return calculateSTRMetrics(purchasePrice, assumptions)
    case 'brrrr':
      return calculateBRRRRMetrics(purchasePrice, assumptions)
    case 'flip':
      return calculateFlipMetrics(purchasePrice, assumptions)
    case 'house_hack':
      return calculateHouseHackMetrics(purchasePrice, assumptions)
    case 'wholesale':
      return calculateWholesaleMetrics(purchasePrice, assumptions)
    default:
      return calculateLTRMetrics(purchasePrice, assumptions)
  }
}
