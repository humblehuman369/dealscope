import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { authApi, isMFA } from '@/services/auth';
import type { UserResponse, LoginResponse, MFAChallengeResponse } from '@/services/auth';
import { clearTokens, getAccessToken } from '@/services/token-manager';

const SESSION_KEY = ['session'] as const;

export function useSession() {
  const { data: user, isLoading, error } = useQuery<UserResponse | null>({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return null;
      try {
        return await authApi.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && !user?.onboarding_completed;

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated,
    needsOnboarding,
    isPro: user?.subscription_tier === 'pro',
    isAdmin: false,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return authApi.login(email, password);
    },
    onSuccess: (data) => {
      if (!isMFA(data)) {
        queryClient.invalidateQueries({ queryKey: SESSION_KEY });
      }
    },
  });
}

export function useLoginMfa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeToken, totpCode }: { challengeToken: string; totpCode: string }) => {
      return authApi.loginMfa(challengeToken, totpCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      return authApi.register(email, password, fullName);
    },
    onSuccess: (data) => {
      if (data.access_token) {
        queryClient.invalidateQueries({ queryKey: SESSION_KEY });
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.clear();
      router.replace('/(auth)/login');
    },
  });
}

export function useRefreshUser() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SESSION_KEY });
  }, [queryClient]);
}
