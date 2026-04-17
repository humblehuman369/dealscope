/**
 * DealGapIQ Domain API
 *
 * Domain-specific API methods (properties, analytics, proforma, LOI, etc.)
 * built on top of the core client in `api-client.ts`.
 *
 * The core client handles:
 * - httpOnly cookie authentication
 * - CSRF double-submit pattern
 * - 401 automatic refresh & retry
 * - credentials: 'include' on every request
 *
 * Import from this file for domain methods and types.
 * Import from `api-client.ts` for auth methods and the generic CRUD client.
 */

import { apiRequest } from '@/lib/api-client'
import { API_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import type { PropertyResponse } from '@dealscope/shared'

// Re-export so existing consumers can still import from this file
export type { PropertyResponse }

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface PropertySearchRequest {
  address: string
  city?: string
  state?: string
  zip_code?: string
}

export interface AnalyticsRequest {
  property_id: string
  assumptions?: AllAssumptions
  strategies?: string[]
}

export interface AllAssumptions {
  financing?: {
    purchase_price?: number
    down_payment_pct?: number
    interest_rate?: number
    loan_term_years?: number
    closing_costs_pct?: number
  }
  operating?: {
    vacancy_rate?: number
    property_management_pct?: number
    maintenance_pct?: number
    insurance_annual?: number
  }
  str?: {
    platform_fees_pct?: number
    str_management_pct?: number
    cleaning_cost_per_turnover?: number
    furniture_setup_cost?: number
  }
  brrrr?: {
    refinance_ltv?: number
    refinance_interest_rate?: number
  }
  flip?: {
    hard_money_rate?: number
    selling_costs_pct?: number
    holding_period_months?: number
  }
  house_hack?: {
    fha_down_payment_pct?: number
    units_rented_out?: number
    room_rent_monthly?: number
  }
  wholesale?: {
    assignment_fee?: number
    days_to_close?: number
  }
}

export interface AnalyticsResponse {
  property_id: string
  assumptions_hash: string
  calculated_at: string
  ltr?: LTRResults
  str?: STRResults
  brrrr?: BRRRRResults
  flip?: FlipResults
  house_hack?: HouseHackResults
  wholesale?: WholesaleResults
}

export interface LTRResults {
  monthly_cash_flow: number
  annual_cash_flow: number
  cash_on_cash_return: number
  cap_rate: number
  noi: number
  dscr: number
  grm: number
  total_cash_required: number
  [key: string]: number
}

export interface STRResults {
  monthly_cash_flow: number
  annual_cash_flow: number
  cash_on_cash_return: number
  break_even_occupancy: number
  total_gross_revenue: number
  [key: string]: number
}

export interface BRRRRResults {
  cash_left_in_deal: number
  infinite_roi_achieved: boolean
  post_refi_cash_on_cash: number
  equity_position: number
  [key: string]: number | boolean
}

export interface FlipResults {
  net_profit_before_tax: number
  roi: number
  annualized_roi: number
  meets_70_rule: boolean
  [key: string]: number | boolean
}

export interface HouseHackResults {
  net_housing_cost_scenario_a: number
  savings_vs_renting_a: number
  housing_cost_offset_pct: number
  [key: string]: number
}

export interface WholesaleResults {
  net_profit: number
  roi: number
  deal_viability: string
  [key: string]: number | string
}

// LOI Types
export interface LOIBuyerInfo {
  name: string
  company?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  email?: string
}

export interface LOIPropertyInfo {
  address: string
  city: string
  state: string
  zip_code: string
  county?: string
  parcel_id?: string
  legal_description?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  square_footage?: number
  year_built?: number
  lot_size?: number
}

export interface LOITerms {
  offer_price: number
  earnest_money: number
  earnest_money_holder: string
  inspection_period_days: number
  closing_period_days: number
  offer_expiration_days: number
  allow_assignment: boolean
  contingencies: string[]
  is_cash_offer: boolean
  seller_concessions: number
  additional_terms?: string
}

export interface LOIAnalysisData {
  arv?: number
  estimated_rehab?: number
  max_allowable_offer?: number
  deal_viability?: string
  include_in_loi: boolean
}

export interface GenerateLOIRequest {
  buyer: LOIBuyerInfo
  seller?: { name?: string; address?: string }
  property_info: LOIPropertyInfo
  terms: LOITerms
  analysis?: LOIAnalysisData
  format: 'pdf' | 'text' | 'html'
  include_cover_letter?: boolean
  professional_letterhead?: boolean
  include_signature_lines?: boolean
}

export interface LOIDocument {
  id: string
  created_at: string
  content_text: string
  content_html?: string
  pdf_base64?: string
  property_address: string
  offer_price: number
  earnest_money: number
  inspection_days: number
  closing_days: number
  expiration_date: string
  buyer_name: string
  seller_name?: string
  format_generated: string
}

// ------------------------------------------------------------------
// Map Search Types
// ------------------------------------------------------------------

export interface MapSearchRequest {
  north: number
  south: number
  east: number
  west: number
  polygon?: number[][]
  listing_type?: 'sale' | 'rental' | 'both'
  property_type?: string
  min_price?: number
  max_price?: number
  bedrooms?: number
  bathrooms?: number
  listing_statuses?: string[]
  include_str_listings?: boolean
  str_state?: string
  str_city?: string
  limit?: number
  offset?: number
}

export interface MapListing {
  id: string
  address: string
  city?: string | null
  state?: string | null
  zip_code?: string | null
  latitude: number
  longitude: number
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  property_type: string | null
  listing_status: string | null
  photo_url: string | null
  source: string
  days_on_market: number | null
  year_built: number | null
  night_price?: number | null
  occupancy?: number | null
  star_rating?: number | null
  reviews_count?: number | null
}

export interface MapSearchResponse {
  listings: MapListing[]
  total_count: number
  estimated_total?: number | null
  viewport_center: number[]
}

export interface HeatmapRequest {
  state: string
  sw_lat: number
  sw_lng: number
  ne_lat: number
  ne_lng: number
  metric_type?: string
}

export interface HeatmapPolygon {
  id: number
  boundary: string
  color?: string | null
  border_color?: string | null
  color_level?: number | null
  value?: number | null
  airbnb_coc?: number | null
}

export interface HeatmapResponse {
  polygons: HeatmapPolygon[]
  metric_type: string
  total_count: number
}

export interface NeighborhoodSummary {
  id: number
  name: string
  city?: string | null
  state?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface NeighborhoodOverview {
  id?: string | number | null
  name?: string | null
  city?: string | null
  state?: string | null
  walkscore?: number | null
  transitscore?: number | null
  bikescore?: number | null
  mashmeter?: number | null
  mashmeter_stars?: number | null
  median_price?: number | null
  price_per_sqft?: number | null
  num_of_properties?: number | null
  num_of_airbnb_properties?: number | null
  avg_occupancy?: number | null
  avg_days_on_market?: number | null
  recommended_strategy?: string | null
  airbnb_cap_rate?: number | null
  airbnb_rental_income?: number | null
  airbnb_coc?: number | null
  traditional_cap_rate?: number | null
  traditional_rental_income?: number | null
  traditional_coc?: number | null
  sale_price_trend_1yr?: number | null
  sale_price_trend_3yr?: number | null
  sale_price_trend_5yr?: number | null
  sold_last_month?: number | null
  sold_last_year?: number | null
}

export interface NeighborhoodListResponse {
  neighborhoods: NeighborhoodSummary[]
  city: string
  state: string
  total_count: number
}

// ------------------------------------------------------------------
// Authenticated blob fetch — used for file downloads (Excel, PDF)
// that need auth headers but return binary data (not JSON).
// ------------------------------------------------------------------

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith('csrf_token='))
  return match ? match.split('=')[1] : null
}

