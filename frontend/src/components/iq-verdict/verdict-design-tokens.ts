/**
 * VerdictIQ Design Tokens
 * 
 * A focused design system that extends DESIGN_SYSTEM.md with specific tokens
 * for the VerdictIQ page. Based on an 8px spacing scale.
 * 
 * Usage:
 * - Import tokens directly: import { spacing, typography, colors } from './verdict-design-tokens'
 * - Use in components: style={{ padding: spacing.md, fontSize: typography.body.size }}
 */

// ===================
// SPACING SCALE (8px base)
// ===================

export const spacing = {
  /** 4px - Extra small spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 16px - Medium spacing (default) */
  md: 16,
  /** 24px - Large spacing */
  lg: 24,
  /** 32px - Extra large spacing */
  xl: 32,
  /** 48px - 2x Extra large spacing */
  '2xl': 48,
} as const

// ===================
// TYPOGRAPHY SCALE
// ===================

export const typography = {
  /** 32px / bold - Score numbers, large display values */
  display: {
    size: 32,
    weight: 700,
    lineHeight: 1.2,
  },
  /** 18px / semibold - Section titles */
  heading: {
    size: 18,
    weight: 600,
    lineHeight: 1.3,
  },
  /** 14px / regular - Content text */
  body: {
    size: 14,
    weight: 400,
    lineHeight: 1.5,
  },
  /** 11px / medium - Uppercase labels, badges */
  label: {
    size: 11,
    weight: 500,
    lineHeight: 1.2,
    letterSpacing: 0.5,
  },
  /** 10px / regular - Helper text, small captions */
  caption: {
    size: 10,
    weight: 400,
    lineHeight: 1.3,
  },
} as const

// ===================
// COLORS
// ===================

export const colors = {
  // Brand - InvestIQ Voice
  brand: {
    /** #0891B2 - Primary teal for dark backgrounds, header, navigation */
    teal: '#0891B2',
    /** #06B6D4 - Brighter teal for white backgrounds (score ring, bars, links) */
    tealBright: '#06B6D4',
    /** #00D4FF - Electric cyan for accents */
    cyan: '#00D4FF',
  },
  
  // Text Colors
  text: {
    /** #0A1628 - Primary dark text */
    primary: '#0A1628',
    /** #475569 - Secondary text */
    secondary: '#475569',
    /** #64748B - Tertiary/muted text */
    tertiary: '#64748B',
    /** #94A3B8 - Placeholder text */
    muted: '#94A3B8',
    /** #FFFFFF - White text */
    white: '#FFFFFF',
  },
  
  // Backgrounds
  background: {
    /** #FFFFFF - White background */
    white: '#FFFFFF',
    /** #F8FAFC - Light gray background */
    light: '#F8FAFC',
    /** #F1F5F9 - Subtle gray background */
    subtle: '#F1F5F9',
    /** #0A1628 - Dark navy background */
    dark: '#0A1628',
    /** #07172E - Deep navy background */
    deepNavy: '#07172E',
  },
  
  // Status Colors
  status: {
    /** #10B981 - Positive/success */
    positive: '#10B981',
    /** #D97706 - Warning/caution */
    warning: '#D97706',
    /** #E11D48 - Negative/danger */
    negative: '#E11D48',
    /** #F59E0B - Amber for neutral-warning */
    amber: '#F59E0B',
  },
  
  // UI Elements
  ui: {
    /** #E2E8F0 - Border color, dividers */
    border: '#E2E8F0',
    /** #CBD5E1 - Darker border */
    borderDark: '#CBD5E1',
  },
} as const

// ===================
// COMPONENT PATTERNS
// ===================

