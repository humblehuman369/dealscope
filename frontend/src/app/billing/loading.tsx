export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      <div className="max-w-[960px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-12 md:pb-16">

        {/* Page header skeleton */}
        <div className="flex flex-col items-center gap-3 mb-14">
          <div className="h-9 w-48 rounded-lg bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-5 w-80 rounded bg-[var(--surface-elevated)] animate-pulse" />
        </div>

        {/* Value anchor skeleton */}
        <div
          className="rounded-[14px] p-8 mb-12 flex flex-col items-center gap-3"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="h-7 w-64 rounded bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-4 w-full max-w-lg rounded bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-4 w-3/4 max-w-md rounded bg-[var(--surface-elevated)] animate-pulse" />
        </div>

        {/* Motivating CTA skeleton */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <div className="h-8 w-72 rounded bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-8 w-60 rounded bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-4 w-full max-w-[540px] rounded bg-[var(--surface-elevated)] animate-pulse mt-1" />
          <div className="h-4 w-4/5 max-w-[440px] rounded bg-[var(--surface-elevated)] animate-pulse" />
        </div>

        {/* Plan cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-9"
              style={{
                background: 'var(--surface-card)',
                border: `1px solid ${i === 0 ? 'var(--border-focus)' : 'var(--border-default)'}`,
                boxShadow: i === 0
                  ? 'var(--shadow-card-hover)'
                  : undefined,
              }}
            >
              <div className="h-5 w-16 rounded bg-[var(--surface-elevated)] animate-pulse mb-3" />
              <div className="h-9 w-24 rounded bg-[var(--surface-elevated)] animate-pulse mb-1" />
              <div className="h-3 w-52 rounded bg-[var(--surface-elevated)] animate-pulse mb-7" />
              <div className="space-y-3 mb-8">
                {Array.from({ length: 9 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div className="w-[18px] h-[18px] rounded bg-[var(--surface-elevated)] animate-pulse flex-shrink-0" />
                    <div
                      className="h-4 rounded bg-[var(--surface-elevated)] animate-pulse"
                      style={{ width: `${60 + Math.random() * 30}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="h-12 w-full rounded-[10px] bg-[var(--surface-elevated)] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Trust row skeleton */}
        <div className="flex justify-center gap-10 py-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-28 rounded bg-[var(--surface-elevated)] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
