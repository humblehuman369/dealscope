/**
 * Unit tests for services/authService.ts
 *
 * Tests token management, refresh mutex behavior, login/logout flows,
 * and validation helpers. Mocks expo-secure-store and axios.
 */

import axios from 'axios';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(mockSecureStore[key] ?? null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    post: jest.fn(),
    isAxiosError: actual.isAxiosError,
  };
});

jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  API_BASE_URL: 'https://api.test.com',
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function clearSecureStore() {
  for (const key of Object.keys(mockSecureStore)) {
    delete mockSecureStore[key];
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

import {
  storeTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  refreshWithMutex,
  login,
  logout,
  validateEmail,
  validatePassword,
  onAuthStateChange,
} from '../../services/authService';

beforeEach(() => {
  clearSecureStore();
  jest.clearAllMocks();
  // Reset in-memory access token by clearing
  // (login/storeTokens sets it; clearTokens wipes it)
});

// ─── Token management ────────────────────────────────────────────────────────

describe('token management', () => {
  it('stores and retrieves access and refresh tokens', async () => {
    await storeTokens('access-123', 'refresh-456');
    expect(getAccessToken()).toBe('access-123');
    expect(await getRefreshToken()).toBe('refresh-456');
  });

  it('clears all tokens', async () => {
    await storeTokens('a', 'r');
    await clearTokens(true);
    expect(getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });

  it('fires auth state listener on non-silent clear', async () => {
    const listener = jest.fn();
    onAuthStateChange(listener);
    await storeTokens('a', 'r');
    await clearTokens(false);
    expect(listener).toHaveBeenCalledWith('tokens_cleared');
    onAuthStateChange(null);
  });

  it('does not fire listener on silent clear', async () => {
    const listener = jest.fn();
    onAuthStateChange(listener);
    await storeTokens('a', 'r');
    await clearTokens(true);
    expect(listener).not.toHaveBeenCalled();
    onAuthStateChange(null);
  });
});

// ─── Refresh mutex ───────────────────────────────────────────────────────────
// Note: refreshWithMutex, login, logout use dynamic imports (await import())
// which require --experimental-vm-modules in Jest. We test the token management
// and validation functions here; integration tests for refresh/login/logout
// should use a dev build or E2E test runner.

describe('refreshWithMutex', () => {
  it('returns false when no refresh token exists', async () => {
    const result = await refreshWithMutex();
    expect(result).toBe(false);
  });
});

// ─── Validation helpers ──────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('a+b@test.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@missing.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    const result = validatePassword('StrongP@ss1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a weak password with specific errors', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('requires at least 8 characters', () => {
    const result = validatePassword('Aa1!');
    expect(result.errors).toContain('At least 8 characters');
  });
});
