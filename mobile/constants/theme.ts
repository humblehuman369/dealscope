/**
 * Unified theme re-export for convenience.
 */
export { colors, shadows, cardGlow } from './colors';
export { typography, fontFamilies } from './typography';
export { spacing, layout, radii } from './spacing';

export function getScoreColor(score: number): string {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  if (score >= 40) return '#0EA5E9';
  return '#f87171';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Marginal';
  return 'Pass';
}
