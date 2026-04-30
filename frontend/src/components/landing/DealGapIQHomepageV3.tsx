'use client';

/**
 * DealGapIQHomepageV3
 *
 * Homepage rebuild centered on the Four Paths feature.
 * Source of truth for copy: HOMEPAGE_MARKETING_PLAN.md at the project root.
 *
 * Sections (top → bottom):
 *  1. Hero — "Stop Scrolling Listings. Start Hunting Real Deals. Close Four Different Ways."
 *  2. After-the-verdict demo — Lake Worth example with the four paths
 *  3. Negotiation Playbook — Subject-To. Seller carrybacks. 0% 2nds.
 *  4. How it compares — table vs Listing Sites and Investor Calculators
 *  5. Trust Layer — data sources + founder note + verify-it-yourself
 *  6. Closer — final CTA + lead magnet + manifesto line
 *
 * Design language:
 *  - Pure black backgrounds inside cards
 *  - Hazy cyan ambient glow over the page
 *  - Gradient text on section H1/H2 (sky → blue)
 *  - Slate body text (--text-body / --text-secondary)
 *  - Lucide icons throughout
 *  - max-w-7xl centered containers, generous vertical rhythm
 */

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Check,
  Printer,
  Mail,
  Copy,
  Database,
  ChevronRight,
  Sparkles,
  ScanLine,
  Map as MapIcon,
} from 'lucide-react';
import { useAuthModal } from '@/hooks/useAuthModal';

// Shared headline typography — every hero statement on the page (H1 + section H2s)
// pulls from this so the family / weight / leading / tracking stay aligned.
// Responsive size lives on the className (Tailwind utilities) so hierarchy is preserved.
const HEADLINE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
  fontWeight: 800,
  lineHeight: 1.08,
  letterSpacing: '-0.025em',
};
const HERO_H1_STYLE: React.CSSProperties = {
  ...HEADLINE_STYLE,
  fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
};

interface Props {
  onPointAndScan?: () => void;
}

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

export function DealGapIQHomepageV3({ onPointAndScan }: Props) {
  const router = useRouter();

  const handleVerdictClick = (presetAddress?: string) => {
    if (presetAddress) {
      router.push(`/verdict?address=${encodeURIComponent(presetAddress)}`);
    } else {
      router.push('/search');
    }
  };

  const handleMapSearch = () => router.push('/map-search');

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

      {/* Top app nav is provided by global layout; this component intentionally omits its own header. */}

      <main className="relative z-10">
        <HeroSection
          onVerdict={handleVerdictClick}
          onSeePaths={() => scrollTo('demo')}
        />
        <DemoSection onTry={() => handleVerdictClick()} />
        <PlaybookSection onSeeScript={() => handleVerdictClick()} />
        <ComparisonSection />
        <TrustSection
          onVerdict={handleVerdictClick}
          onPointAndScan={onPointAndScan}
          onMapSearch={handleMapSearch}
        />
        <CloserSection onVerdict={handleVerdictClick} />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ============================================================
 * SECTION 1 — HERO
 * ============================================================ */

function HeroSection({
  onVerdict,
  onSeePaths,
}: {
  onVerdict: (preset?: string) => void;
  onSeePaths: () => void;
}) {
  return (
    <section className="px-6 md:px-12 lg:px-20 pt-10 md:pt-14 pb-32 md:pb-44">
      <div className="max-w-7xl mx-auto">
        <div className="grid xl:grid-cols-[7fr_5fr] gap-10 xl:gap-14 items-center">
          {/* Text column — order 2 on mobile (below image), 1 on xl (left side) */}
          <div className="text-center xl:text-left order-2 xl:order-1">
            <h1
              className="mb-8 xl:mb-10 mx-auto xl:mx-0 max-w-3xl xl:max-w-none text-[clamp(2.6rem,6vw,4.5rem)] xl:text-[clamp(2.4rem,4vw,3.75rem)]"
              style={HEADLINE_STYLE}
            >
              <span className="text-white">Stop Scrolling Listings.</span>
              <br />
              <span className="text-white">Start Hunting Real Deals.</span>
              <br />
              <span className="text-sky-400">Close Four Different Ways.</span>
            </h1>

            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto xl:mx-0 mb-9">
              One address. <span className="text-white font-semibold">15 seconds.</span> A verdict backed by{' '}
              <span className="text-white font-semibold">6 data sources</span> — and DealGap
              <span className="text-sky-400">IQ</span> will craft{' '}
              <span className="text-white font-semibold">four offer structures</span> that cash-flow,{' '}
              <span className="text-white font-semibold">which you can customize</span>.
            </p>

            <div className="flex flex-col sm:flex-row items-center xl:items-start gap-5 sm:gap-6 mb-8">
              <PrimaryButtonLarge sublabel="on any property" onClick={() => onVerdict()}>
                Run a Free Verdict <ChevronRight className="w-5 h-5 inline-block align-middle" strokeWidth={2.5} />
              </PrimaryButtonLarge>
              <button
                onClick={onSeePaths}
                className="text-sm text-sky-400 font-semibold hover:underline inline-flex items-center gap-1.5"
              >
                See the Four Paths <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center justify-center xl:justify-start gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
                6 data sources
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
                15-second analysis
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
                No signup required
              </span>
            </div>
          </div>

          {/* Image showcase — contained, designed object (rounded card + halo) */}
          <div className="order-1 xl:order-2 relative w-full max-w-xl xl:max-w-none mx-auto">
            {/* Cyan halo behind the card */}
            <div
              aria-hidden
              className="absolute -inset-10 -z-10"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(56,189,248,0.25) 0%, transparent 60%)',
                filter: 'blur(50px)',
              }}
            />

            {/* Card */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                border: '1px solid rgba(56,189,248,0.20)',
                boxShadow: '0 30px 80px -20px rgba(15,164,233,0.35)',
              }}
            >
              <Image
                src="/images/phone-house-hero.png"
                alt="DealGapIQ analyzing a residential property on a phone, with a suburban home in the background"
                width={1024}
                height={826}
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 60vw, 520px"
                className="block w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroOptionButton({
  icon,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={sublabel}
      className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-focus)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
    >
      <span className="text-sky-400 shrink-0">{icon}</span>
      <span className="text-sm font-semibold text-white whitespace-nowrap">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" strokeWidth={2.5} />
    </button>
  );
}

