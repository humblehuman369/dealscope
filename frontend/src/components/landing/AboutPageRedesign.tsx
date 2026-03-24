'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './about-page.css';

const STRATEGIES = [
  { label: 'Long-Term Rental', cls: 'tag-ltr' },
  { label: 'Short-Term Rental', cls: 'tag-str' },
  { label: 'BRRRR', cls: 'tag-brrrr' },
  { label: 'Fix & Flip', cls: 'tag-flip' },
  { label: 'House Hack', cls: 'tag-hack' },
  { label: 'Wholesale', cls: 'tag-wholesale' },
];

const PRINCIPLES = [
  { num: '01', title: 'Numbers Over Narratives', desc: 'Every property has a story someone wants to sell you. We strip away the story and show you the math. If the numbers work, pursue it. If they don\u2019t, move on.' },
  { num: '02', title: 'Transparency Over Black Boxes', desc: 'Every assumption in every analysis is visible and editable. We don\u2019t hide our methodology behind a proprietary wall \u2014 we show you exactly how we arrived at every number.' },
  { num: '03', title: 'Decisions Over Browsing', desc: 'We\u2019re not here to help you browse listings. We\u2019re here to help you make investment decisions with confidence \u2014 backed by cross-referenced data and professional-grade analytics.' },
  { num: '04', title: 'Speed Over Spreadsheets', desc: 'The average investor spends 45 minutes per property on a spreadsheet. DealGapIQ gives you a better answer in seconds \u2014 so you can analyze more deals and find the ones worth pursuing.' },
];

const CREDS = [
  { value: '35+ Years', label: 'Real Estate Data' },
  { value: '30+ Years', label: 'GSE Partnerships' },
  { value: '35+ Years', label: 'Real Estate Investor' },
];

const MARKETING_ITEMS = [
  'Curated photos designed to sell an emotion',
  'Agent remarks written to generate showings',
  'Zestimates built for homeowners, not investors',
  'No rental income data',
  'No cash flow or debt service analysis',
  'No concept of what a property is worth as an investment',
  'Designed to help you fall in love with a property',
];

const INVESTOR_ITEMS = [
  'Numbers from 5 cross-referenced data sources',
  'IQ Estimate built on investor-grade methodology',
  'Rental income analysis with neighborhood comps',
  'Full cash flow, DSCR, and cap rate breakdown',
  'Target Buy price for confident offer negotiations',
  'Income Value to know your breakeven ceiling',
  'Designed to help you make a decision, not a feeling',
];

