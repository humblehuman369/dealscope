'use client';

import React, { useState, useEffect, useRef } from 'react';

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

function PhaseBadge({ label, color, delay, visible }: {
  label: string; color: string; delay: number; visible: boolean;
}) {
  return (
    <span style={{
      display: "inline-block",
      padding: "6px 16px",
      borderRadius: "100px",
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      color,
      border: `1.5px solid ${color}`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${delay}s`,
    }}>
      {label}
    </span>
  );
}

const icons = {
  bolt: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>),
  search: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/><path d="M11 8v6"/></svg>),
  dollar: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>),
  home: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>),
  target: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  chart: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>),
  download: (color: string) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  barChart: (color: string) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>),
};

function FeaturePill({ icon, text, delay, visible }: {
  icon: React.ReactNode; text: string; delay: number; visible: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 16px",
      background: "rgba(14,165,233,0.06)",
      border: "1px solid rgba(14,165,233,0.15)",
      borderRadius: "10px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-20px)",
      transition: `all 0.5s cubic-bezier(.22,1,.36,1) ${delay}s`,
    }}>
      <span style={{ lineHeight: 0, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "14px", color: "#CBD5E1", fontWeight: 500, letterSpacing: "0.01em" }}>{text}</span>
    </div>
  );
}

function FunnelConnector({ visible }: { visible: boolean }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 8px",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.8s ease 0.6s",
    }}>
      <svg width="60" height="200" viewBox="0 0 60 200" fill="none">
        <path d="M5 10 L55 10 L38 95 L38 190 L22 190 L22 95 Z"
          fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.3)" strokeWidth="1.5" />
        {[0, 1, 2, 3].map(i => (
          <circle key={i} cx="30" cy="0" r="3" fill="#0EA5E9" opacity="0.8">
            <animate attributeName="cy" values={`${20 + i * 8};180`} dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.2" dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="3;2" dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <text x="30" y="6" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="600" letterSpacing="1">ALL DEALS</text>
        <text x="30" y="198" textAnchor="middle" fill="#34D399" fontSize="9" fontWeight="700" letterSpacing="1">WORTH IT</text>
      </svg>
    </div>
  );
}

function VerdictMockup({ visible }: { visible: boolean }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface-base) 100%)",
      border: "1px solid rgba(14,165,233,0.2)",
      borderRadius: "16px",
      padding: "24px",
      maxWidth: "340px",
      width: "100%",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.96)",
      transition: "all 0.7s cubic-bezier(.22,1,.36,1) 0.4s",
      boxShadow: "0 0 40px rgba(14,165,233,0.08), 0 20px 60px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>Verdict Result</span>
        <span style={{ fontSize: "11px", color: "#0EA5E9", fontWeight: 600 }}>2.4 seconds</span>
      </div>
      <div style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <div style={{ fontSize: "42px", fontWeight: 800, color: "#0EA5E9", lineHeight: 1, fontFamily: "'Inter', system-ui, sans-serif" }}>+12.4%</div>
        <div style={{
          display: "inline-block",
          marginTop: "8px",
          padding: "4px 14px",
          borderRadius: "100px",
          background: "rgba(14,165,233,0.12)",
          border: "1px solid rgba(14,165,233,0.3)",
          color: "#0EA5E9",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.5px",
        }}>Deal Gap — Worth Pursuing</div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
        {[
          { label: "Target\nBuy", value: "$668,999", color: "#0EA5E9", sub: "Positive Cashflow" },
          { label: "Income Value", value: "$704,209", color: "#FBBF24", sub: "Breakeven" },
          { label: "Market Price", value: "$807,600", color: "#EF4444", sub: "Market Value or List Price" },
        ].map((item, i) => (
          <div key={i} style={{
            flex: 1,
            padding: "10px 8px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${item.color}33`,
            textAlign: "center",
          }}>
            <div style={{ fontSize: "10px", color: item.color, fontWeight: 600, letterSpacing: "0.5px", marginBottom: "4px", textTransform: "uppercase", whiteSpace: "pre-line" }}>{item.label}</div>
            <div style={{ fontSize: "15px", color: "#F8FAFC", fontWeight: 700 }}>{item.value}</div>
            <div style={{ fontSize: "9px", color: "#64748B", marginTop: "3px", fontWeight: 500 }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategyMockup({ visible }: { visible: boolean }) {
  const tools = [
    { name: "Rent Comps", icon: icons.barChart("#0EA5E9"), desc: "Neighborhood rental analysis" },
    { name: "DealMaker", icon: icons.target("#0EA5E9"), desc: "Negotiate the optimal price" },
    { name: "Appraisal", icon: icons.home("#0EA5E9"), desc: "Professional-grade valuation" },
    { name: "Excel Export", icon: icons.download("#0EA5E9"), desc: "Full proforma download" },
  ];
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface-base) 100%)",
      border: "1px solid rgba(14,165,233,0.2)",
      borderRadius: "16px",
      padding: "24px",
      maxWidth: "340px",
      width: "100%",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.96)",
      transition: "all 0.7s cubic-bezier(.22,1,.36,1) 0.8s",
      boxShadow: "0 0 40px rgba(14,165,233,0.08), 0 20px 60px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>Strategy Engine</span>
        <span style={{ fontSize: "11px", color: "#0EA5E9", fontWeight: 600 }}>Pro Tools</span>
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {["#3B82F6", "#A855F7", "#F59E0B", "#EF4444", "#10B981", "#EC4899"].map((c, i) => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "2px", background: c,
            opacity: visible ? 1 : 0.2,
            transition: `opacity 0.4s ease ${1.0 + i * 0.1}s`,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {tools.map((tool, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(14,165,233,0.1)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(20px)",
            transition: `all 0.5s cubic-bezier(.22,1,.36,1) ${1.0 + i * 0.12}s`,
          }}>
            <span style={{ lineHeight: 0, flexShrink: 0 }}>{tool.icon}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>{tool.name}</div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "1px" }}>{tool.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const [sectionRef, sectionVisible] = useInView(0.1);

  return (
    <section ref={sectionRef} style={{
      background: "var(--surface-base)",
      color: "#F8FAFC",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "100px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle background grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(14,165,233,1) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Top glow */}
      <div style={{
        position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Section header */}
        <div style={{
          textAlign: "center", marginBottom: "72px",
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{
            fontSize: "12px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase",
            color: "#0EA5E9", marginBottom: "20px",
          }}>
            How It Works
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1,
            margin: "0 0 20px",
            background: "linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Two Steps. Zero Wasted Time.
          </h2>
          <p style={{
            fontSize: "18px", color: "#94A3B8", maxWidth: "640px", margin: "0 auto", lineHeight: 1.6,
          }}>
            Most investors waste hours researching properties that never pencil out.
            DealGapIQ gives you the answer in seconds — then arms you with
            everything you need for the deals worth pursuing.
          </p>
        </div>

        {/* Two-phase layout */}
        <div className="hiw-phases" style={{
          display: "flex",
          gap: "0",
          alignItems: "stretch",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>

          {/* PHASE 1: THE VERDICT */}
          <div className="hiw-phase" style={{
            flex: "1 1 420px",
            maxWidth: "480px",
            padding: "48px 40px",
            borderRadius: "20px 0 0 20px",
            background: "linear-gradient(180deg, rgba(14,165,233,0.04) 0%, rgba(0,0,0,0) 100%)",
            borderTop: "1px solid rgba(14,165,233,0.15)",
            borderLeft: "1px solid rgba(14,165,233,0.15)",
            borderBottom: "1px solid rgba(14,165,233,0.15)",
            position: "relative",
            opacity: sectionVisible ? 1 : 0,
            transform: sectionVisible ? "translateX(0)" : "translateX(-40px)",
            transition: "all 0.8s cubic-bezier(.22,1,.36,1) 0.2s",
          }}>
            <div style={{
              position: "absolute", top: "-1px", left: "40px",
              background: "#0EA5E9", color: "#000", fontWeight: 800, fontSize: "12px",
              padding: "6px 20px", borderRadius: "0 0 10px 10px", letterSpacing: "1px",
            }}>STEP 1</div>

            <div style={{ marginTop: "16px" }}>
              <PhaseBadge label="The Verdict" color="#0EA5E9" delay={0.3} visible={sectionVisible} />
            </div>

            <h3 style={{
              fontSize: "28px", fontWeight: 800, margin: "20px 0 12px", color: "#FFFFFF", lineHeight: 1.2,
            }}>
              The Smell Test
            </h3>
            <p style={{
              fontSize: "16px", color: "#94A3B8", lineHeight: 1.65, margin: "0 0 28px",
            }}>
              Paste any address. In seconds, know if a deal is worth your time — before you spend hours on it. If the numbers don&apos;t work, move on. No account needed for your first scan.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
              <FeaturePill icon={icons.bolt("#0EA5E9")} text="Instant DealGap score" delay={0.5} visible={sectionVisible} />
              <FeaturePill icon={icons.search("#0EA5E9")} text="Cross-referenced valuations" delay={0.6} visible={sectionVisible} />
              <FeaturePill icon={icons.dollar("#0EA5E9")} text="Income Value + Target Buy" delay={0.7} visible={sectionVisible} />
            </div>

            <VerdictMockup visible={sectionVisible} />
          </div>

          {/* CENTER CONNECTOR */}
          <div className="hiw-connector" style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "0", width: "60px", flexShrink: 0,
            borderTop: "1px solid rgba(14,165,233,0.15)",
            borderBottom: "1px solid rgba(14,165,233,0.15)",
            background: "rgba(14,165,233,0.02)",
          }}>
            <FunnelConnector visible={sectionVisible} />
          </div>

          {/* PHASE 2: THE STRATEGY */}
          <div className="hiw-phase" style={{
            flex: "1 1 420px",
            maxWidth: "480px",
            padding: "48px 40px",
            borderRadius: "0 20px 20px 0",
            background: "linear-gradient(180deg, rgba(52,211,153,0.04) 0%, rgba(0,0,0,0) 100%)",
            borderTop: "1px solid rgba(52,211,153,0.15)",
            borderRight: "1px solid rgba(52,211,153,0.15)",
            borderBottom: "1px solid rgba(52,211,153,0.15)",
            position: "relative",
            opacity: sectionVisible ? 1 : 0,
            transform: sectionVisible ? "translateX(0)" : "translateX(40px)",
            transition: "all 0.8s cubic-bezier(.22,1,.36,1) 0.4s",
          }}>
            <div style={{
              position: "absolute", top: "-1px", left: "40px",
              background: "#34D399", color: "#000", fontWeight: 800, fontSize: "12px",
              padding: "6px 20px", borderRadius: "0 0 10px 10px", letterSpacing: "1px",
            }}>STEP 2</div>

            <div style={{ marginTop: "16px" }}>
              <PhaseBadge label="The Strategy" color="#34D399" delay={0.5} visible={sectionVisible} />
            </div>

            <h3 style={{
              fontSize: "28px", fontWeight: 800, margin: "20px 0 12px", color: "#FFFFFF", lineHeight: 1.2,
            }}>
              The Deep Dive
            </h3>
            <p style={{
              fontSize: "16px", color: "#94A3B8", lineHeight: 1.65, margin: "0 0 28px",
            }}>
              For deals worth pursuing, DealGapIQ gives you professional-grade tools to optimize revenue, negotiate the right price, and make the deal a reality. Everything you need — in one place.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
              <FeaturePill icon={icons.home("#34D399")} text="Appraisal-grade comp tools" delay={0.9} visible={sectionVisible} />
              <FeaturePill icon={icons.target("#34D399")} text="DealMaker price negotiation" delay={1.0} visible={sectionVisible} />
              <FeaturePill icon={icons.chart("#34D399")} text="6 investment strategies analyzed" delay={1.1} visible={sectionVisible} />
              <FeaturePill icon={icons.download("#34D399")} text="Downloadable Excel proforma" delay={1.2} visible={sectionVisible} />
            </div>

            <StrategyMockup visible={sectionVisible} />
          </div>
        </div>

        {/* Bottom stats bar */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "clamp(24px, 6vw, 80px)",
          marginTop: "64px",
          padding: "32px 0",
          borderTop: "1px solid rgba(14,165,233,0.1)",
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(.22,1,.36,1) 1.2s",
          flexWrap: "wrap",
        }}>
          {[
            { value: "5", label: "Data sources cross-referenced", color: "#0EA5E9" },
            { value: "6", label: "Investment strategies analyzed", color: "#FBBF24" },
            { value: "Seconds", label: "From address to Verdict", color: "#34D399" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center", minWidth: "140px" }}>
              <div style={{
                fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 800, color: stat.color,
                lineHeight: 1, fontFamily: "'Inter', system-ui",
              }}>{stat.value}</div>
              <div style={{
                fontSize: "13px", color: "#64748B", marginTop: "8px", fontWeight: 500, letterSpacing: "0.02em",
              }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center", marginTop: "48px",
          opacity: sectionVisible ? 1 : 0,
          transition: "opacity 0.8s ease 1.4s",
        }}>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              padding: "16px 40px",
              fontSize: "16px",
              fontWeight: 700,
              color: "#000000",
              background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              letterSpacing: "0.02em",
              boxShadow: "0 0 30px rgba(14,165,233,0.3), 0 4px 20px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 50px rgba(14,165,233,0.4), 0 8px 30px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(14,165,233,0.3), 0 4px 20px rgba(0,0,0,0.3)";
            }}
          >
            Try Your First Property Free →
          </button>
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B" }}>
            No account needed. Results in seconds.
          </div>
        </div>
      </div>
    </section>
  );
}
