'use client';

import Link from 'next/link';

export function DemoCard() {
  return (
    <div className="card-lg demo">
      <div className="demo-prop">
        <div>
          <div className="demo-addr">1847 Oakridge Drive, Tampa, FL 33612</div>
          <div className="demo-det">3 bed &middot; 2 bath &middot; 1,640 sqft &middot; Built 2004</div>
        </div>
        <div>
          <div className="demo-lp-label">List Price</div>
          <div className="demo-lp">$349,900</div>
        </div>
      </div>
      <div className="demo-spec">
        <div className="demo-spec-label">Your Price Spectrum</div>
        <div style={{ position: 'relative', marginBottom: '.5rem' }}>
          <div className="spec-gap-wrap">
            <div className="spec-gap-line"></div>
            <div className="spec-gap-text">DEAL GAP  17.4%</div>
            <div className="spec-gap-line"></div>
          </div>
          <div className="spec-bar">
            <div className="spec-marker" style={{ left: '30%', background: 'var(--teal)' }}></div>
            <div className="spec-marker" style={{ left: '62%', background: 'var(--green)' }}></div>
            <div className="spec-marker" style={{ left: '97%', background: 'var(--coral)' }}></div>
          </div>
          <div className="spec-labels">
            <div className="spec-pt" style={{ left: '30%' }}>
              <div className="spec-pt-val">$289K</div>
              <div className="spec-pt-name">Target Buy</div>
              <div className="spec-pt-sub" style={{ color: 'var(--teal)' }}>Profit</div>
            </div>
            <div className="spec-pt" style={{ left: '62%' }}>
              <div className="spec-pt-val">$312K</div>
              <div className="spec-pt-name">Income Value</div>
              <div className="spec-pt-sub" style={{ color: 'var(--green)' }}>Breakeven</div>
            </div>
            <div className="spec-pt" style={{ left: '100%' }}>
              <div className="spec-pt-val">$349.9K</div>
              <div className="spec-pt-name">List Price</div>
              <div className="spec-pt-sub" style={{ color: 'var(--coral)' }}>Loss</div>
            </div>
          </div>
        </div>
      </div>
      <div className="demo-gap-row">
        <div className="demo-gap-box">
          <div className="demo-gap-hdr">
            <span className="demo-gap-title">Deal Gap</span>
            <span className="demo-gap-only">Only on <strong>DealGap<span className="brand-iq">IQ</span></strong></span>
          </div>
          <div className="demo-gap-pct">&minus;17.4%</div>
          <div className="demo-gap-desc">The list price is <strong>$61K above</strong> your Target Buy. This is the negotiating distance — the discount you&apos;d need to make this deal hit your return target.</div>
        </div>
        <div className="demo-neg">
          <div className="demo-neg-label">Negotiation Difficulty</div>
          <div className="demo-neg-dots">
            <div className="dot dot-on"></div>
            <div className="dot dot-on"></div>
            <div className="dot dot-on"></div>
            <div className="dot dot-off"></div>
            <div className="dot dot-off"></div>
          </div>
          <div className="demo-neg-level">Moderate</div>
          <div className="demo-neg-note">15–20% discounts require skill</div>
        </div>
      </div>
      <div className="demo-verdict">
        <div className="verdict-left">
          <div className="verdict-ring">53</div>
          <div>
            <div className="verdict-title">Verdict: Possible</div>
            <div className="verdict-desc">Tight margins, but potential with negotiation.</div>
          </div>
        </div>
        <div className="seller">
          <div className="seller-label">Seller Motivation</div>
          <div className="seller-dots">
            <div className="seller-dot" style={{ background: 'var(--amber)' }}></div>
            <div className="seller-dot" style={{ background: 'var(--amber)' }}></div>
            <div className="seller-dot" style={{ background: 'var(--amber)' }}></div>
            <div className="seller-dot" style={{ background: 'rgba(255,255,255,.1)' }}></div>
          </div>
          <div className="seller-level">Medium</div>
        </div>
      </div>
      <div className="demo-method">
        <div className="demo-method-label">Analysis Assumptions — This Property</div>
        <div className="demo-method-grid">
          <div className="demo-method-item">
            <div className="demo-method-key">Market Value</div>
            <div className="demo-method-val">$341,200</div>
            <div className="demo-method-src">via Zestimate</div>
          </div>
          <div className="demo-method-item">
            <div className="demo-method-key">Est. Monthly Rent</div>
            <div className="demo-method-val">$2,180</div>
            <div className="demo-method-src">via RentCast</div>
          </div>
          <div className="demo-method-item">
            <div className="demo-method-key">Loan Terms</div>
            <div className="demo-method-val">25% down &middot; 7.2%</div>
            <div className="demo-method-src">30-yr fixed</div>
          </div>
          <div className="demo-method-item">
            <div className="demo-method-key">Operating Costs</div>
            <div className="demo-method-val">7.5% vacancy &middot; 10% mgmt</div>
            <div className="demo-method-src">industry defaults</div>
          </div>
        </div>
        <div className="demo-method-note">Every assumption is editable. Change any variable and the analysis recalculates instantly. <Link href="/about">See how <strong>DealGap<span className="brand-iq">IQ</span></strong> works &rarr;</Link></div>
      </div>
      <div className="demo-metrics">
        <div className="demo-metric">
          <h4 style={{ color: 'var(--green)' }}>Income Value</h4>
          <p>The maximum price the rental income supports. Above it, you lose money every month.</p>
        </div>
        <div className="demo-metric">
          <h4 style={{ color: 'var(--teal)' }}>Target Buy</h4>
          <p>The price that hits your desired return. Change your terms — it recalculates instantly.</p>
        </div>
        <div className="demo-metric">
          <h4 style={{ color: 'var(--coral)' }}>Deal Gap</h4>
          <p>The discount between asking price and Target Buy. The bigger the gap, the better the deal.</p>
        </div>
      </div>
    </div>
  );
}
