/**
 * API Client — Bearer token authentication for mobile.
 *
 * Mobile counterpart of the web frontend's api-client.ts. Key differences:
 * - Uses Bearer tokens (stored in SecureStore) instead of cookies
 * - No CSRF protection needed (token-based auth is CSRF-immune)
 * - Base URL from EXPO_PUBLIC_API_URL environment variable
 *
 * Features:
 * - Automatic 401 refresh with request queuing (no race conditions)
 * - Typed error handling mirroring the web client
 * - Request cancellation via AbortSignal
 */

import Constants from 'expo-constants';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  setAccessToken,
  clearTokens,
} from './token-manager';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header entirely (public endpoints). */
  skipAuth?: boolean;
  /** Try refresh on 401 but don't clear session if refresh fails. */
  softAuth?: boolean;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Error formatting (mirrors web client)
// ---------------------------------------------------------------------------

function formatApiErrorDetail(
  detail: unknown,
  status: number,
  rawBody?: Record<string, unknown>,
): string {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail.map(
      (e: { loc?: string[]; msg?: string }) => {
        const field = e.loc?.filter((s) => s !== 'body')[0] ?? 'field';
        const label = field.replace(/_/g, ' ');
        return `${label}: ${e.msg ?? 'invalid'}`;
      },
    );
    return parts.join('. ');
  }

  if (
    detail &&
    typeof detail === 'object' &&
    ('msg' in detail || 'message' in detail)
  ) {
    const msg =
      'msg' in detail
        ? (detail as { msg?: string }).msg
        : (detail as { message?: string }).message;
    if (typeof msg === 'string') return msg;
  }

  if (rawBody) {
    const err = rawBody.error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message?: string }).message;
      if (typeof m === 'string') return m;
    }
    const msg = rawBody.message;
    if (typeof msg === 'string') return msg;
  }

  if (status === 409) {
    return 'This email is already registered. Sign in or use a different email.';
  }
  return `Request failed (${status}). Please check your input and try again.`;
}

// ---------------------------------------------------------------------------
// Refresh queue — prevents parallel refresh calls
// ---------------------------------------------------------------------------

let _refreshPromise: Promise<boolean> | null = null;

/**
 * Optional callback invoked when the session is irreversibly expired
 * (refresh token rejected). The app's auth provider should register
 * this so the UI can redirect to login.
 */
let _onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(cb: () => void): void {
  _onSessionExpired = cb;
}

async function refreshAccessToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!res.ok) return false;

      const body = await res.json();
      if (body.access_token) {
        if (body.refresh_token) {
          await setTokens(body.access_token, body.refresh_token);
        } else {
          await setAccessToken(body.access_token);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    skipAuth = false,
    softAuth = false,
    signal,
  } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    ...(signal && { signal }),
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // 401 → silent refresh → retry
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const freshToken = getAccessToken();
      if (freshToken) {
        requestHeaders['Authorization'] = `Bearer ${freshToken}`;
      }
      const retryConfig: RequestInit = {
        method,
        headers: requestHeaders,
        ...(signal && { signal }),
      };
      if (body !== undefined) {
        retryConfig.body = JSON.stringify(body);
      }
      response = await fetch(`${API_BASE_URL}${endpoint}`, retryConfig);
    } else if (!softAuth) {
      await clearTokens();
      _onSessionExpired?.();
    }
  }

  if (!response.ok) {
    const text = await response.text();
    let errBody: Record<string, unknown>;
    try {
      errBody = text.length ? JSON.parse(text) : {};
    } catch {
      const status = response.status;
      const fallback =
        status >= 500
          ? `Server error (${status}). Please try again in a moment.`
          : status === 404
            ? 'The requested resource was not found.'
            : `Request failed (${status}). Please try again.`;
      throw new ApiError(fallback, status);
    }
    const message = formatApiErrorDetail(
      errBody.detail,
      response.status,
      errBody,
    );
    throw new ApiError(message, response.status, errBody.code as string | undefined);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(
    endpoint: string,
    opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>,
  ) => apiRequest<T>(endpoint, opts),

  post: <T>(
    endpoint: string,
    body?: unknown,
    opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>,
  ) => apiRequest<T>(endpoint, { method: 'POST', body, ...opts }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>,
  ) => apiRequest<T>(endpoint, { method: 'PUT', body, ...opts }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>,
  ) => apiRequest<T>(endpoint, { method: 'PATCH', body, ...opts }),

  delete: <T>(
    endpoint: string,
    opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>,
  ) => apiRequest<T>(endpoint, { method: 'DELETE', ...opts }),
};

export default api;
