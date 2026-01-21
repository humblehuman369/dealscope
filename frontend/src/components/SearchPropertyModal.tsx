'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Search, X, ArrowLeft } from 'lucide-react';

interface SearchPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPropertyModal({ isOpen, onClose }: SearchPropertyModalProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);

  if (!isOpen) return null;

  const handleScanProperty = () => {
    onClose();
    // For now, show a message that scan is mobile-only
    // In the future, this could open a camera interface or redirect to mobile app
    alert('Scan Property is available on the mobile app. Please use "Enter Address" on desktop.');
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
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setShowAddressInput(false);
    setAddress('');
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
        {/* Modal Content */}
        <div 
          className="relative w-full max-w-md rounded-2xl p-8"
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

          {/* Header - IQ icon on left, text on right, centered */}
          <div className="mb-8 flex flex-col items-center">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                <img 
                  src="/images/iq-brain-dark.png" 
                  alt="IQ" 
                  className="w-[52px] h-[52px] object-contain"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">
                How would you like to<br />analyze a property?
              </h2>
            </div>
            <p className="text-gray-400 text-sm">
              Choose your preferred method to get started
            </p>
          </div>

          {/* Options or Address Input */}
          {!showAddressInput ? (
            <div className="space-y-4">
              {/* Scan Property Option */}
              <button 
                onClick={handleScanProperty}
                className="w-full flex items-center gap-5 p-5 rounded-xl border transition-all text-left"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                  e.currentTarget.style.borderColor = '#0891b2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                  }}
                >
                  <Camera size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Scan Property</h3>
                  <p className="text-sm text-gray-400">
                    Point your camera at any property for instant analysis
                  </p>
                </div>
              </button>

              {/* Enter Address Option */}
              <button 
                onClick={() => setShowAddressInput(true)}
                className="w-full flex items-center gap-5 p-5 rounded-xl border transition-all text-left"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                  e.currentTarget.style.borderColor = '#0891b2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                  }}
                >
                  <Search size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Enter Address</h3>
                  <p className="text-sm text-gray-400">
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                />
                <input
                  type="text"
                  placeholder="Enter property address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0891b2';
                    e.currentTarget.style.background = 'rgba(8, 145, 178, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressInput(false);
                    setAddress('');
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
                  disabled={!address.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: address.trim() 
                      ? 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' 
                      : 'rgba(8, 145, 178, 0.3)',
                    color: 'white',
                  }}
                >
                  Analyze Property
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

