'use client'

// DealGapIQ — Hard Money Lender Directory (Pro members)

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useDirectoryList } from '@/hooks/useDirectoryList';
import { trackActivation } from '@/lib/eventTracking';
import { ApiError, api } from '@/lib/api-client';
import {
  buildLendersExportPath,
  buildLendersListPath,
  type AppliedLenderFilters,
  type Lender,
  type LenderListResponse,
  type LenderStatsResponse,
} from '@/lib/lenders-api';
import {
  buildZipLookupPath,
  formatZipLocation,
  normalizeZip,
  type ZipLocation,
} from '@/lib/geo-api';
import { runDirectoryExport } from '@/lib/directory-export-client';
import { LENDER_DIRECTORY_TOTAL } from '@/lib/directory-promo';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { SaveDirectoryContactButton } from '@/components/SaveDirectoryContactButton';
import { buildLenderSnapshot } from '@/types/savedDirectoryContact';
import {
  Search, Phone, Mail, Globe, Lock, Filter, ExternalLink,
} from 'lucide-react';
import {
  DIRECTORY_BASE_CSS,
  directoryBaseStyles,
  directoryTokens,
} from '@/components/directory/directoryStyles';
import { DirectoryCardSkeletons } from '@/components/directory/DirectoryCardSkeletons';
import { DirectoryField, type DirectoryFieldHint } from '@/components/directory/DirectoryField';
import { DirectoryGate, type DirectoryGateSpec } from '@/components/directory/DirectoryGate';

const PREVIEW_LENDER_CARDS = [
  { title: 'Verified Hard Money Lender', products: ['Fix & Flip', 'Bridge'] },
  { title: 'Private Lending Partner', products: ['BRRRR', 'DSCR'] },
  { title: 'Nationwide Capital Source', products: ['Fix & Flip', 'Construction'] },
] as const;

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

const GATE_SPEC: DirectoryGateSpec = {
  records: 'verified lenders',
  directoryName: 'lender directory',
  entity: 'lender',
  bullets: [
    'Phone, email, and apply-online links for every lender',
    'Search by deal ZIP code, loan product, and minimum loan size',
    'Save lenders to your dashboard for quick access',
  ],
};

const selectLenders = (page: LenderListResponse) => page.lenders;

