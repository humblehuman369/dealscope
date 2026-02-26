/**
 * DealGapIQ Frontend Color System
 * Consistent with mobile app branding
 * 
 * Brand Colors:
 * - Navy/Black-Blue: #07172e
 * - Medium Blue (Primary): #0465f2
 * - Soft Cyan (Accent Dark Mode): #0EA5E9 (updated from #00e5ff for premium feel)
 * - Pacific Teal (Accent Light Mode): #0EA5E9
 * - Icy Silver: #e1e8ed
 * - Cool Gray: #aab2bd
 * 
 * UPDATED:
 * - Softened dark mode accent from #00e5ff → #0EA5E9 (less harsh, more premium)
 * - Strategy colors shifted to avoid conflicts with profit/loss/warning status colors
 */

// Platform detection for responsive text colors
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

export const colors = {
  // Primary - Brand Blue
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
  // Dark Mode: #0EA5E9 (Soft Cyan) | Light Mode: #0EA5E9 (Pacific Teal)
  accent: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',  // Sky blue highlight
    400: '#38bdf8',
    500: '#0EA5E9',  // Dark mode accent — unified sky blue
    light: '#0EA5E9', // Light mode accent — unified sky blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
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
    textStrong: '#166534',
  },

  // Loss/Negative - Red (STATUS ONLY - not for strategies)
  loss: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#dc2626',
    text: '#b91c1c',
    textStrong: '#991b1b',
  },

  // Warning - Amber (STATUS ONLY - not for strategies)
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706',
    text: '#b45309',
    textStrong: '#92400e',
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
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Strategy-specific colors (DISTINCT from status colors to avoid confusion)
  strategies: {
    longTermRental: {
      primary: '#0465f2',
      light: '#e6f0fe',
      dark: '#0354d1',
      icon: '🏠',
      label: 'Long-Term Rental',
    },
    shortTermRental: {
      primary: '#8b5cf6',
      light: '#ede9fe',
      dark: '#7c3aed',
      icon: '🏨',
      label: 'Short-Term Rental',
    },
    brrrr: {
      primary: '#f97316',  // Orange (shifted from #f59e0b)
      light: '#ffedd5',
      dark: '#ea580c',
      icon: '🔄',
      label: 'BRRRR',
    },
    fixAndFlip: {
      primary: '#ec4899',  // Pink (shifted from #ef4444)
      light: '#fce7f3',
      dark: '#db2777',
      icon: '🔨',
      label: 'Fix & Flip',
    },
    houseHack: {
      primary: '#0EA5E9',  // Sky blue (unified accent)
      light: '#ccfbf1',
      dark: '#0284c7',
      icon: '🏡',
      label: 'House Hack',
    },
    wholesale: {
      primary: '#84cc16',  // Lime (shifted from #22c55e)
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
  overlay: 'rgba(7, 23, 46, 0.5)',
  overlayLight: 'rgba(7, 23, 46, 0.3)',

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#e1e8ed',
    dark: '#07172e',
    darkAlt: '#0f2744',
    darkElevated: '#1a3a5c',
  },

  // Text colors
  text: {
    primary: '#07172e',
    secondary: isMobile ? '#6b7280' : '#4b5563',
    tertiary: '#6b7280',
    muted: isMobile ? '#9ca3af' : '#aab2bd',
    inverse: '#ffffff',
    inverseMuted: isMobile ? '#d1d5db' : '#aab2bd',
  },

  // Border colors
  border: {
    light: '#e1e8ed',
    default: '#d1d9e0',
    dark: '#aab2bd',
    focus: '#0465f2',
  },
} as const;

// =============================================================================
// GRADIENTS (CSS format for web)
// =============================================================================

export const gradients = {
  /** CTA buttons, hero elements - dark mode */
  brandDark: 'linear-gradient(135deg, #0465f2 0%, #0EA5E9 100%)',
  /** CTA buttons, hero elements - light mode */
  brandLight: 'linear-gradient(135deg, #0465f2 0%, #0EA5E9 100%)',
  /** Dark mode backgrounds */
  backgroundDark: 'linear-gradient(135deg, #07172e 0%, #1f2937 100%)',
  /** Light mode backgrounds */
  backgroundLight: 'linear-gradient(135deg, #e8eef3 0%, #f9fafb 100%)',
  /** Premium card shine overlay */
  cardShine: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
};

// =============================================================================
// CSS VARIABLES (for :root or CSS-in-JS)
// =============================================================================

export const cssVariables = {
  '--color-brand-blue': colors.primary[500],
  '--color-brand-navy': colors.navy[900],
  '--color-accent-dark': colors.accent[500],
  '--color-accent-light': colors.accent.light,
  '--color-icy-silver': colors.gray[100],
  '--color-cool-gray': colors.gray[300],
  '--color-profit': colors.profit.main,
  '--color-loss': colors.loss.main,
  '--color-warning': colors.warning.main,
};

// =============================================================================
// TAILWIND EXTEND (for tailwind.config.js)
// =============================================================================

export const tailwindColors = {
  'brand-blue': colors.primary[500],
  'brand-navy': colors.navy[900],
  'accent-dark': colors.accent[500],
  'accent-light': colors.accent.light,
  'icy-silver': colors.gray[100],
  'cool-gray': colors.gray[300],
  // Strategy colors
  'strategy-long-rental': colors.strategies.longTermRental.primary,
  'strategy-short-rental': colors.strategies.shortTermRental.primary,
  'strategy-brrrr': colors.strategies.brrrr.primary,
  'strategy-flip': colors.strategies.fixAndFlip.primary,
  'strategy-househack': colors.strategies.houseHack.primary,
  'strategy-wholesale': colors.strategies.wholesale.primary,
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ColorKey = keyof typeof colors;
export type StrategyKey = keyof typeof colors.strategies;
export type StatusType = 'profit' | 'loss' | 'warning' | 'info';
