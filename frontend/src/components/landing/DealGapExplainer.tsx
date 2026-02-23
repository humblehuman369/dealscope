'use client';

export function DealGapExplainer() {
  return (
    <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-label">The Core Concept</div>
      <div className="section-title">
        The Deal Gap — the metric no one else calculates.
      </div>
      <div className="deal-gap-grid">
        <div className="deal-gap-narrative">
          <p>
            At the core of{' '}
            <strong>
              DealGap<span className="brand-iq">IQ</span>
            </strong>{' '}
            is a proprietary concept:{' '}
            <strong>the Deal Gap</strong> — the distance between the asking
            price and the price required to hit your target return.
          </p>
          <p>
            That single number tells you whether the deal is worth pursuing, how
            much to negotiate, and how hard the negotiation will be.
          </p>
          <p>
            This turns real estate from a search game into a{' '}
            <strong>decision system</strong>. Most investors search the same
            listings, use the same filters, and compete on speed.{' '}
            <strong>
              DealGap<span className="brand-iq">IQ</span>
            </strong>{' '}
            analyzes every property to find the ones that actually are deals — by
            calculating the exact price that delivers your target return.
          </p>
        </div>
        <div className="gap-visual">
          <div className="gap-visual-label">
            Price Spectrum — Example Property
          </div>
          <div className="price-bar">
            <div className="price-row">
              <div className="price-label">Target Buy</div>
              <div className="price-track target">
                <span className="price-val">$289K</span>
              </div>
            </div>
            <div className="price-row">
              <div className="price-label">Income Value</div>
              <div className="price-track income">
                <span className="price-val">$312K</span>
              </div>
            </div>
            <div className="price-row">
              <div className="price-label">List Price</div>
              <div className="price-track list">
                <span className="price-val">$350K</span>
              </div>
            </div>
          </div>
          <div className="gap-arrow">
            <div className="gap-arrow-line"></div>
            <div className="gap-badge">DEAL GAP −17.4%</div>
            <div className="gap-arrow-line"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
