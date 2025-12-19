/**
 * DealScope - Deal Scoring & Sensitivity Analysis
 */

// ============================================
// DEAL SCORE CALCULATION
// ============================================

export interface DealScoreBreakdown {
  overall: number
  cashFlow: number
  cashOnCash: number
  capRate: number
  onePercentRule: number
  dscr: number
  equityPotential: number
  riskLevel: number
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
  verdict: string
  strengths: string[]
  weaknesses: string[]
}

export interface DealMetrics {
  monthlyCashFlow: number
  cashOnCash: number
  capRate: number
  onePercentRule: number
  dscr: number
  purchasePrice: number
  arv: number
  totalCashRequired: number
  monthlyRent: number
}

export function calculateDealScore(metrics: DealMetrics): DealScoreBreakdown {
  const strengths: string[] = []
  const weaknesses: string[] = []
  
  // Cash Flow Score (0-20 points)
  // $0 = 0pts, $200 = 10pts, $500+ = 20pts
  let cashFlowScore = 0
  if (metrics.monthlyCashFlow >= 500) {
    cashFlowScore = 20
    strengths.push('Excellent cash flow')
  } else if (metrics.monthlyCashFlow >= 300) {
    cashFlowScore = 16
    strengths.push('Strong cash flow')
  } else if (metrics.monthlyCashFlow >= 200) {
    cashFlowScore = 12
  } else if (metrics.monthlyCashFlow >= 100) {
    cashFlowScore = 8
  } else if (metrics.monthlyCashFlow >= 0) {
    cashFlowScore = 4
    weaknesses.push('Low cash flow')
  } else {
    cashFlowScore = 0
    weaknesses.push('Negative cash flow')
  }
  
  // Cash-on-Cash Score (0-20 points)
  // 0% = 0pts, 8% = 10pts, 12%+ = 20pts
  let cocScore = 0
  if (metrics.cashOnCash >= 0.15) {
    cocScore = 20
    strengths.push('Outstanding CoC return')
  } else if (metrics.cashOnCash >= 0.12) {
    cocScore = 18
    strengths.push('Excellent CoC return')
  } else if (metrics.cashOnCash >= 0.10) {
    cocScore = 15
    strengths.push('Good CoC return')
  } else if (metrics.cashOnCash >= 0.08) {
    cocScore = 12
  } else if (metrics.cashOnCash >= 0.05) {
    cocScore = 8
    weaknesses.push('Below-average CoC return')
  } else {
    cocScore = Math.max(0, metrics.cashOnCash * 100)
    weaknesses.push('Poor CoC return')
  }
  
  // Cap Rate Score (0-15 points)
  let capRateScore = 0
  if (metrics.capRate >= 0.08) {
    capRateScore = 15
    strengths.push('High cap rate')
  } else if (metrics.capRate >= 0.06) {
    capRateScore = 12
  } else if (metrics.capRate >= 0.05) {
    capRateScore = 9
  } else if (metrics.capRate >= 0.04) {
    capRateScore = 6
    weaknesses.push('Low cap rate')
  } else {
    capRateScore = 3
    weaknesses.push('Very low cap rate')
  }
  
  // 1% Rule Score (0-15 points)
  let onePercentScore = 0
  if (metrics.onePercentRule >= 0.012) {
    onePercentScore = 15
    strengths.push('Exceeds 1% rule')
  } else if (metrics.onePercentRule >= 0.01) {
    onePercentScore = 12
    strengths.push('Meets 1% rule')
  } else if (metrics.onePercentRule >= 0.008) {
    onePercentScore = 8
  } else if (metrics.onePercentRule >= 0.006) {
    onePercentScore = 4
    weaknesses.push('Below 1% rule')
  } else {
    onePercentScore = 0
    weaknesses.push('Far below 1% rule')
  }
  
  // DSCR Score (0-15 points)
  let dscrScore = 0
  if (metrics.dscr >= 1.5) {
    dscrScore = 15
    strengths.push('Strong debt coverage')
  } else if (metrics.dscr >= 1.25) {
    dscrScore = 12
  } else if (metrics.dscr >= 1.1) {
    dscrScore = 8
  } else if (metrics.dscr >= 1.0) {
    dscrScore = 5
    weaknesses.push('Tight debt coverage')
  } else {
    dscrScore = 0
    weaknesses.push('Insufficient debt coverage')
  }
  
  // Equity Potential Score (0-10 points)
  const equityUpside = metrics.arv > metrics.purchasePrice 
    ? (metrics.arv - metrics.purchasePrice) / metrics.purchasePrice 
    : 0
  let equityScore = 0
  if (equityUpside >= 0.20) {
    equityScore = 10
    strengths.push('High equity potential')
  } else if (equityUpside >= 0.10) {
    equityScore = 7
  } else if (equityUpside >= 0.05) {
    equityScore = 4
  } else {
    equityScore = 2
  }
  
  // Risk Score (0-5 points) - based on cash cushion
  const cashCushion = metrics.totalCashRequired > 0 
    ? (metrics.monthlyCashFlow * 12) / metrics.totalCashRequired 
    : 0
  let riskScore = 0
  if (cashCushion >= 0.10) {
    riskScore = 5
  } else if (cashCushion >= 0.05) {
    riskScore = 3
  } else {
    riskScore = 1
    if (metrics.monthlyCashFlow < 100) weaknesses.push('Low cash cushion')
  }
  
  // Calculate overall score
  const overall = Math.round(
    cashFlowScore + cocScore + capRateScore + onePercentScore + dscrScore + equityScore + riskScore
  )
  
  // Determine grade
  let grade: DealScoreBreakdown['grade']
  let verdict: string
  
  if (overall >= 90) {
    grade = 'A+'
    verdict = 'Exceptional deal - Act fast!'
  } else if (overall >= 80) {
    grade = 'A'
    verdict = 'Excellent deal - Strongly consider'
  } else if (overall >= 70) {
    grade = 'B+'
    verdict = 'Good deal - Worth pursuing'
  } else if (overall >= 60) {
    grade = 'B'
    verdict = 'Decent deal - Proceed with caution'
  } else if (overall >= 50) {
    grade = 'C+'
    verdict = 'Average deal - Negotiate harder'
  } else if (overall >= 40) {
    grade = 'C'
    verdict = 'Below average - Consider alternatives'
  } else if (overall >= 30) {
    grade = 'D'
    verdict = 'Poor deal - Not recommended'
  } else {
    grade = 'F'
    verdict = 'Bad deal - Walk away'
  }
  
  return {
    overall,
    cashFlow: cashFlowScore,
    cashOnCash: cocScore,
    capRate: capRateScore,
    onePercentRule: onePercentScore,
    dscr: dscrScore,
    equityPotential: equityScore,
    riskLevel: riskScore,
    grade,
    verdict,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4)
  }
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