export const components = {
  /** Card styling */
  card: {
    padding: spacing.md,
    borderRadius: 12,
    shadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    shadowLg: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  
  /** Stat block styling */
  statBlock: {
    textAlign: 'center' as const,
    valueSize: typography.display.size,
    labelSize: typography.label.size,
  },
  
  /** Progress bar styling */
  progressBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.ui.border,
  },
  
  /** Button styling */
  button: {
    primaryHeight: 48,
    secondaryHeight: 40,
    borderRadius: 8,
  },
  
  /** Divider styling */
  divider: {
    height: 1,
    color: colors.ui.border,
  },
} as const

// ===================
// SCORE COLOR HELPERS
// ===================

/**
 * Get color based on score value (0-100)
 * Uses tealBright for better visibility on white backgrounds
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return colors.status.positive
  if (score >= 65) return colors.brand.tealBright
  if (score >= 50) return colors.status.amber
  return colors.status.negative
}

/**
 * Get assessment color and label based on value vs benchmark
 */
export function getAssessment(
  value: number,
  benchmark: number,
  higherIsBetter: boolean = true
): { color: string; label: string; bgClass: string } {
  const isGood = higherIsBetter ? value >= benchmark : value <= benchmark
  const isFair = higherIsBetter 
    ? value >= benchmark * 0.8 
    : value <= benchmark * 1.2
  
  if (isGood) {
    return { 
      color: colors.status.positive, 
      label: 'GOOD',
      bgClass: 'bg-emerald-500/10 text-emerald-600',
    }
  }
  if (isFair) {
    return { 
      color: colors.status.warning, 
      label: 'FAIR',
      bgClass: 'bg-amber-500/10 text-amber-600',
    }
  }
  return { 
    color: colors.status.negative, 
    label: 'POOR',
    bgClass: 'bg-rose-500/10 text-rose-600',
  }
}

/**
 * Get urgency color based on label
 */
export function getUrgencyColor(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'high': return colors.status.positive
    case 'medium': return colors.status.warning
    case 'low': return colors.text.tertiary
    default: return colors.text.tertiary
  }
}

/**
 * Get market temperature color
 * Uses tealBright for better visibility on white backgrounds
 */
export function getMarketTempColor(temp: string): string {
  switch (temp.toLowerCase()) {
    case 'cold': return colors.brand.tealBright
    case 'warm': return colors.status.warning
    case 'hot': return colors.status.negative
    default: return colors.text.tertiary
  }
}

// ===================
// TAILWIND CLASS HELPERS
// ===================

/**
 * Common Tailwind class compositions for consistent styling
 */
export const tw = {
  // Cards
  card: 'bg-white rounded-xl shadow-sm border border-slate-200',
  cardHover: 'hover:shadow-md transition-shadow',
  
  // Section headers
  sectionHeader: 'text-xs font-semibold text-slate-500 uppercase tracking-wide',
  
  // Labels
  label: 'text-[11px] font-medium text-slate-500 uppercase tracking-wide',
  
  // Values
  valueLg: 'text-2xl font-bold text-slate-800',
  valueMd: 'text-lg font-semibold text-slate-800',
  
  // Buttons
  buttonPrimary: 'h-12 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors',
  buttonSecondary: 'h-10 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors',
  buttonGhost: 'text-cyan-600 hover:text-cyan-700 font-medium transition-colors',
  
  // Dividers
  divider: 'border-t border-slate-200',
  
  // Layout
  container: 'max-w-2xl mx-auto',
  section: 'px-4 py-4',
} as const

// ===================
// PRICE CARD TYPES
// ===================

export type PriceCardVariant = 'breakeven' | 'target' | 'wholesale'

export const priceCardStyles: Record<PriceCardVariant, { 
  bgClass: string
  borderClass: string
  labelClass: string
  valueClass: string
}> = {
  breakeven: {
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    labelClass: 'text-slate-600',
    valueClass: 'text-slate-800',
  },
  target: {
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-200',
    labelClass: 'text-cyan-700',
    valueClass: 'text-cyan-900',
  },
  wholesale: {
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    labelClass: 'text-emerald-700',
    valueClass: 'text-emerald-900',
  },
}
