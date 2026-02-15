/**
 * Dynamic Metrics Calculator — matches frontend/src/lib/dynamicMetrics.ts
 *
 * Calculates any metric given strategy, price target, and property data.
 * Enables client-side real-time recalculation when users change price
 * targets or strategy, without requiring a backend round-trip.
 */

import type { PriceTarget } from './priceUtils';
import type { MetricId, StrategyType, MetricDefinition } from '../config/strategyMetrics';
import { METRIC_DEFINITIONS, formatMetricValueByDef } from '../config/strategyMetrics';

// =============================================================================
// CALCULATION INPUT TYPES
// =============================================================================

export interface CalculationInputs {
  // Prices
  listPrice: number;
  breakevenPrice: number;
  targetBuyPrice: number;
  wholesalePrice: number;
  arv: number;

  // Financing
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  closingCostsPct: number;

  // Income
  monthlyRent: number;
  vacancyRate: number;
  otherIncome?: number;

  // STR-specific
  averageDailyRate?: number;
  occupancyRate?: number;
  cleaningFeeRevenue?: number;
  platformFeeRate?: number;
  strManagementRate?: number;

  // Expenses
  propertyTaxes: number;
  insurance: number;
  hoaFees?: number;
  managementRate: number;
  maintenanceRate: number;
  capexRate: number;
  utilities?: number;

  // Rehab/BRRRR
  rehabBudget?: number;
  contingencyPct?: number;
  holdingPeriodMonths?: number;
  holdingCostsMonthly?: number;
  refinanceLtv?: number;
  refinanceInterestRate?: number;
  refinanceTermYears?: number;
  postRehabMonthlyRent?: number;

  // Flip
  rehabTimeMonths?: number;
  daysOnMarket?: number;
  sellingCostsPct?: number;
  capitalGainsRate?: number;
  hardMoneyRate?: number;
  hardMoneyLtv?: number;
  loanPoints?: number;

  // House Hack
  totalUnits?: number;
  ownerOccupiedUnits?: number;
  avgRentPerUnit?: number;
  currentHousingPayment?: number;
  pmiRate?: number;

  // Wholesale
  contractPrice?: number;
  assignmentFee?: number;
  earnestMoney?: number;
  marketingCosts?: number;
  wholesaleClosingCosts?: number;
  estimatedRepairs?: number;
}

export interface MetricResult {
  id: MetricId;
  value: number | string | null;
  formatted: string;
  label: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate monthly mortgage payment (P&I).
 */
function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate === 0) return principal / (years * 12);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/**
 * Get the base price for calculations based on active price target.
 */
export function getBasePriceForTarget(
  priceTarget: PriceTarget,
  inputs: CalculationInputs,
): number {
  switch (priceTarget) {
    case 'breakeven':
      return inputs.breakevenPrice;
    case 'targetBuy':
      return inputs.targetBuyPrice;
    case 'wholesale':
      return inputs.wholesalePrice;
    default:
      return inputs.targetBuyPrice;
  }
}

// =============================================================================
// METRIC CALCULATORS
// =============================================================================

/**
 * Calculate LTR metrics.
 */
