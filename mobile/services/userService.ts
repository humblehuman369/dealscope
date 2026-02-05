/**
 * User Service - User profile and account management
 *
 * Handles all user-related API calls including profile updates,
 * investor preferences, default assumptions, and account deletion.
 */

import { api, APIRequestError } from './apiClient';
import {
  UserResponse,
  UserUpdate,
  UserProfileResponse,
  UserProfileUpdate,
  UserWithProfile,
  OnboardingProgress,
  SuccessMessage,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  ME: '/api/v1/users/me',
  PROFILE: '/api/v1/users/me/profile',
  ONBOARDING: '/api/v1/users/me/onboarding',
  ONBOARDING_COMPLETE: '/api/v1/users/me/onboarding/complete',
  ASSUMPTIONS: '/api/v1/users/me/assumptions',
};

// ===========================================
// User Account Endpoints
// ===========================================

/**
 * Get current user data
 */
export async function getCurrentUser(): Promise<UserResponse> {
  return api.get<UserResponse>(ENDPOINTS.ME);
}

/**
 * Update current user
 */
export async function updateUser(data: UserUpdate): Promise<UserResponse> {
  return api.patch<UserResponse>(ENDPOINTS.ME, data);
}

/**
 * Delete current user account
 * WARNING: This action is irreversible
 */
export async function deleteAccount(): Promise<SuccessMessage> {
  return api.del<SuccessMessage>(ENDPOINTS.ME);
}

// ===========================================
// User Profile Endpoints
// ===========================================

/**
 * Get user profile (investor preferences)
 */
export async function getUserProfile(): Promise<UserProfileResponse> {
  return api.get<UserProfileResponse>(ENDPOINTS.PROFILE);
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  data: UserProfileUpdate
): Promise<UserProfileResponse> {
  return api.patch<UserProfileResponse>(ENDPOINTS.PROFILE, data);
}

/**
 * Get user with full profile
 */
export async function getUserWithProfile(): Promise<UserWithProfile> {
  // Fetch both in parallel
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getUserProfile().catch(() => null), // Profile might not exist
  ]);

  return {
    ...user,
    profile,
  };
}

// ===========================================
// Onboarding Endpoints
// ===========================================

/**
 * Update onboarding progress
 */
export async function updateOnboarding(
  data: OnboardingProgress
): Promise<UserProfileResponse> {
  return api.post<UserProfileResponse>(ENDPOINTS.ONBOARDING, data);
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(): Promise<UserProfileResponse> {
  return api.post<UserProfileResponse>(ENDPOINTS.ONBOARDING_COMPLETE, {});
}

// ===========================================
// Default Assumptions Endpoints
// ===========================================

/**
 * Get user's custom default assumptions
 */
export async function getUserAssumptions(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(ENDPOINTS.ASSUMPTIONS);
}

/**
 * Update user's custom default assumptions
 */
export async function updateUserAssumptions(
  assumptions: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return api.put<Record<string, unknown>>(ENDPOINTS.ASSUMPTIONS, assumptions);
}

/**
 * Reset user assumptions to global defaults
 */
export async function resetUserAssumptions(): Promise<SuccessMessage> {
  return api.del<SuccessMessage>(ENDPOINTS.ASSUMPTIONS);
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get user display name
 */
export function getUserDisplayName(user: UserResponse): string {
  return user.full_name || user.email.split('@')[0];
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user: UserResponse): string {
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }
  return user.email.substring(0, 2).toUpperCase();
}

/**
 * Check if user has completed their profile
 */
export function isProfileComplete(user: UserResponse, profile?: UserProfileResponse | null): boolean {
  // Basic user info check
  const hasBasicInfo = Boolean(user.full_name);

  // Business info check (at least one business field)
  const hasBusinessInfo = Boolean(
    user.business_name ||
    user.business_type ||
    user.business_address_street
  );

  // Profile check
  const hasInvestorProfile = Boolean(
    profile?.investment_experience ||
    (profile?.preferred_strategies && profile.preferred_strategies.length > 0)
  );

  return hasBasicInfo && hasInvestorProfile;
}

/**
 * Get profile completion percentage
 */
export function getProfileCompletionPercentage(
  user: UserResponse,
  profile?: UserProfileResponse | null
): number {
  let completed = 0;
  const total = 10;

  // User fields
  if (user.full_name) completed++;
  if (user.avatar_url) completed++;
  if (user.business_name) completed++;
  if (user.business_type) completed++;
  if (user.business_address_street) completed++;

  // Profile fields
  if (profile?.investment_experience) completed++;
  if (profile?.preferred_strategies?.length) completed++;
  if (profile?.target_markets?.length) completed++;
  if (profile?.investment_budget_min !== null) completed++;
  if (profile?.risk_tolerance) completed++;

  return Math.round((completed / total) * 100);
}

// ===========================================
// Export as userService object
// ===========================================
export const userService = {
  // Account
  getCurrentUser,
  updateUser,
  deleteAccount,

  // Profile
  getUserProfile,
  updateUserProfile,
  getUserWithProfile,

  // Onboarding
  updateOnboarding,
  completeOnboarding,

  // Assumptions
  getUserAssumptions,
  updateUserAssumptions,
  resetUserAssumptions,

  // Helpers
  getUserDisplayName,
  getUserInitials,
  isProfileComplete,
  getProfileCompletionPercentage,
};

export default userService;
