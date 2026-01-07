/**
 * InvestIQ Mobile Text Styles
 * 
 * RULES:
 * 1. Minimum font size is 13px (applies to icons too)
 * 2. Dark mode: font color is white, unless colored (blue, red, green, orange)
 * 3. Light mode: font color is black or dark grey, unless colored
 */

import { TextStyle } from 'react-native';
import { colors } from './colors';

// Minimum sizes
export const MIN_FONT_SIZE = 13;
export const MIN_ICON_SIZE = 13;

// Text colors based on theme
export const textColors = {
  light: {
    primary: colors.navy[900],      // #07172e - dark navy (not grey)
    secondary: colors.gray[700],    // #374151 - dark grey (not light grey)
    muted: colors.gray[600],        // #4b5563 - medium-dark grey
  },
  dark: {
    primary: colors.white,          // #ffffff - white
    secondary: colors.white,        // #ffffff - white (no grey in dark mode)
    muted: colors.white,            // #ffffff - white (no grey in dark mode)
  },
};

// Semantic colors (same in both modes)
export const semanticColors = {
  profit: colors.profit.main,       // #22c55e - green
  loss: colors.loss.main,           // #ef4444 - red
  warning: colors.warning.main,     // #f59e0b - orange
  info: colors.primary[500],        // #0465f2 - blue
  accent: colors.accent[500],       // #4dd0e1 - soft cyan (was #00e5ff)
};

// Helper to get text color based on dark mode
export function getTextColor(isDark: boolean, variant: 'primary' | 'secondary' | 'muted' = 'primary'): string {
  return isDark ? textColors.dark[variant] : textColors.light[variant];
}

// Helper to get icon color based on dark mode
export function getIconColor(isDark: boolean): string {
  return isDark ? colors.white : colors.gray[700];
}

// Base text styles (all enforce minimum 13px)
export const baseTextStyles = {
  // Headings
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  h6: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  
  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13, // Minimum size
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  
  // Labels & UI text
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 13, // Minimum size
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  
  // Values & numbers
  valueLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  value: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  valueSmall: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  
  // Captions (minimum 13px)
  caption: {
    fontSize: 13, // Minimum size (was 12px)
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  
  // Buttons
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

// Create themed text style
export function createTextStyle(
  baseStyle: keyof typeof baseTextStyles,
  isDark: boolean,
  colorVariant: 'primary' | 'secondary' | 'muted' = 'primary'
): TextStyle {
  return {
    ...baseTextStyles[baseStyle],
    color: getTextColor(isDark, colorVariant),
  };
}

// Semantic text styles (colored text - same in both modes)
export function getSemanticTextStyle(
  baseStyle: keyof typeof baseTextStyles,
  semantic: keyof typeof semanticColors
): TextStyle {
  return {
    ...baseTextStyles[baseStyle],
    color: semanticColors[semantic],
  };
}

