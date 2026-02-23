'use client';

import Link from 'next/link';

export function CtaSection() {
  return (
    <div className="cta-wrap">
      <h2>
        You Know the Three Numbers.
        <br />
        Now Run Them on a Real Property.
      </h2>
      <p>Income Value. Target Buy. Deal Gap. See yours in 60 seconds &mdash; free.</p>
      <Link href="/register" className="cta-btn">
        Analyze Your First Property{' '}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
      <div className="cta-pricing">
        <div className="card-sm cta-tier">
          <div className="cta-tier-name">Starter</div>
          <div className="cta-tier-price">Free</div>
          <div className="cta-tier-desc">5 analyses / month</div>
        </div>
        <div className="card-sm cta-tier" style={{ borderColor: 'rgba(14,165,233,.3)' }}>
          <div className="cta-tier-name">Pro</div>
          <div className="cta-tier-price">$29/mo</div>
          <div className="cta-tier-desc">Unlimited analyses + Excel export</div>
        </div>
      </div>
      <div className="cta-sub">
        No credit card required to start &middot; <Link href="/pricing">Full pricing details</Link>
      </div>
    </div>
  );
}