function getMemoryToken(): string | null {
  if (IS_CAPACITOR && typeof localStorage !== 'undefined') {
    return localStorage.getItem('dgiq_access_token')
  }
  return null
}

async function fetchWithAuth(url: string): Promise<Response> {
  const headers: Record<string, string> = {}

  const token = getMemoryToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const csrf = getCsrfToken()
  if (csrf) headers['X-CSRF-Token'] = csrf

  return fetch(url, {
    credentials: IS_CAPACITOR ? 'omit' : 'include',
    headers,
  })
}

// ------------------------------------------------------------------
// Domain API methods — all delegate to apiRequest from api-client.ts
// ------------------------------------------------------------------

export const api = {
  // Health check
  health: () => apiRequest<{ status: string }>('/health'),

  // Property endpoints
  properties: {
    search: (data: PropertySearchRequest) =>
      apiRequest<PropertyResponse>('/api/v1/properties/search', {
        method: 'POST',
        body: data,
      }),

    get: (propertyId: string) =>
      apiRequest<PropertyResponse>(`/api/v1/properties/${propertyId}`),

    demo: () =>
      apiRequest<PropertyResponse>('/api/v1/properties/demo/sample'),
  },

  // Analytics endpoints
  analytics: {
    calculate: (data: AnalyticsRequest) =>
      apiRequest<AnalyticsResponse>('/api/v1/analytics/calculate', {
        method: 'POST',
        body: data,
      }),

    quick: (
      propertyId: string,
      params?: {
        purchase_price?: number
        down_payment_pct?: number
        interest_rate?: number
      },
    ) => {
      const searchParams = new URLSearchParams()
      if (params?.purchase_price)
        searchParams.set('purchase_price', String(params.purchase_price))
      if (params?.down_payment_pct)
        searchParams.set('down_payment_pct', String(params.down_payment_pct))
      if (params?.interest_rate)
        searchParams.set('interest_rate', String(params.interest_rate))
      return apiRequest<Record<string, unknown>>(
        `/api/v1/analytics/${propertyId}/quick?${searchParams}`,
      )
    },
  },

  // Assumptions
  assumptions: {
    defaults: () =>
      apiRequest<{ assumptions: AllAssumptions }>('/api/v1/assumptions/defaults'),
  },

  // Map Search
  mapSearch: {
    searchArea: (data: MapSearchRequest) =>
      apiRequest<MapSearchResponse>('/api/v1/properties/search-area', {
        method: 'POST',
        body: data,
      }),
    heatmap: (data: HeatmapRequest) =>
      apiRequest<HeatmapResponse>('/api/v1/map/heatmap', {
        method: 'POST',
        body: data,
      }),
    neighborhoods: (state: string, city: string) =>
      apiRequest<NeighborhoodListResponse>(`/api/v1/map/neighborhoods/${state}/${encodeURIComponent(city)}`),
    neighborhoodOverview: (id: number, state: string) =>
      apiRequest<NeighborhoodOverview>(`/api/v1/map/neighborhood/${id}?state=${state}`),
  },

  // Comparison
  comparison: {
    get: (propertyId: string) =>
      apiRequest<Record<string, unknown>>(`/api/v1/comparison/${propertyId}`),
  },

  // Sensitivity analysis
  sensitivity: {
    analyze: (data: {
      property_id: string
      assumptions: AllAssumptions
      variable: string
      range_pct?: number[]
    }) =>
      apiRequest<Record<string, unknown>>('/api/v1/sensitivity/analyze', {
        method: 'POST',
        body: data,
      }),
  },

  // Proforma export endpoints
  proforma: {
    downloadExcel: async (params: {
      propertyId: string
      address: string
      strategy?: string
      holdPeriodYears?: number
      landValuePercent?: number
      marginalTaxRate?: number
      capitalGainsTaxRate?: number
    }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('address', params.address)
      if (params.strategy) searchParams.set('strategy', params.strategy)
      if (params.holdPeriodYears)
        searchParams.set('hold_period_years', String(params.holdPeriodYears))
      if (params.landValuePercent)
        searchParams.set('land_value_percent', String(params.landValuePercent))
      if (params.marginalTaxRate)
        searchParams.set('marginal_tax_rate', String(params.marginalTaxRate))
      if (params.capitalGainsTaxRate)
        searchParams.set('capital_gains_tax_rate', String(params.capitalGainsTaxRate))

      const url = `${API_BASE_URL}/api/v1/proforma/property/${params.propertyId}/excel?${searchParams}`
      const response = await fetchWithAuth(url)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to download proforma: ${response.status} - ${errorText}`,
        )
      }

      return response.blob()
    },

    downloadPdf: async (params: {
      propertyId: string
      address: string
      strategy?: string
      holdPeriodYears?: number
      landValuePercent?: number
      marginalTaxRate?: number
      capitalGainsTaxRate?: number
    }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('address', params.address)
      if (params.strategy) searchParams.set('strategy', params.strategy)
      if (params.holdPeriodYears)
        searchParams.set('hold_period_years', String(params.holdPeriodYears))
      if (params.landValuePercent)
        searchParams.set('land_value_percent', String(params.landValuePercent))
      if (params.marginalTaxRate)
        searchParams.set('marginal_tax_rate', String(params.marginalTaxRate))
      if (params.capitalGainsTaxRate)
        searchParams.set('capital_gains_tax_rate', String(params.capitalGainsTaxRate))

      const url = `${API_BASE_URL}/api/v1/proforma/property/${params.propertyId}/pdf?${searchParams}`
      const response = await fetchWithAuth(url)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to download proforma: ${response.status} - ${errorText}`,
        )
      }

      return response.blob()
    },

    getData: (params: {
      propertyId: string
      strategy?: string
      holdPeriodYears?: number
    }) => {
      const searchParams = new URLSearchParams()
      if (params.strategy) searchParams.set('strategy', params.strategy)
      if (params.holdPeriodYears)
        searchParams.set('hold_period_years', String(params.holdPeriodYears))
      return apiRequest<Record<string, unknown>>(
        `/api/v1/proforma/property/${params.propertyId}?${searchParams}`,
      )
    },
  },

  // LOI (Letter of Intent) endpoints
  loi: {
    generate: (data: GenerateLOIRequest) =>
      apiRequest<LOIDocument>('/api/v1/loi/generate', {
        method: 'POST',
        body: data,
      }),

    quickGenerate: (params: {
      property_address: string
      property_city: string
      property_state?: string
      property_zip?: string
      offer_price: number
      earnest_money?: number
      inspection_days?: number
      closing_days?: number
      buyer_name: string
      buyer_company?: string
      buyer_email?: string
      buyer_phone?: string
      include_assignment?: boolean
      format?: string
    }) => {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
      return apiRequest<LOIDocument>(
        `/api/v1/loi/quick-generate?${searchParams}`,
        { method: 'POST' },
      )
    },

    templates: () =>
      apiRequest<
        Array<{
          id: string
          name: string
          description: string
          is_default: boolean
        }>
      >('/api/v1/loi/templates'),

    preferences: () =>
      apiRequest<Record<string, unknown>>('/api/v1/loi/preferences'),

    savePreferences: (prefs: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/api/v1/loi/preferences', {
        method: 'POST',
        body: prefs,
      }),
  },
}

export default api