function calculateLTRMetrics(
  basePrice: number,
  inputs: CalculationInputs,
): Record<MetricId, number | string | null> {
  const downPayment = basePrice * inputs.downPaymentPct;
  const closingCosts = basePrice * inputs.closingCostsPct;
  const loanAmount = basePrice - downPayment;
  const totalCashNeeded = downPayment + closingCosts;

  const monthlyPI = calculateMonthlyMortgage(loanAmount, inputs.interestRate, inputs.loanTermYears);
  const annualDebtService = monthlyPI * 12;

  const annualGrossRent = inputs.monthlyRent * 12;
  const vacancyLoss = annualGrossRent * inputs.vacancyRate;
  const effectiveGrossIncome = annualGrossRent - vacancyLoss + (inputs.otherIncome || 0);

  const annualMaintenance = annualGrossRent * inputs.maintenanceRate;
  const annualManagement = annualGrossRent * inputs.managementRate;
  const annualCapex = annualGrossRent * inputs.capexRate;
  const totalOperatingExpenses =
    inputs.propertyTaxes +
    inputs.insurance +
    (inputs.hoaFees || 0) +
    annualMaintenance +
    annualManagement +
    annualCapex +
    (inputs.utilities || 0) * 12;

  const noi = effectiveGrossIncome - totalOperatingExpenses;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  const capRate = basePrice > 0 ? noi / basePrice : 0;

  return {
    cashFlow: monthlyCashFlow,
    cashNeeded: totalCashNeeded,
    capRate,
    occupancy: null,
    revpar: null,
    cashRecoup: null,
    equityCreated: null,
    postRefiCashFlow: null,
    cashLeftInDeal: null,
    netProfit: null,
    roi: null,
    annualizedRoi: null,
    holdingCosts: null,
    profitMargin: null,
    effectiveHousingCost: null,
    savings: null,
    reduction: null,
    liveFreeThreshold: null,
    assignmentFee: null,
    expenses: null,
    arv: inputs.arv,
    dealViability: null,
  };
}

/**
 * Calculate STR metrics.
 */
function calculateSTRMetrics(
  basePrice: number,
  inputs: CalculationInputs,
): Record<MetricId, number | string | null> {
  const adr = inputs.averageDailyRate || 200;
  const occupancy = inputs.occupancyRate || 0.65;

  const nightsOccupied = Math.round(365 * occupancy);
  const annualRevenue = adr * nightsOccupied;
  const cleaningRevenue = (inputs.cleaningFeeRevenue || 0) * (nightsOccupied / 3);
  const totalRevenue = annualRevenue + cleaningRevenue;

  const platformFees = totalRevenue * (inputs.platformFeeRate || 0.15);
  const strManagement = totalRevenue * (inputs.strManagementRate || 0.2);

  const downPayment = basePrice * inputs.downPaymentPct;
  const closingCosts = basePrice * inputs.closingCostsPct;
  const furnitureSetup = 6000;
  const totalCashNeeded = downPayment + closingCosts + furnitureSetup;

  const loanAmount = basePrice - downPayment;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, inputs.interestRate, inputs.loanTermYears);
  const annualDebtService = monthlyPI * 12;

  const totalOperatingExpenses =
    inputs.propertyTaxes + inputs.insurance + platformFees + strManagement + (inputs.utilities || 0) * 12 * 1.5;

  const noi = totalRevenue - totalOperatingExpenses;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  // Break-even occupancy
  const fixedCosts = annualDebtService + inputs.propertyTaxes + inputs.insurance;
  const revenuePerNight = adr + (cleaningRevenue / nightsOccupied || 0);
  const variableCostPerNight =
    revenuePerNight * ((inputs.platformFeeRate || 0.15) + (inputs.strManagementRate || 0.2));
  const netPerNight = revenuePerNight - variableCostPerNight;
  const breakEvenNights = netPerNight > 0 ? fixedCosts / netPerNight : 365;
  const breakEvenOccupancy = breakEvenNights / 365;

  // RevPAR
  const revpar = totalRevenue / 365;

  return {
    cashFlow: monthlyCashFlow,
    cashNeeded: totalCashNeeded,
    capRate: basePrice > 0 ? noi / basePrice : 0,
    occupancy: breakEvenOccupancy,
    revpar,
    cashRecoup: null,
    equityCreated: null,
    postRefiCashFlow: null,
    cashLeftInDeal: null,
    netProfit: null,
    roi: null,
    annualizedRoi: null,
    holdingCosts: null,
    profitMargin: null,
    effectiveHousingCost: null,
    savings: null,
    reduction: null,
    liveFreeThreshold: null,
    assignmentFee: null,
    expenses: null,
    arv: inputs.arv,
    dealViability: null,
  };
}

/**
 * Calculate BRRRR metrics.
 */
