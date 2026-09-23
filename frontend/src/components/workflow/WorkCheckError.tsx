'use client'

import {
  V1_BTN_PRIMARY_CLASS,
  V1_BTN_PRIMARY_STYLE,
  V1_CARD,
  V1_TITLE_CLASS,
  V1_TITLE_STYLE,
} from '@/components/workflow/v1-style'

export function WorkCheckError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="px-3 sm:px-6 mt-4" aria-labelledby="work-check-error-title">
      <div className="px-5 py-8" style={V1_CARD}>
        <h2 id="work-check-error-title" className={V1_TITLE_CLASS} style={V1_TITLE_STYLE}>
          We couldn't reach the server. Try again.
        </h2>
        <button
          type="button"
          onClick={onRetry}
          className={`mt-5 ${V1_BTN_PRIMARY_CLASS}`}
          style={V1_BTN_PRIMARY_STYLE}
        >
          Retry
        </button>
      </div>
    </section>
  )
}
