/**
 * Auth tests — login flow, token refresh, biometric, logout.
 */

import * as SecureStore from 'expo-secure-store';
import {
  hydrateTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  hasTokens,
} from '@/services/token-manager';
import { authApi } from '@/services/auth';
import { apiRequest, ApiError } from '@/services/api';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
} from '@/services/biometric';

// ---------------------------------------------------------------------------
// Token Manager
// ---------------------------------------------------------------------------

describe('Token Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setTokens makes hasTokens return true', async () => {
    await setTokens('access-123', 'refresh-456');

    expect(hasTokens()).toBe(true);
    expect(getAccessToken()).toBe('access-123');
    expect(getRefreshToken()).toBe('refresh-456');
  });

  test('setTokens persists to SecureStore', async () => {
    await setTokens('new-access', 'new-refresh');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'dgiq_access_token',
      'new-access',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'dgiq_refresh_token',
      'new-refresh',
    );
  });

  test('clearTokens removes from SecureStore and memory', async () => {
    await setTokens('a', 'b');
    await clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasTokens()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('login success stores tokens', async () => {
    const loginResponse = {
      user: { id: '1', email: 'test@test.com', subscription_tier: 'free' },
      access_token: 'at-1',
      refresh_token: 'rt-1',
      token_type: 'bearer',
      expires_in: 300,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(loginResponse),
    });

    const result = await authApi.login('test@test.com', 'password');

    expect('access_token' in result).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'dgiq_access_token',
      'at-1',
    );
  });

  test('login with MFA returns challenge', async () => {
    const mfaResponse = {
      mfa_required: true,
      challenge_token: 'challenge-xyz',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mfaResponse),
    });

    const result = await authApi.login('test@test.com', 'password');

    expect('mfa_required' in result && result.mfa_required).toBe(true);
    // Tokens should NOT be stored for MFA challenge
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('login failure throws ApiError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ detail: 'Invalid credentials' })),
    });

    await expect(authApi.login('bad@test.com', 'wrong')).rejects.toThrow();
  });

  test('logout clears tokens', async () => {
    await setTokens('a', 'b');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Logged out' }),
    });

    await authApi.logout();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// API Client — 401 refresh
// ---------------------------------------------------------------------------

describe('API Client — Token Refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('retries request after successful 401 refresh', async () => {
    await setTokens('expired', 'valid-refresh');

    // First call: 401
    // Second call: refresh success
    // Third call: retry success
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"detail":"Unauthorized"}'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'new-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      });

    const result = await apiRequest('/api/v1/test');

    expect(result).toEqual({ data: 'success' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Biometric
// ---------------------------------------------------------------------------

describe('Biometric Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('isBiometricAvailable returns false on simulator', async () => {
    const result = await isBiometricAvailable();
    expect(result).toBe(false);
  });

  test('setBiometricEnabled persists to SecureStore', async () => {
    await setBiometricEnabled(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'dgiq_biometric_enabled',
      'true',
    );

    await setBiometricEnabled(false);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'dgiq_biometric_enabled',
    );
  });
});
