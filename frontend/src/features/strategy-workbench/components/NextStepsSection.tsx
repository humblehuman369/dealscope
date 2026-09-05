'use client'

/**
 * Export links (Full Report / Excel) + "Next Steps?" accordion.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { useState } from 'react'
import { tw } from '@/components/iq-verdict/verdict-design-tokens'
import { colors } from '../lib/shared'

export interface NextStepsSectionProps {
  isExporting: string | null
  dealGapPct: number
  onDownloadPDF: () => void
  onDownloadExcel: () => void
}

export function NextStepsSection({
  isExporting,
  dealGapPct,
  onDownloadPDF,
  onDownloadExcel,
}: NextStepsSectionProps) {
  const [nextStepsOpen, setNextStepsOpen] = useState(false)

  return (
    <section className="px-[1px] sm:px-5" style={{ paddingTop: 8, paddingBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Export links — siblings of the toggle (never nested inside it) so
            interactive elements stay out of the accordion control. */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDownloadPDF()
            }}
            disabled={isExporting === 'pdf'}
            className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium transition-colors hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-wait"
            style={{
              color: 'var(--accent-sky)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {isExporting === 'pdf' ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            )}
            {isExporting === 'pdf' ? 'Generating…' : 'Full Report'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDownloadExcel()
            }}
            disabled={isExporting === 'excel'}
            className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium transition-colors hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-wait"
            style={{
              color: 'var(--accent-sky)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {isExporting === 'excel' ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            )}
            {isExporting === 'excel' ? 'Generating…' : 'Download Excel'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setNextStepsOpen((v) => !v)}
          aria-expanded={nextStepsOpen}
          aria-controls="next-steps-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          <span
            style={{
              color: 'var(--accent-sky)',
              margin: 0,
              fontSize: '0.85rem',
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.02em',
            }}
          >
            Next Steps?
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 22 22"
            fill="none"
            style={{
              flexShrink: 0,
              transition: 'transform 0.3s ease',
              transform: nextStepsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <circle cx="11" cy="11" r="10" stroke="var(--accent-sky)" strokeWidth="1.5" />
            <path
              d="M7.5 9.5L11 13L14.5 9.5"
              stroke="var(--accent-sky)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {nextStepsOpen && (
        <div id="next-steps-panel" style={{ paddingTop: 12 }}>
          <p
            className={tw.textBody}
            style={{ color: colors.text.body, marginBottom: 20, lineHeight: 1.55 }}
          >
            Follow these steps to move forward with your property deal:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                num: '1',
                text: (
                  <>
                    <strong style={{ color: 'var(--text-heading)' }}>Review Deal Terms</strong>{' '}
                    – Check the down payment, financing, interest rate, and other details to
                    understand the deal.
                  </>
                ),
              },
              {
                num: '2',
                text: (
                  <>
                    <strong style={{ color: 'var(--text-heading)' }}>Adjust the Numbers</strong>{' '}
                    – Use the DealMaker tab to tweak parameters and see real-time changes.
                  </>
                ),
              },
              {
                num: '3',
                text: (
                  <>
                    <strong style={{ color: 'var(--text-heading)' }}>Download Reports</strong> –
                    Get the full property report and Excel worksheet below for deeper insight.
                  </>
                ),
              },
              {
                num: '4',
                text: (
                  <>
                    <strong style={{ color: 'var(--text-heading)' }}>
                      Use Comps to Set Your Values
                    </strong>{' '}
                    – Visit the Comps tab to confirm value, set the ARV and create your own
                    appraisal report.
                  </>
                ),
              },
              ...(dealGapPct > 20
                ? [
                    {
                      num: '5',
                      text: (
                        <>
                          <strong style={{ color: 'var(--text-heading)' }}>
                            Stress-test structure, not just price
                          </strong>{' '}
                          – If the Deal Gap is wide, model a lower interest rate, larger down
                          payment, shorter loan term, or seller financing (including low- or
                          zero-rate carry) in the worksheet below.
                        </>
                      ),
                    },
                    {
                      num: '6',
                      text: (
                        <>
                          <strong style={{ color: 'var(--text-heading)' }}>
                            Verify income and value anchors
                          </strong>{' '}
                          – Use the IQ Estimate selector when you sign in to swap value or rent
                          sources; small changes there move Income Value and Target Buy.
                        </>
                      ),
                    },
                  ]
                : []),
            ].map((step) => (
              <div
                key={step.num}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
              >
                <div
                  style={{
                    minWidth: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--color-sky-dim)',
                    border: '1px solid var(--accent-sky)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent-sky)',
                    flexShrink: 0,
                  }}
                >
                  {step.num}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    lineHeight: 1.55,
                    color: 'var(--text-body)',
                    paddingTop: 4,
                  }}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
