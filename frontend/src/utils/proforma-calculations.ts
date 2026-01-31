// ============================================
// InvestIQ Financial Proforma Calculations
// Tax, Depreciation, Exit Analysis, and Returns
// ============================================

import {
  DepreciationConfig,
  AnnualTaxProjection,
  ExitAnalysis,
  InvestmentReturns,
  ProformaAmortizationRow,
  ProformaAmortizationSummary,
  SensitivityScenario,
  PROFORMA_DEFAULTS,
} from '../types/proforma';

import { calculateMortgagePayment, calculateRemainingBalance } from './calculations';

// ============================================
// DEPRECIATION CALCULATIONS
// ============================================

/**
 * Calculate depreciation configuration for tax purposes
 * 
 * @param purchasePrice - Total purchase price of property
 * @param landValuePercent - Percentage of purchase price allocated to land (non-depreciable)
 * @param closingCosts - Capitalized closing costs (added to basis)
 * @param rehabCosts - Capitalized rehabilitation costs
 * @param isResidential - True for 27.5 years, false for 39 years (commercial)
 */
export function calculateDepreciation(
  purchasePrice: number,
  landValuePercent: number = PROFORMA_DEFAULTS.landValuePercent,
  closingCosts: number = 0,
  rehabCosts: number = 0,
  isResidential: boolean = true
): DepreciationConfig {
  const landValue = purchasePrice * landValuePercent;
  const improvementValue = purchasePrice - landValue;
  const depreciationYears = isResidential 
    ? PROFORMA_DEFAULTS.depreciationYearsResidential 
    : PROFORMA_DEFAULTS.depreciationYearsCommercial;
  
  // Only a portion of closing costs are typically capitalized
  // (loan fees, title insurance, legal fees - not prepaid items)
  const capitalizedClosingCosts = closingCosts * 0.6; // ~60% typically capitalizable
  
  const totalDepreciableBasis = improvementValue + capitalizedClosingCosts + rehabCosts;
  const annualDepreciation = totalDepreciableBasis / depreciationYears;
  
  return {
    purchasePrice,
    landValuePercent,
    landValue,
    improvementValue,
    capitalizedClosingCosts,
    rehabCosts,
    totalDepreciableBasis,
    depreciationMethod: 'straight-line',
    depreciationYears,
    annualDepreciation,
    monthlyDepreciation: annualDepreciation / 12,
  };
}

/**
 * Calculate accumulated depreciation at a given year
 */
export function calculateAccumulatedDepreciation(
  annualDepreciation: number,
  yearsHeld: number,
  totalDepreciableBasis: number
): number {
  const accumulated = annualDepreciation * yearsHeld;
  return Math.min(accumulated, totalDepreciableBasis); // Cannot exceed basis
}

// ============================================
// AMORTIZATION CALCULATIONS
// ============================================

/**
 * Generate full amortization schedule with beginning/ending balances
 */
