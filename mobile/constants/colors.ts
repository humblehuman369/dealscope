export const colors = {
  // Base surfaces (true-black -> deep navy)
  base: '#000000',
  card: '#0C1220',
  panel: '#101828',
  panelHover: '#152238',

  // Input fields
  inputBg: '#103351',
  inputBorder: '#15446c',

  // Borders
  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.12)',

  // Primary accent — unified sky blue
  primary: '#0EA5E9',
  primaryDark: '#0284c7',
  teal: '#0EA5E9',
  tealDeep: '#0369a1',
  sky: '#38bdf8',
  skyDeep: '#0EA5E9',

  // Brand blue
  brandBlue: '#0465f2',

  // Text hierarchy (Slate, 4-tier)
  textHeading: '#F1F5F9',
  textBody: '#CBD5E1',
  textSecondary: '#94A3B8',
  textLabel: '#7C8CA0',
  textMuted: '#475569',
  textWhite: '#FFFFFF',

  // Status / semantic
  error: '#F87171',
  errorBg: 'rgba(127, 29, 29, 0.2)',
  success: '#34D399',
  successBg: 'rgba(6, 78, 59, 0.2)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.1)',
  gold: '#fbbf24',

  // Price comparison bar colors
  incomeValue: '#FACC15',
  wholesale: '#C4B5FD',

  // Accent backgrounds (10% opacity)
  accentBg: {
    blue: 'rgba(56,189,248,0.10)',
    teal: 'rgba(14,165,233,0.10)',
    gold: 'rgba(251,191,36,0.10)',
    red: 'rgba(248,113,113,0.10)',
    green: 'rgba(52,211,153,0.10)',
  },

  // Strategy colors (distinct from status)
  strategies: {
    ltr: { primary: '#0465f2', light: '#e6f0fe', dark: '#0354d1', icon: '🏠', label: 'Long-Term Rental' },
    str: { primary: '#8b5cf6', light: '#ede9fe', dark: '#7c3aed', icon: '🏨', label: 'Short-Term Rental' },
    brrrr: { primary: '#f97316', light: '#ffedd5', dark: '#ea580c', icon: '🔄', label: 'BRRRR' },
    flip: { primary: '#ec4899', light: '#fce7f3', dark: '#db2777', icon: '🔨', label: 'Fix & Flip' },
    houseHack: { primary: '#0EA5E9', light: '#ccfbf1', dark: '#0284c7', icon: '🏡', label: 'House Hack' },
    wholesale: { primary: '#84cc16', light: '#ecfccb', dark: '#65a30d', icon: '📋', label: 'Wholesale' },
  },

  // Overlay / special
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  glowStrong: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  cta: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const cardGlow = {
  sm: {
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
    ...shadows.glow,
  },
  lg: {
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.30)',
    ...shadows.glowStrong,
  },
  active: {
    borderWidth: 2,
    borderColor: 'rgba(14,165,233,0.50)',
    ...shadows.glowStrong,
  },
} as const;

export type StrategyColorKey = keyof typeof colors.strategies;
