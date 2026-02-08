'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './investiq-gateway.css';

type Step = 'start' | 'address' | 'scan';

interface InvestIQGatewayProps {
  /** Which step to open to (skip "start" if user already chose) */
  initialStep?: Step;
  onClose: () => void;
  onScanProperty?: () => void;
}

const IQIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => (
  <img
    src="/images/iq-icon-blue.png"
    alt="IQ"
    width={size}
    height={size}
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export function InvestIQGateway({ initialStep = 'start', onClose, onScanProperty }: InvestIQGatewayProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<Step>(initialStep);
  const [addressInput, setAddressInput] = useState('');
  const [condition, setCondition] = useState(30);
  const [locationPremium, setLocationPremium] = useState(70);

  const stepClass = (step: Step): string =>
    `gw-step-transition w-full ${activeStep === step ? 'gw-active-step' : 'gw-hidden-step'}`;

  const getConditionLabel = useCallback((): string => {
    if (condition < 33) return 'Needs Rehab (-$85k)';
    if (condition < 66) return 'Average Condition';
    return 'Turnkey (+$40k)';
  }, [condition]);

  const getLocationLabel = useCallback((): string => {
    if (locationPremium < 33) return 'Below Average (-3%)';
    if (locationPremium < 66) return 'Standard Market';
    return 'High Demand (+5%)';
  }, [locationPremium]);

  const handleGenerateBaseline = () => {
    if (!addressInput.trim()) return;
    const params = new URLSearchParams({
      address: addressInput.trim(),
      condition: String(condition),
      location: String(locationPremium),
    });
    router.push(`/analyzing?${params.toString()}`);
  };

  const handleScanNow = () => {
    if (onScanProperty) {
      onScanProperty();
    }
    onClose();
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="gw-overlay" onClick={handleBackdropClick}>
      <div className="gw-grid-bg" />

      <div className="gw-card">
        {/* Header */}
        <div className="gw-header">
          <div className="gw-font-logo gw-logo-text">
            <span>Invest</span><span className="gw-brand">IQ</span>
          </div>
          <button className="gw-close-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="gw-body">

          {/* Step 1: Start */}
          <div className={stepClass('start')}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="gw-start-icon gw-iq-icon">
                <IQIcon size={64} />
              </div>
              <h2 className="gw-start-title">How would you like to start?</h2>
              <p className="gw-start-subtitle">Choose your preferred method to feed data to IQ.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="gw-method-btn" onClick={() => setActiveStep('address')}>
                <div className="gw-icon-circle">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <div className="gw-label">Enter Address</div>
                  <div className="gw-sublabel">Search MLS data nationwide</div>
                </div>
                <div className="gw-arrow">&rarr;</div>
              </button>

              <button className="gw-method-btn" onClick={() => setActiveStep('scan')}>
                <div className="gw-icon-circle">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                <div>
                  <div className="gw-label">Scan Property</div>
                  <div className="gw-sublabel">Snap a photo of a house or sign</div>
                </div>
                <div className="gw-arrow">&rarr;</div>
              </button>
            </div>
          </div>

          {/* Step 2: Address Entry */}
          <div className={stepClass('address')}>
            <div className="gw-assistant-box">
              <div className="gw-iq-icon">
                <IQIcon size={40} />
              </div>
              <div>
                <h3>I&apos;m IQ, your analyst.</h3>
                <p>Enter the address below. Help me improve accuracy by setting the physical variables.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="gw-address-input-wrap">
                <div className="gw-search-icon">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="gw-address-input"
                  placeholder="Enter property address..."
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateBaseline(); }}
                  autoFocus
                />
              </div>

              <div className="gw-slider-group">
                <div className="gw-slider-header">
                  <label>Property Condition</label>
                  <span className={`gw-slider-badge ${condition < 66 ? 'gw-warning' : 'gw-brand-badge'}`}>
                    {getConditionLabel()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={condition}
                  onChange={(e) => setCondition(Number(e.target.value))}
                />
                <div className="gw-slider-scale">
                  <span>Distressed</span><span>Average</span><span>Turnkey</span>
                </div>
              </div>

              <div className="gw-slider-group">
                <div className="gw-slider-header">
                  <label>Location Premium</label>
                  <span className={`gw-slider-badge ${locationPremium >= 66 ? 'gw-brand-badge' : 'gw-warning'}`}>
                    {getLocationLabel()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={locationPremium}
                  onChange={(e) => setLocationPremium(Number(e.target.value))}
                />
                <div className="gw-slider-scale">
                  <span>Poor</span><span>Standard</span><span>Premium</span>
                </div>
              </div>
            </div>

            <div className="gw-btn-row">
              <button className="gw-btn-back" onClick={() => setActiveStep('start')}>Back</button>
              <button
                className="gw-btn-primary"
                onClick={handleGenerateBaseline}
                disabled={!addressInput.trim()}
              >
                <span>Generate Baseline</span>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Step 3: Scan */}
          <div className={stepClass('scan')}>
            <div className="gw-assistant-box">
              <div className="gw-iq-icon">
                <IQIcon size={40} />
              </div>
              <div>
                <h3>I&apos;m IQ, your analyst.</h3>
                <p>Before you scan. Help me improve accuracy by setting the physical variables.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1rem' }}>
              <div className="gw-slider-group">
                <div className="gw-slider-header">
                  <label>Property Condition</label>
                  <span className={`gw-slider-badge ${condition < 66 ? 'gw-warning' : 'gw-brand-badge'}`}>
                    {getConditionLabel()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={condition}
                  onChange={(e) => setCondition(Number(e.target.value))}
                />
                <div className="gw-slider-scale">
                  <span>Distressed</span><span>Average</span><span>Turnkey</span>
                </div>
              </div>

              <div className="gw-slider-group">
                <div className="gw-slider-header">
                  <label>Location Premium</label>
                  <span className={`gw-slider-badge ${locationPremium >= 66 ? 'gw-brand-badge' : 'gw-warning'}`}>
                    {getLocationLabel()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={locationPremium}
                  onChange={(e) => setLocationPremium(Number(e.target.value))}
                />
                <div className="gw-slider-scale">
                  <span>Poor</span><span>Standard</span><span>Premium</span>
                </div>
              </div>
            </div>

            <div className="gw-btn-row">
              <button className="gw-btn-back" onClick={() => setActiveStep('start')}>Back</button>
              <button className="gw-btn-primary" onClick={handleScanNow}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span>Scan Now</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default InvestIQGateway;
