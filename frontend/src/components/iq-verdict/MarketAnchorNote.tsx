'use client'

/**
 * Short context for how Market Price anchors Deal Gap / Price Gap (listed vs off-market).
 */

export function MarketAnchorNote({ isListed }: { isListed: boolean }) {
  return (
    <p
      className="text-[12px] sm:text-[13px] leading-relaxed m-0"
      style={{ color: 'var(--text-body)' }}
    >
      {isListed ? (
        <>
          <strong style={{ color: 'var(--accent-sky)' }}>Listed property:</strong> Market Price is the{' '}
          <strong style={{ color: 'var(--accent-sky)' }}>asking price</strong>. Deal Gap and Price Gap are measured
          against that benchmark.
        </>
      ) : (
        <>
          <strong style={{ color: 'var(--accent-sky)' }}>Off-market:</strong> Market Price is an{' '}
          <strong style={{ color: 'var(--accent-sky)' }}>automated estimate</strong>, not a live list price. Deal Gap
          and Price Gap assume that estimate—if it is off, the gaps move with it.
        </>
      )}
    </p>
  )
}
