'use client'

// DealGapIQ — Cash Buyer Directory (Pro members only)

import { useState, useMemo, useRef, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSubscription } from '@/hooks/useSubscription';
import { ApiError, api } from '@/lib/api-client';
import {
  buildBuyersListPath,
  formatBuyerTotal,
  type BuyerListResponse,
  type BuyerStatsResponse,
} from '@/lib/buyers-api';
import buyersData from '@/data/buyers.json';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import {
  Search, MapPin, Phone, Mail, Globe, Lock, CheckCircle2,
  Sparkles, Filter, Printer, FileSpreadsheet,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Safe preview metadata only. Full buyer records are fetched from the paid API.
// -----------------------------------------------------------------------------

const PREVIEW_BUYER_COUNT_FALLBACK = '2,800+';
const PREVIEW_CARDS = [
  { initials: 'PB', accent: '#0EA5E9', title: 'Verified Palm Beach Buyer', strategies: ['Fix & Flip', 'Buy & Hold'] },
  { initials: 'FL', accent: '#A78BFA', title: 'Statewide Cash Buyer', strategies: ['Wholesale', 'BRRRR'] },
  { initials: 'SF', accent: '#FACC15', title: 'South Florida Investor', strategies: ['Fix & Flip'] },
];

const BUYERS = buyersData as Array<{ state: string }>;

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);

const STATES = Array.from(
  new Set(
    BUYERS
      .map((b) => b.state)
      .filter((s) => s && US_STATES.has(s))
  )
).sort();

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

// -----------------------------------------------------------------------------
// CSV helpers — RFC 4180 escaping
// -----------------------------------------------------------------------------

