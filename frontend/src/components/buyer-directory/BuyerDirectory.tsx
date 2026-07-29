'use client'

// DealGapIQ — Cash Buyer Directory (Pro members only)

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useDirectoryList } from '@/hooks/useDirectoryList';
import { trackActivation } from '@/lib/eventTracking';
import { ApiError, api } from '@/lib/api-client';
import {
  buildBuyersExportPath,
  buildBuyersListPath,
  formatBuyerTotal,
  type Buyer,
  type BuyerListResponse,
  type BuyerStatsResponse,
} from '@/lib/buyers-api';
import { runDirectoryExport } from '@/lib/directory-export-client';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { SaveDirectoryContactButton } from '@/components/SaveDirectoryContactButton';
import { buildBuyerSnapshot } from '@/types/savedDirectoryContact';
import {
  Search, MapPin, Phone, Mail, Globe, Lock, CheckCircle2, Filter,
} from 'lucide-react';
import {
  DIRECTORY_BASE_CSS,
  directoryBaseStyles,
  directoryTokens,
} from '@/components/directory/directoryStyles';
import { DirectoryCardSkeletons } from '@/components/directory/DirectoryCardSkeletons';
import { DirectoryField } from '@/components/directory/DirectoryField';
import { DirectoryGate, type DirectoryGateSpec } from '@/components/directory/DirectoryGate';

// -----------------------------------------------------------------------------
// Safe preview metadata only. Full buyer records are fetched from the paid API.
// -----------------------------------------------------------------------------

const PREVIEW_BUYER_COUNT_FALLBACK = '2,800+';
const PREVIEW_CARDS = [
  { initials: 'PB', accent: '#0EA5E9', title: 'Verified Palm Beach Buyer', strategies: ['Fix & Flip', 'Buy & Hold'] },
  { initials: 'FL', accent: '#A78BFA', title: 'Statewide Cash Buyer', strategies: ['Wholesale', 'BRRRR'] },
  { initials: 'SF', accent: '#FACC15', title: 'South Florida Investor', strategies: ['Fix & Flip'] },
];

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);

const STATES = Array.from(US_STATES).sort();

const STRATEGIES = ['all', 'Fix & Flip', 'BRRRR', 'Buy & Hold', 'Wholesale'] as const;
// Server page ceiling is 25 (gating plan spec).
const PAGE_SIZE = 25;

type SearchMode = 'city' | 'county' | 'zip';
type StrategyFilter = (typeof STRATEGIES)[number];

const GATE_SPEC: DirectoryGateSpec = {
  records: 'verified cash buyers',
  directoryName: 'buyer directory',
  entity: 'buyer',
  bullets: [
    'Phone, email, and website for every buyer',
    'Verified deal volume (last 12 months)',
    'Coverage by county and zip code',
    'Save buyers to your dashboard for quick access',
  ],
};

const selectBuyers = (page: BuyerListResponse) => page.buyers;

