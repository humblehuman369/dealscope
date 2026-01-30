'use client'

import { useState, useEffect, useCallback } from 'react'
// Note: useCallback kept for fetchDashboardData
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { 
  PortfolioSummary, 
  QuickActions, 
  DealPipeline, 
  MarketAlerts,
  Watchlist,
  PortfolioProperties,
  ActivityFeed,
  InvestmentGoals,
  QuickStartChecklist
} from '@/components/dashboard'
import { 
  LayoutDashboard, 
  Bell, 
  Settings,
  Shield
} from 'lucide-react'
import {
  PlatformStatsSection,
  UserManagementSection,
  AdminAssumptionsSection,
  MetricsGlossarySection
} from '@/features/admin'

// ===========================================
// Types
// ===========================================

interface SavedProperty {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  nickname?: string
  status: string
  tags?: string[]
  color_label?: string
  priority?: number
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  saved_at: string
  last_viewed_at?: string
  updated_at: string
  // Additional fields for portfolio view
  estimated_value?: number
  equity?: number
  monthly_rent?: number
}

interface PropertyStats {
  total: number
  by_status: Record<string, number>
  total_estimated_value?: number
  total_monthly_cash_flow?: number
  average_coc_return?: number
  by_strategy?: Record<string, number>
}

interface SearchHistoryItem {
  id: string
  search_query: string
  address_city?: string
  address_state?: string
  was_successful: boolean
  was_saved: boolean
  searched_at: string
}

