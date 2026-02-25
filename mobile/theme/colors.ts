/**
 * DealGapIQ Mobile Color System
 * Aligned with frontend Tailwind config & VerdictIQ 3.3 design system
 * 
 * Brand Colors:
 * - Navy: #0A1628 (aligned with frontend Tailwind navy-900)
 * - Medium Blue (Primary): #0465f2
 * - Sky Blue (Dark Mode Highlight): #38bdf8 (Tailwind sky-400)
 * - Cyan (Functional Accent): #06B6D4 (Tailwind cyan-500)
 * - Icy Silver: #e1e8ed
 * - Cool Gray: #aab2bd
 * 
 * UPDATED (Phase 5 — Design Token Alignment):
 * - Accent palette → Tailwind Cyan (was Material Teal)
 * - Added sky semantic accent (#38bdf8) for primary dark-mode highlights
 * - Navy.900 → #0A1628 (aligned with frontend Tailwind config)
 * - Added purple accent (#a78bfa) matching frontend
 * - Brand gradient endpoint → #38bdf8 (was #4dd0e1)
 * - Strategy colors shifted to avoid conflicts with profit/loss/warning status colors
 */

import { Platform } from 'react-native';

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

export const colors = {
  // Primary - Brand Blue (matches web app)
  primary: {
    50: '#e6f0fe',
    100: '#cce1fd',
    200: '#99c3fb',
    300: '#66a5f9',
    400: '#3387f7',
    500: '#0465f2',  // Main brand blue
    600: '#0354d1',
    700: '#0243b0',
    800: '#02328f',
    900: '#01216e',
  },

  // Accent - Tailwind Cyan (functional interactive elements)
  // Matches frontend tailwind.config.js accent palette
  accent: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06B6D4',   // Tailwind cyan-500 (was Material Teal #4dd0e1)
    light: '#06B6D4',  // Consistent across modes (was #007ea7)
    600: '#0891B2',
    700: '#0E7490',
    800: '#155e75',
    900: '#164e63',
  },

  // Sky - Primary accent for dark mode highlights & key data
  // Matches frontend tailwind.config.js sky semantic accent
  sky: {
    DEFAULT: '#38bdf8',     // Tailwind sky-400 — primary highlight
    deep: '#0EA5E9',        // Sky-500 — CTA buttons
    dim: 'rgba(56,189,248,0.10)',
  },

  // Navy - Dark backgrounds & text
  navy: {
    50: '#e8eef3',
    100: '#d1dde7',
    200: '#a3bbcf',
    300: '#7599b7',
    400: '#47779f',
    500: '#1a5587',
    600: '#15446c',
    700: '#103351',
    800: '#0b2236',
    900: '#0A1628',  // Primary dark navy (aligned with frontend Tailwind config)
    950: '#030b17',
  },

  // Profit/Positive - Green (STATUS ONLY - not for strategies)
  profit: {
    light: '#d1fae5',
    main: '#34d399',
    dark: '#16a34a',
    text: '#15803d',
    textStrong: '#166534', // Higher contrast for mobile
  },

  // Loss/Negative - Red (STATUS ONLY - not for strategies)
  loss: {
    light: '#fee2e2',
    main: '#f87171',
    dark: '#dc2626',
    text: '#b91c1c',
    textStrong: '#991b1b', // Higher contrast for mobile
  },

  // Warning - Amber (STATUS ONLY - not for strategies)
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706',
    text: '#b45309',
    textStrong: '#92400e', // Higher contrast for mobile
  },

  // Info - Blue (uses primary)
  info: {
    light: '#e6f0fe',
    main: '#0465f2',
    dark: '#0354d1',
    text: '#01216e',
    textStrong: '#01216e',
  },

  // Neutral Gray - Cool tones
  gray: {
    50: '#f8fafc',
    100: '#e1e8ed',  // Icy Silver
    200: '#d1d9e0',
    300: '#aab2bd',  // Cool Gray
    400: '#9ca3af',
    500: '#6b7280',  // Mobile secondary text
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Strategy-specific colors (DISTINCT from status colors to avoid confusion)
  strategies: {
    longTermRental: {
      primary: '#0465f2',  // Brand blue
      light: '#e6f0fe',
      dark: '#0354d1',
      icon: '🏠',
      label: 'Long-Term Rental',
    },
    shortTermRental: {
      primary: '#8b5cf6',  // Purple - unique
      light: '#ede9fe',
      dark: '#7c3aed',
      icon: '🏨',
      label: 'Short-Term Rental',
    },
    brrrr: {
      primary: '#f97316',  // Orange (shifted from #f59e0b to avoid warning conflict)
      light: '#ffedd5',
      dark: '#ea580c',
      icon: '🔄',
      label: 'BRRRR',
    },
    fixAndFlip: {
      primary: '#ec4899',  // Pink (shifted from #ef4444 to avoid loss/danger conflict)
      light: '#fce7f3',
      dark: '#db2777',
      icon: '🔨',
      label: 'Fix & Flip',
    },
    houseHack: {
      primary: '#14b8a6',  // Teal (shifted from #00e5ff to avoid accent conflict)
      light: '#ccfbf1',
      dark: '#0d9488',
      icon: '🏡',
      label: 'House Hack',
    },
    wholesale: {
      primary: '#84cc16',  // Lime (shifted from #22c55e to avoid profit/success conflict)
      light: '#ecfccb',
      dark: '#65a30d',
      icon: '📋',
      label: 'Wholesale',
    },
  },

  // Purple accent (matches frontend Tailwind config)
  purple: {
    DEFAULT: '#a78bfa',
    dim: 'rgba(167,139,250,0.10)',
  },

  // Special colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(10, 22, 40, 0.5)',   // Navy-based overlay (#0A1628)
  overlayLight: 'rgba(10, 22, 40, 0.3)',

  // Scanner-specific (aligned with sky accent for design system consistency)
  scanner: {
    target: '#38bdf8',        // Sky blue (was #4dd0e1)
    targetLight: '#06B6D4',   // Cyan-500 (was #007ea7)
    targetActive: '#0EA5E9',  // Sky-500
    reticle: 'rgba(255, 255, 255, 0.8)',
    compass: '#38bdf8',       // Sky blue (was #4dd0e1)
    compassLight: '#06B6D4',  // Cyan-500 (was #007ea7)
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#e1e8ed',      // Icy Silver
    dark: '#000000',          // True black (aligned with frontend bg-black)
    darkAlt: '#0f2744',       // Elevated dark surface
    darkElevated: '#1a3a5c',  // Cards on dark
    panelHover: '#152238',    // Panel hover state (matches frontend base.panel-hover)
  },

  // Text colors (with mobile-adaptive secondary)
  // WCAG AA: ≥ 4.5:1 on #ffffff for normal text, ≥ 3:1 for large (18pt+)
  text: {
    primary: '#0A1628',   // Navy (aligned with frontend)   — 15.8:1
    secondary: isMobile ? '#6b7280' : '#4b5563', // Mobile  —  4.8:1 / Desktop 7.4:1
    tertiary: '#6b7280',  //                               —  4.8:1
    muted: isMobile ? '#737373' : '#8b8b8b',     // Bumped from #9ca3af (2.5:1) → 4.6:1
    inverse: '#ffffff',
    inverseMuted: isMobile ? '#d1d5db' : '#aab2bd',
  },

  // Border colors
  border: {
    light: '#e1e8ed',     // Icy Silver
    default: '#d1d9e0',
    dark: '#aab2bd',      // Cool Gray
    focus: '#0465f2',     // Brand blue for focus states
    // Dark mode borders (matches frontend border tokens)
    darkSubtle: 'rgba(255,255,255,0.07)',   // 7% white (matches frontend border.DEFAULT)
    darkLight: 'rgba(255,255,255,0.12)',    // 12% white (matches frontend border.light)
  },
} as const;

