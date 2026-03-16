'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { SearchPropertyModal } from '@/components/SearchPropertyModal';
import { canonicalizeAddressForIdentity, isLikelyFullAddress } from '@/utils/addressIdentity';
import './dealgapiq-homepage.css';
import { DataSourcesSection } from './DataSourcesSection';

// ── Check icon SVG ──
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: "var(--accent-sky)", flexShrink: 0 }}>
    <polyline points="2 8 6 12 14 4" />
  </svg>
);

// ── Fade-in on scroll wrapper ──
const FadeIn = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
};

// ── Dividers ──
const DivB = () => (
  <div style={{
    width: "100%", height: 1,
    background: "linear-gradient(90deg, transparent, var(--border-default), var(--accent-sky), var(--border-default), transparent)",
    boxShadow: "var(--shadow-card)",
  }} />
);

const DivC = () => (
  <div style={{
    width: "100%", height: 1,
    background: "linear-gradient(90deg, var(--accent-sky), var(--border-default) 40%, transparent 80%)",
    boxShadow: "var(--shadow-card)",
  }} />
);

const DivE = () => (
  <div style={{
    width: "100%", height: 1,
    background: "linear-gradient(90deg, var(--accent-sky), var(--status-positive), var(--status-warning), var(--status-negative))",
    boxShadow: "var(--shadow-card)",
  }} />
);

// ── Card wrappers ──
const cardSmStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-default)",
  boxShadow: "var(--shadow-card)",
  borderRadius: 12,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

const cardLgStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-default)",
  boxShadow: "var(--shadow-card-hover)",
  borderRadius: 16,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

// ── Styles object ──
const s = {
  teal: "var(--accent-sky)",
  success: "var(--status-positive)",
  warning: "var(--status-warning)",
  danger: "var(--status-negative)",
  muted: "var(--text-body)",
  mutedDim: "var(--text-label)",
  fontBody: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontData: "var(--font-space-mono), 'Space Mono', monospace",
  fontLogo: "var(--font-source-sans), 'Source Sans 3', sans-serif",
};

// ── Eyebrow component ──
const Eyebrow = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    fontFamily: s.fontBody, fontSize: "clamp(12px, 1.35vw, 15px)", fontWeight: 600,
    letterSpacing: "0.10em", textTransform: "uppercase" as const,
    color: s.teal, marginBottom: 76, ...style,
  }}>
    {children}
  </div>
);

// ── Brand name ──
const BrandName = () => (
  <strong>DealGap<span style={{ color: s.teal }}>IQ</span></strong>
);

// ── Trust check item ──
const TrustCheck = ({ text }: { text: string }) => (
  <span style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, display: "flex", alignItems: "center", gap: 5 }}>
    <CheckIcon /> {text}
  </span>
);

// ── Auth query-param handler (opens modal on ?auth=login etc.) ──
function AuthParamHandler() {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }
  }, [searchParams, openAuthModal]);

  return null;
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

interface DealGapIQHomepageProps {
  onPointAndScan?: () => void;
}