/** Tidies the user's own county input for the result label: "duval county" → "Duval". */
function formatCountyLabel(value: string) {
  return value
    .trim()
    .replace(/\s+county$/i, '')
    .replace(/\b[a-z]/g, char => char.toUpperCase());
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BuyerDirectory() {
  const router = useRouter();

  const [searchMode, setSearchMode] = useState<SearchMode>('city');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [county, setCounty] = useState('');
  const [zip, setZip] = useState('');
  // No location default: the first view is nationwide, ranked by deal volume.
  const [appliedSearch, setAppliedSearch] = useState({
    mode: 'city' as SearchMode,
    city: '',
    stateCode: '',
    county: '',
    zip: '',
  });
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const {
    records: buyers,
    total: listTotal,
    isLoading: buyersLoading,
    isError: buyersErrored,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    viewForbidden,
    hasAccess,
    isTrialing,
    isAuthenticated,
    subscriptionLoading,
  } = useDirectoryList<BuyerListResponse, Buyer>({
    queryKey: ['buyers', appliedSearch, strategyFilter],
    buildPath: (page) => buildBuyersListPath(appliedSearch, strategyFilter, page, PAGE_SIZE),
    selectRecords: selectBuyers,
  });

  // North-star activation: a signed-in user engaging the proprietary cash-buyer
  // directory is a strong "aha"/intent signal (deduped per device).
  useEffect(() => {
    if (isAuthenticated) trackActivation('buyer_directory');
  }, [isAuthenticated]);

  const { data: statsData } = useQuery({
    queryKey: ['buyer-directory-stats'],
    queryFn: async (): Promise<BuyerStatsResponse> => {
      try {
        return await api.get<BuyerStatsResponse>('/api/buyers/stats');
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === 'PRO_REQUIRED' &&
          typeof error.detail?.total === 'number'
        ) {
          return { total: error.detail.total, byState: [] };
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !subscriptionLoading,
    retry: false,
  });

  const directoryTotal = statsData?.total;
  const displayTotalLabel =
    typeof directoryTotal === 'number' ? formatBuyerTotal(directoryTotal) : PREVIEW_BUYER_COUNT_FALLBACK;
  const stateOptions = STATES;

  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'print' | null>(null);

  const handleExport = async (fmt: 'csv' | 'print') => {
    setExporting(fmt);
    setExportNotice(null);
    const result = await runDirectoryExport(
      buildBuyersExportPath(appliedSearch, strategyFilter, fmt),
      fmt,
      'dealgapiq-buyers.csv',
    );
    if (!result.ok) setExportNotice(result.message);
    setExporting(null);
  };

  const runSearch = () => {
    setAppliedSearch({ mode: searchMode, city, stateCode, county, zip });
  };

  const displayCount = hasAccess ? listTotal : displayTotalLabel;

  const openSignIn = () => {
    router.push('/directory?auth=required&redirect=/directory');
  };

  return (
    <div style={styles.page}>
      <style>{DIRECTORY_BASE_CSS}</style>


      <div style={styles.container}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={styles.eyebrow}>
            <div style={styles.eyebrowDot} />
            <span>DealGapIQ / Directory</span>
          </div>
          <h1 style={styles.h1}>
            Cash Buyer <span style={{ color: directoryTokens.accent }}>Directory</span>
          </h1>
          <p style={styles.sub}>
            Verified fix-and-flippers, BRRRR buyers, and active investors across every major U.S. market.
            Skip the cold outreach — search by city, county, or zip and connect direct.
          </p>
        </div>

        {/* Search panel */}
        <div style={styles.panel}>
          <div style={styles.tabs}>
            {(['city', 'county', 'zip'] as const).map((mode) => (
              <button key={mode} onClick={() => setSearchMode(mode)} className="dgiq-btn-press" style={{
                ...styles.tab,
                background: searchMode === mode ? directoryTokens.accent : 'transparent',
                color: searchMode === mode ? directoryTokens.accentOnAccent : directoryTokens.secondary,
              }}>
                {mode === 'city' ? 'City + State' : mode === 'county' ? 'County' : 'Zip Code'}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
          >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
            <div style={{ display: 'grid', gridTemplateColumns: searchMode === 'city' ? '1fr 140px' : '1fr', gap: 12 }}>
              {searchMode === 'city' && (
                <>
                  <DirectoryField label="City" controlId="buyer-city" icon={<MapPin size={16} />}>
                    <input id="buyer-city" className="dgiq-input" style={styles.input}
                      value={city} onChange={e => setCity(e.target.value)} placeholder="Tampa, Miami, Orlando..." />
                  </DirectoryField>
                  <DirectoryField label="State" controlId="buyer-state">
                    <select id="buyer-state" className="dgiq-select" style={styles.select}
                      value={stateCode} onChange={e => setStateCode(e.target.value)}>
                      <option value="">All states</option>
                      {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </DirectoryField>
                </>
              )}
              {searchMode === 'county' && (
                <DirectoryField label="County name" controlId="buyer-county" icon={<MapPin size={16} />}>
                  <input id="buyer-county" className="dgiq-input" style={styles.input}
                    value={county} onChange={e => setCounty(e.target.value)} placeholder="Hillsborough, Broward, Palm Beach..." />
                </DirectoryField>
              )}
              {searchMode === 'zip' && (
                <DirectoryField label="Zip code" controlId="buyer-zip" icon={<MapPin size={16} />}>
                  <input id="buyer-zip" className="dgiq-input" style={styles.input}
                    value={zip} onChange={e => setZip(e.target.value)} placeholder="33602" maxLength={5} />
                </DirectoryField>
              )}
            </div>
            <button type="submit" className="dgiq-btn-press" style={styles.searchBtn}>
              <Search size={16} /> Search
            </button>
          </div>
          </form>

          {/* Strategy filter */}
          <div style={styles.filterRow}>
            <Filter size={14} style={{ color: directoryTokens.muted }} />
            <span style={styles.filterLabel}>Strategy</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STRATEGIES.map(s => (
                <button key={s} onClick={() => setStrategyFilter(s)} style={{
                  ...styles.chip,
                  background: strategyFilter === s ? 'color-mix(in srgb, var(--accent-sky) 15%, transparent)' : 'transparent',
                  color: strategyFilter === s ? directoryTokens.accent : directoryTokens.secondary,
                  borderColor: strategyFilter === s ? directoryTokens.accent : directoryTokens.border,
                }}>
                  {s === 'all' ? 'All Strategies' : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Count strip */}
        <div style={styles.countStrip}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={styles.countNum}>{displayCount}</span>
            <span style={styles.mutedTextMd}>
              verified buyers {appliedSearch.mode === 'city' && appliedSearch.city ? `in ${appliedSearch.city}, ${appliedSearch.stateCode}` :
                appliedSearch.mode === 'county' && appliedSearch.county ? `in ${formatCountyLabel(appliedSearch.county)} County` :
                appliedSearch.mode === 'zip' && appliedSearch.zip ? `near ${appliedSearch.zip}` : 'nationwide'}
            </span>
          </div>
          {hasAccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={styles.mutedTextSm}>
                Save buyers to your dashboard for quick access later
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

        {/* Cards grid (with Pro gate overlay) */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
            filter: hasAccess ? 'none' : 'blur(8px)',
            pointerEvents: hasAccess ? 'auto' : 'none',
            userSelect: hasAccess ? 'auto' : 'none',
            transition: 'filter 0.4s ease',
          }}>
            {hasAccess && buyersLoading && <DirectoryCardSkeletons />}
            {hasAccess && buyersErrored && !viewForbidden && (
              <div style={styles.emptyState}>Could not load buyer directory. Refresh and try again.</div>
            )}
            {hasAccess && !buyersLoading && !buyersErrored && buyers.length === 0 && (
              <div style={styles.emptyState}>No buyers found. Try a nearby city, county, or zip code.</div>
            )}
            {hasAccess && !buyersLoading && !buyersErrored && buyers.map(b => (
              <BuyerCard key={b.id} buyer={b} />
            ))}
            {!hasAccess && <PreviewBuyerCards />}
          </div>
          {hasAccess && !buyersLoading && !buyersErrored && hasNextPage && (
            <div style={styles.loadMoreWrap}>
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="dgiq-btn-press"
                style={styles.loadMoreBtn}
              >
                {isFetchingNextPage
                  ? 'Loading…'
                  : `Load more buyers (${buyers.length} of ${listTotal})`}
              </button>
            </div>
          )}

          {/* Pro upgrade overlay */}
          {!subscriptionLoading && !hasAccess && (
            <DirectoryGate
              spec={GATE_SPEC}
              totalLabel={displayTotalLabel}
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
        returnTo="/directory"
        paidOnlyFeature="Cash Buyer Directory"
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function BuyerCard({ buyer }: { buyer: Buyer }) {
  return (
    <div className="dgiq-directory-card" style={styles.card}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${buyer.accent}, transparent)`,
        opacity: 0.5,
      }} />

      <div style={{ position: 'absolute', top: 14, right: 14 }}>
        <SaveDirectoryContactButton
          entityType="buyer"
          entityId={buyer.id}
          snapshot={buildBuyerSnapshot(buyer)}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14, paddingRight: 32 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${buyer.accent}2E`, border: `1px solid ${buyer.accent}4D`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 13, color: buyer.accent,
          flexShrink: 0,
        }}>
          {buyer.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{buyer.company}</h3>
            <CheckCircle2 size={13} style={{ color: directoryTokens.accent, flexShrink: 0 }} />
          </div>
          <div style={styles.mutedTextSm}>{buyer.owner}</div>
        </div>
      </div>

      <p style={styles.cardDesc}>{buyer.description}</p>

      {/* Stat strip */}
      <div style={styles.statStrip}>
        <Stat label="Deals (12mo)" value={buyer.deals} />
        <Stat label="Years" value={buyer.years} />
        <Stat label="Response" value={buyer.response} small />
      </div>

      {/* Strategies */}
      <div style={{ marginBottom: 14 }}>
        <div style={styles.miniLabel}>Buys</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {buyer.strategies.map(s => (
            <span key={s} style={styles.strategyChip}>{s}</span>
          ))}
        </div>
      </div>

      {/* Coverage */}
      <div style={{ marginBottom: 14 }}>
        <div style={styles.miniLabel}>Coverage</div>
        <div style={{ fontSize: 12, color: directoryTokens.body }}>{buyer.coverage.join(' · ')}</div>
      </div>

      {/* Contact */}
      <div style={{ paddingTop: 12, borderTop: `1px solid ${directoryTokens.border}` }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, fontSize: 12, color: directoryTokens.secondary, lineHeight: 1.5 }}>
          <MapPin size={13} style={{ marginTop: 2, flexShrink: 0, color: directoryTokens.muted }} />
          <div>{buyer.street}<br />{buyer.city}, {buyer.state} {buyer.zip}</div>
        </div>
        <ContactRow icon={<Phone size={12} />} value={buyer.phone} />
        <ContactRow icon={<Mail size={12} />} value={buyer.email} />
        <ContactRow icon={<Globe size={12} />} value={buyer.website} />
      </div>
    </div>
  );
}

function PreviewBuyerCards() {
  return (
    <>
      {PREVIEW_CARDS.map(card => (
        <div key={card.title} className="dgiq-directory-card" style={styles.card}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)`,
            opacity: 0.5,
          }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: `${card.accent}2E`, border: `1px solid ${card.accent}4D`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 13, color: card.accent,
              flexShrink: 0,
            }}>
              {card.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 3px' }}>{card.title}</h3>
              <div style={styles.mutedTextSm}>Paid Pro contact</div>
            </div>
          </div>
          <p style={styles.cardDesc}>
            Verified acquisition criteria, county coverage, direct phone, email, and response data unlock after paid Pro activation.
          </p>
          <div style={styles.statStrip}>
            <Stat label="Deals (12mo)" value="Paid" small />
            <Stat label="Years" value="Pro" small />
            <Stat label="Response" value="Only" small />
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {card.strategies.map(s => (
              <span key={s} style={styles.strategyChip}>{s}</span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div style={{ ...styles.statCell, textAlign: 'center' }}>
      <div style={{ ...styles.statLabel, letterSpacing: 0.7, marginBottom: 3 }}>{label}</div>
      <div style={{ ...styles.statValue, fontSize: small ? 12 : 14 }}>{value}</div>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div style={styles.contactRow}>
      <span style={{ color: directoryTokens.muted }}>{icon}</span>
      <span>{value}</span>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  ...directoryBaseStyles,
  sub: { ...directoryBaseStyles.sub, maxWidth: 640 },
  tabs: {
    display: 'inline-flex', gap: 4, marginBottom: 18, padding: 4,
    background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-default)',
  },
  tab: {
    border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
  },
  searchBtn: {
    background: 'var(--accent-sky)', color: 'var(--text-inverse)', border: 'none',
    padding: '12px 24px', borderRadius: 9, cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 700, fontSize: 14, letterSpacing: 0.3,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  filterRow: {
    ...directoryBaseStyles.filterRow,
    marginTop: 18,
    paddingTop: 18,
  },
  filterLabel: {
    fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--text-label)',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  chip: {
    border: '1px solid', padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
  },
  countStrip: {
    ...directoryBaseStyles.countStrip,
    flexWrap: 'nowrap',
    gap: 0,
  },
  card: {
    ...directoryBaseStyles.card,
    cursor: 'pointer',
  },
  checkbox: {
    position: 'absolute', top: 14, right: 14,
    width: 22, height: 22, border: '1.5px solid',
    borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  statStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
    background: 'var(--border-default)', borderRadius: 8, padding: 1, marginBottom: 14,
  },
  loadMoreWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadMoreBtn: {
    background: 'transparent',
    color: 'var(--accent-sky)',
    border: '1px solid color-mix(in srgb, var(--accent-sky) 35%, transparent)',
    borderRadius: 9,
    padding: '10px 18px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
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
