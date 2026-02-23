'use client';

const numbers = [
  {
    icon: 'IV',
    title: 'Income Value',
    desc: 'The maximum price the property can support before cash flow turns negative. Above this line, you lose money every month. This is the breakeven boundary — the ceiling on what you should pay.',
  },
  {
    icon: 'TB',
    title: 'Target Buy',
    desc: 'The price that delivers your desired return. Set your target CoC return, adjust loan terms and expenses — it recalculates instantly. This is your number.',
  },
  {
    icon: 'DG',
    title: 'Deal Gap',
    desc: 'The distance between the asking price and your Target Buy. Your built-in profit opportunity and your negotiation distance. The bigger the gap, the better the deal — but the harder the negotiation.',
  },
] as const;

export function ThreeNumbers() {
  return (
    <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-label">The Three Price Signals</div>
      <div className="section-title">
        Hours of analysis, reduced to three numbers.
      </div>
      <div className="section-subtitle">
        <strong>
          DealGap<span className="brand-iq">IQ</span>
        </strong>{' '}
        reduces complex underwriting into three investor-grade price signals. In
        seconds, you know where you break even, where you profit, and whether
        the deal is realistic.
      </div>
      <div className="three-numbers">
        {numbers.map((n) => (
          <div key={n.icon} className="number-card">
            <div className="number-icon">{n.icon}</div>
            <h3>{n.title}</h3>
            <p>{n.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
