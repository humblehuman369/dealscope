/**
 * Authentication context — wraps the new authService for mobile.
 *
 * Provides backward-compatible `useAuth()` hook for existing screens
 * while adding MFA and new auth flow support.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  type UserResponse as User,
  login as authLogin,
  loginMfa as authLoginMfa,
  logout as authLogout,
  register as authRegister,
  getCurrentUser,
  getStoredUserData,
  initializeAuth,
  getRefreshToken,
  refreshWithMutex,
  onAuthStateChange,
  AuthError,
  type MFAChallengeResponse,
  type LoginResponse,
} from '../services/authService';
import { unregisterPushToken } from '../hooks/useRegisterPushToken';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResponse | MFAChallengeResponse>;
  loginMfa: (challengeToken: string, totpCode: string, rememberMe?: boolean) => Promise<LoginResponse>;
  register: (email: string, password: string, fullName: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Initialize auth state on mount — fast-path first, then background refresh.
  //
  // 1. Immediately load cached user data from SecureStore (no network).
  //    This lets the app render authenticated UI within milliseconds.
  // 2. In the background, refresh the access token and pull fresh user
  //    data from the API.  If the refresh fails (token expired, network
  //    down), we clear the state so the user is redirected to login.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // ── Fast path: cached user data from SecureStore ──
      const hasRefreshToken = !!(await getRefreshToken());
      if (!hasRefreshToken) {
        // No stored session — go straight to logged-out state
        setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
        return;
      }

      const cachedUser = await getStoredUserData();
      if (cachedUser && !cancelled) {
        // Show the cached profile immediately so screens render fast
        setState({ user: cachedUser, isLoading: false, isAuthenticated: true, error: null });
      }

      // ── Background refresh: get a fresh access token + user profile ──
      try {
        const freshUser = await initializeAuth();
        if (cancelled) return;
        if (freshUser) {
          setState({ user: freshUser, isLoading: false, isAuthenticated: true, error: null });
        } else if (!cachedUser) {
          // No cached data AND refresh failed → logged out
          setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
        }
      } catch {
        if (cancelled) return;
        if (!cachedUser) {
          setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
        }
        // If we had cached data, keep showing it — the next API call
        // will trigger a 401 → refreshWithMutex → onAuthStateChange flow.
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Listen for unexpected token clears (e.g. refresh failure in the
  // API interceptor) and reset the auth state so the user is
  // redirected to login instead of seeing a broken logged-in UI.
  useEffect(() => {
    onAuthStateChange((event) => {
      if (event === 'tokens_cleared') {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    });
    return () => onAuthStateChange(null);
  }, []);

  // Proactive session refresh — matches frontend's 3.5 min refetchInterval.
  // Also refreshes when the app returns to the foreground.
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const REFRESH_INTERVAL_MS = 3.5 * 60 * 1000; // 3.5 minutes

    const doRefresh = async () => {
      if (!state.isAuthenticated) return;
      const rt = await getRefreshToken();
      if (!rt) return;
      // Best-effort proactive refresh — errors handled by the interceptor
      refreshWithMutex().catch(() => {});
    };

    // Set interval
    refreshIntervalRef.current = setInterval(doRefresh, REFRESH_INTERVAL_MS);

    // Also refresh on app foreground
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && state.isAuthenticated) {
          doRefresh();
        }
      },
    );

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      subscription.remove();
    };
  }, [state.isAuthenticated]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await authLogin(email, password, rememberMe);

      // MFA required — return challenge without setting user
      if ('mfa_required' in result && result.mfa_required) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return result;
      }

      const loginData = result as LoginResponse;
      setState({
        user: loginData.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      return loginData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message || 'Login failed',
      }));
      throw err;
    }
  }, []);

  const loginMfa = useCallback(async (challengeToken: string, totpCode: string, rememberMe = false) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await authLoginMfa(challengeToken, totpCode, rememberMe);
      setState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message || 'MFA verification failed',
      }));
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await authRegister(email, password, fullName);
      setState((prev) => ({ ...prev, isLoading: false }));
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message || 'Registration failed',
      }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    // Unregister push token before clearing auth (best-effort)
    await unregisterPushToken().catch(() => {});
    await authLogout();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setState((prev) => ({
        ...prev,
        user,
        isAuthenticated: !!user,
      }));
    } catch {
      // Silent fail
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        loginMfa,
        register,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