function productLabel(code: string) {
  return PRODUCT_LABELS[code] ?? code;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HardMoneyDirectory() {
  const router = useRouter();

  const [stateFilter, setStateFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [minLoanFilter, setMinLoanFilter] = useState('');
  const [creditFilter, setCreditFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [debouncedZip, setDebouncedZip] = useState('');
  const [includeWebOnly, setIncludeWebOnly] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Debounce the name search so typing doesn't refetch per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedZip(zipInput), 300);
    return () => clearTimeout(id);
  }, [zipInput]);

  const appliedFilters: AppliedLenderFilters = useMemo(
    () => ({
      state: stateFilter,
      product: productFilter,
      minLoan: minLoanFilter,
      credit: creditFilter,
      search: debouncedSearch,
      includeWebOnly,
    }),
    [stateFilter, productFilter, minLoanFilter, creditFilter, debouncedSearch, includeWebOnly],
  );

  const {
    records: loadedLenders,
    total: listTotal,
    isLoading: lendersLoading,
    isError: lendersErrored,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    viewForbidden,
    hasAccess,
    isTrialing,
    isAuthenticated,
    subscriptionLoading,
  } = useDirectoryList<LenderListResponse, Lender>({
    queryKey: ['lenders', appliedFilters],
    buildPath: (page) => buildLendersListPath(appliedFilters, page),
    selectRecords: selectLenders,
  });

  // North-star activation: a signed-in user engaging the proprietary lender
  // directory is a strong "aha"/intent signal (deduped per device).
  useEffect(() => {
    if (isAuthenticated) trackActivation('lender_directory');
  }, [isAuthenticated]);

  // Lender coverage is licensed state by state, so a ZIP is only a friendlier
  // way to pick the state — it resolves, then drives the same state filter.
  const lookupZip = normalizeZip(debouncedZip);
  const {
    data: zipLocation,
    isFetching: zipResolving,
    isError: zipUnrecognized,
  } = useQuery({
    queryKey: ['zip-location', lookupZip],
    queryFn: () => api.get<ZipLocation>(buildZipLookupPath(lookupZip as string)),
    enabled: !!lookupZip && isAuthenticated && !subscriptionLoading,
    retry: false,
    staleTime: Infinity,
  });

  const resolvedState = zipLocation?.state;
  useEffect(() => {
    if (resolvedState) setStateFilter(resolvedState);
  }, [resolvedState]);

  // Picking a state by hand retires the ZIP so the two can never disagree.
  const handleStateChange = (value: string) => {
    setStateFilter(value);
    setZipInput('');
    setDebouncedZip('');
  };

  const zipHint = useMemo<DirectoryFieldHint | null>(() => {
    const id = 'dgiq-zip-hint';
    if (!lookupZip) return null;
    if (zipResolving) return { id, text: 'Looking up…', tone: 'neutral' };
    if (zipUnrecognized) return { id, text: 'ZIP not recognized', tone: 'error' };
    if (zipLocation) return { id, text: formatZipLocation(zipLocation), tone: 'neutral' };
    return null;
  }, [lookupZip, zipResolving, zipUnrecognized, zipLocation]);

  // Directory totals — non-paid users receive a 401 carrying { total } only.
  const { data: statsData } = useQuery({
    queryKey: ['lender-directory-stats'],
    queryFn: async (): Promise<LenderStatsResponse | { total: number }> => {
      try {
        return await api.get<LenderStatsResponse>('/api/lenders/stats');
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          typeof error.detail?.total === 'number'
        ) {
          return { total: error.detail.total as number };
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !subscriptionLoading,
    retry: false,
  });
  const stats = statsData && 'byState' in statsData ? statsData : null;

  const directoryTotal = statsData?.total ?? LENDER_DIRECTORY_TOTAL;
  const totalLabel = directoryTotal.toLocaleString();
  const noCreditCheckCount = stats?.noCreditCheckCount ?? 0;

  const displayLenders = hasAccess ? loadedLenders : [];
  const displayCount = hasAccess ? listTotal : totalLabel;

  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'print' | null>(null);

  const handleExport = async (fmt: 'csv' | 'print') => {
    setExporting(fmt);
    setExportNotice(null);
    const result = await runDirectoryExport(
      buildLendersExportPath(appliedFilters, fmt),
      fmt,
      'dealgapiq-lenders.csv',
    );
    if (!result.ok) setExportNotice(result.message);
    setExporting(null);
  };

  const openSignIn = () => {
    router.push('/lenders?auth=required&redirect=/lenders');
  };

  return (
    <div style={styles.page}>
      <style>{`
        ${DIRECTORY_BASE_CSS}
        @media (max-width: 1280px) {
          .dgiq-lender-filters { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .dgiq-lender-filters { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .dgiq-lender-filters { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={styles.container}>
        <div style={{ marginBottom: 32 }}>
          <div style={styles.eyebrow}>
            <div style={styles.eyebrowDot} />
            <span>DealGapIQ / Lenders</span>
          </div>
          <h1 style={styles.h1}>
            Hard Money <span style={{ color: directoryTokens.accent }}>Lender Directory</span>
          </h1>
          <p style={styles.sub}>
            {totalLabel} verified private and hard money lenders nationwide.
            Enter your deal&rsquo;s ZIP code, then filter by loan product and size to find
            financing. Lenders are licensed state by state, so results cover the whole state.
          </p>
        </div>

        <div style={styles.panel}>
          <div className="dgiq-lender-filters" style={styles.filterGrid}>
            <DirectoryField label="Deal ZIP code" controlId="lender-zip" hint={zipHint}>
              <input
                id="lender-zip"
                className="dgiq-input"
                style={styles.input}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={10}
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                placeholder="e.g. 33460"
                aria-describedby="dgiq-zip-hint"
              />
            </DirectoryField>

            <DirectoryField label="State" controlId="lender-state">
              <select
                id="lender-state"
                className="dgiq-select"
                style={styles.select}
                value={stateFilter}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                <option value="">All states</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {stats ? `${s} (${stats.byState[s] ?? 0})` : s}
                  </option>
                ))}
              </select>
            </DirectoryField>

            <DirectoryField label="Loan product" controlId="lender-product">
              <select
                id="lender-product"
                className="dgiq-select"
                style={styles.select}
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="">All products</option>
                {Object.entries(PRODUCT_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {stats ? `${label} (${stats.byProduct[code] ?? 0})` : label}
                  </option>
                ))}
              </select>
            </DirectoryField>

            <DirectoryField label="Lender funds at least" controlId="lender-min-loan">
              <select
                id="lender-min-loan"
                className="dgiq-select"
                style={styles.select}
                value={minLoanFilter}
                onChange={(e) => setMinLoanFilter(e.target.value)}
              >
                {MIN_LOAN_OPTIONS.map((opt) => (
                  <option key={opt.value || 'any'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </DirectoryField>

            <DirectoryField label="Credit policy" controlId="lender-credit">
              <select
                id="lender-credit"
                className="dgiq-select"
                style={styles.select}
                value={creditFilter}
                onChange={(e) => setCreditFilter(e.target.value)}
              >
                <option value="">Any credit policy</option>
                <option value="no_credit_check">
                  No credit check ({noCreditCheckCount})
                </option>
                <option value="soft_pull">
                  Soft pull only ({stats?.byCreditPolicy?.soft_pull ?? 0})
                </option>
                <option value="no_min_score">No minimum score</option>
              </select>
            </DirectoryField>

            <DirectoryField label="Search by name" controlId="lender-search" icon={<Search size={16} />}>
              <input
                id="lender-search"
                className="dgiq-input"
                style={styles.input}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. Kiavi, Lima One"
              />
            </DirectoryField>
          </div>

          <div style={styles.filterRow}>
            <Filter size={14} style={{ color: directoryTokens.muted }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: directoryTokens.secondary }}>
              <input
                type="checkbox"
                checked={includeWebOnly}
                onChange={(e) => setIncludeWebOnly(e.target.checked)}
                style={{ accentColor: directoryTokens.accent }}
              />
              Include lenders that only accept online applications (no phone listed)
            </label>
          </div>
        </div>

        <div style={styles.countStrip}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={styles.countNum}>{displayCount}</span>
            <span style={styles.mutedTextMd}>
              {!hasAccess
                ? 'verified lenders nationwide'
                : stateFilter
                  // Coverage is licensed state by state — say so rather than
                  // implying we matched the ZIP itself.
                  ? `lenders licensed in ${stateFilter}`
                  : 'lenders match'}
            </span>
          </div>
          {hasAccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={styles.mutedTextSm}>
                Save lenders to your dashboard for quick access later
              </div>
              <button
                type="button"
                className="dgiq-btn-press"
                style={styles.exportBtn}
                disabled={exporting !== null}
                onClick={() => handleExport('csv')}
                title="Download CSV (up to 200 records)"
              >
                {exporting === 'csv' ? 'Exporting…' : 'Download CSV'}
              </button>
              <button
                type="button"
                className="dgiq-btn-press"
                style={styles.exportBtn}
                disabled={exporting !== null}
                onClick={() => handleExport('print')}
                title="Print / save as PDF (up to 200 records)"
              >
                {exporting === 'print' ? 'Preparing…' : 'Print / PDF'}
              </button>
            </div>
          )}
          {!hasAccess && (
            <div style={styles.paidProBadge}>
              <Lock size={14} />
              <span style={{ fontFamily: 'Space Mono, monospace', letterSpacing: 0.5 }}>PRO ONLY</span>
            </div>
          )}
        </div>

        {/* Export notice (server-enforced; this is a UX echo) */}
        {exportNotice && (
          <div style={styles.noticeStrip} role="status">{exportNotice}</div>
        )}

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
            filter: hasAccess ? 'none' : 'blur(8px)',
            pointerEvents: hasAccess ? 'auto' : 'none',
            userSelect: hasAccess ? 'auto' : 'none',
            transition: 'filter 0.4s ease',
          }}>
            {hasAccess && lendersLoading && <DirectoryCardSkeletons />}
            {hasAccess && lendersErrored && !viewForbidden && (
              <div style={styles.emptyState}>
                Could not load the lender directory. Refresh and try again.
              </div>
            )}
            {hasAccess && !lendersLoading && !lendersErrored && displayLenders.length === 0 && (
              <div style={styles.emptyState}>
                No lenders match these filters. Try widening your criteria.
              </div>
            )}
            {hasAccess && !lendersLoading && displayLenders.map((lender) => (
              <LenderCard
                key={lender.id}
                lender={lender}
                localState={stateFilter}
              />
            ))}
            {!hasAccess && <PreviewLenderCards />}
          </div>

          {hasAccess && !lendersLoading && !lendersErrored && hasNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="dgiq-btn-press"
                style={styles.selectAllBtn}
              >
                {isFetchingNextPage
                  ? 'Loading…'
                  : `Load more lenders (${loadedLenders.length} of ${listTotal})`}
              </button>
            </div>
          )}

          {!subscriptionLoading && !hasAccess && (
            <DirectoryGate
              spec={GATE_SPEC}
              totalLabel={totalLabel}
              isAuthenticated={isAuthenticated}
              isTrialing={isTrialing}
              onSignIn={openSignIn}
              onStartPaid={() => setUpgradeModalOpen(true)}
            />
          )}
        </div>
      </div>

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

function PreviewLenderCards() {
  return (
    <>
      {PREVIEW_LENDER_CARDS.map((card) => (
        <div key={card.title} className="dgiq-directory-card" style={styles.card}>
          <div style={{ marginBottom: 10 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em',
            }}>
              {card.title}
            </h3>
            <div style={styles.mutedTextSm}>Paid Pro contact</div>
          </div>
          <p style={{ ...styles.mutedTextSm, lineHeight: 1.5, margin: '0 0 14px' }}>
            Phone, email, and loan terms unlock after paid Pro activation.
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {card.products.map((product) => (
              <span key={product} style={styles.badgeRegional}>{product}</span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function LenderCard({
  lender,
  localState,
}: {
  lender: Lender;
  /** Currently filtered state, used to flag lenders headquartered in it. */
  localState: string;
}) {
  const products = lender.loan_products.map(productLabel);
  const isLocal = !!localState && lender.state === localState;

  return (
    <div
      className="dgiq-directory-card"
      style={{
        ...styles.card,
        boxShadow: directoryTokens.shadowCard,
      }}
    >
      <div style={{ position: 'absolute', top: 14, right: 14 }}>
        <SaveDirectoryContactButton
          entityType="lender"
          entityId={lender.id}
          snapshot={buildLenderSnapshot({ ...lender, display: lender.display ?? undefined })}
        />
      </div>

      <div style={{ marginBottom: 10, paddingRight: 32 }}>
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
          {isLocal ? (
            <span style={styles.badgeLocal}>Based in {lender.state}</span>
          ) : lender.state && !lender.nationwide ? (
            <span style={styles.badgeRegional}>HQ {lender.state}</span>
          ) : null}
          {lender.credit_check_policy === 'none' && (
            <span style={styles.badgeNoCredit}>No Credit Check</span>
          )}
          {lender.credit_check_policy === 'soft_pull' && (
            <span style={styles.badgeSoftPull}>Soft Pull Only</span>
          )}
        </div>
        {lender.min_credit_score != null && (
          <div style={styles.creditScoreLine}>
            Min credit: {lender.min_credit_score}
          </div>
        )}
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
                  style={{ color: directoryTokens.link, textDecoration: 'none' }}
                >
                  {lender.domain}
                </a>
              </div>
            )}
          </>
        )}
      </div>

      <div style={styles.termGrid}>
        {lender.display?.loan_range && <TermStat label="Loan size" value={lender.display.loan_range} />}
        {lender.display?.max_ltv && <TermStat label="Max LTV" value={lender.display.max_ltv} />}
        {lender.display?.max_arv && <TermStat label="Max ARV" value={lender.display.max_arv} />}
        {lender.display?.interest_rate && <TermStat label="Rate" value={lender.display.interest_rate} />}
        {lender.display?.term && <TermStat label="Term" value={lender.display.term} />}
        {lender.display?.points && <TermStat label="Points" value={lender.display.points} />}
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

function TermStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCell}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  ...directoryBaseStyles,
  sub: { ...directoryBaseStyles.sub, maxWidth: 720 },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  badgeLocal: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: 'var(--status-positive)', border: '1px solid color-mix(in srgb, var(--status-positive) 55%, transparent)',
    background: 'color-mix(in srgb, var(--status-positive) 12%, transparent)',
  },
  badgeNationwide: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: 'var(--status-warning)', border: '1px solid color-mix(in srgb, var(--status-warning) 45%, transparent)',
    background: 'color-mix(in srgb, var(--status-warning) 8%, transparent)',
  },
  badgeRegional: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: '#C4B5FD', border: '1px solid rgba(196, 181, 253, 0.45)',
    background: 'rgba(196, 181, 253, 0.08)',
  },
  badgeNoCredit: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: 'var(--status-positive)', border: '1px solid color-mix(in srgb, var(--status-positive) 45%, transparent)',
    background: 'color-mix(in srgb, var(--status-positive) 8%, transparent)',
  },
  badgeSoftPull: {
    fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
    color: 'var(--status-info)', border: '1px solid color-mix(in srgb, var(--status-info) 45%, transparent)',
    background: 'color-mix(in srgb, var(--status-info) 8%, transparent)',
  },
  creditScoreLine: {
    fontSize: 11, color: 'var(--text-muted)', marginTop: 6,
  },
  applyLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: 'var(--text-link)', fontWeight: 600, fontSize: 13, textDecoration: 'none',
  },
  termGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  checkbox: {
    position: 'absolute', top: 14, right: 14,
    width: 22, height: 22, border: '1.5px solid',
    borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  exportRow: {
    display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
    marginBottom: 24,
  },
  actionBar: {
    position: 'fixed', bottom: 20, left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 48px)', maxWidth: 720,
    background: 'var(--surface-card)',
    border: '1px solid var(--accent-sky)', borderRadius: 12,
    padding: '12px 16px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    gap: 14, flexWrap: 'wrap',
    boxShadow: 'var(--shadow-dropdown)',
    transition: 'transform 0.25s, opacity 0.25s',
    zIndex: 50,
  },
  actionCount: {
    fontFamily: 'inherit', fontWeight: 700, fontSize: 13, color: 'var(--accent-sky)',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  actionClear: {
    background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, padding: '4px 8px', borderRadius: 5,
  },
  actionBtn: {
    background: 'transparent', color: 'var(--text-heading)', border: '1px solid var(--border-default)',
    borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  actionBtnPrimary: {
    background: 'var(--accent-sky)', color: 'var(--text-inverse)', borderColor: 'var(--accent-sky)',
  },
  actionBtnDisabled: {
    background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)',
    borderRadius: 8, padding: '9px 14px', cursor: 'not-allowed',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.55,
  },
  toast: {
    position: 'fixed', top: 16, left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--surface-card)', border: '1px solid var(--status-positive)', color: 'var(--status-positive)',
    padding: '10px 18px', borderRadius: 9,
    fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 7,
    zIndex: 200, animation: 'dgiq-toast-in 0.25s ease',
  },
  exportBtn: {
    background: 'transparent', color: 'var(--text-heading)',
    border: '1px solid var(--border-default)', borderRadius: 8,
    padding: '7px 12px', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  noticeStrip: {
    margin: '0 0 16px', padding: '10px 14px',
    background: 'color-mix(in srgb, var(--accent-sky) 8%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent-sky) 30%, transparent)',
    borderRadius: 9, fontSize: 13, color: 'var(--text-body)',
  },
} as Record<string, CSSProperties>;
