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
 * 
 * IMPORTANT: The fallback must be null to avoid hydration mismatches on routes
 * where AppHeader returns null (like the homepage).
 */

import React, { Suspense } from 'react'
import { AppHeader } from './AppHeader'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <>
      {/* 
        Universal AppHeader - wrapped in Suspense for useSearchParams compatibility.
        Fallback is null to avoid hydration mismatch on routes where AppHeader returns null.
      */}
      <Suspense fallback={null}>
        <AppHeader />
      </Suspense>
      
      {/* Main content */}
      {children}
    </>
  )
}

export default LayoutWrapper