/* ============================================================
 * SECTION 2 — AFTER THE VERDICT (Lake Worth demo)
 * ============================================================ */

function DemoSection({ onTry }: { onTry: () => void }) {
  return (
    <section id="demo" className="px-6 md:px-12 lg:px-20 pb-32 md:pb-44">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-5">
            What You Get
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl mb-6" style={HEADLINE_STYLE}>
            The Verdict tells you the gap.
            <br />
            <span className="text-sky-400">
              We tell you how to close it.
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left: copy + bullets */}
          <div>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-7">
              A verdict on this <span className="text-white font-semibold">$457,100</span> listing came back at{' '}
              <span className="text-amber-400 font-semibold tabular-nums">−6.4% Deal Gap</span> — the math doesn't
              pencil at standard 20%-down financing.{' '}
              <span className="text-slate-400">That's where most tools stop.</span>
            </p>

            <p className="text-base md:text-lg text-slate-200 font-semibold mb-7">
              DealGap<span className="text-sky-400">IQ</span> keeps going. Four pre-built offers, each one closing the
              gap a different way:
            </p>

            <ol className="space-y-5 mb-10">
              <PathBullet
                num="1"
                title="Verify the rent to $3,556."
                body="A comp check, not a negotiation — the deal might already work."
              />
              <PathBullet
                num="2"
                title="Negotiate to $428K."
                body="The simple ask. Often what gets a long-DOM listing across the line."
              />
              <PathBullet
                num="3"
                title="Put 31% down ($156K)."
                body="Capital, not concession — when you have the cash and want the asset."
              />
              <PathBullet
                num="4"
                title="Blended plan."
                body="Small price cut + seller carries a $2,719 2nd at 0% + 0.6% verified rent lift. The structure no single lever could close."
                highlight
              />
            </ol>

            <p className="text-sm text-slate-300 leading-relaxed mb-7">
              Each path opens a <span className="text-white font-semibold">pre-loaded, editable Strategy worksheet</span>{' '}
              — and a <span className="text-white font-semibold">negotiation script</span> you can print, email, or
              copy to present with confidence.
            </p>

            <button
              onClick={onTry}
              className="inline-flex items-center gap-1.5 text-sky-400 font-semibold text-sm hover:underline"
            >
              Try it on a property <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right: verdict screen mockup */}
          <div className="lg:sticky lg:top-8">
            <VerdictMockup />
            <p className="text-center text-xs text-slate-500 mt-5 italic">
              This is one of millions of listings. Run yours.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PathBullet({
  num,
  title,
  body,
  highlight,
}: {
  num: string;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex gap-4">
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${
          highlight ? 'text-black' : 'text-sky-400'
        }`}
        style={{
          background: highlight
            ? 'linear-gradient(135deg, #0FA4E9 0%, #0465F2 100%)'
            : 'rgba(15,164,233,0.10)',
          border: highlight ? 'none' : '1px solid rgba(15,164,233,0.30)',
        }}
      >
        {num}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-base font-semibold text-white leading-snug mb-1">
          {title}
          {highlight && (
            <span className="ml-2 inline-block text-[10px] uppercase tracking-wider font-bold text-sky-400 align-middle">
              ← The structure investors miss
            </span>
          )}
        </div>
        <div className="text-sm text-slate-400 leading-relaxed">{body}</div>
      </div>
    </li>
  );
}

function VerdictMockup() {
  // Component-based mockup of a Four Paths verdict screen.
  // Mirrors what the real verdict page renders for the Lake Worth example.
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#000',
        border: '1px solid #14181F',
        boxShadow: '0 24px 60px -20px rgba(15,164,233,0.25)',
      }}
    >
      {/* Header strip */}
      <div className="px-5 py-3 border-b border-[#14181F] flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">
          1014–16 N J St, Lake Worth, FL
        </span>
        <span className="text-[10px] font-bold tracking-widest text-amber-400">LISTED</span>
      </div>

      {/* DealGap row */}
      <div className="px-5 pt-5 pb-3 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-sky-400 font-bold mb-2">
          Near Deal · one lever away
        </div>
        <div className="text-3xl font-bold tabular-nums">
          <span className="text-slate-200">DealGap </span>
          <span className="text-amber-400">−6.4%</span>
        </div>
        <div className="text-xs text-slate-500 mt-1.5">
          Mild Negative Gap · $457,100 list · $428K target buy
        </div>
      </div>

      {/* Four cards in a 2x2 mini-grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <MockCard num="1" tag="Income uplift" title="Verify or raise rent to $3,556" />
        <MockCard num="2" tag="Realistic ask" title="Negotiate to $428K" />
        <MockCard num="3" tag="Capital-heavy" title="Put 31% down ($156K)" />
        <MockCard num="4" tag="Best-effort combo" title="Blended plan" highlight />
      </div>

      {/* Footer pill */}
      <div className="px-3 pb-3">
        <div
          className="rounded-lg py-2.5 text-center text-xs font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(15,164,233,0.15) 0%, rgba(4,101,242,0.10) 100%)',
            border: '1px solid rgba(15,164,233,0.30)',
            color: '#7DD3FC',
          }}
        >
          Continue to Strategy →
        </div>
      </div>
    </div>
  );
}

function MockCard({
  num,
  tag,
  title,
  highlight,
}: {
  num: string;
  tag: string;
  title: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: highlight ? 'rgba(15,164,233,0.05)' : '#0A0F18',
        border: `1px solid ${highlight ? 'rgba(15,164,233,0.40)' : '#1E2530'}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`text-[9px] font-bold uppercase tracking-wider ${
            highlight ? 'text-sky-400' : 'text-slate-500'
          }`}
        >
          Path {num}
        </span>
        <span className="text-[9px] text-slate-500 italic">{tag}</span>
      </div>
      <div className="text-xs font-semibold text-white leading-snug">{title}</div>
    </div>
  );
}

