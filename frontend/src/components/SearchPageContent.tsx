'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  Search,
  MapIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { AddressAutocomplete, type AddressComponents } from '@/components/AddressAutocomplete';
import { InfoDialog } from '@/components/ui/ConfirmDialog';
import { trackEvent } from '@/lib/eventTracking';
import type { AddressValidationResult } from '@/types/address';
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env';
import {
  canonicalizeAddressForIdentity,
  isLikelyFullAddress,
  classifyPlaceTypes,
  classifySearchInput,
} from '@/utils/addressIdentity';

// Best-effort client-side geocode via the Google Maps JS Geocoder that
// AddressAutocomplete already loads. Pre-resolving lat/lng/zoom lets Map
// Search open at the correct viewport instead of initializing over Kansas
// and racing a post-mount pan that can leave tiles unrendered.
async function geocodeLocationQuery(
  query: string,
): Promise<{ lat: number; lng: number; zoom: number } | null> {
  if (typeof window === 'undefined') return null;
  const Geocoder = (window as Window & { google?: typeof google }).google?.maps?.Geocoder;
  if (!Geocoder) return null;
  try {
    const geocoder = new Geocoder();
    const { results } = await geocoder.geocode({
      address: query,
      componentRestrictions: { country: 'us' },
    });
    if (!results?.length) return null;
    const r = results[0];
    const loc = r.geometry?.location;
    if (!loc) return null;
    const types: string[] = r.types || [];
    let zoom = 12;
    if (types.includes('postal_code')) zoom = 13;
    else if (types.includes('locality') || types.includes('sublocality')) zoom = 12;
    else if (types.includes('administrative_area_level_2')) zoom = 10;
    else if (types.includes('administrative_area_level_1')) zoom = 7;
    return { lat: loc.lat(), lng: loc.lng(), zoom };
  } catch {
    return null;
  }
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'issues' | 'error' | 'unavailable';

interface SearchPageContentProps {
  onScanProperty?: () => void;
}

export function SearchPageContent({ onScanProperty }: SearchPageContentProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showScanInfo, setShowScanInfo] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null);
  const [placeComponents, setPlaceComponents] = useState<AddressComponents | null>(null);

  const handleMapSearch = () => {
    trackEvent('property_searched', { source: 'search_page', type: 'map_search' });

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const params = new URLSearchParams({
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude),
            zoom: '9',
          });
          router.push(`/map-search?${params.toString()}`);
        },
        () => router.push('/map-search'),
        { timeout: 3000 },
      );
    } else {
      router.push('/map-search');
    }
  };

  const handleScanProperty = () => {
    if (onScanProperty) {
      onScanProperty();
      return;
    }

    if (IS_CAPACITOR) {
      router.push('/?scan=true');
      return;
    }

    // iPadOS reports a Mac UA, so check touch + maxTouchPoints (iPads = 5).
    // Width cap keeps Windows touchscreen laptops from being misidentified.
    const isMobile =
      typeof window !== 'undefined' &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && navigator.maxTouchPoints > 1 && window.innerWidth < 1400));

    if (isMobile) {
      router.push('/?scan=true');
      return;
    }

    setShowScanInfo(true);
  };

  const proceedToVerdict = (
    addressToUse: string,
    components?: { city?: string; state?: string; zipCode?: string } | null,
  ) => {
    trackEvent('property_searched', { source: 'search_page' });
    const canonicalAddress = canonicalizeAddressForIdentity(addressToUse);
    const params = new URLSearchParams({ address: canonicalAddress });
    if (components?.city) params.set('city', components.city);
    if (components?.state) params.set('state', components.state);
    if (components?.zipCode) params.set('zip_code', components.zipCode);
    router.push(`/verdict?${params.toString()}`);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = address.trim();
    if (!raw) return;

    // Anything that isn't a deliverable street address (zip, city, state)
    // routes to Map Search. Google's Address Validation API only accepts
    // postal addresses and would reject these inputs with a misleading
    // "Could not validate address" error.
    const classification = classifySearchInput(raw);
    if (classification !== 'address' && !isLikelyFullAddress(raw)) {
      trackEvent('property_searched', {
        source: 'search_page',
        type: classification === 'zip' ? 'zip' : 'location',
      });

      setValidationStatus('validating');
      const geocoded = await geocodeLocationQuery(raw);

      const params = new URLSearchParams({ label: raw });
      if (geocoded) {
        params.set('lat', String(geocoded.lat));
        params.set('lng', String(geocoded.lng));
        params.set('zoom', String(geocoded.zoom));
      }
      router.push(`/map-search?${params.toString()}`);
      return;
    }

    setValidationStatus('validating');
    setValidationResult(null);

    try {
      const validateUrl = IS_CAPACITOR ? `${WEB_BASE_URL}/api/validate-address` : '/api/validate-address';
      const res = await fetch(validateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: raw }),
      });
      const data = await res.json();

      if (res.status === 503 || (res.ok === false && data?.code === 'VALIDATION_UNAVAILABLE')) {
        if (isLikelyFullAddress(raw)) {
          setValidationStatus('unavailable');
          proceedToVerdict(raw, placeComponents);
        } else {
          setValidationStatus('error');
        }
        return;
      }

      if (!res.ok) {
        if (IS_CAPACITOR && isLikelyFullAddress(raw)) {
          setValidationStatus('unavailable');
          proceedToVerdict(raw, placeComponents);
        } else {
          setValidationStatus('error');
        }
        return;
      }

      const result = data as AddressValidationResult;
      setValidationResult(result);

      if (result.isValid) {
        setValidationStatus('valid');
        const stdAddr = result.standardizedAddress;
        proceedToVerdict(result.formattedAddress || raw, {
          city: stdAddr?.city,
          state: stdAddr?.state,
          zipCode: stdAddr?.zipCode,
        });
        return;
      }

      setValidationStatus('issues');
    } catch (err) {
      console.error('[SearchPageContent] validate-address failed:', err);
      if (IS_CAPACITOR && isLikelyFullAddress(raw)) {
        setValidationStatus('unavailable');
        proceedToVerdict(raw, placeComponents);
      } else {
        setValidationStatus('error');
      }
    }
  };

  const acceptCorrection = () => {
    const formatted = validationResult?.formattedAddress?.trim();
    if (formatted) {
      setAddress(formatted);
      setValidationStatus('idle');
      setValidationResult(null);
    }
  };

  const useAsEntered = () => {
    const entered = canonicalizeAddressForIdentity(address);
    if (!isLikelyFullAddress(entered)) {
      setValidationStatus('issues');
      return;
    }
    proceedToVerdict(entered, placeComponents);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden antialiased">
      {/* Ambient sky glow — matches V3 hero aesthetic */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(15,164,233,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 30%, rgba(4,101,242,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 0% 60%, rgba(139,92,246,0.04) 0%, transparent 50%)',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)' }}
      />

      <main className="relative z-10 px-5 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-sky-400 transition-colors mb-6 sm:mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          {/* Hero */}
          <div className="text-center mb-9 sm:mb-12">
            <div className="inline-flex items-center justify-center mb-4 sm:mb-5">
              <Image
                src="/images/dealgapiq-icon.png"
                alt="DealGapIQ"
                width={72}
                height={72}
                className="w-14 h-14 sm:w-[72px] sm:h-[72px] object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-balance leading-tight">
              Find your next <span className="text-sky-400">deal</span>.
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              Three ways to start. Same <span className="text-white font-semibold">15-second verdict</span> —
              backed by <span className="text-white font-semibold">6 data sources</span>.
            </p>
          </div>

          {/* Three feature cards */}
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3 lg:items-stretch">
            {/* CARD 1 — ENTER ADDRESS (inline input) */}
            <FeatureCard
              icon={<Search className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.25} />}
              title="Enter Address"
              hook="Type any street address, city, or zip. We'll route you to the right tool."
              bullets={[
                'Full street address → instant Verdict',
                'City or zip → opens Map Search there',
                'Live autocomplete from Google',
              ]}
              bestFor="Best for: a specific listing or area you have in mind"
              accentRing
            >
              <form onSubmit={handleAddressSubmit} className="space-y-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10"
                  />
                  <AddressAutocomplete
                    placeholder="Address, city, state, or zip"
                    value={address}
                    onChange={setAddress}
                    searchMode="location"
                    onPlaceSelect={(value, components, meta) => {
                      const placeCategory = meta?.placeTypes
                        ? classifyPlaceTypes(meta.placeTypes).category
                        : 'unknown';

                      if (placeCategory !== 'address' && placeCategory !== 'unknown' && meta?.location) {
                        const { zoom } = classifyPlaceTypes(meta.placeTypes);
                        trackEvent('property_searched', { source: 'search_page', type: placeCategory });
                        const params = new URLSearchParams({
                          lat: String(meta.location.lat),
                          lng: String(meta.location.lng),
                          zoom: String(zoom),
                          label: value,
                        });
                        router.push(`/map-search?${params.toString()}`);
                        return;
                      }

                      setAddress(canonicalizeAddressForIdentity(value));
                      setPlaceComponents(components ?? null);
                    }}
                    name="address"
                    aria-label="Property address"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-white placeholder-slate-500 outline-none transition-colors text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                    {validationStatus === 'validating' && (
                      <Loader2 size={18} className="text-slate-400 animate-spin" />
                    )}
                    {validationStatus === 'valid' && (
                      <CheckCircle2 size={18} className="text-emerald-400" aria-hidden />
                    )}
                    {validationStatus === 'issues' && (
                      <AlertTriangle size={18} className="text-amber-400" aria-hidden />
                    )}
                    {validationStatus === 'error' && (
                      <AlertCircle size={18} className="text-rose-400" aria-hidden />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!address.trim() || validationStatus === 'validating'}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-black"
                  style={{
                    background:
                      address.trim() && validationStatus !== 'validating'
                        ? 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)'
                        : 'rgba(255,255,255,0.10)',
                    color:
                      address.trim() && validationStatus !== 'validating'
                        ? '#000'
                        : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {validationStatus === 'validating' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Validating…
                    </>
                  ) : (
                    <>
                      Run a Free Verdict
                      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>

              {/* Validation feedback */}
              {validationStatus === 'error' && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-rose-400">Could not validate address.</p>
                  <button
                    type="button"
                    onClick={useAsEntered}
                    className="text-xs py-1.5 px-2.5 rounded-md font-medium bg-white/10 text-white hover:bg-white/15 transition-colors"
                  >
                    Use address as entered
                  </button>
                </div>
              )}
              {validationStatus === 'issues' && validationResult && (
                <div
                  className="mt-3 rounded-lg p-3 space-y-2 text-xs"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  {validationResult.issues.length > 0 && (
                    <ul className="text-amber-400 space-y-1">
                      {validationResult.issues.slice(0, 3).map((issue, i) => (
                        <li key={i}>{issue.message}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.formattedAddress &&
                    validationResult.formattedAddress.trim() !== address.trim() && (
                      <p className="text-slate-300">
                        Did you mean:{' '}
                        <span className="font-medium text-white">
                          {validationResult.formattedAddress}
                        </span>
                        ?
                      </p>
                    )}
                  <div className="flex flex-wrap gap-2">
                    {validationResult.formattedAddress &&
                      validationResult.formattedAddress.trim() !== address.trim() && (
                        <button
                          type="button"
                          onClick={acceptCorrection}
                          className="py-1.5 px-2.5 rounded-md font-medium bg-sky-500 text-black hover:bg-sky-400 transition-colors"
                        >
                          Accept correction
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={useAsEntered}
                      className="py-1.5 px-2.5 rounded-md font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Use as entered
                    </button>
                  </div>
                </div>
              )}
            </FeatureCard>

            {/* CARD 2 — SCAN PROPERTY */}
            <FeatureCard
              icon={<Camera className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.25} />}
              title="Scan Property"
              hook="Standing in front of a house? Point your phone, get the verdict — no address needed."
              bullets={[
                'AR property pickup from the street',
                'Works while you walk a neighborhood',
                'Saves the scan to your history',
              ]}
              bestFor="Best for: scouting on foot, driving for dollars"
              badge="Mobile superpower"
            >
              <button
                onClick={handleScanProperty}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg text-sm font-semibold transition-all hover:bg-white/15"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(56,189,248,0.30)',
                  color: '#fff',
                }}
              >
                Open Scanner
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </FeatureCard>

            {/* CARD 3 — MAP SEARCH */}
            <FeatureCard
              icon={<MapIcon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.25} />}
              title="Map Search"
              hook="Hunt a whole market. Browse listings on a live map with filters tuned for investors."
              bullets={[
                'See verdicts plotted on a map',
                'Filter by price, beds, deal score',
                'Pan to any city, zip, or county',
              ]}
              bestFor="Best for: working a target zip or building a buy-box"
            >
              <button
                onClick={handleMapSearch}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg text-sm font-semibold transition-all hover:bg-white/15"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(56,189,248,0.30)',
                  color: '#fff',
                }}
              >
                Open Map
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </FeatureCard>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 sm:mt-14 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
              6 data sources
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
              15-second analysis
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-sky-400" strokeWidth={3} />
              No signup required
            </span>
          </div>
        </div>
      </main>

      <InfoDialog
        open={showScanInfo}
        onClose={() => setShowScanInfo(false)}
        title="Scan is a Mobile Feature"
        description="Point your phone camera at any property for instant analysis. On desktop, use 'Enter Address' to search by location."
      />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  hook: string;
  bullets: string[];
  bestFor: string;
  badge?: string;
  accentRing?: boolean;
  children?: React.ReactNode;
}

function FeatureCard({
  icon,
  title,
  hook,
  bullets,
  bestFor,
  badge,
  accentRing,
  children,
}: FeatureCardProps) {
  return (
    <div
      className="relative flex flex-col rounded-2xl p-5 sm:p-6 lg:p-7 transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: accentRing
          ? '1px solid rgba(56,189,248,0.35)'
          : '1px solid rgba(255,255,255,0.10)',
        boxShadow: accentRing
          ? '0 20px 60px -20px rgba(15,164,233,0.30)'
          : '0 10px 40px -20px rgba(0,0,0,0.5)',
      }}
    >
      {badge && (
        <span
          className="absolute -top-2.5 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
            color: '#000',
          }}
        >
          {badge}
        </span>
      )}

      <div className="flex items-start gap-3 mb-3 sm:mb-4">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(56,189,248,0.20) 0%, rgba(14,165,233,0.30) 100%)',
            border: '1px solid rgba(56,189,248,0.25)',
          }}
        >
          {icon}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight pt-1.5 sm:pt-2">
          {title}
        </h2>
      </div>

      <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed mb-4">{hook}</p>

      <ul className="space-y-2 mb-5 flex-grow">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-400">
            <Check className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" strokeWidth={3} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] sm:text-xs text-slate-500 italic mb-4">{bestFor}</p>

      <div className="mt-auto">{children}</div>
    </div>
  );
}
