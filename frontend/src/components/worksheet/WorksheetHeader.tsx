'use client'

import { useWorksheetStore } from '@/stores/worksheetStore'
import { WorksheetExport } from './WorksheetExport'
import {
  Edit3,
  Share2,
  Loader2,
  Check,
  BarChart3,
  TrendingUp,
} from 'lucide-react'

interface WorksheetHeaderProps {
  property: {
    id: string
    address: string
    city: string
    state: string
    zip_code: string
    property_data_snapshot: any
  }
  propertyId: string
}

export function WorksheetHeader({ property, propertyId }: WorksheetHeaderProps) {
  const { isDirty, isSaving, lastSaved, activeSection, setActiveSection } = useWorksheetStore()
  const propertyData = property.property_data_snapshot || {}

  const formatLastSaved = () => {
    if (!lastSaved) return null
    const diff = Date.now() - lastSaved.getTime()
    if (diff < 60000) return 'Saved just now'
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`
    return `Saved ${lastSaved.toLocaleTimeString()}`
  }

  const tabs = [
    { id: 'analysis', label: 'Property Analysis', icon: BarChart3 },
    { id: 'projections', label: 'Buy & Hold Projections', icon: TrendingUp },
  ]

  return (
    <header className="worksheet-header">
      <div className="flex items-center justify-between">
        {/* Property Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--ws-text-primary)]">
              {property.address}
            </h1>
            <p className="text-sm text-[var(--ws-text-secondary)]">
              {property.city}, {property.state} {property.zip_code} • 
              {propertyData.bedrooms} BR • {propertyData.bathrooms} BA • 
              {(propertyData.sqft || 0).toLocaleString()} Sq.Ft.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Save indicator */}
          <div className="flex items-center gap-2 text-sm text-[var(--ws-text-secondary)]">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--ws-warning)]" />
                <span>Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-4 h-4 text-[var(--ws-positive)]" />
                <span>{formatLastSaved()}</span>
              </>
            ) : null}
          </div>
          
          {/* Edit Property */}
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--ws-text-secondary)] bg-[var(--ws-bg-alt)] hover:bg-[var(--ws-border)] rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Property</span>
          </button>
          
          {/* Export */}
          <WorksheetExport 
            propertyId={propertyId}
            propertyAddress={`${property.address}, ${property.city}, ${property.state}`}
          />
          
          {/* Share */}
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--ws-accent)] hover:bg-[var(--ws-accent-hover)] rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 mt-4 border-b border-[var(--ws-border)] -mx-6 px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeSection === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive 
                  ? 'text-[var(--ws-accent)] border-[var(--ws-accent)]' 
                  : 'text-[var(--ws-text-secondary)] border-transparent hover:text-[var(--ws-text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </header>
  )
}