/* ============================================================
 * SECTION 3 — NEGOTIATION PLAYBOOK
 * ============================================================ */

function PlaybookSection({ onSeeScript }: { onSeeScript: () => void }) {
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-32 md:pb-44">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-5">
            The Closing Tool Nobody Else Has
          </div>
          <h2
            className="text-3xl md:text-5xl lg:text-6xl mb-6 text-balance"
            style={HEADLINE_STYLE}
          >
            <span className="block">
              Subject-To. Seller holds a 0%{' '}2nd.
            </span>
            <span className="block text-sky-400">
              We write the script for every{' '}one.
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left: script breakdown */}
          <div>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-7">
              Investors are quietly closing deals with structures most tools won't even model — Subject-To, seller
              carrybacks, 0% 2nds with a balloon, wraparound notes, rate buydowns. Knowing the structure isn't
              enough. You have to{' '}
              <span className="text-white font-semibold">pitch it on the phone</span>, in language a seller will agree
              to.
            </p>

            <p className="text-base text-slate-200 font-semibold mb-6">
              DealGap<span className="text-sky-400">IQ</span> writes the script for you, structure-by-structure:
            </p>

            <ul className="space-y-4 mb-10">
              <ScriptBullet label="Who to call." body="Listing agent or seller direct, depending on listing type and creative-finance fluency." />
              <ScriptBullet label="The frame." body={`"Price for terms" — what you're trading, why both sides win.`} />
              <ScriptBullet label="The opener." body="A discovery question that surfaces what the seller actually needs." />
              <ScriptBullet label="The pitch." body="Full-asking-price offer with the structure that makes the math work." />
              <ScriptBullet label="What's in it for the seller." body="Three concrete reasons why this beats a price cut." />
            </ul>

            {/* Print / Email / Copy strip */}
            <div className="flex items-center gap-6 mb-10 pb-8 border-b border-[#14181F]">
              <DeliveryIcon icon={<Printer className="w-5 h-5" />} label="Print" />
              <DeliveryIcon icon={<Mail className="w-5 h-5" />} label="Email" />
              <DeliveryIcon icon={<Copy className="w-5 h-5" />} label="Copy" />
              <span className="text-xs text-slate-500 italic ml-auto">One click.</span>
            </div>

            <button
              onClick={onSeeScript}
              className="inline-flex items-center gap-1.5 text-sky-400 font-semibold text-sm hover:underline"
            >
              See a sample script <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right: pull quote card */}
          <div className="lg:sticky lg:top-8">
            <PullQuoteCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScriptBullet({ label, body }: { label: string; body: string }) {
  return (
    <li className="flex gap-3.5">
      <Check className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" strokeWidth={2.5} />
      <div className="leading-relaxed">
        <span className="text-white font-semibold">{label}</span>{' '}
        <span className="text-slate-400">{body}</span>
      </div>
    </li>
  );
}

function DeliveryIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-sky-400"
        style={{
          background: 'rgba(15,164,233,0.08)',
          border: '1px solid rgba(15,164,233,0.30)',
        }}
      >
        {icon}
      </div>
      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function PullQuoteCard() {
  return (
    <div
      className="rounded-2xl p-8 md:p-10 relative"
      style={{
        background: '#000',
        border: '1px solid rgba(15,164,233,0.35)',
        boxShadow: '0 24px 60px -20px rgba(15,164,233,0.20)',
      }}
    >
      <div
        className="absolute -top-3 left-7 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] rounded"
        style={{
          background: 'linear-gradient(135deg, #0FA4E9 0%, #0465F2 100%)',
          color: '#000',
        }}
      >
        Sample Script
      </div>

      <Sparkles className="w-5 h-5 text-sky-400 mb-4" />

      <p className="text-base md:text-lg leading-relaxed text-slate-100 italic mb-6">
        "I can pay full asking — <span className="not-italic font-semibold text-white">$646,050</span>, no haircut —
        if the seller is open to carrying <span className="not-italic font-semibold text-white">$129,210</span> of
        that as a second mortgage at <span className="not-italic font-semibold text-sky-400">0% interest</span> with a
        5-year balloon. Bank takes the first, seller takes the second, and in 5 years I refinance and the seller gets
        a single check for <span className="not-italic font-semibold text-white">$129,210</span>."
      </p>

      <div className="text-xs text-slate-500 not-italic">— A real DealGapIQ-generated pitch script</div>

      <div className="mt-8 pt-6 border-t border-[#14181F] text-center">
        <div className="text-xs text-slate-400 italic">
          Knowing the structure isn't enough. DealGapIQ writes the script.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * SECTION 4 — HOW IT COMPARES
 * ============================================================ */

const COMPARISON_ROWS: Array<{
  feature: string;
  subline?: string;
  listing: 'yes' | 'no' | 'partial';
  calc: 'yes' | 'no' | 'partial';
  iq: 'yes' | 'no' | 'partial';
}> = [
  { feature: 'Multi-source valuation', subline: 'IQ, Zillow, RentCast, Redfin', listing: 'partial', calc: 'partial', iq: 'yes' },
  { feature: 'Cash-flow analysis', listing: 'no', calc: 'yes', iq: 'yes' },
  { feature: 'Deal Gap verdict', subline: 'verified vs. asking', listing: 'no', calc: 'partial', iq: 'yes' },
  { feature: 'Plain-English explanation', subline: '5th-grade narrative', listing: 'no', calc: 'no', iq: 'yes' },
  { feature: 'Pre-built offer structures', subline: 'four per property', listing: 'no', calc: 'no', iq: 'yes' },
  { feature: 'Creative-finance modeling', subline: 'Sub2, seller carry, 0% 2nds', listing: 'no', calc: 'no', iq: 'yes' },
  { feature: 'Negotiation script generator', listing: 'no', calc: 'no', iq: 'yes' },
  { feature: 'Print · email · copy script delivery', listing: 'no', calc: 'no', iq: 'yes' },
  { feature: 'Pre-loaded Strategy worksheet', listing: 'no', calc: 'partial', iq: 'yes' },
  { feature: 'Off-market property analysis', listing: 'no', calc: 'partial', iq: 'yes' },
];

function ComparisonSection() {
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-32 md:pb-44">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-5">
            How It Compares
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl mb-5" style={HEADLINE_STYLE}>
            Where most tools stop,
            <br />
            <span className="text-sky-400">
              DealGapIQ keeps going.
            </span>
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto italic">
            Side-by-side with the tools investors already use.
          </p>
        </div>

        <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-4xl mx-auto mb-12 text-center">
          Listing sites help you find properties. Cash-flow calculators help you analyze them. Neither helps you{' '}
          <span className="text-white font-semibold">structure the offer</span> that closes the gap.
        </p>

        <ComparisonTable />

        <div className="text-center mt-12 mb-2">
          <div
            className="inline-block py-2 px-4 text-base md:text-lg italic font-semibold"
            style={{ color: '#7DD3FC' }}
          >
            That's where most tools stop. DealGapIQ keeps going.
          </div>
        </div>

        <p className="text-[11px] text-slate-600 max-w-3xl mx-auto text-center mt-10 leading-relaxed">
          Comparison reflects publicly documented features as of Q2 2026. Tools evolve — if a competitor adds a
          feature we've marked missing, we'll update this table. We don't compete on what they have; we compete on
          what they don't.
        </p>
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#000',
        border: '1px solid #14181F',
      }}
    >
      {/* Header row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] md:grid-cols-[3fr_1fr_1fr_1.2fr] border-b border-[#14181F]">
        <div className="px-4 md:px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          Feature
        </div>
        <div className="px-2 md:px-4 py-4 text-center text-xs font-bold text-slate-400">
          <div>Listing Sites</div>
          <div className="text-[10px] font-normal text-slate-600 mt-0.5 italic">
            Zillow, Redfin, Realtor.com
          </div>
        </div>
        <div className="px-2 md:px-4 py-4 text-center text-xs font-bold text-slate-400">
          <div>Investor Calculators</div>
          <div className="text-[10px] font-normal text-slate-600 mt-0.5 italic">
            DealCheck, BP Calc, Mashvisor
          </div>
        </div>
        <div
          className="px-2 md:px-4 py-4 text-center text-xs font-bold"
          style={{ background: 'rgba(15,164,233,0.08)', color: '#7DD3FC' }}
        >
          <div>DealGapIQ</div>
        </div>
      </div>

      {/* Rows */}
      {COMPARISON_ROWS.map((row, idx) => (
        <div
          key={row.feature}
          className={`grid grid-cols-[2fr_1fr_1fr_1fr] md:grid-cols-[3fr_1fr_1fr_1.2fr] ${
            idx < COMPARISON_ROWS.length - 1 ? 'border-b border-[#14181F]' : ''
          }`}
        >
          <div className="px-4 md:px-6 py-5">
            <div className="text-sm font-semibold text-slate-200 leading-tight">{row.feature}</div>
            {row.subline && (
              <div className="text-[11px] text-slate-500 italic mt-0.5">{row.subline}</div>
            )}
          </div>
          <CompCell mark={row.listing} />
          <CompCell mark={row.calc} />
          <CompCell mark={row.iq} highlight />
        </div>
      ))}
    </div>
  );
}

