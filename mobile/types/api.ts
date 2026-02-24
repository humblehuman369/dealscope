/**
 * Common API types and enums - matching backend Pydantic schemas exactly
 */

// ===========================================
// Property Status Enum
// ===========================================
export type PropertyStatus =
  | 'watching'
  | 'analyzing'
  | 'contacted'
  | 'under_contract'
  | 'owned'
  | 'passed'
  | 'archived';

export const PROPERTY_STATUS_OPTIONS: PropertyStatus[] = [
  'watching',
  'analyzing',
  'contacted',
  'under_contract',
  'owned',
  'passed',
  'archived',
];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  watching: 'Watching',
  analyzing: 'Analyzing',
  contacted: 'Contacted',
  under_contract: 'Under Contract',
  owned: 'Owned',
  passed: 'Passed',
  archived: 'Archived',
};

// ===========================================
// Subscription Enums
// ===========================================
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'paused';

// ===========================================
// User Profile Enums
// ===========================================
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

// ===========================================
// LOI Enums
// ===========================================
export type ContingencyType =
  | 'inspection'
  | 'financing'
  | 'title'
  | 'appraisal'
  | 'partner_approval'
  | 'attorney_review';

export type LOIFormat = 'pdf' | 'text' | 'html' | 'docx';

// ===========================================
// Document Enums
// ===========================================
export type DocumentType = 'contract' | 'inspection' | 'appraisal' | 'photos' | 'other';

// ===========================================
// Strategy Enums
// ===========================================

import type { StrategyId } from '@dealscope/shared';

/**
 * StrategyType in mobile = StrategyId from shared (snake_case API identifiers).
 * This is intentionally different from shared's StrategyType which uses
 * camelCase display names ('longTermRental', etc.) for UI components.
 */
export type StrategyType = StrategyId;

export const STRATEGY_LABELS: Record<StrategyType, string> = {
  ltr: 'Long-Term Rental',
  str: 'Short-Term Rental',
  brrrr: 'BRRRR',
  flip: 'Fix & Flip',
  house_hack: 'House Hack',
  wholesale: 'Wholesale',
};

// ===========================================
// Search Source Enum
// ===========================================
export type SearchSource = 'web' | 'mobile' | 'api' | 'scanner';

// ===========================================
// Color Label Enum
// ===========================================
export type ColorLabel = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange' | 'gray';

// ===========================================
// Proforma Enums
// ===========================================
export type DepreciationMethod = 'straight-line' | 'macrs';

export type ProformaFormat = 'json' | 'xlsx' | 'pdf';

// ===========================================
// Pagination Response Wrapper
// ===========================================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ===========================================
// API Error Response
// ===========================================
export interface APIError {
  detail: string;
  error?: boolean;
  code?: string;
  message?: string;
}

// ===========================================
// Success Message Response
// ===========================================
export interface SuccessMessage {
  message: string;
  success: boolean;
}

// ===========================================
// Phone Number Type
// ===========================================
export type PhoneType = 'mobile' | 'home' | 'work' | 'fax' | 'other';

export interface PhoneNumber {
  type: PhoneType;
  number: string;
  primary: boolean;
}

// ===========================================
// Social Links Type
// ===========================================
export interface SocialLinks {
  linkedin?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  website?: string | null;
}
