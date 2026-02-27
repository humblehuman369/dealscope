/**
 * useProfileData — fetches and updates user profile data.
 *
 * Mirrors the frontend's useProfileData hook.
 * Two endpoints: /api/v1/users/me (account+business) and
 * /api/v1/users/me/profile (investor profile).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSession } from './useSession';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
  subscription_tier: string;
  subscription_status: string;
  business_name?: string | null;
  business_type?: string | null;
  business_address_street?: string | null;
  business_address_city?: string | null;
  business_address_state?: string | null;
  business_address_zip?: string | null;
  phone_numbers?: Array<{ type: string; number: string; primary: boolean }>;
  social_links?: {
    website?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  license_number?: string | null;
  license_state?: string | null;
  bio?: string | null;
}

export interface InvestorProfile {
  investment_experience?: string | null;
  preferred_strategies?: string[];
  investment_budget_min?: number | null;
  investment_budget_max?: number | null;
  target_cash_on_cash?: number | null;
  target_cap_rate?: number | null;
  risk_tolerance?: string | null;
  target_markets?: string[];
  email_deal_alerts?: boolean;
  email_weekly_digest?: boolean;
  push_new_analysis?: boolean;
  push_price_changes?: boolean;
  marketing_emails?: boolean;
}

const PROFILE_KEYS = {
  user: ['user', 'me'] as const,
  investor: ['user', 'investor-profile'] as const,
};

export function useUserProfile() {
  const { isAuthenticated } = useSession();
  return useQuery<UserProfile>({
    queryKey: PROFILE_KEYS.user,
    queryFn: () => api.get<UserProfile>('/api/v1/users/me'),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useInvestorProfile() {
  const { isAuthenticated } = useSession();
  return useQuery<InvestorProfile>({
    queryKey: PROFILE_KEYS.investor,
    queryFn: () => api.get<InvestorProfile>('/api/v1/users/me/profile'),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserProfile>) =>
      api.patch<UserProfile>('/api/v1/users/me', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEYS.user });
    },
  });
}

export function useUpdateInvestorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InvestorProfile>) =>
      api.patch<InvestorProfile>('/api/v1/users/me/profile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEYS.investor });
    },
  });
}
