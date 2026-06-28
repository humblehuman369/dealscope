'use client'

// DealGapIQ — Cash Buyer Directory (Pro members only)

import { useEffect, useState, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSubscription } from '@/hooks/useSubscription';
import { trackActivation } from '@/lib/eventTracking';
import { ApiError, api } from '@/lib/api-client';
import {
  buildBuyersListPath,
  formatBuyerTotal,
  type BuyerListResponse,
  type BuyerStatsResponse,
} from '@/lib/buyers-api';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { SaveDirectoryContactButton } from '@/components/SaveDirectoryContactButton';
import { buildBuyerSnapshot } from '@/types/savedDirectoryContact';
import {
  Search, MapPin, Phone, Mail, Globe, Lock, CheckCircle2,
  Sparkles, Filter,
} from 'lucide-react';
import {
  DIRECTORY_BASE_CSS,
  directoryBaseStyles,
  directoryTokens,
} from '@/components/directory/directoryStyles';

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
const PAGE_SIZE = 60;

// Local county lookups keep the mock directory behaving like market search until
// the backend exposes geocoded county metadata for each query.
const CITY_TO_COUNTY_BY_STATE: Record<string, Record<string, string>> = {
  FL: {
    'boca raton': 'Palm Beach',
    'boynton beach': 'Palm Beach',
    'delray beach': 'Palm Beach',
    'fort lauderdale': 'Broward',
    hollywood: 'Broward',
    jacksonville: 'Duval',
    melbourne: 'Brevard',
    miami: 'Miami-Dade',
    'north miami beach': 'Miami-Dade',
    orlando: 'Orange',
    'palm beach': 'Palm Beach',
    tampa: 'Hillsborough',
    'west palm beach': 'Palm Beach',
  },
};

const ZIP_TO_COUNTY_BY_STATE: Record<string, Record<string, string>> = {
  FL: {
    '32202': 'Duval',
    '32803': 'Orange',
    '32901': 'Brevard',
    '33021': 'Broward',
    '33142': 'Miami-Dade',
    '33162': 'Miami-Dade',
    '33309': 'Broward',
    '33432': 'Palm Beach',
    '33602': 'Hillsborough',
    '33609': 'Hillsborough',
  },
};

const ZIP_PREFIX_TO_COUNTY_BY_STATE: Record<string, Record<string, string>> = {
  FL: {
    '322': 'Duval',
    '328': 'Orange',
    '329': 'Brevard',
    '330': 'Broward',
    '331': 'Miami-Dade',
    '333': 'Broward',
    '334': 'Palm Beach',
    '336': 'Hillsborough',
  },
};

type SearchMode = 'city' | 'county' | 'zip';
type StrategyFilter = (typeof STRATEGIES)[number];

interface Buyer {
  id: number;
  initials: string;
  accent: string;
  company: string;
  owner: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  coverage: string[];
  description: string;
  deals: number;
  years: number;
  response: string;
  strategies: string[];
}

const KNOWN_COUNTIES = [
  'Brevard',
  'Broward',
  'Duval',
  'Hillsborough',
  'Indian River',
  'Lake',
  'Manatee',
  'Martin',
  'Miami-Dade',
  'Nassau',
  'Orange',
  'Palm Beach',
  'Pasco',
  'Pinellas',
  'Polk',
  'Seminole',
  'St. Johns',
  'St. Lucie',
  'Volusia',
];

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCountyName(value: string) {
  return normalizeSearchValue(value).replace(/\s+county$/, '');
}

function canonicalCountyName(value: string) {
  const normalized = normalizeCountyName(value);
  if (!normalized) return '';

  return KNOWN_COUNTIES.find(county => normalizeCountyName(county) === normalized) ?? value.trim().replace(/\s+county$/i, '');
}

function countyMatches(county: string, query: string) {
  const countyName = normalizeCountyName(county);
  const queryName = normalizeCountyName(query);
  return !!queryName && (countyName === queryName || countyName.includes(queryName));
}

function buyerCoversCounty(buyer: Buyer, county: string) {
  return buyer.coverage.some(coverageCounty => countyMatches(coverageCounty, county));
}

function getStaticCountyForCity(cityName: string, state: string) {
  const normalizedCity = normalizeSearchValue(cityName);
  if (!normalizedCity) return '';

  const cityMap = CITY_TO_COUNTY_BY_STATE[state] ?? {};
  if (cityMap[normalizedCity]) return cityMap[normalizedCity];

  const matchedCounties = Array.from(new Set(
    Object.entries(cityMap)
      .filter(([city]) => city.includes(normalizedCity) || normalizedCity.includes(city))
      .map(([, county]) => county),
  ));

  return matchedCounties.length === 1 ? matchedCounties[0] : '';
}

function getStaticCountyForZip(zipCode: string) {
  const zip = zipCode.trim();
  if (!zip) return '';

  for (const countiesByState of Object.values(ZIP_TO_COUNTY_BY_STATE)) {
    if (countiesByState[zip]) return countiesByState[zip];
  }

  if (zip.length < 3) return '';

  const prefix = zip.slice(0, 3);
  for (const countiesByState of Object.values(ZIP_PREFIX_TO_COUNTY_BY_STATE)) {
    if (countiesByState[prefix]) return countiesByState[prefix];
  }

  return '';
}