// =============================================================================
// GRADIENTS
// =============================================================================

export const gradients = {
  /** CTA buttons, hero elements - dark mode (matches frontend gradient-brand) */
  brandDark: ['#0465f2', '#38bdf8'] as const,
  /** CTA buttons, hero elements - light mode */
  brandLight: ['#0465f2', '#06B6D4'] as const,
  /** Dark mode backgrounds */
  backgroundDark: ['#0A1628', '#1f2937'] as const,
  /** Light mode backgrounds */
  backgroundLight: ['#e8eef3', '#f9fafb'] as const,
};

// =============================================================================
// REACT NATIVE SPECIFIC
// =============================================================================

export const rnColors = {
  /** Status bar styles */
  statusBar: {
    light: { backgroundColor: colors.background.primary, barStyle: 'dark-content' as const },
    dark: { backgroundColor: colors.background.dark, barStyle: 'light-content' as const },
  },
  
  /** Tab bar colors */
  tabBar: {
    light: {
      active: colors.primary[500],
      inactive: colors.gray[400],
      background: colors.background.primary,
      border: colors.border.light,
    },
    dark: {
      active: colors.accent[500],
      inactive: colors.gray[500],
      background: colors.background.dark,
      border: colors.navy[700],
    },
  },
  
  /** Safe area backgrounds */
  safeArea: {
    light: colors.background.primary,
    dark: colors.background.dark,
  },
};

// =============================================================================
// ACCESSIBILITY HELPERS
// =============================================================================

export const a11y = {
  /** Minimum touch target size (44x44 per Apple HIG) */
  minTouchTarget: 44,
  
  /** Focus visible outline */
  focusRing: colors.accent[500],
  focusRingWidth: 2,
};

