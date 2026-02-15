/**
 * DealGapIQ Mobile Shadow System
 * Matches frontend Tailwind boxShadow + VerdictIQ design tokens
 *
 * React Native shadows differ from CSS:
 * - iOS uses shadow* properties (shadowColor, shadowOffset, shadowOpacity, shadowRadius)
 * - Android uses elevation
 *
 * Usage:
 * ```tsx
 * import { getShadow, getGlow } from '../theme/shadows';
 * <View style={[styles.card, getShadow('card')]} />
 * <View style={[styles.badge, getGlow('sky')]} />
 * ```
 */

import { Platform, ViewStyle } from 'react-native';

// ─── Shadow Level Types ─────────────────────────────────────────────────────

export type ShadowLevel =
  | 'none'
  | 'card'
  | 'cardHover'
  | 'cardLg'
  | 'cardDark'
  | 'brand'
  | 'brandLg';

export type GlowLevel = 'sky' | 'skyLg' | 'teal' | 'cyan' | 'blue';

// ─── Internal Token Structure ───────────────────────────────────────────────

interface ShadowToken {
  ios: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  android: {
    elevation: number;
  };
}

// ─── Standard Shadows ───────────────────────────────────────────────────────
// Mapped from frontend tailwind.config.js boxShadow definitions

const shadowTokens: Record<ShadowLevel, ShadowToken> = {
  none: {
    ios: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    android: { elevation: 0 },
  },

  // Matches: shadow-card — '0 1px 3px 0 rgb(0 0 0 / 0.05)'
  card: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
  },

  // Matches: shadow-card-hover — '0 4px 6px -1px rgb(0 0 0 / 0.07)'
  cardHover: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
  },

  // Matches: shadow-card-lg — '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  cardLg: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
    },
    android: { elevation: 8 },
  },

  // Matches: shadow-card-dark — '0 32px 64px -16px rgba(0, 0, 0, 0.5)'
  cardDark: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 32 },
      shadowOpacity: 0.5,
      shadowRadius: 64,
    },
    android: { elevation: 16 },
  },

  // Matches: shadow-brand — '0 4px 14px 0 rgba(4, 101, 242, 0.25)'
  brand: {
    ios: {
      shadowColor: '#0465f2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
    },
    android: { elevation: 6 },
  },

  // Matches: shadow-brand-lg — '0 10px 40px 0 rgba(4, 101, 242, 0.3)'
  brandLg: {
    ios: {
      shadowColor: '#0465f2',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 40,
    },
    android: { elevation: 12 },
  },
};

// ─── Glow Shadows (dark mode accent glows) ──────────────────────────────────
// Mapped from frontend tailwind.config.js glow-* definitions

const glowTokens: Record<GlowLevel, ShadowToken> = {
  // Matches: glow-sky — '0 0 24px rgba(56, 189, 248, 0.2)'
  sky: {
    ios: {
      shadowColor: '#38bdf8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
    },
    android: { elevation: 6 },
  },

  // Matches: glow-sky-lg — '0 0 36px rgba(56, 189, 248, 0.35)'
  skyLg: {
    ios: {
      shadowColor: '#38bdf8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 36,
    },
    android: { elevation: 10 },
  },

  // Matches: glow-teal — '0 0 20px rgba(45, 212, 191, 0.3)'
  teal: {
    ios: {
      shadowColor: '#2dd4bf',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
    },
    android: { elevation: 6 },
  },

  // Matches: glow-cyan — '0 0 20px rgba(0, 229, 255, 0.5)' (updated to use cyan-500)
  cyan: {
    ios: {
      shadowColor: '#06B6D4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
  },

  // Matches: glow-blue — '0 0 20px rgba(4, 101, 242, 0.5)'
  blue: {
    ios: {
      shadowColor: '#0465f2',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get platform-appropriate shadow style.
 *
 * ```tsx
 * <View style={[styles.card, getShadow('card')]} />
 * ```
 */
export function getShadow(level: ShadowLevel): ViewStyle {
  const token = shadowTokens[level];
  return Platform.select({
    ios: token.ios,
    android: token.android,
    default: token.ios,
  }) as ViewStyle;
}

/**
 * Get platform-appropriate glow shadow for dark-mode accent elements.
 *
 * ```tsx
 * <View style={[styles.badge, getGlow('sky')]} />
 * ```
 */
export function getGlow(level: GlowLevel): ViewStyle {
  const token = glowTokens[level];
  return Platform.select({
    ios: token.ios,
    android: token.android,
    default: token.ios,
  }) as ViewStyle;
}

// ─── VerdictIQ Shadows (convenience presets) ────────────────────────────────
// Matches frontend verdict-design-tokens.ts shadow definitions

export const verdictShadows = {
  /** Card shadow — deep dark cards */
  card: getShadow('cardDark'),

  /** Sky glow — accent highlights */
  glow: getGlow('sky'),

  /** CTA button shadow */
  ctaBtn: {
    ...Platform.select({
      ios: {
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  } as ViewStyle,

  /** CTA button hover shadow */
  ctaBtnHover: {
    ...Platform.select({
      ios: {
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
      },
      android: { elevation: 12 },
    }),
  } as ViewStyle,
};
