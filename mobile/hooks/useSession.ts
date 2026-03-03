import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, isMFA, type LoginResponse, type UserResponse } from '@/services/auth';
import { getAccessToken } from '@/services/token-manager';

const SESSION_KEY = ['session', 'me'] as const;

export function useSession() {
  const query = useQuery<UserResponse | null>({
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
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    refetch: query.refetch,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      return authApi.login(email, password);
    },
    onSuccess: (data) => {
      if (!isMFA(data)) {
        queryClient.setQueryData<UserResponse>(SESSION_KEY, data.user);
      }
    },
  });
}

export function useLoginMfa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeToken,
      totpCode,
    }: {
      challengeToken: string;
      totpCode: string;
    }) => {
      return authApi.loginMfa(challengeToken, totpCode);
    },
    onSuccess: (data: LoginResponse) => {
      queryClient.setQueryData<UserResponse>(SESSION_KEY, data.user);
    },
  });
}

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
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData<UserResponse>(SESSION_KEY, data.user);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, null);
      queryClient.clear();
    },
  });
}
