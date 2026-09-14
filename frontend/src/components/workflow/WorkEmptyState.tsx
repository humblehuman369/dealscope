'use client'

export function WorkEmptyState({ onGoToPlan }: { onGoToPlan: () => void }) {
  return (
    <section
      className="mx-0 sm:mx-5 mt-4 px-3 sm:px-5"
      aria-labelledby="work-empty-title"
    >
      <div
        className="px-5 py-8"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
        }}
      >
        <h2
          id="work-empty-title"
          className="text-[16px] font-semibold"
          style={{ color: 'var(--text-heading)' }}
        >
          No deal yet
        </h2>
        <p className="mt-2 text-[15px] leading-[1.5]" style={{ color: 'var(--text-body)' }}>
          This house is not in your pipeline. Build the plan, then start working it. The
          checklist, the people, and your next move fill in from the plan.
        </p>
        <button
          type="button"
          onClick={onGoToPlan}
          className="mt-5 inline-flex items-center justify-center min-h-11 px-5 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: 'var(--accent-sky)',
            color: 'var(--text-inverse)',
            borderRadius: 9999,
            outlineColor: 'var(--accent-sky)',
          }}
        >
          Go to the plan
        </button>
      </div>
    </section>
  )
}
