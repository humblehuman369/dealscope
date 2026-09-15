'use client'

import { useId, useState } from 'react'
import {
  seeMoreSignalsLabel,
  splitWhySignals,
  type WhySignal,
} from '@/lib/whyWeThinkSo'
import { V1_CARD } from '@/components/workflow/v1-style'

export interface WhyWeThinkSoProps {
  signals: readonly WhySignal[]
}

function SignalRow({ signal, first }: { signal: WhySignal; first?: boolean }) {
  return (
    <div
      className="py-2.5"
      style={{ borderTop: first ? 'none' : '1px solid var(--border-default)' }}
    >
      <p
        className="m-0 text-[14px] font-semibold tabular-nums"
        style={{ color: 'var(--text-heading)' }}
      >
        {signal.title}
      </p>
      <p
        className="m-0 mt-1 text-[14px] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {signal.detail}
      </p>
    </div>
  )
}

export function WhyWeThinkSo({ signals }: WhyWeThinkSoProps) {
  const headingId = useId()
  const { visible, rest } = splitWhySignals(signals)
  const [moreOpen, setMoreOpen] = useState(false)

  if (visible.length === 0) return null

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-2xl px-3 sm:px-5 py-6"
      style={V1_CARD}
    >
      <h2
        id={headingId}
        className="m-0 mb-3 text-[16px] font-semibold"
        style={{ color: 'var(--text-heading)' }}
      >
        Why we think so
      </h2>
      <div>
        {visible.map((signal, index) => (
          <SignalRow key={signal.id} signal={signal} first={index === 0} />
        ))}
      </div>
      {rest.length > 0 ? (
        <div>
          {moreOpen
            ? rest.map((signal) => <SignalRow key={signal.id} signal={signal} />)
            : null}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className="mt-1 min-h-11 bg-transparent border-0 px-1 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--accent-sky)', outlineColor: 'var(--accent-sky)' }}
          >
            {moreOpen ? 'Show less' : seeMoreSignalsLabel(rest.length)}
          </button>
        </div>
      ) : null}
    </article>
  )
}
