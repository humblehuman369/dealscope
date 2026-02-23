'use client'

import React from 'react'
import Link from 'next/link'

const t = {
  bgPrimary: '#000000',
  teal: '#0EA5E9',
  coral: '#F97066',
  green: '#34D399',
  amber: '#FBBF24',
  textPrimary: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textMuted: '#71717A',
  border: 'rgba(255, 255, 255, 0.1)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderAccent: 'rgba(14, 165, 233, 0.4)',
  fontBody: "'DM Sans', system-ui, sans-serif",
  fontMono: "'Space Mono', monospace",
} as const

const glow = {
  sm: '0 0 15px rgba(14,165,233,0.05), 0 0 30px rgba(14,165,233,0.02)',
  md: '0 0 20px rgba(14,165,233,0.06), 0 0 40px rgba(14,165,233,0.03)',
  lg: '0 0 30px rgba(14,165,233,0.08), 0 0 60px rgba(14,165,233,0.04)',
} as const

const blackCard = (size: 'sm' | 'md' | 'lg' = 'md', radius = 14): React.CSSProperties => ({
  background: t.bgPrimary,
  border: `1px solid ${t.border}`,
  borderRadius: radius,
  boxShadow: glow[size],
})

const monoLabel: React.CSSProperties = {
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

const sectionWrap: React.CSSProperties = {
  padding: '5rem 2rem',
  maxWidth: 1100,
  margin: '0 auto',
}

const dividerWrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }

const DividerB = () => (
  <div style={dividerWrap}>
    <div style={{
      height: 1,
      background: `linear-gradient(90deg, transparent, ${t.teal} 20%, ${t.teal} 80%, transparent)`,
      boxShadow: '0 0 8px rgba(14,165,233,0.5), 0 0 20px rgba(14,165,233,0.25), 0 0 50px rgba(14,165,233,0.08)',
    }} />
  </div>
)

const DividerC = () => (
  <div style={dividerWrap}>
    <div style={{
      height: 2,
      background: `linear-gradient(90deg, ${t.teal} 0%, ${t.teal} 40%, transparent 100%)`,
      boxShadow: '0 0 10px rgba(14,165,233,0.5), 0 0 30px rgba(14,165,233,0.2)',
    }} />
  </div>
)

const DividerE = () => (
  <div style={dividerWrap}>
    <div style={{
      height: 1,
      background: `linear-gradient(90deg, transparent, ${t.teal} 15%, ${t.green} 50%, ${t.coral} 85%, transparent)`,
      boxShadow: '0 0 8px rgba(14,165,233,0.4), 0 0 20px rgba(14,165,233,0.15)',
    }} />
  </div>
)

