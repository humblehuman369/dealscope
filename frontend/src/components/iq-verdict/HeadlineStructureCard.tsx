'use client'

/**
 * HeadlineStructureCard — Activation Arc Phase 0 (E4).
 *
 * Renders the conventional headline blend at the top of the verdict gap
 * guidance section, above the Four Paths panel. The card is the recommended
 * starting structure for the property — a price + rent + larger-down blend
 * that uses only buyer-controllable + minor-price levers (never seller
 * financing, Sub2, or other major-cooperation structures).
 *
 * See docs/feature-plans/ACTIVATION_ARC.md §3 for the full doctrine. Honest
 * gating: when the engine returns no plausible blend (`structure` prop is
 * null or undefined), this component renders nothing. The parent
 * `VerdictGapGuidance` falls back to the existing motivating-tier behavior.
 */

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/eventTracking'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import { IQIcon } from '@/lib/iq/iqIcon'

export interface HeadlineStructureCardProps {
  structure: DealStructure
  /** Fires when the user clicks "Show me how to pitch this." */
  onShowPitch?: (structure: DealStructure) => void
  /** Fires when the user clicks "Open in Strategy." */
  onOpenInStrategy?: (structure: DealStructure) => void
  /**
   * Market temperature passed through for telemetry. Optional —
   * `headline_structure_rendered` accepts an empty string when unknown.
   */
  marketTemperature?: string | null
  /**
   * True when the engine detected a buyer cash shortfall against this
   * structure (i.e. `payload.cashShortfall > 0`). Reported in telemetry so
   * we can correlate sandbox / Four Paths engagement with shortfall state.
   */
  hasCashShortfall?: boolean
}

/**
 * Read the `price_ceiling_used` value from the structure's pre-loaded record.
 * The headline_conventional_blend template stamps this under
 * `pre_loaded_record.pending_extras.price_ceiling_used` (see
 * backend/.../templates/headline_conventional_blend.py). Returns 0 when
 * unavailable — the telemetry event accepts numeric 0 as "unknown" and we
 * never want a missing value to throw.
 */
function _readPriceCeiling(structure: DealStructure): number {
  const pre = structure.preLoadedRecord
  if (!pre || typeof pre !== 'object') return 0
  const extras = (pre as Record<string, unknown>)['pending_extras']
  if (!extras || typeof extras !== 'object') return 0
  const ceiling = (extras as Record<string, unknown>)['price_ceiling_used']
  return typeof ceiling === 'number' ? ceiling : 0
}