export function calculateProformaAmortization(
  principal: number,
  annualRate: number,
  termYears: number
): { schedule: ProformaAmortizationRow[]; summary: ProformaAmortizationSummary } {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = termYears * 12;

  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  const schedule: ProformaAmortizationRow[] = [];

  for (let month = 1; month <= totalMonths; month++) {
    const beginningBalance = balance;
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    cumulativePrincipal += principalPayment;
    cumulativeInterest += interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      paymentNumber: month,
      beginningBalance,
      scheduledPayment: monthlyPayment,
      principalPayment,
      interestPayment,
      endingBalance: balance,
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  // Generate payoff date
  const payoffDate = new Date();
  payoffDate.setFullYear(payoffDate.getFullYear() + termYears);

  const summary: ProformaAmortizationSummary = {
    monthlyPayment,
    totalPayments: monthlyPayment * totalMonths,
    totalPrincipal: principal,
    totalInterest: cumulativeInterest,
    principalPercent: (principal / (monthlyPayment * totalMonths)) * 100,
    interestPercent: (cumulativeInterest / (monthlyPayment * totalMonths)) * 100,
    payoffDate: payoffDate.toISOString().split('T')[0],
  };

  return { schedule, summary };
}

/**
 * Get interest and principal paid for a specific year
 */
export function getYearlyAmortizationBreakdown(
  schedule: ProformaAmortizationRow[],
  year: number
): { interest: number; principal: number; endingBalance: number } {
  const yearPayments = schedule.filter(row => row.year === year);
  
  if (yearPayments.length === 0) {
    return { interest: 0, principal: 0, endingBalance: 0 };
  }

  const interest = yearPayments.reduce((sum, row) => sum + row.interestPayment, 0);
  const principal = yearPayments.reduce((sum, row) => sum + row.principalPayment, 0);
  const endingBalance = yearPayments[yearPayments.length - 1].endingBalance;

  return { interest, principal, endingBalance };
}

// ============================================
// TAX PROJECTIONS
// ============================================

/**
 * Calculate after-tax cash flow for a single year
 */
export function calculateAnnualTaxProjection(
  year: number,
  grossRentalIncome: number,
  vacancyRate: number,
  operatingExpenses: {
    propertyTaxes: number;
    insurance: number;
    management: number;
    maintenance: number;
    utilities: number;
    hoaFees: number;
    other: number;
  },
  mortgageInterest: number,
  mortgagePrincipal: number,
  depreciation: number,
  marginalTaxRate: number = PROFORMA_DEFAULTS.marginalTaxRate
): AnnualTaxProjection {
  // Income
  const vacancyLoss = grossRentalIncome * vacancyRate;
  const effectiveGrossIncome = grossRentalIncome - vacancyLoss;
  const otherIncome = 0;
  const totalIncome = effectiveGrossIncome + otherIncome;

  // Operating expenses total
  const totalOperatingExpenses = 
    operatingExpenses.propertyTaxes +
    operatingExpenses.insurance +
    operatingExpenses.management +
    operatingExpenses.maintenance +
    operatingExpenses.utilities +
    operatingExpenses.hoaFees +
    operatingExpenses.other;

  // NOI (before debt service)
  const netOperatingIncome = totalIncome - totalOperatingExpenses;

  // Debt service
  const totalDebtService = mortgageInterest + mortgagePrincipal;

  // Pre-tax cash flow
  const preTaxCashFlow = netOperatingIncome - totalDebtService;

  // Taxable income = NOI - Interest - Depreciation
  // Note: Principal payments are NOT deductible
  const taxableIncome = netOperatingIncome - mortgageInterest - depreciation;

  // Tax liability (can be negative = tax benefit from passive losses)
  const estimatedTaxLiability = taxableIncome * marginalTaxRate;
  const taxBenefit = taxableIncome < 0 ? Math.abs(estimatedTaxLiability) : 0;

  // After-tax cash flow
  // If taxable income is negative, you may get a tax benefit (depends on passive loss rules)
  const afterTaxCashFlow = preTaxCashFlow - estimatedTaxLiability;

  return {
    year,
    grossRentalIncome,
    effectiveGrossIncome,
    otherIncome,
    totalIncome,
    operatingExpenses: totalOperatingExpenses,
    propertyTaxes: operatingExpenses.propertyTaxes,
    insurance: operatingExpenses.insurance,
    management: operatingExpenses.management,
    maintenance: operatingExpenses.maintenance,
    utilities: operatingExpenses.utilities,
    hoaFees: operatingExpenses.hoaFees,
    otherExpenses: operatingExpenses.other,
    mortgageInterest,
    mortgagePrincipal,
    totalDebtService,
    depreciation,
    netOperatingIncome,
    taxableIncome,
    marginalTaxRate,
    estimatedTaxLiability,
    taxBenefit,
    preTaxCashFlow,
    afterTaxCashFlow,
  };
}

/**
 * Generate multi-year tax projections with growth rates
 */
export function generateMultiYearProjections(
  baseYear: {
    grossRent: number;
    propertyTaxes: number;
    insurance: number;
    management: number;
    maintenance: number;
    utilities: number;
    hoaFees: number;
    otherExpenses: number;
  },
  vacancyRate: number,
  amortizationSchedule: ProformaAmortizationRow[],
  annualDepreciation: number,
  holdPeriodYears: number,
  rentGrowthRate: number,
  expenseGrowthRate: number,
  appreciationRate: number,
  purchasePrice: number,
  marginalTaxRate: number = PROFORMA_DEFAULTS.marginalTaxRate
): {
  projections: AnnualTaxProjection[];
  cumulativeCashFlow: number[];
  propertyValues: number[];
  equityPositions: number[];
  loanBalances: number[];
} {
  const projections: AnnualTaxProjection[] = [];
  const cumulativeCashFlow: number[] = [];
  const propertyValues: number[] = [];
  const equityPositions: number[] = [];
  const loanBalances: number[] = [];

  let cumulativeCF = 0;

  for (let year = 1; year <= holdPeriodYears; year++) {
    // Apply growth rates
    const growthFactor = Math.pow(1 + rentGrowthRate / 100, year - 1);
    const expenseGrowthFactor = Math.pow(1 + expenseGrowthRate / 100, year - 1);

    const grossRent = baseYear.grossRent * growthFactor;
    const operatingExpenses = {
      propertyTaxes: baseYear.propertyTaxes * expenseGrowthFactor,
      insurance: baseYear.insurance * expenseGrowthFactor,
      management: baseYear.management * growthFactor, // Tied to rent
      maintenance: baseYear.maintenance * growthFactor, // Tied to rent
      utilities: baseYear.utilities * expenseGrowthFactor,
      hoaFees: baseYear.hoaFees * expenseGrowthFactor,
      other: baseYear.otherExpenses * expenseGrowthFactor,
    };

    // Get mortgage breakdown for this year
    const amortBreakdown = getYearlyAmortizationBreakdown(amortizationSchedule, year);

    // Calculate projection
    const projection = calculateAnnualTaxProjection(
      year,
      grossRent,
      vacancyRate / 100,
      operatingExpenses,
      amortBreakdown.interest,
      amortBreakdown.principal,
      annualDepreciation,
      marginalTaxRate
    );

    projections.push(projection);

    // Cumulative cash flow
    cumulativeCF += projection.afterTaxCashFlow;
    cumulativeCashFlow.push(cumulativeCF);

    // Property value
    const propertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, year);
    propertyValues.push(propertyValue);

    // Loan balance
    const loanBalance = amortBreakdown.endingBalance;
    loanBalances.push(loanBalance);

    // Equity position
    const equity = propertyValue - loanBalance;
    equityPositions.push(equity);
  }

  return {
    projections,
    cumulativeCashFlow,
    propertyValues,
    equityPositions,
    loanBalances,
  };
}

