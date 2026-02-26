"use client"

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

// ─── Icons ───
const CheckIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#0EA5E9" fillOpacity="0.12" />
    <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#0EA5E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#475569" strokeWidth="1.3" />
    <path d="M5 7V5a3 3 0 016 0v2" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M10 1.5L3 4.5V9.5C3 13.5 6 16.5 10 18C14 16.5 17 13.5 17 9.5V4.5L10 1.5Z" stroke="#0EA5E9" strokeWidth="1.4" fill="#0EA5E9" fillOpacity="0.06" />
    <path d="M7 10L9 12L13 8" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Types ───
interface FeatureItem {
  text: string;
  included: boolean;
  highlight?: boolean;
  sub?: string;
}

interface StatItem {
  number: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub: string;
  color: string;
}

// ─── Animated Counter ───
const AnimatedNumber: React.FC<{
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}> = ({ target, prefix = "", suffix = "", duration = 1800 }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

// ─── Billing Toggle ───
const BillingToggle: React.FC<{
  annual: boolean;
  setAnnual: (v: boolean) => void;
}> = ({ annual, setAnnual }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "14px",
      margin: "0 auto 48px",
    }}
  >
    <span
      style={{
        fontSize: "14px",
        fontWeight: annual ? 400 : 600,
        color: annual ? "#64748B" : "#E2E8F0",
        transition: "all 0.3s",
        fontFamily: "inherit",
      }}
    >
      Monthly
    </span>
    <button
      onClick={() => setAnnual(!annual)}
      style={{
        width: "52px",
        height: "28px",
        borderRadius: "14px",
        background: annual
          ? "linear-gradient(135deg, #0EA5E9, #0EA5E9)"
          : "#1E293B",
        border: "1px solid rgba(148,163,184,0.1)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.3s",
        padding: 0,
      }}
    >
      <div
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "11px",
          background: "#fff",
          position: "absolute",
          top: "2px",
          left: annual ? "27px" : "3px",
          transition: "left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
    <span
      style={{
        fontSize: "14px",
        fontWeight: annual ? 600 : 400,
        color: annual ? "#E2E8F0" : "#64748B",
        transition: "all 0.3s",
        fontFamily: "inherit",
      }}
    >
      Annual
      <span
        style={{
          display: "inline-block",
          marginLeft: "8px",
          background: "linear-gradient(135deg, #0EA5E9, #0EA5E9)",
          color: "#fff",
          fontSize: "10px",
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: "4px",
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
        }}
      >
        Save 25%
      </span>
    </span>
  </div>
);

// ─── Feature Row ───
const FeatureRow: React.FC<FeatureItem> = ({
  text,
  included = true,
  highlight = false,
  sub,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      padding: "7px 0",
      opacity: included ? 1 : 0.4,
    }}
  >
    {included ? <CheckIcon /> : <LockIcon />}
    <div>
      <span
        style={{
          fontSize: "13.5px",
          lineHeight: "1.5",
          color: included ? "#CBD5E1" : "#475569",
          fontWeight: highlight ? 600 : 400,
          fontFamily: "inherit",
        }}
      >
        {text}
      </span>
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: "#475569",
            marginTop: "2px",
            lineHeight: "1.4",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  </div>
);

