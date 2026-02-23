'use client';

const strategies = [
  'Long-Term Rental',
  'Short-Term Rental',
  'BRRRR',
  'Fix & Flip',
  'House Hack',
  'Wholesale',
] as const;

export function StrategyPills() {
  return (
    <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-label">Six Strategies, One Scan</div>
      <div className="section-title">
        Every address analyzed six ways — automatically.
      </div>
      <div className="section-subtitle">
        This reveals opportunities other investors miss and shows the best
        strategy for that specific property — not a one-size-fits-all analysis.
      </div>
      <div className="strategies-grid">
        {strategies.map((name) => (
          <div key={name} className="strategy-pill">
            <div className="strategy-dot"></div>
            <span>{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
