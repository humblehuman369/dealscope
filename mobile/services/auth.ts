/**
 * Auth Service — authentication API methods for mobile.
 *
 * Mirrors the web frontend's authApi but uses Bearer tokens
 * persisted via SecureStore (see token-manager.ts).
 *
 * The backend supports both cookie and header-based auth, so
 * all endpoints work identically — the only difference is how
 * the token is delivered (cookie vs Authorization header).
 */

import { apiRequest, ApiError } from './api';
import { setTokens, clearTokens } from './token-manager';

// ---------------------------------------------------------------------------
// Response types (mirrored from web api-client.ts)
// ---------------------------------------------------------------------------

export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  mfa_enabled: boolean;
  created_at: string;
  last_login: string | null;
  has_profile: boolean;
  onboarding_completed: boolean;
  roles: string[];
  permissions: string[];
  subscription_tier: 'free' | 'pro';
  subscription_status: string;
}

export interface LoginResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface MFAChallengeResponse {
  mfa_required: boolean;
  challenge_token: string;
}

export interface RegisterResponse {
  message: string;
  requires_verification?: boolean;
  user?: UserResponse;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface MFASetupResponse {
  secret: string;
  provisioning_uri: string;
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * Fetch the current user. Uses softAuth so a 401 doesn't
   * immediately clear the session — the caller decides.
   */
  me: () =>
    apiRequest<UserResponse>('/api/v1/auth/me', { softAuth: true }),

  /**
   * Login with email/password. On success, persists tokens.
   * May return MFAChallengeResponse if MFA is enabled.
   */
  login: async (
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<LoginResponse | MFAChallengeResponse> => {
    const result = await apiRequest<LoginResponse | MFAChallengeResponse>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: { email, password, remember_me: rememberMe },
        skipAuth: true,
      },
    );

    if ('access_token' in result && result.access_token) {
      await setTokens(result.access_token, result.refresh_token);
    }
    return result;
  },

  /**
   * Complete MFA challenge with TOTP code.
   */
  loginMfa: async (
    challengeToken: string,
    totpCode: string,
    rememberMe = false,
  ): Promise<LoginResponse> => {
    const result = await apiRequest<LoginResponse>(
      '/api/v1/auth/login/mfa',
      {
        method: 'POST',
        body: {
          challenge_token: challengeToken,
          totp_code: totpCode,
          remember_me: rememberMe,
        },
        skipAuth: true,
      },
    );

    if (result.access_token) {
      await setTokens(result.access_token, result.refresh_token);
    }
    return result;
  },

  register: (email: string, password: string, fullName: string) =>
    apiRequest<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, full_name: fullName },
      skipAuth: true,
    }),

  logout: async () => {
    try {
      await apiRequest<{ message: string }>('/api/v1/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Best effort — clear local tokens regardless
    }
    await clearTokens();
  },

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: { token, new_password: newPassword },
      skipAuth: true,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    }),

  verifyEmail: (token: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { token },
      skipAuth: true,
    }),

  // Sessions
  listSessions: () =>
    apiRequest<SessionInfo[]>('/api/v1/auth/sessions'),

  revokeSession: (sessionId: string) =>
    apiRequest<{ message: string }>(
      `/api/v1/auth/sessions/${sessionId}`,
      { method: 'DELETE' },
    ),

  // MFA
  setupMfa: () =>
    apiRequest<MFASetupResponse>('/api/v1/auth/mfa/setup', {
      method: 'POST',
    }),

  verifyMfa: (totpCode: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: { totp_code: totpCode },
    }),

  disableMfa: () =>
    apiRequest<{ message: string }>('/api/v1/auth/mfa', {
      method: 'DELETE',
    }),
};

export { ApiError };