// ─── Pricing Card ───
const PricingCard: React.FC<{
  tier: string;
  price: number;
  annualPrice: number;
  annual: boolean;
  features: FeatureItem[];
  cta: string;
  popular?: boolean;
  note?: string;
  ctaVariant: "primary" | "secondary";
  /** Use Link when set (reliable navigation); otherwise onCtaClick is used. */
  ctaHref?: string;
  onCtaClick?: () => void;
}> = ({
  tier,
  price,
  annualPrice,
  annual,
  features,
  cta,
  popular = false,
  note,
  ctaVariant,
  ctaHref,
  onCtaClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const displayPrice = annual ? annualPrice : price;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: popular
          ? "linear-gradient(168deg, rgba(14,165,233,0.06) 0%, rgba(11,17,32,0.95) 40%, #0B1120 100%)"
          : "#0D1424",
        border: popular
          ? "1px solid rgba(14,165,233,0.25)"
          : "1px solid rgba(148,163,184,0.08)",
        borderRadius: "12px",
        padding: popular ? "40px 32px 32px" : "32px",
        width: "100%",
        maxWidth: "420px",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: popular
          ? hovered
            ? "0 20px 60px rgba(14,165,233,0.1), 0 0 0 1px rgba(14,165,233,0.2)"
            : "0 8px 32px rgba(14,165,233,0.06)"
          : hovered
            ? "0 12px 40px rgba(0,0,0,0.3)"
            : "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      {popular && (
        <div
          style={{
            position: "absolute",
            top: "-1px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #0EA5E9, #0EA5E9)",
            color: "#fff",
            fontSize: "10px",
            fontWeight: 700,
            padding: "4px 18px",
            borderRadius: "0 0 8px 8px",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          Most Popular
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: popular ? "#0EA5E9" : "#64748B",
            marginBottom: "10px",
            fontFamily: "inherit",
          }}
        >
          {tier}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#F1F5F9",
              fontFamily: "inherit",
              lineHeight: 1,
            }}
          >
            {displayPrice === 0 ? "Free" : `$${displayPrice}`}
          </span>
          {displayPrice > 0 && (
            <span
              style={{
                fontSize: "15px",
                color: "#64748B",
                fontWeight: 500,
              }}
            >
              /mo
            </span>
          )}
        </div>

        {annual && price > 0 && (
          <div style={{ fontSize: "13px", color: "#64748B", marginTop: "6px" }}>
            <span
              style={{
                textDecoration: "line-through",
                color: "#475569",
              }}
            >
              ${price}/mo
            </span>
            <span
              style={{
                color: "#0EA5E9",
                marginLeft: "8px",
                fontWeight: 600,
              }}
            >
              Save ${(price - annualPrice) * 12}/yr
            </span>
          </div>
        )}

        {note && (
          <div
            style={{
              fontSize: "13px",
              color: "#94A3B8",
              marginTop: "8px",
              lineHeight: "1.5",
            }}
          >
            {note}
          </div>
        )}
      </div>

      <div
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(148,163,184,0.1), transparent)",
          margin: "0 -4px 20px",
        }}
      />

      <div style={{ marginBottom: "24px" }}>
        {features.map((f, i) => (
          <FeatureRow key={i} {...f} />
        ))}
      </div>

      {ctaHref ? (
        <Link
          href={ctaHref}
          style={{
            width: "100%",
            padding: "13px 24px",
            border:
              ctaVariant === "primary"
                ? "none"
                : "1px solid rgba(148,163,184,0.12)",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.3s",
            fontFamily: "inherit",
            background:
              ctaVariant === "primary"
                ? "linear-gradient(135deg, #0EA5E9, #0284C7)"
                : "rgba(148,163,184,0.06)",
            color: ctaVariant === "primary" ? "#fff" : "#CBD5E1",
            textDecoration: "none",
          }}
        >
          {cta} <ArrowIcon />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onCtaClick}
          style={{
            width: "100%",
            padding: "13px 24px",
            border:
              ctaVariant === "primary"
                ? "none"
                : "1px solid rgba(148,163,184,0.12)",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.3s",
            fontFamily: "inherit",
            background:
              ctaVariant === "primary"
                ? "linear-gradient(135deg, #0EA5E9, #0284C7)"
                : "rgba(148,163,184,0.06)",
            color: ctaVariant === "primary" ? "#fff" : "#CBD5E1",
          }}
        >
          {cta} <ArrowIcon />
        </button>
      )}
    </div>
  );
};

