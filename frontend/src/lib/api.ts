/**
 * InvestIQ API Client
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }

  return response.json()
}

// Types
export interface PropertySearchRequest {
  address: string
  city?: string
  state?: string
  zip_code?: string
}

export interface PropertyResponse {
  property_id: string
  address: {
    street: string
    city: string
    state: string
    zip_code: string
    full_address: string
  }
  details: {
    property_type: string
    bedrooms: number
    bathrooms: number
    square_footage: number
    year_built: number
  }
  valuations: {
    current_value_avm: number
    value_range_low: number
    value_range_high: number
    arv: number
    arv_flip: number
  }
  rentals: {
    monthly_rent_ltr: number
    average_daily_rate: number
    occupancy_rate: number
  }
  market: {
    property_taxes_annual: number
    hoa_fees_monthly: number
  }
  data_quality: {
    completeness_score: number
    missing_fields: string[]
    conflict_fields: string[]
  }
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
  [key: string]: any
}

export interface STRResults {
  monthly_cash_flow: number
  annual_cash_flow: number
  cash_on_cash_return: number
  break_even_occupancy: number
  total_gross_revenue: number
  [key: string]: any
}

export interface BRRRRResults {
  cash_left_in_deal: number
  infinite_roi_achieved: boolean
  post_refi_cash_on_cash: number
  equity_position: number
  [key: string]: any
}

export interface FlipResults {
  net_profit_before_tax: number
  roi: number
  annualized_roi: number
  meets_70_rule: boolean
  [key: string]: any
}

export interface HouseHackResults {
  net_housing_cost_scenario_a: number
  savings_vs_renting_a: number
  housing_cost_offset_pct: number
  [key: string]: any
}

export interface WholesaleResults {
  net_profit: number
  roi: number
  deal_viability: string
  [key: string]: any
}

// API Functions
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

    quick: (propertyId: string, params?: { purchase_price?: number; down_payment_pct?: number; interest_rate?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.purchase_price) searchParams.set('purchase_price', String(params.purchase_price))
      if (params?.down_payment_pct) searchParams.set('down_payment_pct', String(params.down_payment_pct))
      if (params?.interest_rate) searchParams.set('interest_rate', String(params.interest_rate))
      return apiRequest<any>(`/api/v1/analytics/${propertyId}/quick?${searchParams}`)
    },
  },

  // Assumptions
  assumptions: {
    defaults: () => apiRequest<{ assumptions: AllAssumptions }>('/api/v1/assumptions/defaults'),
  },

  // Comparison
  comparison: {
    get: (propertyId: string) => apiRequest<any>(`/api/v1/comparison/${propertyId}`),
  },

  // Sensitivity analysis
  sensitivity: {
    analyze: (data: {
      property_id: string
      assumptions: AllAssumptions
      variable: string
      range_pct?: number[]
    }) =>
      apiRequest<any>('/api/v1/sensitivity/analyze', {
        method: 'POST',
        body: data,
      }),
  },
}

export default api
