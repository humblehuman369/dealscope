'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { trackEvent } from '@/lib/eventTracking'
import { newMetaEventId } from '@/lib/metaPixel'
import {
  NUMBER_LABELS,
  SOURCE_STATUS_WHY,
  VERDICT_TIPS,
  VERDICT_TIPS_FOOTER,
  VERDICT_WHY,
  formatCallWhy,
  formatMoneyExact,
  formatVerdictSentence,
} from '@/lib/verdictCopy'
import {
  formatSourceStatusLine,
  type SourceStatusSummary,
} from '@/lib/sourceStatus'
import {
  VERDICT_CALL_LABELS,
  type VerdictCall,
} from '@/lib/verdictRules'
import { useDiscoveryTipsSeen } from '@/hooks/useDiscoveryTipsSeen'

export interface VerdictCardProps {
  listPrice: number
  incomeValue: number
  targetBuy: number
  /** Signed display percent, e.g. -27.5 when list is above Target Buy. */
  dealGapDisplayPct: number
  sentence: string
  call: VerdictCall
  callFired: readonly string[]
  propertyId?: string | null
  propertyState?: string | null
  gap: number
  signals: number
  closes: boolean
  isAuthenticated: boolean
  onShowMath: () => void
  onBuildPlan: () => void
  gapSlider?: ReactNode
  sourceStatus?: SourceStatusSummary
}

const CALL_ICON = {
  worth_pursuing: Check,
  only_with_terms: AlertTriangle,
  walk_away: X,
} as const

const CALL_TONE = {
  worth_pursuing: {
    color: 'var(--status-positive)',
    background: 'rgba(52, 211, 153, 0.12)',
  },
  only_with_terms: {
    color: 'var(--status-warning)',
    background: 'rgba(251, 191, 36, 0.12)',
  },
  walk_away: {
    color: 'var(--status-negative)',
    background: 'rgba(248, 113, 113, 0.12)',
  },
} as const

function viewedSessionKey(propertyId: string | null | undefined, sentence: string): string {
  return `dgiq_verdict_viewed_v1:${propertyId || sentence}`
}

