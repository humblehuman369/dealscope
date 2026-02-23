'use client';

export function ValuationControls() {
  return (
    <section className="sec">
      <div className="val-grid">
        <div>
          <div className="label">Adjust for Reality</div>
          <h3 className="val-title">Every property is different. Every assumption is editable.</h3>
          <p className="val-desc">
            Fine-tune condition, location, and rehab estimates to see how they change your Income Value. No black boxes &mdash; every input is visible and adjustable.
          </p>
        </div>
        <div className="card-md val-card">
          <div className="val-header">
            <div className="val-header-title">Valuation Controls</div>
            <div className="val-mode">Edit Mode: On</div>
          </div>
          <div className="val-slider">
            <div className="val-slider-header">
              <span className="val-slider-name">Property Condition</span>
              <span className="val-slider-val" style={{ color: 'var(--coral)' }}>
                Needs Rehab (-$85k)
              </span>
            </div>
            <div className="val-track">
              <div className="val-fill" style={{ width: '25%', background: 'var(--coral)' }} />
            </div>
            <div className="val-ticks">
              <span className="val-tick">Distressed</span>
              <span className="val-tick">Average</span>
              <span className="val-tick">Turnkey</span>
            </div>
          </div>
          <div className="val-slider">
            <div className="val-slider-header">
              <span className="val-slider-name">Location Premium</span>
              <span className="val-slider-val" style={{ color: 'var(--green)' }}>
                High Demand (+5%)
              </span>
            </div>
            <div className="val-track">
              <div className="val-fill" style={{ width: '75%', background: 'var(--green)' }} />
            </div>
            <div className="val-ticks">
              <span className="val-tick">Poor</span>
              <span className="val-tick">Standard</span>
              <span className="val-tick">Premium</span>
            </div>
          </div>
          <div className="val-result">
            <div>
              <div className="val-result-label">Adjusted Value</div>
              <div className="val-result-num">$766,733</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="val-result-label">Impact</div>
              <div className="val-result-num" style={{ color: 'var(--green)' }}>
                + $12,400
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
