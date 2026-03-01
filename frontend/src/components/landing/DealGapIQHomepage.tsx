'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import './dealgapiq-homepage.css';

// ── Check icon SVG ──
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: "#0EA5E9", flexShrink: 0 }}>
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
    background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.25), rgba(14,165,233,0.5), rgba(14,165,233,0.25), transparent)",
    boxShadow: "0 0 12px rgba(14,165,233,0.15)",
  }} />
);

const DivC = () => (
  <div style={{
    width: "100%", height: 1,
    background: "linear-gradient(90deg, rgba(14,165,233,0.6), rgba(14,165,233,0.2) 40%, transparent 80%)",
    boxShadow: "0 0 8px rgba(14,165,233,0.1)",
  }} />
);

const DivE = () => (
  <div style={{
    width: "100%", height: 1,
    background: "linear-gradient(90deg, #0EA5E9, #34D399, #FBBF24, #F97066)",
    boxShadow: "0 0 10px rgba(14,165,233,0.1)",
  }} />
);

// ── Card wrappers ──
const cardSmStyle: React.CSSProperties = {
  background: "#000",
  border: "1px solid rgba(14,165,233,0.25)",
  boxShadow: "0 0 30px rgba(14,165,233,0.08), 0 0 60px rgba(14,165,233,0.04)",
  borderRadius: 12,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

const cardLgStyle: React.CSSProperties = {
  background: "#000",
  border: "1px solid rgba(14,165,233,0.3)",
  boxShadow: "0 0 40px rgba(14,165,233,0.1), 0 0 80px rgba(14,165,233,0.05)",
  borderRadius: 16,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

// ── Styles object ──
const s = {
  teal: "#0EA5E9",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F97066",
  muted: "rgba(255,255,255,0.75)",
  mutedDim: "#71717A",
  fontBody: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontData: "var(--font-space-mono), 'Space Mono', monospace",
  fontLogo: "var(--font-source-sans), 'Source Sans 3', sans-serif",
};

// ── Eyebrow component ──
const Eyebrow = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    fontFamily: s.fontBody, fontSize: "0.72rem", fontWeight: 600,
    letterSpacing: "0.10em", textTransform: "uppercase" as const,
    color: s.teal, marginBottom: 14, ...style,
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

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    router.push(`/analyzing?address=${encodeURIComponent(address.trim())}`);
  };

  const handlePlaceSelect = (selectedAddress: string) => {
    setAddress(selectedAddress);
    router.push(`/analyzing?address=${encodeURIComponent(selectedAddress)}`);
  };

  return (
    <div style={{ fontFamily: s.fontBody, background: "#000", color: "#fff", lineHeight: 1.6, overflowX: "hidden" as const, WebkitFontSmoothing: "antialiased" }}>

      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* ═══════════ NAV ═══════════ */}
      <nav style={{
        position: "fixed" as const, top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(14,165,233,0.1)",
      }}>
        <Link href="/" style={{ fontFamily: s.fontLogo, fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: "#fff", textDecoration: "none" }}>
          DealGap<span style={{ color: s.teal }}>IQ</span>
        </Link>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Link href="/about" style={{ color: s.mutedDim, textDecoration: "none", fontFamily: s.fontBody, fontSize: 14, fontWeight: 500 }}>Product</Link>
          <Link href="/pricing" style={{ color: s.mutedDim, textDecoration: "none", fontFamily: s.fontBody, fontSize: 14, fontWeight: 500 }}>Pricing</Link>
          <Link href="/login" style={{ color: s.teal, textDecoration: "none", fontFamily: s.fontBody, fontSize: 14, fontWeight: 600 }}>Login / Register</Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ padding: "88px 24px 72px", maxWidth: 800, margin: "0 auto", textAlign: "center" as const, position: "relative" as const }}>
        <div style={{
          position: "absolute" as const, top: 40, left: "50%", transform: "translateX(-50%)",
          width: 500, height: 500, background: "radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 70%)", pointerEvents: "none" as const,
        }} />

        <Eyebrow style={{ opacity: 0, animation: "fadeUp 0.6s 0.15s forwards" }}>Real Estate Investment Analysis</Eyebrow>

        <h1 style={{
          fontFamily: s.fontBody, fontSize: "clamp(30px, 4.8vw, 48px)", lineHeight: 1.15,
          fontWeight: 700, letterSpacing: -1.5, marginBottom: 24,
          opacity: 0, animation: "fadeUp 0.6s 0.2s forwards",
        }}>
          Is That Property a <span style={{ whiteSpace: 'nowrap' }}>Good Deal?</span>
        </h1>

        <p style={{
          fontFamily: s.fontBody, fontSize: "clamp(24px, 3.8vw, 38px)", lineHeight: 1.25,
          fontWeight: 700, letterSpacing: -0.8, marginBottom: 40,
          opacity: 0, animation: "fadeUp 0.6s 0.25s forwards",
        }}>
          <span style={{ color: s.teal }}>Know if it Is Worth</span> Your Time<br />
          <span style={{ color: s.teal }}>Before You Spend Hours on It.</span>
        </p>

        <p style={{
          fontFamily: s.fontBody, fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.85)",
          maxWidth: 540, margin: "0 auto 32px",
          opacity: 0, animation: "fadeUp 0.6s 0.3s forwards",
        }}>
          Paste any address. In 60 seconds, get a score and buy price to know whether to dig deeper or move on.
        </p>

        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 16, opacity: 0, animation: "fadeUp 0.6s 0.4s forwards" }}>
          <form className="hero-address-bar" onSubmit={handleAnalyze} style={{
            display: "flex", alignItems: "center", background: "#000",
            border: "1px solid rgba(14,165,233,0.3)",
            boxShadow: "0 0 40px rgba(14,165,233,0.1), 0 0 80px rgba(14,165,233,0.05)",
            borderRadius: 12, padding: "5px 5px 5px 20px", width: "100%", maxWidth: 520,
          }}>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Enter any property address..."
              style={{ flex: 1, background: "none", border: "none", color: "#fff", fontFamily: s.fontBody, fontSize: 15, outline: "none", padding: "12px 0" }}
            />
            <button type="submit" style={{
              background: s.teal, color: "#000", border: "none", padding: "12px 28px",
              borderRadius: 10, fontFamily: s.fontBody, fontWeight: 700, fontSize: 14,
              cursor: "pointer", whiteSpace: "nowrap" as const,
            }}>
              Analyze a Property Free →
            </button>
          </form>

          <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const }}>
            <TrustCheck text="No credit card" />
            <TrustCheck text="5 free analyses / month" />
            <TrustCheck text="60-second results" />
          </div>
        </div>
      </section>

      <DivC />

      {/* ═══════════ PROOF BAR ═══════════ */}
      <div style={{ padding: "36px 24px", opacity: 0, animation: "fadeUp 0.6s 0.6s forwards" }}>
        <div className="proof-bar-inner" style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" as const }}>
          {[
            { num: "35+", label: "Years in RE data\n& technology" },
            { num: "47", suffix: "s", label: "Average time\nto analyze" },
            { num: "6", label: "Strategies scored\nsimultaneously" },
            { num: "4", label: "Data sources cross-\nreferenced per property" },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontFamily: s.fontData, fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>
                <span style={{ color: s.teal }}>{stat.num}</span>{stat.suffix || ""}
              </div>
              <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.muted, lineHeight: 1.4, marginTop: 4, whiteSpace: "pre-line" as const }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <DivB />

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px", maxWidth: 1060, margin: "0 auto", textAlign: "center" as const }}>
          <Eyebrow>How It Works</Eyebrow>
          <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
            Three Steps. One Decision.
          </h2>
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Paste an address and let the data do the work.
          </p>

          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 52 }}>
            {/* Step 1 */}
            <div style={{ ...cardSmStyle, padding: "28px 22px 24px", textAlign: "center" as const }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.teal, color: "#000", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>1</div>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Paste an Address</h3>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>Any U.S. property address. No account needed for your first scan.</p>
              <div style={{ marginTop: 18, background: "rgba(14,165,233,0.03)", borderRadius: 10, padding: 14, border: "1px solid rgba(14,165,233,0.1)" }}>
                <div style={{ background: "rgba(14,165,233,0.05)", borderRadius: 8, padding: "11px 14px", color: s.muted, fontFamily: s.fontBody, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: s.teal }}>📍</span> 1451 Sw 10th St, Boca Raton, FL
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ ...cardSmStyle, padding: "28px 22px 24px", textAlign: "center" as const }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.teal, color: "#000", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>2</div>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>We Analyze the Market</h3>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>Four valuation sources cross-referenced. Rents, expenses, and comps modeled through our proprietary IQ engine.</p>
              <div style={{ marginTop: 18, background: "rgba(14,165,233,0.03)", borderRadius: 10, padding: 14, border: "1px solid rgba(14,165,233,0.1)", textAlign: "left" as const }}>
                {[
                  { label: "IQ Estimate", value: "$869,326", teal: true },
                  { label: "Zillow", value: "$802,600" },
                  { label: "RentCast", value: "$1,016,000" },
                  { label: "Redfin", value: "$789,378" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 3 ? "1px solid rgba(14,165,233,0.08)" : "none", fontSize: 13 }}>
                    <span style={{ fontFamily: s.fontBody, color: s.muted }}>{row.label}</span>
                    <span style={{ fontFamily: s.fontData, fontWeight: 700, fontSize: 12, color: row.teal ? s.teal : "#fff" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ ...cardSmStyle, padding: "28px 22px 24px", textAlign: "center" as const }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.teal, color: "#000", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>3</div>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Get Your Investment Screen</h3>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>A Verdict Score that tells you if this property is in the range worth pursuing — plus your Target Buy and Deal Gap.</p>
              <div style={{ marginTop: 18, background: "rgba(14,165,233,0.03)", borderRadius: 10, padding: 14, border: "1px solid rgba(14,165,233,0.1)", textAlign: "center" as const }}>
                <div style={{ fontFamily: s.fontData, fontSize: 30, fontWeight: 700, color: s.warning }}>53<span style={{ fontSize: 13, color: s.mutedDim }}>/100</span></div>
                <div style={{ fontFamily: s.fontBody, fontSize: 11, color: s.warning, marginTop: 3, fontWeight: 600 }}>Marginal Opportunity</div>
                <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.muted, marginTop: 8 }}>Target Buy: <span style={{ color: s.teal, fontFamily: s.fontData, fontWeight: 700 }}>$669,608</span></div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(14,165,233,0.1)" }}>
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
                Your 60-Second<br />Investment Screen
              </h2>
              <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 560, lineHeight: 1.7, marginBottom: 20 }}>
                A Verdict Score from 0–100 that tells you whether this property is in the range worth pursuing — synthesizing Deal Gap, return quality, market alignment, and deal probability into one number. Below it: your three price thresholds and the number line showing where the deal sits.
              </p>
              <p style={{ marginTop: 24, fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.6 }}>
                <strong style={{ color: s.teal, fontWeight: 600 }}>This isn&apos;t a pass/fail.</strong> Every score links to <strong style={{ color: s.teal, fontWeight: 600 }}>&ldquo;See how to make it work&rdquo;</strong> — the full strategy breakdown showing the math, the terms, and exactly what needs to change for the deal to pencil.
              </p>
            </div>

            {/* Mockup Card */}
            <div style={{ ...cardLgStyle, padding: 28, position: "relative" as const, overflow: "hidden" }}>
              <div style={{ position: "absolute" as const, top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.teal}, ${s.success}, ${s.warning})`, borderRadius: "16px 16px 0 0" }} />

              {/* Score + Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${s.warning}`, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(251,191,36,0.12)" }}>
                  <span style={{ fontFamily: s.fontData, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>53</span>
                  <span style={{ fontFamily: s.fontData, fontSize: 10, color: s.muted }}>/100</span>
                </div>
                <span style={{ background: "rgba(251,191,36,0.12)", color: s.warning, fontFamily: s.fontBody, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20 }}>⚠ Marginal Opportunity</span>
              </div>

              <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.muted, marginBottom: 22 }}>1451 Sw 10th St, Boca Raton, FL 33486</div>

              {/* Three price cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
                {[
                  { label: "WHOLESALE", value: "$561,820", sub: "30% net discount", highlight: false },
                  { label: "TARGET BUY", value: "$669,608", sub: "Positive Cashflow", highlight: true, subGreen: true },
                  { label: "INCOME VALUE", value: "$704,851", sub: "Income covers all costs", highlight: false },
                ].map((card, i) => (
                  <div key={i} style={{
                    background: "#000", borderRadius: 10, padding: "12px 10px", textAlign: "center" as const,
                    border: card.highlight ? "1px solid rgba(14,165,233,0.25)" : "1px solid rgba(14,165,233,0.15)",
                    boxShadow: card.highlight ? "0 0 30px rgba(14,165,233,0.1)" : "0 0 20px rgba(14,165,233,0.04)",
                  }}>
                    <div style={{ fontFamily: s.fontBody, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: s.muted, marginBottom: 3 }}>{card.label}</div>
                    <div style={{ fontFamily: s.fontData, fontSize: 18, fontWeight: 700, color: card.highlight ? s.teal : "#fff" }}>{card.value}</div>
                    <div style={{ fontFamily: s.fontBody, fontSize: 11, color: card.subGreen ? s.success : s.muted, marginTop: 2 }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Number line */}
              <div style={{ margin: "24px 0 14px", padding: "0 4px" }}>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, position: "relative" as const }}>
                  <div style={{ position: "absolute" as const, left: 0, top: 0, height: "100%", width: "60%", borderRadius: 3, background: `linear-gradient(90deg, ${s.teal}, ${s.warning})` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  {[
                    { color: s.teal, name: "Target Buy", value: "$669,608" },
                    { color: s.warning, name: "Income Value", value: "$704,851" },
                    { color: s.danger, name: "Market", value: "$802,600" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}40`, marginBottom: 3 }} />
                      <div style={{ fontFamily: s.fontBody, color: s.muted, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{item.name}</div>
                      <div style={{ fontFamily: s.fontData, fontWeight: 700, fontSize: 12, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deal Gap badge */}
              <div style={{ textAlign: "center" as const, marginTop: 14, padding: "7px 14px", background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)", borderRadius: 8, fontFamily: s.fontBody, fontSize: 12, color: s.muted }}>
                Deal Gap: <span style={{ fontFamily: s.fontData, fontWeight: 700, color: s.teal }}>−16.6%</span> below market · Price Gap: <span style={{ fontFamily: s.fontData, fontWeight: 700, color: s.teal }}>−12.2%</span>
              </div>

              {/* See how to make it work */}
              <div style={{ textAlign: "center" as const, marginTop: 18 }}>
                <Link href="/about" style={{
                  fontFamily: s.fontBody, fontSize: 15, fontWeight: 700, color: s.teal, textDecoration: "none",
                  padding: "10px 24px", border: "1px solid rgba(14,165,233,0.25)", borderRadius: 10,
                  display: "inline-block", boxShadow: "0 0 20px rgba(14,165,233,0.06)",
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
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            What&apos;s the most I can pay and break even? Where does cash flow start? How far is the market from both? <BrandName /> calculates all three automatically. Every assumption is editable.
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
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(14,165,233,0.1)", display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: s.fontBody, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: s.muted }}>Example</span>
                  <span style={{ fontFamily: s.fontData, fontSize: 20, fontWeight: 700, color: card.exColor }}>{card.example}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      <DivB />

      {/* ═══════════ MULTI-STRATEGY ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div className="strategy-inner" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
            <div>
              <Eyebrow>One Property, Six Strategies</Eyebrow>
              <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
                Every Angle,<br />Analyzed Simultaneously
              </h2>
              <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 560, lineHeight: 1.7, marginBottom: 16 }}>
                Other tools analyze one strategy at a time. <BrandName /> models the financials across all six simultaneously — so you can see which approach puts the investment in range.
              </p>
              <p style={{ fontFamily: s.fontBody, fontSize: 14, color: "rgba(255,255,255,0.85)", maxWidth: 560, lineHeight: 1.7 }}>
                A property that doesn&apos;t pencil as a long-term rental might score 100 as a BRRRR. You&apos;d never see that with a single-strategy calculator.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, marginTop: 28 }}>
                {[
                  { score: "100", label: "BRRRR", level: "high" },
                  { score: "100", label: "House Hack", level: "high" },
                  { score: "100", label: "Wholesale", level: "high" },
                  { score: "74", label: "Fix & Flip", level: "mid" },
                  { score: "57", label: "Long-Term Rental", level: "low" },
                  { score: "45", label: "Short-Term Rental", level: "low" },
                ].map((pill, i) => {
                  const colors = { high: { bg: "rgba(52,211,153,0.12)", color: s.success }, mid: { bg: "rgba(251,191,36,0.12)", color: s.warning }, low: { bg: "rgba(249,112,102,0.12)", color: s.danger } };
                  const c = colors[pill.level as keyof typeof colors];
                  return (
                    <div key={i} style={{ background: "#000", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 8, padding: "8px 14px", fontFamily: s.fontBody, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 16px rgba(14,165,233,0.04)" }}>
                      <span style={{ fontFamily: s.fontData, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: c.bg, color: c.color }}>{pill.score}</span>
                      {pill.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strategy mockup */}
            <div style={{ ...cardLgStyle, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(14,165,233,0.12)", display: "flex", alignItems: "center", gap: 10, fontFamily: s.fontBody, fontSize: 14, fontWeight: 600 }}>
                <span style={{ background: s.teal, color: "#000", fontFamily: s.fontBody, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>BRRRR</span>
                Strategy Deep Dive
              </div>
              <div style={{ padding: "22px 20px" }}>
                {[
                  { label: "Target Buy", value: "$669,608", color: s.teal },
                  { label: "Monthly Rent", value: "$4,975" },
                  { label: "Monthly Payment", value: "$3,212" },
                  { label: "NOI (Before Loan)", value: "$3,831/mo", color: s.success },
                  { label: "Net Cash Flow", value: "$619/mo", color: s.success },
                  { label: "DSCR", value: "0.81" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < 5 ? "1px solid rgba(14,165,233,0.06)" : "none", fontSize: 14 }}>
                    <span style={{ fontFamily: s.fontBody, color: s.muted }}>{row.label}</span>
                    <span style={{ fontFamily: s.fontData, fontWeight: 700, fontSize: 13, color: row.color || "#fff" }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: 14, background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.1)", borderRadius: 10, fontFamily: s.fontBody, fontSize: 13, color: s.muted, lineHeight: 1.6 }}>
                  At the Target Buy of <span style={{ fontFamily: s.fontData, fontWeight: 700, color: s.teal, fontSize: 13 }}>$669,608</span>, this property would generate about <span style={{ fontFamily: s.fontData, fontWeight: 700, color: s.teal, fontSize: 13 }}>$619/mo</span> in cash flow as a BRRRR. This is your starting point — adjust assumptions, change terms, and verify with your own due diligence.
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivC />

      {/* ═══════════ COST COMPARISON ═══════════ */}
      <FadeIn>
        <section style={{ padding: "72px 24px" }}>
          <div className="cost-inner" style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 40, alignItems: "center", textAlign: "center" as const }}>
            <div>
              <div style={{ fontFamily: s.fontData, fontSize: "clamp(36px, 5vw, 46px)", fontWeight: 700, color: s.danger, letterSpacing: -2 }}>$21,165</div>
              <div style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, marginTop: 8, lineHeight: 1.5 }}>Average cost of a bad<br />investment decision</div>
            </div>
            <div style={{ width: 1, height: 72, background: "rgba(14,165,233,0.15)", position: "relative" as const }}>
              <span style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#000", padding: "4px 10px", fontFamily: s.fontBody, fontSize: 11, fontWeight: 700, color: s.muted, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>VS</span>
            </div>
            <div>
              <div style={{ fontFamily: s.fontData, fontSize: "clamp(36px, 5vw, 46px)", fontWeight: 700, color: s.teal, letterSpacing: -2 }}>$273<span style={{ fontSize: 22 }}>/yr</span></div>
              <div style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, marginTop: 8, lineHeight: 1.5 }}>Cost of <BrandName /> Pro<br />Pays for itself once.</div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivB />

      {/* ═══════════ FOUNDER ═══════════ */}
      <FadeIn>
        <section style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" as const }}>
            <Eyebrow>Built by an Insider</Eyebrow>
            <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
              35 Years of Real Estate Data,<br />Distilled Into One Tool
            </h2>

            <div style={{ ...cardLgStyle, padding: "44px 36px", marginTop: 36, position: "relative" as const }}>
              <div style={{ position: "absolute" as const, top: -1, left: "50%", transform: "translateX(-50%)", width: 100, height: 2, background: s.teal, borderRadius: "0 0 2px 2px" }} />
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#000", border: `2px solid ${s.teal}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontFamily: s.fontBody, fontSize: 22, fontWeight: 700, color: s.teal, boxShadow: "0 0 20px rgba(14,165,233,0.12)" }}>BG</div>
              <div style={{ fontFamily: s.fontBody, fontSize: 19, fontWeight: 700 }}>Brad Geisen</div>
              <div style={{ fontFamily: s.fontBody, fontSize: 13, color: s.teal, marginBottom: 18 }}>Founder &amp; CEO, DealGapIQ</div>
              <p style={{ fontFamily: s.fontBody, fontSize: 16, color: s.muted, lineHeight: 1.7, fontStyle: "italic", maxWidth: 580, margin: "0 auto 24px" }}>
                &ldquo;I spent 35 years building real estate data systems — HomePath.com for Fannie Mae, HomeSteps.com for Freddie Mac, and Foreclosure.com which I founded and operated for 21 years. I built <strong style={{ fontStyle: "normal" }}>DealGap<span style={{ color: s.teal }}>IQ</span></strong> because investors still don&apos;t have a fast, data-backed way to know their number before making an offer.&rdquo;
              </p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, justifyContent: "center" }}>
                {[
                  { num: "35+", label: "years in RE data" },
                  { num: "80+", label: "companies served" },
                  { num: "500+", label: "RE projects" },
                  { num: "30+", label: "yr GSE partnerships" },
                ].map((cred, i) => (
                  <div key={i} style={{ background: "#000", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 8, padding: "7px 14px", fontFamily: s.fontBody, fontSize: 12, color: s.muted, display: "flex", alignItems: "center", gap: 5, boxShadow: "0 0 16px rgba(14,165,233,0.04)" }}>
                    <span style={{ fontFamily: s.fontData, fontWeight: 700, color: "#fff", fontSize: 12 }}>{cred.num}</span> {cred.label}
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
          <div style={{ position: "absolute" as const, bottom: 0, left: "50%", transform: "translateX(-50%)", width: 480, height: 380, background: "radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)", pointerEvents: "none" as const }} />

          <Eyebrow>Stop Guessing. Start Calculating.</Eyebrow>
          <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(30px, 4.2vw, 44px)", fontWeight: 700, letterSpacing: -1.2, marginBottom: 14, lineHeight: 1.15 }}>
            Every Property Has a Deal Gap.<br />Find Yours.
          </h2>
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Paste an address. See the three price thresholds, the Verdict Score, and which strategy makes it work — in under 60 seconds.
          </p>

          <div style={{ maxWidth: 520, margin: "0 auto 20px" }}>
            <form className="hero-address-bar" onSubmit={handleAnalyze} style={{
              display: "flex", alignItems: "center", background: "#000",
              border: "1px solid rgba(14,165,233,0.3)", boxShadow: "0 0 40px rgba(14,165,233,0.1), 0 0 80px rgba(14,165,233,0.05)",
              borderRadius: 12, padding: "5px 5px 5px 20px", width: "100%",
            }}>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Enter any property address..."
                style={{ flex: 1, background: "none", border: "none", color: "#fff", fontFamily: s.fontBody, fontSize: 15, outline: "none", padding: "12px 0" }}
              />
              <button type="submit" style={{
                background: s.teal, color: "#000", border: "none", padding: "12px 28px",
                borderRadius: 10, fontFamily: s.fontBody, fontWeight: 700, fontSize: 14,
                cursor: "pointer", whiteSpace: "nowrap" as const,
              }}>
                Analyze a Property Free →
              </button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 18, flexWrap: "wrap" as const }}>
            <TrustCheck text="No credit card" />
            <TrustCheck text="5 free analyses per month" />
            <TrustCheck text="Results in 60 seconds" />
            <TrustCheck text="Every assumption editable" />
          </div>

          <div style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, marginTop: 14 }}>
            Free to start · Pro at <span style={{ color: "#fff", fontWeight: 600 }}>$29/mo</span> (annual) for unlimited analyses
          </div>
        </section>
      </FadeIn>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ borderTop: "1px solid rgba(14,165,233,0.1)", padding: "36px 24px", textAlign: "center" as const }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: s.fontLogo, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>DealGap<span style={{ color: s.teal }}>IQ</span></div>
        </Link>
        <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.mutedDim, opacity: 0.6 }}>© 2025 DealGapIQ. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default DealGapIQHomepage;
