'use client'

import { WorksheetShell } from './WorksheetShell'
import { WorksheetStrategyId } from '@/constants/worksheetStrategies'
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
  strategy: WorksheetStrategyId
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

export function WorksheetLayout({ property, propertyId, strategy }: WorksheetLayoutProps) {
  const { activeSection } = useWorksheetStore()
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
    <WorksheetShell
      property={property}
      propertyId={propertyId}
      strategy={strategy}
      helpTitle={currentHelp.title}
      helpTips={currentHelp.tips}
    >
      <WorksheetHeader 
        property={property}
        propertyId={propertyId}
      />
      
      <div className="worksheet-sections">
        {renderActiveSection()}
      </div>
    </WorksheetShell>
  )
}