function csvField(v: unknown) {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

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
    setSelected(new Set());
  };

  const selectedBuyers = buyers.filter(b => selected.has(b.id));

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
          description: 'Full contact info, verified deal counts, and direct outreach are available to paid Pro subscribers.',
          cta: 'Upgrade to paid Pro',
          onClick: () => setUpgradeModalOpen(true),
          footnote: 'This paid-only feature starts billing immediately.',
        };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAllFiltered = () => {
    const allSelected = buyers.length > 0 && buyers.every(b => selected.has(b.id));
    const next = new Set(selected);
    if (allSelected) buyers.forEach(b => next.delete(b.id));
    else buyers.forEach(b => next.add(b.id));
    setSelected(next);
  };

  const clearSelected = () => setSelected(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const downloadCSV = () => {
    if (selectedBuyers.length === 0) return;
    const headers = ['Company', 'Owner', 'Street', 'City', 'State', 'Zip', 'Phone', 'Email', 'Website',
      'Strategies', 'Coverage', 'Years Active', 'Deals (12mo)', 'Response Time', 'Description'];
    const lines = [headers.map(csvField).join(',')];
    selectedBuyers.forEach(b => {
      lines.push([b.company, b.owner, b.street, b.city, b.state, b.zip, b.phone, b.email, b.website,
        b.strategies.join('; '), b.coverage.join('; '), b.years, b.deals, b.response, b.description]
        .map(csvField).join(','));
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `dealgapiq-cash-buyers-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast(`${selectedBuyers.length} buyer${selectedBuyers.length > 1 ? 's' : ''} exported`);
  };

  const printSelected = () => {
    if (selectedBuyers.length === 0 || !printAreaRef.current) return;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
      <div class="print-header">
        <h2 class="print-title">DealGapIQ — Cash Buyer Directory</h2>
        <div class="print-meta">${selectedBuyers.length} ${selectedBuyers.length === 1 ? 'buyer' : 'buyers'} · Generated ${date}</div>
      </div>
      ${selectedBuyers.map(b => `
        <div class="print-card">
          <div class="pc-head">
            <div class="pc-avatar">${b.initials}</div>
            <div class="pc-info">
              <h3>${b.company}</h3>
              <p>${b.owner} · Verified Local Buyer</p>
            </div>
          </div>
          <div class="pc-desc">${b.description}</div>
          <div class="pc-stats">
            <div class="pc-stat"><div class="l">Deals (12mo)</div><div class="v">${b.deals}</div></div>
            <div class="pc-stat"><div class="l">Years Active</div><div class="v">${b.years}</div></div>
            <div class="pc-stat"><div class="l">Response</div><div class="v">${b.response}</div></div>
            <div class="pc-stat"><div class="l">Strategies</div><div class="v" style="font-size:11px;font-weight:600">${b.strategies.join(', ')}</div></div>
          </div>
          <div class="pc-row"><strong>Address:</strong> ${b.street}, ${b.city}, ${b.state} ${b.zip}</div>
          <div class="pc-row"><strong>Phone:</strong> ${b.phone}</div>
          <div class="pc-row"><strong>Email:</strong> ${b.email}</div>
          <div class="pc-row"><strong>Website:</strong> ${b.website}</div>
          <div class="pc-row"><strong>Coverage:</strong> ${b.coverage.join(', ')}</div>
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
      {/* Print stylesheet — formats selected cards for paper/PDF when window.print() fires */}
      <style>{`
        @keyframes dgiq-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .dgiq-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .dgiq-card:hover { border-color: #4b5563; }
        .dgiq-card.selected { border-color: #0EA5E9 !important; box-shadow: inset 0 0 0 1px #0EA5E9; }
        .dgiq-input:focus, .dgiq-select:focus { outline: none; border-color: #0EA5E9 !important; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
        .dgiq-btn-press { transition: all 0.15s ease; }
        .dgiq-btn-press:active { transform: scale(0.97); }

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
          .dgiq-print-area .pc-head { display: flex; gap: 12px; margin-bottom: 8px; }
          .dgiq-print-area .pc-avatar { width: 44px; height: 44px; border-radius: 8px; background: #0EA5E9; color: #fff; display: flex; align-items: center; justify-content: center; font: 700 14px 'DM Sans', sans-serif; flex-shrink: 0; }
          .dgiq-print-area .pc-info h3 { font: 700 14px 'DM Sans', sans-serif; color: #1B2141; margin: 0 0 2px; }
          .dgiq-print-area .pc-info p { font: 12px 'DM Sans', sans-serif; color: #555; margin: 0; }
          .dgiq-print-area .pc-desc { font: 11px 'DM Sans', sans-serif; color: #333; line-height: 1.5; margin: 8px 0; }
          .dgiq-print-area .pc-stats { display: flex; gap: 16px; padding: 8px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 8px 0; }
          .dgiq-print-area .pc-stat { flex: 1; }
          .dgiq-print-area .pc-stat .l { font: 8px 'DM Sans', sans-serif; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
          .dgiq-print-area .pc-stat .v { font: 700 14px 'DM Sans', sans-serif; color: #1B2141; }
          .dgiq-print-area .pc-row { display: flex; gap: 16px; font: 11px 'DM Sans', sans-serif; color: #333; margin: 4px 0; }
          .dgiq-print-area .pc-row strong { color: #1B2141; min-width: 70px; display: inline-block; }
          .dgiq-print-area .print-footer { position: fixed; bottom: 0.25in; left: 0; right: 0; text-align: center; font: 9px 'Space Mono', monospace; color: #6b7280; }
        }
      `}</style>


      <div style={styles.container}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={styles.eyebrow}>
            <div style={styles.eyebrowDot} />
            <span>DealGapIQ / Directory</span>
          </div>
          <h1 style={styles.h1}>
            Cash Buyer <span style={{ color: '#0EA5E9' }}>Directory</span>
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
                background: searchMode === mode ? '#0EA5E9' : 'transparent',
                color: searchMode === mode ? '#000' : '#9ca3af',
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
            <Filter size={14} style={{ color: '#6b7280' }} />
            <span style={styles.filterLabel}>Strategy</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STRATEGIES.map(s => (
                <button key={s} onClick={() => setStrategyFilter(s)} style={{
                  ...styles.chip,
                  background: strategyFilter === s ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                  color: strategyFilter === s ? '#0EA5E9' : '#9ca3af',
                  borderColor: strategyFilter === s ? '#0EA5E9' : '#1f2937',
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
            <span style={{ fontSize: 14, color: '#9ca3af' }}>
              verified buyers {appliedSearch.mode === 'city' && appliedSearch.city ? `in ${appliedSearch.city}, ${appliedSearch.stateCode}` :
                appliedSearch.mode === 'county' && appliedSearch.county ? `in ${canonicalCountyName(appliedSearch.county)} County` :
                appliedSearch.mode === 'zip' && appliedSearch.zip ? `near ${appliedSearch.zip}` : 'nationwide'}
            </span>
          </div>
          {hasPaidAccess && buyers.length > 0 && (
            <button onClick={selectAllFiltered} style={styles.selectAllBtn}>
              <CheckCircle2 size={14} />
              {buyers.length > 0 && buyers.every(b => selected.has(b.id)) ? 'Clear all' : 'Select all'}
            </button>
          )}
          {!hasPaidAccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#FACC15' }}>
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
              <BuyerCard key={b.id} buyer={b} selected={selected.has(b.id)} onToggle={() => toggleSelect(b.id)} />
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
                <div style={styles.gateIcon}><Lock size={24} color="#fff" /></div>
                <div style={styles.gateEyebrow}>{gateCopy.eyebrow}</div>
                <h2 style={styles.gateTitle}>{gateCopy.title}</h2>
                <p style={styles.gateDesc}>
                  {gateCopy.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
                  {['Phone, email, and website for every buyer',
                    'Verified deal volume (last 12 months)',
                    'Coverage by county and zip code',
                    'Direct download to CSV or Excel'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#d1d5db' }}>
                      <CheckCircle2 size={16} style={{ color: '#0EA5E9', flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <button onClick={gateCopy.onClick} className="dgiq-btn-press" style={styles.gateBtn}>
                  <Sparkles size={16} /> {gateCopy.cta}
                </button>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{gateCopy.footnote}</div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <div style={{
          ...styles.actionBar,
          transform: selected.size > 0 ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(calc(100% + 20px))',
          opacity: selected.size > 0 ? 1 : 0,
          pointerEvents: selected.size > 0 ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={styles.actionCount}>
              <CheckCircle2 size={14} /> {selected.size} selected
            </span>
            <button onClick={clearSelected} style={styles.actionClear}>Clear</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={downloadCSV} style={styles.actionBtn}>
              <FileSpreadsheet size={14} /> Download CSV
            </button>
            <button onClick={printSelected} style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}>
              <Printer size={14} /> Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Print render target — populated on print, cleared after */}
      <div ref={printAreaRef} className="dgiq-print-area" />

      {/* Toast */}
      {toast && (
        <div style={styles.toast}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

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

function BuyerCard({ buyer, selected, onToggle }: { buyer: Buyer; selected: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className={`dgiq-card${selected ? ' selected' : ''}`} style={styles.card}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${buyer.accent}, transparent)`,
        opacity: 0.5,
      }} />

      {/* Checkbox */}
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
            <CheckCircle2 size={13} style={{ color: '#0EA5E9', flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{buyer.owner}</div>
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
        <div style={{ fontSize: 12, color: '#d1d5db' }}>{buyer.coverage.join(' · ')}</div>
      </div>

      {/* Contact */}
      <div style={{ paddingTop: 12, borderTop: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
          <MapPin size={13} style={{ marginTop: 2, flexShrink: 0, color: '#6b7280' }} />
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
        <div key={index} style={{ ...styles.card, minHeight: 280, opacity: 0.55 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#111827', marginBottom: 16 }} />
          <div style={{ height: 16, width: '60%', background: '#111827', borderRadius: 999, marginBottom: 10 }} />
          <div style={{ height: 12, width: '40%', background: '#111827', borderRadius: 999, marginBottom: 20 }} />
          <div style={{ height: 64, background: '#111827', borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 44, background: '#111827', borderRadius: 8 }} />
        </div>
      ))}
    </>
  );
}

function PreviewBuyerCards() {
  return (
    <>
      {PREVIEW_CARDS.map(card => (
        <div key={card.title} style={styles.card}>
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
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Paid Pro contact</div>
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

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div style={{ background: '#000', padding: '8px 10px', borderRadius: 7, textAlign: 'center' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#6b7280',
        letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: small ? 12 : 14, fontWeight: 700,
        color: '#fff', letterSpacing: '-0.02em',
      }}>{value}</div>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0', fontSize: 12, color: '#d1d5db' }}>
      <span style={{ color: '#6b7280' }}>{icon}</span>
      <span>{value}</span>
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
  sub: { fontSize: 17, color: '#9ca3af', maxWidth: 640, lineHeight: 1.5, margin: 0 },
  panel: {
    background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
    border: '1px solid #1f2937', borderRadius: 14, padding: 20, marginBottom: 20,
  },
  tabs: {
    display: 'inline-flex', gap: 4, marginBottom: 18, padding: 4,
    background: '#000', borderRadius: 10, border: '1px solid #1f2937',
  },
  tab: {
    border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
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
  searchBtn: {
    background: '#0EA5E9', color: '#000', border: 'none',
    padding: '12px 24px', borderRadius: 9, cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 700, fontSize: 14, letterSpacing: 0.3,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  filterRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 18,
    paddingTop: 18, borderTop: '1px solid #1f2937',
  },
  filterLabel: {
    fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#6b7280',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  chip: {
    border: '1px solid', padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
  },
  countStrip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 18, padding: '0 4px',
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
    border: '1px solid #1f2937', borderRadius: 14, padding: 18,
    position: 'relative', overflow: 'hidden', cursor: 'pointer',
  },
  checkbox: {
    position: 'absolute', top: 14, right: 14,
    width: 22, height: 22, border: '1.5px solid',
    borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  cardDesc: { fontSize: 13, color: '#d1d5db', lineHeight: 1.55, margin: '0 0 14px' },
  statStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
    background: '#1f2937', borderRadius: 8, padding: 1, marginBottom: 14,
  },
  miniLabel: {
    fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#6b7280',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
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
  loadMoreWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadMoreBtn: {
    background: 'transparent',
    color: '#0EA5E9',
    border: '1px solid rgba(14, 165, 233, 0.35)',
    borderRadius: 9,
    padding: '10px 18px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
  },
  gateWrap: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 32, pointerEvents: 'auto',
  },
  gateCard: {
    maxWidth: 480, width: '100%',
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
    marginBottom: 10,
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
