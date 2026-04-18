'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react'
import type { ConsensusResult, UnderwritingMode, DivergenceLevel, ConfidenceTier } from '@/utils/marketConsensus'
import type { SourceMarker } from '@/utils/marketConsensus'
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters'

// ============================================
// CONSTANTS
// ============================================

const DIVERGENCE_CONFIG: Record<DivergenceLevel, { label: string; color: string; bg: string }> = {
  low: { label: 'Low Divergence', color: '#10B981', bg: '#10B98118' },
  medium: { label: 'Moderate Divergence', color: '#F59E0B', bg: '#F59E0B18' },
  high: { label: 'High Divergence', color: '#EF4444', bg: '#EF444418' },
}

const CONFIDENCE_CONFIG: Record<ConfidenceTier, { label: string; color: string }> = {
  strong: { label: 'Strong', color: '#10B981' },
  moderate: { label: 'Moderate', color: '#F59E0B' },
  weak: { label: 'Weak', color: '#EF4444' },
}

const MODE_CONFIG: Record<UnderwritingMode, { label: string; description: string }> = {
  conservative: { label: 'Conservative', description: 'Lower quartile — underwrite below most estimates' },
  balanced: { label: 'Balanced', description: 'Median consensus — center of available data' },
  upside: { label: 'Upside', description: 'Upper quartile — optimistic case with guardrails' },
}

// ============================================
// SUB-COMPONENTS
// ============================================

function RangeBar({ consensus }: { consensus: ConsensusResult }) {
  const { markers, min, max } = consensus
  if (markers.length === 0 || max === min) return null

  const range = max - min
  const pad = range * 0.08
  const scaleMin = min - pad
  const scaleMax = max + pad
  const scaleRange = scaleMax - scaleMin

  const pct = (v: number) => ((v - scaleMin) / scaleRange) * 100

  return (
    <div className="relative w-full h-12 mt-2 mb-1">
      {/* Track */}
      <div
        className="absolute top-5 left-0 right-0 h-[3px] rounded-full"
        style={{ background: 'var(--border-default)' }}
      />

      {/* Source Markers */}
      {markers.map((m) => (
        <MarkerDot key={m.id} marker={m} left={pct(m.value)} />
      ))}

      {/* Scale labels */}
      <div className="absolute top-[26px] left-0 text-[12px] tabular-nums" style={{ color: 'var(--text-heading)' }}>
        {formatCompactCurrency(min)}
      </div>
      <div className="absolute top-[26px] right-0 text-[12px] tabular-nums" style={{ color: 'var(--text-heading)' }}>
        {formatCompactCurrency(max)}
      </div>
    </div>
  )
}

function MarkerDot({ marker, left }: { marker: SourceMarker; left: number }) {
  const [hovered, setHovered] = useState(false)
  const isComps = marker.id === 'comps'

  return (
    <div
      className="absolute"
      style={{ left: `${left}%`, top: isComps ? '2px' : '6px', transform: 'translateX(-50%)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-full border-2 transition-transform"
        style={{
          width: isComps ? 14 : 10,
          height: isComps ? 14 : 10,
          backgroundColor: marker.color,
          borderColor: isComps ? '#fff' : marker.color,
          boxShadow: isComps ? '0 0 6px rgba(20,184,166,0.5)' : 'none',
          transform: hovered ? 'scale(1.35)' : 'scale(1)',
        }}
      />
      {hovered && (
        <div
          className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md text-[12px] font-semibold z-20"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-heading)',
          }}
        >
          {marker.label}: {formatCurrency(marker.value)}
        </div>
      )}
    </div>
  )
}

