'use client';

import React from 'react';
import { Camera, MapPin } from 'lucide-react';

interface PhoneScannerMockupProps {
  isDark?: boolean;
  onScanPress?: () => void;
  onAddressPress?: () => void;
}

export function PhoneScannerMockup({ isDark = true, onScanPress, onAddressPress }: PhoneScannerMockupProps) {
  return (
    <div className="scanner-mockup w-full max-w-[360px] lg:max-w-[500px] mx-auto">
      {/* Scanner Header */}
      <div className="text-center mb-4 lg:mb-6">
        <span className={`text-[15px] lg:text-lg font-normal tracking-wide inline-flex items-center ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
          Analyzing Data
          <span className="ml-2 inline-flex gap-[3px] lg:gap-1 loading-dots">
            <span className={`w-[4px] h-[4px] lg:w-[6px] lg:h-[6px] rounded-full ${isDark ? 'bg-accent-500' : 'bg-accent-light'}`} />
            <span className={`w-[4px] h-[4px] lg:w-[6px] lg:h-[6px] rounded-full ${isDark ? 'bg-accent-500' : 'bg-accent-light'}`} />
            <span className={`w-[4px] h-[4px] lg:w-[6px] lg:h-[6px] rounded-full ${isDark ? 'bg-accent-500' : 'bg-accent-light'}`} />
          </span>
        </span>
      </div>

      {/* Viewfinder Container */}
      <div 
        className="relative w-full rounded-[20px] lg:rounded-[28px] overflow-visible"
        style={{ 
          aspectRatio: '400 / 240',
          background: isDark 
            ? 'linear-gradient(180deg, #1a3a4a 0%, #0f2535 100%)' 
            : 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
          boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 229, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 15px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* House Background */}
        <div 
          className="w-full h-full flex items-center justify-center rounded-[20px] overflow-hidden"
          style={{
            background: isDark 
              ? 'linear-gradient(180deg, rgba(30, 60, 80, 0.9) 0%, rgba(20, 45, 60, 0.95) 50%, rgba(15, 35, 50, 1) 100%)'
              : 'linear-gradient(180deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.98) 50%, rgba(203, 213, 225, 1) 100%)'
          }}
        >
          <HouseSVG isDark={isDark} />
        </div>
        
        {/* AR Targeting Brackets */}
        <Bracket position="top-5 left-5" corner="tl" />
        <Bracket position="top-5 right-5" corner="tr" />
        <Bracket position="bottom-5 left-5" corner="bl" />
        <Bracket position="bottom-5 right-5" corner="br" />
        
        {/* Location Card */}
        <div 
          className="absolute bottom-12 left-1/2 -translate-x-1/2 py-3 px-5 rounded-xl text-center z-10"
          style={{
            background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className={`text-[9px] font-semibold uppercase tracking-[1.5px] mb-0.5 ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>
            Property Located
          </div>
          <div className={`text-[13px] font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            123 Main Street, Anytown
          </div>
        </div>
        
        {/* Arc Scan Pulses */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full flex justify-center pointer-events-none z-[5]">
          <div className="arc-pulse arc-pulse-1" />
          <div className="arc-pulse arc-pulse-2" />
          <div className="arc-pulse arc-pulse-3" />
          <div className="scanner-origin" />
        </div>
      </div>

      {/* Search by either label */}
      <p className={`text-center text-[12px] lg:text-sm mt-4 lg:mt-6 mb-2 lg:mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
        Search by either
      </p>

      {/* Action Buttons - Main CTAs */}
      <div className="flex gap-3 lg:gap-4 justify-center">
        <button 
          onClick={onScanPress}
          className="flex-1 max-w-[140px] lg:max-w-[180px] py-3.5 lg:py-4 px-6 lg:px-8 rounded-xl lg:rounded-2xl text-[15px] lg:text-base font-semibold text-[#07172e] flex items-center justify-center gap-2 transition-transform hover:scale-105"
          style={{
            background: `linear-gradient(135deg, var(--gradient-teal-start) 0%, var(--gradient-teal-end) 100%)`,
            boxShadow: `0 4px 20px rgba(var(--color-teal-rgb), 0.4)`
          }}
        >
          <Camera className="w-4 h-4 lg:w-5 lg:h-5" />
          Scan
        </button>
        <button 
          onClick={onAddressPress}
          className={`flex-1 max-w-[140px] lg:max-w-[180px] py-3.5 lg:py-4 px-6 lg:px-8 rounded-xl lg:rounded-2xl text-[15px] lg:text-base font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 ${isDark ? 'text-[#e1e8ed] hover:bg-white/10' : 'text-gray-700 hover:bg-black/10'}`}
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          <MapPin className="w-4 h-4 lg:w-5 lg:h-5" />
          Address
        </button>
      </div>

      {/* Scoped Styles */}
      <style jsx>{`
        .loading-dots span {
          animation: loadingDots 1.5s infinite;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: 0s;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes loadingDots {
          0%, 20% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
          100% {
            opacity: 0.3;
          }
        }

        .arc-pulse {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          border: 3px solid var(--color-teal);
          border-bottom: none;
          border-radius: 200px 200px 0 0;
          opacity: 0;
          animation: arcScanUp 3s ease-in infinite;
        }

        .arc-pulse-1 { animation-delay: 0s; }
        .arc-pulse-2 { animation-delay: 1s; }
        .arc-pulse-3 { animation-delay: 2s; }

        @keyframes arcScanUp {
          0% {
            width: 300px;
            height: 80px;
            bottom: -10px;
            opacity: 0;
            border-color: rgba(var(--color-teal-rgb), 0.15);
            filter: drop-shadow(0 0 2px rgba(var(--color-teal-rgb), 0.2));
          }
          15% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
            border-color: rgba(var(--color-teal-rgb), 0.7);
          }
          85% {
            opacity: 0.9;
            border-color: var(--color-teal);
          }
          100% {
            width: 40px;
            height: 20px;
            bottom: 120px;
            opacity: 0;
            border-color: var(--color-teal);
            filter: drop-shadow(0 0 15px rgba(var(--color-teal-rgb), 1));
          }
        }

        .scanner-origin {
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          background: var(--color-teal);
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(var(--color-teal-rgb), 0.9), 0 0 40px rgba(var(--color-teal-rgb), 0.4);
          animation: originPulse 2s ease-in-out infinite;
          z-index: 10;
        }

        @keyframes originPulse {
          0%, 100% { 
            box-shadow: 0 0 15px rgba(var(--color-teal-rgb), 0.7), 0 0 30px rgba(var(--color-teal-rgb), 0.3);
            transform: translateX(-50%) scale(1);
          }
          50% { 
            box-shadow: 0 0 25px rgba(var(--color-teal-rgb), 1), 0 0 50px rgba(var(--color-teal-rgb), 0.5);
            transform: translateX(-50%) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}

// Bracket Component
interface BracketProps {
  position: string;
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

function Bracket({ position, corner }: BracketProps) {
  const borderStyles: Record<string, string> = {
    tl: 'border-t-[3px] border-l-[3px] rounded-tl-lg',
    tr: 'border-t-[3px] border-r-[3px] rounded-tr-lg',
    bl: 'border-b-[3px] border-l-[3px] rounded-bl-lg',
    br: 'border-b-[3px] border-r-[3px] rounded-br-lg',
  };

  return (
    <div 
      className={`absolute ${position} w-9 h-9 ${borderStyles[corner]} animate-bracket-pulse`}
      style={{ 
        borderColor: 'var(--color-teal)',
        filter: `drop-shadow(0 0 6px rgba(var(--color-teal-rgb), 0.6))`,
        animation: 'bracketPulse 3s ease-in-out infinite'
      }}
    />
  );
}

// House SVG Component
function HouseSVG({ isDark = true }: { isDark?: boolean }) {
  return (
    <svg className="w-[200px] h-[160px] opacity-90" viewBox="0 0 200 160" fill="none">
      <defs>
        <linearGradient id="houseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: isDark ? '#4a6070' : '#94a3b8' }} />
          <stop offset="100%" style={{ stopColor: isDark ? '#3a4a55' : '#64748b' }} />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: isDark ? '#3a4a55' : '#475569' }} />
          <stop offset="100%" style={{ stopColor: isDark ? '#2a3a45' : '#334155' }} />
        </linearGradient>
      </defs>
      
      {/* Main house body */}
      <rect x="30" y="70" width="140" height="80" fill="url(#houseGrad)" rx="2"/>
      
      {/* Roof */}
      <polygon points="100,20 20,70 180,70" fill="url(#roofGrad)"/>
      <polygon points="100,20 25,70 175,70" fill="none" stroke={isDark ? '#4dd0e1' : '#007ea7'} strokeWidth="1" opacity="0.3"/>
      
      {/* Porch roof */}
      <rect x="55" y="100" width="90" height="8" fill={isDark ? '#2a3a45' : '#475569'}/>
      
      {/* Door */}
      <rect x="85" y="105" width="30" height="45" fill={isDark ? '#2a3540' : '#334155'} rx="2"/>
      <circle cx="108" cy="130" r="2" fill={isDark ? '#4dd0e1' : '#007ea7'} opacity="0.6"/>
      
      {/* Windows - left */}
      <rect x="40" y="80" width="30" height="25" fill={isDark ? '#1a2530' : '#e2e8f0'} rx="1"/>
      <rect x="40" y="80" width="30" height="25" fill="none" stroke={isDark ? '#4dd0e1' : '#007ea7'} strokeWidth="0.5" opacity="0.4" rx="1"/>
      <line x1="55" y1="80" x2="55" y2="105" stroke={isDark ? '#3a4a55' : '#94a3b8'} strokeWidth="2"/>
      <line x1="40" y1="92" x2="70" y2="92" stroke={isDark ? '#3a4a55' : '#94a3b8'} strokeWidth="2"/>
      
      {/* Windows - right */}
      <rect x="130" y="80" width="30" height="25" fill={isDark ? '#1a2530' : '#e2e8f0'} rx="1"/>
      <rect x="130" y="80" width="30" height="25" fill="none" stroke={isDark ? '#4dd0e1' : '#007ea7'} strokeWidth="0.5" opacity="0.4" rx="1"/>
      <line x1="145" y1="80" x2="145" y2="105" stroke={isDark ? '#3a4a55' : '#94a3b8'} strokeWidth="2"/>
      <line x1="130" y1="92" x2="160" y2="92" stroke={isDark ? '#3a4a55' : '#94a3b8'} strokeWidth="2"/>
      
      {/* Attic window */}
      <circle cx="100" cy="50" r="12" fill={isDark ? '#1a2530' : '#e2e8f0'}/>
      <circle cx="100" cy="50" r="12" fill="none" stroke={isDark ? '#4dd0e1' : '#007ea7'} strokeWidth="0.5" opacity="0.4"/>
      
      {/* Porch pillars */}
      <rect x="60" y="100" width="6" height="50" fill={isDark ? '#4a5a65' : '#94a3b8'}/>
      <rect x="134" y="100" width="6" height="50" fill={isDark ? '#4a5a65' : '#94a3b8'}/>
      
      {/* Ground/lawn */}
      <rect x="0" y="148" width="200" height="12" fill={isDark ? '#1a2a35' : '#cbd5e1'}/>
    </svg>
  );
}
