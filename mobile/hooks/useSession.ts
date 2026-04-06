import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AxiosError } from 'axios';
import { authApi, isMFA } from '@/services/auth';
import type { UserResponse, LoginResponse, MFAChallengeResponse, RegisterResponse } from '@/services/auth';
import { clearTokens, getAccessToken } from '@/services/token-manager';

// ------------------------------------------------------------------
// Query key
// ------------------------------------------------------------------
export const SESSION_QUERY_KEY = ['session', 'me'] as const;

// ------------------------------------------------------------------
// In-memory fallback
//
// Survives React Query cache misses / refetch races that happen
// immediately after login. On mobile there are no page refreshes,
// so in-memory is sufficient (tokens persist via SecureStore).
// ------------------------------------------------------------------
let _lastKnownUser: UserResponse | null = null;

export function setLastKnownUser(user: UserResponse | null) {
  _lastKnownUser = user;
}

export function getLastKnownUser(): UserResponse | null {
  return _lastKnownUser;
}

// ------------------------------------------------------------------
// useSession
// ------------------------------------------------------------------

export function useSession() {
  const { data: user, isLoading } = useQuery<UserResponse | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return null;
      try {
        const me = await authApi.me();
        if (me) {
          _lastKnownUser = me;
        }
        return me;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 401) {
          _lastKnownUser = null;
          await clearTokens();
          return null;
        }
        return _lastKnownUser;
      }
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: () => getLastKnownUser(),
    retry: 1,
    retryDelay: 1000,
    refetchInterval: 3.5 * 60_000,
  });

  const effectiveUser = user ?? getLastKnownUser();

  return {
    user: effectiveUser ?? null,
    isLoading,
    isAuthenticated: !!effectiveUser,
    needsOnboarding: !!effectiveUser && !effectiveUser.onboarding_completed,
    permissions: effectiveUser?.permissions ?? [],
    roles: effectiveUser?.roles ?? [],
    hasPermission: (perm: string) =>
      effectiveUser?.permissions?.includes(perm) ?? false,
    isPro: effectiveUser?.subscription_tier === 'pro',
    isAdmin:
      effectiveUser?.roles?.includes('admin') ||
      effectiveUser?.roles?.includes('owner') ||
      effectiveUser?.is_superuser ||
      false,
  };
}

// ------------------------------------------------------------------
// useLogin
// ------------------------------------------------------------------

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
    onSuccess: (data: LoginResponse | MFAChallengeResponse) => {
      if (!isMFA(data)) {
        const loginData = data as LoginResponse;
        _lastKnownUser = loginData.user;
        queryClient.setQueryData(SESSION_QUERY_KEY, loginData.user);
      }
    },
  });
}

// ------------------------------------------------------------------
// useLoginGoogle
// ------------------------------------------------------------------

export function useLoginGoogle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.loginWithGoogle(),
    onSuccess: (data) => {
      if (data?.user) {
        _lastKnownUser = data.user;
        queryClient.setQueryData(SESSION_QUERY_KEY, data.user);
      }
    },
  });
}

// ------------------------------------------------------------------
// useLoginMfa
// ------------------------------------------------------------------

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
    onSuccess: (data: LoginResponse) => {
      _lastKnownUser = data.user;
      queryClient.setQueryData(SESSION_QUERY_KEY, data.user);
    },
  });
}

// ------------------------------------------------------------------
// useRegister
// ------------------------------------------------------------------

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
    onSuccess: (data: RegisterResponse) => {
      if (data.access_token) {
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      }
    },
  });
}

// ------------------------------------------------------------------
// useLogout
// ------------------------------------------------------------------

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      _lastKnownUser = null;
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.clear();
      router.replace('/(auth)/login');
    },
  });
}

// ------------------------------------------------------------------
// useRefreshUser
// ------------------------------------------------------------------

export function useRefreshUser() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [queryClient]);
}