function calculateBRRRRMetrics(
  basePrice: number,
  inputs: CalculationInputs,
): Record<MetricId, number | string | null> {
  const rehabBudget = inputs.rehabBudget || 0;
  const contingency = rehabBudget * (inputs.contingencyPct || 0.1);
  const totalRehab = rehabBudget + contingency;
  const holdingMonths = inputs.holdingPeriodMonths || 6;
  const holdingCostsTotal = (inputs.holdingCostsMonthly || 1500) * holdingMonths;

  // Initial investment
  const hardMoneyDown = basePrice * 0.1;
  const purchaseClosingCosts = basePrice * inputs.closingCostsPct;
  const initialInvestment = hardMoneyDown + totalRehab + holdingCostsTotal + purchaseClosingCosts;

  // Refinance
  const refinanceLtv = inputs.refinanceLtv || 0.75;
  const refinanceLoanAmount = inputs.arv * refinanceLtv;
  const refinanceClosingCosts = refinanceLoanAmount * (inputs.closingCostsPct || 0.02);
  const hardMoneyBalance = basePrice * 0.9;
  const cashOutAtRefi = refinanceLoanAmount - refinanceClosingCosts - hardMoneyBalance;

  const cashLeftInDeal = Math.max(0, initialInvestment - Math.max(0, cashOutAtRefi));
  const cashRecoupPercent =
    initialInvestment > 0 ? (initialInvestment - cashLeftInDeal) / initialInvestment : 0;

  // Equity position
  const equityCreated = inputs.arv - refinanceLoanAmount;

  // Post-refi cash flow
  const postRehabRent = inputs.postRehabMonthlyRent || inputs.monthlyRent;
  const annualRent = postRehabRent * 12;
  const effectiveRent = annualRent * (1 - inputs.vacancyRate);

  const refiMonthlyPI = calculateMonthlyMortgage(
    refinanceLoanAmount,
    inputs.refinanceInterestRate || inputs.interestRate,
    inputs.refinanceTermYears || 30,
  );
  const annualDebtService = refiMonthlyPI * 12;

  const operatingExpenses =
    inputs.propertyTaxes +
    inputs.insurance +
    annualRent * inputs.maintenanceRate +
    annualRent * inputs.managementRate;
  const noi = effectiveRent - operatingExpenses;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  return {
    cashFlow: null,
    cashNeeded: initialInvestment,
    capRate: null,
    occupancy: null,
    revpar: null,
    cashRecoup: cashRecoupPercent,
    equityCreated,
    postRefiCashFlow: monthlyCashFlow,
    cashLeftInDeal,
    netProfit: null,
    roi: null,
    annualizedRoi: null,
    holdingCosts: holdingCostsTotal,
    profitMargin: null,
    effectiveHousingCost: null,
    savings: null,
    reduction: null,
    liveFreeThreshold: null,
    assignmentFee: null,
    expenses: null,
    arv: inputs.arv,
    dealViability: null,
  };
}

/**
 * Calculate Flip metrics.
 */
