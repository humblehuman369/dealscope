'use client'

/**
 * LayoutWrapper Component
 * 
 * Client-side wrapper for the root layout that includes the AppHeader.
 * This is needed because AppHeader uses client-side hooks (usePathname, useSearchParams, etc.)
 * and the root layout is a server component.
 * 
 * Suspense boundary is required because useSearchParams() causes hydration issues
 * during static generation of pages.
 */

import React, { Suspense } from 'react'
import { AppHeader } from './AppHeader'

interface LayoutWrapperProps {
  children: React.ReactNode
}

// Fallback component shown while AppHeader loads
function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50">
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#0f1031' }}
      >
        <div className="flex flex-col">
          <div className="flex items-baseline">
            <span className="text-lg font-bold tracking-tight text-white">DealMaker</span>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#0891B2' }}>IQ</span>
          </div>
          <span className="text-[12px] font-medium -mt-0.5 text-white">by InvestIQ</span>
        </div>
      </div>
    </header>
  )
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <>
      {/* Universal AppHeader - wrapped in Suspense for useSearchParams compatibility */}
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader />
      </Suspense>
      
      {/* Main content */}
      {children}
    </>
  )
}

export default LayoutWrapper
