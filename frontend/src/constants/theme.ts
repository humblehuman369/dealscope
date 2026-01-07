// ============================================
// InvestIQ Property Analytics - Design System
// ============================================

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// COLORS
// ============================================

export const colors = {
  // Brand
  primary: '#4dd0e1',
  primaryDark: '#0097a7',
  primaryLight: '#80deea',
  accent: '#0465f2',

  // Semantic
  success: '#22c55e',
  successLight: '#4ade80',
  successDark: '#16a34a',
  successBg: 'rgba(34,197,94,0.1)',
  successBorder: 'rgba(34,197,94,0.2)',

  warning: '#f97316',
  warningLight: '#fb923c',
  warningDark: '#ea580c',
  warningBg: 'rgba(249,115,22,0.1)',
  warningBorder: 'rgba(249,115,22,0.2)',

  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#dc2626',
  errorBg: 'rgba(239,68,68,0.1)',
  errorBorder: 'rgba(239,68,68,0.2)',

  info: '#3b82f6',
  infoBg: 'rgba(59,130,246,0.1)',
  infoBorder: 'rgba(59,130,246,0.2)',

  // Dark theme
  dark: {
    background: '#07172e',
    backgroundSecondary: '#0a1f3d',
    surface: 'rgba(255,255,255,0.03)',
    surfaceHover: 'rgba(255,255,255,0.06)',
    surfaceActive: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.06)',
    borderLight: 'rgba(255,255,255,0.04)',
    borderHeavy: 'rgba(255,255,255,0.12)',
    text: '#ffffff',
    textSecondary: '#aab2bd',
    textMuted: '#6b7280',
    textInverse: '#07172e',
  },

  // Light theme
  light: {
    background: '#f8fafc',
    backgroundSecondary: '#f1f5f9',
    surface: '#ffffff',
    surfaceHover: '#f8fafc',
    surfaceActive: '#f1f5f9',
    border: 'rgba(7,23,46,0.08)',
    borderLight: 'rgba(7,23,46,0.04)',
    borderHeavy: 'rgba(7,23,46,0.15)',
    text: '#07172e',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    textInverse: '#ffffff',
  },

  // Strategy colors
  strategies: {
    longTerm: '#0465f2',
    shortTerm: '#8b5cf6',
    brrrr: '#f97316',
    fixFlip: '#ec4899',
    houseHack: '#14b8a6',
    wholesale: '#84cc16',
  },

  // Score colors
  score: {
    excellent: '#22c55e',
    good: '#84cc16',
    fair: '#eab308',
    poor: '#f97316',
    bad: '#ef4444',
  },

  // Gradients (as arrays for LinearGradient)
  gradients: {
    primary: ['#0097a7', '#4dd0e1'],
    primaryDark: ['#006d7a', '#0097a7'],
    success: ['#16a34a', '#22c55e'],
    warning: ['#ea580c', '#f97316'],
    error: ['#dc2626', '#ef4444'],
    scoreExcellent: ['#16a34a', '#22c55e'],
    scorePoor: ['#ea580c', '#f97316'],
  },
};

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font family
  fontFamily: Platform.select({
    ios: 'Inter',
    android: 'Inter',
    default: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  }),

  // Font sizes
  sizes: {
    hero: 48,
    h1: 28,
    h2: 24,
    h3: 20,
    h4: 18,
    body: 14,
    bodySmall: 13,
    caption: 12,
    micro: 10,
    nano: 9,
  },

  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeights: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// ============================================
// SPACING
// ============================================

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============================================
// DIMENSIONS
// ============================================

export const dimensions = {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    height: Platform.select({ ios: 44, android: 56 }) || 56,
  },
  tabBar: {
    height: Platform.select({ ios: 83, android: 56 }) || 56,
  },
  touchTarget: {
    min: 44,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  button: {
    height: 48,
    heightSmall: 36,
    heightLarge: 56,
  },
  input: {
    height: 48,
  },
  slider: {
    trackHeight: 6,
    thumbSize: 20,
  },
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
};

