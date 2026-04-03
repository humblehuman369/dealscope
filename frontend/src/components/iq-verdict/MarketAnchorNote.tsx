'use client'

/**
 * Short context for how Market Price anchors Deal Gap / Price Gap (listed vs off-market).
 */

export function MarketAnchorNote({ isListed }: { isListed: boolean }) {
  return (
    <p
      className="rounded-lg px-3 py-2.5 text-[12px] sm:text-[13px] leading-relaxed"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-body)',
        margin: 0,
      }}
    >
      {isListed ? (
        <>
          <strong style={{ color: 'var(--text-heading)' }}>Listed property:</strong> Market Price is the{' '}
          <strong style={{ color: 'var(--text-heading)' }}>asking price</strong>. Deal Gap and Price Gap are measured
          against that benchmark.
        </>
      ) : (
        <>
          <strong style={{ color: 'var(--text-heading)' }}>Off-market:</strong> Market Price is an{' '}
          <strong style={{ color: 'var(--text-heading)' }}>automated estimate</strong>, not a live list price. Deal Gap
          and Price Gap assume that estimate—if it is off, the gaps move with it.
        </>
      )}
    </p>
  )
}
