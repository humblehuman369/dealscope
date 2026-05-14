'use client'

import { useSavedPropertyStats } from '@/hooks/useSavedProperties'
import { PIPELINE_STAGES, STATUS_CONFIG } from '@/lib/savedPropertyStatus'
import type { PropertyStatus } from '@/types/savedProperty'

interface PipelineStatsProps {
  activeStage: PropertyStatus | null
  onSelectStage: (stage: PropertyStatus | null) => void
}

export function PipelineStats({ activeStage, onSelectStage }: PipelineStatsProps) {
  const stats = useSavedPropertyStats()
  const counts = stats.data?.by_status ?? {}

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {PIPELINE_STAGES.map((stage) => {
        const config = STATUS_CONFIG[stage]
        const count = counts[stage] || 0
        const isActive = activeStage === stage

        return (
          <button
            key={stage}
            onClick={() => onSelectStage(isActive ? null : stage)}
            className={`text-left rounded-3xl p-4 border transition-all hover:border-[var(--border-strong)] ${
              isActive
                ? 'border-[var(--border-focus)] bg-[var(--surface-elevated)]'
                : 'border-[var(--border-default)] bg-[var(--surface-card)]'
            }`}
            style={isActive ? { boxShadow: 'var(--shadow-card)' } : undefined}
            aria-pressed={isActive}
          >
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tabular-nums ${config.color}`}>{count}</span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-label)]">
              {config.label}
            </p>
          </button>
        )
      })}
    </div>
  )
}
