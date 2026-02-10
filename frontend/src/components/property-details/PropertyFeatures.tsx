'use client'

import { useState } from 'react'
import { Check, Waves } from 'lucide-react'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

interface PropertyFeaturesProps {
  interiorFeatures: string[]
  exteriorFeatures: string[]
  appliances: string[]
  construction: string[]
  roof?: string
  foundation?: string
  isWaterfront?: boolean
  waterfrontFeatures?: string[]
}

type TabId = 'interior' | 'exterior' | 'appliances'

/**
 * PropertyFeatures Component
 * 
 * Tabbed display of interior/exterior features, appliances,
 * construction details, and waterfront information.
 * Active tab uses deep sky CTA color; checkmarks use teal (positive/success).
 */
export function PropertyFeatures({
  interiorFeatures,
  exteriorFeatures,
  appliances,
  construction,
  roof,
  foundation,
  isWaterfront,
  waterfrontFeatures,
}: PropertyFeaturesProps) {
  const [activeTab, setActiveTab] = useState<TabId>('interior')

  const tabs: { id: TabId; label: string; features: string[] }[] = [
    { id: 'interior', label: 'Interior', features: interiorFeatures },
    { id: 'exterior', label: 'Exterior', features: exteriorFeatures },
    { id: 'appliances', label: 'Appliances', features: appliances },
  ]

  const currentFeatures = tabs.find(t => t.id === activeTab)?.features || []

  return (
    <div
      className="rounded-[14px] p-6"
      style={{
        backgroundColor: colors.background.card,
        border: `1px solid ${colors.ui.border}`,
        boxShadow: colors.shadow.card,
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-[0.12em] mb-5"
        style={{ color: colors.brand.blue }}
      >
        Features & Amenities
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? colors.brand.blueDeep : colors.background.cardUp,
              color: activeTab === tab.id ? '#FFFFFF' : colors.text.secondary,
              border: activeTab === tab.id ? 'none' : `1px solid ${colors.ui.border}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {currentFeatures.map((feature, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2.5">
            <Check size={16} className="flex-shrink-0" style={{ color: colors.status.positive }} />
            <span className="text-[15px]" style={{ color: colors.text.body, fontWeight: 400 }}>{feature}</span>
          </div>
        ))}
      </div>

      {currentFeatures.length === 0 && (
        <p className="text-base text-center py-6" style={{ color: colors.text.tertiary }}>
          No {activeTab} features listed
        </p>
      )}

      {/* Waterfront Badge */}
      {isWaterfront && waterfrontFeatures && waterfrontFeatures.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.ui.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Waves size={16} style={{ color: colors.brand.teal }} />
            <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>
              Waterfront Property
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {waterfrontFeatures.map((feature, i) => (
              <span 
                key={i} 
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: colors.accentBg.teal, color: colors.brand.teal }}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Construction */}
      {(construction?.length > 0 || roof || foundation) && (
        <div
          className="mt-5 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-5"
          style={{ borderTop: `1px solid ${colors.ui.border}` }}
        >
          {construction?.length > 0 && (
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.04em] mb-2"
                style={{ color: colors.text.tertiary }}
              >
                Construction
              </div>
              <div className="text-base font-medium" style={{ color: colors.text.body }}>
                {construction.join(', ')}
              </div>
            </div>
          )}
          {roof && (
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.04em] mb-2"
                style={{ color: colors.text.tertiary }}
              >
                Roof
              </div>
              <div className="text-base font-medium" style={{ color: colors.text.body }}>
                {roof}
              </div>
            </div>
          )}
          {foundation && (
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.04em] mb-2"
                style={{ color: colors.text.tertiary }}
              >
                Foundation
              </div>
              <div className="text-base font-medium" style={{ color: colors.text.body }}>
                {foundation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * PropertyFeaturesSkeleton
 * Loading state for the property features
 */
export function PropertyFeaturesSkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="h-3 w-32 rounded animate-pulse mb-4" style={{ backgroundColor: colors.background.cardUp }} />
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-20 rounded-full animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-6 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
        ))}
      </div>
    </div>
  )
}