// Use environment variable for API URL, fallback to Railway production URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// ===========================================
// Formatting Helpers
// ===========================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading, needsOnboarding } = useAuth()
  const router = useRouter()
  
  // State for modal
  const [showSearchModal, setShowSearchModal] = useState(false)
  
  // State for sample/demo mode
  const [showSampleData, setShowSampleData] = useState(false)
  
  // State for dashboard data
  const [isLoading, setIsLoading] = useState(true)
  const [portfolioData, setPortfolioData] = useState({
    portfolioValue: 0,
    portfolioChange: 0,
    propertiesTracked: 0,
    totalEquity: 0,
    monthlyCashFlow: 0,
    avgCoC: 0,
  })
  const [pipelineData, setPipelineData] = useState({
    watching: 0,
    analyzing: 0,
    negotiating: 0,
    underContract: 0,
  })
  const [watchlistProperties, setWatchlistProperties] = useState<any[]>([])
  const [portfolioProperties, setPortfolioProperties] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [investmentGoals, setInvestmentGoals] = useState<any[]>([])
  const [marketAlerts, setMarketAlerts] = useState([
    { market: 'South Florida', temp: 'Hot' as const, change: '+8.2%', trend: 'up' as const },
    { market: 'Tampa Bay', temp: 'Warm' as const, change: '+5.1%', trend: 'up' as const },
    { market: 'Orlando', temp: 'Neutral' as const, change: '+1.8%', trend: 'up' as const },
  ])
  
  // Redirect if not authenticated or needs onboarding
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/')
      } else if (needsOnboarding) {
        router.push('/onboarding')
      }
    }
  }, [authLoading, isAuthenticated, needsOnboarding, router])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      // Fetch saved properties and stats in parallel
      const [propertiesRes, statsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/properties/saved/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/search-history/recent?limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ])

      // Process properties data
      if (propertiesRes.ok) {
        const data = await propertiesRes.json()
        const properties: SavedProperty[] = data.items || data || []
        
        // Convert to watchlist format
        const watchlist = properties
          .filter(p => p.status === 'watching' || p.status === 'analyzing')
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            address: p.address_street,
            city: `${p.address_city || ''}, ${p.address_state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
            price: p.estimated_value || 0,
            priceChange: 0,
            daysOnMarket: Math.floor((new Date().getTime() - new Date(p.saved_at).getTime()) / 86400000),
            beds: 3, // Default values - would come from property data
            baths: 2,
            sqft: 1800,
            score: p.best_coc_return ? Math.round(p.best_coc_return * 10) : 75,
          }))
        setWatchlistProperties(watchlist)
        
        // Convert to portfolio format (owned properties)
        const portfolio = properties
          .filter(p => p.status === 'owned' || p.status === 'under_contract')
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            address: p.nickname || p.address_street,
            city: `${p.address_city || ''}, ${p.address_state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
            value: p.estimated_value || 0,
            equity: p.equity || 0,
            monthlyRent: p.monthly_rent || 0,
            cashFlow: p.best_cash_flow || 0,
            cocReturn: p.best_coc_return ? (p.best_coc_return * 100).toFixed(1) : 0,
            status: p.best_cash_flow && p.best_cash_flow > 0 ? 'performing' : 'watch',
          }))
        setPortfolioProperties(portfolio)
        
        // Calculate pipeline counts
        const statusCounts = properties.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        setPipelineData({
          watching: statusCounts.watching || 0,
          analyzing: statusCounts.analyzing || 0,
          negotiating: statusCounts.contacted || statusCounts.negotiating || 0,
          underContract: statusCounts.under_contract || 0,
        })
      }

      // Process stats data
      if (statsRes.ok) {
        const statsData: PropertyStats = await statsRes.json()
        setPortfolioData({
          portfolioValue: statsData.total_estimated_value || 0,
          portfolioChange: 8.5, // Would calculate from historical data
          propertiesTracked: statsData.total || 0,
          totalEquity: (statsData.total_estimated_value || 0) * 0.25, // Estimate 25% equity
          monthlyCashFlow: statsData.total_monthly_cash_flow || 0,
          avgCoC: statsData.average_coc_return ? (statsData.average_coc_return * 100) : 0,
        })
      }

      // Process search history as activity
      if (historyRes.ok) {
        const historyData: SearchHistoryItem[] = await historyRes.json()
        const activities = historyData.map((item, i) => ({
          id: item.id || String(i),
          type: item.was_saved ? 'analysis' as const : (item.was_successful ? 'new_match' as const : 'alert' as const),
          property: item.search_query.split(',')[0],
          detail: item.was_saved ? 'Property saved to watchlist' : (item.was_successful ? 'Search completed' : 'Property not found'),
          time: formatRelativeTime(item.searched_at),
        }))
        setRecentActivity(activities)
      }

      // Set default investment goals (would come from user profile)
      setInvestmentGoals([
        { label: 'Monthly Cash Flow Goal', current: portfolioData.monthlyCashFlow || 5000, target: 15000, unit: '$' },
        { label: 'Properties Goal', current: portfolioData.propertiesTracked || 2, target: 10, unit: '' },
        { label: 'Portfolio Value Goal', current: (portfolioData.portfolioValue || 500000) / 1000000, target: 5, unit: 'M' },
      ])

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchDashboardData()
    }
  }, [isAuthenticated, authLoading, fetchDashboardData])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const isAdmin = user.is_superuser
  const firstName = user.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 transition-colors dashboard-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <LayoutDashboard size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Dashboard</h3>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Here's what's happening with your portfolio
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="relative p-2.5 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors">
              <Bell size={18} className="text-slate-600 dark:text-slate-400" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </button>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
            >
              <Settings size={16} className="text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Settings</span>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions onSearchClick={() => setShowSearchModal(true)} />
        </div>

        {/* Portfolio Summary */}
        <div className="mb-6">
          {showSampleData && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-400/30 text-amber-700 dark:text-amber-300 rounded">Demo</span>
              <span className="text-xs text-amber-700 dark:text-amber-300">Viewing sample data — this is not your real portfolio</span>
              <button 
                onClick={() => setShowSampleData(false)}
                className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                Exit Demo
              </button>
            </div>
          )}
          <PortfolioSummary 
            data={showSampleData ? {
              portfolioValue: 1250000,
              portfolioChange: 12.4,
              propertiesTracked: 3,
              totalEquity: 425000,
              monthlyCashFlow: 4200,
              avgCoC: 9.8,
            } : portfolioData} 
            isLoading={isLoading && !showSampleData}
            onViewSample={() => setShowSampleData(true)}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - 8 cols */}
          <div className="lg:col-span-8 space-y-6">
            {/* Watchlist */}
            <Watchlist 
              properties={watchlistProperties} 
              isLoading={isLoading}
              onAddClick={() => setShowSearchModal(true)}
            />

            {/* Portfolio Properties */}
            <PortfolioProperties 
              properties={portfolioProperties} 
              isLoading={isLoading}
              onAddClick={() => setShowSearchModal(true)}
            />
          </div>

          {/* Right Column - 4 cols */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Start Checklist */}
            <QuickStartChecklist 
              hasAnalyzedProperty={watchlistProperties.length > 0 || portfolioProperties.length > 0}
              hasCompletedProfile={!needsOnboarding}
              hasViewedSample={showSampleData}
              onViewSample={() => setShowSampleData(true)}
            />

            {/* Deal Pipeline */}
            <DealPipeline pipeline={pipelineData} isLoading={isLoading} />

            {/* Market Alerts */}
            <MarketAlerts alerts={marketAlerts} isLoading={false} />

            {/* Investment Goals */}
            <InvestmentGoals goals={investmentGoals} isLoading={isLoading} />

            {/* Activity Feed */}
            <ActivityFeed activities={recentActivity} isLoading={isLoading} />
          </div>
        </div>

        {/* Admin Sections */}
        {isAdmin && (
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-navy-700">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Administration</h2>
            </div>
            <div className="space-y-8">
              <PlatformStatsSection />
              <UserManagementSection />
              <AdminAssumptionsSection />
              <MetricsGlossarySection />
            </div>
          </div>
        )}
      </div>

      {/* Search Property Modal */}
      <SearchPropertyModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </div>
  )
}

