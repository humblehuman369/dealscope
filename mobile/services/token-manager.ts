/**
 * Token Manager — SecureStore-backed token persistence for mobile auth.
 *
 * Stores access and refresh tokens in the device's secure keychain
 * (iOS Keychain / Android Keystore). Provides an in-memory layer so
 * reads don't hit the keychain on every API call.
 */

import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'dgiq_access_token';
const REFRESH_TOKEN_KEY = 'dgiq_refresh_token';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _hydrated = false;

/**
 * Load tokens from SecureStore into memory. Call once at app startup.
 */
export async function hydrateTokens(): Promise<void> {
  if (_hydrated) return;
  try {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    _accessToken = access;
    _refreshToken = refresh;
  } catch {
    _accessToken = null;
    _refreshToken = null;
  }
  _hydrated = true;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

export function hasTokens(): boolean {
  return _accessToken !== null;
}

/**
 * Persist both tokens after login or refresh.
 */
export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/**
 * Update only the access token (after a silent refresh).
 */
export async function setAccessToken(accessToken: string): Promise<void> {
  _accessToken = accessToken;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
}

/**
 * Clear all tokens (logout).
 */
export async function clearTokens(): Promise<void> {
  _accessToken = null;
  _refreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
