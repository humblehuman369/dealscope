/**
 * Authentication service for user login, registration, and token management.
 * Uses expo-secure-store for secure token storage.
 */

import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Secure storage keys
const ACCESS_TOKEN_KEY = 'investiq_access_token';
const REFRESH_TOKEN_KEY = 'investiq_refresh_token';
const USER_DATA_KEY = 'investiq_user_data';

/**
 * User data returned from the API.
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login: string | null;
  has_profile: boolean;
  onboarding_completed: boolean;
}

/**
 * Token response from login/refresh endpoints.
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Registration request data.
 */
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

/**
 * Login request data.
 */
export interface LoginData {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * Auth error with message.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public field?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Create an axios instance with auth interceptors.
 */
const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
authApi.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors
authApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const tokens = await refreshAccessToken(refreshToken);
          if (tokens) {
            await storeTokens(tokens);
            originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
            return authApi(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        await clearAuthData();
      }
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// Token Storage Functions
// ============================================

/**
 * Store tokens securely.
 */
export async function storeTokens(tokens: TokenResponse): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

/**
 * Get the stored access token.
 */
export async function getAccessToken(): Promise<string | null> {
  // #region agent log
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  console.log('[DEBUG-H2,H5] getAccessToken:', JSON.stringify({hasToken:!!token,tokenLength:token?.length||0,tokenPrefix:token?.substring(0,20)||'NULL',tokenSuffix:token?.substring((token?.length||0)-10)||'NULL'}));
  // #endregion
  return token;
}

/**
 * Get the stored refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  // #region agent log
  const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  console.log('[DEBUG-H1,H2] getRefreshToken:', JSON.stringify({hasToken:!!token,tokenLength:token?.length||0,tokenPrefix:token?.substring(0,20)||'NULL'}));
  // #endregion
  return token;
}

/**
 * Store user data locally.
 */
export async function storeUserData(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
}

/**
 * Get stored user data.
 */
export async function getStoredUserData(): Promise<User | null> {
  const data = await SecureStore.getItemAsync(USER_DATA_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Clear all auth data (logout).
 */
export async function clearAuthData(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_DATA_KEY);
}

/**
 * Check if user is authenticated (has valid token).
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

// ============================================
// API Functions
// ============================================

/**
 * Register a new user.
 */
export async function register(data: RegisterData): Promise<User> {
  try {
    const response = await axios.post<User>(
      `${API_BASE_URL}/api/v1/auth/register`,
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Registration failed';
      throw new AuthError(message, error.response?.status);
    }
    throw new AuthError('Registration failed. Please try again.');
  }
}

/**
 * Login and get tokens.
 */
export async function login(data: LoginData): Promise<{ user: User; tokens: TokenResponse }> {
  try {
    // Step 1: Get tokens
    const tokenResponse = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/v1/auth/login`,
      data
    );
    
    const tokens = tokenResponse.data;
    
    // Store tokens immediately
    await storeTokens(tokens);
    
    // Step 2: Get user data with the new token
    const userResponse = await axios.get<User>(
      `${API_BASE_URL}/api/v1/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );
    
    const user = userResponse.data;
    
    // Store user data
    await storeUserData(user);
    
    return { user, tokens };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Login failed';
      throw new AuthError(message, error.response?.status);
    }
    throw new AuthError('Login failed. Please try again.');
  }
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<void> {
  try {
    // Notify server (optional - JWT is stateless)
    const token = await getAccessToken();
    if (token) {
      await axios.post(
        `${API_BASE_URL}/api/v1/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }
  } catch (error) {
    // Ignore logout API errors
    console.warn('Logout API call failed:', error);
  } finally {
    // Always clear local data
    await clearAuthData();
  }
}

/**
 * Refresh the access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  // #region agent log
  console.log('[DEBUG-H1,H3,H4] refreshAccessToken:entry:', JSON.stringify({apiUrl:API_BASE_URL,refreshTokenLength:refreshToken?.length||0,refreshTokenPrefix:refreshToken?.substring(0,20)||'NULL'}));
  // #endregion
  try {
    const response = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken }
    );
    // #region agent log
    console.log('[DEBUG-H1] refreshAccessToken:success:', JSON.stringify({hasNewToken:!!response.data?.access_token}));
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    console.log('[DEBUG-H1,H3] refreshAccessToken:error:', JSON.stringify({errorStatus:error?.response?.status,errorMessage:error?.response?.data?.detail||error?.message,errorName:error?.name}));
    // #endregion
    console.warn('Token refresh failed:', error);
    return null;
  }
}

/**
 * Get current user data from API.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await authApi.get<User>('/api/v1/auth/me');
    await storeUserData(response.data);
    return response.data;
  } catch (error) {
    console.warn('Failed to get current user:', error);
    return null;
  }
}

/**
 * Request password reset email.
 */
export async function forgotPassword(email: string): Promise<void> {
  try {
    await axios.post(`${API_BASE_URL}/api/v1/auth/forgot-password`, { email });
  } catch (error) {
    // Always succeed to prevent email enumeration
    console.warn('Forgot password request:', error);
  }
}

/**
 * Change password for logged-in user.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    await authApi.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Password change failed';
      throw new AuthError(message, error.response?.status);
    }
    throw new AuthError('Password change failed. Please try again.');
  }
}

/**
 * Validate password requirements.
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

