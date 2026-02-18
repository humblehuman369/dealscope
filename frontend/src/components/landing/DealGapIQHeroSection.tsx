'use client';

import React, { useState } from 'react';

// ─── Icons ───
const SearchIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="#475569" strokeWidth="1.5" />
    <path d="M12 12L16 16" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="#0EA5E9" strokeWidth="1.2" />
    <path d="M7 4.5V7L8.5 8.5" stroke="#0EA5E9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TargetIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="#0EA5E9" strokeWidth="1.2" />
    <circle cx="7" cy="7" r="2.5" stroke="#0EA5E9" strokeWidth="1.2" />
    <circle cx="7" cy="7" r="0.8" fill="#0EA5E9" />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L2.5 3V6.5C2.5 9.5 4.5 11.8 7 13C9.5 11.8 11.5 9.5 11.5 6.5V3L7 1Z" stroke="#0EA5E9" strokeWidth="1.2" fill="#0EA5E9" fillOpacity="0.06" />
    <path d="M5 7L6.5 8.5L9 5.5" stroke="#0EA5E9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CameraIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 5.5C2 4.67 2.67 4 3.5 4H4.72L5.5 2.5H10.5L11.28 4H12.5C13.33 4 14 4.67 14 5.5V12C14 12.83 13.33 13.5 12.5 13.5H3.5C2.67 13.5 2 12.83 2 12V5.5Z" stroke="#0EA5E9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="8.5" r="2.5" stroke="#0EA5E9" strokeWidth="1.2" />
  </svg>
);

export interface DealGapIQHeroSectionProps {
  onAnalyzeAddress: (address: string) => void;
  onOpenGateway?: () => void;
  onScanProperty?: () => void;
}

/**
 * Hero section: "Is That Property a Good Deal? Find Out in 60 Seconds."
 * Single address input + Analyze CTA, stats bar (60s, 3 signals, 6 strategies).
 */
export function DealGapIQHeroSection({ onAnalyzeAddress, onOpenGateway, onScanProperty }: DealGapIQHeroSectionProps) {
  const [address, setAddress] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed) {
      onAnalyzeAddress(trimmed);
    } else if (onOpenGateway) {
      onOpenGateway();
    }
  };

  return (
    <section
      style={{
        background: '#0B1120',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow behind hero */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(14,165,233,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '80px 24px 72px',
          textAlign: 'center',
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#0EA5E9',
            marginBottom: '14px',
          }}
        >
          Real Analytics for Real Estate Investors
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.035em',
            color: '#F1F5F9',
            margin: '0 0 20px',
          }}
        >
          Is That Property a Good Deal?
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Find Out in 60 Seconds.
          </span>
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontSize: '16px',
            color: '#94A3B8',
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 36px',
          }}
        >
          Enter any address. DealGapIQ instantly calculates the{' '}
          <strong style={{ color: '#CBD5E1' }}>Income Value</strong> — the
          maximum price where cash flow stays positive — your{' '}
          <strong style={{ color: '#CBD5E1' }}>Target Buy</strong>, and the{' '}
          <strong style={{ color: '#CBD5E1' }}>Deal Gap</strong> between the
          asking price and the price that actually works. Six strategies. One
          scan. Your answer.
        </p>

        {/* Address input + Scan */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              maxWidth: '540px',
              margin: '0 auto 10px',
              position: 'relative',
            }}
          >
            {/* Input row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0D1424',
                border: `1px solid ${focused ? 'rgba(14,165,233,0.35)' : 'rgba(148,163,184,0.1)'}`,
                borderRadius: '10px',
                padding: '4px 4px 4px 16px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.06)' : 'none',
              }}
            >
              <SearchIcon />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter any property address..."
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#E2E8F0',
                  fontSize: '14px',
                  padding: '12px 12px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '10px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.2s',
                }}
              >
                Analyze <ArrowIcon />
              </button>
            </div>

            {/* Divider with OR */}
            {onScanProperty && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '12px 0',
                    padding: '0 8px',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', background: 'rgba(148,163,184,0.08)' }} />
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(148,163,184,0.08)' }} />
                </div>

                {/* Scan Property button */}
                <button
                  type="button"
                  onClick={onScanProperty}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px 20px',
                    background: 'rgba(14,165,233,0.04)',
                    border: '1px solid rgba(14,165,233,0.12)',
                    borderRadius: '10px',
                    color: '#CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  <CameraIcon />
                  Scan Property
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: 400, marginLeft: '4px' }}>
                    — snap a photo of any For Sale sign
                  </span>
                </button>
              </>
            )}
          </div>
        </form>

        {/* Micro-copy */}
        <div
          style={{
            fontSize: '12px',
            color: '#64748B',
            marginBottom: '40px',
          }}
        >
          <strong style={{ color: '#94A3B8' }}>60-second analysis</strong> ·
          6 strategies · No credit card required
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          {[
            { icon: <ClockIcon />, stat: '60s', label: 'Income Value + Deal Gap', sub: 'for any address' },
            { icon: <TargetIcon />, stat: '3', label: 'Price Signals', sub: 'Income Value · Target Buy · Deal Gap' },
            { icon: <ShieldIcon />, stat: '6', label: 'Strategy Models', sub: 'Rental · STR · BRRRR · Flip · Hack · Wholesale' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: '1 1 160px',
                background: 'rgba(14,165,233,0.03)',
                border: '1px solid rgba(14,165,233,0.06)',
                borderRadius: '10px',
                padding: '16px 14px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                {item.icon}
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#0EA5E9',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {item.stat}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#CBD5E1',
                  marginBottom: '2px',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#475569',
                  lineHeight: 1.4,
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DealGapIQHeroSection;
