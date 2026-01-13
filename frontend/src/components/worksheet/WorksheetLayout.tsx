'use client'

import { useState } from 'react'
import { WorksheetSidebar } from './WorksheetSidebar'
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
import { Menu } from 'lucide-react'

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

export function WorksheetLayout({ property, propertyId }: WorksheetLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeSection, setActiveSection } = useWorksheetStore()
  
  const propertyData = property.property_data_snapshot || {}

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
    <>
      {/* Mobile menu button - visible below 900px */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="ws-hidden-desktop fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-[var(--ws-border)]"
      >
        <Menu className="w-5 h-5 text-[var(--ws-text-primary)]" />
      </button>
      
      {/* Sidebar */}
      <WorksheetSidebar 
        property={property}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main content */}
      <main className="worksheet-main">
        <WorksheetHeader 
          property={property}
          propertyId={propertyId}
        />
        
        <div className="worksheet-content">
          {renderActiveSection()}
        </div>
      </main>
      
      {/* Mobile overlay - visible below 900px */}
      {sidebarOpen && (
        <div 
          className="ws-hidden-desktop fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}

