/**
 * Authentication context — wraps the new authService for mobile.
 *
 * Provides backward-compatible `useAuth()` hook for existing screens
 * while adding MFA and new auth flow support.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Initialize auth state on mount
  useEffect(() => {
    async function init() {
      try {
        const user = await initializeAuth();
        setState({
          user,
          isLoading: false,
          isAuthenticated: !!user,
          error: null,
        });
      } catch {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    }
    init();
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
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Login failed',
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
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'MFA verification failed',
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
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Registration failed',
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
