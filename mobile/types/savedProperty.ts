/**
 * Saved Property types - matching backend schemas/saved_property.py exactly
 */

import { PropertyStatus, ColorLabel, StrategyType } from './api';
import { DealMakerRecord } from './dealMaker';

// ===========================================
// Saved Property Summary (list view)
// ===========================================
export interface SavedPropertySummary {
  id: string;
  address_street: string;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  nickname: string | null;
  status: PropertyStatus;
  tags: string[] | null;
  color_label: ColorLabel | null;
  priority: number | null; // 1-5

  // Quick metrics
  best_strategy: StrategyType | null;
  best_cash_flow: number | null;
  best_coc_return: number | null;

  // Timestamps
  saved_at: string; // ISO datetime
  last_viewed_at: string | null;
  updated_at: string;
}

// ===========================================
// Saved Property Response (full detail)
// ===========================================
export interface SavedPropertyResponse extends SavedPropertySummary {
  user_id: string;
  external_property_id: string | null;
  zpid: string | null;
  full_address: string | null;

  // Full property data
  property_data_snapshot: Record<string, unknown> | null;

  // Custom adjustments (DEPRECATED - use deal_maker_record)
  custom_purchase_price: number | null;
  custom_rent_estimate: number | null;
  custom_arv: number | null;
  custom_rehab_budget: number | null;
  custom_daily_rate: number | null;
  custom_occupancy_rate: number | null;
  custom_assumptions: Record<string, unknown> | null;

  // Worksheet assumptions (DEPRECATED - use deal_maker_record)
  worksheet_assumptions: Record<string, unknown> | null;

  // Deal Maker Record - the central analysis data structure
  deal_maker_record: DealMakerRecord | null;

  // Notes
  notes: string | null;

  // Analytics cache
  last_analytics_result: Record<string, unknown> | null;
  analytics_calculated_at: string | null;

  // Refresh timestamp
  data_refreshed_at: string | null;

  // Related counts
  document_count: number;
  adjustment_count: number;
}

// ===========================================
// Saved Property Create Request
// ===========================================
export interface SavedPropertyCreate {
  // Property identification
  external_property_id?: string | null;
  zpid?: string | null;

  // Address (required)
  address_street: string;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  full_address?: string | null;

  // Property data snapshot
  property_data_snapshot?: Record<string, unknown> | null;

  // Deal Maker Record
  deal_maker_record?: DealMakerRecord | null;

  // Initial status
  status?: PropertyStatus;

  // Optional metadata
  nickname?: string | null;
  tags?: string[] | null;
  color_label?: ColorLabel | null;
  priority?: number | null;
  notes?: string | null;
}

// ===========================================
// Saved Property Update Request
// ===========================================
export interface SavedPropertyUpdate {
  nickname?: string | null;
  tags?: string[] | null;
  color_label?: ColorLabel | null;
  priority?: number | null;
  notes?: string | null;
  status?: PropertyStatus;
  display_order?: number;

  // Custom value adjustments (DEPRECATED - use deal_maker_record)
  custom_purchase_price?: number | null;
  custom_rent_estimate?: number | null;
  custom_arv?: number | null;
  custom_rehab_budget?: number | null;
  custom_daily_rate?: number | null;
  custom_occupancy_rate?: number | null;
  custom_assumptions?: Record<string, unknown> | null;

  // Worksheet assumptions (DEPRECATED - use deal_maker_record)
  worksheet_assumptions?: Record<string, unknown> | null;

  // Deal Maker Record - the central analysis data structure
  deal_maker_record?: DealMakerRecord | null;
}

// ===========================================
// Property Adjustment
// ===========================================
export interface PropertyAdjustmentCreate {
  adjustment_type: string;
  field_name?: string | null;
  previous_value?: unknown;
  new_value?: unknown;
  reason?: string | null;
}

export interface PropertyAdjustmentResponse extends PropertyAdjustmentCreate {
  id: string;
  property_id: string;
  created_at: string;
}

// ===========================================
// Bulk Operations
// ===========================================
export interface BulkStatusUpdate {
  property_ids: string[];
  status: PropertyStatus;
}

export interface BulkTagUpdate {
  property_ids: string[];
  add_tags?: string[] | null;
  remove_tags?: string[] | null;
}

export interface BulkDeleteRequest {
  property_ids: string[];
}

// ===========================================
// Portfolio Stats
// ===========================================
export interface PortfolioStats {
  total_properties: number;
  by_status: Record<PropertyStatus, number>;
  total_value: number | null;
  total_equity: number | null;
  total_monthly_cash_flow: number | null;
  average_coc_return: number | null;
}

// ===========================================
// Helper Functions
// ===========================================
export function getDisplayAddress(property: SavedPropertySummary): string {
  return property.nickname || property.address_street;
}

export function getShortAddress(property: SavedPropertySummary): string {
  return property.address_street;
}

export function getCityStateZip(property: SavedPropertySummary): string {
  const parts: string[] = [];
  if (property.address_city) parts.push(property.address_city);
  if (property.address_state) parts.push(property.address_state);
  if (property.address_zip) parts.push(property.address_zip);
  return parts.join(', ');
}