export interface SensitivityPoint {
  value: number
  cashFlow: number
  cashOnCash: number
  capRate: number
}

export interface SensitivityAnalysis {
  interestRate: SensitivityPoint[]
  purchasePrice: SensitivityPoint[]
  rent: SensitivityPoint[]
  vacancy: SensitivityPoint[]
}

export interface BaseAssumptions {
  purchasePrice: number
  downPaymentPct: number
  interestRate: number
  loanTermYears: number
  monthlyRent: number
  propertyTaxes: number
  insurance: number
  vacancyRate: number
  managementPct: number
  maintenancePct: number
}

function calculateMetricsForScenario(
  assumptions: BaseAssumptions
): { cashFlow: number; cashOnCash: number; capRate: number } {
  const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct
  const closingCosts = assumptions.purchasePrice * 0.03
  const loanAmount = assumptions.purchasePrice - downPayment
  const totalCashRequired = downPayment + closingCosts
  
  // Monthly mortgage
  const monthlyRate = assumptions.interestRate / 12
  const numPayments = assumptions.loanTermYears * 12
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  const annualDebtService = monthlyPI * 12
  
  // Income
  const annualRent = assumptions.monthlyRent * 12
  const effectiveRent = annualRent * (1 - assumptions.vacancyRate)
  
  // Expenses
  const opEx = assumptions.propertyTaxes + assumptions.insurance + 
    annualRent * (assumptions.managementPct + assumptions.maintenancePct)
  
  const noi = effectiveRent - opEx
  const annualCashFlow = noi - annualDebtService
  
  return {
    cashFlow: annualCashFlow / 12,
    cashOnCash: totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0,
    capRate: assumptions.purchasePrice > 0 ? noi / assumptions.purchasePrice : 0
  }
}

