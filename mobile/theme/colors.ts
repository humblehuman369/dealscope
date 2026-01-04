/**
 * InvestIQ Mobile Color System
 * Consistent with web app branding
 * 
 * Brand Colors:
 * - Navy/Black-Blue: #07172e
 * - Medium Blue (Primary): #0465f2
 * - Electric Cyan (Accent): #00e5ff
 * - Icy Silver: #e1e8ed
 * - Cool Gray: #aab2bd
 */

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

  // Accent - Electric Cyan
  accent: {
    50: '#e6fcff',
    100: '#ccf9ff',
    200: '#99f3ff',
    300: '#66edff',
    400: '#33e7ff',
    500: '#00e5ff',  // Main accent cyan
    600: '#00b8cc',
    700: '#008a99',
    800: '#005c66',
    900: '#002e33',
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

  // Profit/Positive - Green
  profit: {
    light: '#d1fae5',
    main: '#22c55e',
    dark: '#16a34a',
    text: '#15803d',
  },

  // Loss/Negative - Red
  loss: {
    light: '#ffe4e6',
    main: '#ef4444',
    dark: '#dc2626',
    text: '#b91c1c',
  },

  // Warning - Amber
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706',
    text: '#b45309',
  },

  // Info - Blue (uses primary)
  info: {
    light: '#e6f0fe',
    main: '#0465f2',
    dark: '#0354d1',
    text: '#01216e',
  },

  // Neutral Gray - Cool tones
  gray: {
    50: '#f8fafc',
    100: '#e1e8ed',  // Icy Silver
    200: '#d1d9e0',
    300: '#aab2bd',  // Cool Gray
    400: '#8b95a2',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Strategy-specific colors
  strategies: {
    longTermRental: {
      primary: '#0465f2',  // Brand blue
      light: '#e6f0fe',
      dark: '#0354d1',
    },
    shortTermRental: {
      primary: '#8b5cf6',
      light: '#ede9fe',
      dark: '#7c3aed',
    },
    brrrr: {
      primary: '#f59e0b',
      light: '#fef3c7',
      dark: '#d97706',
    },
    fixAndFlip: {
      primary: '#ef4444',
      light: '#fee2e2',
      dark: '#dc2626',
    },
    houseHack: {
      primary: '#00e5ff',  // Accent cyan
      light: '#e6fcff',
      dark: '#00b8cc',
    },
    wholesale: {
      primary: '#22c55e',
      light: '#dcfce7',
      dark: '#16a34a',
    },
  },

  // Special colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(7, 23, 46, 0.5)',  // Navy-based overlay
  overlayLight: 'rgba(7, 23, 46, 0.3)',

  // Scanner-specific (uses accent cyan for visibility)
  scanner: {
    target: '#00e5ff',
    targetActive: '#00b8cc',
    reticle: 'rgba(255, 255, 255, 0.8)',
    compass: '#00e5ff',
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#e1e8ed',  // Icy Silver
    dark: '#07172e',      // Navy
  },

  // Text colors
  text: {
    primary: '#07172e',   // Navy
    secondary: '#4b5563',
    tertiary: '#6b7280',
    muted: '#aab2bd',     // Cool Gray
    inverse: '#ffffff',
  },

  // Border colors
  border: {
    light: '#e1e8ed',     // Icy Silver
    default: '#d1d9e0',
    dark: '#aab2bd',      // Cool Gray
  },
} as const;

export type ColorKey = keyof typeof colors;
