'use client'

export function WorkCheckError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="px-3 sm:px-6 mt-4" aria-labelledby="work-check-error-title">
      <div
        className="px-5 py-8"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
        }}
      >
        <h2
          id="work-check-error-title"
          className="text-[16px] font-semibold"
          style={{ color: 'var(--text-heading)' }}
        >
          We couldn't reach the server. Try again.
        </h2>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center min-h-11 px-5 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: 'var(--accent-sky)',
            color: 'var(--text-inverse)',
            borderRadius: 9999,
            outlineColor: 'var(--accent-sky)',
          }}
        >
          Retry
        </button>
      </div>
    </section>
  )
}
