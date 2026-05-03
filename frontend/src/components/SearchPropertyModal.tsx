'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Search, X, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, AlertCircle, MapIcon } from 'lucide-react';
import { AddressAutocomplete, type AddressComponents, type PlaceMetadata } from '@/components/AddressAutocomplete';
import { InfoDialog } from '@/components/ui/ConfirmDialog';
import { trackEvent } from '@/lib/eventTracking';
import type { AddressValidationResult } from '@/types/address';
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env';
import { canonicalizeAddressForIdentity, isLikelyFullAddress, classifyPlaceTypes, classifySearchInput } from '@/utils/addressIdentity';

// Best-effort client-side geocode using the Google Maps JS Geocoder that the
// AddressAutocomplete already loads. Returning lat/lng/zoom lets the Map
// Search page open at the correct viewport on first render instead of
// initializing over Kansas and racing a post-mount pan, which leaves users
// staring at unrendered tiles and an empty listings panel.
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

/** Sky-tint surface + token base — theme-safe (no hardcoded page backgrounds). */
const SEARCH_OPTION_CARD_BG =
  'linear-gradient(180deg, rgba(15,164,233,0.05) 0%, rgba(15,164,233,0) 100%), var(--surface-base)';

interface SearchPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanProperty?: () => void;
}

export function SearchPropertyModal({ isOpen, onClose, onScanProperty }: SearchPropertyModalProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [showScanInfo, setShowScanInfo] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null);
  const [placeComponents, setPlaceComponents] = useState<AddressComponents | null>(null);

  if (!isOpen) return null;

  const handleMapSearch = () => {
    trackEvent('property_searched', { source: 'search_modal', type: 'map_search' });
    handleClose();

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
        () => {
          router.push('/map-search');
        },
        { timeout: 3000 },
      );
    } else {
      router.push('/map-search');
    }
  };

  const handleScanProperty = () => {
    if (onScanProperty) {
      onScanProperty();
      handleClose();
      return;
    }

    if (IS_CAPACITOR) {
      handleClose();
      router.push('/?scan=true');
      return;
    }

    // Mobile/tablet detection — iPadOS reports a Mac user agent, so
    // we also check for touch + maxTouchPoints (iPads report 5).
    // A width cap prevents Windows touchscreen laptops (maxTouchPoints 10,
    // screens ≥1920px) from being misidentified as mobile.
    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 1 && window.innerWidth < 1400)
    );

    if (isMobile) {
      handleClose();
      router.push('/?scan=true');
      return;
    }

    setShowScanInfo(true);
  };

  const proceedToVerdict = (
    addressToUse: string,
    components?: { city?: string; state?: string; zipCode?: string } | null,
  ) => {
    trackEvent('property_searched', { source: 'search_modal' });
    handleClose();
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

    // Anything that isn't a deliverable street address (zip, city, state,
    // "Miami, FL", "Florida", "Boca Raton") should open Map Search. Google's
    // Address Validation API only accepts postal addresses and would reject
    // these inputs, blocking the user with a misleading "Could not validate
    // address" error.
    const classification = classifySearchInput(raw);
    if (classification !== 'address' && !isLikelyFullAddress(raw)) {
      trackEvent('property_searched', {
        source: 'search_modal',
        type: classification === 'zip' ? 'zip' : 'location',
      });

      // Pre-geocode so the Map Search page opens at the correct viewport on
      // first render. Without this, the map initializes over Kansas at zoom 5,
      // then the in-page LabelGeocoder pans after mount — a race that can
      // leave tiles unrendered and the listings query running against the
      // wrong bounds. We briefly show the validating spinner so the user gets
      // immediate feedback that something is happening.
      setValidationStatus('validating');
      const geocoded = await geocodeLocationQuery(raw);
      handleClose();

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
      console.error('[SearchPropertyModal] validate-address failed:', err);
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setShowAddressInput(false);
    setAddress('');
    setValidationStatus('idle');
    setValidationResult(null);
    setPlaceComponents(null);
  };

  return (
    <>
      {/* Modal Backdrop — full-bleed on mobile, centered card on tablet+ */}
      <div 
        className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4"
        onClick={handleBackdropClick}
        style={{
          background: 'var(--surface-overlay)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Modal Content - fills the phone viewport on mobile, centered card on tablet+ */}
        <div 
          className="relative w-full h-full overflow-y-auto sm:h-auto sm:max-w-md sm:rounded-2xl flex flex-col min-h-0 px-5 sm:p-8"
          style={{
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card-hover)',
            paddingTop: 'max(env(safe-area-inset-top), 1.25rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)',
          }}
        >
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute right-4 p-2 rounded-lg text-[var(--text-label)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-elevated)] transition-colors z-10"
            style={{ top: 'max(env(safe-area-inset-top), 1rem)' }}
            aria-label="Close"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col flex-1 min-h-0 sm:flex-none">
            {/* Mobile: centered hero (search options) */}
            {!showAddressInput && (
              <div className="sm:hidden flex flex-col items-center text-center mt-1 mb-2">
                <div className="relative w-[112px] h-[112px] flex items-center justify-center mb-4">
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] pointer-events-none rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(15,164,233,0.22) 0%, transparent 70%)',
                      filter: 'blur(8px)',
                    }}
                    aria-hidden
                  />
                  <Image
                    src="/images/dealgapiq-icon.png"
                    alt="DealGap IQ"
                    className="relative z-[1] w-[104px] h-[104px] object-contain"
                    width={104}
                    height={104}
                  />
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-heading)] leading-tight px-2">
                  How would you like to search property?
                </h2>
              </div>
            )}

            {/* Mobile: compact hero (address entry) */}
            {showAddressInput && (
              <div className="sm:hidden flex flex-col items-center text-center mt-1 mb-4">
                <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] pointer-events-none rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(15,164,233,0.18) 0%, transparent 70%)',
                      filter: 'blur(6px)',
                    }}
                    aria-hidden
                  />
                  <Image
                    src="/images/dealgapiq-icon.png"
                    alt="DealGap IQ"
                    className="relative z-[1] w-16 h-16 object-contain"
                    width={64}
                    height={64}
                  />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-heading)] leading-tight px-2">
                  Enter info to search
                </h2>
              </div>
            )}

            {/* Desktop / tablet: left-aligned header (unchanged pattern) */}
            <div className="hidden sm:block mb-6 sm:mb-8 sm:mt-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-[84px] h-[84px] flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/dealgapiq-icon.png"
                    alt="DealGap IQ"
                    className="w-[78px] h-[78px] object-contain"
                    width={78}
                    height={78}
                  />
                </div>
                <div className="min-w-0 pr-10 sm:pr-0">
                  <h2 className="text-xl font-bold text-[var(--text-heading)] leading-tight">
                    {showAddressInput ? 'Enter info to search' : 'How would you like to search property?'}
                  </h2>
                </div>
              </div>
            </div>

            {/* Options or Address Input */}
            {!showAddressInput ? (
              <>
                <div className="flex-1 sm:flex-none min-h-0" aria-hidden />
                <div className="space-y-4 sm:space-y-4 w-full shrink-0">
                  {/* Scan Property Option */}
                  <button
                    type="button"
                    onClick={handleScanProperty}
                    className="w-full flex items-center gap-5 rounded-xl border transition-all duration-150 text-left
                      p-6 sm:p-5
                      border-[color:rgba(56,189,248,0.35)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_28px_rgba(15,164,233,0.22)]
                      sm:border-[color:var(--border-subtle)] sm:shadow-[var(--shadow-card)]
                      hover:border-[color:var(--accent-sky)] hover:shadow-[0_0_0_1px_var(--accent-sky),0_0_36px_rgba(15,164,233,0.34)]
                      sm:hover:border-[color:var(--border-focus)] sm:hover:shadow-[var(--shadow-card-hover)]
                      active:scale-[0.99] active:border-[color:var(--accent-sky)] active:shadow-[0_0_0_1px_var(--accent-sky),0_0_36px_rgba(15,164,233,0.34)]"
                    style={{ background: SEARCH_OPTION_CARD_BG }}
                  >
                    <div
                      className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-sky)' }}
                    >
                      <Camera size={32} className="text-[var(--text-inverse)] sm:hidden" />
                      <Camera size={28} className="text-[var(--text-inverse)] hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-base font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
                        Scan Property
                      </h3>
                      <p className="text-sm leading-relaxed sm:leading-snug" style={{ color: 'var(--text-body)' }}>
                        Point your phone camera to scan any property for quick lookup
                      </p>
                    </div>
                  </button>

                  {/* Enter Address Option */}
                  <button
                    type="button"
                    onClick={() => setShowAddressInput(true)}
                    className="w-full flex items-center gap-5 rounded-xl border transition-all duration-150 text-left
                      p-6 sm:p-5
                      border-[color:rgba(56,189,248,0.35)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_28px_rgba(15,164,233,0.22)]
                      sm:border-[color:var(--border-subtle)] sm:shadow-[var(--shadow-card)]
                      hover:border-[color:var(--accent-sky)] hover:shadow-[0_0_0_1px_var(--accent-sky),0_0_36px_rgba(15,164,233,0.34)]
                      sm:hover:border-[color:var(--border-focus)] sm:hover:shadow-[var(--shadow-card-hover)]
                      active:scale-[0.99] active:border-[color:var(--accent-sky)] active:shadow-[0_0_0_1px_var(--accent-sky),0_0_36px_rgba(15,164,233,0.34)]"
                    style={{ background: SEARCH_OPTION_CARD_BG }}
                  >
                    <div
                      className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-sky)' }}
                    >
                      <Search size={32} className="text-[var(--text-inverse)] sm:hidden" />
                      <Search size={28} className="text-[var(--text-inverse)] hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-base font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
                        Enter Address or search
                      </h3>
                      <p className="text-sm leading-relaxed sm:leading-snug" style={{ color: 'var(--text-body)' }}>
                        Type or paste any residential address, city, state or zipcode
                      </p>
                    </div>
                  </button>

                  {/* Map Search Option */}
                  <button
                    type="button"
                    onClick={handleMapSearch}
                    className="w-full flex items-center gap-5 rounded-xl border transition-all duration-150 text-left
                      p-6 sm:p-5
                      border-[color:rgba(56,189,248,0.35)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_28px_rgba(15,164,233,0.22)]
                      sm:border-[color:var(--border-subtle)] sm:shadow-[var(--shadow-card)]
                      hover:border-[color:var(--accent-sky)] hover:shadow-[0_0_0_1px_var(--accent-sky),0_0_36px_rgba(15,164,233,0.34)]
                      sm:hover:border-[color:var(--border-focus)] sm:hover:shadow-[var(--shadow-card-hover)]
                      active:scale-[0.99] active:border-[color:var(--accent-sky)] active:shadow-[0_0_0_1px_var(--accent-sky),0_0_36px_rgba(15,164,233,0.34)]"
                    style={{ background: SEARCH_OPTION_CARD_BG }}
                  >
                    <div
                      className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-sky)' }}
                    >
                      <MapIcon size={32} className="text-[var(--text-inverse)] sm:hidden" />
                      <MapIcon size={28} className="text-[var(--text-inverse)] hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-base font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
                        Map Search
                      </h3>
                      <p className="text-sm leading-relaxed sm:leading-snug" style={{ color: 'var(--text-body)' }}>
                        Browse an area on the map with filters to find the best deals
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex-1 sm:flex-none min-h-0" aria-hidden />
              </>
            ) : (
            /* Address Input Form */
            <form onSubmit={handleAddressSubmit} className="space-y-5 flex flex-col flex-1 min-h-0 sm:flex-none">
              <div className="relative">
                <Search 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-label)] pointer-events-none z-10" 
                />
                <AddressAutocomplete
                  placeholder="Address, city, state or zipcode"
                  value={address}
                  onChange={setAddress}
                  searchMode="location"
                  onPlaceSelect={(value, components, meta) => {
                    const placeCategory = meta?.placeTypes
                      ? classifyPlaceTypes(meta.placeTypes).category
                      : 'unknown';

                    if (placeCategory !== 'address' && placeCategory !== 'unknown' && meta?.location) {
                      const { zoom } = classifyPlaceTypes(meta.placeTypes);
                      trackEvent('property_searched', { source: 'search_modal', type: placeCategory });
                      handleClose();
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
                  autoFocus
                  name="address"
                  aria-label="Property address"
                  className="w-full pl-12 pr-12 rounded-xl text-base text-[var(--text-heading)] placeholder-[var(--text-label)] outline-none transition-colors py-5 sm:py-4"
                  style={{
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-default)',
                  }}
                />
                {/* Validation indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  {validationStatus === 'validating' && (
                    <Loader2 size={20} className="text-[var(--text-label)] animate-spin" />
                  )}
                  {validationStatus === 'valid' && (
                    <CheckCircle2 size={20} className="text-[var(--status-positive)]" aria-hidden />
                  )}
                  {validationStatus === 'issues' && (
                    <AlertTriangle size={20} className="text-[var(--status-warning)]" aria-hidden />
                  )}
                  {validationStatus === 'error' && (
                    <AlertCircle size={20} className="text-[var(--status-negative)]" aria-hidden />
                  )}
                </div>
              </div>

              {/* Validation messages and actions */}
              {validationStatus === 'error' && (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--status-negative)]">
                    Could not validate address.
                  </p>
                  <button
                    type="button"
                    onClick={useAsEntered}
                    className="text-sm py-2 px-3 rounded-lg font-medium transition-colors"
                    style={{ background: 'var(--surface-elevated)', color: 'var(--text-heading)' }}
                  >
                    Use address as entered
                  </button>
                </div>
              )}
              {validationStatus === 'issues' && validationResult && (
                <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--surface-input)', border: '1px solid var(--border-default)' }}>
                  {validationResult.issues.length > 0 && (
                    <ul className="text-xs text-[var(--status-warning)] space-y-1">
                      {validationResult.issues.slice(0, 3).map((issue, i) => (
                        <li key={i}>{issue.message}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.formattedAddress && validationResult.formattedAddress.trim() !== address.trim() && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Did you mean: <span className="font-medium text-[var(--text-heading)]">{validationResult.formattedAddress}</span>?
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {validationResult.formattedAddress && validationResult.formattedAddress.trim() !== address.trim() && (
                      <button
                        type="button"
                        onClick={acceptCorrection}
                        className="text-sm py-2 px-3 rounded-lg font-medium transition-colors"
                        style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
                      >
                        Accept correction
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={useAsEntered}
                      className="text-sm py-2 px-3 rounded-lg font-medium text-[var(--text-label)] hover:text-[var(--text-heading)] transition-colors"
                    >
                      Use as entered
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressInput(false);
                    setAddress('');
                    setValidationStatus('idle');
                    setValidationResult(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-colors"
                  style={{
                    background: 'var(--surface-input)',
                    color: 'var(--text-body)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!address.trim() || validationStatus === 'validating'}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: address.trim() && validationStatus !== 'validating'
                      ? 'linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)'
                      : 'var(--surface-elevated)',
                    color: address.trim() && validationStatus !== 'validating'
                      ? 'var(--text-inverse)'
                      : 'var(--text-label)',
                  }}
                >
                  {validationStatus === 'validating' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Validating…
                    </>
                  ) : (
                    'Analyze Property'
                  )}
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>

      <InfoDialog
        open={showScanInfo}
        onClose={() => setShowScanInfo(false)}
        title="Scan is a Mobile Feature"
        description="Point your phone camera at any property for instant analysis. On desktop, use 'Enter Address' to search by location."
      />
    </>
  );
}

