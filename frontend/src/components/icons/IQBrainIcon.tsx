'use client';

import React from 'react';
import Image from 'next/image';

interface IQBrainIconProps {
  size?: number;
  className?: string;
  /** Use dark mode (cyan) or light mode (blue) version */
  mode?: 'dark' | 'light';
  /** Use PNG image instead of inline SVG */
  usePng?: boolean;
}

/**
 * IQ Brain Icon - A human head profile with a house in the brain
 * Represents "real estate on the brain" - the genius investment advisor
 * 
 * Colors:
 * - Light mode: #1976d2 (blue)
 * - Dark mode: #4dd0e1 (electric cyan)
 */
export function IQBrainIcon({ 
  size = 20, 
  className = '',
  mode = 'dark',
  usePng = true
}: IQBrainIconProps) {
  const strokeColor = mode === 'dark' ? '#4dd0e1' : '#1976d2';

  if (usePng) {
    return (
      <Image 
        src={mode === 'dark' ? '/images/iq-brain-dark.png' : '/images/iq-brain-light.png'}
        alt="IQ - Real Estate on the Brain"
        width={size}
        height={size}
        className={`iq-brain-icon ${className}`}
      />
    );
  }

  // SVG fallback version
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      className={`iq-brain-icon ${className}`}
    >
      {/* Head profile outline */}
      <path 
        d="M50 8
           C28 8 12 24 12 44
           C12 54 16 62 22 68
           L22 74
           C22 76 24 78 26 80
           L30 82
           C32 83 34 86 34 88
           L34 90
           C34 92 36 94 38 94
           L46 94
           C48 94 50 92 50 90
           L50 86
           C50 82 54 78 58 76
           L62 74
           C66 72 70 68 72 64
           L74 58
           C76 52 78 46 78 40
           C78 34 76 28 72 24
           L76 20
           C78 18 80 14 78 12
           C76 10 72 12 70 14
           L66 18
           C62 14 56 10 50 8
           Z"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* House inside the brain */}
      <path 
        d="M50 24
           L28 42
           L28 62
           L38 62
           L38 50
           L62 50
           L62 62
           L72 62
           L72 42
           L50 24
           Z"
        stroke={strokeColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default IQBrainIcon;
