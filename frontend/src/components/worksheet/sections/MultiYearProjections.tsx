'use client'

import { useState } from 'react'
import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard } from '../SectionCard'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ProjectionSection {
  id: string
  title: string
  rows: {
    label: string
    getValue: (year: number, projections: any[], derived: any) => number
    isTotal?: boolean
    isNegative?: boolean
  }[]
}

export function MultiYearProjections() {
  const { projections, assumptions } = useWorksheetStore()
  const derived = useWorksheetDerived()
  
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'rental_income',
    'cash_flow',
    'investment_returns',
  ])
  
  const [yearsToShow, setYearsToShow] = useState(10)

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const sections: ProjectionSection[] = [
    {
      id: 'rental_income',
      title: 'RENTAL INCOME',
      rows: [
        {
          label: 'Gross Rent',
          getValue: (year, proj) => proj[year - 1]?.grossRent || 0,
        },
        {
          label: 'Vacancy',
          getValue: (year, proj) => -(proj[year - 1]?.grossRent || 0) * assumptions.vacancyRate,
          isNegative: true,
        },
        {
          label: 'Operating Income',
          getValue: (year, proj) => proj[year - 1]?.effectiveRent || 0,
          isTotal: true,
        },
      ],
    },
    {
      id: 'operating_expenses',
      title: 'OPERATING EXPENSES',
      rows: [
        {
          label: 'Property Taxes',
          getValue: (year) => assumptions.propertyTaxes * Math.pow(1 + assumptions.propertyTaxGrowth, year - 1),
        },
        {
          label: 'Insurance',
          getValue: (year) => assumptions.insurance * Math.pow(1 + assumptions.insuranceGrowth, year - 1),
        },
        {
          label: 'Property Management',
          getValue: (year, proj) => (proj[year - 1]?.effectiveRent || 0) * assumptions.managementPct,
        },
        {
          label: 'Maintenance',
          getValue: (year, proj) => (proj[year - 1]?.effectiveRent || 0) * assumptions.maintenancePct,
        },
        {
          label: 'Capital Expenditures',
          getValue: (year, proj) => (proj[year - 1]?.effectiveRent || 0) * assumptions.capexReservePct,
        },
        {
          label: 'Total Operating Expenses',
          getValue: (year, proj) => proj[year - 1]?.operatingExpenses || 0,
          isTotal: true,
        },
      ],
    },
    {
      id: 'cash_flow',
      title: 'CASH FLOW',
      rows: [
        {
          label: 'Operating Income',
          getValue: (year, proj) => proj[year - 1]?.effectiveRent || 0,
        },
        {
          label: 'Operating Expenses',
          getValue: (year, proj) => -(proj[year - 1]?.operatingExpenses || 0),
          isNegative: true,
        },
        {
          label: 'Net Operating Income',
          getValue: (year, proj) => proj[year - 1]?.noi || 0,
        },
        {
          label: 'Loan Payments',
          getValue: (year, proj) => -(proj[year - 1]?.debtService || 0),
          isNegative: true,
        },
        {
          label: 'Cash Flow',
          getValue: (year, proj) => proj[year - 1]?.cashFlow || 0,
          isTotal: true,
        },
      ],
    },
    {
      id: 'equity_accumulation',
      title: 'EQUITY ACCUMULATION',
      rows: [
        {
          label: 'Property Value',
          getValue: (year, proj) => proj[year - 1]?.propertyValue || 0,
        },
        {
          label: 'Loan Balance',
          getValue: (year, proj) => proj[year - 1]?.loanBalance || 0,
        },
        {
          label: 'Total Equity',
          getValue: (year, proj) => proj[year - 1]?.totalEquity || 0,
          isTotal: true,
        },
      ],
    },
    {
      id: 'investment_returns',
      title: 'INVESTMENT RETURNS',
      rows: [
        {
          label: 'Cash on Cash',
          getValue: (year, proj) => proj[year - 1]?.cashOnCash || 0,
        },
        {
          label: 'Cumulative Cash Flow',
          getValue: (year, proj) => proj[year - 1]?.cumulativeCashFlow || 0,
        },
        {
          label: 'Total Wealth',
          getValue: (year, proj) => proj[year - 1]?.totalWealth || 0,
          isTotal: true,
        },
      ],
    },
  ]

  const years = Array.from({ length: Math.min(yearsToShow, projections.length || 10) }, (_, i) => i + 1)

  return (
    <div className="section-card overflow-hidden">
      <div className="section-header flex items-center justify-between">
        <span className="section-title">Buy & Hold Projections</span>
        <div className="flex items-center gap-2">
          <select
            value={yearsToShow}
            onChange={(e) => setYearsToShow(Number(e.target.value))}
            className="text-sm border border-[var(--ws-border)] rounded px-2 py-1 bg-white"
          >
            <option value={5}>5 Years</option>
            <option value={10}>10 Years</option>
            <option value={15}>15 Years</option>
            <option value={20}>20 Years</option>
            <option value={30}>30 Years</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="projections-table">
          <thead>
            <tr>
              <th className="min-w-[200px]"></th>
              {years.map((year) => (
                <th key={year} className="min-w-[100px]">Year {year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const isExpanded = expandedSections.includes(section.id)
              
              return (
                <>
                  {/* Section Header Row */}
                  <tr 
                    key={section.id}
                    className="section-row cursor-pointer"
                    onClick={() => toggleSection(section.id)}
                  >
                    <td className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {section.title}
                    </td>
                    {years.map((year) => (
                      <td key={year}></td>
                    ))}
                  </tr>
                  
                  {/* Section Data Rows */}
                  {isExpanded && section.rows.map((row, rowIndex) => (
                    <tr 
                      key={`${section.id}-${rowIndex}`}
                      className={row.isTotal ? 'total-row' : ''}
                    >
                      <td className="pl-8">{row.label}</td>
                      {years.map((year) => {
                        const value = row.getValue(year, projections, derived)
                        const isReturnsSection = section.id === 'investment_returns'
                        const isCoCRow = row.label === 'Cash on Cash'
                        
                        return (
                          <td 
                            key={year}
                            className={`${
                              row.isNegative || value < 0 
                                ? 'text-[var(--ws-negative)]' 
                                : row.isTotal && value > 0 
                                  ? 'text-[var(--ws-positive)]' 
                                  : ''
                            }`}
                          >
                            {isCoCRow ? formatPercent(value) : formatCurrency(value)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

