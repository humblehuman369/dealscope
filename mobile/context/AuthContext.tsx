/**
 * Authentication context provider.
 * Manages user authentication state across the app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  LoginData,
  RegisterData,
  login as authLogin,
  logout as authLogout,
  register as authRegister,
  getCurrentUser,
  getStoredUserData,
  isAuthenticated,
  AuthError,
} from '../services/authService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
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
    async function initAuth() {
      try {
        // Check if we have stored auth
        const authenticated = await isAuthenticated();
        
        if (authenticated) {
          // Try to get user data
          const storedUser = await getStoredUserData();
          
          if (storedUser) {
            setState({
              user: storedUser,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            
            // Refresh user data in background
            getCurrentUser().then((freshUser) => {
              if (freshUser) {
                setState((prev) => ({ ...prev, user: freshUser }));
              }
            });
          } else {
            // Have token but no user data - fetch it
            const user = await getCurrentUser();
            setState({
              user,
              isLoading: false,
              isAuthenticated: !!user,
              error: null,
            });
          }
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } catch (error) {
        console.warn('Auth initialization error:', error);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    }

    initAuth();
  }, []);

  const login = useCallback(async (data: LoginData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await authLogin(data);
      
      setState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      const message = error instanceof AuthError 
        ? error.message 
        : 'Login failed. Please try again.';
      
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await authRegister(data);
      
      // After registration, log them in
      await login({ email: data.email, password: data.password });
    } catch (error) {
      const message = error instanceof AuthError 
        ? error.message 
        : 'Registration failed. Please try again.';
      
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      
      throw error;
    }
  }, [login]);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      await authLogout();
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await getCurrentUser();
    if (user) {
      setState((prev) => ({ ...prev, user }));
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

/**
 * Hook to access auth context.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to require authentication.
 * Returns true if authenticated, false if not.
 */
export function useRequireAuth(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return false; // Still loading
  }
  
  return isAuthenticated;
}

