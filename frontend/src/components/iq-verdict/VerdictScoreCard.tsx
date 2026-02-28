'use client'

/**
 * VerdictScoreCard — Pure rendering component for the VerdictIQ score section.
 *
 * Displays:
 *  - "THE VERDICT" label
 *  - SVG arc gauge with numeric score
 *  - Verdict badge pill (Strong Opportunity, Good Opportunity, etc.)
 *  - Verdict description text
 *  - "How Verdict Score Works" link
 *  - Score Components — four labeled bars with qualitative labels
 *
 * This component has ZERO knowledge of API formats or data extraction.
 * It receives clean, typed props and renders them.
 */

import React from 'react'
import { colors } from './verdict-design-tokens'
import type { DealFactor } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerdictScoreCardProps {
  /** Overall deal score, 0–100 */
  score: number
  /** Human-readable verdict label, e.g. "Strong Opportunity" */
  verdictLabel: string
  /** Verdict explanation — plain string or structured JSX */
  description: React.ReactNode
  /** Deal Gap as a percentage of list price (0 = no gap, 15 = needs 15% discount) */
  dealGapPercent?: number
  /** Investor discount bracket context from backend */
  discountBracketLabel?: string
  /** Plain-language deal factor narratives from backend */
  dealFactors?: DealFactor[]
  /** Callback when "How Verdict Score Works" is clicked */
  onHowItWorks?: () => void
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

/** Deal Gap color based on gap severity — small gap = good (teal), large gap = bad (red). */
function dealGapColor(gapPct: number): string {
  if (gapPct <= 0)  return colors.status.positive
  if (gapPct <= 5)  return colors.brand.teal
  if (gapPct <= 15) return '#38bdf8'
  if (gapPct <= 25) return colors.brand.gold
  if (gapPct <= 35) return '#f97316'
  return colors.status.negative
}

/** Factor icon + color based on type. */
function factorStyle(type: DealFactor['type']): { color: string; icon: React.ReactNode } {
  if (type === 'positive') return {
    color: colors.brand.teal,
    icon: <svg width="14" height="14" fill="none" stroke={colors.brand.teal} viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  }
  if (type === 'warning') return {
    color: '#f97316',
    icon: <svg width="14" height="14" fill="none" stroke="#f97316" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
  }
  return {
    color: '#38bdf8',
    icon: <svg width="14" height="14" fill="none" stroke="#38bdf8" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  }
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
  const isPositive = label.includes('Achievable') || label.includes('Negotiable')

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

// ─── Deal Gap Callout ─────────────────────────────────────────────────────────

export function DealGapCallout({ gapPercent, bracketLabel }: { gapPercent?: number; bracketLabel?: string }) {
  const gap = gapPercent ?? 0
  const clr = dealGapColor(gap)
  const sign = gap <= 0 ? '+' : '-'
  const display = `${sign}${Math.abs(gap).toFixed(1)}%`

  return (
    <div className="mt-3 text-left">
      <p
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: colors.text.secondary }}
      >
        Deal Gap
      </p>
      <div className="flex items-baseline gap-3">
        <span
          className="text-[2rem] font-bold tabular-nums"
          style={{ color: clr, lineHeight: 1 }}
        >
          {display}
        </span>
        <span
          className="text-xs font-medium"
          style={{ color: gap <= 0 ? colors.brand.teal : colors.text.secondary }}
        >
          {gap <= 0 ? 'Profitable at asking price' : 'discount needed'}
        </span>
      </div>
      {bracketLabel && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: colors.text.body }}>
          {bracketLabel}
        </p>
      )}
    </div>
  )
}

// ─── Deal Factors List ────────────────────────────────────────────────────────

export function DealFactorsList({ factors }: { factors?: DealFactor[] }) {
  if (!factors || factors.length === 0) return null

  return (
    <div className="mt-5 text-left">
      <p
        className="text-[10px] font-bold uppercase tracking-wider mb-1"
        style={{ color: colors.text.secondary }}
      >
        Key Deal Factors to Close the Gap
      </p>
      <p className="text-[0.8rem] mb-3" style={{ color: colors.text.secondary }}>
        Address these when planning your offer or outreach.
      </p>
      <div className="space-y-2.5">
        {factors.map((f, i) => {
          const { color, icon } = factorStyle(f.type)
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <span className="text-[0.82rem] leading-relaxed" style={{ color }}>{f.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AI Deal Narrative ────────────────────────────────────────────────────────

export interface VerdictNarrativeProps {
  /** AI-generated deal narrative from the backend */
  narrative?: string | null
  /** Callback to open methodology sheet */
  onHowItWorks?: () => void
}

export function VerdictNarrative({ narrative, onHowItWorks }: VerdictNarrativeProps) {
  if (!narrative) return null

  return (
    <section className="px-5 pt-4 pb-5 border-t" style={{ borderColor: colors.ui.border }}>
      <h2
        className="text-center text-[1.1rem] font-bold leading-snug mb-4"
        style={{ color: colors.text.primary }}
      >
        Worth Your Time? Here&apos;s What It Takes.
      </h2>

      <div
        className="rounded-[10px] px-5 py-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(14,165,233,0.15)',
          boxShadow: '0 0 30px rgba(14,165,233,0.04)',
        }}
      >
        <p
          className="text-[0.9rem] leading-[1.65] text-center"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          {narrative}
        </p>
      </div>

      {onHowItWorks && (
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={onHowItWorks}
            className="text-xs font-medium"
            style={{ color: colors.brand.teal }}
          >
            See score methodology
          </button>
        </div>
      )}
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VerdictScoreCard({
  score,
  verdictLabel,
}: Pick<VerdictScoreCardProps, 'score' | 'verdictLabel'>) {
  const color = scoreColor(score)

  return (
    <section className="px-5 pt-10 pb-3">
      <p
        className="text-center text-[11px] font-bold uppercase tracking-[2.5px] mb-6"
        style={{ color: colors.text.secondary }}
      >
        The Verdict
      </p>

      <div className="flex items-center justify-center gap-5 mb-5">
        <ScoreGauge score={score} color={color} />
        <VerdictBadge label={verdictLabel} color={color} />
      </div>
    </section>
  )
}

export default VerdictScoreCard
