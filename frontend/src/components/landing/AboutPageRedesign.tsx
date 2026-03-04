'use client'

import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import Link from 'next/link'
import './about-page.css'

// ── SVG Icon Components ──

const BarChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="20" x2="4" y2="14" /><line x1="10" y1="20" x2="10" y2="8" />
    <line x1="16" y1="20" x2="16" y2="4" /><line x1="22" y1="20" x2="22" y2="10" />
  </svg>
)

const CrosshairIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
  </svg>
)

const BoltIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
)

const WrenchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
)

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
)

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// ── Reveal Animation ──

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('visible')
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="ap-reveal" style={style}>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="ap-divider" />
}

// ── Data Arrays ──

interface Strategy {
  name: string
  desc: string
  Icon: React.ComponentType
}

const strategies: Strategy[] = [
  { name: 'Long-Term Rental', desc: 'Traditional buy-and-hold cashflow', Icon: HomeIcon },
  { name: 'Short-Term Rental', desc: 'Airbnb / vacation income', Icon: SunIcon },
  { name: 'BRRRR', desc: 'Buy, rehab, rent, refinance, repeat', Icon: RefreshIcon },
  { name: 'Fix & Flip', desc: 'Purchase, renovate, sell for profit', Icon: WrenchIcon },
  { name: 'House Hack', desc: 'Owner-occupy + rent spare units', Icon: KeyIcon },
  { name: 'Wholesale', desc: 'Contract assignment for quick equity', Icon: FileIcon },
]

const dataFeatures = [
  { title: 'Verified Listing Data', desc: 'Property details, market values, and pricing are sourced from authoritative real estate databases — never guessed.' },
  { title: 'Comparable Rent Estimates', desc: 'Rent estimates come from RentCast, with the ability to compare similar listings and adjust to your own expectations.' },
  { title: 'Editable Loan Terms', desc: 'Every calculation uses the down payment, rate, and term you set. Change a number, recalculate instantly.' },
  { title: 'Operating Cost Defaults', desc: 'Industry-standard expense ratios as defaults — vacancy, management, maintenance, insurance — all visible, all editable.' },
]

const beforeItems = [
  'Spreadsheet chaos: every analyst has a different template',
  'Hours per deal just to figure out whether to look twice',
  'No single metric to compare across properties',
  'Gut instinct disguised as analysis',
  'Assumptions buried in formulas nobody audits',
  'Analysis paralysis leads to missed opportunities',
]

const afterItems = [
  'Income Value, Target Buy, and Deal Gap in seconds',
  'Six investment strategies evaluated automatically',
  'Every assumption visible, editable, defensible',
  'AI-generated deal narratives in plain English',
  'Downloadable Excel proformas for lender-ready analysis',
  'Consistent framework across every property you evaluate',
]

const steps = [
  { num: '01', title: 'Enter an Address', desc: 'Type any address or scan a property with your phone. The moment it resolves, your analysis is underway.' },
  { num: '02', title: 'Get an Instant Verdict', desc: 'In seconds, DealGapIQ delivers your three numbers: Income Value, Target Buy, and Deal Gap — with a plain-English verdict.' },
  { num: '03', title: 'Adjust the Terms', desc: 'Edit assumptions live — rates, terms, down payment, rent estimates — and watch every number recalculate instantly.' },
  { num: '04', title: 'Close with Confidence', desc: 'Generate Excel proformas, download full reports, and make data-backed offers with the numbers to prove your case.' },
]

const founderStats = [
  { num: '35+', label: 'Years in RE Data' },
  { num: '30+', label: 'Years GSE Partnerships' },
  { num: '500+', label: 'RE Projects' },
  { num: '80+', label: 'Companies' },
]

// ── Main Component ──

