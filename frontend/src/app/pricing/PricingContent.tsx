"use client"

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { IS_CAPACITOR } from "@/lib/env";
import { SocialProof } from "@/components/landing/SocialProof";
import { PriceCents } from "@/components/ui/PriceCents";

const CheckIcon: React.FC<{ color?: string }> = ({ color = "var(--accent-sky)" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
    <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DashIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
    <path d="M8 12h8" stroke="var(--text-label)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--text-label)" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--text-label)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid var(--border-subtle)", padding: "16px 0", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, margin: 0, color: open ? "var(--text-heading)" : "var(--text-secondary)" }}>
          {question}
        </p>
        <span
          style={{
            color: "var(--text-label)",
            fontSize: "18px",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          +
        </span>
      </div>
      {open && (
        <p style={{ fontSize: "13px", color: "var(--text-body)", lineHeight: 1.6, margin: "10px 0 0 0" }}>
          {answer}
        </p>
      )}
    </div>
  );
}

interface ComparisonRow {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}

interface ComparisonCategory {
  name: string;
  rows: ComparisonRow[];
}

const COMPARISON_DATA: ComparisonCategory[] = [
  {
    name: "Property Analysis",
    rows: [
      { name: "Property search", free: true, pro: true },
      { name: "Property analyses per month", free: "3", pro: "Unlimited" },
      { name: "Verdict with deal score", free: true, pro: true },
      { name: "Income Value, Target Buy & Deal Gap", free: true, pro: true },
      { name: "Multi-source IQ Estimates (Zillow, RentCast, Redfin, Realtor)", free: true, pro: true },
      { name: "Choose your preferred estimate source", free: true, pro: true },
      { name: "All 6 strategy snapshots (LTR, STR, BRRRR, Flip, House Hack, Wholesale)", free: true, pro: true },
      { name: "Plain-language metric explanations", free: true, pro: true },
      { name: "Seller Motivation indicator", free: true, pro: true },
    ],
  },
  {
    name: "Financial Modeling",
    rows: [
      { name: "Full calculation breakdown", free: false, pro: true },
      { name: "Editable assumptions & stress testing", free: false, pro: true },
      { name: "Sensitivity analysis across scenarios", free: false, pro: true },
      { name: "10-year financial proforma projections", free: false, pro: true },
      { name: "Deal Maker interactive worksheet", free: false, pro: true },
    ],
  },
  {
    name: "Market & Comps",
    rows: [
      { name: "Appraiser — professional appraisal tool with sale & rental comps", free: false, pro: true },
      { name: "Comps proximity map", free: false, pro: true },
      { name: "Market Consensus engine", free: false, pro: true },
      { name: "Nearby ZIP code market comparisons", free: false, pro: true },
      { name: "Quick Rehab Estimator with regional costs", free: false, pro: true },
      { name: "Interactive Map Search for listings", free: false, pro: true },
    ],
  },
  {
    name: "Export & Reporting",
    rows: [
      { name: "Downloadable Excel proforma", free: false, pro: true },
      { name: "Strategy-specific Excel worksheets", free: false, pro: true },
      { name: "PDF property reports", free: false, pro: true },
      { name: "Letter of Intent generator (wholesale)", free: false, pro: true },
    ],
  },
  {
    name: "Portfolio & Deal Management",
    rows: [
      { name: "Save properties to DealGapIQ pipeline", free: "Up to 3", pro: "Unlimited" },
      { name: "Side-by-side deal comparison", free: false, pro: true },
      { name: "Search history", free: true, pro: true },
    ],
  },
];

const RESPONSIVE_STYLE = `
  @media (max-width: 700px) {
    .pricing-grid { grid-template-columns: 1fr !important; }
    .proforma-grid { grid-template-columns: 1fr 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .pricing-trust-grid { grid-template-columns: 1fr !important; }
    .pricing-bottom-options { flex-direction: column !important; align-items: stretch !important; }
    .pricing-bottom-option { width: 100% !important; }
    .pricing-bottom-option a,
    .pricing-bottom-option button { width: 100% !important; text-align: center !important; }
    .comparison-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .comparison-table { min-width: 0 !important; font-size: 11px !important; }
    .comparison-table th { padding: 10px 6px !important; font-size: 11px !important; }
    .comparison-table td { padding: 8px 6px !important; }
    .comparison-table td:first-child { padding-left: 12px !important; }
    .comparison-header-row { position: sticky; top: 0; z-index: 2; }
    .mobile-sticky-cta { display: flex !important; }
  }
  @media (min-width: 701px) {
    .mobile-sticky-cta { display: none !important; }
  }
`;

export default function PricingContent() {
  const { isAuthenticated } = useSession();
  const [isAnnual, setIsAnnual] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const pricingCardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (pricingCardsRef.current) observer.observe(pricingCardsRef.current);
    return () => observer.disconnect();
  }, []);

  const starterFeatures: string[] = [
    "Property search",
    "3 property analyses per month",
    "Verdict with deal score & plain-language explanations",
    "Income Value, Target Buy & Deal Gap on every property",
    "Multi-source IQ Estimates — Zillow, RentCast, Redfin, Realtor",
    "All 6 strategy snapshots — LTR, STR, BRRRR, Flip, House Hack, Wholesale",
    "Seller Motivation indicator",
    "Save up to 3 properties to DealGapIQ pipeline",
  ];

  const proFeatures: string[] = [
    "Unlimited property analyses",
    "Full calculation breakdown — see every number behind the verdict",
    "Editable assumptions & stress testing — adjust rent, rates, and expenses",
    "Appraiser — professional appraisal tool with sale & rental comps",
    "Market Consensus engine — aggregate view across all data sources",
    "Sensitivity analysis — see how deal metrics shift across scenarios",
    "Interactive Map Search — browse and analyze listings on a map",
    "10-year financial proforma projections",
    "Deal Maker interactive worksheet with real-time recalculation",
    "Downloadable Excel proforma & strategy-specific worksheets",
    "PDF property reports",
    "DealGapIQ pipeline with unlimited saves & side-by-side deal comparison",
  ];

  const faqs = [
    {
      q: "I've never analyzed a real estate deal before. Is this too advanced for me?",
      a: "Not at all — DealGapIQ was designed for people learning the numbers. Every metric includes a plain-language explanation, so you understand what cap rate, cash-on-cash return, and DSCR mean and why they matter. The Starter plan lets you practice on real properties for free.",
    },
    {
      q: "What happens after my 7-day trial?",
      a: "You'll be billed at your chosen plan rate. Cancel anytime before the trial ends and you won't be charged. No calls, no retention tricks — cancel in 2 clicks from your account settings.",
    },
    {
      q: "Where does DealGapIQ get its data?",
      a: "Every analysis cross-references multiple data sources including Zillow (Zestimate & Rent Zestimate), RentCast (AVM & rental data), Redfin (estimates), and Realtor.com. Our IQ Estimate blends all available sources so you're never relying on a single number.",
    },
    {
      q: "How is this different from Zillow or PropStream?",
      a: "Zillow shows you a Zestimate. PropStream gives you raw data. DealGapIQ calculates a specific buy price and investment verdict across 6 strategies — LTR, STR, BRRRR, Flip, House Hack, and Wholesale — then shows you the Deal Gap between asking price and what the numbers actually support.",
    },
    {
      q: "Is this a replacement for my own spreadsheets?",
      a: "Pro includes downloadable Excel proformas with full amortization schedules, 10-year projections, and strategy-specific worksheets. Use ours or export the data into yours — either way, you'll have institutional-quality numbers.",
    },
    {
      q: "I only own one property. Is this for me?",
      a: "If you're evaluating your next purchase, absolutely. One bad deal costs more than years of Pro. Even experienced investors miss deals hiding in plain sight — DealGapIQ finds them in 60 seconds.",
    },
    {
      q: "What is the Deal Gap?",
      a: "The Deal Gap is the difference between a property's asking price and what the numbers say it's actually worth as an investment. A positive Deal Gap means the property is priced below its investment value — a potential opportunity. A negative gap means you'd be overpaying based on the income it can generate.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes, instantly. No calls, no retention tricks, no hassle. Cancel from your account in 2 clicks and you won't be billed again.",
    },
  ];

  // On Capacitor, always open the UpgradeModal (RevenueCat IAP).
  // Never redirect to /register with plan params — that path leads to Stripe.
  const proCtaHref = (!isAuthenticated && !IS_CAPACITOR)
    ? `/register?plan=pro&billing=${isAnnual ? "annual" : "monthly"}`
    : undefined;

  const handleProClick = (isAuthenticated || IS_CAPACITOR)
    ? () => setUpgradeModalOpen(true)
    : undefined;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-base)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "var(--text-heading)",
        padding: "0 20px",
      }}
    >
      <style>{RESPONSIVE_STYLE}</style>

      {/* ─── HERO ─── */}
      <div style={{ textAlign: "center", maxWidth: "640px", margin: "48px auto 0" }}>
        <p style={{ fontSize: "13px", color: "var(--accent-sky)", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 16px 0" }}>
          Pricing
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
          Know Your Number{" "}
          <br />
          <span style={{ color: "var(--accent-sky)" }}>Before You Make the Offer</span>
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-body)", lineHeight: 1.6, margin: "0 0 8px 0" }}>
          DealGapIQ calculates your Income Value, Target Buy, and Deal Gap across 6 investment strategies. In 60 seconds.
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 32px 0", fontStyle: "italic" }}>
          One bad deal costs thousands. DealGapIQ Pro costs $39.99/mo.
        </p>

        {/* ─── TOGGLE ─── */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0",
            background: "var(--surface-card)",
            borderRadius: "40px",
            padding: "4px",
            border: "1px solid var(--border-default)",
          }}
        >
          <button
            onClick={() => setIsAnnual(false)}
            style={{
              padding: "8px 20px",
              borderRadius: "36px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: !isAnnual ? "var(--accent-sky)" : "transparent",
              color: !isAnnual ? "var(--text-inverse)" : "var(--text-label)",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            style={{
              padding: "8px 20px",
              borderRadius: "36px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: isAnnual ? "var(--accent-sky)" : "transparent",
              color: isAnnual ? "var(--text-inverse)" : "var(--text-label)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Annual
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                background: isAnnual ? "rgba(255,255,255,0.22)" : "var(--color-sky-dim)",
                color: isAnnual ? "var(--text-inverse)" : "var(--accent-sky)",
                padding: "2px 6px",
                borderRadius: "6px",
              }}
            >
              SAVE 27%
            </span>
          </button>
        </div>
      </div>

      {/* ─── TRUST & FIT BLOCK ─── */}
      <div style={{ maxWidth: "960px", margin: "28px auto 0" }}>
        <p style={{ fontSize: "14px", color: "var(--text-body)", textAlign: "center", margin: "0 0 18px 0", lineHeight: 1.6 }}>
          Built for aspiring investors, first-time buyers, and small portfolio owners (1–20 units).
        </p>
        <div
          className="pricing-trust-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {[
            {
              title: "Multi-source intelligence",
              text: "Every analysis blends data from Zillow, RentCast, Redfin, and Realtor.com — not a single estimate. You choose which source to trust.",
            },
            {
              title: "Built to teach you underwriting",
              text: "Plain-language explanations on every metric. Learn cap rates, DSCR, and cash-on-cash returns by analyzing real properties, not textbooks.",
            },
            {
              title: "Institutional-grade output",
              text: "Downloadable Excel proformas, PDF reports, and 10-year projections — the same depth banks and funds use, in your hands.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "14px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border-default)",
                background: "var(--surface-card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckIcon color="var(--accent-sky)" />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-heading)" }}>{item.title}</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-body)", lineHeight: 1.55, paddingLeft: "24px" }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PRICING CARDS ─── */}
      <div
        ref={pricingCardsRef}
        className="pricing-grid"
        style={{
          maxWidth: "880px",
          margin: "48px auto 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* STARTER CARD */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "16px",
            padding: "36px 32px",
            position: "relative",
          }}
        >
          <p style={{ fontSize: "12px", color: "var(--text-label)", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", margin: "0 0 8px 0" }}>
            Starter
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "0 0 6px 0" }}>
            <span style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-2px" }}>Free</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-body)", lineHeight: 1.6, margin: "0 0 10px 0" }}>
            Learn the numbers and screen your first deals — no risk, no cost.
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-label)", margin: "0 0 28px 0" }}>
            Always free. No credit card required.
          </p>

          <Link
            href="/register?plan=starter"
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-body)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
          >
            Start Free &rarr;
          </Link>
          <p style={{ fontSize: "11px", color: "var(--text-label)", textAlign: "center", margin: "0 0 28px 0" }}>
            No credit card. No commitment.
          </p>

          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 14px 0" }}>
            What&apos;s included
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {starterFeatures.map((feature, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px" }}>
                <CheckIcon color="var(--text-label)" />
                <span style={{ color: "var(--text-secondary)", lineHeight: 1.4 }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PRO CARD */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-focus)",
            borderRadius: "16px",
            padding: "36px 32px",
            position: "relative",
            boxShadow: "var(--shadow-card-hover)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--accent-sky)",
              color: "var(--text-inverse)",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 16px",
              borderRadius: "20px",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Best Value
          </div>

          <p style={{ fontSize: "12px", color: "var(--accent-sky)", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", margin: "0 0 8px 0" }}>
            Pro Investor
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "0 0 2px 0" }}>
            <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-label)" }}>$</span>
            <span style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-2px" }}>
              <PriceCents>{isAnnual ? "29.17" : "39.99"}</PriceCents>
            </span>
            <span style={{ fontSize: "15px", color: "var(--text-label)", fontWeight: 500 }}>/mo</span>
          </div>
          {isAnnual ? (
            <p style={{ fontSize: "12px", color: "var(--text-label)", margin: "0 0 10px 0" }}>
              Billed annually at $349.99 &middot; <span style={{ color: "var(--accent-sky)", fontWeight: 600 }}>Save $130/yr</span>
            </p>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--text-label)", margin: "0 0 10px 0" }}>
              Billed monthly &middot; <span style={{ color: "var(--text-secondary)" }}>Switch to annual &amp; save 27%</span>
            </p>
          )}
          <p style={{ fontSize: "13px", color: "var(--text-body)", lineHeight: 1.6, margin: "0 0 28px 0" }}>
            For active investors analyzing multiple deals every month. Full underwriting power.
          </p>

          {proCtaHref ? (
            <Link
              href={proCtaHref}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
                color: "var(--text-inverse)",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
                marginBottom: "8px",
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Start 7-Day Free Trial &rarr;
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleProClick}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
                color: "var(--text-inverse)",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
                marginBottom: "8px",
              }}
            >
              Start 7-Day Free Trial &rarr;
            </button>
          )}
          <p style={{ fontSize: "11px", color: "var(--text-label)", textAlign: "center", margin: "0 0 28px 0" }}>
            Cancel anytime in 2 clicks. No commitment.
          </p>

          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-sky)", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 14px 0" }}>
            Everything in Starter, plus
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {proFeatures.map((feature, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px" }}>
                <CheckIcon color="var(--accent-sky)" />
                <span style={{ color: "var(--text-body)", lineHeight: 1.4 }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TRUST ROW ─── */}
      <div
        style={{
          maxWidth: "600px",
          margin: "36px auto 0",
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        {["Cancel anytime. No lock-in contracts", "7-day free trial on Pro. Full access", "Your data stays yours. We never share or sell"].map(
          (text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--text-label)",
              }}
            >
              <CheckIcon color="var(--text-label)" />
              {text}
            </div>
          )
        )}
      </div>

      {/* ─── SECURITY + DEAL PRIVACY ─── */}
      <div
        style={{
          maxWidth: "600px",
          margin: "20px auto 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {!IS_CAPACITOR && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-label)" }}>
            <LockIcon />
            <span>Secured by Stripe &middot; PCI compliant</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 20px",
            borderRadius: "10px",
            border: "1px solid var(--border-default)",
            background: "var(--surface-card)",
          }}
        >
          <ShieldIcon />
          <div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-heading)", margin: "0 0 2px 0" }}>
              Deal Privacy Guarantee
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Your analyzed properties are never shared, sold, or used to front-run your offers. Your deal flow is yours alone.
            </p>
          </div>
        </div>
      </div>

      {/* ─── FEATURE COMPARISON TABLE ─── */}
      <div style={{ maxWidth: "880px", margin: "80px auto 0" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ fontSize: "11px", color: "var(--accent-sky)", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 10px 0" }}>
            Full Feature Breakdown
          </p>
          <h2 style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.2 }}>
            Compare every feature, side by side
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-body)", margin: "0 0 16px 0" }}>
            See exactly what you get at each tier — no surprises.
          </p>
          <button
            onClick={() => setComparisonOpen(!comparisonOpen)}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid var(--border-default)",
              background: "var(--surface-card)",
              color: "var(--text-heading)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {comparisonOpen ? "Hide comparison" : "View full comparison"}
            <span style={{
              transition: "transform 0.2s ease",
              transform: comparisonOpen ? "rotate(180deg)" : "rotate(0deg)",
              fontSize: "12px",
            }}>
              ▼
            </span>
          </button>
        </div>

        {comparisonOpen && (
          <div className="comparison-table-wrapper" style={{ borderRadius: "12px", border: "1px solid var(--border-default)", overflow: "hidden" }}>
            <table
              className="comparison-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  className="comparison-header-row"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "var(--text-heading)", width: "55%" }}>
                    Feature
                  </th>
                  <th style={{ textAlign: "center", padding: "14px 16px", fontWeight: 600, color: "var(--text-label)", width: "22.5%" }}>
                    Starter
                  </th>
                  <th style={{ textAlign: "center", padding: "14px 16px", fontWeight: 600, color: "var(--accent-sky)", width: "22.5%" }}>
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((category, ci) => (
                  <React.Fragment key={ci}>
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: "12px 20px 8px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          color: "var(--text-label)",
                          background: "var(--surface-card)",
                          borderTop: ci > 0 ? "1px solid var(--border-default)" : "none",
                        }}
                      >
                        {category.name}
                      </td>
                    </tr>
                    {category.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{
                          borderTop: "1px solid var(--border-subtle)",
                          background: "var(--surface-card)",
                        }}
                      >
                        <td style={{ padding: "10px 20px", color: "var(--text-body)" }}>
                          {row.name}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 16px" }}>
                          {row.free === true ? (
                            <CheckIcon color="var(--text-label)" />
                          ) : row.free === false ? (
                            <DashIcon />
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{row.free}</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 16px" }}>
                          {row.pro === true ? (
                            <CheckIcon color="var(--accent-sky)" />
                          ) : row.pro === false ? (
                            <DashIcon />
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--accent-sky)", fontWeight: 600 }}>{row.pro}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── WHY PRO SECTION ─── */}
      <div
        style={{
          maxWidth: "880px",
          margin: "80px auto 0",
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "16px",
          padding: "48px 40px",
        }}
      >
        <p style={{ fontSize: "11px", color: "var(--accent-sky)", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 10px 0" }}>
          Why Pro Matters
        </p>
        <h2 style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.2 }}>
          Free shows you the verdict.
          <br />
          Pro gives you the tools to close the deal.
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-body)", lineHeight: 1.6, margin: "0 0 32px 0", maxWidth: "600px" }}>
          Every DealGapIQ calculation is built on real data: comparables, rents, local vacancy rates, taxes, and market-specific assumptions. Pro lets you see every input, challenge every assumption, and stress test the deal before you write the offer.
        </p>

        <div
          className="proforma-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {[
            { label: "Monthly Rent", value: "$1,850/mo", sub: "IQ Estimate from 3 data sources" },
            { label: "Cap Rate", value: "5.2%", sub: "Market adjusted" },
            { label: "Cash-on-Cash", value: "8.1%", sub: "After all expenses" },
            { label: "Cash Flow", value: "$8,440/yr", sub: "Annual net income" },
            { label: "Deal Gap", value: "–7.8%", sub: "Below asking — potential opportunity" },
            { label: "DSCR", value: "1.24", sub: "Debt coverage ratio" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: "var(--surface-elevated)",
                borderRadius: "10px",
                padding: "16px",
                border: "1px solid var(--border-default)",
              }}
            >
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {item.label}
              </p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-heading)", margin: "0 0 4px 0" }}>
                {item.value}
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>{item.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LockIcon />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Pro unlocks editable inputs, sensitivity analysis, and downloadable Excel proformas
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckIcon color="var(--text-label)" />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Deal Maker lets you adjust every assumption in real time and see the impact instantly
            </span>
          </div>
        </div>
      </div>

      {/* ─── FOUNDER SECTION ─── */}
      <div
        style={{
          maxWidth: "640px",
          margin: "80px auto 0",
          textAlign: "center",
        }}
      >
        <Image
          src="/images/brad-geisen-headshot.png"
          alt="Brad Geisen"
          width={72}
          height={72}
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            margin: "0 auto 16px",
            display: "block",
          }}
        />
        <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px 0" }}>Brad Geisen</p>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 20px 0" }}>
          Founder, DealGapIQ &middot; 35+ years in real estate data &amp; technology
        </p>
        <a
          href="https://www.linkedin.com/in/bradgeisen"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px", color: "var(--accent-sky)", textDecoration: "none", marginBottom: 16 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          LinkedIn Profile
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-body)",
            lineHeight: 1.7,
            fontStyle: "italic",
            margin: "0 0 24px 0",
            padding: "0 20px",
          }}
        >
          &ldquo;In the early 1990&apos;s, while running a foreclosure disposition pilot program for HUD, I started building a proprietary data system that gave investors more insight than their intuition, that system was later known as Foreclosure.com. Exceeding the institutional platforms, I was commissioned to build HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. DealGapIQ takes that same institutional-grade intelligence to the next level, putting it in your hands.&rdquo;
        </p>

        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          {[
            { value: "35+", label: "Years in RE Data" },
            { value: "30+", label: "Yr GSE Partnerships" },
            { value: "35+", label: "Years RE Investor" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent-sky)", margin: "0 0 2px 0" }}>
                {stat.value}
              </p>
              <p style={{ fontSize: "10px", color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SOCIAL PROOF ─── */}
      <SocialProof />

      {/* ─── FAQ SECTION ─── */}
      <div style={{ maxWidth: "640px", margin: "80px auto 0" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 32px 0", textAlign: "center" }}>
          Common questions
        </h2>
        {faqs.map((faq, i) => (
          <FAQItem key={i} question={faq.q} answer={faq.a} />
        ))}
      </div>

      {/* ─── BOTTOM CTA ─── */}
      <div
        style={{
          textAlign: "center",
          margin: "80px auto 0",
          paddingBottom: "60px",
          maxWidth: "480px",
        }}
      >
        <h2 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.2 }}>
          Stop guessing.
          <br />
          <span style={{ color: "var(--accent-sky)" }}>Start calculating.</span>
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-label)", margin: "0 0 24px 0" }}>
          Every property has a Deal Gap. Only DealGapIQ measures it.
        </p>
        <div className="pricing-bottom-options" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="pricing-bottom-option" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-label)", margin: 0 }}>
              Analyzing multiple deals each month?
            </p>
            {proCtaHref ? (
              <Link
                href={proCtaHref}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
                  color: "var(--text-inverse)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-card)",
                  textDecoration: "none",
                }}
              >
                Start 7-Day Free Trial &rarr;
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleProClick}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
                  color: "var(--text-inverse)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                Start 7-Day Free Trial &rarr;
              </button>
            )}
            <p style={{ fontSize: "10px", color: "var(--text-label)", margin: 0 }}>Cancel anytime. No commitment.</p>
          </div>

          <div className="pricing-bottom-option" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-label)", margin: 0 }}>
              Just starting or learning the numbers?
            </p>
            <Link
              href="/register?plan=starter"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-body)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Start Free
            </Link>
            <p style={{ fontSize: "10px", color: "var(--text-label)", margin: 0 }}>No credit card required.</p>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        returnTo="/pricing"
      />

      {/* ─── MOBILE STICKY CTA ─── */}
      <div
        className="mobile-sticky-cta"
        style={{
          display: "none",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "12px 20px",
          background: "var(--surface-card)",
          borderTop: "1px solid var(--border-default)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          opacity: showStickyCta ? 1 : 0,
          pointerEvents: showStickyCta ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-heading)", margin: 0, whiteSpace: "nowrap" }}>
            Pro — ${isAnnual ? "29.17" : "39.99"}/mo
          </p>
          <p style={{ fontSize: "10px", color: "var(--text-label)", margin: 0 }}>7-day free trial</p>
        </div>
        {proCtaHref ? (
          <Link
            href={proCtaHref}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
              color: "var(--text-inverse)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Start Trial &rarr;
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleProClick}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
              color: "var(--text-inverse)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Start Trial &rarr;
          </button>
        )}
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "20px 0",
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--text-label)" }}>
          &copy; 2026 DealGapIQ. Professional use only. Not financial advice.
        </div>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: "var(--text-label)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: "var(--text-label)", textDecoration: "none" }}>Terms</Link>
          <Link href="/help" style={{ fontSize: "11px", color: "var(--text-label)", textDecoration: "none" }}>Support</Link>
        </div>
      </div>
    </div>
  );
}