function SourceLegend({ markers }: { markers: SourceMarker[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-1">
      {markers.map((m) => (
        <div key={m.id} className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: m.color }}
            />
            <span className="text-[13px]" style={{ color: m.color }}>
              {m.label}
            </span>
          </div>
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text-body)' }}>
            {formatCompactCurrency(m.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function DivergenceBadge({ divergence, pct }: { divergence: DivergenceLevel; pct: number }) {
  const cfg = DIVERGENCE_CONFIG[divergence]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[14px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {divergence === 'high' && <AlertTriangle className="w-3 h-3" />}
      {cfg.label} ({pct}%)
    </span>
  )
}

function ModeButton({
  mode,
  value,
  isActive,
  onClick,
  isCurrency,
}: {
  mode: UnderwritingMode
  value: number
  isActive: boolean
  onClick: () => void
  isCurrency: boolean
}) {
  const cfg = MODE_CONFIG[mode]
  const modeColors: Record<UnderwritingMode, string> = {
    conservative: '#F59E0B',
    balanced: '#0EA5E9',
    upside: '#10B981',
  }

  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg px-2 py-2 text-center transition-all duration-200"
      style={{
        background: isActive ? `${modeColors[mode]}15` : 'transparent',
        border: `1px solid ${isActive ? modeColors[mode] : 'var(--border-default)'}`,
      }}
      title={cfg.description}
    >
      <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: isActive ? modeColors[mode] : 'var(--text-label)' }}>
        {cfg.label}
      </div>
      <div className="text-[16px] font-bold tabular-nums mt-0.5" style={{ color: isActive ? modeColors[mode] : 'var(--text-body)' }}>
        {isCurrency ? formatCompactCurrency(value) : `${formatCurrency(value)}/mo`}
      </div>
    </button>
  )
}

// ============================================
// RECONCILIATION DETAILS
// ============================================

function ReconciliationDetails({ consensus, mode }: { consensus: ConsensusResult; mode: 'value' | 'rent' }) {
  const cfgConf = CONFIDENCE_CONFIG[consensus.confidenceTier]
  const availableSources = consensus.markers.filter((m) => m.id !== 'comps')
  const unavailableSources = (['iq', 'zillow', 'rentcast', 'redfin', 'realtor'] as const).filter(
    (id) => !consensus.markers.some((m) => m.id === id),
  )

  return (
    <div className="space-y-3 pt-2">
      {/* Confidence and Spread */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-elevated)' }}>
          <div className="text-[12px] uppercase" style={{ color: 'var(--text-heading)' }}>Confidence</div>
          <div className="text-[16px] font-bold" style={{ color: cfgConf.color }}>{cfgConf.label}</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-elevated)' }}>
          <div className="text-[12px] uppercase" style={{ color: 'var(--text-heading)' }}>Sources Used</div>
          <div className="text-[16px] font-bold" style={{ color: 'var(--text-heading)' }}>{consensus.sourceCount}</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-elevated)' }}>
          <div className="text-[12px] uppercase" style={{ color: 'var(--text-heading)' }}>IQR Spread</div>
          <div className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--text-heading)' }}>
            {mode === 'value' ? formatCompactCurrency(consensus.iqr) : `$${consensus.iqr}`}
          </div>
        </div>
      </div>

      {/* Available vs Unavailable Sources */}
      {unavailableSources.length > 0 && (
        <div className="text-[13px]" style={{ color: 'var(--text-heading)' }}>
          <span className="font-semibold">Unavailable:</span>{' '}
          {unavailableSources
            .map((id) => {
              const labels: Record<string, string> = { iq: 'IQ Estimate', zillow: 'Zillow', rentcast: 'RentCast', redfin: 'Redfin', realtor: 'Realtor', mashvisor: 'Mashvisor' }
              return labels[id]
            })
            .join(', ')}
        </div>
      )}

      {/* Comp vs source divergence callout */}
      {consensus.compValue != null && availableSources.length > 0 && (() => {
        const sourceAvg = availableSources.reduce((s, m) => s + m.value, 0) / availableSources.length
        const diff = consensus.compValue! - sourceAvg
        const pct = sourceAvg > 0 ? (diff / sourceAvg) * 100 : 0
        if (Math.abs(pct) < 3) return null
        const direction = diff > 0 ? 'above' : 'below'
        return (
          <div className="flex items-start gap-2 text-[13px] rounded-lg p-2" style={{ background: 'var(--surface-elevated)', color: 'var(--text-body)' }}>
            <TrendingUp className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: diff > 0 ? '#10B981' : '#F59E0B' }} />
            <span>
              Your comps {mode === 'value' ? 'value' : 'rent'} is <strong>{Math.abs(Math.round(pct))}% {direction}</strong> the average of external sources.
              {Math.abs(pct) > 20 && ' Consider reviewing your comp selection or verifying source accuracy.'}
            </span>
          </div>
        )
      })()}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export interface MarketConsensusRailProps {
  consensus: ConsensusResult
  mode: 'value' | 'rent'
  onApplyMode?: (mode: UnderwritingMode, value: number) => void
  activeMode?: UnderwritingMode | null
}

export function MarketConsensusRail({ consensus, mode, onApplyMode, activeMode = null }: MarketConsensusRailProps) {
  const [expanded, setExpanded] = useState(false)
  const isCurrency = mode === 'value'

  const hasData = consensus.markers.length > 0

  if (!hasData) return null

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div className="mb-1">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
          <span className="text-[16px] sm:text-[18px] font-bold text-[var(--text-heading)]">
            Market Consensus
          </span>
        </div>
        <div className="flex justify-end mt-1">
          <DivergenceBadge divergence={consensus.divergence} pct={consensus.divergencePct} />
        </div>
      </div>

      <p className="text-[13px] mb-2" style={{ color: 'var(--text-heading)' }}>
        {mode === 'value' ? 'Property value' : 'Monthly rent'} range across {consensus.sourceCount} data points
      </p>

      {/* Range Visualization */}
      <RangeBar consensus={consensus} />

      {/* Source Legend */}
      <SourceLegend markers={consensus.markers} />

      {/* Underwriting Mode Buttons */}
      {onApplyMode && (
        <div className="flex gap-2 mt-3">
          {(['conservative', 'balanced', 'upside'] as const).map((m) => (
            <ModeButton
              key={m}
              mode={m}
              value={consensus.modes[m]}
              isActive={activeMode === m}
              onClick={() => onApplyMode(m, consensus.modes[m])}
              isCurrency={isCurrency}
            />
          ))}
        </div>
      )}

      {/* Expand / Collapse Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-3 text-[13px] font-medium transition-colors"
        style={{ color: 'var(--accent-sky)' }}
      >
        {expanded ? 'Hide details' : 'Why do values differ?'}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && <ReconciliationDetails consensus={consensus} mode={mode} />}
    </div>
  )
}
