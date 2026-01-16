'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Search, X } from 'lucide-react';

interface TryItNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanProperty: () => void;
}

export function TryItNowModal({ isOpen, onClose, onScanProperty }: TryItNowModalProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);

  if (!isOpen) return null;

  const handleScanProperty = () => {
    onClose();
    onScanProperty();
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onClose();
      // Navigate to IQ Analyzing screen (new IQ Verdict flow)
      router.push(`/analyzing?address=${encodeURIComponent(address.trim())}`);
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

        {/* Header */}
        <div className="try-modal-header">
          <div className="try-modal-icon">
            <img src="/images/iq-brain-dark.png" alt="IQ" className="try-modal-iq-icon" />
          </div>
          <h2 className="try-modal-title">How would you like to analyze a property?</h2>
          <p className="try-modal-subtitle">Choose your preferred method to get started</p>
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
              <input
                type="text"
                className="try-modal-input"
                placeholder="Enter property address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
                disabled={!address.trim()}
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
