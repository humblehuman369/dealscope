'use client'

import { useState } from 'react'
import { WorksheetTabNav } from './WorksheetTabNav'
import { WorksheetHeader } from './WorksheetHeader'
import { PropertyOverview } from './sections/PropertyOverview'
import { PurchaseRehabSection } from './sections/PurchaseRehabSection'
import { FinancingSection } from './sections/FinancingSection'
import { ValuationSection } from './sections/ValuationSection'
import { CashFlowSection } from './sections/CashFlowSection'
import { InvestmentReturns } from './sections/InvestmentReturns'
import { FinancialRatios } from './sections/FinancialRatios'
import { MultiYearProjections } from './sections/MultiYearProjections'
import { CashFlowChart } from './charts/CashFlowChart'
import { EquityChart } from './charts/EquityChart'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { HelpCircle, Lightbulb, Info, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface WorksheetLayoutProps {
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

// Help tips for different sections
const helpTips: Record<string, { title: string; tips: string[] }> = {
  analysis: {
    title: 'Property Analysis Tips',
    tips: [
      'Adjust the purchase price to see how it affects your returns',
      'A 20-25% down payment is typical for investment properties',
      'Cap rates above 8% are generally considered good investments',
      'Cash-on-cash return of 10%+ is a strong target for rental properties',
    ],
  },
  projections: {
    title: 'Projection Tips',
    tips: [
      'Conservative appreciation estimates use 2-3% annual growth',
      'Rent growth typically tracks slightly above inflation at 3-4%',
      'Factor in major repairs every 15-20 years (roof, HVAC, etc.)',
      'Consider refinancing opportunities when equity builds',
    ],
  },
}

export function WorksheetLayout({ property, propertyId }: WorksheetLayoutProps) {
  const [showHelp, setShowHelp] = useState(true)
  const { activeSection } = useWorksheetStore()
  
  const propertyData = property.property_data_snapshot || {}
  const currentHelp = helpTips[activeSection] || helpTips.analysis

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'analysis':
        return (
          <>
            <PropertyOverview />
            <PurchaseRehabSection />
            <FinancingSection />
            <ValuationSection />
            <CashFlowSection />
            <InvestmentReturns />
            <FinancialRatios />
          </>
        )
      case 'projections':
        return (
          <>
            <MultiYearProjections />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <CashFlowChart />
              <EquityChart />
            </div>
          </>
        )
      default:
        return (
          <>
            <PropertyOverview />
            <PurchaseRehabSection />
            <FinancingSection />
            <ValuationSection />
            <CashFlowSection />
            <InvestmentReturns />
            <FinancialRatios />
          </>
        )
    }
  }

  return (
    <div className="worksheet-container-v2">
      {/* Top Navigation Bar */}
      <header className="worksheet-topbar">
        <div className="worksheet-topbar-left">
          <Link href="/dashboard" className="worksheet-back-link">
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <div className="worksheet-property-info">
            <h1 className="worksheet-property-title">{property.address}</h1>
            <p className="worksheet-property-subtitle">
              {property.city}, {property.state} {property.zip_code} • 
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
      <WorksheetTabNav />
      
      {/* Main Content Area with Help Panel */}
      <div className="worksheet-main-area">
        {/* Help Tips Panel (Left) */}
        {showHelp && (
          <aside className="worksheet-help-panel">
            <div className="worksheet-help-header">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>{currentHelp.title}</span>
              <button 
                onClick={() => setShowHelp(false)}
                className="worksheet-help-close"
              >
                ×
              </button>
            </div>
            <ul className="worksheet-help-list">
              {currentHelp.tips.map((tip, index) => (
                <li key={index} className="worksheet-help-item">
                  <Info className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
        
        {/* Toggle help button when hidden */}
        {!showHelp && (
          <button 
            onClick={() => setShowHelp(true)}
            className="worksheet-help-toggle"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
        
        {/* Main Content */}
        <main className={`worksheet-content-area ${!showHelp ? 'full-width' : ''}`}>
          <WorksheetHeader 
            property={property}
            propertyId={propertyId}
          />
          
          <div className="worksheet-sections">
            {renderActiveSection()}
          </div>
        </main>
      </div>
    </div>
  )
}
