'use client';

/**
 * DealGapIQHomepageV2
 *
 * Marketing homepage rebuild — locked design language:
 *  - Pure black (#000) inside container cards
 *  - Hazy cyan ambient glow over the entire page
 *  - Crisp typography (tabular-nums for numbers, bold weights, max contrast)
 *  - Each module gets its own accent-color glow but pure black inside
 *  - Brand color tokens from globals.css (--accent-sky, --status-* etc.)
 *
 * Sections (top → bottom):
 *  1. Announcement strip
 *  2. Sticky nav
 *  3. Hero (with phone mockup + DealGap visualization)
 *  4. Brad credibility band
 *  5. Listing Sites vs DealGapIQ comparison
 *  6. One Scan. Five Tools. workbench (5 modules)
 *  7. Off-Market wedge
 *  8. Build Your Pattern Library (Search History)
 *  9. Drive-by scan demo
 *  10. Cross-Referenced data sources
 *  11. Pricing (3 tiers)
 *  12. Brad Geisen deep credibility
 *  13. Final CTA
 *  14. Footer
 */

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Check,
  X as XIcon,
  Home,
  Apple,
  Play,
  Star,
  Calendar,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import { useAuthModal } from '@/hooks/useAuthModal';
import { DealGapBar } from './DealGapBar';

/* ============================================================
 * Auth param handler (preserves /?auth=login deep link behavior)
 * ============================================================ */

function AuthParamHandler() {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }
  }, [searchParams, openAuthModal]);

  return null;
}

/* ============================================================
 * Component
 * ============================================================ */

interface Props {
  onPointAndScan?: () => void;
}

export function DealGapIQHomepageV2({ onPointAndScan }: Props) {
  const router = useRouter();

  const handleAnalyzeClick = () => router.push('/search');
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden antialiased">
      {/* Hazy ambient glow — fixed, behind all content */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(15,164,233,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 30%, rgba(4,101,242,0.04) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 0% 60%, rgba(139,92,246,0.03) 0%, transparent 50%)',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)' }}
      />

      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* ====== ANNOUNCEMENT STRIP ====== */}
      <div className="relative z-10 border-b border-[#14181F] bg-black">
        <div className="max-w-7xl mx-auto px-6 py-2.5 text-center">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-sky-400">Real Listing Data</span>
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-slate-700 mx-2">·</span>
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-sky-400">A Real Decision Engine</span>
        </div>
      </div>

      {/* Top app nav is provided by the global app layout — this component intentionally omits its own header to avoid the duplicate-nav double-stack. */}

      <main className="relative z-10">
        <HeroSection onAnalyze={handleAnalyzeClick} onScrollHow={() => scrollTo('workbench')} onPointAndScan={onPointAndScan} />
        <CredibilityBand />
        <ComparisonSection />
        <WorkbenchSection />
        <OffMarketSection onAnalyze={handleAnalyzeClick} />
        <PatternLibrarySection />
        <ScanDemoSection onPointAndScan={onPointAndScan} />
        <DataSourcesBlock />
        <PricingSection onAnalyze={handleAnalyzeClick} />
        <FounderDeepSection />
        <TestimonialsSection />
        <FinalCTASection onAnalyze={handleAnalyzeClick} />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ============================================================
 * SECTIONS — exported as inner components for readability
 * ============================================================ */

/* ---------- HERO ---------- */