function calculateFlipMetrics(
  basePrice: number,
  inputs: CalculationInputs,
): Record<MetricId, number | string | null> {
  const rehabBudget = inputs.rehabBudget || 0;
  const contingency = rehabBudget * (inputs.contingencyPct || 0.1);
  const totalRehab = rehabBudget + contingency;

  const rehabMonths = inputs.rehabTimeMonths || 4;
  const domDays = inputs.daysOnMarket || 45;
  const totalHoldingMonths = rehabMonths + domDays / 30;

  // Financing costs
  const hardMoneyLtv = inputs.hardMoneyLtv || 0.9;
  const hardMoneyLoan = basePrice * hardMoneyLtv;
  const loanPointsCost = hardMoneyLoan * (inputs.loanPoints || 0.02);
  const monthlyInterest = (hardMoneyLoan * (inputs.hardMoneyRate || 0.12)) / 12;
  const totalInterest = monthlyInterest * totalHoldingMonths;

  // Holding costs
  const monthlyHolding = inputs.propertyTaxes / 12 + inputs.insurance / 12 + (inputs.utilities || 0);
  const totalHoldingCosts = monthlyHolding * totalHoldingMonths;

  // Total project cost
  const acquisitionCost = basePrice + basePrice * inputs.closingCostsPct;
  const financingCosts = loanPointsCost + totalInterest;
  const totalProjectCost = acquisitionCost + totalRehab + totalHoldingCosts + financingCosts;

  // Sale
  const sellingCostsPct = inputs.sellingCostsPct || 0.08;
  const sellingCosts = inputs.arv * sellingCostsPct;
  const grossProfit = inputs.arv - sellingCosts - totalProjectCost;
  const taxes = grossProfit > 0 ? grossProfit * (inputs.capitalGainsRate || 0.25) : 0;
  const netProfit = grossProfit - taxes;

  // ROI
  const cashInvested =
    basePrice * (1 - hardMoneyLtv) + totalRehab + totalHoldingCosts + financingCosts;
  const roiValue = cashInvested > 0 ? netProfit / cashInvested : 0;
  const annualizedRoi = roiValue * (12 / totalHoldingMonths);
  const profitMargin = inputs.arv > 0 ? netProfit / inputs.arv : 0;

  return {
    cashFlow: null,
    cashNeeded: cashInvested,
    capRate: null,
    occupancy: null,
    revpar: null,
    cashRecoup: null,
    equityCreated: null,
    postRefiCashFlow: null,
    cashLeftInDeal: null,
    netProfit,
    roi: roiValue,
    annualizedRoi,
    holdingCosts: totalHoldingCosts + financingCosts,
    profitMargin,
    effectiveHousingCost: null,
    savings: null,
    reduction: null,
    liveFreeThreshold: null,
    assignmentFee: null,
    expenses: null,
    arv: inputs.arv,
    dealViability: null,
  };
}

/**
 * Calculate House Hack metrics.
 */
function calculateHouseHackMetrics(
  basePrice: number,
  inputs: CalculationInputs,
): Record<MetricId, number | string | null> {
  const totalUnits = inputs.totalUnits || 4;
  const ownerUnits = inputs.ownerOccupiedUnits || 1;
  const rentedUnits = totalUnits - ownerUnits;
  const avgRentPerUnit = inputs.avgRentPerUnit || inputs.monthlyRent / totalUnits;

  // FHA financing (3.5% down)
  const downPayment = basePrice * 0.035;
  const closingCosts = basePrice * inputs.closingCostsPct;
  const loanAmount = basePrice - downPayment;

  const monthlyPI = calculateMonthlyMortgage(loanAmount, inputs.interestRate, inputs.loanTermYears);
  const monthlyTaxes = inputs.propertyTaxes / 12;
  const monthlyInsurance = inputs.insurance / 12;
  const pmi = (loanAmount * (inputs.pmiRate || 0.0085)) / 12;

  const monthlyPITI = monthlyPI + monthlyTaxes + monthlyInsurance + pmi;

  // Rental income
  const grossRentalIncome = avgRentPerUnit * rentedUnits;
  const vacancyLoss = grossRentalIncome * inputs.vacancyRate;
  const effectiveRentalIncome = grossRentalIncome - vacancyLoss;

  const operatingExpenses =
    (inputs.utilities || 0) +
    grossRentalIncome * inputs.maintenanceRate +
    grossRentalIncome * inputs.capexRate;

  const netRentalIncome = effectiveRentalIncome - operatingExpenses;

  // Effective housing cost
  const effectiveHousingCost = monthlyPITI - netRentalIncome;
  const livesForFree = effectiveHousingCost <= 0;

  // Savings
  const currentHousing = inputs.currentHousingPayment || 2000;
  const savingsAmount = currentHousing - effectiveHousingCost;

  // Reduction percentage
  const reductionPct = currentHousing > 0 ? savingsAmount / currentHousing : 0;

  return {
    cashFlow: netRentalIncome - monthlyPITI,
    cashNeeded: downPayment + closingCosts,
    capRate: null,
    occupancy: null,
    revpar: null,
    cashRecoup: null,
    equityCreated: null,
    postRefiCashFlow: null,
    cashLeftInDeal: null,
    netProfit: null,
    roi: null,
    annualizedRoi: null,
    holdingCosts: null,
    profitMargin: null,
    effectiveHousingCost,
    savings: savingsAmount,
    reduction: reductionPct,
    liveFreeThreshold: livesForFree ? 'YES' : 'NO',
    assignmentFee: null,
    expenses: null,
    arv: inputs.arv,
    dealViability: null,
  };
}

