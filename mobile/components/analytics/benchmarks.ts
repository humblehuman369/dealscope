/**
 * Property Analytics Benchmarks
 * Market benchmark data and thresholds
 */

// =============================================================================
// METRIC BENCHMARKS
// =============================================================================

export const BENCHMARKS = {
  cashOnCash: {
    excellent: 12,
    good: 8,
    fair: 5,
    poor: 0,
    label: 'Cash-on-Cash Return',
    unit: '%',
    description: 'Annual cash flow divided by total cash invested',
    tip: 'Most investors target 8-12% for long-term rentals',
  },
  capRate: {
    excellent: 10,
    good: 7,
    fair: 5,
    poor: 3,
    label: 'Cap Rate',
    unit: '%',
    description: 'Net Operating Income divided by purchase price',
    tip: 'Higher cap rates indicate better cash flow potential',
  },
  dscr: {
    excellent: 1.5,
    good: 1.25,
    fair: 1.1,
    poor: 1.0,
    label: 'DSCR',
    unit: '',
    description: 'Debt Service Coverage Ratio - income available to pay debt',
    tip: 'Lenders typically require 1.25+ for investment properties',
  },
  onePercentRule: {
    excellent: 1.2,
    good: 1.0,
    fair: 0.8,
    poor: 0.6,
    label: '1% Rule',
    unit: '%',
    description: 'Monthly rent as percentage of purchase price',
    tip: 'Properties meeting 1% rule typically cash flow well',
  },
  cashFlow: {
    excellent: 500,
    good: 300,
    fair: 100,
    poor: 0,
    label: 'Monthly Cash Flow',
    unit: '$',
    description: 'Net monthly income after all expenses',
    tip: 'Target $200+ per door for multi-family',
  },
  grm: {
    excellent: 8,
    good: 10,
    fair: 12,
    poor: 15,
    label: 'GRM',
    unit: '',
    description: 'Gross Rent Multiplier - price divided by annual rent',
    tip: 'Lower GRM indicates better value',
  },
} as const;

// =============================================================================
// EXPENSE BENCHMARKS
// =============================================================================

export const EXPENSE_BENCHMARKS = {
  vacancy: {
    min: 3,
    typical: 5,
    conservative: 8,
    high: 10,
    label: 'Vacancy Rate',
  },
  maintenance: {
    min: 3,
    typical: 5,
    conservative: 8,
    high: 10,
    label: 'Maintenance',
  },
  management: {
    selfManaged: 0,
    typical: 8,
    fullService: 10,
    high: 12,
    label: 'Property Management',
  },
  capex: {
    min: 3,
    typical: 5,
    conservative: 8,
    high: 10,
    label: 'Capital Expenditures',
  },
} as const;

// =============================================================================
// MARKET BENCHMARKS (Defaults)
// =============================================================================

export const MARKET_DEFAULTS = {
  interestRate: 0.0685, // 6.85%
  appreciationRate: 0.03, // 3% annual
  rentGrowthRate: 0.03, // 3% annual
  expenseGrowthRate: 0.02, // 2% annual
  closingCosts: 0.03, // 3% of purchase
  sellingCosts: 0.06, // 6% of sale
  inflation: 0.02, // 2% annual
} as const;

// =============================================================================
// STRATEGY-SPECIFIC BENCHMARKS
// =============================================================================

export const STRATEGY_BENCHMARKS = {
  longTermRental: {
    cashOnCash: { target: 8, excellent: 12 },
    capRate: { target: 6, excellent: 10 },
    dscr: { target: 1.25, excellent: 1.5 },
    cashFlow: { target: 200, excellent: 500 },
  },
  shortTermRental: {
    occupancy: { target: 70, excellent: 80 },
    revPAR: { target: 150, excellent: 250 },
    cashOnCash: { target: 15, excellent: 25 },
  },
  brrrr: {
    cashRecoup: { target: 80, excellent: 100 },
    arvLTV: { target: 70, excellent: 75 },
    equityCapture: { target: 20, excellent: 30 },
  },
  fixAndFlip: {
    roi: { target: 20, excellent: 35 },
    profitMargin: { target: 20000, excellent: 50000 },
    maxARVPercent: 70, // 70% rule
  },
  houseHack: {
    housingCostReduction: { target: 50, excellent: 100 },
    cashFlowPerUnit: { target: 0, excellent: 200 },
  },
  wholesale: {
    assignmentFee: { target: 5000, excellent: 15000 },
    maxARVPercent: 70, // 70% rule
    endBuyerSpread: { target: 10000, excellent: 25000 },
  },
} as const;

// =============================================================================
// SCORE THRESHOLDS
// =============================================================================

export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 70,
  fair: 60,
  belowAverage: 50,
  poor: 40,
} as const;

export const SCORE_GRADES = {
  A: { min: 80, label: 'Excellent Investment', color: '#22c55e' },
  'B+': { min: 70, label: 'Strong Investment', color: '#22c55e' },
  B: { min: 60, label: 'Good Investment', color: '#84cc16' },
  'C+': { min: 50, label: 'Fair Investment', color: '#f97316' },
  C: { min: 40, label: 'Below Average', color: '#f97316' },
  D: { min: 0, label: 'Poor Investment', color: '#ef4444' },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get rating for a metric value
 */
export function getMetricRating(
  metricKey: keyof typeof BENCHMARKS,
  value: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  const benchmark = BENCHMARKS[metricKey];
  
  // Handle inverted metrics (lower is better)
  if (metricKey === 'grm') {
    if (value <= benchmark.excellent) return 'excellent';
    if (value <= benchmark.good) return 'good';
    if (value <= benchmark.fair) return 'fair';
    return 'poor';
  }
  
  // Normal metrics (higher is better)
  if (value >= benchmark.excellent) return 'excellent';
  if (value >= benchmark.good) return 'good';
  if (value >= benchmark.fair) return 'fair';
  return 'poor';
}

/**
 * Get color for metric rating
 */
export function getRatingColor(rating: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (rating) {
    case 'excellent': return '#22c55e';
    case 'good': return '#84cc16';
    case 'fair': return '#f97316';
    case 'poor': return '#ef4444';
  }
}

/**
 * Get benchmark check text
 */
export function getBenchmarkCheck(
  metricKey: keyof typeof BENCHMARKS,
  value: number
): { passed: boolean; text: string; color: string } {
  const benchmark = BENCHMARKS[metricKey];
  const rating = getMetricRating(metricKey, value);
  const passed = rating === 'excellent' || rating === 'good';
  
  const thresholdText = metricKey === 'grm'
    ? `Below ${benchmark.good}`
    : `Above ${benchmark.good}${benchmark.unit}`;
  
  return {
    passed,
    text: passed ? `✓ ${thresholdText}` : `⚠ ${thresholdText}`,
    color: passed ? '#22c55e' : '#f97316',
  };
}

/**
 * Get score grade from score value
 */
export function getScoreGrade(score: number): {
  grade: string;
  label: string;
  color: string;
} {
  for (const [grade, config] of Object.entries(SCORE_GRADES)) {
    if (score >= config.min) {
      return { grade, label: config.label, color: config.color };
    }
  }
  return { grade: 'D', label: SCORE_GRADES.D.label, color: SCORE_GRADES.D.color };
}

