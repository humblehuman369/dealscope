'use client';

import React from 'react';

interface PhoneScannerMockupProps {
  isDark?: boolean;
  onScanPress?: () => void;
  onAddressPress?: () => void;
}

export function PhoneScannerMockup({ isDark = true, onScanPress, onAddressPress }: PhoneScannerMockupProps) {
  return (
    <div className="scanner-mockup w-full max-w-[360px] lg:max-w-[460px] mx-auto">
      {/* Scanner Card */}
      <div 
        className="scanner-card rounded-[20px] p-5 lg:p-6"
        style={{
          background: isDark 
            ? 'linear-gradient(145deg, rgba(77,208,225,0.08) 0%, rgba(4,101,242,0.08) 100%)'
            : 'linear-gradient(145deg, rgba(0,126,167,0.06) 0%, rgba(4,101,242,0.06) 100%)',
          border: isDark 
            ? '1px solid rgba(77,208,225,0.2)'
            : '1px solid rgba(0,126,167,0.15)'
        }}
      >
        {/* Scanner Viewport */}
        <div className="scanner-viewport h-[160px] lg:h-[180px] flex items-center justify-center relative mb-4">
          <div className="scanner-frame w-[160px] lg:w-[180px] h-[140px] lg:h-[160px] relative">
            {/* Animated Glow */}
            <div 
              className="scanner-glow absolute -inset-5 rounded-[20px] animate-glow-pulse"
              style={{
                background: isDark 
                  ? 'rgba(77,208,225,0.15)'
                  : 'rgba(0,126,167,0.12)',
                filter: 'blur(20px)'
              }}
            />
            
            {/* Corner Brackets */}
            <div className={`corner corner-tl absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] rounded-tl-md animate-corner-pulse ${isDark ? 'border-accent-500' : 'border-accent-light'}`} style={{ animationDelay: '0s' }} />
            <div className={`corner corner-tr absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] rounded-tr-md animate-corner-pulse ${isDark ? 'border-accent-500' : 'border-accent-light'}`} style={{ animationDelay: '0.1s' }} />
            <div className={`corner corner-bl absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] rounded-bl-md animate-corner-pulse ${isDark ? 'border-accent-500' : 'border-accent-light'}`} style={{ animationDelay: '0.2s' }} />
            <div className={`corner corner-br absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] rounded-br-md animate-corner-pulse ${isDark ? 'border-accent-500' : 'border-accent-light'}`} style={{ animationDelay: '0.3s' }} />
            
            {/* Scanning Line */}
            <div 
              className="scan-line absolute left-[10px] right-[10px] h-[2px] z-10 animate-scan-move"
              style={{
                background: isDark 
                  ? 'linear-gradient(90deg, transparent, #4dd0e1, transparent)'
                  : 'linear-gradient(90deg, transparent, #007ea7, transparent)',
                boxShadow: isDark 
                  ? '0 0 15px #4dd0e1, 0 0 30px #4dd0e1'
                  : '0 0 15px #007ea7, 0 0 30px #007ea7'
              }}
            />
            
            {/* House Icon */}
            <div className="house-icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-16 lg:w-24 lg:h-20">
              <svg viewBox="0 0 100 80" className="w-full h-full" fill={isDark ? '#aab2bd' : '#07172e'} fillOpacity={isDark ? 0.35 : 0.15}>
                <path d="M50 5L5 40h10v35h70V40h10L50 5zm-20 65V45h15v25H30zm25 0V45h15v25H55z"/>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Property Badge */}
        <div 
          className="property-badge text-center py-3.5 px-4 rounded-xl mb-4"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(7,23,46,0.03)'
          }}
        >
          <div className={`text-[11px] font-bold tracking-[0.12em] uppercase mb-1 ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>
            Property Located
          </div>
          <div className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            123 Main Street, Anytown
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="action-buttons flex gap-3">
          <button 
            onClick={onScanPress}
            className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, #0097a7 0%, #4dd0e1 100%)'
                : 'linear-gradient(135deg, #007ea7 0%, #0097a7 100%)'
            }}
          >
            Point &amp; Scan
          </button>
          <button 
            onClick={onAddressPress}
            className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 hover:brightness-110 ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(7,23,46,0.12)'
            }}
          >
            Enter Address
          </button>
        </div>
      </div>

      {/* Scoped Styles */}
      <style jsx>{`
        @keyframes glowPulse {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(0.95);
          }
          50% { 
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes cornerPulse {
          0%, 100% { 
            opacity: 0.6;
            box-shadow: 0 0 10px ${isDark ? 'rgba(77,208,225,0.3)' : 'rgba(0,126,167,0.3)'};
          }
          50% { 
            opacity: 1;
            box-shadow: 0 0 25px ${isDark ? 'rgba(77,208,225,0.8)' : 'rgba(0,126,167,0.6)'};
          }
        }

        @keyframes scanMove {
          0%, 100% { 
            top: 15px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          95%, 100% {
            top: calc(100% - 15px);
            opacity: 0;
          }
        }

        .animate-glow-pulse {
          animation: glowPulse 2s ease-in-out infinite;
        }

        .animate-corner-pulse {
          animation: cornerPulse 2s ease-in-out infinite;
        }

        .animate-scan-move {
          animation: scanMove 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
