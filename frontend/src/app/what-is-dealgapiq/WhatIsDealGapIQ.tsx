'use client'

import React from 'react'
import Link from 'next/link'

const t = {
  bgPrimary: '#000000',
  bgCard: 'rgba(255, 255, 255, 0.04)',
  bgElevated: 'rgba(255, 255, 255, 0.03)',
  teal: '#0EA5E9',
  tealDim: 'rgba(14, 165, 233, 0.12)',
  coral: '#F97066',
  coralDim: 'rgba(249, 112, 102, 0.1)',
  green: '#34D399',
  greenDim: 'rgba(52, 211, 153, 0.1)',
  textPrimary: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textMuted: '#71717A',
  border: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(14, 165, 233, 0.4)',
  fontBody: "'DM Sans', system-ui, sans-serif",
  fontMono: "'Space Mono', monospace",
} as const

const glassCard: React.CSSProperties = {
  background: t.bgCard,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${t.border}`,
}

const sectionLabel: React.CSSProperties = {
  fontFamily: t.fontMono,
  fontSize: '0.7rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: t.teal,
  marginBottom: '1rem',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  lineHeight: 1.2,
  marginBottom: '1.25rem',
  color: t.textPrimary,
}

const sectionSubtitle: React.CSSProperties = {
  fontSize: '1.05rem',
  color: t.textSecondary,
  maxWidth: 640,
  lineHeight: 1.75,
}

const Divider = () => (
  <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />
  </div>
)

const PriceSpectrumCard = () => {
  const prices = [
    { label: 'Target Buy', value: '$289K', width: '55%', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)', color: t.teal },
    { label: 'Income Value', value: '$312K', width: '72%', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)', color: t.green },
    { label: 'List Price', value: '$350K', width: '100%', bg: 'rgba(249,112,102,0.08)', border: 'rgba(249,112,102,0.15)', color: t.coral },
  ]

  return (
    <div style={{
      ...glassCard,
      borderRadius: 16,
      padding: '2.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${t.teal}, ${t.coral})`,
      }} />
      <div style={{
        fontFamily: t.fontMono, fontSize: '0.65rem', letterSpacing: '0.18em',
        textTransform: 'uppercase', color: '#FFFFFF', marginBottom: '2rem',
      }}>
        Price Spectrum — Example Property
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {prices.map((p) => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#FFFFFF', width: 90, textAlign: 'right', flexShrink: 0 }}>
              {p.label}
            </div>
            <div style={{
              width: p.width, height: 32, borderRadius: 6,
              background: p.bg, border: `1px solid ${p.border}`,
              display: 'flex', alignItems: 'center', padding: '0 1rem',
            }}>
              <span style={{ fontFamily: t.fontMono, fontSize: '0.8rem', fontWeight: 700, color: p.color }}>
                {p.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
        <div style={{ flex: 1, height: 1, background: `repeating-linear-gradient(90deg, ${t.teal}, ${t.teal} 4px, transparent 4px, transparent 8px)` }} />
        <div style={{
          background: 'rgba(14,165,233,0.1)', color: t.teal,
          fontFamily: t.fontMono, fontSize: '0.75rem', fontWeight: 700,
          padding: '0.35rem 0.9rem', borderRadius: 20,
          border: '1px solid rgba(14,165,233,0.2)', whiteSpace: 'nowrap',
        }}>
          DEAL GAP −17.4%
        </div>
        <div style={{ flex: 1, height: 1, background: `repeating-linear-gradient(90deg, ${t.teal}, ${t.teal} 4px, transparent 4px, transparent 8px)` }} />
      </div>
    </div>
  )
}

const NumberCard = ({ icon, title, description, iconBg, iconBorder, iconColor }: {
  icon: string; title: string; description: string;
  iconBg: string; iconBorder: string; iconColor: string;
}) => (
  <div style={{
    ...glassCard, borderRadius: 14, padding: '2rem',
    transition: 'border-color 0.3s, transform 0.3s',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: iconBg, border: `1px solid ${iconBorder}`, color: iconColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '1.25rem', fontFamily: t.fontMono, fontWeight: 700, fontSize: '0.85rem',
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.01em', color: t.textPrimary }}>
      {title}
    </h3>
    <p style={{ fontSize: '0.9rem', color: t.textSecondary, lineHeight: 1.65 }}>
      {description}
    </p>
  </div>
)

const StrategyPill = ({ name }: { name: string }) => (
  <div style={{
    ...glassCard, borderRadius: 10, padding: '1.15rem 1.5rem',
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    transition: 'border-color 0.3s',
  }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.teal, flexShrink: 0 }} />
    <span style={{ fontSize: '0.95rem', fontWeight: 500, color: t.textPrimary }}>{name}</span>
  </div>
)

const WorkflowStep = ({ num, label, title, description }: {
  num: string; label: string; title: string; description: string;
}) => (
  <div style={{
    ...glassCard, borderRadius: 14, padding: '2rem',
    transition: 'border-color 0.3s',
  }}>
    <div style={{
      fontFamily: t.fontMono, fontSize: '0.7rem', color: t.teal,
      letterSpacing: '0.12em', marginBottom: '0.75rem',
    }}>
      {num} — {label}
    </div>
    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: t.textPrimary }}>{title}</h3>
    <p style={{ fontSize: '0.88rem', color: t.textSecondary, lineHeight: 1.65 }}>{description}</p>
  </div>
)

