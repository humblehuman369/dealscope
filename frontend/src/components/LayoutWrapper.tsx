'use client'

/**
 * LayoutWrapper Component
 * 
 * Client-side wrapper for the root layout that includes the AppHeader
 * and the UsageBar (for Starter users).
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
import { UsageBar } from './UsageBar'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <>
      {/* Skip to main content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-teal-500 focus:text-white focus:rounded-lg focus:font-medium focus:w-auto focus:h-auto focus:m-0 focus:overflow-visible focus:[clip:auto]"
      >
        Skip to main content
      </a>

      {/* 
        Universal AppHeader - wrapped in Suspense for useSearchParams compatibility.
        Fallback is null to avoid hydration mismatch on routes where AppHeader returns null.
      */}
      <Suspense fallback={null}>
        <AppHeader />
      </Suspense>

      {/* 
        Usage bar — Starter-only, hidden on /billing and non-dashboard routes.
        Renders between the nav and page content.
      */}
      <Suspense fallback={null}>
        <UsageBar />
      </Suspense>

      {/* Main content — skip link target */}
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </>
  )
}

export default LayoutWrapper