function HeroSection({
  onAnalyze,
  onScrollHow,
  onPointAndScan,
}: {
  onAnalyze: () => void;
  onScrollHow: () => void;
  onPointAndScan?: () => void;
}) {
  return (
    <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-20 md:pb-28">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
        {/* Copy column */}
        <div className="lg:col-span-7">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            See Every Property Through<br />
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              an Investor's Lens
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-xl mb-3">
            Every listing is designed to sell you.{' '}
            <span className="text-white font-semibold">DealGapIQ answers the only question that matters to an investor: is this a good deal?</span>
          </p>
          <p className="text-base text-slate-400 mb-8">
            Listed or off-market. Anywhere in the U.S. Decision in 15 seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <PrimaryButton onClick={onAnalyze}>
              Analyze Any Property <span>→</span>
            </PrimaryButton>
            <SecondaryButton onClick={onScrollHow}>What is DealGapIQ?</SecondaryButton>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400 mb-6">
            <CheckRow label="3 free scans / month" />
            <CheckRow label="No credit card" />
            <CheckRow label="Cancel anytime" />
          </div>

          <AppStoreBadges />
        </div>

        {/* Phone mockup column */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <PhoneFrame>
            <div className="bg-black p-5">
              <div className="flex items-center justify-between mb-4 pt-2">
                <span className="text-base font-bold">
                  DealGap<span className="text-sky-400">IQ</span>
                </span>
                <div className="w-7 h-7 rounded-full bg-[#0A0F18] border border-[#1E2530] flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>

              <div className="border-b border-[#14181F] pb-3 mb-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Home className="w-4 h-4 text-sky-400" />
                  <span>3783 Moon Bay Cir</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
                  BEDS 4 · BA 2.6 · SQFT 2,410 ·{' '}
                  <span className="text-rose-400 text-[10px] font-extrabold tracking-[0.18em]">OFF-MARKET</span>
                </div>
              </div>

              <div className="space-y-2.5 mb-5">
                <ValueCard label="Target Buy" sub="Profit Zone" value="$588,030" color="sky" />
                <ValueCard label="Income Value" sub="Break-Even" value="$618,979" color="amber" />
                <ValueCard label="Market Price" sub="Market Reality" value="$672,117" color="rose" />
              </div>

              <div className="px-1">
                <DealGapBar target={588030} income={618979} market={672117} size="compact" />
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/* ---------- CREDIBILITY BAND ---------- */

function CredibilityBand() {
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-20">
      <div className="max-w-4xl mx-auto bg-black border border-[#14181F] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-5">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-sky-500/40 shrink-0 ring-2 ring-sky-500/10">
          <Image
            src="/images/brad-geisen.jpg"
            alt="Brad Geisen, Founder of DealGapIQ"
            width={128}
            height={128}
            className="w-full h-full object-cover object-top"
            priority
          />
        </div>
        <div className="text-center md:text-left flex-1">
          <div className="text-xs uppercase tracking-widest text-sky-400 font-bold mb-1">Built by Brad Geisen</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            35 years in real estate data. Founded <span className="text-white font-semibold">Foreclosure.com</span>, built{' '}
            <span className="text-white font-semibold">HomePath.com</span> for Fannie Mae,{' '}
            <span className="text-white font-semibold">HomeSteps.com</span> for Freddie Mac, and other industry-leading platforms.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- COMPARISON ---------- */

function ComparisonSection() {
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-4">The Difference</div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Real Estate Sites Market Properties.<br />
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">We Analyze Them.</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            You're not asking <span className="text-slate-200 italic">&ldquo;do I love this kitchen?&rdquo;</span> —<br />
            you're asking <span className="text-sky-300 font-semibold">&ldquo;does this property cash flow?&rdquo;</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Listing Sites */}
          <div className="bg-black border border-[#14181F] rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#14181F]">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Home className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold">Listing Sites</h3>
            </div>
            <ul className="space-y-3.5 text-sm">
              {[
                'Curated photos designed to sell',
                'Agent remarks built for marketing',
                'Zestimate built for homeowners',
                'No rental income data',
                'No cash flow analysis',
                'No investment strategy tools',
                'Shows you what a property looks like',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-slate-400">
                  <XIcon className="w-5 h-5 text-rose-500/70 mt-0.5 shrink-0" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* DealGapIQ */}
          <div className="bg-black border border-[#1E2530] rounded-2xl p-7" style={{ boxShadow: '0 0 100px -30px rgba(15,164,233,0.4)' }}>
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#1E2530]">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/40 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold">
                DealGap<span className="text-sky-400">IQ</span>
              </h3>
              <span className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.12em] uppercase border border-sky-500/40 text-sky-300 bg-black">
                Built for Investors
              </span>
            </div>
            <ul className="space-y-3.5 text-sm">
              {[
                'Numbers that tell the truth',
                <>Cross-referenced from <span className="text-sky-300 font-semibold">5 data sources</span></>,
                'IQ Estimate built for investors',
                'Rental income analysis included',
                'Full cash flow & DSCR breakdown',
                <><span className="font-semibold">6 investment strategies</span> analyzed</>,
                <>Shows you <span className="text-white font-semibold">what a property is worth</span></>,
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-slate-200">
                  <Check className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" strokeWidth={3} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- WORKBENCH (One Scan. Five Tools.) ---------- */

function WorkbenchSection() {
  return (
    <section id="workbench" className="px-6 md:px-12 lg:px-20 py-24 md:py-28">
      <div className="max-w-6xl mx-auto text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-black mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-sky-300 uppercase">The Workbench</span>
        </div>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-[1.05]">
          One Scan. <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">Five Tools.</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Every scan opens a full investor workbench. No spreadsheets. No Zillow-hopping.
          No calling three contractors for a rehab estimate.
        </p>
      </div>

      {/* MODULE 1: Verdict */}
      <ModuleRow
        accent="sky"
        pill="Verdict"
        headline="One number tells you what to do."
        body={
          <>
            See the <span className="text-sky-300 font-semibold">Target Buy</span>,{' '}
            <span className="text-amber-300 font-semibold">Income Value</span>, and{' '}
            <span className="text-rose-300 font-semibold">Market Price</span> side by side — with the Deal Gap and Price Gap that turn three numbers into a single decision.
          </>
        }
        bullets={[
          'Five data sources cross-referenced',
          'Plain-English explanation of what the math is saying',
          <>Works on listed <em className="not-italic font-semibold text-sky-200">and off-market</em> properties</>,
        ]}
        imagePosition="right"
        mockup={<VerdictMockup />}
      />

      {/* MODULE 2: Strategy */}
      <ModuleRow
        accent="purple"
        pill="Strategy"
        headline="Every property, six ways to profit."
        body={<>Long-term rental, short-term, BRRRR, Fix &amp; Flip, House Hack, or Wholesale — see the full proforma for each strategy on the same property, side-by-side against investor benchmarks.</>}
        bullets={[
          'NOI, cash flow, cap rate, cash-on-cash, DSCR — all pre-calculated',
          'Conventional, FHA, and VA loan modeling built in',
          'Download a full Excel proforma to share with lenders',
        ]}
        imagePosition="left"
        mockup={<StrategyMockup />}
      />

      {/* MODULE 3: Appraiser */}
      <ModuleRow
        accent="teal"
        pill="Appraiser"
        headline="A BPO-grade valuation in two minutes, not two days."
        body={<>Auto-pulled comps with a proximity map, 96% match scores, size/bed/bath/age adjustments, conservative/balanced/upside ranges, and a URAR-style PDF you can hand to a lender.</>}
        bullets={[
          'Pick your own comps, see every adjustment',
          'Confidence scoring so you know when to trust the number',
          'One-click appraisal PDF download',
        ]}
        imagePosition="right"
        mockup={<AppraiserMockup />}
      />

      {/* MODULE 4: DealMaker */}
      <ModuleRow
        accent="sky"
        pill="DealMaker"
        headline="Structure the perfect offer before you write it."
        body={<>Six interactive deal-structuring worksheets — auto-populated with the scanned property's numbers. Change the down payment, loan terms, rent assumptions, or rehab budget and watch every metric update live.</>}
        bullets={[
          'Test Conv vs. FHA vs. VA side by side',
          'See exactly when the deal flips from negative to positive cash flow',
          'Download a fully editable Excel proforma',
        ]}
        imagePosition="left"
        mockup={<DealMakerMockup />}
      />

      {/* MODULE 5: Estimator */}
      <ModuleRow
        accent="orange"
        pill="Estimator"
        headline="Rehab numbers you can actually trust."
        body={<>Line-item rehab estimator with <span className="text-orange-300 font-semibold">local construction pricing built in</span>. Pick your quality tier, add what needs work, and get a defensible total in minutes — contingency reserve included.</>}
        bullets={[
          'Quick-start presets: Cosmetic, Light, Medium, Heavy',
          'Kitchen, bath, flooring, systems, exterior — all itemized',
          "Built-in contingency reserve so you don't under-budget",
        ]}
        imagePosition="right"
        mockup={<EstimatorMockup />}
      />
    </section>
  );
}

/* ---------- OFF-MARKET WEDGE ---------- */

function OffMarketSection({ onAnalyze }: { onAnalyze: () => void }) {
  const sampleListings: Array<{ addr: string; meta: string; status: 'off' | 'live' }> = [
    { addr: '3783 Moon Bay Cir', meta: 'Wellington, FL · 4 bd · 2,410 sqft', status: 'off' },
    { addr: '14115 Wellington Trce', meta: 'Wellington, FL · 2 bd · 1,002 sqft', status: 'off' },
    { addr: '614 NE 3rd St', meta: 'Dania Beach, FL · 3 bd · 2,505 sqft', status: 'off' },
    { addr: '1350 SW 122nd Ave', meta: 'Miami, FL · 2 bd · 1,170 sqft', status: 'live' },
    { addr: '3758 Moon Bay Cir', meta: 'Wellington, FL · 4 bd · 2,230 sqft', status: 'off' },
  ];
  return (
    <section className="px-6 md:px-12 lg:px-20 py-24 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="bg-black border border-[#1E2530] rounded-2xl p-8 md:p-14 relative overflow-hidden" style={{ boxShadow: '0 0 100px -30px rgba(251,191,36,0.3)' }}>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/40 bg-black mb-5">
                <span className="text-rose-400 text-[10px] font-extrabold tracking-[0.18em]">OFF-MARKET</span>
                <span className="text-[11px] font-bold tracking-widest text-rose-300 uppercase">The Unfair Advantage</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
                Analyze properties that aren't{' '}
                <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">even for sale yet.</span>
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                Zillow, Redfin, and Realtor.com only show what's listed.{' '}
                <span className="text-white font-semibold">DealGapIQ analyzes any property in the U.S.</span> — listed, off-market, FSBO, foreclosure, or just a house you drove past last weekend.
              </p>
              <ul className="space-y-3.5 mb-8">
                {[
                  'Find deals before they hit the MLS',
                  'Make defensible off-market offers backed by 5-source data',
                  'Drive-by scan turns any street into a deal pipeline',
                ].map((t) => (
                  <li key={t} className="flex gap-3 items-start text-slate-200">
                    <Check className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
              <PrimaryButton onClick={onAnalyze}>Try It On Any Address →</PrimaryButton>
            </div>

            <div className="lg:col-span-5">
              <div className="space-y-3">
                {sampleListings.map((it) => (
                  <div key={it.addr} className="bg-black border border-[#14181F] rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                      <Home className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{it.addr}</div>
                      <div className="text-[10px] text-slate-500 tabular-nums">{it.meta}</div>
                    </div>
                    {it.status === 'off' ? (
                      <span className="text-rose-400 text-[10px] font-extrabold tracking-[0.18em]">OFF-MARKET</span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] font-bold tracking-[0.18em]">FOR SALE</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center text-xs text-slate-500 mt-4">
                All five analyzed in DealGapIQ. Four don't appear on Zillow.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- PATTERN LIBRARY (Search History) ---------- */

function PatternLibrarySection() {
  const recentSearches = [
    { addr: '3783 Moon Bay Cir', meta: 'Wellington, FL · 4 bd · 2,410 sqft', price: '$647,100', saved: true, ago: '7m ago', verdict: 'DEAL' as const },
    { addr: '14115 Wellington Trce', meta: 'Wellington, FL · 2 bd · 1,002 sqft', price: '$315,000', saved: false, ago: '1m ago', verdict: 'CHECK' as const },
    { addr: '1350 SW 122nd Ave', meta: 'Miami, FL · 2 bd · 1,170 sqft', price: '$290,000', saved: true, ago: 'just now', verdict: 'DEAL' as const },
    { addr: '614 NE 3rd St', meta: 'Dania Beach, FL · 3 bd · 2,505 sqft', price: '$740,000', saved: false, ago: '2m ago', verdict: 'PASS' as const },
    { addr: '143 SE 27th Way', meta: 'Boynton Beach, FL · 3 bd · 1,342 sqft', price: '$657,900', saved: true, ago: '2m ago', verdict: 'DEAL' as const },
  ];
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-24 md:pb-28">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-4">After the Scan</div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Build Your <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">Pattern Library.</span>
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Every property you scan goes straight to your dashboard. Track 10 properties or 1,000 — your personal investment intelligence, building with every scan.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3 mb-8">
              <StatCard icon={<Search className="w-4 h-4 text-sky-400" />} value="288" label="Total Searches" iconBg="sky" />
              <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} value="286" label="Successful" iconBg="emerald" />
              <StatCard icon={<Star className="w-4 h-4 text-amber-400" fill="currentColor" />} value="23" label="Saved Deals" iconBg="amber" />
              <StatCard icon={<Calendar className="w-4 h-4 text-purple-400" />} value="9" label="This Week" iconBg="purple" />
            </div>

            <div className="bg-black border border-[#14181F] rounded-2xl p-5 mb-6">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">Your Top Markets</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold tabular-nums">FL (282)</span>
                <span className="px-3 py-1.5 rounded-full bg-black border border-[#1E2530] text-slate-300 text-xs font-bold tabular-nums">TX (1)</span>
                <span className="px-3 py-1.5 rounded-full bg-black border border-[#1E2530] text-slate-300 text-xs font-bold tabular-nums">NC (1)</span>
              </div>
            </div>

            <ul className="space-y-3.5">
              {[
                'Every scan auto-saved — never lose a property',
                'Save the best deals to your portfolio with one tap',
                'Mobile scans sync to desktop dashboard instantly',
                'Track status: watching, analyzing, contacted, owned',
              ].map((t) => (
                <li key={t} className="flex gap-3 items-start text-slate-200">
                  <Check className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-black border border-[#1E2530] rounded-2xl p-6" style={{ boxShadow: '0 0 100px -30px rgba(15,164,233,0.4)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-400" />
                  <span className="text-base font-bold">Recent Searches</span>
                </div>
                <span className="text-[11px] text-slate-500 tabular-nums">Showing 5 of 288</span>
              </div>

              <div className="space-y-3">
                {recentSearches.map((s) => (
                  <RecentSearchRow key={s.addr + s.ago} {...s} />
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-[#1E2530] flex items-center justify-between">
                <div className="text-xs text-slate-500">Synced across mobile + desktop</div>
                <a href="#" className="text-xs text-sky-400 font-bold hover:underline">View All →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- SCAN DEMO ---------- */

function ScanDemoSection({ onPointAndScan }: { onPointAndScan?: () => void }) {
  return (
    <section className="px-6 md:px-12 lg:px-20 py-24 md:py-28">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="flex justify-center lg:justify-start">
          <PhoneFrame>
            <div className="bg-black p-5 relative">
              <div className="relative h-80 rounded-xl bg-gradient-to-b from-slate-800 via-slate-900 to-black overflow-hidden mb-4">
                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice">
                  <rect x="40" y="100" width="120" height="100" fill="#374151" />
                  <polygon points="30,100 100,40 170,100" fill="#1F2937" />
                  <rect x="60" y="140" width="30" height="40" fill="#111827" />
                  <rect x="110" y="130" width="25" height="25" fill="#0F172A" />
                  <rect x="0" y="200" width="200" height="40" fill="#1A2332" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-44 h-44">
                    <div className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-pulse" />
                    <div className="absolute inset-4 rounded-full border-2 border-sky-400/60" />
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-400" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-400" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-sky-400" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-sky-400" />
                  </div>
                </div>
                <div className="absolute inset-x-8 top-1/2 h-px bg-sky-400" style={{ boxShadow: '0 0 20px 4px rgba(15,164,233,0.6)' }} />
              </div>

              <div className="bg-black border border-[#1E2530] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">Property Found!</div>
                    <div className="text-[10px] text-slate-400">95% confidence match</div>
                  </div>
                </div>
                <div className="rounded-lg bg-black border border-[#1E2530] p-2.5 mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <Home className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">3783 Moon Bay Cir</div>
                    <div className="text-[10px] text-slate-500">Wellington, FL 33414</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3 tabular-nums">
                  <span>📍 50m away</span><span>⊙ 154°</span><span>⏱ 0.6s</span>
                </div>
                <button
                  onClick={onPointAndScan}
                  className="w-full text-center py-2.5 rounded-lg text-xs font-bold text-black"
                  style={{ background: 'linear-gradient(135deg, #0FA4E9 0%, #0465F2 100%)' }}
                >
                  Analyze This Property →
                </button>
              </div>
            </div>
          </PhoneFrame>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-4">Drive-By Scan</div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
            See a Property. Scan It.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">Know the Deal.</span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Spot a house while you're out? Don't guess — <span className="text-white font-semibold">scan it.</span> Point your phone, tap once, and instantly capture the property. Cross-referenced data and analytics in seconds — so you know if it's worth pursuing before anyone else.
          </p>
          <ul className="space-y-4 mb-8">
            <ScanFeature icon={<Zap className="w-5 h-5 text-sky-400" />} title="No Address Entry. No Delays." subtitle="Just real-time investment intelligence." />
            <ScanFeature icon={<Star className="w-5 h-5 text-sky-400" />} title="Auto-Saved to Your Dashboard" subtitle="Come back to the full analysis whenever you're ready." />
            <ScanFeature icon={<Clock className="w-5 h-5 text-sky-400" />} title="Never Miss an Opportunity" subtitle="Opportunities don't wait. Now, neither does your analysis." />
          </ul>
          <SecondaryButton onClick={onPointAndScan}>Watch the 90-second demo →</SecondaryButton>
        </div>
      </div>
    </section>
  );
}

/* ---------- DATA SOURCES ---------- */

function DataSourcesBlock() {
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-24 md:pb-28">
      <div className="max-w-5xl mx-auto bg-black border border-[#1E2530] rounded-2xl p-10 md:p-14 text-center" style={{ boxShadow: '0 0 100px -30px rgba(15,164,233,0.4)' }}>
        <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-4">Powered by Real Data</div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-tight">
          Cross-Referenced from <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">5 Sources.</span>
        </h2>
        <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          We don't guess. We aggregate, compare, and weight data from the sources investors actually trust.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['Zillow', 'RentCast', 'Redfin', 'Realtor.com', 'County Records'].map((s) => (
            <div key={s} className="px-5 py-3 rounded-xl bg-black border border-[#1E2530] hover:border-sky-500 transition">
              <span className="font-bold text-white">{s}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Our IQ Estimate uses a weighted algorithm across all available sources, accounting for data freshness, market coverage, and historical accuracy.
        </p>
      </div>
    </section>
  );
}

/* ---------- PRICING ---------- */

function PricingSection({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <section id="pricing" className="px-6 md:px-12 lg:px-20 py-24 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-4">Simple Pricing</div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            Start Free. Upgrade <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">When You're Ready.</span>
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Every plan includes the full workbench — Verdict, Strategy, Appraiser, DealMaker, Estimator.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {/* Free */}
          <div className="bg-black border border-[#14181F] rounded-2xl p-7 flex flex-col">
            <div className="mb-5 pb-5 border-b border-[#14181F]">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Free</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-bold text-white tabular-nums">$0</span>
                <span className="text-sm text-slate-400">/forever</span>
              </div>
              <div className="text-sm text-slate-400">Try the workbench</div>
            </div>
            <ul className="space-y-3 text-sm flex-1 mb-6">
              <PricingRow text={<><span className="font-bold">3 scans</span> per month</>} />
              <PricingRow text="Verdict page (Target Buy + Income + Market)" />
              <PricingRow text="All 5 data sources visible" />
              <PricingRow text="Search History dashboard" />
              <PricingRow text="Strategy / Appraiser / DealMaker / Estimator" included={false} />
            </ul>
            <button onClick={onAnalyze} className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-black border border-[#1E2530] hover:border-sky-500 transition">
              Get Started Free
            </button>
            <div className="text-[10px] text-center text-slate-500 mt-3">No credit card required</div>
          </div>

          {/* Monthly */}
          <div className="bg-black border border-[#1E2530] rounded-2xl p-7 flex flex-col relative" style={{ boxShadow: '0 0 100px -30px rgba(15,164,233,0.4)' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-sky-400 text-black text-[10px] font-bold tracking-widest uppercase">
              Most Flexible
            </div>
            <div className="mb-5 pb-5 border-b border-[#1E2530]">
              <div className="text-xs uppercase tracking-widest text-sky-400 font-bold mb-2">Pro · Monthly</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-bold text-white tabular-nums">$39.99</span>
                <span className="text-sm text-slate-400">/month</span>
              </div>
              <div className="text-sm text-sky-300 font-semibold">7-day free trial</div>
            </div>
            <ul className="space-y-3 text-sm flex-1 mb-6">
              <PricingRow text={<span className="font-bold">Unlimited scans</span>} />
              <PricingRow text={<>Full <span className="font-semibold text-white">Verdict + Strategy + Appraiser + DealMaker + Estimator</span></>} />
              <PricingRow text="All 6 investment strategies" />
              <PricingRow text="Excel proforma + URAR PDF exports" />
              <PricingRow text="Saved Properties + status tracking" />
            </ul>
            <button
              onClick={onAnalyze}
              className="w-full text-center py-3 rounded-xl text-sm font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #0FA4E9 0%, #0465F2 100%)' }}
            >
              Start 7-Day Free Trial
            </button>
            <div className="text-[10px] text-center text-slate-500 mt-3">Cancel anytime during trial</div>
          </div>

          {/* Annual */}
          <div className="bg-black border border-amber-500/30 rounded-2xl p-7 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-black text-[10px] font-bold tracking-widest uppercase">
              Best Value
            </div>
            <div className="mb-5 pb-5 border-b border-[#14181F]">
              <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">Pro · Annual</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-bold text-white tabular-nums">$29.17</span>
                <span className="text-sm text-slate-400">/month</span>
              </div>
              <div className="text-sm text-amber-300 font-semibold">$349.99/yr · save $130</div>
            </div>
            <ul className="space-y-3 text-sm flex-1 mb-6">
              <PricingRow text={<span className="font-bold">Everything in Pro Monthly</span>} accent="amber" />
              <PricingRow text={<><span className="text-amber-300 font-bold">27% off</span> the monthly price</>} accent="amber" />
              <PricingRow text="Locked-in price for the year" accent="amber" />
              <PricingRow text="Priority support" accent="amber" />
              <PricingRow text="Early access to new features" accent="amber" />
            </ul>
            <button onClick={onAnalyze} className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-black border border-amber-500/40 text-amber-300 hover:bg-amber-500/5 transition">
              Start 7-Day Free Trial
            </button>
            <div className="text-[10px] text-center text-slate-500 mt-3">Billed annually after trial</div>
          </div>
        </div>

        <div className="text-center mt-10 text-sm text-slate-400">
          Every plan: full workbench access · 5-source data · iOS + Android + Web · Cancel anytime
        </div>
      </div>
    </section>
  );
}

/* ---------- FOUNDER DEEP CREDIBILITY ---------- */

function FounderDeepSection() {
  return (
    <section className="px-6 md:px-12 lg:px-20 py-24 md:py-28">
      <div className="max-w-5xl mx-auto bg-black border border-[#1E2530] rounded-2xl p-10 md:p-14" style={{ boxShadow: '0 0 100px -30px rgba(15,164,233,0.4)' }}>
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-4 flex justify-center md:justify-start">
            <div className="w-44 h-44 rounded-2xl border-2 border-sky-500/40 relative overflow-hidden ring-4 ring-sky-500/10">
              <Image
                src="/images/brad-geisen.jpg"
                alt="Brad Geisen, Founder of DealGapIQ"
                width={352}
                height={352}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-sky-300 font-bold">Founder</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 text-center md:text-left">
            <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-3">35 Years of Real Estate Data</div>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
              One Tool, Built by Someone Who's <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">Done This Before.</span>
            </h2>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-6">
              "I spent 35 years in real estate data — building <span className="text-white font-semibold">HomePath.com</span> for Fannie Mae, <span className="text-white font-semibold">HomeSteps.com</span> for Freddie Mac, and founding <span className="text-white font-semibold">Foreclosure.com</span>. DealGapIQ is what I always wished investors had: real numbers, in seconds, on any property."
            </p>
            <div className="text-sm text-slate-400">— Brad Geisen, Founder</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 mt-10 pt-10 border-t border-[#1E2530]">
          <FounderStat value="35+" label="Years in RE Data" />
          <FounderStat value="30+" label="Yr GSE Partnerships" />
          <FounderStat value="35+" label="Years RE Investor" />
        </div>
      </div>
    </section>
  );
}

/* ---------- TESTIMONIALS ---------- */

interface Testimonial {
  quote: string;
  initials: string;
  name: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'I used to spend 45 minutes per property on a spreadsheet. DealGapIQ gives me a better answer in under a minute. The Deal Gap concept alone changed how I evaluate deals.',
    initials: 'MR',
    name: 'Michael R.',
    role: 'Portfolio investor · 12 properties',
  },
  {
    quote: 'The Income Value calculation is something I\u2019ve never seen anywhere else. Knowing exactly where breakeven sits — before I even tour a property — saves me from chasing bad deals.',
    initials: 'TL',
    name: 'Tamara L.',
    role: 'BRRRR investor · Denver, CO',
  },
  {
    quote: 'I was skeptical of another calculator tool. But seeing the actual assumptions behind the numbers — and being able to change them — that\u2019s what convinced me to pay for Pro.',
    initials: 'JK',
    name: 'James K.',
    role: 'CPA & buy-and-hold investor',
  },
];

function TestimonialsSection() {
  return (
    <section className="px-6 md:px-12 lg:px-20 py-24 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-4">
            What Early Users Are Saying
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Investors Use DealGap<span className="text-sky-400">IQ</span>{' '}
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              Before They Make an Offer.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial: t }: { testimonial: Testimonial }) {
  return (
    <div className="bg-black border border-[#14181F] rounded-2xl p-7 flex flex-col gap-6 hover:border-sky-500/30 transition">
      {/* Quote */}
      <p className="text-slate-300 italic leading-relaxed flex-1 text-[15px]">
        &ldquo;{renderQuoteWithBrand(t.quote)}&rdquo;
      </p>

      {/* Attribution */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#14181F]">
        <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-sky-300">{t.initials}</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{t.name}</p>
          <p className="text-xs text-slate-500">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

/** Highlight DealGapIQ brand mark within testimonial quotes. */
function renderQuoteWithBrand(quote: string): React.ReactNode {
  if (!quote.includes('DealGapIQ')) return quote;
  const parts = quote.split('DealGapIQ');
  return (
    <>
      {parts[0]}
      <strong className="not-italic font-semibold text-white">
        DealGap<span className="text-sky-400">IQ</span>
      </strong>
      {parts[1]}
    </>
  );
}

/* ---------- FINAL CTA ---------- */

function FinalCTASection({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <section className="px-6 md:px-12 lg:px-20 py-24 md:py-32">
      <div className="max-w-4xl mx-auto text-center relative">
        <div className="absolute -top-20 left-1/4 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Stop Browsing Like a Buyer.<br />
            Start Thinking Like an{' '}
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">Investor.</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Search or paste any address. See the three price thresholds, the Verdict score, and which strategy makes it work.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <PrimaryButton onClick={onAnalyze}>Analyze a Property Free <span>→</span></PrimaryButton>
            <SecondaryButton onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>See Plans</SecondaryButton>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm text-slate-400 mb-8">
            <CheckRow label="No credit card" />
            <CheckRow label="3 free analyses" />
            <CheckRow label="Every assumption editable" />
          </div>
          <AppStoreBadges />
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */

function SiteFooter() {
  return (
    <footer className="border-t border-[#14181F] bg-black px-6 md:px-12 lg:px-20 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center mb-3">
              <span className="text-2xl font-bold tracking-tight">
                DealGap<span className="text-sky-400">IQ</span>
              </span>
              <span className="ml-1 text-sky-400 text-2xl font-bold leading-none">_</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Not a listing site. A deal decision engine. Built for first-time investors. Trusted by experienced buyers.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Product</div>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><a href="#workbench" className="hover:text-sky-400">The Workbench</a></li>
              <li><a href="#pricing" className="hover:text-sky-400">Pricing</a></li>
              <li><Link href="/search" className="hover:text-sky-400">Property Search</Link></li>
              <li><Link href="/" className="hover:text-sky-400">Drive-By Scan</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link href="/about" className="hover:text-sky-400">About</Link></li>
              <li><Link href="/help" className="hover:text-sky-400">Help</Link></li>
              <li><Link href="/privacy" className="hover:text-sky-400">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-sky-400">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-[#14181F] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">© 2026 DealGapIQ. All rights reserved.</div>
          <AppStoreBadges />
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
 * Shared sub-components
 * ============================================================ */

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-bold text-black transition-all"
      style={{
        background: 'linear-gradient(135deg, #0FA4E9 0%, #0465F2 100%)',
        boxShadow: '0 8px 24px -8px rgba(15,164,233,0.5)',
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-white bg-black border border-[#1E2530] hover:border-sky-500 transition-all"
    >
      {children}
    </button>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
      {label}
    </span>
  );
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/dealgapiq/id6759636866';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.dealgapiq.mobile&listing=dealgapiq';

function AppStoreBadges() {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download DealGapIQ on the App Store"
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-black border border-[#1E2530] hover:border-sky-500 transition"
      >
        <Apple className="w-7 h-7" />
        <div className="text-left">
          <div className="text-[9px] uppercase tracking-wide text-slate-400 leading-none">Download on the</div>
          <div className="text-sm font-semibold leading-tight mt-0.5">App Store</div>
        </div>
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get DealGapIQ on Google Play"
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-black border border-[#1E2530] hover:border-sky-500 transition"
      >
        <Play className="w-7 h-7" />
        <div className="text-left">
          <div className="text-[9px] uppercase tracking-wide text-slate-400 leading-none">Get it on</div>
          <div className="text-sm font-semibold leading-tight mt-0.5">Google Play</div>
        </div>
      </a>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="max-w-[320px] w-full overflow-hidden"
      style={{
        borderRadius: '2.5rem',
        background: '#000',
        border: '8px solid #1A1A1A',
        boxShadow: '0 0 0 1px #2A2A2A, 0 40px 80px -20px rgba(0,0,0,0.9), 0 0 120px -20px rgba(15,164,233,0.3)',
      }}
    >
      {children}
    </div>
  );
}

interface ValueCardProps {
  label: string;
  sub: string;
  value: string;
  color: 'sky' | 'amber' | 'rose';
}

function ValueCard({ label, sub, value, color }: ValueCardProps) {
  const styles = {
    sky: 'border-sky-500/40 text-sky-400',
    amber: 'border-amber-500/40 text-amber-400',
    rose: 'border-rose-500/40 text-rose-400',
  };
  return (
    <div className={`rounded-xl border-2 ${styles[color]} bg-black py-3 text-center`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 tabular-nums ${styles[color].split(' ')[1]}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}

/* ============================================================
 * Workbench module support
 * ============================================================ */

type AccentColor = 'sky' | 'purple' | 'teal' | 'orange';

const accentMap: Record<AccentColor, { pillBorder: string; pillText: string; dot: string; check: string; glow: string }> = {
  sky: { pillBorder: 'border-sky-500/40', pillText: 'text-sky-300', dot: 'bg-sky-400', check: 'text-sky-400', glow: '0 0 100px -30px rgba(15,164,233,0.4)' },
  purple: { pillBorder: 'border-purple-500/40', pillText: 'text-purple-300', dot: 'bg-purple-400', check: 'text-purple-400', glow: '0 0 100px -30px rgba(167,139,250,0.3)' },
  teal: { pillBorder: 'border-teal-500/40', pillText: 'text-teal-300', dot: 'bg-teal-400', check: 'text-teal-400', glow: '0 0 100px -30px rgba(45,212,191,0.3)' },
  orange: { pillBorder: 'border-orange-500/40', pillText: 'text-orange-300', dot: 'bg-orange-400', check: 'text-orange-400', glow: '0 0 100px -30px rgba(251,146,60,0.3)' },
};

interface ModuleRowProps {
  accent: AccentColor;
  pill: string;
  headline: string;
  body: React.ReactNode;
  bullets: React.ReactNode[];
  imagePosition: 'left' | 'right';
  mockup: React.ReactNode;
}

function ModuleRow({ accent, pill, headline, body, bullets, imagePosition, mockup }: ModuleRowProps) {
  const a = accentMap[accent];
  const copyOrder = imagePosition === 'right' ? 'order-2 lg:order-1' : '';
  const mockupOrder = imagePosition === 'right' ? 'order-1 lg:order-2' : '';

  return (
    <div className="max-w-7xl mx-auto mb-32 transition-transform duration-200 hover:[&_.mockup-frame]:translate-y-[-4px]">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className={copyOrder}>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[0.12em] uppercase border bg-black mb-6 ${a.pillBorder} ${a.pillText}`}>
            <span className={`w-2 h-2 rounded-full ${a.dot}`} />
            {pill}
          </div>
          <h3 className="text-3xl md:text-5xl font-bold mb-5 tracking-tight">{headline}</h3>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">{body}</p>
          <ul className="space-y-3.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-3 items-start text-slate-200">
                <Check className={`w-5 h-5 mt-0.5 shrink-0 ${a.check}`} strokeWidth={3} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={mockupOrder}>
          <div className="mockup-frame transition-transform duration-200" style={{ boxShadow: a.glow }}>
            <div className="bg-black border border-[#1E2530] rounded-2xl p-6">{mockup}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- mockups ---------- */

function VerdictMockup() {
  return (
    <>
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#1E2530]">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Home className="w-4 h-4 text-sky-400" />
            <span>3783 Moon Bay Cir</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            BEDS 4 · BA 2.6 · SQFT 2,410 · <span className="text-rose-400 text-[10px] font-extrabold tracking-[0.18em]">OFF-MARKET</span>
          </div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">Investment Overview</div>
      <div className="space-y-3 mb-6">
        <ValueCard label="Target Buy" sub="Profit Zone" value="$588,030" color="sky" />
        <ValueCard label="Income Value" sub="Break-Even" value="$618,979" color="amber" />
        <ValueCard label="Market Price" sub="Market Reality" value="$672,117" color="rose" />
      </div>
      <DealGapBar target={588030} income={618979} market={672117} size="full" />
    </>
  );
}

function StrategyMockup() {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Choose Strategy</div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        <StrategyPill label="Long-term" color="bg-blue-500/10 border-blue-500 text-blue-300" active />
        <StrategyPill label="Short-term" color="bg-black border-purple-500/30 text-purple-300" />
        <StrategyPill label="BRRRR" color="bg-black border-orange-500/30 text-orange-300" />
        <StrategyPill label="Fix & Flip" color="bg-black border-pink-500/30 text-pink-300" />
        <StrategyPill label="House Hack" color="bg-black border-teal-500/30 text-teal-300" />
        <StrategyPill label="Wholesale" color="bg-black border-lime-500/30 text-lime-300" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-[#1E2530]">
        <MetricMini label="Buy Price" value="$588,030" />
        <MetricMini label="Cash Needed" value="$173,894" />
        <MetricMini label="Deal Gap" value="−12.5%" valueClassName="text-sky-400" />
      </div>
      <div className="space-y-2.5 text-sm">
        <DataRow label="Monthly Rent" value="$4,648" />
        <DataRow label="Total Expenses" value="$23,319/yr" />
        <DataRow label="NOI" value="$31,895/yr" valueClassName="text-emerald-400" />
        <DataRow label="Net Cash Flow" value="$1,595/yr" valueClassName="text-emerald-400" />
        <div className="pt-2 border-t border-[#1E2530]">
          <DataRow label="Cap Rate" value="5.4%" valueClassName="text-amber-400" />
        </div>
        <DataRow label="Cash-on-Cash" value="0.9%" valueClassName="text-amber-400" />
      </div>
    </>
  );
}

function AppraiserMockup() {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Appraisal Values</div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-teal-500/30 bg-black p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Comp Appraisal</div>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">$676,039</div>
          <div className="text-[10px] text-slate-500 mt-0.5">As-Is Condition</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-black p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Est. After Repair</div>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">$777,445</div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">↗ +15% rehab premium</div>
        </div>
      </div>
      <div className="rounded-xl bg-black border border-[#1E2530] p-3 flex items-center justify-between mb-5">
        <div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">98%</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Confidence</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Range</div>
          <div className="text-sm text-white font-bold tabular-nums">$658K — $711K</div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">Proximity Map · Sale Comps (5)</div>
      <div className="relative h-40 rounded-lg bg-black overflow-hidden border border-[#1E2530] mb-4">
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 200 120" preserveAspectRatio="none">
          <path d="M0,40 Q50,20 100,40 T200,40" stroke="#475569" strokeWidth="2" fill="none" />
          <path d="M0,80 Q50,100 100,80 T200,80" stroke="#475569" strokeWidth="2" fill="none" />
          <path d="M40,0 L60,120" stroke="#475569" strokeWidth="1" />
          <path d="M120,0 L140,120" stroke="#475569" strokeWidth="1" />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-rose-500 ring-4 ring-rose-500/30 flex items-center justify-center text-white text-xs font-bold">$</div>
        <div className="absolute top-[20%] left-[28%] w-4 h-4 rounded-full bg-teal-400 ring-2 ring-teal-400/30" />
        <div className="absolute top-[60%] left-[18%] w-4 h-4 rounded-full bg-teal-400 ring-2 ring-teal-400/30" />
        <div className="absolute top-[30%] right-[22%] w-4 h-4 rounded-full bg-teal-400 ring-2 ring-teal-400/30" />
        <div className="absolute top-[70%] right-[28%] w-4 h-4 rounded-full bg-teal-400 ring-2 ring-teal-400/30" />
        <div className="absolute top-[45%] right-[10%] w-4 h-4 rounded-full bg-teal-400 ring-2 ring-teal-400/30" />
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">Top Comp · 96% Match</div>
      <div className="rounded-lg bg-black border border-[#1E2530] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">11472 Beacon Pointe Ln</span>
          <span className="text-sm font-bold text-teal-400 tabular-nums">$658,150</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 tabular-nums">Size +$6,900</span>
          <span className="px-1.5 py-0.5 rounded bg-black border border-[#1E2530] text-slate-400 tabular-nums">Bed +$0</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 tabular-nums">Lot +$1,250</span>
        </div>
      </div>
    </>
  );
}

function DealMakerMockup() {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">House Hack — FHA</div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StrategyPill label="FHA" color="bg-sky-500/15 border-sky-500 text-sky-300" active />
        <StrategyPill label="Conv" color="bg-black border-[#1E2530] text-slate-400" />
        <StrategyPill label="VA" color="bg-black border-[#1E2530] text-slate-400" />
      </div>
      <div className="space-y-3 mb-5">
        <DealMakerInput label="Down Payment" value="$129,420" highlighted />
        <DealMakerInput label="Interest Rate" value="6.50%" />
        <DealMakerInput label="Rent / Unit" value="$1,162/mo" />
        <DealMakerInput label="Vacancy" value="5%" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1E2530]">
        <div className="rounded-lg bg-black border border-emerald-500/30 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Effective Housing</div>
          <div className="text-lg font-bold text-emerald-400 mt-1 tabular-nums">+$0/mo</div>
          <div className="text-[10px] text-slate-500">Your monthly cost</div>
        </div>
        <div className="rounded-lg bg-black border border-emerald-500/30 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Net Rental</div>
          <div className="text-lg font-bold text-emerald-400 mt-1 tabular-nums">$3,312/mo</div>
          <div className="text-[10px] text-slate-500">After expenses</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-sky-400">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        <span className="font-bold">Numbers update as you edit</span>
      </div>
    </>
  );
}

function EstimatorMockup() {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Quick Start Presets</div>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <PresetCard label="Cosmetic" value="$15,000" />
        <PresetCard label="Light" value="$35,000" />
        <PresetCard label="Medium" value="$65,000" />
        <PresetCard label="Heavy ✓" value="$120,000" active />
      </div>
      <div className="space-y-2.5 mb-5">
        <LineItem heading="Kitchen" total="$45,000" detail="Cabinets · Countertops · Appliances" count="3 items" />
        <LineItem heading="Bathroom" total="$66,000" detail="Full Remodel · Half Bath" count="2 items" />
        <LineItem heading="Major Systems" total="$9,500" detail="HVAC · Water Heater" count="2 items" />
        <LineItem heading="Exterior" total="$24,000" />
      </div>
      <div className="rounded-lg bg-black border border-orange-500/30 p-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-orange-300">Contingency Reserve</div>
            <div className="text-[10px] text-slate-500">Buffer for unexpected costs</div>
          </div>
          <div className="text-lg font-bold text-orange-400 tabular-nums">+$18,630</div>
        </div>
      </div>
      <div className="pt-4 border-t-2 border-orange-500/40 flex justify-between items-center">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Total Estimate</div>
          <div className="text-[10px] text-slate-500">Local pricing applied</div>
        </div>
        <div className="text-3xl font-bold text-orange-400 tabular-nums">$204,930</div>
      </div>
    </>
  );
}

/* ---------- small helpers ---------- */

function StrategyPill({ label, color, active }: { label: string; color: string; active?: boolean }) {
  return <div className={`py-2.5 rounded-lg text-center text-sm font-bold border ${color} ${active ? 'border-2' : ''}`}>{label}</div>;
}

function MetricMini({ label, value, valueClassName = '' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className={`text-lg font-bold mt-0.5 tabular-nums ${valueClassName || 'text-white'}`}>{value}</div>
    </div>
  );
}

function DataRow({ label, value, valueClassName = '' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold tabular-nums ${valueClassName || 'text-white'}`}>{value}</span>
    </div>
  );
}

function DealMakerInput({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <label className="text-sm text-slate-400">{label}</label>
      <div className={`px-3 py-1.5 rounded-lg bg-black border text-sm font-bold min-w-[110px] text-right tabular-nums ${highlighted ? 'border-sky-500/40 text-sky-300' : 'border-[#1E2530] text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function PresetCard({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className={`rounded-lg p-3 bg-black border ${active ? 'border-2 border-orange-500' : 'border-[#1E2530]'}`}>
      <div className={`text-xs font-bold ${active ? 'text-orange-300' : 'text-sky-400'}`}>{label}</div>
      <div className="text-sm font-bold text-white mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function LineItem({ heading, total, detail, count }: { heading: string; total: string; detail?: string; count?: string }) {
  return (
    <>
      <div className="flex justify-between items-center text-sm pt-2 border-t border-[#1E2530] first:border-t-0 first:pt-0">
        <span className="text-sky-400 font-bold">{heading}</span>
        <span className="text-white font-bold tabular-nums">{total}</span>
      </div>
      {detail && (
        <div className="flex justify-between items-center text-sm pl-4">
          <span className="text-slate-400">{detail}</span>
          {count && <span className="text-slate-500 text-xs">{count}</span>}
        </div>
      )}
    </>
  );
}

function StatCard({ icon, value, label, iconBg }: { icon: React.ReactNode; value: string; label: string; iconBg: 'sky' | 'emerald' | 'amber' | 'purple' }) {
  const bgs = { sky: 'bg-sky-500/10 border-sky-500/30', emerald: 'bg-emerald-500/10 border-emerald-500/30', amber: 'bg-amber-500/10 border-amber-500/30', purple: 'bg-purple-500/10 border-purple-500/30' };
  return (
    <div className="bg-black border border-[#14181F] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${bgs[iconBg]}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
    </div>
  );
}

function RecentSearchRow({ addr, meta, price, saved, ago, verdict }: { addr: string; meta: string; price: string; saved: boolean; ago: string; verdict: 'DEAL' | 'CHECK' | 'PASS' }) {
  const verdictStyle = verdict === 'DEAL' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : verdict === 'CHECK' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400';
  return (
    <div className="bg-black border border-[#14181F] rounded-2xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
        <Home className="w-4 h-4 text-sky-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{addr}</div>
        <div className="text-[11px] text-slate-500 tabular-nums">{meta}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sky-400 text-xs font-bold tabular-nums">{price}</span>
          <span className="text-slate-600">·</span>
          {saved && (
            <>
              <span className="text-emerald-400 text-[10px] font-bold tracking-wider">⭐ SAVED</span>
              <span className="text-slate-600">·</span>
            </>
          )}
          <span className="text-slate-500 text-[10px]">{ago}</span>
        </div>
      </div>
      <div className={`px-2 py-1 rounded-md border text-[10px] font-bold tracking-wider ${verdictStyle}`}>{verdict}</div>
    </div>
  );
}

function ScanFeature({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <li className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-bold text-white mb-0.5">{title}</div>
        <div className="text-sm text-slate-400">{subtitle}</div>
      </div>
    </li>
  );
}

function PricingRow({ text, included = true, accent = 'sky' }: { text: React.ReactNode; included?: boolean; accent?: 'sky' | 'amber' }) {
  if (!included) {
    return (
      <li className="flex gap-2.5 text-slate-500">
        <XIcon className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" strokeWidth={3} />
        <span>{text}</span>
      </li>
    );
  }
  return (
    <li className="flex gap-2.5 text-slate-200">
      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${accent === 'amber' ? 'text-amber-400' : 'text-sky-400'}`} strokeWidth={3} />
      <span>{text}</span>
    </li>
  );
}

function FounderStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-sky-400 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
    </div>
  );
}
