'use client'

/**
 * LayoutWrapper Component
 * 
 * Client-side wrapper for the root layout that includes the AppHeader.
 * This is needed because AppHeader uses client-side hooks (usePathname, useSearchParams, etc.)
 * and the root layout is a server component.
 */

import React from 'react'
import { AppHeader } from './AppHeader'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <>
      {/* Universal AppHeader - handles its own visibility based on route */}
      <AppHeader />
      
      {/* Main content */}
      {children}
    </>
  )
}

export default LayoutWrapper
