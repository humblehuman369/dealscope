/**
 * Short-Term Rental (STR) Calculations
 * Airbnb/VRBO style rental analysis for Deal Maker IQ
 * 
 * Based on mobile/components/analytics/strategies/strCalculations.ts
 * Adapted for web frontend with STRDealMakerState interface
 */

import { 
  STRDealMakerState, 
  STRMetrics, 
  STRMonthlyExpenses,
  DealGrade,
  ProfitGrade 
} from '../types'

/**
 * Calculate mortgage payment using standard amortization formula
 */
function calculateMortgagePayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  return isFinite(payment) ? payment : 0
}

/**
 * Calculate deal grade based on score
 */
function getDealGrade(score: number): DealGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

/**
 * Calculate profit quality grade based on cash-on-cash return
 */
function getProfitGrade(cocReturn: number): ProfitGrade {
  // STR should have higher CoC expectations (15%+ vs 10%+ for LTR)
  if (cocReturn >= 25) return 'A+'
  if (cocReturn >= 20) return 'A'
  if (cocReturn >= 15) return 'B'
  if (cocReturn >= 10) return 'C'
  if (cocReturn >= 5) return 'D'
  return 'F'
}

/**
 * Calculate STR deal score (0-100)
 */
export function calculateSTRScore(
  cocReturn: number, 
  occupancyRate: number, 
  revPAR: number, 
  monthlyCashFlow: number,
  monthlyGrossRevenue: number
): number {
  let score = 0

  // Cash-on-Cash (max 25 points) - STR should be higher than LTR
  if (cocReturn >= 25) score += 25
  else if (cocReturn >= 15) score += 20 + (cocReturn - 15) * 0.5
  else if (cocReturn >= 10) score += 10 + (cocReturn - 10)
  else score += Math.max(0, cocReturn)

  // Occupancy (max 20 points)
  const occScore = Math.min(20, (occupancyRate / 0.80) * 20)
  score += occScore

  // RevPAR (max 20 points)
  if (revPAR >= 250) score += 20
  else if (revPAR >= 150) score += 12 + (revPAR - 150) * 0.08
  else score += Math.max(0, revPAR * 0.08)

  // Monthly cash flow (max 20 points)
  if (monthlyCashFlow >= 2000) score += 20
  else if (monthlyCashFlow >= 1000) score += 12 + (monthlyCashFlow - 1000) * 0.008
  else if (monthlyCashFlow > 0) score += monthlyCashFlow * 0.012

  // Expense ratio (max 15 points) - lower is better
  const expenseRatio = monthlyGrossRevenue > 0 
    ? (monthlyGrossRevenue - monthlyCashFlow) / monthlyGrossRevenue 
    : 1
  if (expenseRatio <= 0.50) score += 15
  else if (expenseRatio <= 0.65) score += 10 + (0.65 - expenseRatio) * 33
  else if (expenseRatio <= 0.80) score += (0.80 - expenseRatio) * 66

  return Math.round(Math.min(100, score))
}

/**
 * Calculate STR metrics from state
 */