export function calculateSensitivityAnalysis(
  baseAssumptions: BaseAssumptions
): SensitivityAnalysis {
  // Interest Rate Sensitivity: -1.5% to +1.5%
  const interestRatePoints: SensitivityPoint[] = []
  for (let delta = -0.015; delta <= 0.015; delta += 0.005) {
    const rate = Math.max(0.01, baseAssumptions.interestRate + delta)
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      interestRate: rate
    })
    interestRatePoints.push({
      value: rate,
      ...metrics
    })
  }
  
  // Purchase Price Sensitivity: -15% to +15%
  const pricePoints: SensitivityPoint[] = []
  for (let pct = -0.15; pct <= 0.15; pct += 0.05) {
    const price = baseAssumptions.purchasePrice * (1 + pct)
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      purchasePrice: price
    })
    pricePoints.push({
      value: price,
      ...metrics
    })
  }
  
  // Rent Sensitivity: -15% to +15%
  const rentPoints: SensitivityPoint[] = []
  for (let pct = -0.15; pct <= 0.15; pct += 0.05) {
    const rent = baseAssumptions.monthlyRent * (1 + pct)
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      monthlyRent: rent
    })
    rentPoints.push({
      value: rent,
      ...metrics
    })
  }
  
  // Vacancy Sensitivity: 0% to 15%
  const vacancyPoints: SensitivityPoint[] = []
  for (let vac = 0; vac <= 0.15; vac += 0.025) {
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      vacancyRate: vac
    })
    vacancyPoints.push({
      value: vac,
      ...metrics
    })
  }
  
  return {
    interestRate: interestRatePoints,
    purchasePrice: pricePoints,
    rent: rentPoints,
    vacancy: vacancyPoints
  }
}

// ============================================
// REHAB ESTIMATOR
// ============================================

export interface RehabCategory {
  id: string
  name: string
  icon: string
  items: RehabItem[]
}

export interface RehabItem {
  id: string
  name: string
  lowCost: number
  midCost: number
  highCost: number
  unit: string
  defaultQuantity: number
}

export interface RehabSelection {
  itemId: string
  quantity: number
  tier: 'low' | 'mid' | 'high'
}

export interface RehabEstimate {
  totalCost: number
  breakdown: {
    category: string
    cost: number
  }[]
  contingency: number
  grandTotal: number
}

