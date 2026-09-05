'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { FAMILY_ACCENT, type DealStructure } from '@/components/iq-verdict/PathOptionCard'
import type { PlanNarrative } from '@/lib/api/plans'
import {
  WAY_NAMES,
  describeBreakevenChange,
  describeBreakevenResult,
  formatMonthlySavings,
  isBreakevenFamily,
  isFourWayFamily,
} from '@/components/iq-verdict/make-it-work/fourWays'
import type { PlanNumbers } from '@/components/iq-verdict/make-it-work/useMakeItWork'

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Unavailable'
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function nameFor(structure: DealStructure): string {
  return isFourWayFamily(structure.family) ? WAY_NAMES[structure.family] : structure.familyLabel
}

/** "Cut price 33.0% ($152,000) → Target Buy $307,000" from the engine's structured fact. */
function breakevenLine(structure: DealStructure): string | null {
  const fact = structure.breakeven
  if (!fact || !isBreakevenFamily(structure.family)) return null
  const result = describeBreakevenResult(fact)
  const change = describeBreakevenChange(structure.family, fact)
  return result ? `${change} → ${result.label} ${result.amount}` : change
}

function BigNumber({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="flex flex-1 flex-col gap-1 rounded-xl"
      style={{
        padding: '12px 14px',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle, var(--border-default))',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-label)',
        }}
      >
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: accent ?? 'var(--text-heading)' }}
      >
        {value}
      </span>
    </div>
  )
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      className="block animate-pulse rounded"
      style={{ height: 12, width, background: 'var(--surface-elevated)' }}
    />
  )
}

export interface PlanResultProps {
  structure: DealStructure | null
  alternatives: readonly DealStructure[]
  numbers: PlanNumbers
  narrative: PlanNarrative | null
  narrativeLoading: boolean
  onSelectAlternative: (structure: DealStructure) => void
  onOpenInStrategy?: (structure: DealStructure) => void
  /** Save controls rendered under the plan (SavePlanForm). */
  children: ReactNode
}

/**
 * "Your plan" — one recommendation, the before/after that makes it work,
 * two numbers that matter, and the save hook. Alternates are one tap away.
 */
export function PlanResult({
  structure,
  alternatives,
  numbers,
  narrative,
  narrativeLoading,
  onSelectAlternative,
  onOpenInStrategy,
  children,
}: PlanResultProps): ReactNode {
  const [pitchOpen, setPitchOpen] = useState(false)
  const accent = structure ? FAMILY_ACCENT[structure.family] : 'var(--status-positive)'
  const otherPaths = structure ? alternatives.filter((p) => p.id !== structure.id) : []
  const pitch = narrative?.pitch || structure?.pitchScript || ''
  const factLine = structure ? breakevenLine(structure) : null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          Your plan
        </p>
        <h3
          style={{
            margin: '6px 0 0',
            fontSize: 'clamp(20px, 2.6vw, 24px)',
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--text-heading)',
          }}
        >
          {structure ? nameFor(structure) : 'This deal works at asking'}
        </h3>
        {factLine && (
          <p
            className="tabular-nums"
            style={{ margin: '4px 0 0', fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}
          >
            {factLine}
          </p>
        )}
        <div style={{ marginTop: 8, minHeight: 36 }}>
          {structure && narrativeLoading && !narrative ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Writing your summary">
              <SkeletonLine width="92%" />
              <SkeletonLine width="70%" />
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-body)' }}>
              {structure
                ? narrative?.summary ?? structure.summary
                : 'At the modeled rent and expenses this property already clears your cash-flow target at the asking price. Save it so the numbers are waiting when you make the offer.'}
            </p>
          )}
          {structure && narrative?.source === 'ai' && (
            <span
              className="mt-1 inline-flex items-center gap-1"
              style={{ fontSize: 11, color: 'var(--text-secondary)' }}
            >
              <Sparkles size={11} aria-hidden="true" /> Written from your numbers
            </span>
          )}
        </div>
      </div>

      {structure && structure.levers.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle, var(--border-default))' }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
            <caption className="sr-only">What changes to make this work</caption>
            <tbody>
              {structure.levers.slice(0, 3).map((lever, idx) => (
                <tr
                  key={`${lever.label}-${idx}`}
                  style={{
                    borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle, var(--border-default))',
                  }}
                >
                  <th
                    scope="row"
                    className="text-left"
                    style={{
                      padding: '10px 12px',
                      fontWeight: 600,
                      color: 'var(--text-body)',
                      width: '38%',
                    }}
                  >
                    {lever.label}
                  </th>
                  <td className="tabular-nums" style={{ padding: '10px 12px', color: 'var(--text-heading)' }}>
                    {lever.beforeLabel && lever.beforeLabel !== '—' ? (
                      <>
                        <span style={{ color: 'var(--text-secondary)' }}>{lever.beforeLabel}</span>{' '}
                        <span aria-hidden="true" style={{ color: accent, fontWeight: 800 }}>
                          →
                        </span>{' '}
                      </>
                    ) : null}
                    <span style={{ fontWeight: 700 }}>{lever.afterLabel}</span>
                    {lever.deltaLabel ? (
                      <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        {lever.deltaLabel}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3">
        {structure ? (
          <>
            <BigNumber
              label="Monthly"
              value={formatMonthlySavings(structure.monthlySavings)?.replace('Saves ', '+') ?? '—'}
              accent="var(--status-positive)"
            />
            <BigNumber label="Cash to close" value={`~${money(structure.cashRequired)}`} />
          </>
        ) : (
          <>
            <BigNumber label="Asking" value={money(numbers.listPrice)} />
            <BigNumber label="Target Buy" value={money(numbers.targetBuyPrice)} accent="var(--status-positive)" />
          </>
        )}
      </div>

      {otherPaths.length > 0 && (
        <div className="flex flex-col gap-2">
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Prefer a different angle?</span>
          <div className="flex flex-wrap gap-2">
            {otherPaths.map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => onSelectAlternative(alt)}
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors"
                style={{
                  background: 'transparent',
                  border: `1px solid color-mix(in srgb, ${FAMILY_ACCENT[alt.family]} 55%, transparent)`,
                  color: 'var(--text-heading)',
                }}
              >
                {nameFor(alt)}
                {formatMonthlySavings(alt.monthlySavings) ? (
                  <span className="tabular-nums" style={{ marginLeft: 6, color: 'var(--text-secondary)' }}>
                    {formatMonthlySavings(alt.monthlySavings)?.replace('Saves ', '+')}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-xl"
        style={{
          padding: '16px',
          background: 'var(--surface-card)',
          border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
        }}
      >
        {children}
      </div>

      {structure && pitch && (
        <div>
          <button
            type="button"
            onClick={() => setPitchOpen((v) => !v)}
            aria-expanded={pitchOpen}
            className="text-[13px] font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
          >
            {pitchOpen ? 'Hide the seller pitch' : 'Your opening pitch to the seller'}
          </button>
          {pitchOpen && (
            <pre
              className="mt-2 whitespace-pre-wrap rounded-xl"
              style={{
                margin: 0,
                padding: '14px 16px',
                fontFamily: 'inherit',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-body)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle, var(--border-default))',
              }}
            >
              {pitch}
            </pre>
          )}
        </div>
      )}

      {structure && onOpenInStrategy && (
        <button
          type="button"
          onClick={() => onOpenInStrategy(structure)}
          className="self-start text-[13px] font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: 0 }}
        >
          Open this plan in the Strategy workbench →
        </button>
      )}
    </div>
  )
}
