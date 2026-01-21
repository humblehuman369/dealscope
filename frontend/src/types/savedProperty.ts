/**
 * Canonical SavedProperty type - Single source of truth
 * Matches backend SavedPropertyResponse schema exactly
 */

export type PropertyStatus = 
  | 'watching' 
  | 'analyzing' 
  | 'contacted' 
  | 'under_contract' 
  | 'owned' 
  | 'passed' 
  | 'archived'

export interface PropertyDataSnapshot {
  // Zillow Property ID for API calls
  zpid?: string | number
  
  // Address info (stored in snapshot for reliability)
  street?: string
  city?: string
  state?: string
  zipCode?: string
  
  // Property details
  listPrice?: number
  monthlyRent?: number
  propertyTaxes?: number
  insurance?: number
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  arv?: number
  averageDailyRate?: number
  occupancyRate?: number
  photos?: string[]
}

export interface SavedProperty {
  // Core identification
  id: string
  user_id?: string
  external_property_id?: string
  zpid?: string
  
  // Address fields (from backend)
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  full_address?: string
  
  // User customization
  nickname?: string
  status?: PropertyStatus
  tags?: string[]
  color_label?: string
  priority?: number
  notes?: string
  
  // Property data at time of save
  property_data_snapshot: PropertyDataSnapshot
  
  // Custom adjustments
  custom_purchase_price?: number
  custom_rent_estimate?: number
  custom_arv?: number
  custom_rehab_budget?: number
  custom_daily_rate?: number
  custom_occupancy_rate?: number
  custom_assumptions?: Record<string, any>
  
  // Worksheet assumptions (detailed analysis settings)
  worksheet_assumptions?: Record<string, any>
  
  // Analytics cache
  last_analytics_result?: Record<string, any>
  analytics_calculated_at?: string
  
  // Quick metrics (from analytics)
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  
  // Timestamps
  created_at?: string
  saved_at?: string
  updated_at?: string
  last_viewed_at?: string
  data_refreshed_at?: string
  
  // Related counts
  document_count?: number
  adjustment_count?: number
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