export function DealGapIQHomepage({ onPointAndScan }: DealGapIQHomepageProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const hasValidAddress = isLikelyFullAddress(address);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidAddress) return;
    const canonicalAddress = canonicalizeAddressForIdentity(address);
    router.push(`/verdict?address=${encodeURIComponent(canonicalAddress)}`);
  };

  const handlePlaceSelect = (selectedAddress: string) => {
    const canonicalAddress = canonicalizeAddressForIdentity(selectedAddress);
    setAddress(canonicalAddress);
    router.push(`/verdict?address=${encodeURIComponent(canonicalAddress)}`);
  };

  return (
    <div style={{ fontFamily: s.fontBody, background: "var(--surface-base)", color: "var(--text-heading)", lineHeight: 1.6, overflowX: "hidden" as const, WebkitFontSmoothing: "antialiased" }}>

      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 24px 80px",
        textAlign: "center" as const,
        position: "relative" as const,
      }}>
        {/* DealGapIQ Logo */}
        <div style={{ opacity: 0, animation: "fadeUp 0.6s 0.15s forwards", marginBottom: 8 }}>
          <h1 style={{
            fontFamily: s.fontLogo,
            fontSize: "clamp(52px, 9vw, 104px)",
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1,
            marginBottom: 12,
          }}>
            DealGap<span style={{ color: s.teal }}>IQ</span>
          </h1>
          <p style={{
            fontFamily: s.fontBody,
            fontSize: "clamp(13px, 1.8vw, 17px)",
            color: "var(--text-label)",
            letterSpacing: "0.02em",
          }}>
            Advanced real estate deal analysis made simple.
          </p>
        </div>

        {/* Main headline */}
        <h2 style={{
          fontFamily: s.fontBody,
          fontSize: "clamp(26px, 4.5vw, 48px)",
          fontWeight: 700,
          letterSpacing: -1,
          lineHeight: 1.2,
          marginTop: 56,
          marginBottom: 18,
          opacity: 0,
          animation: "fadeUp 0.6s 0.25s forwards",
        }}>
          <span style={{ color: s.teal }}>Is That Property a </span>Good Deal?
        </h2>

        {/* Subtitle */}
        <p style={{
          fontFamily: s.fontBody,
          fontSize: "clamp(15px, 2.2vw, 21px)",
          fontStyle: "italic" as const,
          color: "var(--text-label)",
          marginBottom: 56,
          opacity: 0,
          animation: "fadeUp 0.6s 0.3s forwards",
        }}>
          Know if it Is Worth Your Time – Before You Spend Hours on It.
        </p>

        {/* Pill CTA */}
        <div style={{ opacity: 0, animation: "fadeUp 0.6s 0.4s forwards", width: "100%", maxWidth: 540 }}>
          <form onSubmit={handleAnalyze} className="hero-pill-form" style={{
            display: "flex",
            alignItems: "center",
            border: "2px solid var(--accent-sky)",
            borderRadius: 999,
            padding: "6px 6px 6px 28px",
            background: "transparent",
            transition: "box-shadow 0.3s, border-color 0.3s",
          }}>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Try it for Free - Enter an address"
              className="hero-pill-input"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "clamp(14px, 2vw, 18px)",
                fontFamily: s.fontBody,
                fontWeight: 500,
                color: "var(--text-heading)",
                padding: "12px 0",
              }}
            />
            <button
              type="submit"
              disabled={!hasValidAddress}
              className="hero-pill-arrow"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "none",
                background: hasValidAddress ? "var(--accent-sky)" : "transparent",
                cursor: hasValidAddress ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.3s, transform 0.15s",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-heading)" style={{ marginLeft: 2 }}>
                <polygon points="6,3 20,12 6,21" />
              </svg>
            </button>
          </form>
        </div>

        {/* Trust line */}
        <p style={{
          fontFamily: s.fontBody,
          fontSize: "clamp(13px, 1.6vw, 16px)",
          fontWeight: 600,
          marginTop: 48,
          opacity: 0,
          animation: "fadeUp 0.6s 0.5s forwards",
        }}>
          Built for first-time investors
          <span style={{ margin: "0 12px", color: "var(--text-label)" }}>–</span>
          <span style={{ color: s.teal }}>Trusted by experienced buyers</span>
        </p>
      </section>

      <SearchPropertyModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onScanProperty={onPointAndScan}
      />

      <DivC />

      <DivB />

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px", maxWidth: 1060, margin: "0 auto", textAlign: "center" as const }}>
          <Eyebrow>How It Works</Eyebrow>
          <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
            Three Steps. One Decision.
          </h2>
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "var(--text-body)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Multiple valuation sources cross-referenced. Rents, expenses, and comps.
          </p>

          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 52 }}>
            {/* Step 1 */}
            <div style={{ ...cardSmStyle, padding: "28px 22px 24px", textAlign: "center" as const }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.teal, color: "var(--text-inverse)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>1</div>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Paste an Address</h3>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>Any U.S. property address. No account needed for your first scan.</p>
              <div style={{ marginTop: 18, background: "var(--surface-elevated)", borderRadius: 10, padding: 14, border: "1px solid var(--border-subtle)" }}>
                <div style={{ background: "var(--surface-card-hover)", borderRadius: 8, padding: "11px 14px", color: s.muted, fontFamily: s.fontBody, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: s.teal }}>📍</span> 1451 Sw 10th St, <span style={{ filter: "blur(2px)" }}>Boca Raton, FL</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ ...cardSmStyle, padding: "28px 22px 24px", textAlign: "center" as const }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.teal, color: "var(--text-inverse)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>2</div>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>We Analyze the Market</h3>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>Multiple valuation sources cross-referenced. Rents, expenses, and comps modeled through our proprietary IQ engine.</p>
              <div style={{ marginTop: 18, background: "var(--surface-elevated)", borderRadius: 10, padding: 14, border: "1px solid var(--border-subtle)", textAlign: "left" as const }}>
                {[
                  { label: "IQ Estimate", value: "$869,326", teal: true },
                  { label: "Zillow", value: "$802,600" },
                  { label: "RentCast", value: "$963,000" },
                  { label: "Redfin", value: "$789,378" },
                  { label: "Realtor.com", value: "$805,600" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none", fontSize: 13 }}>
                    <span style={{ fontFamily: s.fontBody, color: s.muted }}>{row.label}</span>
                    <span style={{ fontFamily: s.fontData, fontWeight: 700, fontSize: 12, color: row.teal ? s.teal : "var(--text-heading)" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ ...cardSmStyle, padding: "28px 22px 24px", textAlign: "center" as const }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.teal, color: "var(--text-inverse)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>3</div>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Get Your Investment Screen</h3>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>A Verdict Score that tells you if this property is in the range worth pursuing — plus your Target Buy and Deal Gap.</p>
              <div style={{ marginTop: 18, background: "var(--surface-elevated)", borderRadius: 10, padding: 14, border: "1px solid var(--border-subtle)", textAlign: "center" as const }}>
                <div style={{ fontFamily: s.fontData, fontSize: 30, fontWeight: 700, color: s.warning }}>53<span style={{ fontSize: 13, color: s.mutedDim }}>/100</span></div>
                <div style={{ fontFamily: s.fontBody, fontSize: 11, color: s.warning, marginTop: 3, fontWeight: 600 }}>Marginal Opportunity</div>
                <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.muted, marginTop: 8 }}>Target Buy: <span style={{ color: s.teal, fontFamily: s.fontData, fontWeight: 700 }}>$669,608</span></div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                  <Link href="/about" style={{ fontFamily: s.fontBody, fontSize: 13, fontWeight: 600, color: s.teal, textDecoration: "none" }}>See how to make it work →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivB />

      {/* ═══════════ VERDICT SHOWCASE ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div className="verdict-inner" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
            {/* Text */}
            <div>
              <Eyebrow>The Verdict Screen</Eyebrow>
              <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
                Your<br />Investment Screen
              </h2>
              <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "var(--text-body)", maxWidth: 560, lineHeight: 1.7, marginBottom: 20 }}>
                A Verdict Score from 0–100 helps you gauge whether this property is in the range worth pursuing — synthesizing Deal Gap, return quality, market alignment, and deal probability into one number. Below it: your three price thresholds and the number line showing where the deal sits.
              </p>
              <p style={{ marginTop: 24, fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>
                <strong style={{ color: s.teal, fontWeight: 600 }}>This isn&apos;t a pass/fail.</strong> Every score links to <strong style={{ color: s.teal, fontWeight: 600 }}>&ldquo;See how to make it work&rdquo;</strong> — the full strategy breakdown showing the math, the terms, and exactly what needs to change for the deal to pencil.
              </p>
            </div>

            {/* Mockup Card */}
            <div style={{ ...cardLgStyle, padding: 28, position: "relative" as const, overflow: "hidden" }}>
              <div style={{ position: "absolute" as const, top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.teal}, ${s.success}, ${s.warning})`, borderRadius: "16px 16px 0 0" }} />

              {/* THE VERDICT title */}
              <div style={{ textAlign: "center" as const, marginBottom: 22, fontFamily: s.fontBody, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: s.muted }}>
                The Verdict
              </div>

              {/* Score Hero */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px 18px", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 14, background: "rgba(14,165,233,0.03)" }}>
                {/* SVG Arc Gauge */}
                <div style={{ position: "relative" as const, width: 100, height: 100, flexShrink: 0 }}>
                  <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-150deg)" }}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeDasharray="217.82 108.91" strokeLinecap="round" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={s.teal} strokeWidth="10" strokeDasharray="141.58 185.15" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 12px rgba(14,165,233,0.38)) drop-shadow(0 0 24px rgba(14,165,233,0.15))" }} />
                  </svg>
                  <div style={{ position: "absolute" as const, inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: s.fontData, fontSize: 30, fontWeight: 700, lineHeight: 1, color: s.teal }}>65</span>
                    <span style={{ fontFamily: s.fontData, fontSize: 10, color: s.muted }}>/100</span>
                  </div>
                </div>

                {/* Deal Gap + Target Buy */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: s.fontBody, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: s.muted, marginBottom: 2 }}>Deal Gap</div>
                  <div style={{ fontFamily: s.fontData, fontSize: 26, fontWeight: 700, color: s.warning, lineHeight: 1.1 }}>-16.6%</div>
                  <div style={{ fontFamily: s.fontBody, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: s.muted, marginTop: 8, marginBottom: 2 }}>Target Buy</div>
                  <div style={{ fontFamily: s.fontData, fontSize: 20, fontWeight: 700, color: s.teal, lineHeight: 1.1 }}>$673,269</div>
                </div>

                {/* Verdict Badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", border: "1px solid var(--border-default)", borderRadius: 20, alignSelf: "flex-start" as const }}>
                <svg width="13" height="13" fill="none" stroke="var(--text-body)" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span style={{ fontFamily: s.fontBody, fontSize: 12, fontWeight: 700, color: "var(--text-heading)" }}>Challenging</span>
                </div>
              </div>

              {/* Three price cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "WHOLESALE", value: "$565,110", sub: "30% net discount", highlight: false },
                  { label: "TARGET BUY", value: "$673,269", sub: "Positive Cashflow", highlight: true, subGreen: true },
                  { label: "INCOME VALUE", value: "$708,704", sub: "Price where income covers all costs", highlight: false },
                ].map((card, i) => (
                  <div key={i} style={{
                    background: "var(--surface-card)", borderRadius: 10, padding: "12px 10px", textAlign: "center" as const,
                    border: card.highlight ? "1px solid var(--border-focus)" : "1px solid var(--border-subtle)",
                    boxShadow: card.highlight ? "var(--shadow-card-hover)" : "var(--shadow-card)",
                  }}>
                    <div style={{ fontFamily: s.fontBody, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: s.muted, marginBottom: 3 }}>{card.label}</div>
                    <div style={{ fontFamily: s.fontData, fontSize: 18, fontWeight: 700, color: card.highlight ? s.teal : "var(--text-heading)" }}>{card.value}</div>
                    <div style={{ fontFamily: s.fontBody, fontSize: 11, color: card.subGreen ? s.success : s.muted, marginTop: 2 }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Price Scale Bar with Deal Gap & Price Gap brackets */}
              <div style={{ position: "relative" as const, padding: "0 4px", marginTop: 8 }}>
                {/* Deal Gap bracket (above bar) */}
                <div style={{ position: "relative" as const, height: 24, marginBottom: 8 }}>
                  <div style={{ position: "absolute" as const, left: "16%", width: "65%", display: "flex", alignItems: "center", top: 4 }}>
                    <div style={{ width: 1, height: 12, background: s.teal, flexShrink: 0 }} />
                    <div style={{ height: 1, background: s.teal, flex: 1 }} />
                    <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 700, color: s.teal, whiteSpace: "nowrap" as const, padding: "0 6px" }}>DEAL GAP &nbsp;-16.6%</span>
                    <div style={{ height: 1, background: s.teal, flex: 1 }} />
                    <div style={{ width: 1, height: 12, background: s.teal, flexShrink: 0 }} />
                  </div>
                </div>

                {/* Gradient bar with positioned dots */}
                <div style={{ position: "relative" as const, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${s.teal}30, ${s.warning}30, ${s.danger}25)` }}>
                  {[
                    { pos: 16, color: s.teal },
                    { pos: 33, color: s.warning },
                    { pos: 81, color: s.danger },
                  ].map((dot, i) => (
                    <div key={i} style={{
                      position: "absolute" as const, width: 14, height: 14, borderRadius: "50%",
                      top: -3, left: `${dot.pos}%`, transform: "translateX(-50%)",
                      background: dot.color, border: "2px solid var(--surface-card)",
                      boxShadow: `0 0 6px ${dot.color}60`,
                    }} />
                  ))}
                </div>

                {/* Price Gap bracket (below bar) */}
                <div style={{ position: "relative" as const, height: 24, marginTop: 6 }}>
                  <div style={{ position: "absolute" as const, left: "33%", width: "48%", display: "flex", alignItems: "center", top: 0 }}>
                    <div style={{ width: 1, height: 12, background: s.warning, flexShrink: 0 }} />
                    <div style={{ height: 1, background: s.warning, flex: 1 }} />
                    <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 700, color: s.warning, whiteSpace: "nowrap" as const, padding: "0 6px" }}>PRICE GAP &nbsp;-12.2%</span>
                    <div style={{ height: 1, background: s.warning, flex: 1 }} />
                    <div style={{ width: 1, height: 12, background: s.warning, flexShrink: 0 }} />
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {[
                    { color: s.teal, name: "Target Buy", value: "$673,269" },
                    { color: s.warning, name: "Income Value", value: "$708,704" },
                    { color: s.danger, name: "Market", value: "$807,300" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <span style={{ fontFamily: s.fontBody, fontSize: 10, fontWeight: 500, color: item.color }}>{item.name}</span>
                      </div>
                      <span style={{ fontFamily: s.fontData, fontSize: 12, fontWeight: 700, color: "var(--text-heading)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Based on line */}
              <div style={{ textAlign: "center" as const, marginTop: 16, fontFamily: s.fontBody, fontSize: 12, color: s.muted }}>
                Based on <span style={{ fontWeight: 600, color: s.teal }}>20% down · 6.0% rate · 30-year term at the Target Buy price</span>
              </div>

              {/* See how to make it work */}
              <div style={{ textAlign: "center" as const, marginTop: 18 }}>
                <Link href="/about" style={{
                  fontFamily: s.fontBody, fontSize: 15, fontWeight: 700, color: s.teal, textDecoration: "none",
                  padding: "10px 24px", border: "1px solid var(--border-default)", borderRadius: 10,
                  display: "inline-block", boxShadow: "var(--shadow-card)",
                }}>
                  See how to make it work →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivE />

      {/* ═══════════ THREE NUMBERS ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px", maxWidth: 1060, margin: "0 auto", textAlign: "center" as const }}>
          <Eyebrow>Your Three Price Thresholds</Eyebrow>
          <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
            Every Investment Comes Down to Three Numbers
          </h2>
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "var(--text-body)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            What&apos;s the most I can pay and break even? Where does cash flow start? How far is the market from both? <BrandName /> calculates all three automatically. <strong>Every assumption is editable.</strong>
          </p>

          <div className="numbers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 48 }}>
            {[
              { icon: "$", iconBg: "rgba(52,211,153,0.1)", iconBorder: "rgba(52,211,153,0.2)", iconColor: s.success, title: "Income Value", desc: "The maximum price where rental income covers every cost — mortgage, taxes, insurance, vacancy, management. Your breakeven ceiling.", example: "$704,851", exColor: s.success },
              { icon: "⎯", iconBg: "rgba(14,165,233,0.1)", iconBorder: "rgba(14,165,233,0.2)", iconColor: s.teal, title: "Target Buy", desc: "The price where the deal generates positive cash flow. Your offer anchor — the number you negotiate toward.", example: "$669,608", exColor: s.teal },
              { icon: "△", iconBg: "rgba(251,191,36,0.1)", iconBorder: "rgba(251,191,36,0.2)", iconColor: s.warning, title: "Deal Gap", desc: "The gap between your Target Buy and market price. The larger it is, the more room to negotiate — or a signal to walk away.", example: "−16.6%", exColor: s.warning },
            ].map((card, i) => (
              <div key={i} style={{ ...cardSmStyle, padding: "28px 22px", textAlign: "left" as const }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontFamily: s.fontBody, fontSize: 18, fontWeight: 700, background: card.iconBg, color: card.iconColor, border: `1px solid ${card.iconBorder}` }}>{card.icon}</div>
                <h3 style={{ fontFamily: s.fontBody, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{card.title}</h3>
                <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>{card.desc}</p>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: s.fontBody, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: s.muted }}>Example</span>
                  <span style={{ fontFamily: s.fontData, fontSize: 20, fontWeight: 700, color: card.exColor }}>{card.example}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      <DivB />

      {/* ═══════════ STRATEGY ENGINE ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <Eyebrow>Strategy Engine</Eyebrow>
            <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
              Every address analyzed six ways — automatically.
            </h2>
            <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "var(--text-body)", maxWidth: 640, lineHeight: 1.7, marginBottom: 36 }}>
              No more one-size-fits-all analysis. <BrandName /> evaluates every property through six distinct investment lenses, each with a fully editable Excel worksheet you can download and make your own.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { name: "Long-Term Rental", desc: "Traditional buy-and-hold cashflow" },
                { name: "Short-Term Rental", desc: "Airbnb / vacation income" },
                { name: "BRRRR", desc: "Buy, rehab, rent, refinance, repeat" },
                { name: "Fix & Flip", desc: "Purchase, renovate, sell for profit" },
                { name: "House Hack", desc: "Owner-occupy + rent spare units" },
                { name: "Wholesale", desc: "Contract assignment for quick equity" },
              ].map((item, i) => (
                <div key={i} style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-sky-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: s.fontBody, fontSize: 14, fontWeight: 700, color: s.teal }}>{item.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: s.fontBody, fontSize: 15, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.muted, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      <DivB />

      {/* ═══════════ COMPS & APPRAISAL ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div className="comps-inner" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>

            {/* Mockup Card */}
            <div style={{ ...cardLgStyle, padding: 0, position: "relative" as const, overflow: "hidden" }}>
              <div style={{ position: "absolute" as const, top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.teal}, ${s.success})`, borderRadius: "16px 16px 0 0" }} />

              {/* Appraisal Header */}
              <div style={{ padding: "24px 24px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                    </div>
                    <span style={{ fontFamily: s.fontBody, fontSize: 12, fontWeight: 600, color: s.muted }}>Appraisal Values · From 3 selected</span>
                  </div>
                  <div style={{ fontFamily: s.fontBody, fontSize: 10, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: s.muted, marginBottom: 4 }}>COMP APPRAISAL</div>
                  <div style={{ fontFamily: s.fontData, fontSize: 30, fontWeight: 700, color: "var(--text-heading)", lineHeight: 1 }}>$826,031</div>
                  <div style={{ fontFamily: s.fontBody, fontSize: 11, color: s.muted, marginTop: 4 }}>As-Is Condition</div>
                  <div style={{ fontFamily: s.fontBody, fontSize: 10, color: s.mutedDim }}>Range: $686K — $886K</div>
                </div>
                <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: "8px 14px", textAlign: "center" as const }}>
                  <div style={{ fontFamily: s.fontData, fontSize: 22, fontWeight: 700, color: s.success, lineHeight: 1 }}>97%</div>
                  <div style={{ fontFamily: s.fontBody, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: s.success, marginTop: 3 }}>CONFIDENCE</div>
                </div>
              </div>

              {/* Adjustment Grid */}
              <div style={{ padding: "0 24px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontFamily: s.fontData, fontSize: 13, fontWeight: 700, color: s.teal }}>$</span>
                  <span style={{ fontFamily: s.fontBody, fontSize: 13, fontWeight: 600, color: "var(--text-heading)" }}>Adjustment Breakdown</span>
                  <span style={{ fontFamily: s.fontBody, fontSize: 11, color: s.mutedDim }}>(3)</span>
                </div>

                <div style={{ fontSize: 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.5fr 0.5fr 0.7fr 0.6fr", gap: 0, borderBottom: "1px solid rgba(14,165,233,0.12)", paddingBottom: 7, marginBottom: 6 }}>
                    {["Address", "Base", "Size", "Bed", "Age", "Adjusted", "Weight"].map((h, i) => (
                      <span key={i} style={{ fontFamily: s.fontBody, fontSize: 10, fontWeight: 600, color: s.mutedDim, letterSpacing: "0.03em", textAlign: (i === 0 ? "left" : "right") as React.CSSProperties["textAlign"] }}>{h}</span>
                    ))}
                  </div>
                  {[
                    { addr: "11332 Edgewater Cir", base: "$873K", size: "+$16K", bed: "+$0", age: "+$0", adjusted: "$886K", weight: "33.8%", sizeClr: s.success },
                    { addr: "4034 Bahia Isle Circle", base: "$790K", size: "+$49K", bed: "+$0", age: "+$0", adjusted: "$840K", weight: "33.1%", sizeClr: s.success },
                    { addr: "11071 Laurel Walk Rd", base: "$685K", size: "-$800", bed: "+$0", age: "+$0", adjusted: "$686K", weight: "33.1%", sizeClr: s.danger },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.5fr 0.5fr 0.7fr 0.6fr", gap: 0, padding: "5px 0", borderBottom: i < 2 ? "1px solid rgba(14,165,233,0.05)" : "none" }}>
                      <span style={{ fontFamily: s.fontBody, fontSize: 11, color: "var(--text-heading)", whiteSpace: "nowrap" as const, overflow: "hidden" as const, textOverflow: "ellipsis" as const }}>{row.addr}</span>
                      <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 600, color: s.muted, textAlign: "right" as const }}>{row.base}</span>
                      <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 600, color: row.sizeClr, textAlign: "right" as const }}>{row.size}</span>
                      <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 600, color: s.muted, textAlign: "right" as const }}>{row.bed}</span>
                      <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 600, color: s.muted, textAlign: "right" as const }}>{row.age}</span>
                      <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 700, color: s.teal, textAlign: "right" as const }}>{row.adjusted}</span>
                      <span style={{ fontFamily: s.fontData, fontSize: 10, fontWeight: 500, color: s.mutedDim, textAlign: "right" as const }}>{row.weight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Score */}
              <div style={{ padding: "0 24px 18px" }}>
                <div style={{ background: "rgba(14,165,233,0.03)", border: "1px solid rgba(14,165,233,0.08)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: s.fontBody, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: s.muted }}>MATCH SCORE</span>
                    <span style={{ fontFamily: s.fontData, fontSize: 16, fontWeight: 700, color: s.teal }}>94%</span>
                  </div>
                  {[
                    { label: "Location", pct: 96 },
                    { label: "Size", pct: 95 },
                    { label: "Bed/Bath", pct: 100 },
                    { label: "Age", pct: 100 },
                  ].map((bar, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 3 ? 5 : 0 }}>
                      <span style={{ fontFamily: s.fontBody, fontSize: 10, color: s.muted, width: 48, flexShrink: 0 }}>{bar.label}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(14,165,233,0.08)" }}>
                        <div style={{ width: `${bar.pct}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${s.teal}, ${s.teal}cc)`, boxShadow: `0 0 6px ${s.teal}30` }} />
                      </div>
                      <span style={{ fontFamily: s.fontData, fontSize: 9, fontWeight: 600, color: s.muted, width: 26, textAlign: "right" as const, flexShrink: 0 }}>{bar.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* URAR Report Footer */}
              <div style={{ borderTop: "1px solid rgba(14,165,233,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(14,165,233,0.02)" }}>
                <span style={{ fontFamily: s.fontBody, fontSize: 11, color: s.mutedDim, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: s.teal, fontSize: 8 }}>&#x25C6;</span> Weighted hybrid methodology
                </span>
                <span style={{ fontFamily: s.fontBody, fontSize: 11, fontWeight: 600, color: s.teal }}>
                  Download URAR Report
                </span>
              </div>
            </div>

            {/* Text */}
            <div>
              <Eyebrow>Comp-Based Appraisal</Eyebrow>
              <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
                Price Property<br />Like a Professional
              </h2>
              <p style={{ fontFamily: s.fontBody, fontSize: 18, color: "var(--text-body)", maxWidth: 480, lineHeight: 1.5, marginBottom: 30, fontWeight: 500 }}>
                Select the comps. Review the logic. Set the value.
              </p>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                {[
                  { title: "Pick your own comps", desc: "Select from recent sales within your target radius. You control which properties inform the appraisal." },
                  { title: "See every adjustment", desc: "Size, bedrooms, bathrooms, age, lot — each adjustment is transparent and follows appraisal methodology." },
                  { title: "Know your confidence", desc: "A weighted similarity score tells you exactly how reliable the estimate is." },
                  { title: "Download a URAR-style report", desc: "Professional Form 1004 format — ready for partners, lenders, or your records." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ marginTop: 3, flexShrink: 0 }}>
                      <CheckIcon />
                    </div>
                    <div>
                      <div style={{ fontFamily: s.fontBody, fontSize: 14, fontWeight: 600, color: "var(--text-heading)", marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, lineHeight: 1.55 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ marginTop: 28, fontFamily: s.fontBody, fontSize: 13, color: s.mutedDim, lineHeight: 1.6, borderTop: "1px solid rgba(14,165,233,0.08)", paddingTop: 18 }}>
                <strong style={{ color: s.teal, fontWeight: 600 }}>Not a licensed appraisal.</strong> An investor-grade comp analysis modeled after the industry standard — so you can price property with the same rigor the professionals use.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivC />

      {/* ═══════════ DATA SOURCES ═══════════ */}
      <DataSourcesSection />

      <DivC />

      {/* ═══════════ FOUNDER ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" as const }}>
            <Eyebrow>Built by an Industry Expert</Eyebrow>
            <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
              35 Years of Real Estate Data,<br />Distilled Into One Tool
            </h2>

            <div style={{ ...cardLgStyle, padding: "44px 36px", marginTop: 36, position: "relative" as const }}>
              <div style={{ position: "absolute" as const, top: -1, left: "50%", transform: "translateX(-50%)", width: 100, height: 2, background: s.teal, borderRadius: "0 0 2px 2px" }} />
              <img src="/brad-geisen.png" alt="Brad Geisen" style={{ width: 112, height: 112, borderRadius: "50%", border: `2px solid ${s.teal}`, margin: "0 auto 18px", display: "block", objectFit: "cover" as const, objectPosition: "50% 38%", boxShadow: "0 0 20px rgba(14,165,233,0.12)", boxSizing: "border-box" as const }} />
              <p style={{ fontFamily: s.fontBody, fontSize: 16, color: s.muted, lineHeight: 1.7, fontStyle: "italic", maxWidth: 580, margin: "0 auto 24px" }}>
                &ldquo;I spent 35 years building real estate data systems — HomePath.com for Fannie Mae, HomeSteps.com for Freddie Mac, and Foreclosure.com which I founded and operated for 21 years. I built <strong style={{ fontStyle: "normal" }}>DealGap<span style={{ color: s.teal }}>IQ</span></strong> because investors still don&apos;t have a fast, data-backed way to know their number before making an offer.&rdquo;
              </p>
              <div className="dgiq-founder-stats" style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, justifyContent: "center" }}>
                {[
                  { num: "35+", label: "years in RE data" },
                  { num: "80+", label: "companies served" },
                  { num: "500+", label: "RE projects" },
                  { num: "30+", label: "yr GSE partnerships" },
                ].map((cred, i) => (
                  <div key={i} style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "7px 14px", fontFamily: s.fontBody, fontSize: 12, color: s.muted, display: "flex", alignItems: "center", gap: 5, boxShadow: "var(--shadow-card)" }}>
                    <span style={{ fontFamily: s.fontData, fontWeight: 700, color: "var(--text-heading)", fontSize: 12 }}>{cred.num}</span> {cred.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivC />

      {/* ═══════════ INVESTOR FIT ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div className="investor-fit-inner" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div style={{ ...cardLgStyle, padding: "28px 24px" }}>
              <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 18 }}>
                Built for Aspiring and Small Portfolio Investors
              </h2>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 18, fontWeight: 700, color: "var(--text-heading)", marginBottom: 12 }}>
                If you&apos;re just getting started
              </h3>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  "Screen your first few deals in minutes instead of wrestling with spreadsheets.",
                  "Learn the numbers - cap rate, cash-on-cash, and DSCR - with plain-language explanations.",
                  "Know the highest price you can pay and still break even on your first rental.",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckIcon />
                    <span style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.65 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardLgStyle, padding: "28px 24px" }}>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 18, fontWeight: 700, color: "var(--text-heading)", marginBottom: 12 }}>
                If you&apos;re growing a small portfolio
              </h3>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  "Quickly compare multiple offers per month using consistent, transparent assumptions.",
                  "Export full underwriting PDFs and Excel files for partners, lenders, and your records.",
                  "Stress-test rent, rates, and repairs before you commit to a new property.",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckIcon />
                    <span style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.65 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivC />

      {/* ═══════════ FINAL CTA ═══════════ */}
      <FadeIn>
        <section style={{ padding: "112px 24px 100px", textAlign: "center" as const, position: "relative" as const }}>
          <div style={{ position: "absolute" as const, bottom: 0, left: "50%", transform: "translateX(-50%)", width: 480, height: 380, background: "radial-gradient(ellipse, var(--color-sky-dim) 0%, transparent 70%)", pointerEvents: "none" as const }} />

          <Eyebrow>Stop Guessing. Start Calculating.</Eyebrow>
          <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(30px, 4.2vw, 44px)", fontWeight: 700, letterSpacing: -1.2, marginBottom: 14, lineHeight: 1.15 }}>
            Every Property Has a Deal Gap.<br />Find Yours.
          </h2>
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "var(--text-body)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Paste an address. See the three price thresholds, the Verdict Score, and which strategy makes it work.
          </p>

          <div style={{ maxWidth: 440, margin: "0 auto 20px" }}>
            <form onSubmit={handleAnalyze} style={{
              display: "flex", flexDirection: "column" as const, gap: 12,
              width: "100%",
            }}>
              <div style={{ position: "relative" as const }}>
                <svg style={{ position: "absolute" as const, left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" as const }} width="16" height="16" fill="none" stroke="var(--text-label)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Enter any property address..."
                  className="hero-search-input"
                  style={{
                    width: "100%", boxSizing: "border-box" as const,
                    padding: "12px 14px 12px 38px", fontSize: 14, fontFamily: s.fontBody,
                    borderRadius: 8, border: "2px solid var(--border-default)",
                    background: "var(--surface-input)", color: "var(--text-heading)", outline: "none",
                  }}
                />
              </div>
            <button type="submit" className="hero-cta-btn" disabled={!hasValidAddress} style={{
                width: "100%", padding: "12px 24px",
                fontSize: 14, fontWeight: 700, fontFamily: s.fontBody,
                borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
                color: "var(--text-inverse)", cursor: "pointer",
                boxShadow: "var(--shadow-card)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                Analyze a Property Free →
              </button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 18, flexWrap: "wrap" as const }}>
            <TrustCheck text="No credit card" />
            <TrustCheck text="5 free analyses per month" />
            <TrustCheck text="Every assumption editable" />
          </div>

          <div style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, marginTop: 14 }}>
            Free to start · Pro at <span style={{ color: "var(--text-heading)", fontWeight: 600 }}>$29/mo</span> (annual) for unlimited analyses
          </div>
        </section>
      </FadeIn>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "36px 24px", textAlign: "center" as const }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: s.fontLogo, fontSize: 18, fontWeight: 700, color: "var(--text-heading)", marginBottom: 6 }}>DealGap<span style={{ color: s.teal }}>IQ</span></div>
        </Link>
        <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.mutedDim, opacity: 0.6 }}>© 2025 DealGapIQ. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default DealGapIQHomepage;
