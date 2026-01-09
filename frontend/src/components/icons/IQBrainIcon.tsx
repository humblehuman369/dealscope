'use client';

import React from 'react';

interface IQBrainIconProps {
  size?: number;
  className?: string;
  /** If true, uses cyan for dark mode, blue for light mode */
  themeAware?: boolean;
  /** Override color directly */
  color?: string;
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
  themeAware = true,
  color
}: IQBrainIconProps) {
  // If color is provided, use it; otherwise use CSS variable for theme-awareness
  const strokeColor = color || (themeAware ? 'currentColor' : '#4dd0e1');

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      className={`iq-brain-icon ${className}`}
      style={{ 
        color: themeAware ? 'var(--iq-icon-color, #4dd0e1)' : undefined 
      }}
    >
      {/* Head profile outline */}
      <path 
        d="M75 40
           C75 22 60 8 42 8
           C24 8 10 22 10 40
           C10 50 14 58 20 64
           L20 72
           C20 76 23 80 28 82
           L32 84
           C34 85 36 88 36 90
           L36 92
           C36 94 38 95 40 95
           L52 95
           C54 95 56 94 56 92
           L56 88
           C56 84 60 80 64 78
           L68 76
           C72 74 75 70 76 66
           L78 58
           C80 52 78 46 75 40
           Z"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* House inside the brain */}
      <path 
        d="M42 28
           L24 44
           L24 60
           L36 60
           L36 50
           L48 50
           L48 60
           L60 60
           L60 44
           L42 28
           Z"
        stroke={strokeColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Inline SVG version for use in CSS or static contexts
 */
export const IQBrainIconSVG = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M75 40 C75 22 60 8 42 8 C24 8 10 22 10 40 C10 50 14 58 20 64 L20 72 C20 76 23 80 28 82 L32 84 C34 85 36 88 36 90 L36 92 C36 94 38 95 40 95 L52 95 C54 95 56 94 56 92 L56 88 C56 84 60 80 64 78 L68 76 C72 74 75 70 76 66 L78 58 C80 52 78 46 75 40 Z" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M42 28 L24 44 L24 60 L36 60 L36 50 L48 50 L48 60 L60 60 L60 44 L42 28 Z" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

export default IQBrainIcon;
