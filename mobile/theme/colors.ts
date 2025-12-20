/**
 * InvestIQ Mobile Color System
 * Consistent with web app branding
 */

export const colors = {
  // Primary - Teal (brand color)
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // Profit/Positive - Green
  profit: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#047857',
    text: '#065f46',
  },

  // Loss/Negative - Red
  loss: {
    light: '#ffe4e6',
    main: '#f43f5e',
    dark: '#be123c',
    text: '#9f1239',
  },

  // Warning - Amber
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#b45309',
    text: '#92400e',
  },

  // Info - Blue
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8',
    text: '#1e40af',
  },

  // Neutral Gray
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Strategy-specific colors
  strategies: {
    longTermRental: {
      primary: '#0d9488',
      light: '#ccfbf1',
      dark: '#115e59',
    },
    shortTermRental: {
      primary: '#8b5cf6',
      light: '#ede9fe',
      dark: '#5b21b6',
    },
    brrrr: {
      primary: '#f59e0b',
      light: '#fef3c7',
      dark: '#b45309',
    },
    fixAndFlip: {
      primary: '#ef4444',
      light: '#fee2e2',
      dark: '#b91c1c',
    },
    houseHack: {
      primary: '#3b82f6',
      light: '#dbeafe',
      dark: '#1d4ed8',
    },
    wholesale: {
      primary: '#10b981',
      light: '#d1fae5',
      dark: '#047857',
    },
  },

  // Special colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Scanner-specific
  scanner: {
    target: '#14b8a6',
    targetActive: '#0d9488',
    reticle: 'rgba(255, 255, 255, 0.8)',
    compass: '#14b8a6',
  },
} as const;

export type ColorKey = keyof typeof colors;