export function AboutPageRedesign() {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="about-page">
      {/* HERO */}
      <section className="about-hero" style={{ minHeight: '60vh', paddingBottom: '60vh' }}>
        <div className="hero-badge"><span className="dot" /> Decision-Grade Intelligence</div>
        <h1>The metric no one else <em>calculates.</em></h1>
        <p className="hero-sub">
          DealGapIQ reduces complex investment analysis into three proprietary numbers — powered by real market data, transparent assumptions, and 35 years of institutional real estate intelligence.
        </p>
        <div className="hero-actions">
          <Link href="/search" className="btn-primary">Analyze a Property</Link>
          <button className="btn-ghost" onClick={() => scrollToSection('how-it-works')}>
            See How It Works
          </button>
        </div>
        <div className="hero-scroll"><span>Scroll</span><div className="arrow" /></div>
      </section>

      <Divider />

      {/* DEAL GAP */}
      <section className="metric-section">
        <div className="ap-container">
          <div className="metric-grid">
            <Reveal>
              <div className="section-label">The Core Concept</div>
              <h2 className="section-title">What is the<br />Deal Gap?</h2>
              <p className="section-desc" style={{ marginBottom: 20 }}>
                The <strong>Deal Gap</strong> is a proprietary concept — the distance between the asking price and what the numbers say you should actually pay.
              </p>
              <p className="section-desc">
                That single number tells you whether the deal is worth pursuing, how much room to negotiate, and how hard the numbers work in your favor — <em>before</em> you spend a single hour on due diligence.
              </p>
            </Reveal>
            <Reveal style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div className="orbit-ring orbit-2"><div className="orbit-dot" /></div>
              <div className="orbit-ring orbit-1"><div className="orbit-dot" /></div>
              <div className="metric-circle">
                <div className="big-number">17.4%</div>
                <div className="label">Deal Gap</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Divider />

      {/* THREE NUMBERS */}
      <section style={{ padding: '120px 24px' }}>
        <div className="ap-container">
          <Reveal style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <div className="section-label" style={{ textAlign: 'center' }}>Proprietary Metrics</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>Hours of analysis, reduced<br />to three numbers.</h2>
            <p className="section-desc" style={{ textAlign: 'center', margin: '0 auto' }}>
              DealGapIQ reduces complex underwriting into three investor-grade price signals. In seconds, you know whether you should even look twice.
            </p>
          </Reveal>
          <Reveal>
            <div className="numbers-grid">
              <div className="number-card">
                <div className="card-icon"><BarChartIcon /></div>
                <h3>Income Value</h3>
                <p>The maximum purchase price where cash flow stays positive. Above this line, you lose money every month. This is the breakeven boundary — the ceiling on what you should pay.</p>
              </div>
              <div className="number-card">
                <div className="card-icon"><CrosshairIcon /></div>
                <h3>Target Buy</h3>
                <p>The price that delivers your desired return. Set your target GRM, rent, adjust loan terms, and let the engine calculate. This is your number.</p>
              </div>
              <div className="number-card">
                <div className="card-icon"><BoltIcon /></div>
                <h3>Deal Gap</h3>
                <p>The distance between the asking price and your Target Buy. You&apos;ve found your profit opportunity and your negotiation advantage. The bigger the gap, the better the deal.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="steps-section" style={{ padding: '120px 24px' }}>
        <div className="ap-container">
          <Reveal style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <div className="section-label" style={{ textAlign: 'center' }}>Workflow</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>From first look to confident offer — in four steps.</h2>
          </Reveal>
          <Reveal>
            <div className="steps-grid">
              {steps.map((s, i) => (
                <div className="step" key={s.num}>
                  <div className="step-num">{s.num}</div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                  {i < steps.length - 1 && <span className="step-connector">&rarr;</span>}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* SIX STRATEGIES */}
      <section style={{ padding: '120px 24px' }}>
        <div className="ap-container">
          <Reveal>
            <div className="section-label">Strategy Engine</div>
            <h2 className="section-title">Every address analyzed<br />six ways — automatically.</h2>
            <p className="section-desc">No more one-size-fits-all analysis. DealGapIQ evaluates every property through six distinct investment lenses and surfaces the best strategy for that specific address.</p>
          </Reveal>
          <Reveal>
            <div className="strategies-grid">
              {strategies.map(({ name, desc, Icon }) => (
                <div className="strategy-pill" key={name}>
                  <div className="s-icon"><Icon /></div>
                  <div>
                    <div className="s-name">{name}</div>
                    <div className="s-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* TRANSPARENT DATA */}
      <section style={{ padding: '120px 24px' }}>
        <div className="ap-container">
          <Reveal style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <div className="section-label" style={{ textAlign: 'center' }}>Data Philosophy</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>Transparent data.<br />Editable assumptions.<br />No black boxes.</h2>
            <p className="section-desc" style={{ textAlign: 'center', margin: '0 auto' }}>
              Every number in DealGapIQ comes from a verifiable source or an assumption you can see and change. Here&apos;s exactly what powers the analysis.
            </p>
          </Reveal>
          <Reveal>
            <div className="data-features">
              {dataFeatures.map(f => (
                <div className="data-feature" key={f.title}>
                  <div className="check"><CheckIcon /></div>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* BEFORE / AFTER */}
      <section style={{ padding: '120px 24px' }}>
        <div className="ap-container">
          <Reveal style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <div className="section-label" style={{ textAlign: 'center' }}>The Difference</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>How investors analyzed deals before DealGapIQ — and after.</h2>
          </Reveal>
          <Reveal>
            <div className="compare-grid">
              <div className="compare-card before">
                <div className="compare-label">Before DealGapIQ</div>
                <ul>{beforeItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
              <div className="compare-card after">
                <div className="compare-label">With DealGapIQ</div>
                <ul>{afterItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* FOUNDER */}
      <section className="founder-section">
        <div className="ap-container">
          <Reveal><div className="section-label">Built by Experience</div></Reveal>
          <Reveal>
            <div className="founder-grid">
              <div className="founder-portrait"><div className="initials">BG</div></div>
              <div className="founder-info">
                <h3>Brad Geisen</h3>
                <div className="founder-title">Founder &amp; CEO, DealGapIQ</div>
                <p>Brad built the digital infrastructure behind how America finds and values distressed real estate. He founded Foreclosure.com, built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac, and has maintained GSE partnerships spanning three decades.</p>
                <p>DealGapIQ distills that same institutional-grade analytical rigor — the kind previously available only to large institutions and professional investors — and puts it in the hands of every investor, instantly.</p>
                <div className="founder-stats">
                  {founderStats.map(s => (
                    <div className="founder-stat" key={s.label}>
                      <div className="num">{s.num}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* PRICING */}
      <section className="pricing-section" style={{ padding: '120px 24px' }}>
        <div className="ap-container">
          <Reveal style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <div className="section-label" style={{ textAlign: 'center' }}>Pricing</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>Start free.<br />Go Pro when you&apos;re ready.</h2>
          </Reveal>
          <Reveal>
            <div className="pricing-grid">
              <div className="price-card free">
                <div className="plan-name">Starter</div>
                <div className="price">$0</div>
                <div className="price-note">Free forever</div>
                <ul>
                  <li>5 property analyses per month</li>
                  <li>All six strategy calculations</li>
                  <li>Full Verdict + Deal Gap</li>
                  <li>Rent + sale comps</li>
                </ul>
                <Link href="/register" className="price-btn">Get Started Free</Link>
              </div>
              <div className="price-card pro">
                <div className="plan-name">Pro</div>
                <div className="price">$29<span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.55)' }}>/mo</span></div>
                <div className="price-note">Billed annually &middot; 7-day free trial</div>
                <ul>
                  <li>Unlimited property analyses</li>
                  <li>Downloadable Excel proforma</li>
                  <li>AI-generated deal narratives</li>
                  <li>Priority data access</li>
                </ul>
                <Link href="/register" className="price-btn">Start 7-Day Trial</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <Reveal style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2>One scan. Your number.</h2>
          <p>Enter any address and know if it&apos;s worth your time — in under 60 seconds.</p>
          <Link href="/search" className="btn-primary" style={{ fontSize: 18, padding: '16px 40px' }}>
            Analyze Your First Property &rarr;
          </Link>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="ap-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="fl-logo">DealGapIQ</div>
            <div>&copy; 2026 DealGapIQ. All rights reserved.</div>
          </div>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/help">Help Center</Link>
            <a href="mailto:support@dealgapiq.com">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