// ============================================
// ANIMATION
// ============================================

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
  },
  easing: {
    // These are cubic-bezier values for react-native-reanimated
    easeIn: [0.4, 0, 1, 1],
    easeOut: [0, 0, 0.2, 1],
    easeInOut: [0.4, 0, 0.2, 1],
    spring: { tension: 100, friction: 10 },
    bounce: { tension: 180, friction: 12 },
  },
};

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  base: 0,
  card: 1,
  dropdown: 10,
  sticky: 20,
  modal: 50,
  tooltip: 60,
  toast: 70,
  overlay: 80,
  max: 100,
};

// ============================================
// BREAKPOINTS (for responsive design)
// ============================================

export const breakpoints = {
  sm: 375,  // iPhone SE
  md: 414,  // iPhone Plus / Pro Max
  lg: 768,  // iPad
  xl: 1024, // iPad Pro
};

export const isSmallScreen = SCREEN_WIDTH < breakpoints.md;
export const isMediumScreen = SCREEN_WIDTH >= breakpoints.md && SCREEN_WIDTH < breakpoints.lg;
export const isLargeScreen = SCREEN_WIDTH >= breakpoints.lg;

// ============================================
// COMPONENT-SPECIFIC STYLES
// ============================================

export const componentStyles = {
  // Deal Score Card
  dealScoreCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    minHeight: 160,
  },

  // Metric Box
  metricBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
  },

  // Tab Navigation
  tabNav: {
    height: 44,
    borderRadius: radius.md,
    gap: spacing.xs,
  },

  // Slider
  slider: {
    trackHeight: 6,
    thumbSize: 22,
    labelGap: spacing.sm,
  },

  // Insight Card
  insightCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },

  // Property Mini Card
  propertyMini: {
    height: 64,
    thumbnailSize: 44,
    borderRadius: radius.md,
  },

  // Score Gauge
  scoreGauge: {
    size: 180,
    strokeWidth: 12,
    innerSize: 140,
  },

  // Comparison Bar
  comparisonBar: {
    height: 8,
    borderRadius: radius.xs,
    gap: spacing.xs,
  },
};

// ============================================
// SLIDER CONFIGURATIONS
// ============================================

export const sliderConfigs = {
  purchasePrice: {
    minPercent: -20,
    maxPercent: 10,
    step: 1000,
  },
  downPayment: {
    min: 5,
    max: 50,
    step: 5,
  },
  interestRate: {
    min: 3,
    max: 12,
    step: 0.125,
  },
  loanTerm: {
    options: [15, 20, 25, 30],
  },
  vacancyRate: {
    min: 0,
    max: 20,
    step: 1,
  },
  maintenanceRate: {
    min: 0,
    max: 15,
    step: 1,
  },
  managementRate: {
    min: 0,
    max: 15,
    step: 1,
  },
  monthlyRent: {
    minPercent: -20,
    maxPercent: 20,
    step: 25,
  },
};

// ============================================
// BENCHMARK VALUES
// ============================================

export const benchmarks = {
  cashOnCash: {
    excellent: 12,
    good: 8,
    fair: 5,
    poor: 0,
  },
  capRate: {
    excellent: 10,
    good: 7,
    fair: 5,
    poor: 3,
  },
  dscr: {
    excellent: 1.5,
    good: 1.25,
    fair: 1.1,
    poor: 1.0,
  },
  onePercentRule: {
    excellent: 1.2,
    good: 1.0,
    fair: 0.8,
    poor: 0.6,
  },
  cashFlow: {
    excellent: 500,
    good: 300,
    fair: 100,
    poor: 0,
  },
};

// ============================================
// EXPORT DEFAULT THEME
// ============================================

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  dimensions,
  animation,
  zIndex,
  breakpoints,
  componentStyles,
  sliderConfigs,
  benchmarks,
};

export default theme;
