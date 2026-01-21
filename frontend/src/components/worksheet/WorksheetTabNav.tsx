'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Home,
  Search,
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
  { id: 'analyze', label: 'Analyze Property', shortLabel: 'Analyze', icon: Search, section: 'analyze' },
  { id: 'property-details', label: 'Property Details', shortLabel: 'Details', icon: Home, section: 'property-details' },
  { id: 'market-data', label: 'Market Data', shortLabel: 'Market Data', icon: BarChart3, section: 'market-data' },
  { id: 'projections', label: 'Buy & Hold Projections', shortLabel: 'Projections', icon: TrendingUp, section: 'projections' },
  { id: 'sales-comps', label: 'Sales Comps & ARV', shortLabel: 'Comps', icon: Building2, section: 'sales-comps' },
  { id: 'rental-comps', label: 'Rental Comps', shortLabel: 'Rentals', icon: DollarSign, section: 'rental-comps' },
  { id: 'records', label: 'Records & Listings', shortLabel: 'Records', icon: FileSearch, disabled: true },
  { id: 'offer', label: 'Offer Calculator', shortLabel: 'Offer', icon: Calculator, disabled: true },
  { id: 'reports', label: 'Reports & Sharing', shortLabel: 'Reports', icon: Share2, disabled: true },
]

interface WorksheetTabNavProps {
  propertyId: string
  strategy: WorksheetStrategyId
  zpid?: string | number
  mobileMenuOpen?: boolean
  onMobileMenuClose?: () => void
}

export function WorksheetTabNav({ 
  propertyId, 
  strategy,
  zpid,
  mobileMenuOpen = false,
  onMobileMenuClose,
}: WorksheetTabNavProps) {
  const router = useRouter()
  const { activeSection, setActiveSection, propertyData } = useWorksheetStore()
  // #region agent log
  useEffect(() => { fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorksheetTabNav.tsx:60',message:'TabNav mounted/updated',data:{zpid,zpidType:typeof zpid,propertyId,strategy,propertyDataFullAddress:propertyData?.full_address,propertyDataZpid:propertyData?.zpid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{}); }, [zpid, propertyId, propertyData]);
  // #endregion
  // Tabs are enabled for all strategies (removed ltr-only restriction)
  const isTabsEnabled = true
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const scrollThreshold = 10

    setShowLeftFade(scrollLeft > scrollThreshold)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - scrollThreshold)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    checkScrollPosition()
    container.addEventListener('scroll', checkScrollPosition)
    
    const resizeObserver = new ResizeObserver(checkScrollPosition)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', checkScrollPosition)
      resizeObserver.disconnect()
    }
  }, [checkScrollPosition])

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
    
    // Navigate to analyzing page for analyze tab - pass address so it's preserved
    if (tab.id === 'analyze') {
      const fullAddress = propertyData?.full_address || ''
      const addressParam = fullAddress ? `?address=${encodeURIComponent(fullAddress)}` : ''
      router.push(`/analyzing${addressParam}`)
      return
    }
    
    // Navigate to property details page for property-details tab
    if (tab.id === 'property-details') {
      // Use zpid for the property page route, include address as query param (required by the page)
      const fullAddress = propertyData?.full_address || ''
      const addressParam = fullAddress ? `?address=${encodeURIComponent(fullAddress)}` : ''
      const propertyRoute = zpid ? `/property/${zpid}${addressParam}` : `/worksheet/${propertyId}`
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorksheetTabNav.tsx:125',message:'Details tab clicked',data:{zpid,zpidType:typeof zpid,propertyId,fullAddress,addressParam,propertyRoute,propertyDataKeys:propertyData?Object.keys(propertyData):null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      router.push(propertyRoute)
      return
    }
    
    if (tab.section) {
      setActiveSection(tab.section)
    }
    onMobileMenuClose?.()
  }

  return (
    <>
      {/* Tab Navigation - No wrapper, parent provides container */}
      <div className="flex items-center gap-2 h-[50px]">
        <StrategyDropdown propertyId={propertyId} activeStrategy={strategy} />

        {/* Scroll Container */}
        <div className="flex-1 flex items-center relative min-w-0 overflow-hidden">
          {/* Left Fade */}
          <div className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-start z-10 pointer-events-none transition-opacity ${showLeftFade ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to right, white 60%, transparent)' }}
          >
            <button 
              className={`w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:text-teal hover:border-slate-300 transition-all ${showLeftFade ? 'pointer-events-auto' : ''}`}
              onClick={scrollLeft}
              tabIndex={showLeftFade ? 0 : -1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Tabs */}
          <div 
            ref={scrollContainerRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-teal/10 text-teal' 
                      : isDisabled 
                        ? 'text-slate-400 cursor-not-allowed opacity-50' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.shortLabel}</span>
                  {isDisabled && <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">Soon</span>}
                </button>
              )
            })}
          </div>

          {/* Right Fade */}
          <div className={`absolute right-0 top-0 bottom-0 w-12 flex items-center justify-end z-10 pointer-events-none transition-opacity ${showRightFade ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to left, white 60%, transparent)' }}
          >
            <button 
              className={`w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:text-teal hover:border-slate-300 transition-all ${showRightFade ? 'pointer-events-auto' : ''}`}
              onClick={scrollRight}
              tabIndex={showRightFade ? 0 : -1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Help button */}
        <button 
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-teal transition-all flex-shrink-0" 
          aria-label="Worksheet help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/30" onClick={() => onMobileMenuClose?.()} />
          <div className="absolute top-0 left-0 right-0 bg-white rounded-b-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
              Navigation
            </div>
            <div className="p-3 border-b border-slate-200">
              <StrategyDropdown propertyId={propertyId} activeStrategy={strategy} />
            </div>
            <div className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = tab.section === activeSection
                const isDisabled = tab.disabled || !isTabsEnabled

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-left transition-all ${
                      isActive 
                        ? 'bg-teal/10 text-teal' 
                        : isDisabled 
                          ? 'text-slate-400 cursor-not-allowed opacity-50' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{tab.label}</span>
                    {isDisabled && <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">Soon</span>}
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