/**
 * Calculate Wholesale metrics.
 */
function calculateWholesaleMetrics(
  basePrice: number,
  inputs: CalculationInputs,
): Record<MetricId, number | string | null> {
  const estimatedRepairs = inputs.estimatedRepairs || inputs.rehabBudget || 40000;
  const assignmentFeeValue = inputs.assignmentFee || 15000;

  // 70% Rule MAO
  const mao = inputs.arv * 0.7 - estimatedRepairs;

  // Expenses
  const earnestMoney = inputs.earnestMoney || 1000;
  const marketingCostsTotal = inputs.marketingCosts || 500;
  const closingCostsTotal = inputs.wholesaleClosingCosts || 500;
  const totalExpenses = earnestMoney + marketingCostsTotal + closingCostsTotal;

  // Net profit and ROI
  const netProfit = assignmentFeeValue - marketingCostsTotal - closingCostsTotal;
  const roiValue = totalExpenses > 0 ? netProfit / totalExpenses : 0;

  // Deal viability
  const contractPrice = inputs.contractPrice || basePrice;
  const meets70Rule = contractPrice <= mao;
  let viability = 'Poor';
  if (meets70Rule && netProfit > 10000) viability = 'Excellent';
  else if (meets70Rule || netProfit > 5000) viability = 'Good';
  else if (netProfit > 0) viability = 'Marginal';

  return {
    cashFlow: null,
    cashNeeded: totalExpenses,
    capRate: null,
    occupancy: null,
    revpar: null,
    cashRecoup: null,
    equityCreated: null,
    postRefiCashFlow: null,
    cashLeftInDeal: null,
    netProfit,
    roi: roiValue,
    annualizedRoi: null,
    holdingCosts: null,
    profitMargin: null,
    effectiveHousingCost: null,
    savings: null,
    reduction: null,
    liveFreeThreshold: null,
    assignmentFee: assignmentFeeValue,
    expenses: totalExpenses,
    arv: inputs.arv,
    dealViability: viability,
  };
}

// =============================================================================
// MAIN CALCULATOR
// =============================================================================

/**
 * Calculate a specific metric given strategy, price target, and data.
 */
export function calculateMetric(
  metricId: MetricId,
  strategy: StrategyType,
  priceTarget: PriceTarget,
  data: CalculationInputs,
): MetricResult {
  const basePrice = getBasePriceForTarget(priceTarget, data);

  let allMetrics: Record<MetricId, number | string | null>;

  switch (strategy) {
    case 'ltr':
      allMetrics = calculateLTRMetrics(basePrice, data);
      break;
    case 'str':
      allMetrics = calculateSTRMetrics(basePrice, data);
      break;
    case 'brrrr':
      allMetrics = calculateBRRRRMetrics(basePrice, data);
      break;
    case 'flip':
      allMetrics = calculateFlipMetrics(basePrice, data);
      break;
    case 'house_hack':
      allMetrics = calculateHouseHackMetrics(basePrice, data);
      break;
    case 'wholesale':
      allMetrics = calculateWholesaleMetrics(basePrice, data);
      break;
    default:
      allMetrics = calculateLTRMetrics(basePrice, data);
  }

  const value = allMetrics[metricId];
  const definition: MetricDefinition = METRIC_DEFINITIONS[metricId];

  return {
    id: metricId,
    value,
    formatted: formatMetricValueByDef(value, definition.format),
    label: definition.label,
  };
}

/**
 * Calculate all metrics for a strategy and price target.
 */
export function calculateStrategyMetrics(
  strategy: StrategyType,
  priceTarget: PriceTarget,
  data: CalculationInputs,
  metricIds: MetricId[],
): MetricResult[] {
  return metricIds.map((id) => calculateMetric(id, strategy, priceTarget, data));
}
