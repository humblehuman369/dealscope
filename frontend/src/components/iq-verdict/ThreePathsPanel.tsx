'use client'

import type { ReactNode } from 'react'

export type StructureFamily =
  | 'price'
  | 'capital_stack'
  | 'financing'
  | 'income'
  | 'strategy_switch'

export interface DealStructureLever {
  label: string
  beforeLabel: string
  afterLabel: string
  deltaLabel?: string | null
}

export interface DealStructure {
  id: string
  family: StructureFamily
  familyLabel: string
  realismLabel: string
  headline: string
  summary: string
  levers: DealStructureLever[]
  monthlySavings: number
  cashRequired: number
  rankingScore: number
  pitchScript?: string | null
  caveat?: string | null
  selectionReason?: string | null
  preLoadedRecord?: Record<string, unknown> | null
}

export interface DealStructuresPayload {
  paths: DealStructure[]
  narrativeParagraphs: string[]
  hasPaths: boolean
}

interface ThreePathsPanelProps {
  payload: DealStructuresPayload
  onOpenInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
}

const FAMILY_ACCENT: Record<StructureFamily, string> = {
  price: '#84cc16',
  capital_stack: '#22c55e',
  financing: 'var(--accent-sky)',
  income: '#a78bfa',
  strategy_switch: '#f97316',
}

function PathCard({
  structure,
  index,
  onOpenInStrategy,
  onShowPitch,
}: {
  structure: DealStructure
  index: number
  onOpenInStrategy?: (s: DealStructure, i: number) => void
  onShowPitch?: (s: DealStructure) => void
}) {
  const accent = FAMILY_ACCENT[structure.family] || 'var(--accent-sky)'
  return (
    <div
      role="article"
      aria-label={`Path ${index + 1}: ${structure.headline}`}
      className="rounded-xl"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          Path {index + 1}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          · {structure.familyLabel}
        </span>
        <span
          className="ml-auto"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {structure.realismLabel}
        </span>
      </div>

      <h4
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.35,
          color: 'var(--text-heading)',
        }}
      >
        {structure.headline}
      </h4>

      {structure.selectionReason && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          {structure.selectionReason}
        </p>
      )}

      {structure.levers.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingTop: 8,
            paddingBottom: 8,
            borderTop: '1px solid var(--border-subtle, var(--border-default))',
            borderBottom: '1px solid var(--border-subtle, var(--border-default))',
          }}
        >
          {structure.levers.map((lever, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2"
              style={{ fontSize: 13, lineHeight: 1.45 }}
            >
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{lever.label}</span>
              <span className="tabular-nums" style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{lever.beforeLabel}</span>
                {' → '}
                <span style={{ color: 'var(--text-heading)' }}>{lever.afterLabel}</span>
                {lever.deltaLabel && (
                  <span style={{ marginLeft: 6, color: accent, fontWeight: 700 }}>
                    {lever.deltaLabel}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--text-body)',
        }}
      >
        {structure.summary}
      </p>

      {structure.caveat && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {structure.caveat}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 2 }}>
        {onOpenInStrategy && (
          <button
            type="button"
            onClick={() => onOpenInStrategy(structure, index)}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
            }}
          >
            Open in Strategy
          </button>
        )}
        {structure.pitchScript && onShowPitch && (
          <button
            type="button"
            onClick={() => onShowPitch(structure)}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--accent-sky)',
              border: '1px solid var(--accent-sky)',
            }}
          >
            How to pitch this
          </button>
        )}
      </div>
    </div>
  )
}

export function ThreePathsPanel({
  payload,
  onOpenInStrategy,
  onShowPitch,
}: ThreePathsPanelProps): ReactNode {
  if (!payload.hasPaths || payload.paths.length === 0) {
    return null
  }

  return (
    <div
      style={{
        marginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--text-heading)',
        }}
      >
        Three paths to make this work
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
        }}
      >
        {payload.paths.map((path, idx) => (
          <PathCard
            key={path.id}
            structure={path}
            index={idx}
            onOpenInStrategy={onOpenInStrategy}
            onShowPitch={onShowPitch}
          />
        ))}
      </div>
    </div>
  )
}
