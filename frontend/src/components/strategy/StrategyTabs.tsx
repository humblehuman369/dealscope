'use client'

import { memo } from 'react'

const STRATEGY_DISPLAY = [
  { id: 'long-term-rental', label: 'Long Rental', cssVar: '--strategy-ltr' },
  { id: 'short-term-rental', label: 'Short Rental', cssVar: '--strategy-str' },
  { id: 'brrrr', label: 'BRRRR', cssVar: '--strategy-brrrr' },
  { id: 'fix-and-flip', label: 'Fix & Flip', cssVar: '--strategy-flip' },
  { id: 'house-hack', label: 'House Hack', cssVar: '--strategy-house-hack' },
  { id: 'wholesale', label: 'Wholesale', cssVar: '--strategy-wholesale' },
] as const

interface StrategyTabsProps {
  strategies: Array<{ id: string; score: number; rank: number }>
  activeStrategyId: string
  onStrategyChange: (id: string) => void
}

function StrategyTabsInner({ strategies, activeStrategyId, onStrategyChange }: StrategyTabsProps) {
  const available = STRATEGY_DISPLAY.filter(s =>
    strategies.some(ss => ss.id === s.id),
  )

  return (
    <div className="mb-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
      {available.map((s) => {
        const strategyData = strategies.find(ss => ss.id === s.id)
        const score = strategyData?.score ?? 0
        const isBest = strategyData?.rank === 1
        const isActive = s.id === activeStrategyId
        const color = `var(${s.cssVar})`

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStrategyChange(s.id)}
            className={[
              'relative rounded-xl font-bold transition-all duration-200',
              'min-h-[52px] sm:aspect-square',
              'flex sm:flex-col items-center justify-between sm:justify-center',
              'px-3 sm:px-2 py-2.5 sm:py-0 gap-1.5 sm:gap-1',
              'text-xs sm:text-sm leading-tight',
            ].join(' ')}
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 80%, transparent))`
                : `color-mix(in srgb, ${color} 7%, transparent)`,
              color: isActive ? '#fff' : color,
              border: `1.5px solid ${isActive ? color : `color-mix(in srgb, ${color} 38%, transparent)`}`,
              boxShadow: isActive
                ? `0 0 16px color-mix(in srgb, ${color} 27%, transparent), 0 2px 8px rgba(0,0,0,0.3)`
                : '0 1px 4px rgba(0,0,0,0.15)',
              transform: isActive ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            {isBest && (
              <span
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full"
                style={{
                  background: color,
                  color: '#fff',
                }}
              >
                Best
              </span>
            )}

            <span className="text-left sm:text-center sm:whitespace-pre-line">
              {s.label}
            </span>

            <span
              className="text-[11px] sm:text-xs font-semibold tabular-nums opacity-80 shrink-0"
              style={{ color: isActive ? 'rgba(255,255,255,0.85)' : color }}
            >
              {Math.round(score)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export const StrategyTabs = memo(StrategyTabsInner)
