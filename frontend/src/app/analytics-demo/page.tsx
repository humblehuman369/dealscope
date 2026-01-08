'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { 
  StrategyAnalyticsContainer, 
  AnalyticsBottomBar,
  BottomNavSpacer,
  AnalyticsPageSkeleton,
  LoadingOverlay
} from '@/components/analytics'

/**
 * Analytics Demo Page
 * 
 * A standalone page to test and demonstrate the new analytics components.
 * Uses sample property data to showcase all 6 investment strategies.
 */

// Sample property photos for carousel testing
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=400&fit=crop'
]

// Sample property data for testing
const SAMPLE_PROPERTY = {
  address: '953 Banyan Dr',
  city: 'Delray Beach',
  state: 'FL',
  zipCode: '33483',
  listPrice: 350000,
  monthlyRent: 2800,
  averageDailyRate: 195,
  occupancyRate: 0.72,
  propertyTaxes: 4200,
  insurance: 2100,
  bedrooms: 4,
  bathrooms: 2,
  sqft: 1850,
  arv: 425000,
  thumbnailUrl: SAMPLE_PHOTOS[0],
  photos: SAMPLE_PHOTOS,
  photoCount: 24
}

function DemoContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [showLOI, setShowLOI] = useState(false)

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const handleGenerateLOI = () => {
    setShowLOI(true)
    // In real app, this would open a modal
    setTimeout(() => setShowLOI(false), 2000)
  }

  const handleShare = () => {
    // In real app, this would trigger share functionality
    if (navigator.share) {
      navigator.share({
        title: 'InvestIQ Analysis',
        text: `Check out this property analysis for ${SAMPLE_PROPERTY.address}`,
        url: window.location.href
      })
    }
  }

  if (isLoading) {
    return <AnalyticsPageSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#0b1426] overflow-safe">
      {/* Demo Header */}
      <div className="header-blur sticky top-0 z-50">
        <div className="bg-gradient-to-r from-teal to-blue-500 text-white px-4 py-3 safe-area-pt">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">InvestIQ Analytics</h1>
              <p className="text-xs text-white/80">Component Demo</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors touch-active"
            >
              Exit Demo
            </button>
          </div>
        </div>
      </div>

      {/* Main Analytics Container */}
      <div className="max-w-lg mx-auto safe-area-px">
        <StrategyAnalyticsContainer
          property={SAMPLE_PROPERTY}
          onBack={() => router.push('/')}
        />
      </div>

      {/* Bottom Navigation Spacer */}
      <BottomNavSpacer />

      {/* Bottom Action Bar */}
      <AnalyticsBottomBar 
        onSave={handleSave}
        onShare={handleShare}
        onGenerateLOI={handleGenerateLOI}
        isSaved={isSaved}
      />

      {/* LOI Loading Overlay */}
      {showLOI && <LoadingOverlay message="Generating LOI..." />}
    </div>
  )
}

export default function AnalyticsDemoPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <DemoContent />
    </Suspense>
  )
}
