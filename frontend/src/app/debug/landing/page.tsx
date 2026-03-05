'use client';

import React, { useState } from 'react';
import { ResponsiveLandingPage } from '@/components/landing/ResponsiveLandingPage';
import { MobileLandingPage } from '@/components/MobileLandingPage';

type PreviewMode = 'responsive' | 'mobile';

export default function LandingPreviewPage() {
  const [mode, setMode] = useState<PreviewMode>('responsive');

  const handlePointAndScan = () => {
    // Preview-only stub to avoid navigation side-effects.
    console.info('[LandingPreview] Point & Scan clicked');
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="text-xs sm:text-sm text-white/80">
          Landing Preview (temporary)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('responsive')}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full border transition-colors ${
              mode === 'responsive'
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
            }`}
          >
            Responsive Landing
          </button>
          <button
            type="button"
            onClick={() => setMode('mobile')}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full border transition-colors ${
              mode === 'mobile'
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
            }`}
          >
            Mobile Landing
          </button>
        </div>
      </div>

      <div className="relative">
        {mode === 'responsive' ? (
          <ResponsiveLandingPage onPointAndScan={handlePointAndScan} />
        ) : (
          <MobileLandingPage onPointAndScan={handlePointAndScan} />
        )}
      </div>
    </div>
  );
}
