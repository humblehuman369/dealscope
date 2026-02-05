/**
 * InvestIQ Mobile Color System
 * Consistent with web app branding
 * 
 * Brand Colors:
 * - Navy/Black-Blue: #07172e
 * - Medium Blue (Primary): #0465f2
 * - Soft Cyan (Accent Dark Mode): #4dd0e1 (updated from #00e5ff for premium feel)
 * - Pacific Teal (Accent Light Mode): #007ea7
 * - Icy Silver: #e1e8ed
 * - Cool Gray: #aab2bd
 * 
 * UPDATED:
 * - Softened dark mode accent from #00e5ff → #4dd0e1 (less harsh, more premium)
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

  // Accent - Cyan/Teal (Theme-aware)
  // Dark Mode: #4dd0e1 (Soft Cyan) | Light Mode: #007ea7 (Pacific Teal)
  accent: {
    50: '#e0f7fa',
    100: '#b2ebf2',
    200: '#80deea',
    300: '#4dd0e1',  // Softened - use for highlights
    400: '#26c6da',
    500: '#4dd0e1',  // Dark mode accent (Soft Cyan - was #00e5ff)
    light: '#007ea7', // Light mode accent (Pacific Teal)
    600: '#00acc1',
    700: '#0097a7',
    800: '#00838f',
    900: '#006064',
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
    900: '#07172e',  // Primary dark navy
    950: '#030b17',
  },

  // Profit/Positive - Green (STATUS ONLY - not for strategies)
  profit: {
    light: '#d1fae5',
    main: '#22c55e',
    dark: '#16a34a',
    text: '#15803d',
    textStrong: '#166534', // Higher contrast for mobile
  },

  // Loss/Negative - Red (STATUS ONLY - not for strategies)
  loss: {
    light: '#fee2e2',
    main: '#ef4444',
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

  // Special colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(7, 23, 46, 0.5)',  // Navy-based overlay
  overlayLight: 'rgba(7, 23, 46, 0.3)',

  // Scanner-specific (updated to soft cyan for premium feel)
  scanner: {
    target: '#4dd0e1',        // Dark mode (was #00e5ff)
    targetLight: '#007ea7',   // Light mode
    targetActive: '#26c6da',
    reticle: 'rgba(255, 255, 255, 0.8)',
    compass: '#4dd0e1',       // Dark mode (was #00e5ff)
    compassLight: '#007ea7',  // Light mode
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#e1e8ed',  // Icy Silver
    dark: '#07172e',      // Navy
    darkAlt: '#0f2744',   // Elevated dark surface
    darkElevated: '#1a3a5c', // Cards on dark
  },

  // Text colors (with mobile-adaptive secondary)
  text: {
    primary: '#07172e',   // Navy
    secondary: isMobile ? '#6b7280' : '#4b5563', // Darker on mobile for outdoor readability
    tertiary: '#6b7280',
    muted: isMobile ? '#9ca3af' : '#aab2bd',     // Cool Gray (adaptive)
    inverse: '#ffffff',
    inverseMuted: isMobile ? '#d1d5db' : '#aab2bd',
  },

  // Border colors
  border: {
    light: '#e1e8ed',     // Icy Silver
    default: '#d1d9e0',
    dark: '#aab2bd',      // Cool Gray
    focus: '#0465f2',     // Brand blue for focus states
  },
} as const;

// =============================================================================
// GRADIENTS
// =============================================================================

export const gradients = {
  /** CTA buttons, hero elements - dark mode */
  brandDark: ['#0465f2', '#4dd0e1'] as const,
  /** CTA buttons, hero elements - light mode */
  brandLight: ['#0465f2', '#007ea7'] as const,
  /** Dark mode backgrounds */
  backgroundDark: ['#07172e', '#1f2937'] as const,
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
  deepNavy: '#07172e',      // Header backgrounds
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
// TYPE EXPORTS
// =============================================================================

export type ColorKey = keyof typeof colors;
export type StrategyKey = keyof typeof colors.strategies;
export type StatusType = 'profit' | 'loss' | 'warning' | 'info';
export type DecisionGradeKey = keyof typeof decisionGrade;
