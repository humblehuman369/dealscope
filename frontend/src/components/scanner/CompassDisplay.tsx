'use client';

import React from 'react';
import { getCardinalDirection } from '@/lib/geoCalculations';

interface CompassDisplayProps {
  heading: number | null;
  accuracy?: number | null;
}

/**
 * Compass display showing current heading direction.
 */
export function CompassDisplay({ heading, accuracy }: CompassDisplayProps) {
  if (heading === null) {
    return (
      <div className="flex flex-col items-center gap-1 bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3">
        <div className="text-white/50 text-xs">Compass</div>
        <div className="text-white/70 text-sm">Unavailable</div>
      </div>
    );
  }

  const cardinal = getCardinalDirection(heading);

  return (
    <div className="flex flex-col items-center gap-1 bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[80px]">
      {/* Compass needle */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-white/30 rounded-full" />
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${heading}deg)` }}
        >
          {/* North pointer */}
          <div className="absolute -top-0.5 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[14px] border-l-transparent border-r-transparent border-b-red-500" />
          {/* South pointer */}
          <div className="absolute -bottom-0.5 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[10px] border-l-transparent border-r-transparent border-t-white/50" />
        </div>
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      </div>

      {/* Heading display */}
      <div className="text-center">
        <div className="text-white font-bold text-lg leading-none">{heading}°</div>
        <div className="text-teal-400 font-semibold text-sm">{cardinal}</div>
      </div>

      {/* Accuracy indicator */}
      {accuracy !== null && accuracy !== undefined && (
        <div className="text-white/50 text-[10px]">
          ±{Math.round(accuracy)}m
        </div>
      )}
    </div>
  );
}

