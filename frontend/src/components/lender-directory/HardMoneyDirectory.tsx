'use client'

// DealGapIQ — Hard Money Lender Directory (Pro members)

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import lendersData from '@/data/lenders.json';
import {
  Search, Phone, Mail, Globe, Lock, CheckCircle2, Sparkles, Filter,
  Printer, FileSpreadsheet, ExternalLink,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
  contact_type: 'phone_email' | 'phone_only' | 'email_only' | 'web_only';
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

const data = lendersData as LendersFile;
const PREVIEW_COUNT = 8;

const PRODUCT_LABELS: Record<string, string> = {
  fix_flip: 'Fix & Flip',
  brrrr: 'BRRRR',
  dscr: 'DSCR',
  bridge: 'Bridge',
  construction: 'Construction',
  ground_up: 'Ground-Up',
  commercial: 'Commercial',
  multifamily: 'Multifamily',
  rental: 'Rental',
  refi: 'Refinance',
  cash_out: 'Cash-Out Refi',
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT',
  'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const MIN_LOAN_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: '100000', label: '$100K+' },
  { value: '250000', label: '$250K+' },
  { value: '500000', label: '$500K+' },
  { value: '1000000', label: '$1M+' },
  { value: '5000000', label: '$5M+' },
  { value: '10000000', label: '$10M+' },
] as const;

// -----------------------------------------------------------------------------
// CSV helpers
// -----------------------------------------------------------------------------

function csvField(v: unknown) {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function productLabel(code: string) {
  return PRODUCT_LABELS[code] ?? code;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HardMoneyDirectory() {
  const router = useRouter();
  const {
    isPaidPro,
    isTrialing,
    isAuthenticated,
    isLoading: subscriptionLoading,
  } = useSubscription();

  const [stateFilter, setStateFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [minLoanFilter, setMinLoanFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeWebOnly, setIncludeWebOnly] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const hasPaidAccess = isPaidPro;

  useEffect(() => {
    setSelected(new Set());
  }, [stateFilter, productFilter, minLoanFilter, searchTerm, includeWebOnly]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const minLoan = minLoanFilter ? parseInt(minLoanFilter, 10) : NaN;

    return data.lenders.filter((l) => {
      if (stateFilter && !l.states_served.includes(stateFilter)) return false;
      if (productFilter && !l.loan_products.includes(productFilter)) return false;
      if (!Number.isNaN(minLoan) && l.max_loan_amount !== null && l.max_loan_amount < minLoan) {
        return false;
      }
      if (term) {
        if (!l.company_name.toLowerCase().includes(term) && !l.domain.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (!includeWebOnly && l.contact_type === 'web_only') return false;
      return true;
    });
  }, [stateFilter, productFilter, minLoanFilter, searchTerm, includeWebOnly]);

  const displayLenders = hasPaidAccess ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hiddenCount = hasPaidAccess ? 0 : Math.max(0, filtered.length - PREVIEW_COUNT);

  const selectedLenders = filtered.filter((l) => selected.has(l.id));

  const openSignIn = () => {
    router.push('/lenders?auth=required&redirect=/lenders');
  };

  const gateCopy = !isAuthenticated
    ? {
        eyebrow: 'Sign In Required',
        title: 'Sign in to unlock lender contacts',
        description:
          'Create an account or sign in, then upgrade to Pro to view the full hard money lender directory.',
        cta: 'Sign in to continue',
        onClick: openSignIn,
        footnote: 'Full lender directory is a Pro feature.',
      }
    : isTrialing
      ? {
          eyebrow: 'Paid Pro Required',
          title: 'Lender Directory requires paid Pro',
          description:
            'Upgrade to paid Pro to unlock all verified lenders, CSV export, and Print-to-PDF.',
          cta: 'Start paid Pro now',
          onClick: () => setUpgradeModalOpen(true),
          footnote: 'Trial users can preview the first 8 matching lenders.',
        }
      : {
          eyebrow: 'Pro Required',
          title: `Unlock ${data.stats.total_lenders.toLocaleString()} verified lenders`,
          description:
            'Full contact info, CSV export, and Print-to-PDF are available to Pro subscribers.',
          cta: 'Upgrade to Pro',
          onClick: () => setUpgradeModalOpen(true),
          footnote: 'Preview the first 8 lenders that match your filters.',
        };

  const toggleSelect = (id: number) => {
    if (!hasPaidAccess) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAllFiltered = () => {
    if (!hasPaidAccess || displayLenders.length === 0) return;
    const allSelected = displayLenders.every((l) => selected.has(l.id));
    const next = new Set(selected);
    if (allSelected) displayLenders.forEach((l) => next.delete(l.id));
    else displayLenders.forEach((l) => next.add(l.id));
    setSelected(next);
  };

  const clearSelected = () => setSelected(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const downloadCSV = () => {
    if (!hasPaidAccess) return;
    const toExport = selectedLenders.length > 0 ? selectedLenders : filtered;
    if (toExport.length === 0) return;

    const headers = [
      'Company', 'Website', 'Phone', 'Email', 'HQ State', 'States Served',
      'Loan Products', 'Loan Range', 'Max LTV', 'Max ARV', 'Rate', 'Points', 'Term',
      'NMLS ID', 'AAPL Member', 'Year Founded',
    ];
    const lines = [headers.map(csvField).join(',')];
    toExport.forEach((l) => {
      lines.push([
        l.company_name,
        l.website,
        l.phone ?? '',
        l.email ?? '',
        l.state ?? '',
        l.nationwide ? 'Nationwide (51)' : l.states_served.join(' '),
        l.loan_products.map(productLabel).join('; '),
        l.display.loan_range ?? '',
        l.display.max_ltv ?? '',
        l.display.max_arv ?? '',
        l.display.interest_rate ?? '',
        l.display.points ?? '',
        l.display.term ?? '',
        l.nmls_id ?? '',
        l.aapl_member === true ? 'Yes' : l.aapl_member === false ? 'No' : '',
        l.year_founded ?? '',
      ].map(csvField).join(','));
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `dealgapiq-lenders-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast(`${toExport.length} lender${toExport.length > 1 ? 's' : ''} exported`);
  };

  const printSelected = () => {
    if (!hasPaidAccess || selectedLenders.length === 0 || !printAreaRef.current) return;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
      <div class="print-header">
        <h2 class="print-title">DealGapIQ — Hard Money Lender Directory</h2>
        <div class="print-meta">${selectedLenders.length} ${selectedLenders.length === 1 ? 'lender' : 'lenders'} · Generated ${date}</div>
      </div>
      ${selectedLenders.map((l) => `
        <div class="print-card">
          <div class="pc-head">
            <div class="pc-info">
              <h3>${l.company_name}</h3>
              <p>${l.nationwide ? 'Nationwide' : `${l.states_served_count} states`}${l.state ? ` · HQ ${l.state}` : ''}</p>
            </div>
          </div>
          ${l.description ? `<div class="pc-desc">${l.description}</div>` : ''}
          <div class="pc-stats">
            ${l.display.loan_range ? `<div class="pc-stat"><div class="l">Loan size</div><div class="v">${l.display.loan_range}</div></div>` : ''}
            ${l.display.max_ltv ? `<div class="pc-stat"><div class="l">Max LTV</div><div class="v">${l.display.max_ltv}</div></div>` : ''}
            ${l.display.interest_rate ? `<div class="pc-stat"><div class="l">Rate</div><div class="v">${l.display.interest_rate}</div></div>` : ''}
            ${l.display.term ? `<div class="pc-stat"><div class="l">Term</div><div class="v">${l.display.term}</div></div>` : ''}
          </div>
          <div class="pc-row"><strong>Website:</strong> ${l.website}</div>
          ${l.phone ? `<div class="pc-row"><strong>Phone:</strong> ${l.phone}</div>` : ''}
          ${l.email ? `<div class="pc-row"><strong>Email:</strong> ${l.email}</div>` : ''}
          <div class="pc-row"><strong>Products:</strong> ${l.loan_products.map(productLabel).join(', ')}</div>
        </div>
      `).join('')}
      <div class="print-footer">DealGapIQ · See Every Property Through an Investor Lens · dealgapiq.com</div>
    `;
    printAreaRef.current.innerHTML = html;
    setTimeout(() => {
      window.print();
      setTimeout(() => { if (printAreaRef.current) printAreaRef.current.innerHTML = ''; }, 500);
    }, 50);
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes dgiq-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .dgiq-lender-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .dgiq-lender-card:hover { border-color: #4b5563; }
        .dgiq-lender-card.selected { border-color: #0EA5E9 !important; box-shadow: inset 0 0 0 1px #0EA5E9, 0 0 24px rgba(14, 165, 233, 0.12); }
        .dgiq-input:focus, .dgiq-select:focus { outline: none; border-color: #0EA5E9 !important; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
        .dgiq-btn-press { transition: all 0.15s ease; }
        .dgiq-btn-press:active { transform: scale(0.97); }
        @media (max-width: 900px) {
          .dgiq-lender-filters { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .dgiq-lender-filters { grid-template-columns: 1fr !important; }
        }
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { background: #fff !important; }
          body * { visibility: hidden; }
          .dgiq-print-area, .dgiq-print-area * { visibility: visible; }
          .dgiq-print-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff; color: #000; font-family: 'DM Sans', system-ui, sans-serif; }
          .dgiq-print-area .print-header { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 10px; border-bottom: 2px solid #0EA5E9; margin-bottom: 16px; }
          .dgiq-print-area .print-title { font: 700 16px 'DM Sans', sans-serif; color: #1B2141; margin: 0; }
          .dgiq-print-area .print-meta { font: 11px 'Space Mono', monospace; color: #555; }
          .dgiq-print-area .print-card { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; margin-bottom: 12px; background: #fff; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
          .dgiq-print-area .print-card:last-of-type { page-break-after: auto; break-after: auto; }
          .dgiq-print-area .pc-head { margin-bottom: 8px; }
          .dgiq-print-area .pc-info h3 { font: 700 14px 'DM Sans', sans-serif; color: #1B2141; margin: 0 0 2px; }
          .dgiq-print-area .pc-info p { font: 12px 'DM Sans', sans-serif; color: #555; margin: 0; }
          .dgiq-print-area .pc-desc { font: 11px 'DM Sans', sans-serif; color: #333; line-height: 1.5; margin: 8px 0; }
          .dgiq-print-area .pc-stats { display: flex; gap: 16px; padding: 8px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 8px 0; flex-wrap: wrap; }
          .dgiq-print-area .pc-stat .l { font: 8px 'DM Sans', sans-serif; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
          .dgiq-print-area .pc-stat .v { font: 700 14px 'DM Sans', sans-serif; color: #1B2141; }
          .dgiq-print-area .pc-row { font: 11px 'DM Sans', sans-serif; color: #333; margin: 4px 0; }
          .dgiq-print-area .pc-row strong { color: #1B2141; min-width: 70px; display: inline-block; }
          .dgiq-print-area .print-footer { position: fixed; bottom: 0.25in; left: 0; right: 0; text-align: center; font: 9px 'Space Mono', monospace; color: #6b7280; }
        }
      `}</style>

      <div style={styles.container}>
        <div style={{ marginBottom: 32 }}>
          <div style={styles.eyebrow}>
            <div style={styles.eyebrowDot} />
            <span>DealGapIQ / Lenders</span>
          </div>
          <h1 style={styles.h1}>
            Hard Money <span style={{ color: '#0EA5E9' }}>Lender Directory</span>
          </h1>
          <p style={styles.sub}>
            {data.stats.total_lenders.toLocaleString()} verified private and hard money lenders nationwide.
            Filter by state, loan product, and loan size to find financing for your next deal.
          </p>
        </div>

        <div style={styles.panel}>
          <div className="dgiq-lender-filters" style={styles.filterGrid}>
            <Field label="State (lenders funding here)">
              <select
                className="dgiq-select"
                style={styles.select}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value="">All states</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s} ({data.stats.by_state[s] ?? 0})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Loan product">
              <select
                className="dgiq-select"
                style={styles.select}
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="">All products</option>
                {Object.entries(PRODUCT_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label} ({data.stats.by_product[code] ?? 0})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lender funds at least">
              <select
                className="dgiq-select"
                style={styles.select}
                value={minLoanFilter}
                onChange={(e) => setMinLoanFilter(e.target.value)}
              >
                {MIN_LOAN_OPTIONS.map((opt) => (
                  <option key={opt.value || 'any'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Search by name" icon={<Search size={16} />}>
              <input
                className="dgiq-input"
                style={styles.input}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. Kiavi, Lima One"
              />
            </Field>
          </div>

          <div style={styles.filterRow}>
            <Filter size={14} style={{ color: '#6b7280' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#9ca3af' }}>
              <input
                type="checkbox"
                checked={includeWebOnly}
                onChange={(e) => setIncludeWebOnly(e.target.checked)}
                style={{ accentColor: '#0EA5E9' }}
              />
              Include lenders that only accept online applications (no phone listed)
            </label>
          </div>
        </div>

        <div style={styles.countStrip}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={styles.countNum}>{filtered.length}</span>
            <span style={{ fontSize: 14, color: '#9ca3af' }}>
              lenders match{!hasPaidAccess && hiddenCount > 0 ? ` · ${PREVIEW_COUNT} shown` : ''}
            </span>
          </div>
          {hasPaidAccess && displayLenders.length > 0 && (
            <button type="button" onClick={selectAllFiltered} style={styles.selectAllBtn}>
              <CheckCircle2 size={14} />
              {displayLenders.every((l) => selected.has(l.id)) ? 'Clear all' : 'Select all'}
            </button>
          )}
          {!hasPaidAccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#FACC15' }}>
              <Lock size={14} />
              <span style={{ fontFamily: 'Space Mono, monospace', letterSpacing: 0.5 }}>PRO ONLY</span>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {displayLenders.length === 0 && (
              <div style={styles.emptyState}>
                No lenders match these filters. Try widening your criteria.
              </div>
            )}
            {displayLenders.map((lender) => (
              <LenderCard
                key={lender.id}
                lender={lender}
                selected={selected.has(lender.id)}
                onToggle={() => toggleSelect(lender.id)}
                selectable={hasPaidAccess}
              />
            ))}
          </div>

          {!subscriptionLoading && !hasPaidAccess && hiddenCount > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={styles.gateCardInline}>
                <div style={styles.gateIcon}><Lock size={24} color="#fff" /></div>
                <div style={styles.gateEyebrow}>{gateCopy.eyebrow}</div>
                <h2 style={styles.gateTitle}>{gateCopy.title}</h2>
                <p style={styles.gateDesc}>
                  {gateCopy.description}
                  {' '}
                  <strong style={{ color: '#FACC15' }}>
                    +{hiddenCount.toLocaleString()} more
                  </strong>
                  {' '}
                  behind Pro for this search.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
                  {[
                    'Phone, email, and apply-online links for every lender',
                    'Filter by state, product, and minimum loan size',
                    'Export selected lenders to CSV',
                    'Print / Save as PDF for outreach',
                  ].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#d1d5db' }}>
                      <CheckCircle2 size={16} style={{ color: '#0EA5E9', flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={gateCopy.onClick} className="dgiq-btn-press" style={styles.gateBtn}>
                  <Sparkles size={16} /> {gateCopy.cta}
                </button>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>{gateCopy.footnote}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          ...styles.exportRow,
          marginTop: hasPaidAccess ? 0 : 8,
        }}>
          <button
            type="button"
            onClick={downloadCSV}
            disabled={!hasPaidAccess}
            style={hasPaidAccess ? styles.actionBtn : styles.actionBtnDisabled}
          >
            <FileSpreadsheet size={14} /> Download CSV
          </button>
          <button
            type="button"
            onClick={printSelected}
            disabled={!hasPaidAccess || selected.size === 0}
            style={
              hasPaidAccess && selected.size > 0
                ? { ...styles.actionBtn, ...styles.actionBtnPrimary }
                : styles.actionBtnDisabled
            }
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div style={{
        ...styles.actionBar,
        transform: selected.size > 0 && hasPaidAccess ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(calc(100% + 20px))',
        opacity: selected.size > 0 && hasPaidAccess ? 1 : 0,
        pointerEvents: selected.size > 0 && hasPaidAccess ? 'auto' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={styles.actionCount}>
            <CheckCircle2 size={14} /> {selected.size} selected
          </span>
          <button type="button" onClick={clearSelected} style={styles.actionClear}>Clear</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={downloadCSV} style={styles.actionBtn}>
            <FileSpreadsheet size={14} /> Download CSV
          </button>
          <button type="button" onClick={printSelected} style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}>
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div ref={printAreaRef} className="dgiq-print-area" />

      {toast && (
        <div style={styles.toast}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        returnTo="/lenders"
        paidOnlyFeature="Hard Money Lender Directory"
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function LenderCard({
  lender,
  selected,
  onToggle,
  selectable,
}: {
  lender: Lender;
  selected: boolean;
  onToggle: () => void;
  selectable: boolean;
}) {
  const products = lender.loan_products.map(productLabel);

  return (
    <div
      onClick={selectable ? onToggle : undefined}
      className={`dgiq-lender-card${selected ? ' selected' : ''}`}
      style={{
        ...styles.card,
        cursor: selectable ? 'pointer' : 'default',
        boxShadow: '0 0 24px rgba(14, 165, 233, 0.12)',
      }}
    >
      {selectable && (
        <div style={{
          ...(styles.checkbox as CSSProperties),
          background: selected ? '#0EA5E9' : '#000',
          borderColor: selected ? '#0EA5E9' : '#4b5563',
        }}>
          {selected && (
            <div style={{
              width: 9, height: 5, borderLeft: '2px solid #000', borderBottom: '2px solid #000',
              transform: 'rotate(-45deg) translate(0, -1px)',
            }} />
          )}
        </div>
      )}

      <div style={{ marginBottom: 10, paddingRight: selectable ? 32 : 0 }}>
        <h3 style={{
          fontSize: 15, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lender.company_name}
        </h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {lender.nationwide ? (
            <span style={styles.badgeNationwide}>Nationwide</span>
          ) : lender.states_served_count > 0 ? (
            <span style={styles.badgeRegional}>
              {lender.states_served_count} state{lender.states_served_count === 1 ? '' : 's'}
            </span>
          ) : null}
          {lender.state && !lender.nationwide && (
            <span style={styles.badgeRegional}>HQ {lender.state}</span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        {lender.contact_type === 'web_only' ? (
          <a
            href={lender.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={styles.applyLink}
          >
            <ExternalLink size={13} /> Apply Online
          </a>
        ) : (
          <>
            {lender.phone && (
              <div style={styles.contactRow}>
                <Phone size={12} /> <span>{lender.phone}</span>
              </div>
            )}
            {lender.email && (
              <div style={styles.contactRow}>
                <Mail size={12} /> <span>{lender.email}</span>
              </div>
            )}
            {lender.website && (
              <div style={styles.contactRow}>
                <Globe size={12} />
                <a
                  href={lender.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: '#0EA5E9', textDecoration: 'none' }}
                >
                  {lender.domain}
                </a>
              </div>
            )}
          </>
        )}
      </div>

      <div style={styles.termGrid}>
        {lender.display.loan_range && <TermStat label="Loan size" value={lender.display.loan_range} />}
        {lender.display.max_ltv && <TermStat label="Max LTV" value={lender.display.max_ltv} />}
        {lender.display.max_arv && <TermStat label="Max ARV" value={lender.display.max_arv} />}
        {lender.display.interest_rate && <TermStat label="Rate" value={lender.display.interest_rate} />}
        {lender.display.term && <TermStat label="Term" value={lender.display.term} />}
        {lender.display.points && <TermStat label="Points" value={lender.display.points} />}
      </div>

      {products.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
          {products.map((p) => (
            <span key={p} style={styles.strategyChip}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: '#6b7280', pointerEvents: 'none',
          }}>{icon}</span>
        )}
        {children}
      </div>
    </div>
  );
}

function TermStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#000', padding: '8px 10px', borderRadius: 7 }}>
      <div style={styles.miniLabel}>{label}</div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700,
        color: '#fff', letterSpacing: '-0.02em', marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--surface-base)',
    color: '#fff',
    fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    padding: '32px 24px 100px',
    position: 'relative',
  },
  container: { maxWidth: 1280, margin: '0 auto' },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
    fontSize: 11, color: '#0EA5E9', letterSpacing: 2, textTransform: 'uppercase',
    fontFamily: 'Space Mono, monospace',
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: '50%', background: '#0EA5E9', boxShadow: '0 0 12px #0EA5E9' },
  h1: {
    fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, lineHeight: 1.05,
    margin: '0 0 14px', letterSpacing: '-0.02em',
  },
  sub: { fontSize: 17, color: '#9ca3af', maxWidth: 720, lineHeight: 1.5, margin: 0 },
  panel: {
    background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
    border: '1px solid #1f2937', borderRadius: 14, padding: 20, marginBottom: 20,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    display: 'block', fontFamily: 'Space Mono, monospace',
    fontSize: 10, color: '#6b7280', letterSpacing: 1.4,
    textTransform: 'uppercase', marginBottom: 7,
  },
  input: {
    width: '100%', background: '#000', color: '#fff',
    border: '1px solid #1f2937', borderRadius: 9, padding: '12px 14px 12px 42px',
    fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box', transition: 'all 0.2s',
  },
  select: {
    width: '100%', background: '#000', color: '#fff',
    border: '1px solid #1f2937', borderRadius: 9, padding: '12px 14px',
    fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  },
  filterRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    paddingTop: 16, borderTop: '1px solid #1f2937',
  },
  countStrip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 18, padding: '0 4px', flexWrap: 'wrap', gap: 12,
  },
  countNum: { fontFamily: 'Space Mono, monospace', fontSize: 30, fontWeight: 700, color: '#0EA5E9' },
  selectAllBtn: {
    background: 'transparent', color: '#0EA5E9',
    border: '1px solid rgba(14, 165, 233, 0.3)', padding: '6px 12px',
    borderRadius: 7, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  card: {
    background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
    border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: 14, padding: 18,
    position: 'relative', overflow: 'hidden',
  },
  checkbox: {
    position: 'absolute', top: 14, right: 14,
    width: 22, height: 22, border: '1.5px solid',
    borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  badgeNationwide: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: '#FACC15', border: '1px solid rgba(250, 204, 21, 0.45)',
    background: 'rgba(250, 204, 21, 0.08)',
  },
  badgeRegional: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: '#C4B5FD', border: '1px solid rgba(196, 181, 253, 0.45)',
    background: 'rgba(196, 181, 253, 0.08)',
  },
  contactRow: {
    display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0',
    fontSize: 12, color: '#d1d5db',
  },
  applyLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: '#0EA5E9', fontWeight: 600, fontSize: 13, textDecoration: 'none',
  },
  termGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  miniLabel: {
    fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#6b7280',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  strategyChip: {
    background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9',
    padding: '2px 9px', borderRadius: 999,
    fontSize: 11, fontWeight: 600, border: '1px solid rgba(14, 165, 233, 0.22)',
  },
  emptyState: {
    gridColumn: '1 / -1',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
    border: '1px solid #1f2937',
    borderRadius: 14,
    padding: 24,
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  gateCardInline: {
    maxWidth: 560, margin: '0 auto',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #000 100%)',
    border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: 18, padding: 32,
    boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(14, 165, 233, 0.2)',
    textAlign: 'center',
  },
  gateIcon: {
    width: 52, height: 52, borderRadius: 13, margin: '0 auto 16px',
    background: 'linear-gradient(135deg, #0EA5E9 0%, #1B2141 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 32px rgba(14, 165, 233, 0.4)',
  },
  gateEyebrow: {
    fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#0EA5E9',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  gateTitle: { fontSize: 24, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' },
  gateDesc: { fontSize: 14, color: '#9ca3af', lineHeight: 1.55, margin: '0 0 22px' },
  gateBtn: {
    width: '100%', background: '#0EA5E9', color: '#000', border: 'none',
    padding: '13px 24px', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  exportRow: {
    display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
    marginBottom: 24,
  },
  actionBar: {
    position: 'fixed', bottom: 20, left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 48px)', maxWidth: 720,
    background: 'linear-gradient(180deg, #0a0a0a 0%, #000 100%)',
    border: '1px solid #0EA5E9', borderRadius: 12,
    padding: '12px 16px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    gap: 14, flexWrap: 'wrap',
    boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 40px rgba(14, 165, 233, 0.15)',
    transition: 'transform 0.25s, opacity 0.25s',
    zIndex: 50,
  },
  actionCount: {
    fontFamily: 'inherit', fontWeight: 700, fontSize: 13, color: '#0EA5E9',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  actionClear: {
    background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, padding: '4px 8px', borderRadius: 5,
  },
  actionBtn: {
    background: 'transparent', color: '#fff', border: '1px solid #1f2937',
    borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  actionBtnPrimary: {
    background: '#0EA5E9', color: '#000', borderColor: '#0EA5E9',
  },
  actionBtnDisabled: {
    background: 'transparent', color: '#6b7280', border: '1px solid #1f2937',
    borderRadius: 8, padding: '9px 14px', cursor: 'not-allowed',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.55,
  },
  toast: {
    position: 'fixed', top: 16, left: '50%',
    transform: 'translateX(-50%)',
    background: '#0a0a0a', border: '1px solid #22c55e', color: '#22c55e',
    padding: '10px 18px', borderRadius: 9,
    fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 7,
    zIndex: 200, animation: 'dgiq-toast-in 0.25s ease',
  },
} as Record<string, CSSProperties>;
