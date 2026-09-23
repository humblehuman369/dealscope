'use client'

import {
  V1_BTN_PRIMARY_CLASS,
  V1_BTN_PRIMARY_STYLE,
  V1_CARD,
  V1_TITLE_CLASS,
  V1_TITLE_STYLE,
} from '@/components/workflow/v1-style'

export function WorkEmptyState({ onGoToPlan }: { onGoToPlan: () => void }) {
  return (
    <section
      className="px-3 sm:px-6 mt-4"
      aria-labelledby="work-empty-title"
    >
      <div className="px-5 py-8" style={V1_CARD}>
        <h2 id="work-empty-title" className={V1_TITLE_CLASS} style={V1_TITLE_STYLE}>
          No deal yet
        </h2>
        <p className="mt-2 text-[14px] leading-[1.5]" style={{ color: 'var(--text-body)' }}>
          This house is not in your pipeline. Build the plan, then start working it. The
          checklist, the people, and your next move fill in from the plan.
        </p>
        <button
          type="button"
          onClick={onGoToPlan}
          className={`mt-5 ${V1_BTN_PRIMARY_CLASS}`}
          style={V1_BTN_PRIMARY_STYLE}
        >
          Go to the plan
        </button>
      </div>
    </section>
  )
}
