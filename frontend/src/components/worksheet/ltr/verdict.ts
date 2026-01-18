// ============================================
// VERDICT LOGIC - Deal Score Assessment
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

const VERDICT_CONFIGS: VerdictConfig[] = [
  {
    label: 'STRONG',
    minScore: 75,
    lightTextClass: 'text-emerald-600',
    darkTextClass: 'dark:text-emerald-400',
    lightBgClass: 'bg-emerald-50 border-emerald-200',
    darkBgClass: 'dark:bg-emerald-500/15 dark:border-emerald-500/40',
  },
  {
    label: 'GOOD',
    minScore: 55,
    lightTextClass: 'text-green-600',
    darkTextClass: 'dark:text-green-400',
    lightBgClass: 'bg-green-50 border-green-200',
    darkBgClass: 'dark:bg-green-500/15 dark:border-green-500/40',
  },
  {
    label: 'CONSIDER',
    minScore: 40,
    lightTextClass: 'text-slate-600',
    darkTextClass: 'dark:text-white',
    lightBgClass: 'bg-slate-50 border-slate-200',
    darkBgClass: 'dark:bg-white/8 dark:border-white/25',
  },
  {
    label: 'WEAK',
    minScore: 25,
    lightTextClass: 'text-orange-500',
    darkTextClass: 'text-orange-500',
    lightBgClass: 'bg-orange-50 border-orange-200',
    darkBgClass: 'dark:bg-orange-500/15 dark:border-orange-500/40',
  },
  {
    label: 'POOR',
    minScore: 0,
    lightTextClass: 'text-red-500',
    darkTextClass: 'text-red-500',
    lightBgClass: 'bg-red-50 border-red-200',
    darkBgClass: 'dark:bg-red-500/15 dark:border-red-500/40',
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
