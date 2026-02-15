/**
 * Authentication service for mobile — uses expo-secure-store for tokens.
 *
 * Design:
 *  - Refresh token stored in SecureStore (persists across app restarts)
 *  - Access JWT kept in memory only (short-lived, 5 min)
 *  - No token logging in any environment
 *  - Shared refresh mutex prevents concurrent refresh races
 *  - Authenticated requests go through apiClient (single HTTP stack)
 *  - Unauthenticated requests (login, register) use bare axios
 *  - MFA flow support
 *  - Biometric unlock support via expo-local-authentication
 */

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { UserResponse } from '../types/user';

// Re-export so other modules can import from authService if they already do
export type { UserResponse };

// Secure storage keys
const REFRESH_TOKEN_KEY = 'iq_refresh_token';
const USER_DATA_KEY = 'iq_user_data';
const BIOMETRIC_ENABLED_KEY = 'iq_biometric_enabled';

// In-memory access token — never persisted to disk
let _accessToken: string | null = null;

// ------------------------------------------------------------------
// Auth state change listener
//
// When clearTokens is called from the refresh mutex (i.e. refresh
// failed), the AuthContext won't know unless we tell it. This
// callback lets AuthContext subscribe once on mount.
// ------------------------------------------------------------------

type AuthStateListener = (event: 'tokens_cleared') => void;
let _authStateListener: AuthStateListener | null = null;

/**
 * Register a listener that fires when tokens are cleared outside
 * the normal logout flow (e.g. refresh failure). Only one listener
 * is supported — the AuthContext owns it.
 */
export function onAuthStateChange(listener: AuthStateListener | null): void {
  _authStateListener = listener;
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

export async function clearTokens(silent = false): Promise<void> {
  _accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_DATA_KEY);

  // Notify the AuthContext when tokens are cleared unexpectedly
  // (e.g. refresh failure). The `silent` flag is set by logout()
  // which handles its own state reset.
  if (!silent && _authStateListener) {
    _authStateListener('tokens_cleared');
  }
}

// ------------------------------------------------------------------
// Shared refresh mutex
//
// Both the apiClient 401 interceptor and auth operations converge
// here. Only one refresh request is ever in-flight; concurrent
// callers await the same promise. This prevents the backend from
// seeing two competing refresh requests (which would invalidate
// the rotated token and force logout).
// ------------------------------------------------------------------

let _refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the access token using the stored refresh token.
 * Uses a mutex so concurrent 401s share a single refresh request.
 *
 * Returns `true` if refresh succeeded (new tokens stored),
 * `false` if refresh failed (tokens cleared).
 */
export async function refreshWithMutex(): Promise<boolean> {
  // If a refresh is already in-flight, piggyback on it
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    const rt = await getRefreshToken();
    if (!rt) return false;

    try {
      // Import API_BASE_URL here to break circular init dependency.
      // apiClient.ts defines API_BASE_URL and imports from authService.ts;
      // authService.ts needs the URL only at call-time, not at load-time.
      const { API_BASE_URL } = await import('./apiClient');

      // Use bare axios (not apiClient) to avoid the interceptor
      // re-triggering another refresh cycle
      const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
        refresh_token: rt,
      });

      const { access_token, refresh_token } = res.data;
      if (access_token && refresh_token) {
        await storeTokens(access_token, refresh_token);
        return true;
      }
      return false;
    } catch {
      await clearTokens();
      return false;
    }
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
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
// Helpers — authenticated requests go through apiClient
// ------------------------------------------------------------------

/**
 * Helper for authenticated requests that go through the shared
 * apiClient (which has the 401 interceptor + refresh mutex).
 * Throws AuthError on failure for backward compatibility.
 */
async function authRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  endpoint: string,
  data?: unknown,
): Promise<T> {
  // Lazy import to break circular dependency at module load time.
  // At call-time both modules are fully initialized.
  const { apiClient } = await import('./apiClient');

  try {
    const response = method === 'get'
      ? await apiClient.get<T>(endpoint)
      : method === 'delete'
        ? await apiClient.delete<T>(endpoint)
        : await apiClient[method]<T>(endpoint, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data;
      const detail =
        typeof body?.detail === 'string'
          ? body.detail
          : error.message || 'Request failed';
      throw new AuthError(detail, error.response?.status);
    }
    throw error;
  }
}

/**
 * Helper for unauthenticated requests (login, register, forgot-password).
 * Uses bare axios to avoid the auth interceptor attaching a stale token.
 */
async function publicRequest<T>(
  endpoint: string,
  data: unknown,
): Promise<T> {
  const { API_BASE_URL } = await import('./apiClient');

  try {
    const response = await axios.post<T>(`${API_BASE_URL}${endpoint}`, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data;
      const detail =
        typeof body?.detail === 'string'
          ? body.detail
          : error.message || 'Request failed';
      throw new AuthError(detail, error.response?.status);
    }
    throw error;
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
  const result = await publicRequest<LoginResponse | MFAChallengeResponse>(
    '/api/v1/auth/login',
    { email, password, remember_me: rememberMe },
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
  const result = await publicRequest<LoginResponse>(
    '/api/v1/auth/login/mfa',
    {
      challenge_token: challengeToken,
      totp_code: totpCode,
      remember_me: rememberMe,
    },
  );

  await storeTokens(result.access_token, result.refresh_token);
  await storeUserData(result.user);
  return result;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<{ message: string }> {
  return publicRequest('/api/v1/auth/register', {
    email,
    password,
    full_name: fullName,
  });
}

export async function logout(): Promise<void> {
  try {
    await authRequest('post', '/api/v1/auth/logout');
  } catch {
    // Best effort
  }
  // silent=true: AuthContext handles its own state reset in the logout callback
  await clearTokens(/* silent */ true);
}

export async function getCurrentUser(): Promise<UserResponse> {
  const user = await authRequest<UserResponse>('get', '/api/v1/auth/me');
  await storeUserData(user);
  return user;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return publicRequest('/api/v1/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return publicRequest('/api/v1/auth/reset-password', {
    token,
    new_password: newPassword,
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return authRequest('post', '/api/v1/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return publicRequest('/api/v1/auth/verify-email', { token });
}

// ------------------------------------------------------------------
// MFA
// ------------------------------------------------------------------

export async function setupMfa(): Promise<{ secret: string; provisioning_uri: string }> {
  return authRequest('post', '/api/v1/auth/mfa/setup');
}

export async function confirmMfa(totpCode: string): Promise<{ message: string }> {
  return authRequest('post', '/api/v1/auth/mfa/verify', { totp_code: totpCode });
}

export async function disableMfa(): Promise<{ message: string }> {
  return authRequest('delete', '/api/v1/auth/mfa');
}

// ------------------------------------------------------------------
// Sessions
// ------------------------------------------------------------------

export async function listSessions(): Promise<SessionInfo[]> {
  return authRequest('get', '/api/v1/auth/sessions');
}

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  return authRequest('delete', `/api/v1/auth/sessions/${sessionId}`);
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
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) errors.push('One special character');
  return { valid: errors.length === 0, errors };
}

// ------------------------------------------------------------------
// Initialization — try to restore session on app start
// ------------------------------------------------------------------

export async function initializeAuth(): Promise<UserResponse | null> {
  const rt = await getRefreshToken();
  if (!rt) return null;

  const refreshed = await refreshWithMutex();
  if (!refreshed) return null;

  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