// ============================================
// EXIT ANALYSIS
// ============================================

/**
 * Calculate exit analysis with capital gains tax
 */
export function calculateExitAnalysis(
  purchasePrice: number,
  holdPeriodYears: number,
  appreciationRate: number,
  accumulatedDepreciation: number,
  remainingLoanBalance: number,
  rehabCosts: number = 0,
  brokerCommissionPercent: number = PROFORMA_DEFAULTS.brokerCommissionPercent,
  closingCostsPercent: number = PROFORMA_DEFAULTS.sellerClosingCostsPercent,
  capitalGainsTaxRate: number = PROFORMA_DEFAULTS.capitalGainsTaxRate
): ExitAnalysis {
  // Projected sale price
  const projectedSalePrice = purchasePrice * Math.pow(1 + appreciationRate / 100, holdPeriodYears);

  // Sale costs
  const brokerCommission = projectedSalePrice * brokerCommissionPercent;
  const closingCosts = projectedSalePrice * closingCostsPercent;
  const totalSaleCosts = brokerCommission + closingCosts;

  // Net proceeds before tax
  const netSaleProceeds = projectedSalePrice - totalSaleCosts - remainingLoanBalance;

  // Cost basis calculation
  // Original basis = purchase price + capitalized improvements
  const originalCostBasis = purchasePrice + rehabCosts;
  
  // Adjusted basis = original - accumulated depreciation
  const adjustedCostBasis = originalCostBasis - accumulatedDepreciation;

  // Total gain = Sale proceeds (net of costs) - Adjusted basis + remaining loan
  // Or equivalently: Sale price - Sale costs - Adjusted basis
  const totalGain = projectedSalePrice - totalSaleCosts - adjustedCostBasis;

  // Depreciation recapture (taxed at 25% - Section 1250)
  // Limited to the lesser of accumulated depreciation or total gain
  const depreciationRecapture = Math.min(accumulatedDepreciation, Math.max(0, totalGain));
  const depreciationRecaptureTax = depreciationRecapture * PROFORMA_DEFAULTS.depreciationRecaptureRate;

  // Capital gain (remaining gain after recapture, taxed at LTCG rate)
  const capitalGain = Math.max(0, totalGain - depreciationRecapture);
  const capitalGainsTax = capitalGain * capitalGainsTaxRate;

  // Total tax on sale
  const totalTaxOnSale = depreciationRecaptureTax + capitalGainsTax;
  
  // After-tax proceeds
  const afterTaxProceeds = netSaleProceeds - totalTaxOnSale;

  return {
    holdPeriodYears,
    initialValue: purchasePrice,
    appreciationRate,
    projectedSalePrice,
    brokerCommissionPercent,
    brokerCommission,
    closingCostsPercent,
    closingCosts,
    totalSaleCosts,
    remainingLoanBalance,
    prepaymentPenalty: 0,
    grossSaleProceeds: projectedSalePrice,
    netSaleProceeds,
    adjustedCostBasis,
    accumulatedDepreciation,
    totalGain,
    depreciationRecapture,
    depreciationRecaptureTax,
    capitalGain,
    capitalGainsTaxRate,
    capitalGainsTax,
    totalTaxOnSale,
    afterTaxProceeds,
  };
}

// ============================================
// INVESTMENT RETURNS
// ============================================