export function calculateSTRMetrics(state: STRDealMakerState): STRMetrics {
  const {
    buyPrice,
    downPaymentPercent,
    closingCostsPercent,
    interestRate,
    loanTermYears,
    rehabBudget,
    arv,
    furnitureSetupCost,
    averageDailyRate,
    occupancyRate,
    cleaningFeeRevenue,
    avgLengthOfStayDays,
    platformFeeRate,
    strManagementRate,
    cleaningCostPerTurnover,
    suppliesMonthly,
    additionalUtilitiesMonthly,
    maintenanceRate,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
  } = state

  // ==========================================================================
  // INVESTMENT CALCULATIONS
  // ==========================================================================
  
  const downPaymentAmount = buyPrice * downPaymentPercent
  const closingCostsAmount = buyPrice * closingCostsPercent
  const loanAmount = buyPrice - downPaymentAmount
  
  // Total cash needed includes furniture for STR
  const cashNeeded = downPaymentAmount + closingCostsAmount + furnitureSetupCost
  const totalInvestmentWithFurniture = cashNeeded + rehabBudget
  
  // Mortgage payment
  const monthlyPayment = calculateMortgagePayment(loanAmount, interestRate, loanTermYears)

  // ==========================================================================
  // REVENUE CALCULATIONS
  // ==========================================================================
  
  const daysPerMonth = 30.44
  const daysPerYear = 365
  
  // Nights occupied and turnovers
  const nightsOccupied = daysPerYear * occupancyRate
  const numberOfTurnovers = Math.floor(nightsOccupied / avgLengthOfStayDays)
  
  // Revenue components
  const rentalRevenue = averageDailyRate * nightsOccupied
  const cleaningRevenue = cleaningFeeRevenue * numberOfTurnovers
  const annualGrossRevenue = rentalRevenue + cleaningRevenue
  const monthlyGrossRevenue = annualGrossRevenue / 12
  
  // RevPAR (Revenue Per Available Room/Night)
  const revPAR = annualGrossRevenue / daysPerYear
  const grossNightlyRevenue = monthlyGrossRevenue / daysPerMonth

  // ==========================================================================
  // EXPENSE CALCULATIONS
  // ==========================================================================
  
  // Fixed monthly expenses
  const monthlyTaxes = annualPropertyTax / 12
  const monthlyInsurance = annualInsurance / 12
  
  // Variable expenses (based on revenue or turnovers)
  const monthlyPlatformFees = monthlyGrossRevenue * platformFeeRate
  const monthlyManagement = monthlyGrossRevenue * strManagementRate
  const monthlyCleaning = (cleaningCostPerTurnover * numberOfTurnovers) / 12
  const monthlyMaintenance = (buyPrice * maintenanceRate) / 12
  
  // Build monthly expenses object
  const monthlyExpenses: STRMonthlyExpenses = {
    mortgage: monthlyPayment,
    taxes: monthlyTaxes,
    insurance: monthlyInsurance,
    hoa: monthlyHoa,
    utilities: additionalUtilitiesMonthly,
    maintenance: monthlyMaintenance,
    management: monthlyManagement,
    platformFees: monthlyPlatformFees,
    cleaning: monthlyCleaning,
    supplies: suppliesMonthly,
  }
  
  const totalMonthlyExpenses = Object.values(monthlyExpenses).reduce((a, b) => a + b, 0)
  const totalAnnualExpenses = totalMonthlyExpenses * 12

  // ==========================================================================
  // PERFORMANCE METRICS
  // ==========================================================================
  
  // Cash flow
  const monthlyCashFlow = monthlyGrossRevenue - totalMonthlyExpenses
  const annualCashFlow = monthlyCashFlow * 12
  
  // NOI (Net Operating Income) - excludes mortgage
  const operatingExpenses = totalMonthlyExpenses - monthlyPayment
  const noi = annualGrossRevenue - (operatingExpenses * 12)
  
  // Returns
  const capRate = buyPrice > 0 ? (noi / buyPrice) * 100 : 0
  const cocReturn = cashNeeded > 0 ? (annualCashFlow / cashNeeded) * 100 : 0
  
  // Equity created (ARV - buy price - rehab - furniture)
  const equityCreated = arv - buyPrice - rehabBudget - furnitureSetupCost

  // ==========================================================================
  // BREAK-EVEN OCCUPANCY
  // ==========================================================================
  
  // Calculate break-even occupancy (what occupancy is needed to cover all costs)
  // Fixed costs = mortgage + taxes + insurance + hoa + supplies
  const fixedMonthlyCosts = monthlyPayment + monthlyTaxes + monthlyInsurance + monthlyHoa + suppliesMonthly
  
  // Variable cost per occupied night
  const variableCostPerNight = averageDailyRate * (platformFeeRate + strManagementRate) + 
    (cleaningCostPerTurnover / avgLengthOfStayDays)
  
  // Revenue per night (ADR + cleaning fee amortized over stay)
  const revenuePerNight = averageDailyRate + (cleaningFeeRevenue / avgLengthOfStayDays)
  
  // Net revenue per night after variable costs
  const netRevenuePerNight = revenuePerNight - variableCostPerNight
  
  // Break-even nights needed per month
  const breakEvenNightsPerMonth = netRevenuePerNight > 0 
    ? fixedMonthlyCosts / netRevenuePerNight 
    : daysPerMonth
  
  // Break-even occupancy rate
  const breakEvenOccupancy = Math.min(1, Math.max(0, breakEvenNightsPerMonth / daysPerMonth))

  // ==========================================================================
  // SCORING
  // ==========================================================================
  
  const dealScore = calculateSTRScore(
    cocReturn, 
    occupancyRate, 
    revPAR, 
    monthlyCashFlow,
    monthlyGrossRevenue
  )
  const dealGrade = getDealGrade(dealScore)
  const profitQuality = getProfitGrade(cocReturn)

  return {
    // Investment
    cashNeeded,
    totalInvestmentWithFurniture,
    downPaymentAmount,
    closingCostsAmount,
    loanAmount,
    monthlyPayment,
    
    // Revenue
    grossNightlyRevenue,
    monthlyGrossRevenue,
    annualGrossRevenue,
    revPAR,
    numberOfTurnovers,
    nightsOccupied,
    
    // Expenses
    monthlyExpenses,
    totalMonthlyExpenses,
    totalAnnualExpenses,
    
    // Performance
    monthlyCashFlow,
    annualCashFlow,
    noi,
    capRate,
    cocReturn,
    breakEvenOccupancy,
    
    // Rehab & Valuation
    equityCreated,
    
    // Scores
    dealScore,
    dealGrade,
    profitQuality,
  }
}

