'use client'

import type { ReactNode } from 'react'

import type { ChoiceOption } from '@/components/iq-verdict/make-it-work/wizardMapping'

export interface ChoiceStepProps<T extends string> {
  eyebrow: string
  question: string
  whyWeAsk: string
  options: readonly ChoiceOption<T>[]
  selected: T | null
  onSelect: (value: T) => void
  /** Optional live teaching line, e.g. "≈ 12% down · ~$46K to close". */
  preview?: (value: T) => string | null
}

/**
 * One question per screen, chip answers, no free text. Selecting a chip
 * advances — there is no separate "Next" button to hunt for.
 */
export function ChoiceStep<T extends string>({
  eyebrow,
  question,
  whyWeAsk,
  options,
  selected,
  onSelect,
  preview,
}: ChoiceStepProps<T>): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent-sky)',
          }}
        >
          {eyebrow}
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
          {question}
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {whyWeAsk}
        </p>
      </div>

      <div role="radiogroup" aria-label={question} className="flex flex-col gap-2">
        {options.map((opt) => {
          const isSelected = selected === opt.id
          const previewText = preview ? preview(opt.id) : null
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(opt.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl text-left transition-colors focus:outline-none focus-visible:ring-2"
              style={{
                padding: '14px 16px',
                background: isSelected
                  ? 'color-mix(in srgb, var(--accent-sky) 14%, var(--surface-card))'
                  : 'var(--surface-card)',
                border: `1px solid ${isSelected ? 'var(--accent-sky)' : 'var(--border-default)'}`,
                color: 'var(--text-heading)',
              }}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{opt.label}</span>
                {(previewText || opt.hint) && (
                  <span
                    className="tabular-nums"
                    style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--text-secondary)' }}
                  >
                    {previewText ?? opt.hint}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--accent-sky)',
                  opacity: isSelected ? 1 : 0.45,
                }}
              >
                →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
