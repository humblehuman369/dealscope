/**
 * User and UserProfile types - matching backend schemas/user.py exactly
 */

import {
  ExperienceLevel,
  RiskTolerance,
  PhoneNumber,
  SocialLinks,
} from './api';

// ===========================================
// User Response (from GET /users/me)
// ===========================================
export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string; // ISO datetime
  last_login: string | null;

  // Security / RBAC
  mfa_enabled: boolean;
  roles: string[];
  permissions: string[];

  // Business Profile
  business_name: string | null;
  business_type: string | null;
  business_address_street: string | null;
  business_address_city: string | null;
  business_address_state: string | null;
  business_address_zip: string | null;
  business_address_country: string | null;
  phone_numbers: PhoneNumber[] | null;
  additional_emails: string[] | null;
  social_links: SocialLinks | null;
  license_number: string | null;
  license_state: string | null;
  bio: string | null;

  // Profile summary
  has_profile: boolean;
  onboarding_completed: boolean;
}

// ===========================================
// User Update (PATCH /users/me)
// ===========================================
export interface UserUpdate {
  full_name?: string | null;
  avatar_url?: string | null;

  // Business Profile
  business_name?: string | null;
  business_type?: string | null;

  // Business Address
  business_address_street?: string | null;
  business_address_city?: string | null;
  business_address_state?: string | null;
  business_address_zip?: string | null;
  business_address_country?: string | null;

  // Contact Information
  phone_numbers?: PhoneNumber[] | null;
  additional_emails?: string[] | null;

  // Social Links
  social_links?: SocialLinks | null;

  // Professional Info
  license_number?: string | null;
  license_state?: string | null;
  bio?: string | null;
}

// ===========================================
// User Profile Response (from GET /users/me/profile)
// ===========================================
export interface UserProfileResponse {
  id: string;
  user_id: string;

  // Investor Profile
  investment_experience: ExperienceLevel | null;
  preferred_strategies: string[] | null;
  target_markets: string[] | null;
  investment_budget_min: number | null;
  investment_budget_max: number | null;
  target_cash_on_cash: number | null;
  target_cap_rate: number | null;
  risk_tolerance: RiskTolerance | null;

  // Preferences
  default_assumptions: Record<string, unknown> | null;
  notification_preferences: Record<string, unknown> | null;
  dashboard_layout: Record<string, unknown> | null;
  preferred_theme: 'light' | 'dark' | 'system' | null;

  // Onboarding
  onboarding_completed: boolean;
  onboarding_step: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ===========================================
// User Profile Update (PATCH /users/me/profile)
// ===========================================
export interface UserProfileUpdate {
  investment_experience?: ExperienceLevel | null;
  preferred_strategies?: string[] | null;
  target_markets?: string[] | null;
  investment_budget_min?: number | null;
  investment_budget_max?: number | null;
  target_cash_on_cash?: number | null;
  target_cap_rate?: number | null;
  risk_tolerance?: RiskTolerance | null;
  default_assumptions?: Record<string, unknown> | null;
  notification_preferences?: Record<string, unknown> | null;
  dashboard_layout?: Record<string, unknown> | null;
  preferred_theme?: 'light' | 'dark' | 'system' | null;
}

// ===========================================
// User with Profile (combined response)
// ===========================================
export interface UserWithProfile extends UserResponse {
  profile: UserProfileResponse | null;
}

// ===========================================
// Onboarding Progress
// ===========================================
export interface OnboardingProgress {
  step: number; // 0-5
  completed: boolean;
  data: Record<string, unknown> | null;
}

// ===========================================
// Password Change Request
// ===========================================
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// ===========================================
// Password Reset Request
// ===========================================
export interface PasswordResetRequest {
  email: string;
}

// ===========================================
// Password Reset Confirm
// ===========================================
export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

// ===========================================
// Email Verification
// ===========================================
export interface EmailVerificationRequest {
  token: string;
}
