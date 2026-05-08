'use client'

/**
 * Activation Arc Phase 3 (C1) — Ask IQ chip + modal.
 *
 * A small chip rendered below the Four Paths panel. Click opens a modal
 * with categorized pre-canned questions; each question links to a vetted
 * answer pulled from the IQ knowledge base. **No free-text input in v1**
 * — the doctrine in ACTIVATION_ARC.md §9 (non-goals) explicitly forbids
 * freeform LLM responses for this iteration. Every answer is sourced and
 * traceable.
 *
 * Telemetry events fired (per cookie consent):
 *   - `iq_chip_opened` when the modal opens
 *   - `iq_question_viewed` when a question is selected
 *   - `iq_modal_closed` when the user dismisses the modal
 *
 * Companion content lives in `frontend/src/lib/iq/knowledgeBase.ts`. The
 * IQ icon component is in `frontend/src/lib/iq/iqIcon.tsx`.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '@/lib/eventTracking'
import { IQIcon } from '@/lib/iq/iqIcon'
import {
  IQ_CATEGORIES,
  type IQAnswer,
  type IQCategory,
  questionsByCategory,
} from '@/lib/iq/knowledgeBase'

// Light markdown → React rendering. The knowledge base uses **bold** and
// *italic* sparingly; supporting just those two keeps the modal honest
// without pulling in a full markdown library.
function renderMarkdown(text: string): React.ReactNode {
  // Tokenize on **bold** and *italic*. Italic tokens are matched after bold
  // so we don't accidentally split inside ** delimiters.
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--text-heading)', fontWeight: 700 }}>
          {tok.slice(2, -2)}
        </strong>
      )
    }
    if (tok.startsWith('*') && tok.endsWith('*')) {
      return <em key={i}>{tok.slice(1, -1)}</em>
    }
    return <span key={i}>{tok}</span>
  })
}

export interface AskIQProps {
  /** Optional analytics context — surfaced as `from_panel` on `iq_chip_opened`. */
  fromPanel?: string
}

export function AskIQ({ fromPanel = 'four_paths' }: AskIQProps) {
  const [open, setOpen] = useState(false)
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)
  const openedAtRef = useRef<number | null>(null)
  const questionsViewedRef = useRef<Set<string>>(new Set())
  const backdropRef = useRef<HTMLDivElement>(null)
  const grouped = useMemo(() => questionsByCategory(), [])

  const handleOpen = () => {
    setOpen(true)
    setActiveQuestionId(null)
    openedAtRef.current = Date.now()
    questionsViewedRef.current = new Set()
    trackEvent('iq_chip_opened', { from_panel: fromPanel })
  }

  const handleClose = () => {
    setOpen(false)
    const opened = openedAtRef.current
    trackEvent('iq_modal_closed', {
      questions_viewed_count: questionsViewedRef.current.size,
      time_open_ms: opened ? Date.now() - opened : 0,
    })
  }

  // Escape key + backdrop click close the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectQuestion = (q: IQAnswer) => {
    setActiveQuestionId(q.id)
    if (!questionsViewedRef.current.has(q.id)) {
      questionsViewedRef.current.add(q.id)
      trackEvent('iq_question_viewed', {
        category: q.category,
        question_id: q.id,
      })
    }
  }

  const activeQuestion = activeQuestionId
    ? (grouped.get(activeQuestionId.split('::')[0] as IQCategory) ?? [])
        .find((q) => q.id === activeQuestionId) ??
      // Fall back to scanning all categories — IDs are globally unique.
      Array.from(grouped.values())
        .flat()
        .find((q) => q.id === activeQuestionId)
    : null

  return (
    <>
      {/* Chip */}
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors"
        style={{
          background: 'var(--surface-card)',
          color: 'var(--text-heading)',
          border: '1px solid var(--accent-sky)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
        aria-label="Ask IQ — open the negotiation knowledge base"
      >
        <IQIcon size={16} ariaLabel="" />
        Ask IQ
      </button>

      {/* Modal */}
      {open && (
        <div
          ref={backdropRef}
          role="presentation"
          onClick={(e) => {
            if (e.target === backdropRef.current) handleClose()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.55)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ask IQ"
            className="w-full rounded-xl shadow-2xl"
            style={{
              background: 'var(--surface-elevated, var(--surface-card))',
              border: '2px solid var(--accent-sky)',
              maxWidth: 720,
              maxHeight: 'min(86vh, 720px)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <IQIcon size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: 'var(--accent-sky)',
                  }}
                >
                  Ask IQ
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-heading)',
                  }}
                >
                  Negotiation knowledge base
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '14px 20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {!activeQuestion ? (
                // List view — categories with their questions
                IQ_CATEGORIES.map((cat) => {
                  const questions = grouped.get(cat.id) ?? []
                  if (questions.length === 0) return null
                  return (
                    <section key={cat.id} aria-labelledby={`iq-cat-${cat.id}`}>
                      <h3
                        id={`iq-cat-${cat.id}`}
                        style={{
                          margin: '0 0 6px',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          color: 'var(--accent-sky)',
                        }}
                      >
                        {cat.label}
                      </h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {questions.map((q) => (
                          <li key={q.id}>
                            <button
                              type="button"
                              onClick={() => selectQuestion(q)}
                              className="w-full text-left rounded-md transition-colors hover:bg-[var(--surface-card)]"
                              style={{
                                background: 'transparent',
                                color: 'var(--text-body)',
                                border: 'none',
                                padding: '8px 10px',
                                fontSize: 13,
                                lineHeight: 1.45,
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ color: 'var(--accent-sky)', fontWeight: 700, marginRight: 6 }}>
                                →
                              </span>
                              {q.question}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })
              ) : (
                // Detail view — one question's answer
                <article>
                  <button
                    type="button"
                    onClick={() => setActiveQuestionId(null)}
                    style={{
                      background: 'transparent',
                      color: 'var(--accent-sky)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: 0,
                      marginBottom: 10,
                    }}
                  >
                    ← All questions
                  </button>
                  <h3
                    style={{
                      margin: '0 0 12px',
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--text-heading)',
                      lineHeight: 1.35,
                    }}
                  >
                    {activeQuestion.question}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--text-body)',
                    }}
                  >
                    {renderMarkdown(activeQuestion.answer)}
                  </p>
                  <p
                    style={{
                      margin: '14px 0 0',
                      fontSize: 11.5,
                      lineHeight: 1.4,
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                    }}
                  >
                    Source: {activeQuestion.source}
                  </p>
                </article>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