export function VerdictCard({
  listPrice,
  incomeValue,
  targetBuy,
  dealGapDisplayPct,
  sentence,
  call,
  callFired,
  propertyId,
  propertyState,
  gap,
  signals,
  closes,
  isAuthenticated,
  onShowMath,
  onBuildPlan,
  gapSlider,
  sourceStatus,
}: VerdictCardProps) {
  const whyVerdictId = useId()
  const whyCallId = useId()
  const whySourcesId = useId()
  const [whyVerdict, setWhyVerdict] = useState(false)
  const [whyCall, setWhyCall] = useState(false)
  const [whySources, setWhySources] = useState(false)
  const { showTips, dismissTips } = useDiscoveryTipsSeen(isAuthenticated)
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const key = viewedSessionKey(propertyId, sentence)
    try {
      if (sessionStorage.getItem(key)) return
    } catch {
      /* continue */
    }
    firedRef.current = true
    try {
      sessionStorage.setItem(key, '1')
    } catch {
      /* private mode */
    }
    trackEvent(
      'verdict_viewed',
      {
        call,
        gap,
        signals,
        closes,
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(propertyState ? { property_state: propertyState } : {}),
      },
      newMetaEventId(),
    )
  }, [call, closes, gap, propertyId, propertyState, sentence, signals])

  const CallIcon = CALL_ICON[call]
  const tone = CALL_TONE[call]
  const dealGapLabel = `Deal Gap ${dealGapDisplayPct >= 0 ? '+' : ''}${dealGapDisplayPct.toFixed(1)}%`
  const callWhy = formatCallWhy({ gapPct: gap, fired: callFired })

  return (
    <article
      data-tour="verdict-prices"
      className="rounded-2xl px-3 sm:px-5 py-6"
      style={{
        background:
          'radial-gradient(120% 120% at 0% 0%, rgba(14,165,233,0.09), transparent 60%), var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold m-0"
          style={{ color: 'var(--accent-sky)' }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
          </svg>
          The verdict
        </p>
        <button
          type="button"
          className="text-sm bg-transparent border-0 p-0 underline decoration-dotted underline-offset-4"
          style={{ color: 'var(--accent-sky)' }}
          aria-expanded={whyVerdict}
          aria-controls={whyVerdictId}
          onClick={() => setWhyVerdict((v) => !v)}
        >
          Why?
        </button>
      </div>

      {whyVerdict ? (
        <p
          id={whyVerdictId}
          className="text-[13px] leading-relaxed mb-4 px-3 py-2 rounded-md"
          style={{
            color: 'var(--text-body)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          {VERDICT_WHY}
        </p>
      ) : null}

      <p
        className="m-0 mb-5 font-medium leading-[1.4] text-[19px] sm:text-[22px]"
        style={{ color: 'var(--text-heading)', maxWidth: '34em' }}
      >
        {sentence}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberTile
          value={formatMoneyExact(listPrice)}
          label={NUMBER_LABELS.market}
          color="var(--status-negative)"
        />
        <NumberTile
          value={formatMoneyExact(incomeValue)}
          label={NUMBER_LABELS.income}
          color="var(--status-income-value)"
        />
        <NumberTile
          value={formatMoneyExact(targetBuy)}
          label={NUMBER_LABELS.target}
          color="var(--status-positive)"
        />
      </div>

      {sourceStatus ? (
        <div className="mt-3">
          <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {formatSourceStatusLine(sourceStatus)}
            {sourceStatus.missingLabels.length > 0 ? (
              <>
                {' '}
                <button
                  type="button"
                  className="text-[13px] bg-transparent border-0 p-0 underline decoration-dotted underline-offset-4"
                  style={{ color: 'var(--accent-sky)' }}
                  aria-expanded={whySources}
                  aria-controls={whySourcesId}
                  onClick={() => setWhySources((v) => !v)}
                >
                  Why?
                </button>
              </>
            ) : null}
          </p>
          {whySources && sourceStatus.missingLabels.length > 0 ? (
            <p
              id={whySourcesId}
              className="text-[13px] leading-relaxed mt-2 mb-0 px-3 py-2 rounded-md"
              style={{
                color: 'var(--text-body)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              {SOURCE_STATUS_WHY}
            </p>
          ) : null}
        </div>
      ) : null}

      <p
        className="text-center tabular-nums text-[15px] font-semibold mt-5 mb-2"
        style={{
          color: 'var(--accent-sky)',
          fontFamily: 'var(--font-space-mono), "Space Mono", ui-monospace, monospace',
        }}
      >
        {dealGapLabel}
      </p>
      {gapSlider ? <div className="mb-1">{gapSlider}</div> : null}

      {showTips ? (
        <div className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VERDICT_TIPS.map((tip) => (
              <p
                key={tip}
                className="m-0 text-[13px] leading-relaxed px-3 py-2 rounded-md"
                style={{
                  color: 'var(--text-body)',
                  background: 'rgba(14,165,233,0.08)',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                {tip}
              </p>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
            <p className="m-0 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {VERDICT_TIPS_FOOTER}
            </p>
            <button
              type="button"
              onClick={dismissTips}
              className="inline-flex items-center justify-center min-h-9 px-3.5 rounded-full text-sm font-semibold"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-heading)',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3 flex-wrap mt-5">
        <span
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold"
          style={{
            color: tone.color,
            border: '1px solid var(--border-default)',
            background: tone.background,
            borderRadius: 6,
          }}
        >
          <CallIcon size={16} strokeWidth={2.5} aria-hidden="true" />
          {VERDICT_CALL_LABELS[call]}
        </span>
        <button
          type="button"
          className="text-sm bg-transparent border-0 p-0 underline decoration-dotted underline-offset-4"
          style={{ color: 'var(--accent-sky)' }}
          aria-expanded={whyCall}
          aria-controls={whyCallId}
          onClick={() => setWhyCall((v) => !v)}
        >
          Why?
        </button>
        <span className="flex-1 min-w-2" />
        <button
          type="button"
          onClick={onShowMath}
          className="inline-flex items-center justify-center min-h-11 px-5 rounded-full text-[15px] font-semibold"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-heading)',
          }}
        >
          Show the math
        </button>
        <button
          type="button"
          onClick={onBuildPlan}
          className="inline-flex items-center justify-center min-h-11 px-5 rounded-full text-[15px] font-semibold"
          style={{
            background: 'var(--accent-sky)',
            color: 'var(--text-inverse)',
          }}
        >
          Build the plan
        </button>
      </div>
      {whyCall ? (
        <p
          id={whyCallId}
          className="text-[13px] leading-relaxed mt-2 mb-0 px-3 py-2 rounded-md"
          style={{
            color: 'var(--text-body)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          {callWhy}
        </p>
      ) : null}
    </article>
  )
}

function NumberTile({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
      }}
    >
      <p
        className="tabular-nums font-bold leading-tight text-[22px] m-0"
        style={{
          color,
          fontFamily: 'var(--font-space-mono), "Space Mono", ui-monospace, monospace',
        }}
      >
        {value}
      </p>
      <p className="text-[13px] leading-snug mt-1 mb-0" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
    </div>
  )
}
