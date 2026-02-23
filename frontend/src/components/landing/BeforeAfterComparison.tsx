'use client';

const withoutItems = [
  'Search listings → guess which ones are "good deals"',
  'Build a spreadsheet from scratch for each property',
  'Hunt for rent comps manually across multiple sites',
  'No breakeven price — just hope the cash flow works',
  'Analyze one strategy at a time, one property at a time',
  '45–60 minutes per property before making a decision',
] as const;

const withItems = [
  'Enter any address → see instantly if the deal works',
  'Income Value, Target Buy, and Deal Gap calculated automatically',
  'Rent estimates sourced from RentCast, editable to your knowledge',
  'Breakeven price is the first thing you see (Income Value)',
  'All six strategies analyzed simultaneously on every scan',
  'Full analysis in under a minute — pass or pursue, fast',
] as const;

export function BeforeAfterComparison() {
  return (
    <section className="compare-section">
      <div className="section-label">The Difference</div>
      <div className="section-title">
        How investors analyzed deals before{' '}
        <strong>
          DealGap<span className="brand-iq">IQ</span>
        </strong>{' '}
        — and after.
      </div>
      <div className="compare-grid">
        <div className="compare-card old">
          <div className="compare-label">
            Without{' '}
            <strong>
              DealGap<span className="brand-iq">IQ</span>
            </strong>
          </div>
          {withoutItems.map((item) => (
            <div key={item} className="compare-item">
              {item}
            </div>
          ))}
        </div>
        <div className="compare-card new">
          <div className="compare-label">
            With{' '}
            <strong>
              DealGap<span className="brand-iq">IQ</span>
            </strong>
          </div>
          {withItems.map((item) => (
            <div key={item} className="compare-item">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
