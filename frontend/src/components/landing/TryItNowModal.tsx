'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Search, X } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { canonicalizeAddressForIdentity, isLikelyFullAddress } from '@/utils/addressIdentity';

interface TryItNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanProperty: () => void;
}

export function TryItNowModal({ isOpen, onClose, onScanProperty }: TryItNowModalProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const hasValidAddress = isLikelyFullAddress(address);

  if (!isOpen) return null;

  const handleScanProperty = () => {
    onClose();
    onScanProperty();
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasValidAddress) {
      onClose();
      // Navigate to IQ Analyzing screen (new IQ Verdict flow)
      const canonicalAddress = canonicalizeAddressForIdentity(address);
      router.push(`/verdict?address=${encodeURIComponent(canonicalAddress)}`);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
      setShowAddressInput(false);
      setAddress('');
    }
  };

  return (
    <div className="try-modal-backdrop" onClick={handleBackdropClick}>
      <div className="try-modal">
        {/* Close Button */}
        <button className="try-modal-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        {/* Header - IQ icon on left, text on right, left-aligned */}
        <div className="try-modal-header">
          <div className="flex items-center gap-4">
            <div className="try-modal-icon flex-shrink-0">
              <img src="/images/iq-brain-dark.png" alt="IQ" className="try-modal-iq-icon" />
            </div>
            <div>
              <h2 className="try-modal-title leading-tight">
                How would you like to<br />analyze a property?
              </h2>
              <p className="try-modal-subtitle mt-1">Choose your preferred method to get started</p>
            </div>
          </div>
        </div>

        {/* Options */}
        {!showAddressInput ? (
          <div className="try-modal-options">
            {/* Scan Property Option */}
            <button className="try-modal-option" onClick={handleScanProperty}>
              <div className="try-modal-option-icon">
                <Camera size={32} />
              </div>
              <div className="try-modal-option-content">
                <h3 className="try-modal-option-title">Scan Property</h3>
                <p className="try-modal-option-desc">
                  Point your camera at any property for instant analysis
                </p>
              </div>
            </button>

            {/* Enter Address Option */}
            <button className="try-modal-option" onClick={() => setShowAddressInput(true)}>
              <div className="try-modal-option-icon">
                <Search size={32} />
              </div>
              <div className="try-modal-option-content">
                <h3 className="try-modal-option-title">Enter Address</h3>
                <p className="try-modal-option-desc">
                  Type in an address to analyze any property
                </p>
              </div>
            </button>
          </div>
        ) : (
          /* Address Input Form */
          <form className="try-modal-address-form" onSubmit={handleAddressSubmit}>
            <div className="try-modal-input-wrapper">
              <Search size={20} className="try-modal-input-icon" />
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onPlaceSelect={(value) => setAddress(canonicalizeAddressForIdentity(value))}
                placeholder="Enter property address..."
                className="try-modal-input"
                autoFocus
              />
            </div>
            <div className="try-modal-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddressInput(false);
                  setAddress('');
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!hasValidAddress}
              >
                Analyze Property
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
