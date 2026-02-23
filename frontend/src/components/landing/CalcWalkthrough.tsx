'use client';

const calcSteps = [
  {
    num: 'STEP 1 — INCOME',
    title: 'Estimate net operating income',
    detail:
      '$2,180/mo gross rent (RentCast) → minus 7.5% vacancy, 10% management, insurance, taxes, maintenance',
    value: '$1,342/mo NOI',
    color: 'var(--green)',
  },
  {
    num: 'STEP 2 — INCOME VALUE',
    title: 'Find the breakeven purchase price',
    detail:
      'Back-solve: at what price does NOI exactly cover debt service? (25% down, 7.2% rate, 30yr)',
    value: '$312,000 Income Value',
    color: 'var(--green)',
  },
  {
    num: 'STEP 3 — TARGET BUY',
    title: 'Apply your return target',
    detail:
      'You want 10% Cash-on-Cash. What price delivers that return given the NOI and loan terms?',
    value: '$289,000 Target Buy',
    color: 'var(--teal)',
  },
  {
    num: 'STEP 4 — DEAL GAP',
    title: 'Measure the negotiation distance',
    detail:
      'List Price ($349,900) vs. Target Buy ($289,000). The gap is $60,900 — a 17.4% discount needed.',
    value: '−17.4% Deal Gap',
    color: 'var(--coral)',
  },
] as const;

const resultItems = [
  { label: 'Income Value', value: '$312K', color: 'var(--green)' },
  { label: 'Target Buy', value: '$289K', color: 'var(--teal)' },
  { label: 'List Price', value: '$349.9K', color: 'var(--coral)' },
  { label: 'Deal Gap', value: '−17.4%', color: 'var(--teal)' },
] as const;

export function CalcWalkthrough() {
  return (
    <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-label">See the Math</div>
      <div className="section-title">
        How{' '}
        <strong>
          DealGap<span className="brand-iq">IQ</span>
        </strong>{' '}
        calculates your three numbers.
      </div>
      <div className="section-subtitle">
        Here&apos;s the exact logic behind a real analysis. No hidden formulas —
        the same math a professional underwriter would use, automated and
        instant.
      </div>

      <div className="calc-walkthrough">
        <div className="calc-card">
          <div className="calc-header">
            <div className="calc-header-label">Example Property</div>
            <div className="calc-header-addr">
              1847 Oakridge Drive, Tampa, FL 33612 · Listed at $349,900
            </div>
          </div>
          <div className="calc-steps">
            {calcSteps.map((step) => (
              <div key={step.num} className="calc-step">
                <div className="calc-step-num">{step.num}</div>
                <div className="calc-step-title">{step.title}</div>
                <div className="calc-step-detail">{step.detail}</div>
                <div
                  className="calc-step-value"
                  style={{ color: step.color }}
                >
                  {step.value}
                </div>
              </div>
            ))}
          </div>
          <div className="calc-result">
            {resultItems.map((item) => (
              <div key={item.label} className="calc-result-item">
                <div className="calc-result-label">{item.label}</div>
                <div
                  className="calc-result-val"
                  style={{ color: item.color }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
