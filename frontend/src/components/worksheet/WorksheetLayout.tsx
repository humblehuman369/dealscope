'use client'

import { WorksheetShell } from './WorksheetShell'
import { WorksheetStrategyId } from '@/constants/worksheetStrategies'
import { WorksheetHeader } from './WorksheetHeader'
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
import { SavedProperty } from '@/types/savedProperty'

interface WorksheetLayoutProps {
  property: SavedProperty
  propertyId: string
  strategy: WorksheetStrategyId
}

export function WorksheetLayout({ property, propertyId, strategy }: WorksheetLayoutProps) {
  const { activeSection, assumptions, worksheetMetrics, propertyData } = useWorksheetStore()
  const derived = useWorksheetDerived()

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