/**
 * Format currency value for display
 */
export function formatSTRCurrency(value: number, showDecimals = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value)
}

/**
 * Format percentage value for display
 */
export function formatSTRPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Get STR-specific insights based on metrics
 */
export interface STRInsight {
  type: 'strength' | 'concern' | 'tip'
  text: string
  highlight?: string
}

export function generateSTRInsights(state: STRDealMakerState, metrics: STRMetrics): STRInsight[] {
  const insights: STRInsight[] = []

  // Occupancy analysis
  if (state.occupancyRate >= 0.75) {
    insights.push({
      type: 'strength',
      text: `Strong ${Math.round(state.occupancyRate * 100)}% occupancy rate`,
      highlight: 'above market average',
    })
  } else if (state.occupancyRate < 0.60) {
    insights.push({
      type: 'concern',
      text: `Low ${Math.round(state.occupancyRate * 100)}% occupancy may indicate seasonality or pricing issues`,
    })
  }

  // RevPAR analysis
  if (metrics.revPAR >= 200) {
    insights.push({
      type: 'strength',
      text: `RevPAR of ${formatSTRCurrency(metrics.revPAR)} is excellent`,
    })
  }

  // Cash-on-Cash analysis
  if (metrics.cocReturn >= 15) {
    insights.push({
      type: 'strength',
      text: `${metrics.cocReturn.toFixed(1)}% CoC return exceeds STR benchmarks`,
    })
  } else if (metrics.cocReturn < 10) {
    insights.push({
      type: 'tip',
      text: 'Consider dynamic pricing to boost ADR during peak seasons',
    })
  }

  // Break-even occupancy analysis
  if (metrics.breakEvenOccupancy > state.occupancyRate) {
    insights.push({
      type: 'concern',
      text: `Break-even requires ${formatSTRPercent(metrics.breakEvenOccupancy)} occupancy - above current estimate`,
    })
  } else if (metrics.breakEvenOccupancy < 0.4) {
    insights.push({
      type: 'strength',
      text: `Low ${formatSTRPercent(metrics.breakEvenOccupancy)} break-even occupancy provides safety margin`,
    })
  }

  // Management fee analysis
  if (state.strManagementRate > 0.20) {
    insights.push({
      type: 'concern',
      text: `${Math.round(state.strManagementRate * 100)}% management fee is high - consider self-managing`,
    })
  }

  // Furnishing ROI
  if (state.furnitureSetupCost > 0 && metrics.annualCashFlow > 0) {
    const furnishingPaybackMonths = (state.furnitureSetupCost / metrics.annualCashFlow) * 12
    if (furnishingPaybackMonths < 12) {
      insights.push({
        type: 'strength',
        text: `Furnishing investment pays back in ${Math.round(furnishingPaybackMonths)} months`,
      })
    }
  }

  return insights.slice(0, 4)
}
