/**
 * InvestIQ API Client
 * Handles all communication with the backend API
 * 
 * Features:
 * - httpOnly cookie-based authentication (XSS-safe)
 * - Automatic 401 interceptor with token refresh
 * - Centralized error handling
 * - credentials: 'include' for cookie transmission
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  skipAuth?: boolean // For public endpoints that don't need auth
}

/**
 * Token management — now cookie-only for web.
 *
 * These functions are kept as no-ops for backward compatibility with
 * code that imports them.  Tokens are managed exclusively via httpOnly
 * cookies set by the server — no JS-accessible token storage.
 */

function getAccessToken(): string | null {
  return null  // Cookie-only — no JS access
}

function getRefreshToken(): string | null {
  return null  // Cookie-only — no JS access
}

function storeTokens(_accessToken: string, _refreshToken: string): void {
  // No-op — tokens are now in httpOnly cookies
}

function clearTokens(): void {
  // No-op — cookies are cleared by the server on logout
}

/**
 * Attempt to refresh the access token.
 * Sends refresh token via both cookie and request body for cross-origin support.
 */
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const currentRefreshToken = getRefreshToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies (works for same-origin)
        // Also send refresh token in body for cross-origin scenarios
        body: JSON.stringify(
          currentRefreshToken ? { refresh_token: currentRefreshToken } : {}
        ),
      })

      if (!response.ok) {
        clearTokens()
        return false
      }

      // Store new tokens from response body
      const data = await response.json()
      if (data.access_token && data.refresh_token) {
        storeTokens(data.access_token, data.refresh_token)
      }

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearTokens()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Redirect to login page (for use when auth fails)
 */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  const currentPath = window.location.pathname
  window.location.href = `/?redirect=${encodeURIComponent(currentPath)}&auth=required`
}

/**
 * Main API request function with cookie-only auth.
 *
 * Auth is handled entirely via httpOnly cookies — no JS token storage.
 * credentials: 'include' ensures cookies are sent on every request.
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  // Handle 401 — try refresh once
  if (response.status === 401 && !skipAuth) {
    const refreshSuccess = await refreshAccessToken()
    if (refreshSuccess) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    } else {
      redirectToLogin()
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }

  return response.json()
}

/**
 * Create an authenticated API request (convenience wrapper)
 * 
 * Note: With httpOnly cookies, we can't check if user is authenticated client-side.
 * The server will return 401 if not authenticated, which triggers redirect.
 */
async function authenticatedRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, options)
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

// LOI (Letter of Intent) Types
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

  // Proforma export endpoints
  proforma: {
    /**
     * Download Excel proforma
     */
    downloadExcel: async (params: {
      propertyId: string
      address: string  // Required for property lookup
      strategy?: string
      holdPeriodYears?: number
      landValuePercent?: number
      marginalTaxRate?: number
      capitalGainsTaxRate?: number
    }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('address', params.address)  // Required
      if (params.strategy) searchParams.set('strategy', params.strategy)
      if (params.holdPeriodYears) searchParams.set('hold_period_years', String(params.holdPeriodYears))
      if (params.landValuePercent) searchParams.set('land_value_percent', String(params.landValuePercent))
      if (params.marginalTaxRate) searchParams.set('marginal_tax_rate', String(params.marginalTaxRate))
      if (params.capitalGainsTaxRate) searchParams.set('capital_gains_tax_rate', String(params.capitalGainsTaxRate))
      
      const url = `${API_BASE_URL}/api/v1/proforma/property/${params.propertyId}/excel?${searchParams}`
      const response = await fetch(url, { credentials: 'include' })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to download proforma: ${response.status} - ${errorText}`)
      }
      
      return response.blob()
    },

    /**
     * Download PDF proforma
     */
    downloadPdf: async (params: {
      propertyId: string
      address: string  // Required for property lookup
      strategy?: string
      holdPeriodYears?: number
      landValuePercent?: number
      marginalTaxRate?: number
      capitalGainsTaxRate?: number
    }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('address', params.address)  // Required
      if (params.strategy) searchParams.set('strategy', params.strategy)
      if (params.holdPeriodYears) searchParams.set('hold_period_years', String(params.holdPeriodYears))
      if (params.landValuePercent) searchParams.set('land_value_percent', String(params.landValuePercent))
      if (params.marginalTaxRate) searchParams.set('marginal_tax_rate', String(params.marginalTaxRate))
      if (params.capitalGainsTaxRate) searchParams.set('capital_gains_tax_rate', String(params.capitalGainsTaxRate))
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/proforma/property/${params.propertyId}/pdf?${searchParams}`,
        { credentials: 'include' }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to download proforma: ${response.status} - ${errorText}`)
      }
      
      return response.blob()
    },

    /**
     * Get proforma data as JSON
     */
    getData: (params: {
      propertyId: string
      strategy?: string
      holdPeriodYears?: number
    }) => {
      const searchParams = new URLSearchParams()
      if (params.strategy) searchParams.set('strategy', params.strategy)
      if (params.holdPeriodYears) searchParams.set('hold_period_years', String(params.holdPeriodYears))
      return apiRequest<any>(`/api/v1/proforma/property/${params.propertyId}?${searchParams}`)
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
      return apiRequest<LOIDocument>(`/api/v1/loi/quick-generate?${searchParams}`, {
        method: 'POST',
      })
    },

    templates: () =>
      apiRequest<Array<{ id: string; name: string; description: string; is_default: boolean }>>('/api/v1/loi/templates'),

    preferences: () =>
      apiRequest<any>('/api/v1/loi/preferences'),

    savePreferences: (prefs: any) =>
      apiRequest<any>('/api/v1/loi/preferences', {
        method: 'POST',
        body: prefs,
      }),
  },
}

// Auth utility exports
export {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearTokens,
  refreshAccessToken,
  authenticatedRequest,
}

export default api
