'use client';

import React from 'react';

export function PhoneScannerMockup() {
  return (
    <div className="w-[220px] relative" style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.4))' }}>
      {/* Phone Frame */}
      <div 
        className="rounded-[48px] p-[10px]"
        style={{
          background: 'linear-gradient(145deg, #3a4a5a 0%, #2a3a4a 20%, #1a2a3a 50%, #0f1a2a 100%)',
          boxShadow: `
            0 60px 120px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.12)
          `
        }}
      >
        {/* Phone Screen */}
        <div 
          className="rounded-[40px] overflow-hidden relative"
          style={{ background: 'linear-gradient(180deg, #0a1628 0%, #07172e 100%)' }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-8 bg-black rounded-[20px] z-50" />
          
          {/* Status Bar */}
          <div className="flex justify-between items-center px-7 pt-4 pb-3 relative z-10">
            <span className="text-base font-semibold text-white tracking-tight">9:41</span>
            <div className="flex items-center gap-1.5">
              {/* Signal */}
              <svg viewBox="0 0 18 12" className="h-[13px] fill-white">
                <path d="M1 4C1 3.4 1.4 3 2 3h1c.6 0 1 .4 1 1v5c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V4zM5 3c0-.6.4-1 1-1h1c.6 0 1 .4 1 1v6c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1V3zM10 2c0-.6.4-1 1-1h1c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1h-1c-.6 0-1-.4-1-1V2zM15 1c0-.6.4-1 1-1h1c.6 0 1 .4 1 1v8c0 .6-.4 1-1 1h-1c-.6 0-1-.4-1-1V1z"/>
              </svg>
              {/* WiFi */}
              <svg viewBox="0 0 16 12" className="h-[13px] fill-white">
                <path d="M8 2.4c2.4 0 4.6.9 6.2 2.5.3.3.3.8 0 1.1-.3.3-.8.3-1.1 0C11.8 4.7 10 4 8 4S4.2 4.7 2.9 6c-.3.3-.8.3-1.1 0-.3-.3-.3-.8 0-1.1C3.4 3.3 5.6 2.4 8 2.4z"/>
              </svg>
              {/* Battery */}
              <svg viewBox="0 0 28 14" className="h-[13px]">
                <rect x="0.5" y="0.5" width="23" height="12" rx="3" stroke="white" strokeOpacity="0.35" fill="none"/>
                <rect x="2" y="2" width="18" height="9" rx="2" fill="white"/>
              </svg>
            </div>
          </div>

          {/* Screen Content */}
          <div className="px-6 pb-6 min-h-[450px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 py-1 pb-4">
              <span className="text-[17px] font-normal text-white tracking-wide flex items-center">
                Analyzing Data
                <span className="ml-1.5 inline-flex gap-1 animate-loading-dots">
                  <span className="w-[3px] h-[3px] bg-accent-500 rounded-full" />
                  <span className="w-[3px] h-[3px] bg-accent-500 rounded-full animation-delay-200" />
                  <span className="w-[3px] h-[3px] bg-accent-500 rounded-full animation-delay-400" />
                </span>
              </span>
            </div>

            {/* Viewfinder Section */}
            <div className="flex-1 flex flex-col items-center">
              {/* Camera Viewfinder */}
              <div 
                className="relative w-[192px] h-[150px] rounded-2xl overflow-visible"
                style={{ background: 'linear-gradient(180deg, #1a3a4a 0%, #0f2535 100%)' }}
              >
                {/* House Placeholder */}
                <div className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden relative"
                  style={{
                    background: 'linear-gradient(180deg, rgba(30, 60, 80, 0.9) 0%, rgba(20, 45, 60, 0.95) 50%, rgba(15, 35, 50, 1) 100%)'
                  }}
                >
                  <HouseSVG />
                </div>
                
                {/* AR Targeting Brackets */}
                <Bracket position="top-4 left-4" corner="tl" />
                <Bracket position="top-4 right-4" corner="tr" />
                <Bracket position="bottom-4 left-4" corner="bl" />
                <Bracket position="bottom-4 right-4" corner="br" />
                
                {/* Arc Scan Container */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full flex justify-center pointer-events-none z-10">
                  <div className="arc-pulse arc-pulse-1" />
                  <div className="arc-pulse arc-pulse-2" />
                  <div className="arc-pulse arc-pulse-3" />
                  <div className="scanner-origin" />
                </div>
              </div>

              {/* Location Card */}
              <div 
                className="mt-4 py-4 px-5 rounded-[14px] text-center w-full backdrop-blur-[10px]"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 229, 255, 0.15)'
                }}
              >
                <div className="text-[10px] font-semibold text-accent-500 uppercase tracking-[1.5px] mb-1">
                  Property Located
                </div>
                <div className="text-sm font-semibold text-white">
                  123 Main Street, Anytown
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-3.5 justify-center">
                <button 
                  className="py-2.5 px-7 rounded-[10px] text-sm font-semibold text-[#07172e]"
                  style={{
                    background: 'linear-gradient(135deg, #00e5ff 0%, #00c4d9 100%)',
                    boxShadow: '0 4px 20px rgba(0, 229, 255, 0.4)'
                  }}
                >
                  Scan
                </button>
                <button 
                  className="py-2.5 px-7 rounded-[10px] text-sm font-semibold text-[#e1e8ed]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}
                >
                  Details
                </button>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex justify-center items-center gap-8 py-5 mt-auto">
              <BottomIcon>
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#8892a0] stroke-[1.5] fill-none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </BottomIcon>
              
              <div 
                className="w-[50px] h-[50px] rounded-full border-4 animate-capture-glow"
                style={{
                  background: 'linear-gradient(135deg, #00e5ff 0%, #00d4e8 50%, #00c4d9 100%)',
                  borderColor: 'rgba(0, 229, 255, 0.3)',
                  boxShadow: '0 0 25px rgba(0, 229, 255, 0.5)'
                }}
              />
              
              <BottomIcon>
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#8892a0] stroke-[1.5] fill-none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </BottomIcon>
            </div>

            {/* Home Indicator */}
            <div className="w-[100px] h-[5px] bg-white/20 rounded-full mx-auto" />
          </div>
        </div>
      </div>

      {/* Scoped Styles */}
      <style jsx>{`
        .arc-pulse {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          border: 3px solid #00e5ff;
          border-bottom: none;
          border-radius: 100px 100px 0 0;
          opacity: 0;
          animation: arcScanUp 3s ease-in infinite;
        }

        .arc-pulse-1 { animation-delay: 0s; }
        .arc-pulse-2 { animation-delay: 1s; }
        .arc-pulse-3 { animation-delay: 2s; }

        @keyframes arcScanUp {
          0% {
            width: 160px;
            height: 40px;
            bottom: -10px;
            opacity: 0;
            border-color: rgba(0, 229, 255, 0.15);
            filter: drop-shadow(0 0 2px rgba(0, 229, 255, 0.2));
          }
          15% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
            border-color: rgba(0, 229, 255, 0.7);
          }
          85% {
            opacity: 0.9;
            border-color: #00e5ff;
          }
          100% {
            width: 20px;
            height: 10px;
            bottom: 70px;
            opacity: 0;
            border-color: #00e5ff;
            filter: drop-shadow(0 0 15px rgba(0, 229, 255, 1));
          }
        }

        .scanner-origin {
          position: absolute;
          bottom: -14px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          background: #00e5ff;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.9), 0 0 30px rgba(0, 229, 255, 0.4);
          animation: originPulse 2s ease-in-out infinite;
          z-index: 10;
        }

        @keyframes originPulse {
          0%, 100% { 
            box-shadow: 0 0 12px rgba(0, 229, 255, 0.7), 0 0 24px rgba(0, 229, 255, 0.3);
            transform: translateX(-50%) scale(1);
          }
          50% { 
            box-shadow: 0 0 20px rgba(0, 229, 255, 1), 0 0 40px rgba(0, 229, 255, 0.5);
            transform: translateX(-50%) scale(1.2);
          }
        }

        .animate-capture-glow {
          animation: captureGlow 3s ease-in-out infinite;
        }

        @keyframes captureGlow {
          0%, 100% { 
            box-shadow: 0 0 18px rgba(0, 229, 255, 0.4);
            border-color: rgba(0, 229, 255, 0.3);
          }
          50% { 
            box-shadow: 0 0 30px rgba(0, 229, 255, 0.6);
            border-color: rgba(0, 229, 255, 0.5);
          }
        }

        .animate-loading-dots span {
          animation: loadingDots 1.5s infinite;
        }

        .animate-loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .animate-loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes loadingDots {
          0%, 20% { opacity: 0.3; }
          40% { opacity: 1; }
          100% { opacity: 0.3; }
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
    tl: 'border-t-[3px] border-l-[3px] rounded-tl-md',
    tr: 'border-t-[3px] border-r-[3px] rounded-tr-md',
    bl: 'border-b-[3px] border-l-[3px] rounded-bl-md',
    br: 'border-b-[3px] border-r-[3px] rounded-br-md',
  };

  return (
    <div 
      className={`absolute ${position} w-7 h-7 border-accent-500 ${borderStyles[corner]} animate-bracket-pulse`}
      style={{ filter: 'drop-shadow(0 0 4px rgba(0, 229, 255, 0.6))' }}
    />
  );
}

// Bottom Icon Component
function BottomIcon({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="w-[35px] h-[35px] flex items-center justify-center rounded-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}
    >
      {children}
    </div>
  );
}

// House SVG Component
function HouseSVG() {
  return (
    <svg className="w-[120px] h-[100px] opacity-85" viewBox="0 0 200 160" fill="none">
      <defs>
        <linearGradient id="houseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4a6070' }} />
          <stop offset="100%" style={{ stopColor: '#3a4a55' }} />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3a4a55' }} />
          <stop offset="100%" style={{ stopColor: '#2a3a45' }} />
        </linearGradient>
      </defs>
      
      {/* Main house body */}
      <rect x="30" y="70" width="140" height="80" fill="url(#houseGrad)" rx="2"/>
      
      {/* Roof */}
      <polygon points="100,20 20,70 180,70" fill="url(#roofGrad)"/>
      <polygon points="100,20 25,70 175,70" fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.3"/>
      
      {/* Porch roof */}
      <rect x="55" y="100" width="90" height="8" fill="#2a3a45"/>
      
      {/* Door */}
      <rect x="85" y="105" width="30" height="45" fill="#2a3540" rx="2"/>
      <circle cx="108" cy="130" r="2" fill="#00e5ff" opacity="0.6"/>
      
      {/* Windows - left */}
      <rect x="40" y="80" width="30" height="25" fill="#1a2530" rx="1"/>
      <rect x="40" y="80" width="30" height="25" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.4" rx="1"/>
      <line x1="55" y1="80" x2="55" y2="105" stroke="#3a4a55" strokeWidth="2"/>
      <line x1="40" y1="92" x2="70" y2="92" stroke="#3a4a55" strokeWidth="2"/>
      
      {/* Windows - right */}
      <rect x="130" y="80" width="30" height="25" fill="#1a2530" rx="1"/>
      <rect x="130" y="80" width="30" height="25" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.4" rx="1"/>
      <line x1="145" y1="80" x2="145" y2="105" stroke="#3a4a55" strokeWidth="2"/>
      <line x1="130" y1="92" x2="160" y2="92" stroke="#3a4a55" strokeWidth="2"/>
      
      {/* Attic window */}
      <circle cx="100" cy="50" r="12" fill="#1a2530"/>
      <circle cx="100" cy="50" r="12" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.4"/>
      
      {/* Porch pillars */}
      <rect x="60" y="100" width="6" height="50" fill="#4a5a65"/>
      <rect x="134" y="100" width="6" height="50" fill="#4a5a65"/>
      
      {/* Ground/lawn */}
      <rect x="0" y="148" width="200" height="12" fill="#1a2a35"/>
    </svg>
  );
}