function getCountiesForCity(cityName: string, state: string, buyers: Buyer[]) {
  const normalizedCity = normalizeSearchValue(cityName);
  if (!normalizedCity) return [];

  const counties = new Set<string>();
  const staticCounty = getStaticCountyForCity(cityName, state);
  if (staticCounty) counties.add(staticCounty);

  buyers.forEach(buyer => {
    if (state && buyer.state !== state) return;
    const buyerCity = normalizeSearchValue(buyer.city);
    if (!buyerCity) return;
    if (buyerCity.includes(normalizedCity) || normalizedCity.includes(buyerCity)) {
      buyer.coverage.forEach(county => counties.add(canonicalCountyName(county)));
    }
  });

  return Array.from(counties).filter(Boolean);
}

function getCountiesForZip(zipCode: string, buyers: Buyer[]) {
  const zip = zipCode.trim();
  if (!zip) return { counties: [] as string[], state: '' };

  const counties = new Set<string>();
  const states = new Set<string>();
  const staticCounty = getStaticCountyForZip(zip);
  if (staticCounty) counties.add(staticCounty);

  const matchingBuyers = buyers.filter(buyer => {
    if (!buyer.zip) return false;
    if (buyer.zip.startsWith(zip)) return true;
    return zip.length >= 3 && buyer.zip.startsWith(zip.slice(0, 3));
  });

  matchingBuyers.forEach(buyer => {
    if (buyer.state) states.add(buyer.state);
    buyer.coverage.forEach(county => counties.add(canonicalCountyName(county)));
  });

  return {
    counties: Array.from(counties).filter(Boolean),
    state: states.size === 1 ? Array.from(states)[0] : '',
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BuyerDirectory() {
  const router = useRouter();
  const {
    isPaidPro,
    isTrialing,
    isAuthenticated,
    isLoading: subscriptionLoading,
  } = useSubscription();

  // North-star activation: a signed-in user engaging the proprietary cash-buyer
  // directory is a strong "aha"/intent signal (deduped per device).
  useEffect(() => {
    if (isAuthenticated) trackActivation('buyer_directory');
  }, [isAuthenticated]);

  const [searchMode, setSearchMode] = useState<SearchMode>('city');
  const [city, setCity] = useState('Tampa');
  const [stateCode, setStateCode] = useState('FL');
  const [county, setCounty] = useState('');
  const [zip, setZip] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({
    mode: 'city' as SearchMode,
    city: 'Tampa',
    stateCode: 'FL',
    county: '',
    zip: '',
  });
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

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

  const {
    data: buyerPages,
    isLoading: buyersLoading,
    isError: buyersErrored,
    error: buyersError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['buyers', appliedSearch, strategyFilter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<BuyerListResponse>(
        buildBuyersListPath(appliedSearch, strategyFilter, pageParam, PAGE_SIZE),
      ),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isPaidPro,
    retry: false,
  });

  const buyers = useMemo(
    () => (buyerPages?.pages.flatMap(page => page.buyers) as Buyer[]) ?? [],
    [buyerPages],
  );
  const listTotal = buyerPages?.pages[0]?.total ?? 0;
  const buyerDirectoryForbidden =
    buyersError instanceof ApiError &&
    (buyersError.code === 'PRO_REQUIRED' || buyersError.status === 401);
  const hasPaidAccess = isPaidPro && !buyerDirectoryForbidden;
  const directoryTotal = statsData?.total;
  const displayTotalLabel =
    typeof directoryTotal === 'number' ? formatBuyerTotal(directoryTotal) : PREVIEW_BUYER_COUNT_FALLBACK;
  const stateOptions = STATES;

  const runSearch = () => {
    setAppliedSearch({ mode: searchMode, city, stateCode, county, zip });
  };

  const displayCount = hasPaidAccess ? listTotal : displayTotalLabel;

  const openSignIn = () => {
    router.push('/directory?auth=required&redirect=/directory');
  };

  const gateCopy = !isAuthenticated
    ? {
        eyebrow: 'Sign In Required',
        title: 'Sign in to unlock paid buyer access',
        description: 'Create an account or sign in, then upgrade to paid Pro to view verified cash buyer contacts.',
        cta: 'Sign in to continue',
        onClick: openSignIn,
        footnote: 'Cash Buyer Directory is not included in free trial access.',
      }
    : isTrialing
      ? {
          eyebrow: 'Paid Pro Required',
          title: 'Cash Buyer Directory requires paid Pro',
          description: 'Your 7-day trial does not include buyer contacts. Start a paid Pro subscription now to unlock the directory.',
          cta: 'Start paid Pro now',
          onClick: () => setUpgradeModalOpen(true),
          footnote: 'Trial users keep all other Pro trial features.',
        }
      : {
          eyebrow: 'Paid Pro Required',
          title: `Unlock ${displayTotalLabel} verified buyers`,
          description: 'Full contact info, verified deal counts, and save-to-dashboard are available to paid Pro subscribers.',
          cta: 'Upgrade to paid Pro',
          onClick: () => setUpgradeModalOpen(true),
          footnote: 'This paid-only feature starts billing immediately.',
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
                  <Field label="City" icon={<MapPin size={16} />}>
                    <input className="dgiq-input" style={styles.input}
                      value={city} onChange={e => setCity(e.target.value)} placeholder="Tampa, Miami, Orlando..." />
                  </Field>
                  <Field label="State">
                    <select className="dgiq-select" style={styles.select}
                      value={stateCode} onChange={e => setStateCode(e.target.value)}>
                      {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </>
              )}
              {searchMode === 'county' && (
                <Field label="County name" icon={<MapPin size={16} />}>
                  <input className="dgiq-input" style={styles.input}
                    value={county} onChange={e => setCounty(e.target.value)} placeholder="Hillsborough, Broward, Palm Beach..." />
                </Field>
              )}
              {searchMode === 'zip' && (
                <Field label="Zip code" icon={<MapPin size={16} />}>
                  <input className="dgiq-input" style={styles.input}
                    value={zip} onChange={e => setZip(e.target.value)} placeholder="33602" maxLength={5} />
                </Field>
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
                appliedSearch.mode === 'county' && appliedSearch.county ? `in ${canonicalCountyName(appliedSearch.county)} County` :
                appliedSearch.mode === 'zip' && appliedSearch.zip ? `near ${appliedSearch.zip}` : 'nationwide'}
            </span>
          </div>
          {hasPaidAccess && (
            <div style={styles.mutedTextSm}>
              Save buyers to your dashboard for quick access later
            </div>
          )}
          {!hasPaidAccess && (
            <div style={styles.paidProBadge}>
              <Lock size={14} />
              <span style={{ fontFamily: 'Space Mono, monospace', letterSpacing: 0.5 }}>PAID PRO ONLY</span>
            </div>
          )}
        </div>

        {/* Cards grid (with Pro gate overlay) */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
            filter: hasPaidAccess ? 'none' : 'blur(8px)',
            pointerEvents: hasPaidAccess ? 'auto' : 'none',
            userSelect: hasPaidAccess ? 'auto' : 'none',
            transition: 'filter 0.4s ease',
          }}>
            {hasPaidAccess && buyersLoading && <LoadingBuyerCards />}
            {hasPaidAccess && buyersErrored && (
              <div style={styles.emptyState}>Could not load buyer directory. Refresh and try again.</div>
            )}
            {hasPaidAccess && !buyersLoading && !buyersErrored && buyers.length === 0 && (
              <div style={styles.emptyState}>No buyers found. Try a nearby city, county, or zip code.</div>
            )}
            {hasPaidAccess && !buyersLoading && !buyersErrored && buyers.map(b => (
              <BuyerCard key={b.id} buyer={b} />
            ))}
            {!hasPaidAccess && <PreviewBuyerCards />}
          </div>
          {hasPaidAccess && !buyersLoading && !buyersErrored && hasNextPage && (
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
          {!subscriptionLoading && !hasPaidAccess && (
            <div style={styles.gateWrap}>
              <div style={styles.gateCard}>
                <div style={styles.gateIcon}><Lock size={24} color={directoryTokens.accentOnAccent} /></div>
                <div style={styles.gateEyebrow}>{gateCopy.eyebrow}</div>
                <h2 style={styles.gateTitle}>{gateCopy.title}</h2>
                <p style={styles.gateDesc}>
                  {gateCopy.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
                  {['Phone, email, and website for every buyer',
                    'Verified deal volume (last 12 months)',
                    'Coverage by county and zip code',
                    'Save buyers to your dashboard for quick access'].map(item => (
                    <div key={item} style={styles.gateFeatureRow}>
                      <CheckCircle2 size={16} style={{ color: directoryTokens.accent, flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <button onClick={gateCopy.onClick} className="dgiq-btn-press" style={styles.gateBtn}>
                  <Sparkles size={16} /> {gateCopy.cta}
                </button>
                <div style={styles.footnoteText}>{gateCopy.footnote}</div>
              </div>
            </div>
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

function LoadingBuyerCards() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <div key={index} className="dgiq-directory-card" style={{ ...styles.card, minHeight: 280, opacity: 0.55 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: directoryTokens.surfaceElevated, marginBottom: 16 }} />
          <div style={{ height: 16, width: '60%', background: directoryTokens.surfaceElevated, borderRadius: 999, marginBottom: 10 }} />
          <div style={{ height: 12, width: '40%', background: directoryTokens.surfaceElevated, borderRadius: 999, marginBottom: 20 }} />
          <div style={{ height: 64, background: directoryTokens.surfaceElevated, borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 44, background: directoryTokens.surfaceElevated, borderRadius: 8 }} />
        </div>
      ))}
    </>
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

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={styles.fieldIcon}>{icon}</span>
        )}
        {children}
      </div>
    </div>
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
  gateBtn: {
    ...directoryBaseStyles.gateBtn,
    marginBottom: 10,
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
} as Record<string, CSSProperties>;
