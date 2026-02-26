// ============================================
// VERDICT LOGIC - Deal Score Assessment
// DealGapIQ Design System - Uses Teal for positive scores
// ============================================

export type VerdictType = 'STRONG' | 'GOOD' | 'CONSIDER' | 'WEAK' | 'POOR'

export interface VerdictConfig {
  label: VerdictType
  minScore: number
  lightTextClass: string
  darkTextClass: string
  lightBgClass: string
  darkBgClass: string
}

// DealGapIQ uses Teal (#0EA5E9) for positive values, not green
const VERDICT_CONFIGS: VerdictConfig[] = [
  {
    label: 'STRONG',
    minScore: 75,
    lightTextClass: 'text-teal-600',
    darkTextClass: 'dark:text-teal-400',
    lightBgClass: 'bg-teal-600/10 border-teal-600/20',
    darkBgClass: 'dark:bg-teal-400/15 dark:border-teal-400/40',
  },
  {
    label: 'GOOD',
    minScore: 55,
    lightTextClass: 'text-teal-600',
    darkTextClass: 'dark:text-teal-400',
    lightBgClass: 'bg-teal-600/10 border-teal-600/20',
    darkBgClass: 'dark:bg-teal-400/15 dark:border-teal-400/40',
  },
  {
    label: 'CONSIDER',
    minScore: 40,
    lightTextClass: 'text-surface-600',
    darkTextClass: 'dark:text-white',
    lightBgClass: 'bg-surface-50 border-surface-200',
    darkBgClass: 'dark:bg-surface-800 dark:border-surface-700',
  },
  {
    label: 'WEAK',
    minScore: 25,
    lightTextClass: 'text-amber-600',
    darkTextClass: 'dark:text-amber-400',
    lightBgClass: 'bg-amber-500/10 border-amber-500/20',
    darkBgClass: 'dark:bg-amber-400/15 dark:border-amber-400/40',
  },
  {
    label: 'POOR',
    minScore: 0,
    lightTextClass: 'text-red-600',
    darkTextClass: 'dark:text-red-400',
    lightBgClass: 'bg-red-500/10 border-red-500/20',
    darkBgClass: 'dark:bg-red-400/15 dark:border-red-400/40',
  },
]

export function getVerdict(score: number): VerdictType {
  if (score >= 75) return 'STRONG'
  if (score >= 55) return 'GOOD'
  if (score >= 40) return 'CONSIDER'
  if (score >= 25) return 'WEAK'
  return 'POOR'
}

export function getVerdictConfig(score: number): VerdictConfig {
  const config = VERDICT_CONFIGS.find((c) => score >= c.minScore)
  return config || VERDICT_CONFIGS[VERDICT_CONFIGS.length - 1]
}

export function getScoreTextClass(score: number): string {
  const config = getVerdictConfig(score)
  return `${config.lightTextClass} ${config.darkTextClass}`
}

export function getScoreBgClass(score: number): string {
  const config = getVerdictConfig(score)
  return `${config.lightBgClass} ${config.darkBgClass}`
}
