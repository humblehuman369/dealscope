'use client'

/**
 * VerdictScoreCard — Pure rendering component for the VerdictIQ score section.
 *
 * Displays:
 *  - "THE VERDICT" label
 *  - SVG arc gauge with numeric score
 *  - Verdict badge pill (Strong Deal, Good Deal, etc.)
 *  - Verdict description text
 *  - "How Verdict Score Works" link
 *  - Score Components — four labeled bars with qualitative labels
 *
 * This component has ZERO knowledge of API formats or data extraction.
 * It receives clean, typed props and renders them.
 */

import React from 'react'
import { colors } from './verdict-design-tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerdictScoreCardProps {
  /** Overall deal score, 0–100 */
  score: number
  /** Human-readable verdict label, e.g. "Strong Deal" */
  verdictLabel: string
  /** One-liner explaining the verdict */
  description: string
  /** Four component scores, each 0–90 */
  componentScores: {
    dealGap: number
    returnQuality: number
    marketAlignment: number
    dealProbability: number
  }
  /** Callback when "How Verdict Score Works" is clicked */
  onHowItWorks?: () => void
  /** When true, do not render Score Components (e.g. when shown later on page) */
  hideScoreComponents?: boolean
}

// ─── Helpers (pure, no side-effects) ──────────────────────────────────────────

/** Map overall score (0–100) to a colour from the design tokens. */
function scoreColor(score: number): string {
  if (score >= 80) return colors.status.positive   // green
  if (score >= 65) return colors.brand.teal         // teal
  if (score >= 50) return colors.brand.gold         // gold
  if (score >= 30) return '#f97316'                 // orange
  return colors.status.negative                     // red
}

/** Map a component score (0–90) to a qualitative label. */
function componentLabel(value: number): string {
  if (value >= 75) return 'Excellent'
  if (value >= 55) return 'Strong'
  if (value >= 40) return 'Good'
  if (value >= 20) return 'Fair'
  return 'Weak'
}

/** Map a component score (0–90) to a colour. */
function componentColor(value: number): string {
  if (value >= 75) return colors.brand.teal
  if (value >= 55) return '#38bdf8'
  if (value >= 40) return colors.brand.gold
  if (value >= 20) return '#f97316'
  return colors.status.negative
}

// ─── SVG Arc Gauge ────────────────────────────────────────────────────────────

const R = 52           // radius
const ARC_DEG = 240    // degrees of the arc
const FULL_C = 2 * Math.PI * R
const ARC_LEN = FULL_C * (ARC_DEG / 360)
const GAP_LEN = FULL_C * ((360 - ARC_DEG) / 360)

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const filled = ARC_LEN * (score / 100)
  const empty = FULL_C - filled

  return (
    <div className="relative flex-shrink-0 w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[150deg]">
        {/* Background track */}
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${filled} ${empty}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      {/* Centered number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[2.8rem] font-bold tabular-nums"
          style={{ color, lineHeight: 1 }}
        >
          {score}
        </span>
        <span
          className="text-xs font-medium mt-0.5"
          style={{ color: colors.text.secondary }}
        >
          /100
        </span>
      </div>
    </div>
  )
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────

function VerdictBadge({ label, color }: { label: string; color: string }) {
  const isPositive = label.includes('Strong') || label.includes('Good')

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
      style={{ border: `1px solid ${color}40`, background: `${color}15` }}
    >
      {isPositive ? (
        <svg width="14" height="14" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      )}
      <span className="text-[0.82rem] font-bold" style={{ color }}>{label}</span>
    </div>
  )
}

// ─── Component Score Bars ─────────────────────────────────────────────────────

const COMPONENTS: { key: keyof VerdictScoreCardProps['componentScores']; label: string }[] = [
  { key: 'dealGap', label: 'Deal Gap' },
  { key: 'returnQuality', label: 'Return Quality' },
  { key: 'marketAlignment', label: 'Market Alignment' },
  { key: 'dealProbability', label: 'Deal Probability' },
]

export function ComponentScoreBars({ scores }: { scores: VerdictScoreCardProps['componentScores'] }) {
  return (
    <div className="mt-3 text-left max-w-sm mx-auto">
      <p
        className="text-[10px] font-bold uppercase tracking-wider mb-3"
        style={{ color: colors.text.secondary }}
      >
        Score Components
      </p>

      {COMPONENTS.map(({ key, label }) => {
        const value = scores[key]
        const clr = componentColor(value)
        const lbl = componentLabel(value)
        // Map 0–90 to 0–100% bar width
        const barPct = Math.min(100, (value / 90) * 100)

        return (
          <div key={key} className="flex items-center gap-2.5 mb-2.5">
            <span
              className="text-xs font-medium w-28 shrink-0"
              style={{ color: colors.text.body }}
            >
              {label}
            </span>
            <div
              className="flex-1 h-1.5 rounded"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="h-full rounded transition-all"
                style={{ width: `${barPct}%`, background: clr }}
              />
            </div>
            <span
              className="text-xs font-bold w-16 text-right"
              style={{ color: clr }}
            >
              {lbl}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VerdictScoreCard({
  score,
  verdictLabel,
  description,
  componentScores,
  onHowItWorks,
  hideScoreComponents = false,
}: VerdictScoreCardProps) {
  const color = scoreColor(score)

  return (
    <section
      className="px-5 pt-10 pb-3"
    >
      {/* Section label */}
      <p
        className="text-center text-[11px] font-bold uppercase tracking-[2.5px] mb-6"
        style={{ color: colors.text.secondary }}
      >
        The Verdict
      </p>

      {/* Score gauge + verdict badge row */}
      <div className="flex items-center justify-center gap-5 mb-5">
        <ScoreGauge score={score} color={color} />
        <VerdictBadge label={verdictLabel} color={color} />
      </div>

      {/* Verdict description */}
      <p
        className="text-sm leading-relaxed text-center max-w-xs mx-auto mb-4"
        style={{ color: colors.text.body }}
      >
        {description || 'Calculating deal metrics...'}
      </p>

      {/* How it works link */}
      {onHowItWorks && (
        <div className="flex justify-center mt-2">
          <button
            onClick={onHowItWorks}
            className="text-[0.82rem] font-medium"
            style={{ color: colors.brand.teal }}
          >
            How Verdict Score Works
          </button>
        </div>
      )}

      {/* Component score bars — optional for page flow reorder */}
      {!hideScoreComponents && <ComponentScoreBars scores={componentScores} />}
    </section>
  )
}

export default VerdictScoreCard
