'use client'

import React from 'react'

interface ScaleBarProps {
  score: number
  isDark?: boolean
}

export function ScaleBar({ score, isDark = false }: ScaleBarProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score))
  
  return (
    <div className="flex justify-center mt-2">
      <div 
        className="relative h-2 rounded-full overflow-visible"
        style={{ 
          width: '66%',
          background: 'linear-gradient(to right, #ef4444, #22c55e)'
        }}
      >
        <div 
          className="absolute top-1/2 rounded-full transition-all duration-500 ease-out"
          style={{ 
            left: `${clampedScore}%`, 
            transform: 'translate(-50%, -50%)',
            width: '3px',
            height: '14px',
            backgroundColor: isDark ? '#ffffff' : '#1e293b',
            boxShadow: isDark ? '0 0 6px rgba(255,255,255,0.8)' : '0 0 4px rgba(0,0,0,0.3)'
          }}
        />
      </div>
    </div>
  )
}
