/**
 * Analytics & Strategy Types — canonical definitions.
 *
 * Core strategy types (StrategyId, StrategyInfo, ALL_STRATEGY_IDS) are
 * re-exported from @dealscope/shared to keep a single source of truth.
 *
 * Platform-specific types (PropertyData, TargetAssumptions) remain here
 * because they have mobile-specific fields.
 */

// ============================================
// STRATEGY TYPES — re-exported from shared
// ============================================

export type { StrategyId, StrategyInfo } from '@dealscope/shared';
export { ALL_STRATEGY_IDS, WORKSHEET_ENDPOINTS } from '@dealscope/shared';

/**
 * STRATEGY_CONFIG — mobile-specific config with emoji icons.
 * Shared package doesn't include platform-specific icons/colors,
 * so we keep this here.
 */
import type { StrategyId, StrategyInfo } from '@dealscope/shared';

export const STRATEGY_CONFIG: Record<StrategyId, Omit<StrategyInfo, 'grade' | 'score'>> = {
  ltr: { id: 'ltr', name: 'Long-Term Rental', shortName: 'Long Rental', icon: '🏠', color: '#0465f2' },
  str: { id: 'str', name: 'Short-Term Rental', shortName: 'Short Rental', icon: '🏨', color: '#8b5cf6' },
  brrrr: { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', icon: '🔄', color: '#f97316' },
  flip: { id: 'flip', name: 'Fix & Flip', shortName: 'Fix & Flip', icon: '🔨', color: '#ec4899' },
  house_hack: { id: 'house_hack', name: 'House Hack', shortName: 'House Hack', icon: '🏡', color: '#14b8a6' },
  wholesale: { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale', icon: '📋', color: '#84cc16' },
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
  propertyTaxes?: number;
  insurance?: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  arv?: number;
  thumbnailUrl?: string;
  photos?: string[];
  photoCount?: number;
  /** For off-market market price: backend uses Zestimate directly */
  listingStatus?: string;
  zestimate?: number;
  currentValueAvm?: number;
  taxAssessedValue?: number;
  marketPrice?: number;
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
