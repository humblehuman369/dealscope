'use client'

/**
 * AtAGlanceSection Component - Decision-Grade UI
 * 
 * Displays performance breakdown bars for key metrics.
 * Per DealMakerIQ Design System - high contrast, legibility-first.
 */

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface PerformanceBar {
  label: string
  value: number
  tooltip?: string
}

interface AtAGlanceSectionProps {
  bars: PerformanceBar[]
  compositeScore?: number
  defaultExpanded?: boolean
}

// Get color class based on value
function getBarColorClass(value: number): 'teal' | 'amber' | 'negative' {
  if (value >= 70) return 'teal'
  if (value >= 40) return 'amber'
  return 'negative'
}

export function AtAGlanceSection({ 
  bars, 
  compositeScore,
  defaultExpanded = false 
}: AtAGlanceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div style={{ background: 'var(--dg-bg-primary)' }}>
      {/* Section Divider */}
      <div className="dg-section-divider" />
      
      {/* Header */}
      <section style={{ padding: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {/* Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--dg-deep-navy)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2px',
            }}>
              {[...Array(9)].map((_, i) => (
                <div key={i} style={{
                  width: '6px',
                  height: '6px',
                  background: 'white',
                  borderRadius: '1px',
                }} />
              ))}
            </div>
          </div>
          
          {/* Title Group */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--dg-text-primary)',
            }}>At-a-Glance</div>
            <div style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--dg-text-secondary)',
            }}>Performance breakdown</div>
          </div>
          
          {/* Toggle */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <ChevronDown 
              style={{ 
                width: '20px', 
                height: '20px', 
                color: 'var(--dg-text-primary)',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }} 
            />
          </button>
        </div>

        {/* Content - always visible or expandable */}
        {(isExpanded || defaultExpanded) && (
          <>
            {bars.map((bar, idx) => (
              <div key={idx} className="dg-confidence-row">
                <span className="dg-confidence-label" style={{ width: '100px' }}>{bar.label}</span>
                <div className="dg-confidence-bar">
                  <div 
                    className={`dg-confidence-fill ${getBarColorClass(bar.value)}`}
                    style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
                  />
                </div>
                <span className={`dg-confidence-value ${getBarColorClass(bar.value)}`} style={{ width: '42px' }}>
                  {Math.round(bar.value)}%
                </span>
              </div>
            ))}
            
            {compositeScore !== undefined && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'var(--dg-bg-secondary)',
                borderRadius: '6px',
              }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--dg-text-primary)',
                }}>
                  <strong style={{ color: 'var(--dg-pacific-teal)' }}>Composite:</strong> {compositeScore}% score across returns and risk protection.
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default AtAGlanceSection
