/**
 * useSession — React Query based session management for mobile.
 *
 * Mirrors the web frontend's useSession hook architecture:
 * - React Query cache is the single source of truth for the current user
 * - AsyncStorage provides persistence across app restarts
 * - In-memory fallback prevents flash of login during transient errors
 *
 * Key mobile differences vs web:
 * - Uses AsyncStorage instead of localStorage
 * - No cookie-based auth — relies on token-manager.ts for Bearer tokens
 * - Proactive token refresh before JWT expiry
 * - Expo Router navigation instead of Next.js
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authApi,
  type UserResponse,
  type LoginResponse,
  type MFAChallengeResponse,
  ApiError,
} from '@/services/auth';
import { hasTokens, clearTokens, setTokens } from '@/services/token-manager';
import { setOnSessionExpired } from '@/services/api';

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const SESSION_QUERY_KEY = ['session', 'me'] as const;

// ---------------------------------------------------------------------------
// AsyncStorage session indicator
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = 'dgiq_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

interface PersistedSession {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_status: string;
  roles: string[];
  permissions: string[];
  is_superuser: boolean;
  onboarding_completed: boolean;
  ts: number;
}

async function persistSession(user: UserResponse): Promise<void> {
  try {
    const data: PersistedSession = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      subscription_tier: user.subscription_tier,
      subscription_status: user.subscription_status,
      roles: user.roles ?? [],
      permissions: user.permissions ?? [],
      is_superuser: user.is_superuser,
      onboarding_completed: user.onboarding_completed,
      ts: Date.now(),
    };
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silent
  }
}

async function readPersistedSession(): Promise<UserResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data: PersistedSession = JSON.parse(raw);
    if (Date.now() - data.ts > SESSION_MAX_AGE_MS) {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      avatar_url: null,
      is_active: true,
      is_verified: true,
      is_superuser: data.is_superuser,
      mfa_enabled: false,
      created_at: '',
      last_login: null,
      has_profile: true,
      onboarding_completed: data.onboarding_completed,
      roles: data.roles,
      permissions: data.permissions,
      subscription_tier: data.subscription_tier,
      subscription_status: data.subscription_status,
    } satisfies UserResponse;
  } catch {
    return null;
  }
}

async function clearPersistedSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

let _lastKnownUser: UserResponse | null = null;

export function getLastKnownUser(): UserResponse | null {
  return _lastKnownUser;
}

// ---------------------------------------------------------------------------
// Proactive token refresh
// ---------------------------------------------------------------------------

const JWT_LIFETIME_MS = 5 * 60 * 1000;
const REFRESH_BUFFER_MS = 90 * 1000;
let _lastTokenRefreshAt = 0;

export function setLastTokenRefresh(): void {
  _lastTokenRefreshAt = Date.now();
}

function shouldProactivelyRefresh(): boolean {
  if (_lastTokenRefreshAt === 0) return false;
  return Date.now() - _lastTokenRefreshAt >= JWT_LIFETIME_MS - REFRESH_BUFFER_MS;
}

// ---------------------------------------------------------------------------
// useSession
// ---------------------------------------------------------------------------

export function useSession() {
  const { data: user, isLoading } = useQuery<UserResponse | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasTokens()) {
        const persisted = await readPersistedSession();
        if (!persisted) return null;
        // Tokens cleared but session persisted — stale. Clear it.
        await clearPersistedSession();
        _lastKnownUser = null;
        return null;
      }

      try {
        if (shouldProactivelyRefresh()) {
          const refreshed = await authApi.me().catch(() => null);
          if (refreshed) setLastTokenRefresh();
        }

        const me = await authApi.me();
        if (me) {
          _lastKnownUser = me;
          await persistSession(me);
        }
        return me;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          _lastKnownUser = null;
          _lastTokenRefreshAt = 0;
          await clearTokens();
          await clearPersistedSession();
          return null;
        }
        return _lastKnownUser;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    refetchInterval: 3.5 * 60 * 1000,
  });

  const effectiveUser = user ?? _lastKnownUser;

  return {
    user: effectiveUser ?? null,
    isLoading,
    isAuthenticated: !!effectiveUser,
    needsOnboarding: !!effectiveUser && !effectiveUser.onboarding_completed,
    permissions: effectiveUser?.permissions ?? [],
    roles: effectiveUser?.roles ?? [],
    hasPermission: (perm: string) =>
      effectiveUser?.permissions?.includes(perm) ?? false,
    isAdmin:
      effectiveUser?.roles?.includes('admin') ||
      effectiveUser?.roles?.includes('owner') ||
      effectiveUser?.is_superuser ||
      false,
  };
}

// ---------------------------------------------------------------------------
// useLogin
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      rememberMe,
    }: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) => {
      return authApi.login(email, password, rememberMe);
    },
    onSuccess: async (data) => {
      if ('mfa_required' in data && data.mfa_required) return;
      const loginData = data as LoginResponse;
      _lastKnownUser = loginData.user;
      setLastTokenRefresh();
      await persistSession(loginData.user);
      queryClient.setQueryData(SESSION_QUERY_KEY, loginData.user);
    },
  });
}

// ---------------------------------------------------------------------------
// useLoginMfa
// ---------------------------------------------------------------------------

export function useLoginMfa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeToken,
      totpCode,
      rememberMe,
    }: {
      challengeToken: string;
      totpCode: string;
      rememberMe?: boolean;
    }) => {
      return authApi.loginMfa(challengeToken, totpCode, rememberMe);
    },
    onSuccess: async (data) => {
      _lastKnownUser = data.user;
      setLastTokenRefresh();
      await persistSession(data.user);
      queryClient.setQueryData(SESSION_QUERY_KEY, data.user);
    },
  });
}

// ---------------------------------------------------------------------------
// useRegister
// ---------------------------------------------------------------------------

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
    }: {
      email: string;
      password: string;
      fullName: string;
    }) => {
      return authApi.register(email, password, fullName);
    },
    onSuccess: async (data) => {
      if (data.user && data.access_token && data.refresh_token) {
        await setTokens(data.access_token, data.refresh_token);
        _lastKnownUser = data.user;
        setLastTokenRefresh();
        await persistSession(data.user);
        queryClient.setQueryData(SESSION_QUERY_KEY, data.user);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useLogout
// ---------------------------------------------------------------------------

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSettled: async () => {
      _lastKnownUser = null;
      _lastTokenRefreshAt = 0;
      await clearPersistedSession();
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.clear();
      router.replace('/(auth)/login');
    },
  });
}

// ---------------------------------------------------------------------------
// useRefreshUser
// ---------------------------------------------------------------------------

export function useRefreshUser() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [queryClient]);
}

// ---------------------------------------------------------------------------
// Register session-expired callback on module load
// ---------------------------------------------------------------------------

setOnSessionExpired(() => {
  _lastKnownUser = null;
  _lastTokenRefreshAt = 0;
  clearPersistedSession();
});