function CompCell({
  mark,
  highlight,
}: {
  mark: 'yes' | 'no' | 'partial';
  highlight?: boolean;
}) {
  const display =
    mark === 'yes' ? (
      <Check
        className={`w-5 h-5 ${highlight ? 'text-sky-400' : 'text-emerald-400'}`}
        strokeWidth={3}
      />
    ) : mark === 'partial' ? (
      <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
        partial
      </span>
    ) : (
      <span className="text-slate-700 text-lg">—</span>
    );

  return (
    <div
      className="px-2 md:px-4 py-5 flex items-center justify-center"
      style={highlight ? { background: 'rgba(15,164,233,0.05)' } : undefined}
    >
      {display}
    </div>
  );
}

/* ============================================================
 * SECTION 5 — TRUST LAYER
 * ============================================================ */

function TrustSection({
  onVerdict,
  onPointAndScan,
  onMapSearch,
}: {
  onVerdict: (preset?: string) => void;
  onPointAndScan?: () => void;
  onMapSearch: () => void;
}) {
  return (
    <section className="px-6 md:px-12 lg:px-20 pb-32 md:pb-44">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-5">
            The Trust Layer
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl mb-5" style={HEADLINE_STYLE}>
            Trust comes from
            <br />
            <span className="text-sky-400">
              seeing the work.
            </span>
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Every number on this site is sourced. Every structure is reviewable.{' '}
            <span className="text-slate-300 font-semibold">Run your own zip code.</span>
          </p>
        </div>

        {/* 5a — Data sources */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Built on the data investors actually trust.
            </h3>
          </div>
          <DataSourceStrip />
          <p className="text-center text-sm text-slate-400 mt-8 italic">
            Data sources visible on every analysis.{' '}
            <span className="text-slate-200 font-semibold not-italic">
              Switch sources, see the math change.
            </span>
          </p>
        </div>

        {/* 5b — Founder note */}
        <FounderNote />

        {/* 5c — Verify it yourself */}
        <VerifyBlock
          onVerdict={onVerdict}
          onPointAndScan={onPointAndScan}
          onMapSearch={onMapSearch}
        />
      </div>
    </section>
  );
}

function DataSourceStrip() {
  const sources = [
    { name: 'IQ Estimate', desc: 'DealGapIQ proprietary blended valuation' },
    { name: 'Zillow Zestimate', desc: 'Consumer-grade comp valuation' },
    { name: 'RentCast', desc: 'Investor-grade rent and value AVMs' },
    { name: 'Redfin', desc: 'MLS-derived sale price benchmarks' },
    { name: 'Realtor.com', desc: 'MLS listings, status, and price history' },
    { name: 'Mashvisor', desc: 'Short-term rental revenue and occupancy' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {sources.map((s) => (
        <div
          key={s.name}
          className="rounded-xl p-4 text-center"
          style={{
            background: '#000',
            border: '1px solid #14181F',
          }}
        >
          <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center"
            style={{
              background: 'rgba(15,164,233,0.08)',
              border: '1px solid rgba(15,164,233,0.30)',
            }}
          >
            <Database className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-sm font-semibold text-white mb-1">{s.name}</div>
          <div className="text-[11px] text-slate-500 leading-snug">{s.desc}</div>
        </div>
      ))}
    </div>
  );
}

function FounderNote() {
  return (
    <div className="max-w-3xl mx-auto mb-20">
      <div
        className="rounded-2xl p-8 md:p-10"
        style={{
          background: '#000',
          border: '1px solid #14181F',
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-sky-500/40 shrink-0 ring-2 ring-sky-500/10">
            <Image
              src="/images/brad-geisen.jpg"
              alt="Brad Geisen, Founder of DealGapIQ"
              width={112}
              height={112}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-sky-400 font-bold">Why we built this</div>
            <div className="text-sm text-slate-300 mt-0.5">
              Brad Geisen · Founder of <span className="text-white font-semibold">Foreclosure.com</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 italic text-slate-300 leading-relaxed">
          <p>
            Most "deal analysis" tools were built for spreadsheet warriors who already know what they're doing. We
            built DealGapIQ for the investor who's tired of analyzing 30 properties to find one — and learning the
            hard way that{' '}
            <span className="text-white not-italic font-semibold">"good deals" don't show up in a feed</span>. They're
            constructed.
          </p>
          <p>
            Every property has more leverage than the asking price suggests. We built the tool that surfaces that
            leverage automatically — because writing custom Excel models for every listing isn't a job, it's an
            obstacle.
          </p>
        </div>
      </div>
    </div>
  );
}

function VerifyBlock({
  onVerdict,
  onPointAndScan,
  onMapSearch,
}: {
  onVerdict: (preset?: string) => void;
  onPointAndScan?: () => void;
  onMapSearch: () => void;
}) {
  const [val, setVal] = React.useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim()) onVerdict(val.trim());
  };

  return (
    <div className="max-w-3xl mx-auto text-center">
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-5">
        Don't take our word for it. Take ours and check it.
      </h3>
      <p className="text-base text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
        Run any property — yours, your neighbor's, the one you've been watching. Click any number on the verdict to
        see where it came from. Switch data sources and watch the four paths recompute live.{' '}
        <span className="text-slate-200 font-semibold">The methodology is the proof.</span>
      </p>

      <form onSubmit={submit} className="max-w-md mx-auto mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Enter address, City or Zip code."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-colors"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
            aria-label="Property address, city, or zip code"
            autoComplete="off"
          />
        </div>
        {/* Visually hidden submit button preserves Enter-key submission across browsers */}
        <button type="submit" className="sr-only" aria-label="Submit address">
          Submit
        </button>
      </form>

      <div className="flex items-center gap-3 mb-5 max-w-md mx-auto">
        <div className="flex-1 h-px bg-[#14181F]" />
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">or</span>
        <div className="flex-1 h-px bg-[#14181F]" />
      </div>

      <div className="flex flex-row justify-center gap-2 sm:gap-3">
        <HeroOptionButton
          icon={<ScanLine className="w-4 h-4" />}
          label="Scan Property"
          sublabel="Drive-by camera capture"
          onClick={onPointAndScan}
          disabled={!onPointAndScan}
        />
        <HeroOptionButton
          icon={<MapIcon className="w-4 h-4" />}
          label="Map Search"
          sublabel="Hunt by neighborhood or ZIP"
          onClick={onMapSearch}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * SECTION 6 — CLOSER
 * ============================================================ */

function CloserSection({ onVerdict }: { onVerdict: (preset?: string) => void }) {
  const [email, setEmail] = React.useState('');
  const [emailSubmitted, setEmailSubmitted] = React.useState(false);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire to email provider in a future ticket. For now, optimistic UI.
    setEmailSubmitted(true);
  };

  return (
    <section className="px-6 md:px-12 lg:px-20 pb-32 md:pb-44">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-xs uppercase tracking-[0.25em] text-sky-400 font-bold mb-5">
          Now Try It
        </div>
        <h2 className="text-3xl md:text-5xl lg:text-6xl mb-6" style={HEADLINE_STYLE}>
          Try it on the property
          <br />
          <span className="text-sky-400">
            you've been watching.
          </span>
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-12">
          One free verdict. <span className="text-white font-semibold">No signup. No credit card.</span> Just paste an
          address.
        </p>

        <div className="space-y-5 text-base text-slate-300 leading-relaxed max-w-2xl mx-auto mb-12 text-left">
          <p className="text-center">No tutorials. No 14-day trial. No credit card up front.</p>
          <p>
            Paste a Zillow URL or street address. In 15 seconds you'll see the verdict, the four paths to close the
            gap, and the negotiation script for each.
          </p>
          <p className="text-slate-400">
            If the math works, you'll know. If it needs structure, you'll see exactly which structures fit. If it's
            not a deal, you'll have spent 15 seconds — not a weekend in Excel.
          </p>
        </div>

        {/* Primary CTA — routes to /search where the user picks address / scan / map */}
        <div className="mb-14">
          <PrimaryButtonLarge sublabel="on any property" onClick={() => onVerdict()}>
            Run a Free Verdict <ChevronRight className="w-5 h-5 inline-block align-middle" strokeWidth={2.5} />
          </PrimaryButtonLarge>
        </div>

        {/* Lead magnet */}
        <div
          className="rounded-2xl p-8 md:p-10 max-w-2xl mx-auto"
          style={{
            background: '#000',
            border: '1px solid #14181F',
          }}
        >
          <h3 className="text-base md:text-lg font-bold text-white mb-3">
            Not ready to run one yet?
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Get the <span className="text-white font-semibold">Creative Finance Field Guide</span> — a one-page PDF
            covering Subject-To, seller carrybacks, 0% 2nds, rate buydowns, and the assumable-mortgage play. Free, no
            signup beyond your email.
          </p>

          {emailSubmitted ? (
            <div className="text-sm text-emerald-400 font-semibold">
              <Check className="w-4 h-4 inline mr-1.5" strokeWidth={3} />
              Check your inbox — the guide is on its way.
            </div>
          ) : (
            <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-colors"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
                aria-label="Your email"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg text-sm font-bold text-white bg-black border border-sky-500/40 hover:border-sky-500 transition"
              >
                Email me the guide →
              </button>
            </form>
          )}
        </div>

        {/* Manifesto */}
        <div className="mt-20 pt-12 border-t border-[#14181F]">
          <p className="text-base md:text-lg italic text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Built for the investor who knows the price tag isn't the deal.{' '}
            <span className="text-white not-italic font-semibold">The structure is.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * FOOTER
 * ============================================================ */

function SiteFooter() {
  return (
    <footer
      className="relative z-10 px-6 md:px-12 lg:px-20 py-12 mt-12 border-t"
      style={{ borderColor: '#14181F', background: '#000' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-xl font-bold mb-2">
              DealGap<span className="text-sky-400">IQ</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              We analyze. <span className="text-slate-200 font-semibold">You decide.</span>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/verdict" className="hover:text-sky-400 transition-colors">Verdict</Link></li>
              <li><Link href="/strategy" className="hover:text-sky-400 transition-colors">Strategy</Link></li>
              <li><Link href="/deal-maker" className="hover:text-sky-400 transition-colors">DealMaker</Link></li>
              <li><Link href="/pricing" className="hover:text-sky-400 transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Resources
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/about" className="hover:text-sky-400 transition-colors">About</Link></li>
              <li><Link href="/help" className="hover:text-sky-400 transition-colors">Help Center</Link></li>
              <li><span className="text-slate-600">Field Guide</span></li>
              <li><span className="text-slate-600">Glossary</span></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/privacy" className="hover:text-sky-400 transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-sky-400 transition-colors">Terms</Link></li>
              <li><Link href="/disclosures" className="hover:text-sky-400 transition-colors">Disclosures</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#14181F] text-xs text-slate-500 text-center">
          © 2026 DealGapIQ. We analyze. You decide.
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
 * SHARED HELPERS
 * ============================================================ */

function PrimaryButton({
  children,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-bold text-black transition-all whitespace-nowrap"
      style={{
        background: 'linear-gradient(135deg, #0FA4E9 0%, #0465F2 100%)',
        boxShadow: '0 8px 24px -8px rgba(15,164,233,0.5)',
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButtonLarge({
  children,
  sublabel,
  onClick,
}: {
  children: React.ReactNode;
  sublabel?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-3 px-9 py-3.5 rounded-xl text-black transition-all"
      style={{
        background: '#38BDF8',
        boxShadow: '0 12px 32px -8px rgba(56,189,248,0.55)',
      }}
    >
      <span className="flex flex-col items-center leading-tight">
        <span className="text-lg font-bold">{children}</span>
        {sublabel && (
          <span className="text-[11px] font-semibold opacity-75 mt-0.5 tracking-wide">
            {sublabel}
          </span>
        )}
      </span>
    </button>
  );
}
