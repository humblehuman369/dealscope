'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Search, X, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { InfoDialog } from '@/components/ui/ConfirmDialog';
import { trackEvent } from '@/lib/eventTracking';
import type { AddressValidationResult } from '@/types/address';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'issues' | 'error' | 'unavailable';

interface SearchPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPropertyModal({ isOpen, onClose }: SearchPropertyModalProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [showScanInfo, setShowScanInfo] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null);

  if (!isOpen) return null;

  const handleScanProperty = () => {
    setShowScanInfo(true);
  };

  const proceedToVerdict = (addressToUse: string) => {
    trackEvent('property_searched', { source: 'search_modal' });
    onClose();
    router.push(`/verdict?address=${encodeURIComponent(addressToUse)}`);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = address.trim();
    if (!raw) return;

    setValidationStatus('validating');
    setValidationResult(null);

    try {
      const res = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: raw }),
      });
      const data = await res.json();

      if (res.status === 503 || (res.ok === false && data?.code === 'VALIDATION_UNAVAILABLE')) {
        setValidationStatus('unavailable');
        proceedToVerdict(raw);
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
        proceedToVerdict(result.formattedAddress || raw);
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
    proceedToVerdict(address.trim());
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
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Modal Content - max-w-sm ensures it fits on mobile screens */}
        <div 
          className="relative w-full max-w-sm sm:max-w-md rounded-2xl p-5 sm:p-8"
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(8, 145, 178, 0.3)',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(8, 145, 178, 0.1)',
          }}
        >
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          {/* Header - IQ icon on left, text on right, left-aligned */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-[60px] h-[60px] sm:w-[84px] sm:h-[84px] flex-shrink-0 flex items-center justify-center">
                <img 
                  src="/images/iq-brain-dark.png" 
                  alt="IQ" 
                  className="w-[54px] h-[54px] sm:w-[78px] sm:h-[78px] object-contain"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  How would you like to<br />analyze a property?
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Choose your method to get started
                </p>
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
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                  e.currentTarget.style.borderColor = '#0EA5E9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div 
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0e7490 100%)',
                  }}
                >
                  <Camera size={22} className="text-white sm:hidden" />
                  <Camera size={28} className="text-white hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 sm:mb-1">Scan Property</h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-snug">
                    Point your camera at any property for instant analysis
                  </p>
                </div>
              </button>

              {/* Enter Address Option */}
              <button 
                onClick={() => setShowAddressInput(true)}
                className="w-full flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-xl border transition-all text-left"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                  e.currentTarget.style.borderColor = '#0EA5E9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div 
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0e7490 100%)',
                  }}
                >
                  <Search size={22} className="text-white sm:hidden" />
                  <Search size={28} className="text-white hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 sm:mb-1">Enter Address</h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-snug">
                    Type in an address to analyze any property
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" 
                />
                <AddressAutocomplete
                  placeholder="Enter property address..."
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={setAddress}
                  autoFocus
                  className="w-full pl-12 pr-12 py-4 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
                {/* Validation indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  {validationStatus === 'validating' && (
                    <Loader2 size={20} className="text-gray-400 animate-spin" />
                  )}
                  {validationStatus === 'valid' && (
                    <CheckCircle2 size={20} className="text-emerald-400" aria-hidden />
                  )}
                  {validationStatus === 'issues' && (
                    <AlertTriangle size={20} className="text-amber-400" aria-hidden />
                  )}
                  {validationStatus === 'error' && (
                    <AlertCircle size={20} className="text-red-400" aria-hidden />
                  )}
                </div>
              </div>

              {/* Validation messages and actions */}
              {validationStatus === 'error' && (
                <p className="text-sm text-red-400">
                  Could not validate address. You can try again or use the address as entered.
                </p>
              )}
              {validationStatus === 'issues' && validationResult && (
                <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {validationResult.issues.length > 0 && (
                    <ul className="text-xs text-amber-200/90 space-y-1">
                      {validationResult.issues.slice(0, 3).map((issue, i) => (
                        <li key={i}>{issue.message}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.formattedAddress && validationResult.formattedAddress.trim() !== address.trim() && (
                    <p className="text-sm text-gray-300">
                      Did you mean: <span className="font-medium text-white">{validationResult.formattedAddress}</span>?
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {validationResult.formattedAddress && validationResult.formattedAddress.trim() !== address.trim() && (
                      <button
                        type="button"
                        onClick={acceptCorrection}
                        className="text-sm py-2 px-3 rounded-lg font-medium transition-colors"
                        style={{ background: 'rgba(8, 145, 178, 0.3)', color: '#5eead4' }}
                      >
                        Accept correction
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={useAsEntered}
                      className="text-sm py-2 px-3 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#e5e7eb',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
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
                      ? 'linear-gradient(135deg, #0EA5E9 0%, #0e7490 100%)' 
                      : 'rgba(8, 145, 178, 0.3)',
                    color: 'white',
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