const DemoCard = () => {
  const mono = (size: number, extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: t.fontMono, fontSize: `${size}rem`, letterSpacing: '0.12em',
    textTransform: 'uppercase', ...extra,
  })

  return (
    <div style={{ ...blackCard('lg', 20), overflow: 'hidden' }}>
      <div style={{ padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>1847 Oakridge Drive, Tampa, FL 33612</div>
          <div style={{ fontSize: '0.8rem', color: t.textMuted }}>3 bed · 2 bath · 1,640 sqft · Built 2004</div>
        </div>
        <div>
          <div style={{ ...mono(0.6, { color: t.textMuted, textAlign: 'right', marginBottom: '0.15rem' }) }}>List Price</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>$349,900</div>
        </div>
      </div>

      <div style={{ padding: '2rem 2rem 1.75rem', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ ...mono(0.6, { color: '#FFFFFF', letterSpacing: '0.15em', marginBottom: '1.5rem' }) }}>Your Price Spectrum</div>
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', gap: 0 }}>
            <div style={{ height: 1, background: t.teal, flex: 1, maxWidth: 80 }} />
            <div style={{ ...mono(0.68, { fontWeight: 700, color: t.teal, padding: '0 0.6rem', whiteSpace: 'nowrap' }) }}>DEAL GAP  17.4%</div>
            <div style={{ height: 1, background: t.teal, flex: 1, maxWidth: 80 }} />
          </div>
          <div style={{ height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${t.teal}, ${t.green} 55%, ${t.amber} 78%, ${t.coral})`, position: 'relative' }}>
            {[{ left: '30%', color: t.teal }, { left: '62%', color: t.green }, { left: '97%', color: t.coral }].map((m, i) => (
              <div key={i} style={{ position: 'absolute', top: -4, left: m.left, width: 2, height: 18, borderRadius: 1, background: m.color }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
            {[
              { val: '$289K', name: 'TARGET BUY', sub: 'Profit', subColor: t.teal, align: 'left' as const },
              { val: '$312K', name: 'INCOME VALUE', sub: 'Breakeven', subColor: t.green, align: 'center' as const },
              { val: '$349.9K', name: 'LIST PRICE', sub: 'Loss', subColor: t.coral, align: 'right' as const },
            ].map((p) => (
              <div key={p.name} style={{ textAlign: p.align, flex: 1 }}>
                <div style={{ fontFamily: t.fontMono, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.15rem' }}>{p.val}</div>
                <div style={{ ...mono(0.58, { color: t.textMuted, marginBottom: '0.15rem' }) }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: p.subColor }}>{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wii-demo-deal-grid" style={{ padding: '1.75rem 2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ ...mono(0.65, { fontWeight: 700, color: t.teal }) }}>DEAL GAP</span>
            <span style={{ ...mono(0.55, { color: t.amber }), background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>ONLY ON DEALGAPIQ</span>
          </div>
          <div style={{ fontFamily: t.fontMono, fontSize: '1.75rem', fontWeight: 700, color: t.teal, marginBottom: '0.5rem', lineHeight: 1 }}>−17.4%</div>
          <div style={{ fontSize: '0.82rem', color: t.textSecondary, lineHeight: 1.6 }}>
            The list price is <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>$61K above</strong> your Target Buy. This is the negotiating distance — the discount you&apos;d need to make this deal hit your return target.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
          <div style={{ ...mono(0.58, { color: t.textMuted, marginBottom: '0.75rem' }) }}>NEGOTIATION DIFFICULTY</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: '0.5rem' }}>
            {[true, true, true, false, false].map((f, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: f ? t.teal : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: t.amber, marginBottom: '0.2rem' }}>Moderate</div>
          <div style={{ fontSize: '0.7rem', color: t.textMuted, lineHeight: 1.4 }}>15–20% discounts require skill</div>
        </div>
      </div>

      <div className="wii-demo-verdict-grid" style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'center', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${t.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.fontMono, fontSize: '1.1rem', fontWeight: 700, color: t.amber, flexShrink: 0 }}>53</div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.15rem' }}>Verdict: Possible</div>
            <div style={{ fontSize: '0.8rem', color: t.textMuted }}>Tight margins, but potential with negotiation.</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...mono(0.58, { color: t.textMuted, marginBottom: '0.5rem' }) }}>SELLER MOTIVATION</div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: '0.35rem' }}>
            {[true, true, true, false].map((f, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: f ? t.amber : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: t.amber }}>Medium</div>
        </div>
      </div>

      <div className="wii-demo-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { key: 'iv', title: 'Income Value', color: t.green, desc: 'The maximum price the rental income supports. Above it, you lose money. No other platform calculates this.' },
          { key: 'tb', title: 'Target Buy', color: t.teal, desc: 'The price that hits your desired return. Change your return target, loan terms, or expenses — it recalculates instantly.' },
          { key: 'dg', title: 'Deal Gap', color: t.coral, desc: 'The discount between the asking price and your Target Buy. The bigger the gap, the better the deal — but the harder the negotiation.' },
        ].map((m, i) => (
          <div key={m.key} style={{ padding: '1.25rem 1.5rem', borderRight: i < 2 ? `1px solid ${t.borderSubtle}` : 'none' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: m.color }}>{m.title}</h4>
            <p style={{ fontSize: '0.75rem', color: t.textMuted, lineHeight: 1.55 }}>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const numberCards = [
  { icon: 'IV', title: 'Income Value', desc: 'The maximum price the property can support before cash flow turns negative. Above this line, you lose money. This is the breakeven boundary no other platform calculates.', bg: 'rgba(52,211,153,0.1)', bd: 'rgba(52,211,153,0.15)', color: t.green },
  { icon: 'TB', title: 'Target Buy', desc: 'The price that delivers your desired return. Change your return target, loan terms, or expenses — it recalculates instantly. This is your number.', bg: 'rgba(14,165,233,0.1)', bd: 'rgba(14,165,233,0.15)', color: t.teal },
  { icon: 'DG', title: 'Deal Gap', desc: 'The distance between the asking price and your Target Buy. The built-in profit opportunity and your negotiation distance. The bigger the gap, the better the deal.', bg: 'rgba(249,112,102,0.1)', bd: 'rgba(249,112,102,0.15)', color: t.coral },
]

const NumberCard = ({ icon, title, desc, bg, bd, color }: typeof numberCards[0]) => (
  <div style={{ ...blackCard('md'), padding: '2rem', transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s' }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, border: `1px solid ${bd}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', fontFamily: t.fontMono, fontWeight: 700, fontSize: '0.85rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.01em', color: t.textPrimary }}>{title}</h3>
    <p style={{ fontSize: '0.9rem', color: t.textSecondary, lineHeight: 1.65 }}>{desc}</p>
  </div>
)

const strategies = ['Long-Term Rental', 'Short-Term Rental', 'BRRRR', 'Fix & Flip', 'House Hack', 'Wholesale']

const StrategyPill = ({ name }: { name: string }) => (
  <div style={{ ...blackCard('sm', 10), padding: '1.15rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'border-color 0.3s, box-shadow 0.3s' }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.teal, flexShrink: 0 }} />
    <span style={{ fontSize: '0.95rem', fontWeight: 500, color: t.textPrimary }}>{name}</span>
  </div>
)

const workflowSteps = [
  { num: '01', label: 'SCAN', title: 'Enter an address or scan a property with your phone', desc: 'Field-ready on your smartphone. Pull data on any property the moment it catches your eye.' },
  { num: '02', label: 'SCREEN', title: 'Set your Buy Box, get an instant Verdict', desc: 'Define your criteria once. Every property gets a PASS, MARGINAL, or BUY verdict in 60 seconds.' },
  { num: '03', label: 'STRESS TEST', title: 'Adjust variables and see the impact in real time', desc: 'Condition, rehab, location, terms — change any assumption and watch the numbers shift instantly.' },
  { num: '04', label: 'ACT', title: 'Generate reports, track deals, close with confidence', desc: 'Lender-ready PDFs, side-by-side comparisons, and a full pipeline from first look to closing.' },
]

const WorkflowStep = ({ num, label, title, desc }: typeof workflowSteps[0]) => (
  <div style={{ ...blackCard('md'), padding: '2rem', transition: 'border-color 0.3s, box-shadow 0.3s' }}>
    <div style={{ fontFamily: t.fontMono, fontSize: '0.7rem', color: t.teal, letterSpacing: '0.12em', marginBottom: '0.75rem' }}>{num} — {label}</div>
    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: t.textPrimary }}>{title}</h3>
    <p style={{ fontSize: '0.88rem', color: t.textSecondary, lineHeight: 1.65 }}>{desc}</p>
  </div>
)

const CredItem = ({ text, highlight = false }: { text: string; highlight?: boolean }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem',
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${highlight ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 10, fontSize: '0.85rem', color: highlight ? t.teal : t.textSecondary, fontWeight: 500,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: highlight ? t.teal : 'rgba(255,255,255,0.15)' }} />
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

        .wii-grid-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .wii-grid-2col-even { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .wii-strategies-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .wii-founder-body { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3rem; padding: 2rem 3rem 2.5rem; }
        .wii-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
          .wii-grid-3col { grid-template-columns: 1fr; }
          .wii-grid-2col-even { grid-template-columns: 1fr; }
          .wii-strategies-grid { grid-template-columns: 1fr 1fr; }
          .wii-founder-body { grid-template-columns: 1fr; padding: 1.5rem; }
          .wii-stats-row { grid-template-columns: repeat(2, 1fr); }
          .wii-nav-links { display: none !important; }
          .wii-founder-header { padding: 2rem 1.5rem 0 !important; }
          .wii-demo-deal-grid { grid-template-columns: 1fr !important; }
          .wii-demo-verdict-grid { grid-template-columns: 1fr !important; }
          .wii-demo-metrics-grid { grid-template-columns: 1fr !important; }
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
          <Link href="/what-is-dealgapiq" style={{ color: t.textPrimary, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>What is DealGapIQ</Link>
          <Link href="/pricing" style={{ color: t.textSecondary, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Pricing</Link>
          <Link href="/login" style={{ color: t.textSecondary, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Login</Link>
          <Link href="/register" style={{ background: t.teal, color: t.bgPrimary, padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Start free trial</Link>
        </div>
      </nav>

      {/* HERO */}
      <header style={{ padding: '10rem 2rem 6rem', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...monoLabel, fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'inline-block', animation: 'fadeUp 0.7s ease-out forwards' }}>What is DealGapIQ?</div>
        <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1.75rem', animation: 'fadeUp 0.7s ease-out 0.1s forwards', opacity: 0 }}>
          The only question that matters:<br /><em style={{ fontStyle: 'normal', color: t.teal }}>&ldquo;Is this actually a deal?&rdquo;</em>
        </h1>
        <p style={{ fontSize: '1.15rem', color: t.textSecondary, maxWidth: 680, margin: '0 auto', lineHeight: 1.8, animation: 'fadeUp 0.7s ease-out 0.2s forwards', opacity: 0 }}>
          DealGapIQ answers it in 60 seconds. Instead of hunting through listings, running spreadsheets, and guessing at numbers — analyze any property, any strategy, instantly, and see the exact price where the deal works.
        </p>
      </header>

      <DividerC />

      {/* DEAL GAP CONCEPT */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={monoLabel}>The Core Concept</div>
        <div style={sectionTitle}>The Deal Gap — the metric no one else calculates.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '3rem' }}>
          <div style={{ fontSize: '1.05rem', color: t.textSecondary, lineHeight: 1.85, maxWidth: 720 }}>
            <p>At the core of DealGapIQ is a proprietary concept: <strong style={{ color: t.textPrimary, fontWeight: 600 }}>the Deal Gap</strong> — the distance between the asking price and the price required to hit your target return.</p>
            <p style={{ marginTop: '1.25rem' }}>That single number tells you whether the deal is worth pursuing, how much to negotiate, and how hard the negotiation will be.</p>
            <p style={{ marginTop: '1.25rem' }}>This turns real estate from a search game into a <strong style={{ color: t.textPrimary, fontWeight: 600 }}>decision system</strong>. Most investors search the same listings, use the same filters, and compete on speed. DealGapIQ analyzes every property to find the ones that actually are deals — by calculating the exact price that delivers your target return.</p>
          </div>
          <DemoCard />
        </div>
      </section>

      <DividerE />

      {/* THREE NUMBERS */}
      <section style={sectionWrap}>
        <div style={monoLabel}>The Three Price Signals</div>
        <div style={sectionTitle}>Hours of analysis, reduced to three numbers.</div>
        <div style={sectionSubtitle}>DealGapIQ reduces complex underwriting into three instant, investor-grade price signals. In seconds, you know where you break even, where you profit, and whether the deal is realistic.</div>
        <div className="wii-grid-3col" style={{ marginTop: '3rem' }}>
          {numberCards.map((n) => <NumberCard key={n.icon} {...n} />)}
        </div>
      </section>

      <DividerB />

      {/* SIX STRATEGIES */}
      <section style={sectionWrap}>
        <div style={monoLabel}>Six Strategies, One Scan</div>
        <div style={sectionTitle}>Every address analyzed six ways — automatically.</div>
        <div style={sectionSubtitle}>This reveals opportunities other investors miss and shows the best strategy for that specific property — not a one-size-fits-all analysis.</div>
        <div className="wii-strategies-grid" style={{ marginTop: '3rem' }}>
          {strategies.map((s) => <StrategyPill key={s} name={s} />)}
        </div>
      </section>

      <DividerB />

      {/* WORKFLOW */}
      <section style={sectionWrap}>
        <div style={monoLabel}>Built for How Investors Work</div>
        <div style={sectionTitle}>Not a calculator. A decision system.</div>
        <div style={sectionSubtitle}>When a deal passes your screen, everything you need to act is already done.</div>
        <div className="wii-grid-2col-even" style={{ marginTop: '3rem' }}>
          {workflowSteps.map((s) => <WorkflowStep key={s.num} {...s} />)}
        </div>
      </section>

      <DividerC />

      {/* FOUNDER */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={monoLabel}>Who Built This</div>
        <div style={{ ...sectionTitle, marginBottom: 0 }}>Institutional-grade intelligence — now in every investor&apos;s hands.</div>
        <div style={{ marginTop: '3rem', ...blackCard('lg', 24), overflow: 'hidden' }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${t.teal}, ${t.teal} 60%, transparent)` }} />
          <div className="wii-founder-header" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '2.5rem 3rem 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(14,165,233,0.1)', border: `2px solid ${t.teal}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', color: t.teal, flexShrink: 0 }}>BG</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>Brad Geisen</div>
              <div style={{ fontSize: '0.85rem', color: t.textMuted, marginTop: '0.15rem' }}>Founder &amp; CEO, DealGapIQ</div>
            </div>
          </div>
          <div className="wii-founder-body">
            <div style={{ fontSize: '0.95rem', color: t.textSecondary, lineHeight: 1.85 }}>
              <p>Over two decades ago, Fannie Mae discovered that Brad&apos;s proprietary data platform knew more about their portfolio than their own internal infrastructure — and commissioned him to build HomePath.com. He went on to build HomeSteps.com for Freddie Mac, establishing a trusted technology partnership with both GSEs.</p>
              <p style={{ marginTop: '1.25rem' }}>DealGapIQ takes institutional-grade analytical rigor — the kind previously available only to large institutions and government agencies — and puts it in the hands of every individual investor.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.25rem' }}>
              <CredItem text="Founded Foreclosure.com" highlight />
              <CredItem text="Built HomePath.com for Fannie Mae" highlight />
              <CredItem text="Built HomeSteps.com for Freddie Mac" highlight />
              <CredItem text="30+ Year GSE Partnership" />
            </div>
          </div>
          <div className="wii-stats-row" style={{ borderTop: `1px solid ${t.border}` }}>
            {[{ num: '35+', label: 'Years in RE Data' }, { num: '80+', label: 'Companies' }, { num: '30+', label: 'Year GSE Partnership' }, { num: '500+', label: 'Projects Built' }].map((s, i) => (
              <div key={s.label} style={{ textAlign: 'center', padding: '1.5rem 1rem', borderLeft: i > 0 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ fontFamily: t.fontMono, fontSize: '1.5rem', fontWeight: 700, color: t.teal, lineHeight: 1, marginBottom: '0.35rem' }}>{s.num}</div>
                <div style={{ fontSize: '0.68rem', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DividerB />

      {/* INVESTOR EDGE */}
      <section style={sectionWrap}>
        <div style={monoLabel}>The Investor Edge</div>
        <div style={sectionTitle}>Most investors analyze deals.<br />Professional investors eliminate bad deals fast.</div>
        <div style={{ ...sectionSubtitle, marginBottom: '2.5rem' }}>DealGapIQ lets you pass on 90% of properties in minutes, focus only on the ones that meet your criteria, and make confident offers backed by real numbers. Less time underwriting. Fewer bad purchases. Faster portfolio growth. Stronger negotiations.</div>
      </section>

      {/* BOTTOM CTA */}
      <div style={{ textAlign: 'center', padding: '6rem 2rem 8rem' }}>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '1rem', color: t.textPrimary }}>Every property has a Deal Gap.<br />Only DealGapIQ measures it.</h2>
        <p style={{ fontSize: '1.05rem', color: t.textSecondary, marginBottom: '2.5rem' }}>And once you see it, you&apos;ll never analyze real estate the old way again.</p>
        <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: t.teal, color: t.bgPrimary, padding: '0.85rem 2rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
          Start Free — Analyze Your First Property
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
        <div style={{ fontSize: '0.82rem', color: t.textMuted, marginTop: '1rem' }}>5 free analyses per month · No credit card required</div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: '3rem 2rem', borderTop: `1px solid ${t.border}`, textAlign: 'center' }}>
        <p style={{ fontSize: '0.8rem', color: t.textMuted }}>&copy; 2026 DealGapIQ. All rights reserved. Professional use only. Not a lender.</p>
      </footer>
    </div>
  )
}
