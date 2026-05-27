import { useEffect, useMemo, useState } from "react";
import lendersData from "../data/lenders.json";

// ─── Types ──────────────────────────────────────────────────────────────────
interface LenderDisplay {
  loan_range: string | null;
  max_ltv: string | null;
  max_arv: string | null;
  interest_rate: string | null;
  points: string | null;
  term: string | null;
}

interface Lender {
  id: number;
  domain: string;
  company_name: string;
  website: string;
  phone: string | null;
  email: string | null;
  contact_type: "phone_email" | "phone_only" | "email_only" | "web_only";
  city: string | null;
  state: string | null;
  states_served: string[];
  states_served_count: number;
  nationwide: boolean;
  loan_products: string[];
  description: string | null;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
  display: LenderDisplay;
  nmls_id: string | null;
  aapl_member: boolean | null;
  year_founded: number | null;
}

interface LendersFile {
  generated_at: string;
  stats: {
    total_lenders: number;
    by_contact_type: Record<string, number>;
    by_state: Record<string, number>;
    by_product: Record<string, number>;
    nationwide_count: number;
  };
  lenders: Lender[];
}

// ─── Brand colors (DealGapIQ design system) ────────────────────────────────
const COLORS = {
  bg: "#000000",
  navy: "#1B2141",
  sky: "#0EA5E9",
  blue: "#0465f2",
  yellow: "#FACC15",
  lavender: "#C4B5FD",
  cardBg: "rgba(14, 165, 233, 0.04)",
  cardBorder: "rgba(14, 165, 233, 0.25)",
  cardGlow: "0 0 24px rgba(14, 165, 233, 0.12)",
  textPrimary: "#FFFFFF",
  textMuted: "rgba(255, 255, 255, 0.65)",
  textDim: "rgba(255, 255, 255, 0.45)",
};

// ─── Product display labels ─────────────────────────────────────────────────
const PRODUCT_LABELS: Record<string, string> = {
  fix_flip: "Fix & Flip",
  brrrr: "BRRRR",
  dscr: "DSCR",
  bridge: "Bridge",
  construction: "Construction",
  ground_up: "Ground-Up",
  commercial: "Commercial",
  multifamily: "Multifamily",
  rental: "Rental",
  refi: "Refinance",
  cash_out: "Cash-Out Refi",
};

// ─── US states for the filter dropdown ──────────────────────────────────────
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

