'use client';

import React from 'react';

const STRATEGY_BARS = [
  { color: '#0465f2' },
  { color: '#8b5cf6' },
  { color: '#f97316' },
  { color: '#ec4899' },
  { color: '#0EA5E9' },
  { color: '#84cc16' },
];

const STRATEGY_TOOLS = [
  { color: '#0465f2', name: 'Rent Comps', desc: 'Neighborhood rental analysis' },
  { color: '#8b5cf6', name: 'DealMaker', desc: 'Negotiate the optimal price' },
  { color: '#f97316', name: 'Appraisal', desc: 'Professional-grade valuation' },
  { color: '#ec4899', name: 'Excel Export', desc: 'Full proforma download' },
];

export function HowItWorksSection() {
  return (
    <section className="how">
      <div className="how-inner">
        <div className="section-label">How It Works</div>
        <h2>Two Steps. Zero Wasted Time.</h2>
        <p className="how-sub">
          Most investors waste hours on properties that never pencil out.
          DealGapIQ separates the filter from the toolkit — so you only go deep on deals worth pursuing.
        </p>

        <div className="steps-layout">
          {/* STEP 1 */}
          <div className="step-card">
            <div className="step-badges">
              <span className="badge-solid badge-sky">STEP 1</span>
              <span className="badge-outline badge-outline-sky">THE VERDICT</span>
            </div>
            <h3>The Smell Test</h3>
            <p className="step-card-desc">
              Search or paste any address. In seconds, know if a deal is worth your time — before you spend hours on it.
              If the numbers don&apos;t work, move on. No account needed for your first scan.
            </p>

            <div className="step-pills">
              <span className="step-pill"><span className="pill-dot pill-sky" />Instant DealGap score</span>
              <span className="step-pill"><span className="pill-dot pill-sky" />Cross-referenced valuations</span>
              <span className="step-pill"><span className="pill-dot pill-sky" />Income Value + Target Buy</span>
            </div>

            <div className="verdict-card">
              <div className="vc-header">
                <span className="vc-label">VERDICT RESULT</span>
                <span className="vc-label">2.4 seconds</span>
              </div>
              <div className="vc-score">+12.4%</div>
              <div className="vc-badge">Deal Gap — Worth Pursuing</div>
              <div className="vc-prices">
                <div className="vc-price">
                  <div className="vc-price-label text-green">TARGET BUY</div>
                  <div className="vc-price-value">$668,999</div>
                  <div className="vc-price-sub">Positive Cashflow</div>
                </div>
                <div className="vc-price">
                  <div className="vc-price-label text-yellow">INCOME VALUE</div>
                  <div className="vc-price-value">$704,209</div>
                  <div className="vc-price-sub">Breakeven</div>
                </div>
                <div className="vc-price">
                  <div className="vc-price-label text-red">MARKET PRICE</div>
                  <div className="vc-price-value">$807,600</div>
                  <div className="vc-price-sub">Market Value or List Price</div>
                </div>
              </div>
            </div>
          </div>

          {/* FUNNEL */}
          <div className="funnel">
            <div className="funnel-line" />
            <div className="funnel-text funnel-text-top">ALL DEALS</div>
            <div className="funnel-shape">
              <svg width="36" height="100" viewBox="0 0 36 100">
                <path
                  d="M2,0 L34,0 L24,100 L12,100 Z"
                  fill="rgba(14,165,233,0.06)"
                  stroke="rgba(14,165,233,0.2)"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div className="funnel-text funnel-text-bottom">WORTH IT</div>
            <div className="funnel-line" />
          </div>

          {/* STEP 2 */}
          <div className="step-card">
            <div className="step-badges">
              <span className="badge-solid badge-green">STEP 2</span>
              <span className="badge-outline badge-outline-green">THE STRATEGY</span>
            </div>
            <h3>The Deep Dive</h3>
            <p className="step-card-desc">
              For deals worth pursuing, DealGapIQ gives you professional-grade tools to optimize revenue,
              negotiate the right price, and make the deal a reality. Everything you need — in one place.
            </p>

            <div className="step-pills">
              <span className="step-pill"><span className="pill-dot pill-green" />Appraisal-grade comp tools</span>
              <span className="step-pill"><span className="pill-dot pill-green" />DealMaker price negotiation</span>
              <span className="step-pill"><span className="pill-dot pill-green" />6 investment strategies analyzed</span>
              <span className="step-pill"><span className="pill-dot pill-green" />Downloadable Excel proforma</span>
            </div>

            <div className="se-card">
              <div className="se-header">
                <span className="se-header-label">STRATEGY ENGINE</span>
                <span className="se-header-pro">Pro Tools</span>
              </div>
              <div className="se-bars">
                {STRATEGY_BARS.map((bar, i) => (
                  <span key={i} className="se-bar" style={{ background: bar.color }} />
                ))}
              </div>
              <div className="se-tools">
                {STRATEGY_TOOLS.map((tool, i) => (
                  <div className="se-tool" key={i}>
                    <span className="se-dot" style={{ background: tool.color }} />
                    <div>
                      <div className="se-tool-name">{tool.name}</div>
                      <div className="se-tool-desc">{tool.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
