/**
 * InvestIQ Mobile Text Styles
 * 
 * RULES:
 * 1. Minimum font size is 13px (applies to icons too)
 * 2. Dark mode: four-tier slate hierarchy (F1F5F9 → CBD5E1 → 94A3B8 → 7C8CA0)
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
    primary: colors.navy[900],      // #0A1628 - dark navy (not grey)
    secondary: colors.gray[700],    // #374151 - dark grey (not light grey)
    muted: colors.gray[600],        // #4b5563 - medium-dark grey
  },
  dark: {
    primary: '#F1F5F9',             // Slate heading — near-white (matches frontend four-tier hierarchy)
    secondary: '#CBD5E1',           // Slate body — solid readable grey
    muted: '#94A3B8',              // Slate secondary — muted but legible
  },
};

// Semantic colors (same in both modes)
export const semanticColors = {
  profit: colors.profit.main,       // #22c55e - green
  loss: colors.loss.main,           // #ef4444 - red
  warning: colors.warning.main,     // #f59e0b - orange
  info: colors.primary[500],        // #0465f2 - blue
  accent: colors.accent[500],       // #06B6D4 - Tailwind cyan-500 (was #4dd0e1)
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
    fontWeight: '700' as const,   // Aligned with frontend (was 600)
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontWeight: '700' as const,   // Aligned with frontend (was 600)
    lineHeight: 24,
  },
  h5: {
    fontSize: 16,
    fontWeight: '700' as const,   // Aligned with frontend (was 600)
    lineHeight: 22,
  },
  h6: {
    fontSize: 14,
    fontWeight: '700' as const,   // Aligned with frontend (was 600)
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

// =============================================================================
// VERDICT/STRATEGY TYPOGRAPHY
// Inter-based, per VerdictIQ 3.3 Design
// Headlines 700, body 400, financial data 600 + tabular-nums
// =============================================================================

import { verdictDark } from './colors';

export const verdictTypography = {
  // Score display — large number in hero
  scoreDisplay: {
    fontSize: 56,
    fontWeight: '700' as const,
    lineHeight: 56,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    color: verdictDark.white,
  } satisfies TextStyle,

  // Page headings (section titles)
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
    color: verdictDark.textHeading,
  } satisfies TextStyle,

  // Sub-headings
  subheading: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
    color: verdictDark.textHeading,
  } satisfies TextStyle,

  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: verdictDark.textBody,
  } satisfies TextStyle,

  // Body small
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: verdictDark.textBody,
  } satisfies TextStyle,

  // Financial values (tabular-nums, weight 600)
  financial: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    color: verdictDark.textHeading,
  } satisfies TextStyle,

  // Financial large
  financialLarge: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    color: verdictDark.textHeading,
  } satisfies TextStyle,

  // Section label (uppercase, small)
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: verdictDark.blue,
  } satisfies TextStyle,

  // Tag / badge text
  tag: {
    fontSize: 10,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  // Caption / helper
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: verdictDark.textSecondary,
  } satisfies TextStyle,

  // CTA button
  cta: {
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 22,
    color: verdictDark.white,
  } satisfies TextStyle,

  // Secondary button
  buttonSecondary: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    color: verdictDark.textBody,
  } satisfies TextStyle,
};

