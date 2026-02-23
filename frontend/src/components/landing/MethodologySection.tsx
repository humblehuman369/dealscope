'use client';

const methodCards = [
  {
    label: 'Data Input',
    title: 'Market Value',
    body: (
      <>
        Property market values are sourced from{' '}
        <strong>Zestimate data</strong>, providing automated valuation model
        (AVM) estimates based on recent sales, tax assessments, and property
        characteristics. You can override this value with your own estimate at
        any time.
      </>
    ),
    source: 'Source: Zestimate via Zillow API',
  },
  {
    label: 'Data Input',
    title: 'Rental Income Estimate',
    body: (
      <>
        Monthly rent estimates come from <strong>RentCast</strong>, which
        analyzes comparable rental listings and lease data in the
        property&apos;s market area. Both long-term and short-term rental
        estimates are provided.
      </>
    ),
    source: 'Source: RentCast API',
  },
  {
    label: 'Editable Default',
    title: 'Loan Terms',
    body: (
      <>
        Default assumptions:{' '}
        <strong>
          25% down payment, 30-year fixed at current market rates
        </strong>
        . Change the down payment, rate, or loan type and every calculation
        updates instantly. Investment and conventional loan options supported.
      </>
    ),
    source: 'User-configurable',
  },
  {
    label: 'Editable Default',
    title: 'Operating Expenses',
    body: (
      <>
        Industry-standard defaults:{' '}
        <strong>
          7.5% vacancy, 10% property management, 1% maintenance
        </strong>
        , plus insurance and property taxes sourced from public records. Every
        line item is visible and adjustable.
      </>
    ),
    source: 'Industry defaults · User-configurable',
  },
] as const;

export function MethodologySection() {
  return (
    <section className="method-section">
      <div className="section-label">Where the Numbers Come From</div>
      <div className="section-title">
        Transparent data. Editable assumptions. No black boxes.
      </div>
      <div className="section-subtitle">
        Every number in{' '}
        <strong>
          DealGap<span className="brand-iq">IQ</span>
        </strong>{' '}
        comes from a verifiable source or an assumption you can see and change.
        Here&apos;s exactly what powers the analysis.
      </div>

      <div className="method-grid">
        {methodCards.map((card) => (
          <div key={card.title} className="method-card">
            <div className="method-card-label">{card.label}</div>
            <div className="method-card-title">{card.title}</div>
            <div className="method-card-body">{card.body}</div>
            <div className="method-card-source">{card.source}</div>
          </div>
        ))}
      </div>

      <div className="method-note">
        <div className="method-note-title">
          The{' '}
          <strong>
            DealGap<span className="brand-iq">IQ</span>
          </strong>{' '}
          Principle
        </div>
        <div className="method-note-body">
          We believe that financial analysis tools should show their work. Every
          assumption behind every number is visible inside your analysis. If you
          disagree with a default, change it. If you have better data, use it.{' '}
          <strong>
            DealGap<span className="brand-iq">IQ</span>
          </strong>{' '}
          is a decision system — it calculates the math so you can focus on the
          judgment.
        </div>
      </div>
    </section>
  );
}
