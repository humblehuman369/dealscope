'use client';

import React from 'react';

interface ScanTargetProps {
  isScanning: boolean;
  size?: number;
}

/**
 * Animated scan target reticle displayed in the camera view.
 */
export function ScanTarget({ isScanning, size = 200 }: ScanTargetProps) {
  return (
    <div 
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Outer ring */}
      <div 
        className={`absolute inset-0 border-2 border-teal-400/60 rounded-full transition-all duration-300 ${
          isScanning ? 'animate-ping' : ''
        }`}
      />
      
      {/* Inner ring */}
      <div 
        className={`absolute inset-4 border-2 border-white/80 rounded-full transition-all duration-300 ${
          isScanning ? 'animate-pulse' : ''
        }`}
      />
      
      {/* Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Horizontal line - left */}
        <div className="absolute left-6 w-8 h-0.5 bg-teal-400" />
        {/* Horizontal line - right */}
        <div className="absolute right-6 w-8 h-0.5 bg-teal-400" />
        {/* Vertical line - top */}
        <div className="absolute top-6 h-8 w-0.5 bg-teal-400" />
        {/* Vertical line - bottom */}
        <div className="absolute bottom-6 h-8 w-0.5 bg-teal-400" />
        
        {/* Center dot */}
        <div className={`w-3 h-3 rounded-full transition-all duration-200 ${
          isScanning ? 'bg-teal-400 animate-pulse' : 'bg-white'
        }`} />
      </div>
      
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white rounded-br-lg" />

      {/* Scanning indicator badge */}
      {isScanning && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Scanning...
        </div>
      )}
    </div>
  );
}

