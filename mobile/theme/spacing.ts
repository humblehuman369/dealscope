/**
 * InvestIQ Mobile Spacing & Radius Tokens
 * Matches frontend 8px base scale + VerdictIQ design tokens
 *
 * Usage:
 * ```tsx
 * import { spacing, radius, layout } from '../theme/spacing';
 * <View style={{ padding: spacing.md, borderRadius: radius.xl }} />
 * ```
 */

// ─── Spacing Scale (8px base) ───────────────────────────────────────────────
// Matches frontend verdict-design-tokens.ts spacing + tailwind.config.js

export const spacing = {
  /** 2px - Micro spacing */
  '2xs': 2,
  /** 4px - Extra small spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 12px - Small-medium spacing */
  'sm-md': 12,
  /** 16px - Medium spacing (default) */
  md: 16,
  /** 20px - Medium-large spacing */
  'md-lg': 20,
  /** 24px - Large spacing */
  lg: 24,
  /** 32px - Extra large spacing */
  xl: 32,
  /** 48px - 2x Extra large spacing */
  '2xl': 48,
  /** 64px - 3x Extra large spacing */
  '3xl': 64,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────
// Matches frontend tailwind.config.js borderRadius

export const radius = {
  /** 0px - No radius */
  none: 0,
  /** 4px - Small radius */
  sm: 4,
  /** 6px - Default radius */
  DEFAULT: 6,
  /** 8px - Medium radius */
  md: 8,
  /** 10px - Medium-large radius */
  lg: 10,
  /** 12px - Large radius (matches frontend 'xl': '12px') */
  xl: 12,
  /** 14px - Card radius (VerdictIQ components.card.borderRadius) */
  card: 14,
  /** 16px - 2xl radius (matches frontend '2xl': '16px') */
  '2xl': 16,
  /** 24px - 3xl radius (matches frontend '3xl': '1.5rem') */
  '3xl': 24,
  /** 32px - 4xl radius (matches frontend '4xl': '2rem') */
  '4xl': 32,
  /** 40px - Pill radius (matches frontend 'pill': '40px') */
  pill: 40,
  /** 9999px - Full circle */
  full: 9999,
} as const;

// ─── Layout Constants ───────────────────────────────────────────────────────
// Matches frontend verdict-design-tokens.ts layout

export const layout = {
  /** Max content width for readability (mobile-first) */
  maxWidth: 640,
  /** Max width including padding */
  maxWidthPadded: 672,
  /** Container padding on mobile */
  mobilePadding: spacing.md,
  /** Container padding on larger screens */
  desktopPadding: spacing.lg,
  /** Minimum touch target (44pt per Apple HIG) */
  minTouchTarget: 44,
  /** Standard card padding */
  cardPadding: spacing.md,
  /** Section vertical padding */
  sectionPadding: spacing.xl,
} as const;

// ─── Component Tokens ───────────────────────────────────────────────────────
// Matches frontend verdict-design-tokens.ts components

export const componentTokens = {
  /** Card component defaults */
  card: {
    padding: spacing.md,
    borderRadius: radius.card,
  },
  /** Button component defaults */
  button: {
    primaryHeight: 52,
    secondaryHeight: 40,
    borderRadius: radius.full,
  },
  /** Progress bar defaults */
  progressBar: {
    height: 7,
    borderRadius: radius.sm,
  },
  /** Divider defaults */
  divider: {
    height: 1,
  },
  /** Input field defaults */
  input: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
} as const;

// ─── Type Exports ───────────────────────────────────────────────────────────

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
