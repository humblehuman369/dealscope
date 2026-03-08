"use client"

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const CheckIcon: React.FC<{ color?: string }> = ({ color = "#0EA5E9" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DashIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M8 12h8" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="#555" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" stroke="#555" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface Feature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid #151515", padding: "16px 0", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, margin: 0, color: open ? "#fff" : "#aaa" }}>
          {question}
        </p>
        <span
          style={{
            color: "#444",
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
        <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6, margin: "10px 0 0 0" }}>
          {answer}
        </p>
      )}
    </div>
  );
}

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
  }
`;

export default function PricingContent() {
  const { isAuthenticated } = useSession();
  const [isAnnual, setIsAnnual] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const starterFeatures: Feature[] = [
    { name: "Up to 5 property analyses per month.", free: true, pro: true },
    { name: "Full Verdict, Income Value, and Target Buy on each property.", free: true, pro: true },
    { name: "Plain-language explanations of every key metric.", free: true, pro: true },
    { name: "All 6 strategy models", free: true, pro: true },
    { name: "Seller Motivation indicator", free: true, pro: true },
    { name: "Full calculation breakdown", free: false, pro: true },
    { name: "Editable inputs & stress testing", free: false, pro: true },
    { name: "Comparable rental data sources", free: false, pro: true },
    { name: "Downloadable Excel proforma", free: false, pro: true },
    { name: "DealVaultIQ pipeline & tracking", free: false, pro: true },
    { name: "Access nearby ZIP comparisons", free: false, pro: true },
    { name: "Side-by-side deal comparison", free: false, pro: true },
  ];

  const proFeatures: string[] = [
    "Unlimited property analyses plus full PDF and Excel underwriting reports.",
    "Editable assumptions and stress testing for rent, rates, and expenses.",
    "DealVaultIQ pipeline & tracking so you can monitor offers from first look to closed deal.",
    "Full calculation breakdown",
    "Comparable rental data sources",
    "Access nearby ZIP comparisons",
    "Side-by-side deal comparison",
    "Seller Motivation indicator",
    "All 6 strategy models",
  ];

  const faqs = [
    { q: "What happens after my 7-day trial?", a: "You'll be billed at your chosen plan rate. Cancel anytime before the trial ends and you won't be charged." },
    { q: "Where does DealGapIQ get its data?", a: "We cross-reference 4 data sources including MLS comps, rental databases, tax records, and market indices." },
    { q: "How is this different from Zillow or PropStream?", a: "We don't just show data — we calculate a specific buy price and verdict across 6 investment strategies." },
    { q: "Is this a replacement for my own spreadsheets?", a: "Pro includes a downloadable Excel proforma with all the numbers. Use ours or plug the data into yours." },
    { q: "I only own one property. Is this for me?", a: "If you're evaluating your next purchase, yes. One bad deal costs more than years of Pro." },
    { q: "Can I cancel anytime?", a: "Yes, instantly. No calls, no retention tricks, no hassle." },
  ];

  const proCtaHref = !isAuthenticated
    ? `/register?plan=pro&billing=${isAnnual ? "annual" : "monthly"}`
    : undefined;

  const handleProClick = isAuthenticated
    ? () => setUpgradeModalOpen(true)
    : undefined;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000000",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#ffffff",
        padding: "0 20px",
      }}
    >
      <style>{RESPONSIVE_STYLE}</style>

      {/* ─── HEADER ─── */}
      <div style={{ textAlign: "center", maxWidth: "600px", margin: "48px auto 0" }}>
        <p style={{ fontSize: "13px", color: "#0EA5E9", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 16px 0" }}>
          Pricing
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
          Know Your Number{" "}
          <br />
          <span style={{ color: "#0EA5E9" }}>Before You Make the Offer</span>
        </h1>
        <p style={{ fontSize: "15px", color: "#ffffff", lineHeight: 1.6, margin: "0 0 32px 0" }}>
          DealGapIQ pinpoints the right price that makes a deal work — your Income Value, Target Buy, and Deal Gap across 6 strategies. In 60 seconds.
        </p>

        {/* ─── TOGGLE ─── */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0",
            background: "#111",
            borderRadius: "40px",
            padding: "4px",
            border: "1px solid #1a1a1a",
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
              background: !isAnnual ? "#0EA5E9" : "transparent",
              color: !isAnnual ? "#000" : "#888",
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
              background: isAnnual ? "#0EA5E9" : "transparent",
              color: isAnnual ? "#000" : "#888",
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
                background: isAnnual ? "rgba(0,0,0,0.2)" : "rgba(14,165,233,0.15)",
                color: isAnnual ? "#000" : "#0EA5E9",
                padding: "2px 6px",
                borderRadius: "6px",
              }}
            >
              SAVE 26%
            </span>
          </button>
        </div>
      </div>

      {/* ─── TRUST & FIT BLOCK ─── */}
      <div style={{ maxWidth: "960px", margin: "28px auto 0" }}>
        <p style={{ fontSize: "14px", color: "#ffffff", textAlign: "center", margin: "0 0 18px 0", lineHeight: 1.6 }}>
          For aspiring investors and small portfolio owners analyzing 1-20 properties a month.
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
            "Every analysis is built on real comparables, rent data, taxes, and your loan terms - you can see and edit every assumption.",
            "Verdict Scores are benchmarked against real U.S. investor discount data by % below list price.",
            "Each deal comes with a detailed PDF and Excel pro forma so there's nothing hidden when you show the numbers to someone you trust.",
          ].map((text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(14, 165, 233, 0.2)",
                background: "rgba(14, 165, 233, 0.04)",
              }}
            >
              <CheckIcon color="#0EA5E9" />
              <span style={{ fontSize: "12px", color: "#b9b9b9", lineHeight: 1.55 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PRICING CARDS ─── */}
      <div
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
        {/* FREE CARD */}
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: "16px",
            padding: "36px 32px",
            position: "relative",
          }}
        >
          <p style={{ fontSize: "12px", color: "#555", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", margin: "0 0 8px 0" }}>
            Starter
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "0 0 6px 0" }}>
            <span style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-2px" }}>Free</span>
          </div>
          <p style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.6, margin: "0 0 10px 0" }}>
            Best for learning the numbers and screening your first few deals.
          </p>
          <p style={{ fontSize: "13px", color: "#555", margin: "0 0 28px 0" }}>
            Always free. No credit card required.
          </p>

          <Link
            href="/register?plan=starter"
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #333",
              background: "transparent",
              color: "#ccc",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              marginBottom: "28px",
              boxSizing: "border-box",
            }}
          >
            Start Free &rarr;
          </Link>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {starterFeatures.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                {f.free === true ? (
                  <CheckIcon color="#444" />
                ) : f.free === false ? (
                  <DashIcon />
                ) : (
                  <CheckIcon color="#444" />
                )}
                <span style={{ color: f.free === false ? "#333" : "#777" }}>
                  {typeof f.free === "string" ? `${f.free} — ${f.name.toLowerCase()}` : f.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PRO CARD */}
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(14, 165, 233, 0.3)",
            borderRadius: "16px",
            padding: "36px 32px",
            position: "relative",
            boxShadow: "0 0 40px rgba(14, 165, 233, 0.08), 0 0 80px rgba(14, 165, 233, 0.04)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#0EA5E9",
              color: "#000",
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

          <p style={{ fontSize: "12px", color: "#0EA5E9", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", margin: "0 0 8px 0" }}>
            Pro Investor
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "0 0 2px 0" }}>
            <span style={{ fontSize: "18px", fontWeight: 600, color: "#555" }}>$</span>
            <span style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-2px" }}>
              {isAnnual ? "29" : "39"}
            </span>
            <span style={{ fontSize: "15px", color: "#555", fontWeight: 500 }}>/mo</span>
          </div>
          <p style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.6, margin: "0 0 10px 0" }}>
            Best for active small portfolio investors analyzing multiple deals every month.
          </p>
          {isAnnual ? (
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 28px 0" }}>
              $348 billed annually &middot; <span style={{ color: "#0EA5E9" }}>Save $120/yr</span>
            </p>
          ) : (
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 28px 0" }}>
              Billed monthly &middot; <span style={{ color: "#666" }}>Switch to annual &amp; save 26%</span>
            </p>
          )}

          {proCtaHref ? (
            <Link
              href={proCtaHref}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
                color: "#000",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
                marginBottom: "28px",
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
                background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
                color: "#000",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
                marginBottom: "28px",
              }}
            >
              Start 7-Day Free Trial &rarr;
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {proFeatures.map((feature, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                <CheckIcon color="#0EA5E9" />
                <span style={{ color: "#ccc" }}>{feature}</span>
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
                color: "#555",
              }}
            >
              <CheckIcon color="#333" />
              {text}
            </div>
          )
        )}
      </div>

      {/* ─── WHY PRO SECTION ─── */}
      <div
        style={{
          maxWidth: "880px",
          margin: "80px auto 0",
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: "16px",
          padding: "48px 40px",
        }}
      >
        <p style={{ fontSize: "11px", color: "#0EA5E9", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 10px 0" }}>
          Why Pro Matters
        </p>
        <h2 style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.2 }}>
          Free shows you the number.
          <br />
          Pro shows you why it&apos;s right.
        </h2>
        <p style={{ fontSize: "14px", color: "#ffffff", lineHeight: 1.6, margin: "0 0 32px 0", maxWidth: "560px" }}>
          Every DealGapIQ calculation is built on real data: comparables, rents, local vacancy rates, taxes, and market-specific assumptions. Pro lets you see every input, challenge every assumption, and stress test the deal before you write the offer.
        </p>

        <div
          className="proforma-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
          }}
        >
          {[
            { label: "Monthly Rent", value: "$1,850/mo", sub: "Based on 4 comparable rentals" },
            { label: "Cap Rate", value: "5.2%", sub: "Market adjusted" },
            { label: "Down Payment", value: "25% down", sub: "Editable in Pro" },
            { label: "Cash Flow", value: "$8,440", sub: "Annual net income" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: "#111",
                borderRadius: "10px",
                padding: "16px",
                border: "1px solid #1a1a1a",
              }}
            >
              <p style={{ fontSize: "11px", color: "#ffffff", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {item.label}
              </p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" }}>
                {item.value}
              </p>
              <p style={{ fontSize: "11px", color: "#ffffff", margin: 0 }}>{item.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "20px" }}>
          <LockIcon />
          <span style={{ fontSize: "12px", color: "#ffffff" }}>
            Pro unlocks editable inputs + downloadable Excel proforma
          </span>
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
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#111",
            border: "1px solid #222",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "18px",
            fontWeight: 700,
            color: "#0EA5E9",
          }}
        >
          BG
        </div>
        <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px 0" }}>Brad Geisen</p>
        <p style={{ fontSize: "12px", color: "#ffffff", margin: "0 0 20px 0" }}>
          Founder, DealGapIQ &middot; 35+ years in real estate data &amp; technology
        </p>
        <p
          style={{
            fontSize: "14px",
            color: "#ffffff",
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
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          {[
            { value: "35+", label: "Years in RE Data" },
            { value: "30+", label: "Year GSE Partnership" },
            { value: "80+", label: "Companies Founded" },
            { value: "500+", label: "RE Projects Built" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "#0EA5E9", margin: "0 0 2px 0" }}>
                {stat.value}
              </p>
              <p style={{ fontSize: "10px", color: "#ffffff", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

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
          <span style={{ color: "#0EA5E9" }}>Start calculating.</span>
        </h2>
        <p style={{ fontSize: "14px", color: "#555", margin: "0 0 24px 0" }}>
          Every property has a Deal Gap. Only DealGapIQ measures it.
        </p>
        <div className="pricing-bottom-options" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="pricing-bottom-option" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>
              Already analyzing multiple deals each month?
            </p>
            {proCtaHref ? (
              <Link
                href={proCtaHref}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
                  color: "#000",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
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
                  background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
                  color: "#000",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
                }}
              >
                Start 7-Day Free Trial &rarr;
              </button>
            )}
          </div>

          <div className="pricing-bottom-option" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>
              Just starting or learning the numbers?
            </p>
            <Link
              href="/register?plan=starter"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "transparent",
                color: "#ccc",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Start Free
            </Link>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "#444", margin: "14px 0 0 0" }}>
          No credit card required for Starter. 7-day free trial on Pro.
        </p>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        returnTo="/pricing"
      />

      {/* ─── FOOTER ─── */}
      <div
        style={{
          borderTop: "1px solid #111",
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
        <div style={{ fontSize: "11px", color: "#333" }}>
          &copy; 2026 DealGapIQ. Professional use only. Not financial advice.
        </div>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: "#333", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: "#333", textDecoration: "none" }}>Terms</Link>
          <Link href="/help" style={{ fontSize: "11px", color: "#333", textDecoration: "none" }}>Support</Link>
        </div>
      </div>
    </div>
  );
}