// =============================================================================
// DECISION-GRADE UI COLORS (High Contrast)
// Per DealMakerIQ Design System & Style Guide
// =============================================================================

export const decisionGrade = {
  // Core Brand - Per Style Guide
  deepNavy: '#0A1628',      // Header backgrounds (aligned with navy.900)
  pacificTeal: '#0891B2',   // Intelligence markers, positive signals
  tealLight: '#0891B2',     // Interactive states (matching header)
  electricCyan: '#00D4FF',  // Dark mode accents

  // Semantic - Per Style Guide (NO GREEN - teal for positive)
  positive: '#10B981',      // Green for positive (emerald)
  caution: '#D97706',       // Amber for caution
  negative: '#DC2626',      // Red for loss/risk
  infoBlue: '#0891B2',      // Teal for informational

  // Surfaces - Pure white with neutral grays (no blue undertone)
  bgPrimary: '#FFFFFF',
  bgSecondary: '#FAFAFA',   // Near-white neutral
  bgSelected: '#F5F5F5',    // Light neutral gray

  // Borders - Neutral grays (no blue undertone)
  borderStrong: '#A3A3A3',  // neutral-400
  borderMedium: '#D4D4D4',  // neutral-300
  borderLight: '#E5E5E5',   // neutral-200

  // Text - Neutral grays (no blue undertone)
  textPrimary: '#171717',   // neutral-900
  textSecondary: '#525252', // neutral-600
  textTertiary: '#737373',  // neutral-500
  textMuted: '#A3A3A3',     // neutral-400

  // Harmonized Metric Colors (VerdictIQ palette)
  slateBlue: '#6B7F99',           // Moderate/caution - harmonizes with navy/teal
  softCoral: '#C45B5B',           // Concern/negative - muted risk signal
  confidenceTrack: 'rgba(8,145,178,0.06)',  // Teal-tinted bar track
  verdictCardBorder: 'rgba(8,145,178,0.12)', // Card border matching InvestmentAnalysis
  signalCardBg: '#F8FAFB',        // Signal indicator card background

  // Gradients & Shadows (for VerdictIQ visual polish)
  gradientTealStart: 'rgba(8,145,178,0.10)',
  gradientCyanMid: 'rgba(6,182,212,0.05)',
  gradientTealEnd: 'rgba(8,145,178,0.10)',
  cardShadow: 'rgba(0,0,0,0.06)',
  tealGlow: 'rgba(8,145,178,0.15)',
  selectedCardBg: '#FFFFFF',
  unselectedCardBg: '#F5F5F5',
  recommendedBadgeBg: 'rgba(8,145,178,0.12)',
} as const;

// =============================================================================
// VERDICT/STRATEGY DARK THEME
// Per VerdictIQ 3.3 Design — True black base, Slate text, updated accents
// Used exclusively on VerdictIQ and StrategyIQ pages
// =============================================================================

export const verdictDark = {
  // Base surfaces
  black: '#000000',          // True black base
  bg: '#000000',             // True black base (aligned with frontend)
  card: '#0C1220',           // Card / deep navy
  cardUp: '#101828',         // Elevated card

  // Text — Four-tier Slate hierarchy (WCAG AA ≥ 4.5:1 on #0C1220 card bg)
  textHeading: '#F1F5F9',    // Near-white for headings  — 15.6:1
  textBody: '#CBD5E1',       // Solid readable grey       — 10.3:1
  textSecondary: '#94A3B8',  // Muted but still legible   —  6.0:1
  textLabel: '#7C8CA0',      // Smallest text, still solid —  4.6:1 (bumped from #64748B / 3.4:1)
  white: '#FFFFFF',

  // Semantic accents
  blue: '#38bdf8',           // Sky blue — primary accent
  blueDeep: '#0EA5E9',       // Deep sky — CTA buttons
  blueBg: 'rgba(56,189,248,0.10)',
  teal: '#2dd4bf',           // Teal — positive / interactive
  tealBg: 'rgba(45,212,191,0.10)',
  gold: '#fbbf24',           // Gold — caution / moderate
  goldBg: 'rgba(251,191,36,0.10)',
  red: '#f87171',            // Red — negative / risk
  redBg: 'rgba(248,113,113,0.10)',
  green: '#34d399',          // Green — positive / success
  greenBg: 'rgba(52,211,153,0.10)',

  // Borders
  border: 'rgba(255,255,255,0.07)',       // 7% white opacity
  borderActive: 'rgba(56,189,248,0.35)',  // Active blue border

  // Logo font
  logoFont: 'Source Sans 3',
} as const;

export type VerdictDarkKey = keyof typeof verdictDark;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ColorKey = keyof typeof colors;
export type StrategyKey = keyof typeof colors.strategies;
export type StatusType = 'profit' | 'loss' | 'warning' | 'info';
export type DecisionGradeKey = keyof typeof decisionGrade;
