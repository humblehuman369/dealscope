'use client'

import { useWorksheetStore } from '@/stores/worksheetStore'
import { StrategyDropdown } from './StrategyDropdown'
import { WorksheetStrategyId } from '@/constants/worksheetStrategies'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Building2,
  FileSearch,
  Calculator,
  Share2,
  HelpCircle,
} from 'lucide-react'

interface TabItem {
  id: string
  label: string
  shortLabel: string
  icon: React.ElementType
  section?: string
  disabled?: boolean
}

const tabs: TabItem[] = [
  { id: 'analysis', label: 'Property Analysis', shortLabel: 'Analysis', icon: BarChart3, section: 'analysis' },
  { id: 'projections', label: 'Buy & Hold Projections', shortLabel: 'Projections', icon: TrendingUp, section: 'projections' },
  { id: 'sales-comps', label: 'Sales Comps & ARV', shortLabel: 'Comps', icon: Building2, disabled: true },
  { id: 'rental-comps', label: 'Rental Comps', shortLabel: 'Rentals', icon: DollarSign, disabled: true },
  { id: 'records', label: 'Records & Listings', shortLabel: 'Records', icon: FileSearch, disabled: true },
  { id: 'offer', label: 'Offer Calculator', shortLabel: 'Offer', icon: Calculator, disabled: true },
  { id: 'reports', label: 'Reports & Sharing', shortLabel: 'Reports', icon: Share2, disabled: true },
]

interface WorksheetTabNavProps {
  propertyId: string
  strategy: WorksheetStrategyId
}

export function WorksheetTabNav({ propertyId, strategy }: WorksheetTabNavProps) {
  const { activeSection, setActiveSection } = useWorksheetStore()
  const isTabsEnabled = strategy === 'ltr'

  const handleTabClick = (tab: TabItem) => {
    if (!isTabsEnabled || tab.disabled) return
    if (tab.section) {
      setActiveSection(tab.section)
    }
  }

  return (
    <div className="worksheet-tab-nav">
      <StrategyDropdown propertyId={propertyId} activeStrategy={strategy} />

      <div className="worksheet-tabs-scroll">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.section === activeSection
          
          const isDisabled = tab.disabled || !isTabsEnabled

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              disabled={isDisabled}
              className={`worksheet-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            >
              <Icon className="worksheet-tab-icon" />
              <span className="worksheet-tab-label">{tab.shortLabel}</span>
              {isDisabled && <span className="worksheet-tab-badge">Soon</span>}
            </button>
          )
        })}
      </div>
      
      {/* Help button */}
      <button className="worksheet-help-btn" aria-label="Worksheet help" type="button">
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
  )
}

