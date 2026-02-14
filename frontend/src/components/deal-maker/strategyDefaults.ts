/**
 * Strategy state initializers for unsaved properties.
 *
 * Extracted from DealMakerScreen to keep the main component focused
 * on rendering.  Each function builds an initial state for a
 * strategy using the property data (price, rent, taxes, etc.)
 * merged with the defaults exported from ./types.
 */

import {
  StrategyType,
  LTRDealMakerState,
  STRDealMakerState,
  BRRRRDealMakerState,
  FlipDealMakerState,
  HouseHackDealMakerState,
  WholesaleDealMakerState,
  AnyStrategyState,
  DealMakerPropertyData,
  DEFAULT_STR_DEAL_MAKER_STATE,
  DEFAULT_BRRRR_DEAL_MAKER_STATE,
  DEFAULT_FLIP_DEAL_MAKER_STATE,
  DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
  DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
} from './types'

// ------------------------------------------------------------------
// Individual strategy initializers
// ------------------------------------------------------------------

export function buildLTRState(
  property: DealMakerPropertyData,
  listPrice?: number,
): LTRDealMakerState {
  return {
    buyPrice: listPrice ?? property.price ?? 350000,
    downPaymentPercent: 0.20,
    closingCostsPercent: 0.03,
    interestRate: 0.06,
    loanTermYears: 30,
    rehabBudget: 0,
    arv: (listPrice ?? property.price ?? 350000) * 1.0,
    monthlyRent: property.rent ?? 2800,
    otherIncome: 0,
    vacancyRate: 0.01,
    maintenanceRate: 0.05,
    managementRate: 0.00,
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance: property.insurance || 1800,
    monthlyHoa: 0,
  }
}

export function buildSTRState(
  property: DealMakerPropertyData,
  listPrice?: number,
): STRDealMakerState {
  const basePrice = listPrice ?? property.price ?? 350000
  return {
    ...DEFAULT_STR_DEAL_MAKER_STATE,
    buyPrice: basePrice,
    arv: basePrice * 1.0,
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance: (property.insurance || 1800) * 1.5, // Higher for STR
  }
}

export function buildBRRRRState(
  property: DealMakerPropertyData,
  listPrice?: number,
): BRRRRDealMakerState {
  const basePrice = listPrice ?? property.price ?? 350000
  const discountedPrice = basePrice * 0.85
  return {
    ...DEFAULT_BRRRR_DEAL_MAKER_STATE,
    purchasePrice: discountedPrice,
    arv: basePrice * 1.15,
    postRehabMonthlyRent: property.rent ? property.rent * 1.1 : 2800,
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance: property.insurance || 1800,
  }
}

export function buildFlipState(
  property: DealMakerPropertyData,
  listPrice?: number,
): FlipDealMakerState {
  const basePrice = listPrice ?? property.price ?? 350000
  const discountedPrice = basePrice * 0.75
  return {
    ...DEFAULT_FLIP_DEAL_MAKER_STATE,
    purchasePrice: discountedPrice,
    arv: basePrice * 1.10,
    holdingCostsMonthly:
      (property.propertyTax || 4200) / 12 +
      (property.insurance || 1800) / 12 +
      200,
  }
}

export function buildHouseHackState(
  property: DealMakerPropertyData,
  listPrice?: number,
): HouseHackDealMakerState {
  const basePrice = listPrice ?? property.price ?? 400000
  return {
    ...DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
    purchasePrice: basePrice,
    ownerUnitMarketRent: property.rent
      ? Math.round(property.rent / 4)
      : 1500,
    avgRentPerUnit: property.rent ? Math.round(property.rent / 4) : 1500,
    annualPropertyTax: property.propertyTax || 6000,
    annualInsurance: property.insurance || 2400,
  }
}

export function buildWholesaleState(
  property: DealMakerPropertyData,
  listPrice?: number,
): WholesaleDealMakerState {
  const basePrice = listPrice ?? property.price ?? 300000
  const estimatedArv = basePrice * 1.15
  const estimatedRepairs = estimatedArv * 0.15
  const mao = estimatedArv * 0.7 - estimatedRepairs
  const contractPrice = Math.min(basePrice * 0.85, mao * 0.95)

  return {
    ...DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
    arv: estimatedArv,
    estimatedRepairs,
    contractPrice,
    squareFootage: property.sqft || 1500,
  }
}

// ------------------------------------------------------------------
// Unified initializer — used by DealMakerScreen
// ------------------------------------------------------------------

export function buildInitialState(
  strategy: StrategyType,
  property: DealMakerPropertyData,
  listPrice?: number,
): AnyStrategyState {
  switch (strategy) {
    case 'str':
      return buildSTRState(property, listPrice)
    case 'brrrr':
      return buildBRRRRState(property, listPrice)
    case 'flip':
      return buildFlipState(property, listPrice)
    case 'house_hack':
      return buildHouseHackState(property, listPrice)
    case 'wholesale':
      return buildWholesaleState(property, listPrice)
    case 'ltr':
    default:
      return buildLTRState(property, listPrice)
  }
}