// ─── FAQ Item ───
const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(148,163,184,0.06)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#E2E8F0",
            lineHeight: "1.5",
            paddingRight: "20px",
          }}
        >
          {q}
        </span>
        <span
          style={{
            fontSize: "18px",
            color: "#475569",
            transition: "transform 0.3s",
            transform: open ? "rotate(45deg)" : "rotate(0)",
            flexShrink: 0,
          }}
        >
          +
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? "300px" : "0",
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            fontSize: "13.5px",
            color: "#94A3B8",
            lineHeight: "1.7",
            paddingBottom: "18px",
          }}
        >
          {a}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function PricingContent() {
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const [annual, setAnnual] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const freeFeatures: FeatureItem[] = [
    { text: "5 property analyses per month", included: true },
    { text: "Deal Gap + Income Value + Target Buy", included: true },
    { text: "IQ Verdict score (Pass / Marginal / Buy)", included: true },
    { text: "All 6 strategy snapshots", included: true },
    { text: "Seller Motivation indicator", included: true },
    {
      text: "Full calculation breakdown",
      included: false,
      sub: "See every assumption behind the numbers",
    },
    {
      text: "Editable inputs & stress testing",
      included: false,
      sub: "Change rent, vacancy, rates — recalculate instantly",
    },
    {
      text: "Comparable rental data sources",
      included: false,
      sub: "See the 12+ comps that set your rent estimate",
    },
    { text: "Downloadable Excel proforma", included: false },
    { text: "DealVaultIQ pipeline & tracking", included: false },
    { text: "Lender-ready PDF reports", included: false },
    { text: "Side-by-side deal comparison", included: false },
  ];

  const proFeatures: FeatureItem[] = [
    { text: "Unlimited property analyses", included: true, highlight: true },
    { text: "Deal Gap + Income Value + Target Buy", included: true },
    { text: "IQ Verdict score (Pass / Marginal / Buy)", included: true },
    { text: "All 6 strategy models — full detail", included: true },
    { text: "Seller Motivation indicator", included: true },
    {
      text: "Full calculation breakdown",
      included: true,
      highlight: true,
      sub: "See every assumption: rent, vacancy, capex, taxes, insurance",
    },
    {
      text: "Editable inputs & stress testing",
      included: true,
      highlight: true,
      sub: "Change any variable — Deal Gap recalculates in real time",
    },
    {
      text: "Comparable rental data sources",
      included: true,
      highlight: true,
      sub: "See the comps that drive the rent estimate",
    },
    {
      text: "Downloadable Excel proforma",
      included: true,
      highlight: true,
      sub: "Instant financial proforma — modify assumptions, share with lenders",
    },
    { text: "DealVaultIQ pipeline & tracking", included: true },
    { text: "Lender-ready PDF reports", included: true },
    { text: "Side-by-side deal comparison", included: true },
  ];

  const stats: StatItem[] = [
    {
      number: 27000,
      prefix: "$",
      label: "Avg. cost of a bad investment deal",
      sub: "Overpaying, underestimating rehab, or missing vacancy risk",
      color: "#EF4444",
    },
    {
      number: 60,
      suffix: "s",
      label: "Time to analyze any property",
      sub: "Income Value, Target Buy, Deal Gap — before you drive to the property",
      color: "#0EA5E9",
    },
    {
      number: annual ? 348 : 468,
      prefix: "$",
      suffix: "/yr",
      label: "Cost of Pro",
      sub: "Less than 1.5% of the average bad deal it helps you avoid",
      color: "#0EA5E9",
    },
  ];

  const methodologyCards = [
    {
      label: "RentCast Estimate",
      value: "$1,850/mo",
      detail: "Based on 14 comps within 0.5mi",
      color: "#0EA5E9",
    },
    {
      label: "Vacancy Rate",
      value: "5.2%",
      detail: "Tampa metro — 12mo rolling avg",
      color: "#0EA5E9",
    },
    {
      label: "Financing",
      value: "25% down · 7.1%",
      detail: "30yr fixed, investor conventional",
      color: "#8B5CF6",
    },
    {
      label: "Annual Expenses",
      value: "$8,640",
      detail: "Tax + Insurance + Maint (8% rent)",
      color: "#F59E0B",
    },
  ];

  const founderStats = [
    { stat: "35+", label: "Years in RE Data", detail: "Since the late 1980s" },
    {
      stat: "30+",
      label: "Year GSE Partnership",
      detail: "Fannie Mae & Freddie Mac",
    },
    {
      stat: "80+",
      label: "Companies Founded",
      detail: "RE, fintech & technology",
    },
    {
      stat: "500+",
      label: "RE Projects Built",
      detail: "Residential & commercial",
    },
  ];

  const founderCredentials = [
    "Founded Foreclosure.com — first national distressed asset platform",
    "Built HomePath.com (Fannie Mae) & HomeSteps.com (Freddie Mac)",
    "Ran first-ever HUD property disposition outsourcing pilot (1991)",
    "Licensed real estate broker · Managed nationwide broker networks for GSEs",
  ];

  const faqs = [
    {
      q: "What happens after my 7-day trial?",
      a: "Your trial converts to a paid Pro subscription. You'll be notified 2 days before the trial ends. If you cancel during the trial, you won't be charged — and your account reverts to the free Starter plan with 5 analyses/month. No penalties, no hassle.",
    },
    {
      q: "Where does DealGapIQ get its data?",
      a: "We pull from MLS-sourced listing data, public tax records, comparable rental databases, and local market averages for vacancy, insurance, and expense ratios. Pro users can see every data source behind every number — and override any assumption they disagree with.",
    },
    {
      q: "How is this different from Zillow or PropStream?",
      a: "Zillow tells you what a property is worth. PropStream helps you search properties. DealGapIQ tells you the exact price YOU should pay — based on your target return, across six investment strategies. We calculate the Deal Gap: the distance between the asking price and the price that actually makes the deal work. No other platform does this.",
    },
    {
      q: "Is this a replacement for my own spreadsheets?",
      a: "It's better — DealGapIQ generates a complete, downloadable financial proforma in Excel for every property you analyze. Rent estimates, expense projections, cash flow, ROI — all pre-populated in 60 seconds. Open it, modify any assumption you want, and you've got a lender-ready underwriting package without spending hours collecting data and building formulas from scratch. Most investors tell us it saves them 2–3 hours per deal.",
    },
    {
      q: "I only own one property. Is this for me?",
      a: "Especially. 71% of real estate investors own exactly one property. If you're evaluating your second acquisition — or wondering whether your current property is actually performing — DealGapIQ gives you the analysis institutional investors use, without the institutional cost.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts, no cancellation fees, no exit interviews. Cancel from your account settings in two clicks. Your saved analyses in DealVaultIQ remain accessible on the free plan.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1120",
        color: "#E2E8F0",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Subtle noise/grid overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(148,163,184,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ─── NAV ─── */}
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 40px",
            maxWidth: "1200px",
            margin: "0 auto",
            borderBottom: "1px solid rgba(148,163,184,0.06)",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "17px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#F1F5F9",
              textDecoration: "none",
            }}
          >
            DealGap
            <span style={{ color: "#0EA5E9" }}>IQ</span>
          </Link>
          <div
            style={{ display: "flex", gap: "28px", alignItems: "center" }}
          >
            <Link
              href="/"
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Product
            </Link>
            <Link
              href="/pricing"
              style={{
                fontSize: "13px",
                color: "#0EA5E9",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Pricing
            </Link>
            <Link
              href="/register"
              style={{
                fontSize: "12px",
                color: "#0B1120",
                textDecoration: "none",
                background: "linear-gradient(135deg, #0EA5E9, #0EA5E9)",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 700,
                letterSpacing: "0.01em",
              }}
            >
              Login / Register
            </Link>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section
          style={{
            textAlign: "center",
            padding: "72px 24px 16px",
            maxWidth: "700px",
            margin: "0 auto",
          }}
        >
          {/* Cost anchor badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: "6px",
              padding: "6px 14px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#F87171",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
            >
              The average bad investment decision costs $27,000
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4.5vw, 44px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.035em",
              color: "#F1F5F9",
              margin: "0 0 18px",
            }}
          >
            Know Your Number
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #0EA5E9, #0EA5E9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Before You Make the Offer
            </span>
          </h1>

          <p
            style={{
              fontSize: "15px",
              color: "#94A3B8",
              lineHeight: 1.7,
              maxWidth: "540px",
              margin: "0 auto",
            }}
          >
            DealGapIQ helps you pinpoint the right price that makes a deal
            work — your Income Value, your Target Buy, and your Deal Gap
            across six strategies, in 60 seconds. Never overpay. Never buy
            into negative cash flow. Choose the plan that fits how you invest.
          </p>
        </section>

        {/* ─── TOGGLE ─── */}
        <section style={{ padding: "24px 24px 0" }}>
          <BillingToggle annual={annual} setAnnual={setAnnual} />
        </section>

        {/* ─── PRICING CARDS ─── */}
        <section
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "24px",
            padding: "0 24px 72px",
            maxWidth: "900px",
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          <PricingCard
            tier="Starter"
            price={0}
            annualPrice={0}
            annual={annual}
            note="Always free. No credit card required."
            features={freeFeatures}
            cta="Start Free"
            ctaVariant="secondary"
            ctaHref="/register?plan=starter"
          />
          <PricingCard
            tier="Pro Investor"
            price={39}
            annualPrice={29}
            annual={annual}
            popular={true}
            note="For investors who verify the math before they make the offer."
            features={proFeatures}
            cta="Start 7-Day Free Trial"
            ctaVariant="primary"
            ctaHref={!isAuthenticated ? `/register?plan=pro&billing=${annual ? "annual" : "monthly"}` : undefined}
            onCtaClick={isAuthenticated ? () => setUpgradeModalOpen(true) : undefined}
          />
        </section>

        {/* ─── WHY PRO SECTION ─── */}
        <section
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            padding: "0 24px 72px",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(168deg, rgba(14,165,233,0.04) 0%, #0D1424 50%, #0B1120 100%)",
              border: "1px solid rgba(14,165,233,0.12)",
              borderRadius: "12px",
              padding: "40px 36px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "#0EA5E9",
                marginBottom: "10px",
              }}
            >
              Why Pro Matters
            </div>

            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
                color: "#F1F5F9",
                margin: "0 0 14px",
              }}
            >
              Free shows you the number.
              <br />
              Pro shows you why it&apos;s right.
            </h2>

            <p
              style={{
                fontSize: "14px",
                color: "#94A3B8",
                lineHeight: 1.7,
                marginBottom: "32px",
                maxWidth: "580px",
              }}
            >
              Every DealGapIQ calculation is built on real data: comparable
              rents, local vacancy rates, current tax assessments, and
              market-specific assumptions. Pro lets you see every input,
              challenge every assumption, and stress-test the deal before you
              write the check.
            </p>

            {/* Methodology cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
              }}
            >
              {methodologyCards.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(11,17,32,0.7)",
                    border: "1px solid rgba(148,163,184,0.06)",
                    borderRadius: "8px",
                    padding: "14px",
                    borderLeft: `3px solid ${item.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748B",
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      marginBottom: "5px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#E2E8F0",
                      marginBottom: "3px",
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#475569",
                      lineHeight: 1.4,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Excel proforma callout */}
            <div
              style={{
                marginTop: "20px",
                padding: "14px 16px",
                background: "rgba(14,165,233,0.04)",
                border: "1px solid rgba(14,165,233,0.1)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                ⚡
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#CBD5E1",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "#0EA5E9" }}>
                  Pro unlocks editable inputs + downloadable Excel proforma.
                </strong>{" "}
                Change the rent estimate, adjust vacancy, swap financing
                terms — the Deal Gap recalculates instantly. Export a
                complete financial proforma in Excel, ready for your lender
                or partners.
              </span>
            </div>
          </div>
        </section>

        {/* ─── COST ANCHOR STATS ─── */}
        <section
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            padding: "0 24px 72px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#F1F5F9",
              margin: "0 0 36px",
            }}
          >
            The math speaks for itself.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                style={{
                  background: "#0D1424",
                  border: "1px solid rgba(148,163,184,0.06)",
                  borderRadius: "10px",
                  padding: "24px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: stat.color,
                    marginBottom: "6px",
                    lineHeight: 1,
                  }}
                >
                  <AnimatedNumber
                    target={stat.number}
                    prefix={stat.prefix || ""}
                    suffix={stat.suffix || ""}
                  />
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#CBD5E1",
                    marginBottom: "4px",
                    lineHeight: 1.4,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── TRUST SIGNALS ─── */}
        <section
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "0 24px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            {[
              "Cancel anytime. No lock-in contracts.",
              "7-day free trial on Pro. Full access.",
              "Your data stays yours. We never share or sell.",
            ].map((text, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(14,165,233,0.03)",
                  border: "1px solid rgba(14,165,233,0.08)",
                  borderRadius: "8px",
                  padding: "10px 16px",
                }}
              >
                <ShieldIcon />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    fontWeight: 500,
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FOUNDER ─── */}
        <section
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            padding: "0 24px 72px",
          }}
        >
          <div
            style={{
              background: "#0D1424",
              border: "1px solid rgba(148,163,184,0.06)",
              borderRadius: "12px",
              padding: "36px",
            }}
          >
            {/* Name + title */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #1E293B, #0F172A)",
                  border: "2px solid rgba(14,165,233,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#0EA5E9",
                  flexShrink: 0,
                }}
              >
                BG
              </div>
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#F1F5F9",
                  }}
                >
                  Brad Geisen
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#0EA5E9",
                    fontWeight: 500,
                    marginTop: "2px",
                  }}
                >
                  Founder, DealGapIQ · 35+ years in real estate data &
                  technology
                </div>
              </div>
            </div>

            {/* Quote */}
            <p
              style={{
                fontSize: "14px",
                color: "#CBD5E1",
                lineHeight: 1.75,
                margin: "0 0 24px",
                fontStyle: "italic",
                borderLeft: "3px solid rgba(14,165,233,0.25)",
                paddingLeft: "18px",
              }}
            >
              &ldquo;In 2000, Fannie Mae discovered that my proprietary data system
              knew more about their own property portfolio than their internal
              infrastructure. They commissioned me to build HomePath.com.
              Freddie Mac followed with HomeSteps.com. I&apos;ve been a trusted
              technology provider to both GSEs for over 30 years. DealGapIQ
              puts that same institutional-grade intelligence in your hands.&rdquo;
            </p>

            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {founderStats.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(11,17,32,0.6)",
                    border: "1px solid rgba(148,163,184,0.04)",
                    borderRadius: "8px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "#0EA5E9",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {item.stat}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#CBD5E1",
                      marginTop: "2px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#475569",
                      marginTop: "2px",
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Credential pills */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {founderCredentials.map((cred, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(14,165,233,0.04)",
                    border: "1px solid rgba(14,165,233,0.08)",
                    borderRadius: "6px",
                    padding: "7px 12px",
                    fontSize: "11px",
                    color: "#94A3B8",
                    lineHeight: 1.4,
                  }}
                >
                  <CheckIcon />
                  {cred}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            padding: "0 24px 72px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#F1F5F9",
              margin: "0 0 28px",
              textAlign: "center",
            }}
          >
            Common questions
          </h2>

          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </section>

        {/* ─── FINAL CTA ─── */}
        <section
          style={{
            textAlign: "center",
            padding: "48px 24px 88px",
            maxWidth: "560px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#F1F5F9",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}
          >
            Stop guessing.
            <br />
            Start calculating.
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "#94A3B8",
              lineHeight: 1.7,
              marginBottom: "28px",
            }}
          >
            Every property has a Deal Gap. Only DealGapIQ measures it.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(true)}
                style={{
                  padding: "13px 28px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "inherit",
                }}
              >
                Start 7-Day Free Trial <ArrowIcon />
              </button>
            ) : (
              <Link
                href={`/register?plan=pro&billing=${annual ? "annual" : "monthly"}`}
                style={{
                padding: "13px 28px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
                Start 7-Day Free Trial <ArrowIcon />
              </Link>
            )}
            <Link
              href="/register?plan=starter"
              style={{
                padding: "13px 28px",
                borderRadius: "8px",
                border: "1px solid rgba(148,163,184,0.1)",
                background: "transparent",
                color: "#CBD5E1",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              Start Free
            </Link>
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#475569",
              marginTop: "14px",
            }}
          >
            No credit card required for Starter · 7-day trial for Pro
          </div>
        </section>

        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          returnTo="/pricing"
        />

        {/* ─── FOOTER ─── */}
        <footer
          style={{
            borderTop: "1px solid rgba(148,163,184,0.06)",
            padding: "28px 40px",
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#475569" }}>
            © 2026 DealGapIQ. Professional use only. Not a lender.
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link
              href="/privacy"
              style={{
                fontSize: "12px",
                color: "#475569",
                textDecoration: "none",
              }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              style={{
                fontSize: "12px",
                color: "#475569",
                textDecoration: "none",
              }}
            >
              Terms
            </Link>
            <Link
              href="/help"
              style={{
                fontSize: "12px",
                color: "#475569",
                textDecoration: "none",
              }}
            >
              Support
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
