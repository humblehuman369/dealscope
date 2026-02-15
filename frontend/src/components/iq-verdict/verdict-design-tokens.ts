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
// TYPOGRAPHY SCALE — Inter, per VerdictIQ 3.3
// Headlines 700 (was 800), body 400, financial 600 + tabular-nums
// ===================

export const typography = {
  /** 3.5rem / 700 - Score number in hero */
  scoreDisplay: {
    size: 56,
    weight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  /** 1.35rem / 700 - Section titles */
  heading: {
    size: 22,
    weight: 700,
    lineHeight: 1.35,
  },
  /** 1rem / 400 - Body content */
  body: {
    size: 16,
    weight: 400,
    lineHeight: 1.65,
  },
  /** 0.92rem / 400 - Secondary body */
  bodySmall: {
    size: 15,
    weight: 400,
    lineHeight: 1.55,
  },
  /** 0.88rem / 600 - Financial values (tabular-nums) */
  financial: {
    size: 14,
    weight: 600,
    lineHeight: 1.4,
    fontVariantNumeric: 'tabular-nums',
  },
  /** 1.2rem / 700 - Large financial values */
  financialLarge: {
    size: 19,
    weight: 700,
    lineHeight: 1.3,
    fontVariantNumeric: 'tabular-nums',
  },
  /** 0.72rem / 700 - Section labels, uppercase */
  label: {
    size: 12,
    weight: 700,
    lineHeight: 1.2,
    letterSpacing: 1.2,
  },
  /** 0.65rem / 700 - Badge / tag text */
  tag: {
    size: 10,
    weight: 700,
    lineHeight: 1.3,
    letterSpacing: 0.3,
  },
  /** 0.82rem / 500 - Caption / helper text */
  caption: {
    size: 13,
    weight: 500,
    lineHeight: 1.4,
  },
  /** 1.05rem / 700 - CTA buttons */
  cta: {
    size: 17,
    weight: 700,
    lineHeight: 1.3,
  },
} as const

// ===================
// COLORS — VerdictIQ 3.3 Dark Theme
// True black base, Slate text hierarchy, five semantic accents
// ===================

export const colors = {
  // Brand
  brand: {
    /** #4dd0e1 - DealGapIQ cyan — primary accent */
    blue: '#4dd0e1',
    /** #00acc1 - Deep cyan — CTA buttons */
    blueDeep: '#00acc1',
    /** #2dd4bf - Teal — positive / interactive */
    teal: '#2dd4bf',
    /** #fbbf24 - Gold — caution / moderate */
    gold: '#fbbf24',
    // Legacy aliases
    tealBright: '#4dd0e1',
    cyan: '#4dd0e1',
  },

  // Text — Four-tier Slate hierarchy
  text: {
    /** #F1F5F9 - Headings (near-white) */
    primary: '#F1F5F9',
    /** #CBD5E1 - Body text (solid readable grey) */
    body: '#CBD5E1',
    /** #94A3B8 - Secondary (muted but legible) */
    secondary: '#94A3B8',
    /** #7C8CA0 - Labels (smallest, WCAG AA ≥ 4.5:1 on card bg) */
    tertiary: '#7C8CA0',
    /** #7C8CA0 - Alias for label tier */
    muted: '#7C8CA0',
    /** #FFFFFF */
    white: '#FFFFFF',
  },

  // Backgrounds — True black base
  background: {
    /** #000000 - True black page base */
    base: '#000000',
    /** #060B14 - Page sections background */
    bg: '#060B14',
    /** #0C1220 - Card / deep navy */
    card: '#0C1220',
    /** #101828 - Elevated card */
    cardUp: '#101828',
    // Legacy aliases
    white: '#0C1220',
    light: '#060B14',
    subtle: '#101828',
    dark: '#000000',
    deepNavy: '#060B14',
  },

  // Status / Semantic accents
  status: {
    /** #34d399 - Green — positive / success */
    positive: '#34d399',
    /** #fbbf24 - Gold — warning / caution */
    warning: '#fbbf24',
    /** #f87171 - Red — negative / danger */
    negative: '#f87171',
    /** #fbbf24 - Alias for gold */
    amber: '#fbbf24',
  },

  // Accent backgrounds (10% opacity)
  accentBg: {
    blue: 'rgba(56,189,248,0.10)',
    teal: 'rgba(45,212,191,0.10)',
    gold: 'rgba(251,191,36,0.10)',
    red: 'rgba(248,113,113,0.10)',
    green: 'rgba(52,211,153,0.10)',
  },

  // UI Elements
  ui: {
    /** 7% white opacity borders */
    border: 'rgba(255,255,255,0.07)',
    /** Active blue border */
    borderActive: 'rgba(56,189,248,0.35)',
    /** Stronger border for cards */
    borderDark: 'rgba(255,255,255,0.12)',
    /** #64748B - Icons */
    iconMuted: '#64748B',
  },

  // Harmonized Metric Colors (kept for component compat)
  harmonized: {
    slateBlue: '#94A3B8',
    softCoral: '#f87171',
    confidenceTrack: 'rgba(56,189,248,0.08)',
    verdictCardBorder: 'rgba(56,189,248,0.20)',
    signalCardBg: '#0C1220',
  },

  // Gradients & Shadows
  gradient: {
    heroGlow: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)',
    ctaGlow: 'radial-gradient(ellipse at 50% 100%, rgba(14,165,233,0.05) 0%, transparent 70%)',
  },
  shadow: {
    card: '0 2px 8px rgba(0,0,0,0.4)',
    glow: '0 0 20px rgba(56,189,248,0.15)',
    ctaBtn: '0 4px 24px rgba(14,165,233,0.3)',
    ctaBtnHover: '0 8px 32px rgba(14,165,233,0.45)',
  },
} as const

