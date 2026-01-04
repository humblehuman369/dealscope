'use client';

import React from 'react';

interface DistanceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * Distance slider for adjusting scan range.
 */
export function DistanceSlider({ value, onChange, min = 10, max = 200 }: DistanceSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/70">Distance</span>
        <span className="text-sm font-bold text-white">{value}m</span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          id="distance-slider"
          aria-label={`Distance: ${value} meters`}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 appearance-none cursor-pointer rounded-full"
          style={{
            background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${percentage}%, rgba(255,255,255,0.2) ${percentage}%, rgba(255,255,255,0.2) 100%)`,
          }}
        />
      </div>
      
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-white/50">{min}m</span>
        <span className="text-[10px] text-white/50">{max}m</span>
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}