export const REHAB_CATEGORIES: RehabCategory[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    items: [
      { id: 'cabinets', name: 'Cabinets', lowCost: 3000, midCost: 8000, highCost: 20000, unit: 'kitchen', defaultQuantity: 1 },
      { id: 'countertops', name: 'Countertops', lowCost: 1500, midCost: 4000, highCost: 10000, unit: 'kitchen', defaultQuantity: 1 },
      { id: 'appliances', name: 'Appliances Package', lowCost: 2000, midCost: 5000, highCost: 15000, unit: 'set', defaultQuantity: 1 },
      { id: 'backsplash', name: 'Backsplash', lowCost: 400, midCost: 1200, highCost: 3000, unit: 'kitchen', defaultQuantity: 1 },
      { id: 'sink_faucet', name: 'Sink & Faucet', lowCost: 300, midCost: 800, highCost: 2000, unit: 'each', defaultQuantity: 1 },
    ]
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    items: [
      { id: 'full_bath', name: 'Full Bath Remodel', lowCost: 5000, midCost: 12000, highCost: 30000, unit: 'bathroom', defaultQuantity: 1 },
      { id: 'half_bath', name: 'Half Bath Remodel', lowCost: 2500, midCost: 6000, highCost: 15000, unit: 'bathroom', defaultQuantity: 1 },
      { id: 'vanity', name: 'Vanity & Sink', lowCost: 300, midCost: 800, highCost: 2500, unit: 'each', defaultQuantity: 1 },
      { id: 'toilet', name: 'Toilet', lowCost: 150, midCost: 400, highCost: 1000, unit: 'each', defaultQuantity: 1 },
      { id: 'tub_shower', name: 'Tub/Shower', lowCost: 500, midCost: 2000, highCost: 6000, unit: 'each', defaultQuantity: 1 },
    ]
  },
  {
    id: 'flooring',
    name: 'Flooring',
    icon: '🏠',
    items: [
      { id: 'lvp', name: 'Luxury Vinyl Plank', lowCost: 3, midCost: 6, highCost: 10, unit: 'sqft', defaultQuantity: 1500 },
      { id: 'hardwood', name: 'Hardwood', lowCost: 6, midCost: 12, highCost: 20, unit: 'sqft', defaultQuantity: 1500 },
      { id: 'tile', name: 'Tile', lowCost: 5, midCost: 10, highCost: 20, unit: 'sqft', defaultQuantity: 200 },
      { id: 'carpet', name: 'Carpet', lowCost: 2, midCost: 5, highCost: 10, unit: 'sqft', defaultQuantity: 500 },
    ]
  },
  {
    id: 'paint',
    name: 'Paint & Walls',
    icon: '🎨',
    items: [
      { id: 'interior_paint', name: 'Interior Paint', lowCost: 1.5, midCost: 3, highCost: 5, unit: 'sqft', defaultQuantity: 2000 },
      { id: 'exterior_paint', name: 'Exterior Paint', lowCost: 2000, midCost: 5000, highCost: 12000, unit: 'house', defaultQuantity: 1 },
      { id: 'drywall_repair', name: 'Drywall Repair', lowCost: 200, midCost: 500, highCost: 1500, unit: 'room', defaultQuantity: 3 },
    ]
  },
  {
    id: 'systems',
    name: 'Major Systems',
    icon: '⚡',
    items: [
      { id: 'hvac', name: 'HVAC System', lowCost: 4000, midCost: 8000, highCost: 15000, unit: 'system', defaultQuantity: 1 },
      { id: 'water_heater', name: 'Water Heater', lowCost: 800, midCost: 1500, highCost: 3500, unit: 'each', defaultQuantity: 1 },
      { id: 'electrical_panel', name: 'Electrical Panel', lowCost: 1500, midCost: 3000, highCost: 6000, unit: 'panel', defaultQuantity: 1 },
      { id: 'plumbing_repipe', name: 'Plumbing Repipe', lowCost: 4000, midCost: 8000, highCost: 15000, unit: 'house', defaultQuantity: 1 },
    ]
  },
  {
    id: 'exterior',
    name: 'Exterior',
    icon: '🏡',
    items: [
      { id: 'roof', name: 'Roof Replacement', lowCost: 8000, midCost: 15000, highCost: 30000, unit: 'roof', defaultQuantity: 1 },
      { id: 'siding', name: 'Siding', lowCost: 5000, midCost: 12000, highCost: 25000, unit: 'house', defaultQuantity: 1 },
      { id: 'windows', name: 'Windows', lowCost: 300, midCost: 600, highCost: 1200, unit: 'each', defaultQuantity: 10 },
      { id: 'front_door', name: 'Front Door', lowCost: 500, midCost: 1500, highCost: 4000, unit: 'each', defaultQuantity: 1 },
      { id: 'landscaping', name: 'Landscaping', lowCost: 1000, midCost: 3000, highCost: 10000, unit: 'yard', defaultQuantity: 1 },
    ]
  },
  {
    id: 'other',
    name: 'Other',
    icon: '🔧',
    items: [
      { id: 'permits', name: 'Permits', lowCost: 500, midCost: 1500, highCost: 5000, unit: 'project', defaultQuantity: 1 },
      { id: 'dumpster', name: 'Dumpster Rental', lowCost: 400, midCost: 600, highCost: 1000, unit: 'load', defaultQuantity: 2 },
      { id: 'cleaning', name: 'Deep Cleaning', lowCost: 200, midCost: 500, highCost: 1000, unit: 'house', defaultQuantity: 1 },
      { id: 'staging', name: 'Staging', lowCost: 500, midCost: 2000, highCost: 5000, unit: 'house', defaultQuantity: 1 },
    ]
  }
]