// ===================
// COMPONENT PATTERNS
// ===================

export const components = {
  /** Card styling */
  card: {
    padding: spacing.md,
    borderRadius: 14,
    shadow: '0 2px 8px rgba(0,0,0,0.4)',
  },

  /** Stat block styling */
  statBlock: {
    textAlign: 'center' as const,
    valueSize: typography.financialLarge.size,
    labelSize: typography.label.size,
  },

  /** Progress bar styling */
  progressBar: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  /** Button styling */
  button: {
    primaryHeight: 52,
    secondaryHeight: 40,
    borderRadius: 100,
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
 * VerdictIQ 3.3 — uses five semantic accents
 * 
 * Score Tiers:
 * 80-100: Strong/Good — Green #34d399
 * 60-79:  Moderate — Gold #fbbf24
 * 40-59:  Marginal — Blue #38bdf8
 * 0-39:   Unlikely/Pass — Red #f87171
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return colors.status.positive     // Green
  if (score >= 60) return colors.brand.gold          // Gold
  if (score >= 40) return colors.brand.blue          // Blue
  return colors.status.negative                       // Red
}

/**
 * Get harmonized bar color for confidence metrics
 */
export function getHarmonizedBarColor(value: number): string {
  if (value >= 70) return colors.brand.teal           // Teal
  if (value >= 40) return colors.brand.blue           // Blue
  return colors.status.negative                        // Red
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
      bgClass: 'bg-emerald-400/15 text-emerald-400',
    }
  }
  if (isFair) {
    return {
      color: colors.brand.gold,
      label: 'FAIR',
      bgClass: 'bg-amber-400/15 text-amber-400',
    }
  }
  return {
    color: colors.status.negative,
    label: 'POOR',
    bgClass: 'bg-red-400/15 text-red-400',
  }
}

/**
 * Get urgency color based on label
 */
