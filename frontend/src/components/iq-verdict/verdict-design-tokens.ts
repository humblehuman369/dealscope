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
// BREAKPOINTS & LAYOUT
// ===================

export const breakpoints = {
  /** Mobile: 0-639px */
  sm: 640,
  /** Tablet: 640-767px */
  md: 768,
  /** Desktop: 768-1023px */
  lg: 1024,
  /** Large desktop: 1024px+ */
  xl: 1280,
} as const

export const layout = {
  /** Max content width for readability on wide screens */
  maxWidth: 640,
  /** Max width with padding */
  maxWidthPadded: 672,
  /** Container padding on mobile */
  mobilePadding: 16,
  /** Container padding on desktop */
  desktopPadding: 24,
} as const

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
    /** #0891B2 - Primary teal, matches header IQ */
    tealBright: '#0891B2',
    /** #00D4FF - Electric cyan for accents */
    cyan: '#00D4FF',
  },
  
  // Text Colors - Light text for dark backgrounds
  text: {
    /** #F1F5F9 - Primary light text (slate-100) */
    primary: '#F1F5F9',
    /** #94A3B8 - Secondary text (slate-400) */
    secondary: '#94A3B8',
    /** #64748B - Tertiary/muted text (slate-500) */
    tertiary: '#64748B',
    /** #475569 - Placeholder text (slate-600) */
    muted: '#475569',
    /** #FFFFFF - White text */
    white: '#FFFFFF',
  },
  
  // Backgrounds - Dark navy palette
  background: {
    /** #0F172A - Card/surface background */
    white: '#0F172A',
    /** #0A1628 - Page background */
    light: '#0A1628',
    /** #1E293B - Elevated/subtle background */
    subtle: '#1E293B',
    /** #0A1628 - Dark navy background */
    dark: '#0A1628',
    /** #07172E - Deep navy background */
    deepNavy: '#07172E',
  },
  
  // Status Colors
  status: {
    /** #10B981 - Positive/success */
    positive: '#10B981',
    /** #D97706 - Warning/caution (Amber) */
    warning: '#D97706',
    /** #EF4444 - Negative/danger (Red) - Unified */
    negative: '#EF4444',
    /** #D97706 - Amber for Average/Marginal scores - Unified */
    amber: '#D97706',
  },
  
  // UI Elements - Dark borders and muted icons
  ui: {
    /** #1E293B - Border color, dividers (slate-800) */
    border: '#1E293B',
    /** #334155 - Darker border (slate-700) */
    borderDark: '#334155',
    /** #64748B - Medium gray for icons */
    iconMuted: '#64748B',
  },

  // Harmonized Metric Colors (VerdictIQ palette)
  harmonized: {
    /** #6B7F99 - Slate blue for moderate/caution (replaces amber in score context) */
    slateBlue: '#6B7F99',
    /** #C45B5B - Soft coral for concern/negative (replaces red in score context) */
    softCoral: '#C45B5B',
    /** Teal-tinted confidence bar track */
    confidenceTrack: 'rgba(8,145,178,0.15)',
    /** Card border matching investment card */
    verdictCardBorder: 'rgba(8,145,178,0.25)',
    /** Signal indicator card background */
    signalCardBg: '#1E293B',
  },

  // Gradients & Shadows (VerdictIQ visual polish)
  gradient: {
    tealStart: 'rgba(8,145,178,0.10)',
    cyanMid: 'rgba(6,182,212,0.05)',
    tealEnd: 'rgba(8,145,178,0.10)',
  },
  shadow: {
    card: '0 2px 8px rgba(0,0,0,0.3)',
    glow: '0 0 20px rgba(8,145,178,0.20)',
    metricCard: '0 1px 4px rgba(0,0,0,0.3)',
    verdictCard: '0 2px 8px rgba(0,0,0,0.25)',
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
 * Unified color system across all VerdictIQ pages
 * 
 * Uses a harmonious palette that doesn't overpower the
 * Investment Analysis section:
 * - High scores: Brand teal (positive, confident)
 * - Mid scores: Muted slate-blue (neutral, doesn't scream)
 * - Low scores: Soft coral (concern without alarm)
 * 
 * Score Tiers:
 * 80-100: Strong/Good - Teal
 * 50-79:  Average/Marginal - Slate blue
 * 0-49:   Unlikely/Pass - Soft coral
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return colors.brand.tealBright   // Strong/Good
  if (score >= 50) return '#6B7F99'                  // Slate blue - harmonious neutral
  return '#C45B5B'                                   // Soft coral - muted concern
}

/**
 * Get harmonized bar color for confidence metrics
 * Uses the same teal/slate/coral palette as getScoreColor
 * for visual consistency across the VerdictIQ section.
 */
export function getHarmonizedBarColor(value: number): string {
  if (value >= 70) return colors.brand.tealBright    // Strong
  if (value >= 40) return colors.harmonized.slateBlue // Moderate
  return colors.harmonized.softCoral                  // Concern
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
 * Uses neutral grays (no blue undertone) for crisp appearance
 */
export const tw = {
  // Cards
  card: 'bg-slate-900 rounded-xl shadow-sm border border-slate-700',
  cardHover: 'hover:shadow-md transition-shadow',
  
  // Section headers
  sectionHeader: 'text-xs font-semibold text-slate-400 uppercase tracking-wide',
  
  // Labels
  label: 'text-[11px] font-medium text-slate-400 uppercase tracking-wide',
  
  // Values
  valueLg: 'text-2xl font-bold text-slate-100',
  valueMd: 'text-lg font-semibold text-slate-100',
  
  // Buttons
  buttonPrimary: 'h-12 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors',
  buttonSecondary: 'h-10 px-4 border border-slate-600 hover:bg-slate-800 text-slate-300 font-medium rounded-lg transition-colors',
  buttonGhost: 'text-cyan-500 hover:text-cyan-400 font-medium transition-colors',
  
  // Dividers
  divider: 'border-t border-slate-700',

  // VerdictIQ Visual Polish
  investmentCard: 'bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-teal-500/10 rounded-xl border border-teal-400/20 p-5',
  metricCard: 'bg-slate-900 rounded-lg shadow-sm border border-slate-700 p-4 text-center',
  pillBadge: 'px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide',
  glowRing: 'drop-shadow-[0_0_12px_rgba(8,145,178,0.25)]',
  
  // Layout - max-width for readability on wide screens
  pageContainer: 'min-h-screen max-w-2xl mx-auto',
  container: 'max-w-2xl mx-auto',
  section: 'px-4 py-4 sm:px-6',
  
  // Responsive typography
  textDisplay: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  textHeading: 'text-base sm:text-lg font-semibold',
  textBody: 'text-sm sm:text-base',
  textCaption: 'text-xs sm:text-sm',
  textLabel: 'text-[10px] sm:text-[11px] font-medium uppercase tracking-wide',
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
    bgClass: 'bg-slate-800/50',
    borderClass: 'border-slate-600',
    labelClass: 'text-slate-400',
    valueClass: 'text-slate-200',
  },
  target: {
    bgClass: 'bg-cyan-900/30',
    borderClass: 'border-cyan-700',
    labelClass: 'text-cyan-400',
    valueClass: 'text-cyan-200',
  },
  wholesale: {
    bgClass: 'bg-emerald-900/30',
    borderClass: 'border-emerald-700',
    labelClass: 'text-emerald-400',
    valueClass: 'text-emerald-200',
  },
}
