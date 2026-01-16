import { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { WorksheetTabNav } from './WorksheetTabNav'
import { WorksheetStrategyId } from '@/constants/worksheetStrategies'
import { SavedProperty, getShortAddress, getCityStateZip } from '@/types/savedProperty'

interface WorksheetShellProps {
  property: SavedProperty
  propertyId: string
  strategy: WorksheetStrategyId
  children: ReactNode
}

export function WorksheetShell({
  property,
  propertyId,
  strategy,
  children,
}: WorksheetShellProps) {
  const propertyData = property.property_data_snapshot || {}

  return (
    <div className={`worksheet-container-v2 ${strategy}-strategy`}>
      {/* Top Navigation Bar */}
      <header className="worksheet-topbar">
        <div className="worksheet-topbar-left">
          <Link href="/dashboard" className="worksheet-back-link">
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <div className="worksheet-property-info">
            <h1 className="worksheet-property-title">{getShortAddress(property)}</h1>
            <p className="worksheet-property-subtitle">
              {getCityStateZip(property)} •
              {propertyData.bedrooms || 0} BR • {propertyData.bathrooms || 0} BA •
              {(propertyData.sqft || 0).toLocaleString()} Sq.Ft.
            </p>
          </div>
        </div>
        <div className="worksheet-topbar-right">
          <div className="worksheet-price-badge">
            ${(propertyData.listPrice || 0).toLocaleString()}
          </div>
        </div>
      </header>

      {/* Horizontal Tab Navigation */}
      <WorksheetTabNav propertyId={propertyId} strategy={strategy} />

      {/* Main Content Area - Full Width */}
      <div className="worksheet-main-area full-width">
        <main className="worksheet-content-area full-width">
          {children}
        </main>
      </div>
    </div>
  )
}
