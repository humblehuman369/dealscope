/**
 * Analytics & Strategy Types — canonical definitions.
 *
 * Previously scattered across redesign/types.ts, uiStore.ts,
 * worksheetStore.ts, and local type aliases.
 *
 * Import from here instead of duplicating.
 */

// ============================================
// STRATEGY TYPES
// ============================================

export type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

export interface StrategyInfo {
  id: StrategyId;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  grade?: string;
  score?: number;
}

export const STRATEGY_CONFIG: Record<StrategyId, Omit<StrategyInfo, 'grade' | 'score'>> = {
  ltr: { id: 'ltr', name: 'Long-Term Rental', shortName: 'Long Rental', icon: '🏠', color: '#0097a7' },
  str: { id: 'str', name: 'Short-Term Rental', shortName: 'Short Rental', icon: '🏨', color: '#9333ea' },
  brrrr: { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', icon: '🔄', color: '#f97316' },
  flip: { id: 'flip', name: 'Fix & Flip', shortName: 'Fix & Flip', icon: '🔨', color: '#22c55e' },
  house_hack: { id: 'house_hack', name: 'House Hack', shortName: 'House Hack', icon: '🏡', color: '#3b82f6' },
  wholesale: { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale', icon: '📋', color: '#eab308' },
};

// ============================================
// PROPERTY DATA (analytics context)
// ============================================

export interface AnalyticsPropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  listPrice: number;
  monthlyRent: number;
  averageDailyRate?: number;
  occupancyRate?: number;
  propertyTaxes: number;
  insurance: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  arv?: number;
  thumbnailUrl?: string;
  photos?: string[];
  photoCount?: number;
}

// Backward-compatible alias — consumers that imported PropertyData
// from the old redesign/types module can use this without changes.
export type PropertyData = AnalyticsPropertyData;

// ============================================
// ASSUMPTIONS TYPES
// ============================================

export interface TargetAssumptions {
  listPrice: number;
  // Financing
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  closingCostsPct: number;
  // Income
  monthlyRent: number;
  averageDailyRate: number;
  occupancyRate: number;
  vacancyRate: number;
  // Expenses
  propertyTaxes: number;
  insurance: number;
  managementPct: number;
  maintenancePct: number;
  // Rehab/ARV (for BRRRR, Flip, Wholesale)
  rehabCost: number;
  arv: number;
  holdingPeriodMonths: number;
  sellingCostsPct: number;
  // House Hack
  roomsRented: number;
  totalBedrooms: number;
  // Wholesale
  wholesaleFeePct: number;
}