const CredItem = ({ text, highlight = false }: { text: string; highlight?: boolean }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.7rem 1rem', background: t.bgElevated,
    border: `1px solid ${highlight ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: 10, fontSize: '0.85rem',
    color: highlight ? t.teal : t.textSecondary, fontWeight: 500,
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: highlight ? t.teal : 'rgba(255,255,255,0.15)',
    }} />
    <span>{text}</span>
  </div>
)

export default function WhatIsDealGapIQ() {
  return (
    <div style={{
      background: t.bgPrimary,
      color: t.textPrimary,
      fontFamily: t.fontBody,
      lineHeight: 1.7,
      minHeight: '100vh',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }

        .wii-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; }
        .wii-grid-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .wii-grid-2col-even { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .wii-strategies-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .wii-founder-body { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3rem; padding: 2rem 3rem 2.5rem; }
        .wii-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
          .wii-grid-2col { grid-template-columns: 1fr; gap: 2.5rem; }
          .wii-grid-3col { grid-template-columns: 1fr; }
          .wii-grid-2col-even { grid-template-columns: 1fr; }
          .wii-strategies-grid { grid-template-columns: 1fr 1fr; }
          .wii-founder-body { grid-template-columns: 1fr; padding: 1.5rem; }
          .wii-stats-row { grid-template-columns: repeat(2, 1fr); }
          .wii-nav-links { display: none !important; }
          .wii-founder-header { padding: 2rem 1.5rem 0 !important; }
        }

        @media (max-width: 480px) {
          .wii-strategies-grid { grid-template-columns: 1fr; }
          .wii-stats-row { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <Link href="/" style={{
          fontFamily: t.fontBody, fontWeight: 700, fontSize: '1.1rem',
          color: t.textPrimary, textDecoration: 'none', letterSpacing: '-0.01em',
        }}>
          DealGap<span style={{ color: t.teal }}>IQ</span>
        </Link>
        <div className="wii-nav-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/what-is-dealgapiq" style={{
            color: t.textPrimary, textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 500,
          }}>
            What is it?
          </Link>
          <Link href="/pricing" style={{
            color: t.textSecondary, textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 500,
          }}>
            Pricing
          </Link>
          <Link href="/login" style={{
            color: t.textSecondary, textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 500,
          }}>
            Login
          </Link>
          <Link href="/register" style={{
            background: t.teal, color: t.bgPrimary,
            padding: '0.5rem 1.25rem', borderRadius: 8,
            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
          }}>
            Start free trial
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header style={{
        padding: '10rem 2rem 6rem', maxWidth: 900, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          ...sectionLabel, fontSize: '0.75rem', letterSpacing: '0.15em',
          marginBottom: '1.5rem', display: 'inline-block',
          animation: 'fadeUp 0.7s ease-out forwards',
        }}>
          What is DealGapIQ?
        </div>
        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 700,
          lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1.75rem',
          animation: 'fadeUp 0.7s ease-out 0.1s forwards', opacity: 0,
        }}>
          The only question that matters:<br />
          <em style={{ fontStyle: 'normal', color: t.teal }}>&ldquo;Is this actually a deal?&rdquo;</em>
        </h1>
        <p style={{
          fontSize: '1.15rem', color: t.textSecondary, maxWidth: 680,
          margin: '0 auto', lineHeight: 1.8,
          animation: 'fadeUp 0.7s ease-out 0.2s forwards', opacity: 0,
        }}>
          DealGapIQ answers it in 60 seconds. Instead of hunting through listings, running spreadsheets,
          and guessing at numbers — analyze any property, any strategy, instantly, and see the exact price
          where the deal works.
        </p>
      </header>

      <Divider />

      {/* DEAL GAP CONCEPT */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={sectionLabel}>The Core Concept</div>
        <div style={sectionTitle}>The Deal Gap — the metric no one else calculates.</div>
        <div className="wii-grid-2col" style={{ marginTop: '3rem' }}>
          <div style={{ fontSize: '1.05rem', color: t.textSecondary, lineHeight: 1.85 }}>
            <p>
              At the core of DealGapIQ is a proprietary concept: <strong style={{ color: t.textPrimary, fontWeight: 600 }}>the Deal Gap</strong> — the distance between the asking price and the price required to hit your target return.
            </p>
            <p style={{ marginTop: '1.25rem' }}>
              That single number tells you whether the deal is worth pursuing, how much to negotiate, and how hard the negotiation will be.
            </p>
            <p style={{ marginTop: '1.25rem' }}>
              This turns real estate from a search game into a <strong style={{ color: t.textPrimary, fontWeight: 600 }}>decision system</strong>. Most investors search the same listings, use the same filters, and compete on speed. DealGapIQ analyzes every property to find the ones that actually are deals — by calculating the exact price that delivers your target return.
            </p>
          </div>
          <PriceSpectrumCard />
        </div>
      </section>

      <Divider />

      {/* THREE NUMBERS */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={sectionLabel}>The Three Price Signals</div>
        <div style={sectionTitle}>Hours of analysis, reduced to three numbers.</div>
        <div style={sectionSubtitle}>
          DealGapIQ reduces complex underwriting into three instant, investor-grade price signals.
          In seconds, you know where you break even, where you profit, and whether the deal is realistic.
        </div>
        <div className="wii-grid-3col" style={{ marginTop: '3rem' }}>
          <NumberCard
            icon="IV" title="Income Value"
            description="The maximum price the property can support before cash flow turns negative. Above this line, you lose money. This is the breakeven boundary no other platform calculates."
            iconBg="rgba(52,211,153,0.1)" iconBorder="rgba(52,211,153,0.15)" iconColor={t.green}
          />
          <NumberCard
            icon="TB" title="Target Buy"
            description="The price that delivers your desired return. Change your return target, loan terms, or expenses — it recalculates instantly. This is your number."
            iconBg="rgba(14,165,233,0.1)" iconBorder="rgba(14,165,233,0.15)" iconColor={t.teal}
          />
          <NumberCard
            icon="DG" title="Deal Gap"
            description="The distance between the asking price and your Target Buy. The built-in profit opportunity and your negotiation distance. The bigger the gap, the better the deal."
            iconBg="rgba(249,112,102,0.1)" iconBorder="rgba(249,112,102,0.15)" iconColor={t.coral}
          />
        </div>
      </section>

      <Divider />

      {/* SIX STRATEGIES */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={sectionLabel}>Six Strategies, One Scan</div>
        <div style={sectionTitle}>Every address analyzed six ways — automatically.</div>
        <div style={sectionSubtitle}>
          This reveals opportunities other investors miss and shows the best strategy for that
          specific property — not a one-size-fits-all analysis.
        </div>
        <div className="wii-strategies-grid" style={{ marginTop: '3rem' }}>
          {['Long-Term Rental', 'Short-Term Rental', 'BRRRR', 'Fix & Flip', 'House Hack', 'Wholesale'].map((s) => (
            <StrategyPill key={s} name={s} />
          ))}
        </div>
      </section>

      <Divider />

      {/* WORKFLOW */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={sectionLabel}>Built for How Investors Work</div>
        <div style={sectionTitle}>Not a calculator. A decision system.</div>
        <div style={sectionSubtitle}>When a deal passes your screen, everything you need to act is already done.</div>
        <div className="wii-grid-2col-even" style={{ marginTop: '3rem' }}>
          <WorkflowStep num="01" label="SCAN" title="Enter an address or scan a property with your phone" description="Field-ready on your smartphone. Pull data on any property the moment it catches your eye." />
          <WorkflowStep num="02" label="SCREEN" title="Set your Buy Box, get an instant Verdict" description="Define your criteria once. Every property gets a PASS, MARGINAL, or BUY verdict in 60 seconds." />
          <WorkflowStep num="03" label="STRESS TEST" title="Adjust variables and see the impact in real time" description="Condition, rehab, location, terms — change any assumption and watch the numbers shift instantly." />
          <WorkflowStep num="04" label="ACT" title="Generate reports, track deals, close with confidence" description="Lender-ready PDFs, side-by-side comparisons, and a full pipeline from first look to closing." />
        </div>
      </section>

      <Divider />

      {/* FOUNDER */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={sectionLabel}>Who Built This</div>
        <div style={{ ...sectionTitle, marginBottom: 0 }}>
          Institutional-grade intelligence — now in every investor&apos;s hands.
        </div>
        <div style={{
          marginTop: '3rem', ...glassCard,
          borderRadius: 24, overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${t.teal}, ${t.teal} 60%, transparent)` }} />
          <div className="wii-founder-header" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '2.5rem 3rem 0' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(14,165,233,0.1)', border: `2px solid ${t.teal}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.5rem', color: t.teal, flexShrink: 0,
            }}>
              BG
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                Brad Geisen
              </div>
              <div style={{ fontSize: '0.85rem', color: t.textMuted, marginTop: '0.15rem' }}>
                Founder &amp; CEO, DealGapIQ
              </div>
            </div>
          </div>
          <div className="wii-founder-body">
            <div style={{ fontSize: '0.95rem', color: t.textSecondary, lineHeight: 1.85 }}>
              <p>
                Over two decades ago, Fannie Mae discovered that Brad&apos;s proprietary data platform knew more
                about their portfolio than their own internal infrastructure — and commissioned him to build
                HomePath.com. He went on to build HomeSteps.com for Freddie Mac, establishing a trusted technology
                partnership with both GSEs.
              </p>
              <p style={{ marginTop: '1.25rem' }}>
                DealGapIQ takes institutional-grade analytical rigor — the kind previously available only
                to large institutions and government agencies — and puts it in the hands of every individual investor.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.25rem' }}>
              <CredItem text="Founded Foreclosure.com" highlight />
              <CredItem text="Built HomePath.com for Fannie Mae" highlight />
              <CredItem text="Built HomeSteps.com for Freddie Mac" highlight />
              <CredItem text="30+ Year GSE Partnership" />
            </div>
          </div>
          <div className="wii-stats-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { num: '35+', label: 'Years in RE Data' },
              { num: '80+', label: 'Companies' },
              { num: '30+', label: 'Year GSE Partnership' },
              { num: '500+', label: 'Projects Built' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                textAlign: 'center', padding: '1.5rem 1rem',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}>
                <div style={{
                  fontFamily: t.fontMono, fontSize: '1.5rem', fontWeight: 700,
                  color: t.teal, lineHeight: 1, marginBottom: '0.35rem',
                }}>
                  {stat.num}
                </div>
                <div style={{
                  fontSize: '0.68rem', color: t.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* INVESTOR EDGE */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={sectionLabel}>The Investor Edge</div>
        <div style={sectionTitle}>
          Most investors analyze deals.<br />Professional investors eliminate bad deals fast.
        </div>
        <div style={{ ...sectionSubtitle, marginBottom: '2.5rem' }}>
          DealGapIQ lets you pass on 90% of properties in minutes, focus only on the ones that meet
          your criteria, and make confident offers backed by real numbers. Less time underwriting. Fewer
          bad purchases. Faster portfolio growth. Stronger negotiations.
        </div>
      </section>

      {/* BOTTOM LINE CTA */}
      <div style={{ textAlign: 'center', padding: '6rem 2rem 8rem' }}>
        <h2 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700,
          letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '1rem',
          color: t.textPrimary,
        }}>
          Every property has a Deal Gap.<br />Only DealGapIQ measures it.
        </h2>
        <p style={{ fontSize: '1.05rem', color: t.textSecondary, marginBottom: '2.5rem' }}>
          And once you see it, you&apos;ll never analyze real estate the old way again.
        </p>
        <Link href="/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: t.teal, color: t.bgPrimary, padding: '0.85rem 2rem',
          borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
        }}>
          Start Free — Analyze Your First Property
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
        <div style={{ fontSize: '0.82rem', color: t.textMuted, marginTop: '1rem' }}>
          5 free analyses per month · No credit card required
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{
        padding: '3rem 2rem', borderTop: `1px solid ${t.border}`, textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.8rem', color: t.textMuted }}>
          &copy; 2026 DealGapIQ. All rights reserved. Professional use only. Not a lender.
        </p>
      </footer>
    </div>
  )
}