export function HeadlineStructureCard({
  structure,
  onShowPitch,
  onOpenInStrategy,
  marketTemperature,
  hasCashShortfall,
}: HeadlineStructureCardProps) {
  const trackedIdRef = useRef<string | null>(null)
  // Activation Arc Phase 4 (D1) — IQ chip toggles an inline explanation
  // panel with 3 bullets derived from the structure's reasoning data.
  // Inline (not modal) keeps the user in context with the headline above.
  const [iqOpen, setIqOpen] = useState(false)

  // Telemetry: fire `headline_structure_rendered` once per structure id. The
  // ref guard prevents re-firing when React rerenders the parent (e.g. when
  // unrelated verdict data changes).
  useEffect(() => {
    if (trackedIdRef.current === structure.id) return
    trackedIdRef.current = structure.id
    trackEvent('headline_structure_rendered', {
      family: structure.family,
      market_temperature: marketTemperature ?? '',
      price_ceiling_used: _readPriceCeiling(structure),
      has_cash_shortfall: hasCashShortfall ? 'true' : 'false',
    })
  }, [structure.id, structure.family, marketTemperature, hasCashShortfall, structure])

  return (
    <section
      role="region"
      aria-label={`Recommended starting structure: ${structure.headline}`}
      style={{
        marginTop: 14,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        borderRadius: 12,
        // Slightly stronger accent than Four Paths cards — visually communicates
        // "this is the recommended one." Reuses existing CSS variables so it
        // stays in sync with theme changes.
        background:
          'linear-gradient(0deg, var(--sky-tint-fill, transparent), var(--sky-tint-fill, transparent)), var(--surface-card)',
        border: '2px solid var(--accent-sky)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Eyebrow + IQ chip (D1). Eyebrow on the left communicates the
          card's role; the IQ chip on the right opens an inline explanation
          for users who want to understand *why* the engine picked this. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent-sky)',
            margin: 0,
          }}
        >
          Recommended starting point
        </div>
        <button
          type="button"
          onClick={() => setIqOpen((v) => !v)}
          aria-label={iqOpen ? 'Hide IQ explanation' : 'Why does IQ recommend this?'}
          aria-expanded={iqOpen}
          style={{
            background: iqOpen ? 'var(--accent-sky)' : 'transparent',
            color: iqOpen ? 'var(--surface-base, #fff)' : 'var(--accent-sky)',
            border: '1px solid var(--accent-sky)',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <IQIcon size={14} ariaLabel="" />
          {iqOpen ? 'Hide' : 'Why this?'}
        </button>
      </div>

      {/* D1 — inline IQ explanation. Three bullets derived from the
          structure's data: selection_reason (why), levers summary (what),
          caveat (verify-before-pitching). No LLM — every line is template
          interpolation over engine output. */}
      {iqOpen && (
        <div
          role="region"
          aria-label="IQ explanation"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--accent-sky)',
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IQIcon size={20} />
            <strong style={{ fontSize: 13, color: 'var(--text-heading)', fontWeight: 700 }}>
              Why IQ recommends this
            </strong>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-body)' }}>
              <span style={{ color: 'var(--accent-sky)', fontWeight: 700, marginRight: 6 }}>
                1.
              </span>
              <strong style={{ color: 'var(--text-heading)' }}>The reasoning:</strong>{' '}
              {structure.selectionReason ?? 'Smallest set of conventional moves that makes this property cashflow.'}.
            </li>
            <li style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-body)' }}>
              <span style={{ color: 'var(--accent-sky)', fontWeight: 700, marginRight: 6 }}>
                2.
              </span>
              <strong style={{ color: 'var(--text-heading)' }}>What changes:</strong>{' '}
              {structure.levers.length === 0
                ? 'Nothing — the property cashflows at list price under standard financing.'
                : structure.levers
                    .map((l) => `${l.label.toLowerCase()} ${l.beforeLabel} → ${l.afterLabel}`)
                    .join('; ')}
              .
            </li>
            <li style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-body)' }}>
              <span style={{ color: 'var(--accent-sky)', fontWeight: 700, marginRight: 6 }}>
                3.
              </span>
              <strong style={{ color: 'var(--text-heading)' }}>Verify before pitching:</strong>{' '}
              {structure.caveat ?? 'No special conditions — confirm the comps support the assumed rent.'}
            </li>
          </ul>
        </div>
      )}

      {/* Big headline — the structure summary itself */}
      <h3
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.3,
          fontWeight: 700,
          color: 'var(--text-heading)',
        }}
      >
        {structure.headline}
      </h3>

      {/* Selection reason — one-line "why this card" per existing FOUR_PATHS doctrine */}
      {structure.selectionReason && (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {structure.selectionReason}.
        </p>
      )}

      {/* Levers — same visual format as Four Paths cards but without the family chip */}
      {structure.levers.length > 0 && (
        <ul
          aria-label="Adjustments in the recommended structure"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {structure.levers.map((lever, idx) => (
            <li
              key={`${lever.label}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '6px 0',
                borderBottom:
                  idx < structure.levers.length - 1
                    ? '1px solid var(--border-subtle, var(--border-default))'
                    : 'none',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {lever.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{lever.beforeLabel}</span>
                <span style={{ color: 'var(--text-secondary)' }} aria-hidden="true">
                  →
                </span>
                <span style={{ color: 'var(--text-heading)', fontWeight: 700 }}>
                  {lever.afterLabel}
                </span>
                {lever.deltaLabel && (
                  <span
                    style={{
                      color: 'var(--accent-sky)',
                      fontSize: 12,
                      fontWeight: 700,
                      marginLeft: 2,
                    }}
                  >
                    {lever.deltaLabel}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Summary — one-sentence framing */}
      {structure.summary && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-body)',
          }}
        >
          {structure.summary}
        </p>
      )}

      {/* Caveat — the honest disclosure line (price ceiling assumption, rent verification ask) */}
      {structure.caveat && (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {structure.caveat}
        </p>
      )}

      {/* Actions — same affordances as Four Paths cards. Primary CTA on the right. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 4,
        }}
      >
        {onOpenInStrategy && (
          <button
            type="button"
            onClick={() => onOpenInStrategy(structure)}
            className="rounded-md px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-[var(--surface-card)]"
            style={{
              background: 'transparent',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            Open in Strategy
          </button>
        )}
        {onShowPitch && (
          <button
            type="button"
            onClick={() => onShowPitch(structure)}
            className="rounded-md px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
              minWidth: 140,
            }}
          >
            How to pitch this
          </button>
        )}
      </div>
    </section>
  )
}
