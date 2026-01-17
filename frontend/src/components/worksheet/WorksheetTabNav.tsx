'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
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
  ChevronLeft,
  ChevronRight,
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
  mobileMenuOpen?: boolean
  onMobileMenuClose?: () => void
}

export function WorksheetTabNav({ 
  propertyId, 
  strategy,
  mobileMenuOpen = false,
  onMobileMenuClose,
}: WorksheetTabNavProps) {
  const { activeSection, setActiveSection } = useWorksheetStore()
  const isTabsEnabled = strategy === 'ltr'
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  // Check scroll position to show/hide fade indicators
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const scrollThreshold = 10 // pixels

    setShowLeftFade(scrollLeft > scrollThreshold)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - scrollThreshold)
  }, [])

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Initial check
    checkScrollPosition()

    // Add scroll listener
    container.addEventListener('scroll', checkScrollPosition)
    
    // Add resize observer for container width changes
    const resizeObserver = new ResizeObserver(checkScrollPosition)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', checkScrollPosition)
      resizeObserver.disconnect()
    }
  }, [checkScrollPosition])

  // Scroll functions for arrow buttons
  const scrollLeft = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  const handleTabClick = (tab: TabItem) => {
    if (!isTabsEnabled || tab.disabled) return
    if (tab.section) {
      setActiveSection(tab.section)
    }
    // Close mobile menu if open
    onMobileMenuClose?.()
  }

  return (
    <>
      {/* Desktop/Tablet Tab Navigation */}
      <div className="worksheet-tab-nav">
        <StrategyDropdown propertyId={propertyId} activeStrategy={strategy} />

        {/* Scroll Container with Fade Indicators */}
        <div className="worksheet-tabs-wrapper">
          {/* Left Fade + Scroll Arrow */}
          <div className={`worksheet-tabs-fade left ${showLeftFade ? 'visible' : ''}`}>
            <button 
              className="worksheet-tabs-scroll-btn"
              onClick={scrollLeft}
              aria-label="Scroll tabs left"
              tabIndex={showLeftFade ? 0 : -1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Tabs Container */}
          <div 
            ref={scrollContainerRef}
            className="worksheet-tabs-scroll"
          >
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

          {/* Right Fade + Scroll Arrow */}
          <div className={`worksheet-tabs-fade right ${showRightFade ? 'visible' : ''}`}>
            <button 
              className="worksheet-tabs-scroll-btn"
              onClick={scrollRight}
              aria-label="Scroll tabs right"
              tabIndex={showRightFade ? 0 : -1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Help button */}
        <button className="worksheet-help-btn" aria-label="Worksheet help" type="button">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Dropdown Menu - Shows when mobileMenuOpen is true */}
      {mobileMenuOpen && (
        <div className="worksheet-mobile-menu">
          <div className="worksheet-mobile-menu-overlay" onClick={() => onMobileMenuClose?.()} />
          <div className="worksheet-mobile-menu-content">
            <div className="worksheet-mobile-menu-header">
              <span>Navigation</span>
            </div>
            <div className="worksheet-mobile-menu-strategy">
              <StrategyDropdown propertyId={propertyId} activeStrategy={strategy} />
            </div>
            <div className="worksheet-mobile-menu-tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = tab.section === activeSection
                const isDisabled = tab.disabled || !isTabsEnabled

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    disabled={isDisabled}
                    className={`worksheet-mobile-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="worksheet-mobile-tab-label">{tab.label}</span>
                    {isDisabled && <span className="worksheet-tab-badge">Soon</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