// ─── Mock Pro entitlement (wire to real auth state) ────────────────────────
// TODO: replace with real subscription check from your auth context.
function useIsPro(): boolean {
  return false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(lenders: Lender[]): void {
  const headers = [
    "Company","Website","Phone","Email","HQ State","States Served",
    "Loan Products","Loan Range","Max LTV","Max ARV","Rate","Points","Term",
    "NMLS ID","AAPL Member","Year Founded",
  ];
  const rows = lenders.map((l) => [
    l.company_name, l.website, l.phone || "", l.email || "",
    l.state || "",
    l.nationwide ? "Nationwide (51)" : l.states_served.join(" "),
    l.loan_products.map((p) => PRODUCT_LABELS[p] || p).join(" / "),
    l.display.loan_range || "",
    l.display.max_ltv || "",
    l.display.max_arv || "",
    l.display.interest_rate || "",
    l.display.points || "",
    l.display.term || "",
    l.nmls_id || "",
    l.aapl_member === true ? "Yes" : l.aapl_member === false ? "No" : "",
    l.year_founded || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dealgapiq-lenders-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function HardMoneyDirectory() {
  const isPro = useIsPro();
  const data = lendersData as LendersFile;
  const allLenders = data.lenders;

  // Filters
  const [stateFilter, setStateFilter] = useState<string>(""); // "" = all
  const [productFilter, setProductFilter] = useState<string>(""); // "" = all
  const [minLoanFilter, setMinLoanFilter] = useState<string>(""); // dollars as string
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [includeWebOnly, setIncludeWebOnly] = useState<boolean>(true);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Reset selection whenever filters change to avoid invisible-selected ghosts
  useEffect(() => {
    setSelected(new Set());
  }, [stateFilter, productFilter, minLoanFilter, searchTerm, includeWebOnly]);

  // Apply filters
  const filtered = useMemo(() => {
    return allLenders.filter((l) => {
      if (stateFilter && !l.states_served.includes(stateFilter)) return false;
      if (productFilter && !l.loan_products.includes(productFilter)) return false;
      if (minLoanFilter) {
        const target = parseInt(minLoanFilter, 10);
        if (!Number.isNaN(target) && l.max_loan_amount !== null) {
          if (l.max_loan_amount < target) return false;
        }
      }
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (
          !l.company_name.toLowerCase().includes(t) &&
          !l.domain.toLowerCase().includes(t)
        ) {
          return false;
        }
      }
      if (!includeWebOnly && l.contact_type === "web_only") return false;
      return true;
    });
  }, [allLenders, stateFilter, productFilter, minLoanFilter, searchTerm, includeWebOnly]);

  // Pro paywall: show 8 visible, blur the rest
  const VISIBLE_PREVIEW = 8;
  const visibleLenders = isPro ? filtered : filtered.slice(0, VISIBLE_PREVIEW);
  const blurredCount = isPro ? 0 : Math.max(0, filtered.length - VISIBLE_PREVIEW);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === visibleLenders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleLenders.map((l) => l.id)));
    }
  };

  const exportSelectedCsv = () => {
    if (!isPro) return;
    const toExport = selected.size > 0
      ? filtered.filter((l) => selected.has(l.id))
      : filtered;
    downloadCsv(toExport);
  };

  return (
    <div style={{
      backgroundColor: COLORS.bg,
      color: COLORS.textPrimary,
      minHeight: "100vh",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: "32px 24px 64px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            color: COLORS.sky,
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            Pro Feature
          </div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            margin: 0,
            marginBottom: 8,
            color: COLORS.textPrimary,
          }}>
            Hard Money Lender Directory
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 15, margin: 0, maxWidth: 720 }}>
            {data.stats.total_lenders.toLocaleString()} verified private and hard money lenders
            nationwide. Filter by state, loan product, and loan size to find financing
            for your next deal.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          backgroundColor: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: COLORS.cardGlow,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 16,
        }}>
          {/* State filter */}
          <div>
            <label style={labelStyle}>State (lenders funding here)</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All states</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s} ({data.stats.by_state[s] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Product filter */}
          <div>
            <label style={labelStyle}>Loan Product</label>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All products</option>
              {Object.entries(PRODUCT_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label} ({data.stats.by_product[code] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Min loan size filter */}
          <div>
            <label style={labelStyle}>Lender funds at least</label>
            <select
              value={minLoanFilter}
              onChange={(e) => setMinLoanFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">Any size</option>
              <option value="100000">$100K+</option>
              <option value="250000">$250K+</option>
              <option value="500000">$500K+</option>
              <option value="1000000">$1M+</option>
              <option value="5000000">$5M+</option>
              <option value="10000000">$10M+</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label style={labelStyle}>Search by name</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. Kiavi, Lima One"
              style={inputStyle}
            />
          </div>

          {/* Web-only toggle (full width second row) */}
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="includeWebOnly"
              checked={includeWebOnly}
              onChange={(e) => setIncludeWebOnly(e.target.checked)}
              style={{ accentColor: COLORS.sky }}
            />
            <label htmlFor="includeWebOnly" style={{
              color: COLORS.textMuted, fontSize: 13, cursor: "pointer",
            }}>
              Include lenders that only accept online applications (no phone listed)
            </label>
          </div>
        </div>

        {/* Result count + actions */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div style={{ color: COLORS.textMuted, fontSize: 14 }}>
            <span style={{ color: COLORS.sky, fontWeight: 600 }}>{filtered.length}</span> lenders match
            {selected.size > 0 && (
              <span style={{ marginLeft: 8 }}>
                · <span style={{ color: COLORS.yellow }}>{selected.size} selected</span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={selectAll} style={secondaryButton} disabled={visibleLenders.length === 0}>
              {selected.size === visibleLenders.length && visibleLenders.length > 0 ? "Clear all" : "Select all"}
            </button>
            <button
              onClick={exportSelectedCsv}
              style={isPro ? primaryButton : disabledButton}
              disabled={!isPro}
            >
              Export CSV
            </button>
            <button
              onClick={() => isPro && window.print()}
              style={isPro ? primaryButton : disabledButton}
              disabled={!isPro}
            >
              Print PDF
            </button>
          </div>
        </div>

        {/* Lender grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 16,
          position: "relative",
        }}>
          {visibleLenders.map((l) => (
            <LenderCard
              key={l.id}
              lender={l}
              selected={selected.has(l.id)}
              onToggleSelect={() => toggleSelect(l.id)}
              isPro={isPro}
            />
          ))}
        </div>

        {/* Pro paywall overlay */}
        {!isPro && blurredCount > 0 && <ProPaywall blurredCount={blurredCount} />}

        {visibleLenders.length === 0 && (
          <div style={{
            textAlign: "center",
            color: COLORS.textMuted,
            padding: 48,
          }}>
            No lenders match these filters. Try widening your criteria.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lender card ────────────────────────────────────────────────────────────
function LenderCard({
  lender, selected, onToggleSelect, isPro,
}: {
  lender: Lender;
  selected: boolean;
  onToggleSelect: () => void;
  isPro: boolean;
}) {
  const productLabels = lender.loan_products.map((p) => PRODUCT_LABELS[p] || p);
  return (
    <div style={{
      backgroundColor: selected ? "rgba(14, 165, 233, 0.10)" : COLORS.cardBg,
      border: `1px solid ${selected ? COLORS.sky : COLORS.cardBorder}`,
      borderRadius: 12,
      padding: 18,
      boxShadow: COLORS.cardGlow,
      transition: "all 0.15s ease",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              disabled={!isPro}
              style={{ accentColor: COLORS.sky, cursor: isPro ? "pointer" : "not-allowed" }}
            />
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              margin: 0,
              color: COLORS.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {lender.company_name}
            </h3>
          </div>
          {lender.nationwide && (
            <span style={badgeStyle(COLORS.yellow)}>Nationwide</span>
          )}
          {!lender.nationwide && lender.states_served_count > 0 && (
            <span style={badgeStyle(COLORS.lavender)}>
              {lender.states_served_count} state{lender.states_served_count === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Contact */}
      <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>
        {lender.contact_type === "web_only" ? (
          <a href={lender.website} target="_blank" rel="noopener noreferrer" style={{
            color: COLORS.sky, textDecoration: "none", fontWeight: 600,
          }}>
            Apply Online →
          </a>
        ) : (
          <>
            {lender.phone && <div>📞 {lender.phone}</div>}
            {lender.email && <div style={{ marginTop: 2 }}>✉ {lender.email}</div>}
          </>
        )}
      </div>

      {/* Loan terms grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        fontSize: 12,
        marginBottom: 12,
      }}>
        {lender.display.loan_range && <Stat label="Loan size" value={lender.display.loan_range} />}
        {lender.display.max_ltv && <Stat label="Max LTV" value={lender.display.max_ltv} />}
        {lender.display.max_arv && <Stat label="Max ARV" value={lender.display.max_arv} />}
        {lender.display.interest_rate && <Stat label="Rate" value={lender.display.interest_rate} />}
        {lender.display.term && <Stat label="Term" value={lender.display.term} />}
        {lender.display.points && <Stat label="Points" value={lender.display.points} />}
      </div>

      {/* Products */}
      {productLabels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {productLabels.map((p) => (
            <span key={p} style={{
              fontSize: 10,
              padding: "3px 7px",
              borderRadius: 4,
              backgroundColor: "rgba(14, 165, 233, 0.12)",
              color: COLORS.sky,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.04em",
            }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: COLORS.textDim, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: COLORS.textPrimary, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function ProPaywall({ blurredCount }: { blurredCount: number }) {
  return (
    <div style={{
      position: "relative",
      marginTop: 32,
      padding: 32,
      borderRadius: 12,
      background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(14,165,233,0.08) 100%)",
      border: `1px solid ${COLORS.cardBorder}`,
      textAlign: "center",
    }}>
      <div style={{
        color: COLORS.sky,
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: 12,
      }}>
        + {blurredCount.toLocaleString()} more lenders behind Pro
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}>
        Unlock the full directory
      </h3>
      <p style={{ color: COLORS.textMuted, maxWidth: 480, margin: "0 auto 20px", fontSize: 14 }}>
        Get every verified lender, CSV exports, Print-to-PDF, and the rest of DealGapIQ Pro.
      </p>
      <a href="/pricing" style={{
        display: "inline-block",
        backgroundColor: COLORS.sky,
        color: COLORS.bg,
        padding: "12px 24px",
        borderRadius: 8,
        textDecoration: "none",
        fontWeight: 700,
        fontSize: 14,
      }}>
        Upgrade to Pro · $29/mo
      </a>
    </div>
  );
}

// ─── Inline style helpers ──────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontFamily: "'Space Mono', monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: COLORS.textDim,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: `1px solid ${COLORS.cardBorder}`,
  backgroundColor: "rgba(0,0,0,0.4)",
  color: COLORS.textPrimary,
  fontSize: 14,
  fontFamily: "inherit",
};

const primaryButton: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  backgroundColor: COLORS.sky,
  color: COLORS.bg,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: `1px solid ${COLORS.cardBorder}`,
  backgroundColor: "transparent",
  color: COLORS.textPrimary,
  fontSize: 13,
  cursor: "pointer",
};

const disabledButton: React.CSSProperties = {
  ...primaryButton,
  backgroundColor: "rgba(14, 165, 233, 0.3)",
  cursor: "not-allowed",
};

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    fontSize: 10,
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "2px 6px",
    borderRadius: 3,
    color,
    border: `1px solid ${color}`,
    marginTop: 2,
  };
}