export function calculateRehabEstimate(
  selections: RehabSelection[],
  contingencyPct: number = 0.10
): RehabEstimate {
  const breakdown: { category: string; cost: number }[] = []
  let totalCost = 0
  
  // Group by category
  const categoryTotals: Record<string, number> = {}
  
  for (const selection of selections) {
    // Find the item
    let foundItem: RehabItem | null = null
    let foundCategory = ''
    
    for (const cat of REHAB_CATEGORIES) {
      const item = cat.items.find(i => i.id === selection.itemId)
      if (item) {
        foundItem = item
        foundCategory = cat.name
        break
      }
    }
    
    if (foundItem) {
      const unitCost = selection.tier === 'low' ? foundItem.lowCost :
                       selection.tier === 'mid' ? foundItem.midCost :
                       foundItem.highCost
      const itemTotal = unitCost * selection.quantity
      totalCost += itemTotal
      
      categoryTotals[foundCategory] = (categoryTotals[foundCategory] || 0) + itemTotal
    }
  }
  
  // Convert to breakdown array
  for (const [category, cost] of Object.entries(categoryTotals)) {
    breakdown.push({ category, cost })
  }
  
  // Sort by cost descending
  breakdown.sort((a, b) => b.cost - a.cost)
  
  const contingency = totalCost * contingencyPct
  
  return {
    totalCost,
    breakdown,
    contingency,
    grandTotal: totalCost + contingency
  }
}

// Quick rehab presets
export interface RehabPreset {
  id: string
  name: string
  description: string
  estimatedCost: { low: number; mid: number; high: number }
  selections: RehabSelection[]
}

export const REHAB_PRESETS: RehabPreset[] = [
  {
    id: 'cosmetic',
    name: 'Cosmetic Refresh',
    description: 'Paint, flooring, light fixtures',
    estimatedCost: { low: 8000, mid: 15000, high: 25000 },
    selections: [
      { itemId: 'interior_paint', quantity: 2000, tier: 'mid' },
      { itemId: 'lvp', quantity: 1200, tier: 'mid' },
      { itemId: 'cleaning', quantity: 1, tier: 'mid' },
    ]
  },
  {
    id: 'light',
    name: 'Light Rehab',
    description: 'Cosmetic + kitchen/bath updates',
    estimatedCost: { low: 20000, mid: 35000, high: 55000 },
    selections: [
      { itemId: 'interior_paint', quantity: 2000, tier: 'mid' },
      { itemId: 'lvp', quantity: 1500, tier: 'mid' },
      { itemId: 'countertops', quantity: 1, tier: 'mid' },
      { itemId: 'appliances', quantity: 1, tier: 'mid' },
      { itemId: 'vanity', quantity: 2, tier: 'mid' },
      { itemId: 'cleaning', quantity: 1, tier: 'mid' },
    ]
  },
  {
    id: 'medium',
    name: 'Medium Rehab',
    description: 'Full kitchen/bath remodel + flooring',
    estimatedCost: { low: 40000, mid: 65000, high: 100000 },
    selections: [
      { itemId: 'interior_paint', quantity: 2500, tier: 'mid' },
      { itemId: 'lvp', quantity: 1800, tier: 'mid' },
      { itemId: 'cabinets', quantity: 1, tier: 'mid' },
      { itemId: 'countertops', quantity: 1, tier: 'mid' },
      { itemId: 'appliances', quantity: 1, tier: 'mid' },
      { itemId: 'full_bath', quantity: 2, tier: 'mid' },
      { itemId: 'windows', quantity: 8, tier: 'mid' },
      { itemId: 'permits', quantity: 1, tier: 'mid' },
    ]
  },
  {
    id: 'heavy',
    name: 'Heavy Rehab',
    description: 'Everything + systems',
    estimatedCost: { low: 80000, mid: 120000, high: 180000 },
    selections: [
      { itemId: 'interior_paint', quantity: 3000, tier: 'mid' },
      { itemId: 'exterior_paint', quantity: 1, tier: 'mid' },
      { itemId: 'hardwood', quantity: 1500, tier: 'mid' },
      { itemId: 'tile', quantity: 300, tier: 'mid' },
      { itemId: 'cabinets', quantity: 1, tier: 'high' },
      { itemId: 'countertops', quantity: 1, tier: 'high' },
      { itemId: 'appliances', quantity: 1, tier: 'high' },
      { itemId: 'full_bath', quantity: 2, tier: 'high' },
      { itemId: 'half_bath', quantity: 1, tier: 'mid' },
      { itemId: 'hvac', quantity: 1, tier: 'mid' },
      { itemId: 'water_heater', quantity: 1, tier: 'mid' },
      { itemId: 'roof', quantity: 1, tier: 'mid' },
      { itemId: 'windows', quantity: 15, tier: 'mid' },
      { itemId: 'permits', quantity: 1, tier: 'high' },
      { itemId: 'dumpster', quantity: 3, tier: 'mid' },
    ]
  }
]
