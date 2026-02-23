'use client';

import Link from 'next/link';

export function FunnelSection() {
  return (
    <section className="sec">
      <div className="label">How Pros Invest</div>
      <div className="sec-title">Experienced Investors Pass on 90% of Deals in Minutes.<br />Now So Can You.</div>
      <div className="sec-sub">Most properties aren&apos;t worth your time. The Verdict screen tells you which ones are — so you only go deep when it matters.</div>
      <div className="funnel">
        <div className="funnel-step">
          <div className="funnel-num">100</div>
          <div className="funnel-title">Properties Scanned</div>
          <div className="funnel-desc">Quick screen on every property that catches your eye</div>
        </div>
        <div className="funnel-step">
          <div className="funnel-num">12</div>
          <div className="funnel-title">Worth Exploring</div>
          <div className="funnel-desc">Deals that pass the screen get your full attention and deep analysis</div>
        </div>
        <div className="funnel-step">
          <div className="funnel-num">3</div>
          <div className="funnel-title">Deals Closed</div>
          <div className="funnel-desc">Confident offers backed by full financial analysis</div>
        </div>
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--muted)', textAlign: 'center', marginTop: '1.5rem' }}>Typical monthly workflow for active investors</div>
      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link href="/register" className="cta-btn">Start Scanning Free &rarr;</Link>
        <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.75rem' }}>No credit card required</div>
      </div>
    </section>
  );
}
