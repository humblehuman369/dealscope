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
import { ProfitFinder } from './charts/ProfitFinder'
import { LtrCashBreakdown } from './charts/LtrCashBreakdown'
import { LtrCashFlowBreakdown } from './charts/LtrCashFlowBreakdown'
import { ReturnsTargetsBars } from './charts/ReturnsTargetsBars'
import { EquityPositionBar } from './charts/EquityPositionBar'
import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'

interface WorksheetLayoutProps {
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
  const { activeSection, assumptions, worksheetMetrics, propertyData } = useWorksheetStore()
  const derived = useWorksheetDerived()
  const currentHelp = helpTips[activeSection] || helpTips.analysis

  const listPrice =
    propertyData?.property_data_snapshot?.listPrice ??
    property.property_data_snapshot?.listPrice ??
    assumptions.purchasePrice
  const breakevenPrice = worksheetMetrics?.mao ?? assumptions.purchasePrice

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

      {activeSection === 'analysis' ? (
        <div className="worksheet-layout-2col">
          <div className="worksheet-main-content">
            <div className="worksheet-sections">
              {renderActiveSection()}
            </div>
          </div>
          <aside className="worksheet-charts-sidebar">
            <div className="chart-card">
              <div className="chart-card-title">Profit Finder</div>
              <ProfitFinder
                purchasePrice={assumptions.purchasePrice}
                listPrice={listPrice}
                breakevenPrice={breakevenPrice}
                monthlyCashFlow={derived.monthlyCashFlow}
                buyLabel="Buy"
                listLabel="List"
                evenLabel="Even"
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Cash Breakdown</div>
              <LtrCashBreakdown
                downPayment={derived.downPayment}
                closingCosts={assumptions.closingCosts}
                rehabCosts={assumptions.rehabCosts}
                ltvPercent={derived.ltv}
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Cash Flow Breakdown</div>
              <LtrCashFlowBreakdown
                annualDebtService={derived.annualDebtService}
                annualExpenses={derived.totalOperatingExpenses}
                annualCashFlow={derived.annualCashFlow}
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Returns vs Targets</div>
              <ReturnsTargetsBars
                capRate={derived.capRate}
                cashOnCash={derived.cashOnCash}
                dscr={derived.dscr}
                onePercentRule={derived.rentToValue}
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Equity Position</div>
              <EquityPositionBar
                equity={assumptions.purchasePrice - derived.loanAmount}
                loan={derived.loanAmount}
              />
            </div>
          </aside>
        </div>
      ) : (
        <div className="worksheet-sections">
          {renderActiveSection()}
        </div>
      )}
    </WorksheetShell>
  )
}