export function getUrgencyColor(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'high': return colors.status.positive
    case 'medium': return colors.brand.gold
    case 'low': return colors.text.tertiary
    default: return colors.text.tertiary
  }
}

/**
 * Get market temperature color
 */
export function getMarketTempColor(temp: string): string {
  switch (temp.toLowerCase()) {
    case 'cold': return colors.brand.teal
    case 'warm': return colors.brand.gold
    case 'hot': return colors.status.negative
    default: return colors.text.tertiary
  }
}

// ===================
// TAILWIND CLASS HELPERS
// ===================

/**
 * Common Tailwind class compositions — VerdictIQ 3.3 dark theme
 * True black base, 7% white borders, Inter typography
 */
export const tw = {
  // Cards
  card: 'rounded-[14px] border border-white/[0.07]',
  cardBg: 'bg-[#0C1220]',
  cardHover: 'hover:border-sky-400/25 transition-all',

  // Section headers
  sectionHeader: 'text-xs font-bold text-sky-400 uppercase tracking-[0.12em]',

  // Labels
  label: 'text-[11px] font-bold text-[#64748B] uppercase tracking-[0.04em]',

  // Values
  valueLg: 'text-2xl font-bold text-[#F1F5F9] tabular-nums',
  valueMd: 'text-lg font-semibold text-[#F1F5F9] tabular-nums',

  // Buttons
  buttonPrimary: 'h-12 px-6 bg-[#0EA5E9] hover:bg-sky-400 text-white font-bold rounded-full transition-all shadow-[0_4px_24px_rgba(14,165,233,0.3)]',
  buttonSecondary: 'h-10 px-4 border border-[#64748B] hover:border-teal-400 hover:text-teal-400 text-[#CBD5E1] font-semibold rounded-full transition-all',
  buttonGhost: 'text-[#94A3B8] hover:text-teal-400 font-medium transition-colors',

  // Dividers
  divider: 'border-t border-white/[0.07]',

  // VerdictIQ Visual Polish
  investmentCard: 'bg-[#0C1220] rounded-[14px] border border-white/[0.07] p-5',
  metricCard: 'bg-[#0C1220] rounded-xl border border-white/[0.07] p-4 text-center',
  pillBadge: 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.03em]',
  glowRing: 'drop-shadow-[0_0_12px_rgba(56,189,248,0.25)]',

  // Layout
  pageContainer: 'min-h-screen max-w-[480px] mx-auto bg-black',
  container: 'max-w-[480px] mx-auto',
  section: 'px-5 py-8',

  // Responsive typography
  textDisplay: 'text-[3.5rem] font-bold tabular-nums',
  textHeading: 'text-[1.35rem] font-bold leading-[1.35]',
  textBody: 'text-[0.95rem] font-normal leading-[1.55]',
  textCaption: 'text-[0.82rem] font-medium',
  textLabel: 'text-[0.72rem] font-bold uppercase tracking-[0.12em]',
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
  tagClass: string
  tagLabel: string
}> = {
  breakeven: {
    bgClass: 'bg-[#0C1220]',
    borderClass: 'border-white/[0.07]',
    labelClass: 'text-[#94A3B8]',
    valueClass: 'text-[#F1F5F9]',
    tagClass: 'bg-white/[0.06] text-[#94A3B8]',
    tagLabel: 'No profit',
  },
  target: {
    bgClass: 'bg-[#101828]',
    borderClass: 'border-sky-400/35',
    labelClass: 'text-sky-400',
    valueClass: 'text-sky-400',
    tagClass: 'bg-sky-400/10 text-sky-400',
    tagLabel: 'Best target',
  },
  wholesale: {
    bgClass: 'bg-[#0C1220]',
    borderClass: 'border-white/[0.07]',
    labelClass: 'text-[#94A3B8]',
    valueClass: 'text-[#F1F5F9]',
    tagClass: 'bg-teal-400/10 text-teal-400',
    tagLabel: 'Deep value',
  },
}
