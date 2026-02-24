/**
 * Canonical SavedProperty type - Single source of truth
 * Matches backend SavedPropertyResponse schema exactly
 */

import type { PropertyDataSnapshot } from '@dealscope/shared'

export type { PropertyDataSnapshot }

export type PropertyStatus = 
  | 'watching' 
  | 'analyzing' 
  | 'contacted' 
  | 'under_contract' 
  | 'owned' 
  | 'passed' 
  | 'archived'

// Listing status for property (from AXESSO API)
export type ListingStatus = 'FOR_SALE' | 'FOR_RENT' | 'OFF_MARKET' | 'SOLD' | 'PENDING' | 'OTHER'

// Seller type classification
export type SellerType = 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown'

/** Light-weight summary returned by GET /api/v1/properties/saved (list endpoint). */
export interface SavedPropertySummary {
  id: string
  address_street: string
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  nickname: string | null
  status: PropertyStatus
  tags: string[] | null
  color_label: string | null
  priority: number | null
  best_strategy: string | null
  best_cash_flow: number | null
  best_coc_return: number | null
  saved_at: string
  last_viewed_at: string | null
  updated_at: string
}

/** Stats returned by GET /api/v1/properties/saved/stats. */
export interface SavedPropertyStats {
  total: number
  by_status: Record<string, number>
}

export interface SavedProperty {
  // Core identification
  id: string
  user_id: string
  external_property_id: string | null
  zpid: string | null
  
  // Address fields (from backend)
  address_street: string
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  full_address: string | null
  
  // User customization
  nickname: string | null
  status: PropertyStatus
  tags: string[] | null
  color_label: string | null
  priority: number | null
  notes: string | null
  
  // Property data at time of save
  property_data_snapshot: PropertyDataSnapshot | null
  
  // Custom adjustments (DEPRECATED - use deal_maker_record)
  custom_purchase_price: number | null
  custom_rent_estimate: number | null
  custom_arv: number | null
  custom_rehab_budget: number | null
  custom_daily_rate: number | null
  custom_occupancy_rate: number | null
  custom_assumptions: Record<string, any> | null
  
  // Worksheet assumptions (DEPRECATED - use deal_maker_record)
  worksheet_assumptions: Record<string, any> | null
  
  // Deal Maker Record - the central analysis data structure
  deal_maker_record: Record<string, any> | null
  
  // Analytics cache
  last_analytics_result: Record<string, any> | null
  analytics_calculated_at: string | null
  
  // Quick metrics (inherited from Summary in backend)
  best_strategy: string | null
  best_cash_flow: number | null
  best_coc_return: number | null
  
  // Timestamps
  created_at?: string
  saved_at: string
  updated_at: string
  last_viewed_at: string | null
  data_refreshed_at: string | null
  
  // Related counts
  document_count: number
  adjustment_count: number
}

/**
 * Helper function to get display-friendly address
 */
export function getDisplayAddress(property: SavedProperty): string {
  if (property.full_address) {
    return property.full_address
  }
  
  const parts = [
    property.address_street,
    property.address_city,
    property.address_state,
    property.address_zip
  ].filter(Boolean)
  
  return parts.join(', ').trim() || property.address_street
}

/**
 * Helper to get short address (just street)
 */
export function getShortAddress(property: SavedProperty): string {
  return property.nickname || property.address_street
}

/**
 * Helper to get city/state/zip line
 */
export function getCityStateZip(property: SavedProperty): string {
  const parts = [
    property.address_city,
    property.address_state,
    property.address_zip
  ].filter(Boolean)
  
  return parts.join(', ').trim()
}
