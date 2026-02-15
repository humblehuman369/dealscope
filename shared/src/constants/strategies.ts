/**
 * Strategy Configuration Constants — Single Source of Truth
 *
 * Strategy metadata (names, icons, colors) used across both platforms.
 * Colors reference the Phase 5-aligned design tokens.
 */

import type { StrategyId, StrategyInfo } from '../types/strategy';

// =============================================================================
// STRATEGY CONFIGURATION
// =============================================================================

/**
 * Canonical strategy metadata for all investment strategies.
 * Colors match mobile/theme/colors.ts strategies section.
 */
export const STRATEGY_CONFIG: Record<StrategyId, Omit<StrategyInfo, 'grade' | 'score'>> = {
  ltr: {
    id: 'ltr',
    name: 'Long-Term Rental',
    shortName: 'Long Rental',
    icon: '🏠',
    color: '#0465f2', // Brand blue
  },
  str: {
    id: 'str',
    name: 'Short-Term Rental',
    shortName: 'Short Rental',
    icon: '🏨',
    color: '#8b5cf6', // Purple
  },
  brrrr: {
    id: 'brrrr',
    name: 'BRRRR',
    shortName: 'BRRRR',
    icon: '🔄',
    color: '#f97316', // Orange
  },
  flip: {
    id: 'flip',
    name: 'Fix & Flip',
    shortName: 'Fix & Flip',
    icon: '🔨',
    color: '#ec4899', // Pink
  },
  house_hack: {
    id: 'house_hack',
    name: 'House Hack',
    shortName: 'House Hack',
    icon: '🏡',
    color: '#14b8a6', // Teal
  },
  wholesale: {
    id: 'wholesale',
    name: 'Wholesale',
    shortName: 'Wholesale',
    icon: '📋',
    color: '#84cc16', // Lime
  },
};

/**
 * Strategy display order (default ranking for multi-strategy views).
 */
export const STRATEGY_DISPLAY_ORDER: readonly StrategyId[] = [
  'ltr',
  'str',
  'brrrr',
  'flip',
  'house_hack',
  'wholesale',
] as const;
