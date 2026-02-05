/**
 * Letter of Intent (LOI) types - matching backend schemas/loi.py exactly
 */

import { ContingencyType, LOIFormat } from './api';

// ===========================================
// Buyer Information
// ===========================================
export interface BuyerInfo {
  name: string;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
}

// ===========================================
// Seller Information
// ===========================================
export interface SellerInfo {
  name?: string | null;
  address?: string | null;
  is_entity: boolean;
}

// ===========================================
// Property Information
// ===========================================
export interface LOIPropertyInfo {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string | null;
  parcel_id?: string | null;
  legal_description?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null;
  year_built?: number | null;
  lot_size?: number | null;
}

// ===========================================
// LOI Terms
// ===========================================
export interface LOITerms {
  // Financial Terms
  offer_price: number;
  earnest_money: number;
  earnest_money_holder: string;

  // Timeline
  inspection_period_days: number;
  closing_period_days: number;
  offer_expiration_days: number;

  // Assignment
  allow_assignment: boolean;
  assignment_fee_disclosed: boolean;

  // Contingencies
  contingencies: ContingencyType[];

  // Additional Terms
  include_personal_property: boolean;
  seller_concessions: number;
  additional_terms?: string | null;

  // Financing
  is_cash_offer: boolean;
  proof_of_funds_included: boolean;
}

// ===========================================
// LOI Analysis Data
// ===========================================
export interface LOIAnalysisData {
  arv?: number | null;
  estimated_rehab?: number | null;
  max_allowable_offer?: number | null;
  deal_viability?: string | null;
  include_in_loi: boolean;
}

// ===========================================
// Generate LOI Request
// ===========================================
export interface GenerateLOIRequest {
  buyer: BuyerInfo;
  seller?: SellerInfo | null;
  property_info: LOIPropertyInfo;
  terms: LOITerms;
  analysis?: LOIAnalysisData | null;
  format: LOIFormat;
  include_cover_letter: boolean;
  professional_letterhead: boolean;
  include_signature_lines: boolean;
}

// ===========================================
// LOI Document Response
// ===========================================
export interface LOIDocument {
  id: string;
  created_at: string;

  // Document content
  content_text: string;
  content_html?: string | null;
  pdf_base64?: string | null;

  // Summary
  property_address: string;
  offer_price: number;
  earnest_money: number;
  inspection_days: number;
  closing_days: number;
  expiration_date: string;

  // Metadata
  buyer_name: string;
  seller_name?: string | null;
  format_generated: LOIFormat;
}

// ===========================================
// LOI Template Info
// ===========================================
export interface LOITemplateInfo {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  state_specific?: string | null;
}

// ===========================================
// LOI History Item
// ===========================================
export interface LOIHistoryItem {
  id: string;
  created_at: string;
  property_address: string;
  offer_price: number;
  status: 'draft' | 'sent' | 'accepted' | 'countered' | 'rejected' | 'expired';
  seller_name?: string | null;
  notes?: string | null;
}

// ===========================================
// LOI User Preferences
// ===========================================
export interface LOIUserPreferences {
  // Default buyer info
  default_buyer?: BuyerInfo | null;

  // Default terms
  default_earnest_money: number;
  default_inspection_days: number;
  default_closing_days: number;
  default_contingencies: ContingencyType[];

  // Always include assignment clause
  always_assign: boolean;

  // Preferred format
  preferred_format: LOIFormat;

  // Custom clauses
  custom_inspection_clause?: string | null;
  custom_assignment_clause?: string | null;
  custom_closing_clause?: string | null;
}

// ===========================================
// Quick Generate Request
// ===========================================
export interface QuickGenerateLOIRequest {
  property_address: string;
  offer_price: number;
  earnest_money?: number;
  inspection_days?: number;
  closing_days?: number;
  format?: LOIFormat;
}

// ===========================================
// Default LOI Terms
// ===========================================
export const DEFAULT_LOI_TERMS: Partial<LOITerms> = {
  earnest_money: 1000,
  earnest_money_holder: 'Title Company',
  inspection_period_days: 14,
  closing_period_days: 30,
  offer_expiration_days: 3,
  allow_assignment: true,
  assignment_fee_disclosed: false,
  contingencies: ['inspection', 'title'],
  include_personal_property: false,
  seller_concessions: 0,
  is_cash_offer: true,
  proof_of_funds_included: false,
};

// ===========================================
// Contingency Labels
// ===========================================
export const CONTINGENCY_LABELS: Record<ContingencyType, string> = {
  inspection: 'Property Inspection',
  financing: 'Financing Approval',
  title: 'Clear Title',
  appraisal: 'Property Appraisal',
  partner_approval: 'Partner Approval',
  attorney_review: 'Attorney Review',
};
