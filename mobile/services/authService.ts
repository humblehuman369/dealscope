/**
 * Authentication service for mobile — uses expo-secure-store for tokens.
 *
 * Design:
 *  - Refresh token stored in SecureStore (persists across app restarts)
 *  - Access JWT kept in memory only (short-lived, 5 min)
 *  - No token logging in any environment
 *  - MFA flow support
 *  - Biometric unlock support via expo-local-authentication
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Secure storage keys
const REFRESH_TOKEN_KEY = 'iq_refresh_token';
const USER_DATA_KEY = 'iq_user_data';
const BIOMETRIC_ENABLED_KEY = 'iq_biometric_enabled';

// In-memory access token — never persisted to disk
let _accessToken: string | null = null;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

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

export interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export class AuthError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && _accessToken) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${_accessToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new AuthError(body.detail || `Error ${response.status}`, response.status);
  }

  return response.json();
}

// ------------------------------------------------------------------
// Token management
// ------------------------------------------------------------------

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  _accessToken = accessToken;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export async function clearTokens(): Promise<void> {
  _accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_DATA_KEY);
}

async function refreshTokens(): Promise<boolean> {
  const rt = await getRefreshToken();
  if (!rt) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!res.ok) {
      await clearTokens();
      return false;
    }

    const data = await res.json();
    if (data.access_token && data.refresh_token) {
      await storeTokens(data.access_token, data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// User data cache
// ------------------------------------------------------------------

export async function storeUserData(user: UserResponse): Promise<void> {
  await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
}

export async function getStoredUserData(): Promise<UserResponse | null> {
  const data = await SecureStore.getItemAsync(USER_DATA_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Auth operations
// ------------------------------------------------------------------

export async function login(
  email: string,
  password: string,
  rememberMe = false,
): Promise<LoginResponse | MFAChallengeResponse> {
  const result = await apiFetch<LoginResponse | MFAChallengeResponse>(
    '/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
    },
  );

  if ('mfa_required' in result && result.mfa_required) {
    return result;
  }

  const loginData = result as LoginResponse;
  await storeTokens(loginData.access_token, loginData.refresh_token);
  await storeUserData(loginData.user);
  return loginData;
}

export async function loginMfa(
  challengeToken: string,
  totpCode: string,
  rememberMe = false,
): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>('/api/v1/auth/login/mfa', {
    method: 'POST',
    body: JSON.stringify({
      challenge_token: challengeToken,
      totp_code: totpCode,
      remember_me: rememberMe,
    }),
  });

  await storeTokens(result.access_token, result.refresh_token);
  await storeUserData(result.user);
  return result;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  } catch {
    // Best effort
  }
  await clearTokens();
}

export async function getCurrentUser(): Promise<UserResponse> {
  const user = await apiFetch<UserResponse>('/api/v1/auth/me');
  await storeUserData(user);
  return user;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// ------------------------------------------------------------------
// MFA
// ------------------------------------------------------------------

export async function setupMfa(): Promise<{ secret: string; provisioning_uri: string }> {
  return apiFetch('/api/v1/auth/mfa/setup', { method: 'POST' });
}

export async function confirmMfa(totpCode: string): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ totp_code: totpCode }),
  });
}

export async function disableMfa(): Promise<{ message: string }> {
  return apiFetch('/api/v1/auth/mfa', { method: 'DELETE' });
}

// ------------------------------------------------------------------
// Sessions
// ------------------------------------------------------------------

export async function listSessions(): Promise<SessionInfo[]> {
  return apiFetch('/api/v1/auth/sessions');
}

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  return apiFetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

// ------------------------------------------------------------------
// Biometric helpers
// ------------------------------------------------------------------

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}

// ------------------------------------------------------------------
// Validation helpers
// ------------------------------------------------------------------

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One digit');
  return { valid: errors.length === 0, errors };
}

// ------------------------------------------------------------------
// Initialization — try to restore session on app start
// ------------------------------------------------------------------

export async function initializeAuth(): Promise<UserResponse | null> {
  const rt = await getRefreshToken();
  if (!rt) return null;

  const refreshed = await refreshTokens();
  if (!refreshed) return null;

  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
