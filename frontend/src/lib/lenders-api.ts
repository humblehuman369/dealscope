/**
 * Hard money lender directory API helpers (/api/lenders).
 *
 * Lender records live behind the authenticated, paginated backend API —
 * the dataset no longer ships in the client bundle (Task 3.1).
 */

export interface LenderDisplay {
  loan_range: string | null
  max_ltv: string | null
  max_arv: string | null
  interest_rate: string | null
  points: string | null
  term: string | null
}

export type CreditCheckPolicy = 'none' | 'soft_pull' | 'hard_pull'

export interface Lender {
  id: number
  domain: string
  company_name: string
  website: string
  phone: string | null
  email: string | null
  contact_type: 'phone_email' | 'phone_only' | 'email_only' | 'web_only'
  city: string | null
  state: string | null
  states_served: string[]
  states_served_count: number
  nationwide: boolean
  loan_products: string[]
  description: string | null
  min_loan_amount: number | null
  max_loan_amount: number | null
  max_ltv: number | null
  max_arv: number | null
  min_interest_rate: number | null
  max_interest_rate: number | null
  min_points: number | null
  max_points: number | null
  min_term_months: number | null
  max_term_months: number | null
  interest_only: boolean | null
  display: LenderDisplay | null
  nmls_id: string | null
  aapl_member: boolean | null
  year_founded: number | null
  credit_check_policy: CreditCheckPolicy | null
  min_credit_score: number | null
  no_credit_check: boolean | null
}

export interface LenderListResponse {
  lenders: Lender[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LenderStatsResponse {
  total: number
  byState: Record<string, number>
  byProduct: Record<string, number>
  byCreditPolicy: Record<string, number>
  noCreditCheckCount: number
  nationwideCount: number
}

/** Backend page ceiling (25/page per the gating plan). */
export const LENDERS_PAGE_SIZE = 25

export interface AppliedLenderFilters {
  state: string
  product: string
  minLoan: string
  credit: string
  search: string
  includeWebOnly: boolean
}

export function buildLendersListPath(filters: AppliedLenderFilters, page: number): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(LENDERS_PAGE_SIZE))
  if (filters.state) params.set('state', filters.state)
  if (filters.product) params.set('product', filters.product)
  if (filters.minLoan) params.set('min_loan', filters.minLoan)
  if (filters.credit) params.set('credit', filters.credit)
  if (filters.search.trim()) params.set('q', filters.search.trim())
  if (!filters.includeWebOnly) params.set('include_web_only', 'false')
  return `/api/lenders?${params.toString()}`
}
