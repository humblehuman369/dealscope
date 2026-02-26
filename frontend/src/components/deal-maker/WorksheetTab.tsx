/**
 * WorksheetTab - Deal Maker IQ accordion card
 * EXACT implementation from design files
 * 
 * Design specs:
 * - Card: white bg, border-radius 12px, border 1px solid #F1F5F9
 * - Active card: box-shadow 0 0 0 2px rgba(8, 145, 178, 0.2)
 * - Header: padding 14px 16px, gap 12px
 * - Icon: 24x24, color #0EA5E9
 * - Title: 15px, font-weight 600, color #0A1628
 * - Chevron: 20x20, color #94A3B8, rotates 180deg when active
 * - NO numbered indicators
 */

'use client'

import React from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { WorksheetTabProps } from './types'

// SVG Icons matching design exactly
const TAB_ICONS: Record<string, React.ReactNode> = {
  '🏠': (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
    </svg>
  ),
  '🏛': (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/>
    </svg>
  ),
  '🔧': (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
    </svg>
  ),
  '💰': (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  '📊': (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
}

export function WorksheetTab({
  config,
  isExpanded,
  onToggle,
  onContinue,
  children,
  derivedOutput,
  isLastTab = false,
}: WorksheetTabProps) {
  const { title, icon } = config
  const lineIcon = TAB_ICONS[icon]

  return (
    <div 
      className="bg-white rounded-xl mx-4 mb-[10px] overflow-hidden"
      style={{
        boxShadow: isExpanded 
          ? '0 0 0 2px rgba(8, 145, 178, 0.2)' 
          : '0 1px 3px rgba(0, 0, 0, 0.05)',
        border: isExpanded ? 'none' : '1px solid #F1F5F9',
      }}
    >
      {/* Accordion Header - just icon, title, chevron (NO numbers) */}
      <button
        className="w-full flex items-center"
        style={{ padding: '14px 16px', gap: '12px' }}
        onClick={onToggle}
      >
        {/* Step Icon */}
        <span style={{ color: '#0EA5E9', width: 24, height: 24, flexShrink: 0 }}>
          {lineIcon}
        </span>
        
        {/* Step Title */}
        <span 
          className="flex-1 text-left"
          style={{ fontSize: '15px', fontWeight: 600, color: '#0A1628' }}
        >
          {title}
        </span>
        
        {/* Chevron */}
        <ChevronDown 
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          style={{ width: 20, height: 20, color: '#94A3B8', flexShrink: 0 }}
        />
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div 
          style={{ 
            padding: '0 16px 16px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          {/* Slider inputs */}
          {children}

          {/* Summary Box */}
          {derivedOutput && (
            <div 
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginTop: '16px',
                textAlign: 'right',
              }}
            >
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 600, 
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}>
                {derivedOutput.label}
              </div>
              <div 
                className="tabular-nums"
                style={{ fontSize: '24px', fontWeight: 700, color: '#0A1628' }}
              >
                {derivedOutput.value}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button
            className="w-full flex items-center justify-center text-white"
            style={{
              background: '#0EA5E9',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 600,
              gap: '8px',
              marginTop: '16px',
            }}
            onClick={onContinue}
          >
            {isLastTab ? 'Finish & Save Deal' : 'Continue to Next'}
            {!isLastTab && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
  )
}

export default WorksheetTab