export function AboutPageRedesign() {
  const router = useRouter();
  const [founderImgError, setFounderImgError] = useState(false);

  const handleAnalyzeClick = () => {
    router.push('/search');
  };

  return (
    <div style={{ background: 'var(--surface-base)', color: 'var(--text-body)', lineHeight: 1.6, overflowX: 'hidden' }}>

      {/* NAV */}
      <nav className="dgiq-nav">
        <Link href="/" className="dgiq-logo">
          <span className="logo-deal">Deal</span>
          <span className="logo-gap">Gap</span>
          <span className="logo-iq">IQ</span>
        </Link>
        <button className="nav-cta" onClick={handleAnalyzeClick}>
          Analyze a Property Free
        </button>
      </nav>

      {/* HERO */}
      <section className="about-hero">
        <div className="section-label">About DealGapIQ</div>
        <h1>
          Built for Investors.<br />
          <span className="line2">Not Browsers.</span>
        </h1>
        <p className="about-hero-sub">
          Every property listing you&apos;ve ever seen was designed to do one thing: sell you on that property.
          The photos, the descriptions, the agent remarks &mdash; it&apos;s all marketing.
          DealGapIQ was built for a completely different person with a completely different question.
        </p>
      </section>

      {/* ORIGIN STORY */}
      <section className="origin">
        <div className="origin-inner">
          <h2>Why DealGapIQ Exists</h2>
          <div className="origin-text">
            <p>
              Every property listing you&apos;ve ever seen was designed to do one thing:{' '}
              <strong>sell you on that property</strong>. The photos are staged. The descriptions
              are polished. The agent remarks are written to generate showings. It&apos;s marketing
              &mdash; and it&apos;s very good at what it does.
            </p>
            <p>
              But if you&apos;re a residential real estate investor, marketing is noise. You don&apos;t
              need to know that the kitchen has &ldquo;stunning granite countertops.&rdquo; You need to
              know whether this property{' '}
              <span className="sky">cash flows at the asking price</span>. You need to know how far
              that asking price is from what the deal is actually worth as an investment. You need
              numbers, not narratives.
            </p>
            <p>
              That&apos;s the gap DealGapIQ was built to fill.{' '}
              <strong>This isn&apos;t a listing site. It&apos;s a decision engine.</strong> It takes
              any residential property in the country and runs the numbers the way a seasoned investor
              would &mdash; rental income, operating expenses, debt service coverage, market comparables
              &mdash; then delivers a Verdict in seconds.
            </p>
            <p>
              No spin. No sales pitch. Just the math.
            </p>
          </div>
        </div>
      </section>

      {/* THE TWO LENSES */}
      <section className="about-problem">
        <div className="about-problem-inner">
          <h2>Two Ways to Look at a Property</h2>
          <p className="about-problem-sub">
            The same property tells a completely different story depending on who&apos;s looking
            &mdash; and what they&apos;re looking for.
          </p>

          <div className="lens-grid">
            {/* Marketing Lens */}
            <div className="lens-card lens-marketing">
              <div className="lens-header">
                <div className="lens-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C8CA0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <div className="lens-title">The Marketing Lens</div>
                  <div className="lens-subtitle">How listing sites see a property</div>
                </div>
              </div>
              <div className="lens-question">&ldquo;Do I love this kitchen?&rdquo;</div>
              <ul className="lens-list">
                {MARKETING_ITEMS.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Investor Lens */}
            <div className="lens-card lens-investor">
              <div className="lens-header">
                <div className="lens-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div>
                  <div className="lens-title">The Investor Lens</div>
                  <div className="lens-subtitle">How DealGapIQ sees a property</div>
                </div>
              </div>
              <div className="lens-question">&ldquo;Does this property cash flow?&rdquo;</div>
              <ul className="lens-list">
                {INVESTOR_ITEMS.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE BUILT */}
      <section className="what-we-built">
        <div className="what-inner">
          <h2>The Three Numbers Listing Sites Will Never Show You</h2>
          <p className="what-sub">
            These are the proprietary thresholds that power every DealGapIQ Verdict &mdash;
            the numbers that separate an investment decision from a marketing brochure.
          </p>

          <div className="pillars">
            <div className="pillar">
              <div className="pillar-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                  <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <h3>Target Buy</h3>
              <p>The recommended offer price &mdash; what you should actually pay based on investment returns, not what the seller hopes to get based on market hype.</p>
            </div>
            <div className="pillar">
              <div className="pillar-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18" /><path d="M4 7h16" />
                  <circle cx="4" cy="14" r="3" /><circle cx="20" cy="14" r="3" />
                  <path d="M8 21H16" />
                </svg>
              </div>
              <h3>Income Value</h3>
              <p>The maximum price where cash flow stays positive. Your breakeven ceiling. Go above it, and the property costs you money every month.</p>
            </div>
            <div className="pillar">
              <div className="pillar-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <h3>Deal Gap</h3>
              <p>The percentage distance between the asking price and your Target Buy. This single number tells you whether there&apos;s a deal here &mdash; or a trap.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STRATEGIES */}
      <section className="about-strategies">
        <div className="about-strategies-inner">
          <h2>Six Strategies. One Platform.</h2>
          <p className="about-strategies-sub">
            Every property is analyzed against six investment strategies, because the right deal depends on how you plan to execute.
          </p>
          <div className="strategy-tags">
            {STRATEGIES.map((s) => (
              <span className={`strategy-tag ${s.cls}`} key={s.cls}>{s.label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="about-founder">
        <div className="about-founder-inner">
          <div className="about-founder-card">
            <div className="about-founder-photo">
              {founderImgError ? (
                <span>BG</span>
              ) : (
                <img
                  src="/brad-geisen.png"
                  alt="Brad Geisen"
                  onError={() => setFounderImgError(true)}
                />
              )}
            </div>
            <div>
              <div className="about-founder-name">Brad Geisen</div>
              <div className="about-founder-role">Founder &amp; CEO</div>
              <p className="about-founder-bio">
                I spent 35 years in real estate data &mdash; building HomePath.com for Fannie Mae,
                HomeSteps.com for Freddie Mac, and founding Foreclosure.com. Today there&apos;s more
                data than ever, but investors still spend hours piecing it together. DealGapIQ was
                built to think like an investor, not market like an agent.
              </p>
              <div className="about-founder-creds">
                {CREDS.map((c, i) => (
                  <div className="about-cred" key={i}>
                    <div className="about-cred-value">{c.value}</div>
                    <div className="about-cred-label">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DESIGN PHILOSOPHY */}
      <section className="philosophy">
        <div className="philosophy-inner">
          <h2>What We Believe</h2>

          <div className="principles">
            {PRINCIPLES.map((p) => (
              <div className="principle" key={p.num}>
                <div className="principle-number">{p.num}</div>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="about-cta">
        <h2>Ready to See a Property Through<br />an Investor&apos;s Eyes?</h2>
        <p className="about-cta-sub">
          Paste any address. Get your Target Buy, Income Value, and Deal Gap &mdash;
          the three numbers no listing site will ever show you.
        </p>
        <button className="cta-primary" onClick={handleAnalyzeClick}>
          Analyze Your First Property Free →
        </button>
        <p className="about-cta-meta">
          No credit card · No account needed · Results in seconds
        </p>
      </section>

      {/* FOOTER */}
      <footer className="dgiq-footer">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="footer-logo">
            <span className="logo-deal">Deal</span>
            <span className="logo-gap">Gap</span>
            <span className="logo-iq">IQ</span>
          </div>
        </Link>
        <p>© 2026 DealGapIQ. All rights reserved.</p>
        <div className="footer-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/help">Help</Link>
        </div>
      </footer>
    </div>
  );
}

export default AboutPageRedesign;
