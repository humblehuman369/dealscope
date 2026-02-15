/**
 * Scoring Constants — Single Source of Truth
 *
 * Grade thresholds, score boundaries, and benchmark definitions
 * used for deal scoring and investment grading across both platforms.
 */

// =============================================================================
// SCORE THRESHOLDS
// =============================================================================

/**
 * Score tier boundaries (out of 100).
 */
export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 70,
  fair: 60,
  belowAverage: 50,
  poor: 40,
} as const;

/**
 * Score-to-grade mapping with labels and colors.
 */
export const SCORE_GRADES = {
  A: { min: 80, label: 'Excellent Investment', color: '#22c55e' },
  'B+': { min: 70, label: 'Strong Investment', color: '#22c55e' },
  B: { min: 60, label: 'Good Investment', color: '#84cc16' },
  'C+': { min: 50, label: 'Fair Investment', color: '#f97316' },
  C: { min: 40, label: 'Below Average', color: '#f97316' },
  D: { min: 0, label: 'Poor Investment', color: '#ef4444' },
} as const;

export type ScoreGradeKey = keyof typeof SCORE_GRADES;

// =============================================================================
// INVESTMENT BENCHMARKS
// =============================================================================

/**
 * Target metrics for evaluating investment quality.
 * Each metric has target (minimum acceptable) and excellent thresholds.
 */
export const BENCHMARKS = {
  cashOnCash: { target: 8, good: 10, excellent: 12, unit: '%' },
  capRate: { target: 5, good: 7, excellent: 10, unit: '%' },
  dscr: { target: 1.2, good: 1.3, excellent: 1.5, unit: 'x' },
  monthlyCashFlow: { target: 100, good: 200, excellent: 400, unit: '$/mo' },
  onePercentRule: { target: 0.8, good: 1.0, excellent: 1.2, unit: '%' },
  grm: { target: 15, good: 12, excellent: 8, unit: 'x' },
} as const;

/**
 * Score color tiers matching the VerdictIQ design system.
 * Used to color-code scores and grades across both platforms.
 */
export const SCORE_COLORS = {
  /** 80-100: Green — Strong/Good */
  positive: '#34d399',
  /** 60-79: Gold — Moderate */
  moderate: '#fbbf24',
  /** 40-59: Blue — Marginal */
  marginal: '#38bdf8',
  /** 0-39: Red — Unlikely/Pass */
  negative: '#f87171',
} as const;

/**
 * Get score color based on value (0-100).
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.positive;
  if (score >= 60) return SCORE_COLORS.moderate;
  if (score >= 40) return SCORE_COLORS.marginal;
  return SCORE_COLORS.negative;
}
