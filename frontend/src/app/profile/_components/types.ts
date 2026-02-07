// ===========================================
// Profile Page — Shared Types & Constants
// ===========================================

export interface PhoneNumber {
  type: 'mobile' | 'home' | 'work' | 'fax' | 'other'
  number: string
  primary: boolean
}

export interface SocialLinks {
  linkedin?: string
  facebook?: string
  instagram?: string
  twitter?: string
  youtube?: string
  tiktok?: string
  website?: string
}

export interface UserProfile {
  id: string
  user_id: string
  investment_experience?: string
  preferred_strategies?: string[]
  target_markets?: string[]
  investment_budget_min?: number
  investment_budget_max?: number
  target_cash_on_cash?: number
  target_cap_rate?: number
  risk_tolerance?: string
  default_assumptions?: Record<string, unknown>
  notification_preferences?: Record<string, boolean>
  preferred_theme?: string
  onboarding_completed: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

export interface UserData {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  business_name?: string
  business_type?: string
  business_address_street?: string
  business_address_city?: string
  business_address_state?: string
  business_address_zip?: string
  business_address_country?: string
  phone_numbers?: PhoneNumber[]
  additional_emails?: string[]
  social_links?: SocialLinks
  license_number?: string
  license_state?: string
  bio?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
  last_login?: string
}

export type TabType = 'account' | 'business' | 'investor' | 'preferences'

export interface AccountFormData {
  full_name: string
  avatar_url: string
}

export interface BusinessFormData {
  business_name: string
  business_type: string
  business_address_street: string
  business_address_city: string
  business_address_state: string
  business_address_zip: string
  phone_numbers: PhoneNumber[]
  additional_emails: string[]
  social_links: SocialLinks
  license_number: string
  license_state: string
  bio: string
}

export interface InvestorFormData {
  investment_experience: string
  preferred_strategies: string[]
  target_markets: string[]
  investment_budget_min: number
  investment_budget_max: number
  target_cash_on_cash: number
  target_cap_rate: number
  risk_tolerance: string
}

// ===========================================
// Constants
// ===========================================

export const STRATEGIES = [
  { id: 'ltr', label: 'Long-Term Rental', color: 'bg-blue-500' },
  { id: 'str', label: 'Short-Term Rental', color: 'bg-purple-500' },
  { id: 'brrrr', label: 'BRRRR', color: 'bg-orange-500' },
  { id: 'flip', label: 'Fix & Flip', color: 'bg-pink-500' },
  { id: 'house_hack', label: 'House Hack', color: 'bg-green-500' },
  { id: 'wholesale', label: 'Wholesale', color: 'bg-cyan-500' },
] as const

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to real estate investing' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-5 deals completed' },
  { value: 'advanced', label: 'Advanced', desc: '5-20 deals completed' },
  { value: 'expert', label: 'Expert', desc: '20+ deals, full-time investor' },
] as const

export const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', desc: 'Prefer stable, lower returns' },
  { value: 'moderate', label: 'Moderate', desc: 'Balance of risk and reward' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk for higher returns' },
] as const

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
