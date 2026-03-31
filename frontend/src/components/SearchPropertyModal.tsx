'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Search, X, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AddressAutocomplete, type AddressComponents, type PlaceMetadata } from '@/components/AddressAutocomplete';
import { InfoDialog } from '@/components/ui/ConfirmDialog';
import { trackEvent } from '@/lib/eventTracking';
import type { AddressValidationResult } from '@/types/address';
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env';
import { canonicalizeAddressForIdentity, isLikelyFullAddress, classifyPlaceTypes, classifySearchInput } from '@/utils/addressIdentity';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'issues' | 'error' | 'unavailable';

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

  const handleScanProperty = () => {
    if (onScanProperty) {
      onScanProperty();
      handleClose();
      return;
    }

    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024)
    );
    const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

    if (isMobile && hasCamera) {
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
    onClose();
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

    if (classifySearchInput(raw) === 'zip') {
      trackEvent('property_searched', { source: 'search_modal', type: 'zip' });
      onClose();
      router.push(`/map-search?label=${encodeURIComponent(raw)}`);
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
        setValidationStatus('error');
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
    } catch {
      setValidationStatus('error');
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
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        style={{
          background: 'var(--surface-overlay)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Modal Content - max-w-sm ensures it fits on mobile screens */}
        <div 
          className="relative w-full max-w-sm sm:max-w-md rounded-2xl p-5 sm:p-8"
          style={{
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card-hover)',
          }}
        >
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-[var(--text-label)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          {/* Header - IQ icon on left, text on right, left-aligned */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-[60px] h-[60px] sm:w-[84px] sm:h-[84px] flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/images/dealgapiq-icon.png"
                  alt="DealGap IQ" 
                  className="w-[54px] h-[54px] sm:w-[78px] sm:h-[78px] object-contain"
                  width={78}
                  height={78}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-heading)] leading-tight">
                  {showAddressInput ? 'Enter info to search' : 'How would you like to search property?'}
                </h2>
              </div>
            </div>
          </div>

          {/* Options or Address Input */}
          {!showAddressInput ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Scan Property Option */}
              <button 
                onClick={handleScanProperty}
                className="w-full flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-xl border transition-all text-left"
                style={{
                  background: 'var(--surface-base)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid var(--border-focus)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                <div 
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-sky)' }}
                >
                  <Camera size={22} className="text-[var(--text-inverse)] sm:hidden" />
                  <Camera size={28} className="text-[var(--text-inverse)] hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold mb-0.5 sm:mb-1" style={{ color: 'var(--text-heading)' }}>Scan Property</h3>
                  <p className="text-xs sm:text-sm leading-snug" style={{ color: 'var(--text-body)' }}>
                    Point your phone camera to scan any property for quick lookup
                  </p>
                </div>
              </button>

              {/* Enter Address Option */}
              <button 
                onClick={() => setShowAddressInput(true)}
                className="w-full flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-xl border transition-all text-left"
                style={{
                  background: 'var(--surface-base)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid var(--border-focus)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                <div 
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-sky)' }}
                >
                  <Search size={22} className="text-[var(--text-inverse)] sm:hidden" />
                  <Search size={28} className="text-[var(--text-inverse)] hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold mb-0.5 sm:mb-1" style={{ color: 'var(--text-heading)' }}>Enter Address or search</h3>
                  <p className="text-xs sm:text-sm leading-snug" style={{ color: 'var(--text-body)' }}>
                    Type or paste any residential address, city, state or zipcode
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Address Input Form */
            <form onSubmit={handleAddressSubmit} className="space-y-5">
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
                      onClose();
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
                  className="w-full pl-12 pr-12 py-4 rounded-xl text-[var(--text-heading)] placeholder-[var(--text-label)] outline-none transition-colors"
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
                <p className="text-sm text-[var(--status-negative)]">
                  Could not validate address. You can try again or use the address as entered.
                </p>
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

      <InfoDialog
        open={showScanInfo}
        onClose={() => setShowScanInfo(false)}
        title="Scan is a Mobile Feature"
        description="Point your phone camera at any property for instant analysis. On desktop, use 'Enter Address' to search by location."
      />
    </>
  );
}