/**
 * Calculate IRR using Newton-Raphson method
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const discountFactor = Math.pow(1 + rate, j);
      npv += cashFlows[j] / discountFactor;
      if (j > 0) {
        derivativeNpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
      }
    }

    if (Math.abs(derivativeNpv) < 0.0001) {
      break;
    }

    const newRate = rate - npv / derivativeNpv;
    
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Return as percentage
    }
    
    // Prevent divergence
    if (newRate < -0.99) {
      rate = -0.99;
    } else if (newRate > 10) {
      rate = 10;
    } else {
      rate = newRate;
    }
  }

  return rate * 100; // Return as percentage
}

/**
 * Calculate Modified IRR (MIRR)
 * Uses separate finance rate (for negative flows) and reinvestment rate (for positive flows)
 */
export function calculateMIRR(
  cashFlows: number[],
  financeRate: number = 0.06,
  reinvestmentRate: number = 0.08
): number {
  const n = cashFlows.length - 1;
  
  // Future value of positive cash flows
  let fvPositive = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    if (cashFlows[i] > 0) {
      fvPositive += cashFlows[i] * Math.pow(1 + reinvestmentRate, n - i);
    }
  }

  // Present value of negative cash flows
  let pvNegative = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    if (cashFlows[i] < 0) {
      pvNegative += cashFlows[i] / Math.pow(1 + financeRate, i);
    }
  }

  if (pvNegative === 0 || fvPositive === 0) {
    return 0;
  }

  // MIRR = (FV of positives / PV of negatives)^(1/n) - 1
  const mirr = Math.pow(fvPositive / Math.abs(pvNegative), 1 / n) - 1;
  
  return mirr * 100; // Return as percentage
}

/**
 * Calculate complete investment returns
 */
export function calculateInvestmentReturns(
  initialInvestment: number,
  annualCashFlows: number[],
  exitProceeds: number,
  financeRate: number = 0.06,
  reinvestmentRate: number = 0.08
): InvestmentReturns {
  // Build cash flow array for IRR
  // Year 0: negative initial investment
  // Years 1-N: annual cash flows
  // Year N: add exit proceeds to final year
  const allCashFlows = [-initialInvestment, ...annualCashFlows];
  allCashFlows[allCashFlows.length - 1] += exitProceeds; // Add sale proceeds to final year

  const irr = calculateIRR(allCashFlows);
  const mirr = calculateMIRR(allCashFlows, financeRate, reinvestmentRate);

  const totalCashFlows = annualCashFlows.reduce((a, b) => a + b, 0);
  const totalDistributions = totalCashFlows + exitProceeds;
  const equityMultiple = totalDistributions / initialInvestment;

  // Payback period calculation
  let cumulative = 0;
  let paybackPeriodMonths: number | null = null;
  for (let i = 0; i < annualCashFlows.length; i++) {
    cumulative += annualCashFlows[i];
    if (cumulative >= initialInvestment && paybackPeriodMonths === null) {
      // Interpolate within the year
      const priorCumulative = cumulative - annualCashFlows[i];
      const remainingNeeded = initialInvestment - priorCumulative;
      const monthsInYear = (remainingNeeded / annualCashFlows[i]) * 12;
      paybackPeriodMonths = (i * 12) + Math.ceil(monthsInYear);
    }
  }

  // If not paid back from cash flow alone, check with exit proceeds
  if (paybackPeriodMonths === null && cumulative + exitProceeds >= initialInvestment) {
    // Paid back at exit
    paybackPeriodMonths = annualCashFlows.length * 12;
  }

  const averageAnnualReturn = annualCashFlows.length > 0
    ? (totalCashFlows / annualCashFlows.length) / initialInvestment
    : 0;
  
  const cagr = annualCashFlows.length > 0
    ? Math.pow(equityMultiple, 1 / annualCashFlows.length) - 1
    : 0;

  return {
    irr,
    mirr,
    totalCashFlows,
    totalDistributions,
    equityMultiple,
    paybackPeriodMonths,
    averageAnnualReturn: averageAnnualReturn * 100,
    cagr: cagr * 100,
  };
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

/**
 * Generate sensitivity scenarios for a variable
 */
export function generateSensitivityScenarios(
  baseValue: number,
  variableName: string,
  percentChanges: number[],
  calculateReturns: (value: number) => { irr: number; cashOnCash: number; netProfit: number }
): SensitivityScenario[] {
  return percentChanges.map(changePercent => {
    const absoluteValue = baseValue * (1 + changePercent / 100);
    const returns = calculateReturns(absoluteValue);
    
    return {
      variable: variableName,
      changePercent,
      absoluteValue,
      irr: returns.irr,
      cashOnCash: returns.cashOnCash,
      netProfit: returns.netProfit,
    };
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Round to nearest dollar
 */
export function roundToDollar(value: number): number {
  return Math.round(value);
}

/**
 * Calculate expense ratio (OpEx / EGI)
 */
export function calculateExpenseRatio(
  operatingExpenses: number,
  effectiveGrossIncome: number
): number {
  if (effectiveGrossIncome === 0) return 0;
  return (operatingExpenses / effectiveGrossIncome) * 100;
}
