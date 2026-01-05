/**
 * Theme context provider for InvestIQ Mobile.
 * Manages light/dark mode theme across the app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

type ThemeMode = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  card: string;
  cardBorder: string;
  
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  
  // UI Elements
  border: string;
  borderLight: string;
  divider: string;
  
  // Header
  headerBackground: string;
  headerBorder: string;
  
  // Status bar
  statusBar: 'light' | 'dark';
  
  // Sync card
  syncCardBackground: string;
  
  // Section title
  sectionTitle: string;
  
  // Icons
  iconBackground: string;
}

const lightTheme: ThemeColors = {
  background: colors.gray[50],
  backgroundSecondary: '#ffffff',
  backgroundTertiary: colors.gray[100],
  card: '#ffffff',
  cardBorder: colors.primary[200],
  
  text: colors.gray[900],
  textSecondary: colors.gray[700],
  textTertiary: colors.gray[600],
  textMuted: colors.gray[500],
  
  border: colors.gray[200],
  borderLight: colors.gray[100],
  divider: colors.gray[100],
  
  headerBackground: '#ffffff',
  headerBorder: colors.gray[200],
  
  statusBar: 'dark',
  
  syncCardBackground: '#ffffff',
  
  sectionTitle: colors.gray[500],
  
  iconBackground: colors.gray[100],
};

const darkTheme: ThemeColors = {
  background: colors.navy[950],
  backgroundSecondary: colors.navy[900],
  backgroundTertiary: colors.navy[800],
  card: colors.navy[900],
  cardBorder: colors.primary[700],
  
  text: colors.gray[50],
  textSecondary: colors.gray[200],
  textTertiary: colors.gray[300],
  textMuted: colors.gray[400],
  
  border: colors.navy[700],
  borderLight: colors.navy[800],
  divider: colors.navy[800],
  
  headerBackground: colors.navy[900],
  headerBorder: colors.navy[700],
  
  statusBar: 'light',
  
  syncCardBackground: colors.navy[900],
  
  sectionTitle: colors.gray[400],
  
  iconBackground: colors.navy[800],
};

interface ThemeContextType {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  theme: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@investiq_theme_mode';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    async function loadTheme() {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadTheme();
  }, []);

  // Calculate active theme based on mode and system preference
  const activeTheme: ActiveTheme = mode === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : mode;

  const isDark = activeTheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(nextMode);
  }, [mode, setMode]);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        activeTheme,
        theme,
        isDark,
        setMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * Hook to get just the theme colors.
 */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();
  return theme;
}

export type { ThemeColors, ThemeMode, ActiveTheme };

