'use client'

/**
 * WORKSHEET LAYOUT STRUCTURE FIX
 * 
 * The issue: Header is `fixed top-0` with `h-12` (48px)
 * The worksheets need to:
 * 1. Add `pt-12` to offset for the fixed header
 * 2. WorksheetTabNav should be `sticky top-12` (sticks below header)
 * 3. All content containers use: `max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8`
 * 
 * CORRECT STRUCTURE:
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ <div className="min-h-screen bg-slate-50 pt-12">  ← OFFSET HEADER   │
 * │                                                                      │
 * │   ┌─────────────────────────────────────────────────────────────┐   │
 * │   │ WorksheetTabNav (sticky top-12)                              │   │
 * │   │   └─ max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8            │   │
 * │   └─────────────────────────────────────────────────────────────┘   │
 * │                                                                      │
 * │   ┌─────────────────────────────────────────────────────────────┐   │
 * │   │ Page Header (property info)                                  │   │
 * │   │   └─ max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8            │   │
 * │   └─────────────────────────────────────────────────────────────┘   │
 * │                                                                      │
 * │   ┌─────────────────────────────────────────────────────────────┐   │
 * │   │ <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8│   │
 * │   │       py-6">                                                 │   │
 * │   │   ├─ Summary Cards (grid)                                   │   │
 * │   │   └─ Two Column Layout                                       │   │
 * │   │       ├─ Left: Worksheet Sections                           │   │
 * │   │       └─ Right: Insight Panel (380px)                       │   │
 * │   └─────────────────────────────────────────────────────────────┘   │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// Example corrected worksheet structure:

import React from 'react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { Home } from 'lucide-react'

interface ExampleWorksheetProps {
  property: SavedProperty
  onExportPDF?: () => void
}

export function ExampleWorksheetLayout({ property, onExportPDF }: ExampleWorksheetProps) {
  return (
    // ✅ CRITICAL: pt-12 offsets the fixed header (h-12 = 48px)
    <div className="min-h-screen bg-slate-50 pt-12">
      
      {/* ✅ WorksheetTabNav - sticky below header (top-12 = 48px) */}
      {/* Full-width background, but content constrained to 1600px */}
      <div className="sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav
            propertyId={property.id}
            strategy="ltr"
          />
        </div>
      </div>

      {/* ✅ Page Header - Full-width background, content constrained */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Home className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {getDisplayAddress(property) || 'Property Analysis'}
              </h1>
              <p className="text-sm text-slate-500">Strategy Worksheet</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Main Content - Constrained to 1600px */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {/* ... summary cards ... */}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
          
          {/* Left Column - Worksheet Sections */}
          <div className="space-y-4">
            {/* ... sections ... */}
          </div>

          {/* Right Column - Insight Panel (fixed 380px width on desktop) */}
          <div className="space-y-4">
            {/* ... insight cards ... */}
          </div>
          
        </div>
      </main>
    </div>
  )
}
