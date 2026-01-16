import { ReactNode, useState } from 'react'
import { HelpCircle, Lightbulb, Info, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { WorksheetTabNav } from './WorksheetTabNav'
import { WorksheetStrategyId } from '@/constants/worksheetStrategies'

interface WorksheetShellProps {
  property: {
    id: string
    address_street: string
    address_city?: string
    address_state?: string
    address_zip?: string
    full_address?: string
    property_data_snapshot: any
  }
  propertyId: string
  strategy: WorksheetStrategyId
  helpTitle?: string
  helpTips?: string[]
  children: ReactNode
}

export function WorksheetShell({
  property,
  propertyId,
  strategy,
  helpTitle,
  helpTips,
  children,
}: WorksheetShellProps) {
  const hasHelp = Boolean(helpTitle && helpTips?.length)
  const [showHelp, setShowHelp] = useState(hasHelp)
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
            <h1 className="worksheet-property-title">{property.address_street}</h1>
            <p className="worksheet-property-subtitle">
              {property.address_city}, {property.address_state} {property.address_zip} •
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

      {/* Main Content Area with Help Panel */}
      <div className="worksheet-main-area">
        {/* Help Tips Panel (Left) */}
        {hasHelp && showHelp && (
          <aside className="worksheet-help-panel">
            <div className="worksheet-help-header">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>{helpTitle}</span>
              <button
                onClick={() => setShowHelp(false)}
                className="worksheet-help-close"
                aria-label="Hide worksheet tips"
                type="button"
              >
                ×
              </button>
            </div>
            <ul className="worksheet-help-list">
              {(helpTips ?? []).map((tip, index) => (
                <li key={index} className="worksheet-help-item">
                  <Info className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Toggle help button when hidden */}
        {hasHelp && !showHelp && (
          <button
            onClick={() => setShowHelp(true)}
            className="worksheet-help-toggle"
            aria-label="Show worksheet tips"
            type="button"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}

        {/* Main Content */}
        <main className={`worksheet-content-area ${!hasHelp || !showHelp ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
