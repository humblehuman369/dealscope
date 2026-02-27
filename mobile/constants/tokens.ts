/**
 * Design tokens — single source of truth for the DealGapIQ mobile design system.
 *
 * Values are lifted directly from the web frontend's globals.css and
 * tailwind.config.js to maintain visual parity across platforms.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  // Backgrounds
  base: '#000000',
  card: '#0C1220',
  panel: '#101828',
  surface: '#131B2E',
  elevated: '#1A2332',

  // Text
  heading: '#F1F5F9',
  body: '#CBD5E1',
  secondary: '#94A3B8',
  label: '#7C8CA0',
  muted: '#64748B',

  // Accent
  accent: '#0EA5E9',
  accentLight: '#38BDF8',
  accentDark: '#0284C7',

  // Semantic
  green: '#34D399',
  greenDark: '#059669',
  red: '#F87171',
  redDark: '#DC2626',
  gold: '#FBBF24',
  goldDark: '#D97706',
  orange: '#FB923C',

  // Borders
  border: 'rgba(148, 163, 184, 0.12)',
  borderLight: 'rgba(148, 163, 184, 0.20)',
  borderAccent: 'rgba(14, 165, 233, 0.25)',

  // Card glow
  glowBorder: 'rgba(14, 165, 233, 0.25)',
  glowBorderHover: 'rgba(14, 165, 233, 0.55)',
  glowShadow: 'rgba(14, 165, 233, 0.08)',

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  display: 42,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.625,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// Pre-composed text styles for common patterns
export const textStyles = {
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: fontSize.display * lineHeight.tight,
    color: colors.heading,
  },
  displaySmall: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    color: colors.heading,
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    color: colors.heading,
  },
  h2: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.snug,
    color: colors.heading,
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.snug,
    color: colors.heading,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
    color: colors.body,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    color: colors.body,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    color: colors.label,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  financial: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    lineHeight: 14 * lineHeight.normal,
    color: colors.heading,
    fontVariant: ['tabular-nums'] as const,
  },
  financialLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    color: colors.heading,
    fontVariant: ['tabular-nums'] as const,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
    color: colors.secondary,
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing (8px base grid)
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
} as const;

// ---------------------------------------------------------------------------
// Animation durations (ms)
// ---------------------------------------------------------------------------

export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ---------------------------------------------------------------------------
// Deal Gap zones — semantic color mapping
// ---------------------------------------------------------------------------

export const dealGapZone = {
  lossZone: { color: colors.red, label: 'Loss Zone' },
  highRisk: { color: colors.orange, label: 'High Risk' },
  negotiate: { color: colors.gold, label: 'Negotiate' },
  profitZone: { color: colors.green, label: 'Profit Zone' },
  deepValue: { color: colors.accentLight, label: 'Deep Value' },
} as const;
