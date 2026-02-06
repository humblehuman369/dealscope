/**
 * Authentication service for user login, registration, and token management.
 * Uses expo-secure-store for secure token storage.
 */

import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { UserResponse as User } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Secure storage keys
const ACCESS_TOKEN_KEY = 'investiq_access_token';
const REFRESH_TOKEN_KEY = 'investiq_refresh_token';
const USER_DATA_KEY = 'investiq_user_data';

// User type imported from centralized types
// export interface User { ... } removed to avoid duplication

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
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/**
 * Get the stored refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
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
    const response = await authApi.post<User>(
      '/api/v1/auth/register',
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        console.error('[Auth] Network error during registration:', error.message);
        throw new AuthError(
          'Unable to connect to server. Please check your internet connection and try again.',
          0
        );
      }
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
    const tokenResponse = await authApi.post<TokenResponse>(
      '/api/v1/auth/login',
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
        timeout: 30000,
      }
    );
    
    const user = userResponse.data;
    
    // Store user data
    await storeUserData(user);
    
    return { user, tokens };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Network error (CORS, server unreachable, DNS failure, etc.)
      if (!error.response) {
        const apiUrl = API_BASE_URL || '(not set)';
        console.error(`[Auth] Network error connecting to ${apiUrl}:`, error.message);
        throw new AuthError(
          `Unable to connect to server. Please check your internet connection and try again.`,
          0
        );
      }
      const message = error.response?.data?.detail || 'Login failed';
      throw new AuthError(message, error.response?.status);
    }
    console.error('[Auth] Unexpected login error:', error);
    throw new AuthError('Login failed. Please check your connection and try again.');
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
      await authApi.post('/api/v1/auth/logout', {});
    }
  } catch (error) {
    // Ignore logout API errors
    console.warn('[Auth] Logout API call failed:', error);
  } finally {
    // Always clear local data
    await clearAuthData();
  }
}

/**
 * Refresh the access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    // Use raw axios here to avoid circular interceptor calls
    const response = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error: any) {
    console.warn('[Auth] Token refresh failed:', error?.message);
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
    await authApi.post('/api/v1/auth/forgot-password', { email });
  } catch (error) {
    // Always succeed to prevent email enumeration
    console.warn('[Auth] Forgot password request:', error);
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

// ============================================
// Email Verification Functions
// ============================================

/**
 * Verify email with token from email link.
 */
export async function verifyEmail(token: string): Promise<void> {
  try {
    await authApi.post('/api/v1/auth/verify-email', { token });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new AuthError('Unable to connect to server. Please check your connection.', 0);
      }
      const message = error.response?.data?.detail || 'Email verification failed';
      throw new AuthError(message, error.response?.status);
    }
    throw new AuthError('Email verification failed. Please try again.');
  }
}

/**
 * Resend verification email.
 */
export async function resendVerificationEmail(): Promise<void> {
  try {
    await authApi.post('/api/v1/auth/resend-verification');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Failed to resend verification email';
      throw new AuthError(message, error.response?.status);
    }
    throw new AuthError('Failed to resend verification email. Please try again.');
  }
}

// ============================================
// Password Reset Functions
// ============================================

/**
 * Reset password with token from email.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    await authApi.post('/api/v1/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new AuthError('Unable to connect to server. Please check your connection.', 0);
      }
      const message = error.response?.data?.detail || 'Password reset failed';
      throw new AuthError(message, error.response?.status);
    }
    throw new AuthError('Password reset failed. Please try again.');
  }
}

