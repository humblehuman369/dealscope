'use client'

import { useState, useEffect, useCallback } from 'react'
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
  InvestmentGoals 
} from '@/components/dashboard'
import { 
  LayoutDashboard, 
  Bell, 
  Settings,
  Shield,
  Users,
  Activity,
  Building2,
  TrendingUp,
  UserCog,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react'

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

interface AdminUser {
  id: string
  email: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
  last_login?: string
  saved_properties_count?: number
}

interface PlatformStats {
  total_users: number
  active_users: number
  total_properties_saved: number
  new_users_30d: number
}

// Use relative paths for API calls to go through Next.js API routes
const API_BASE_URL = ''

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
          <PortfolioSummary data={portfolioData} isLoading={isLoading} />
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

// ===========================================
// Platform Stats Section (Admin)
// ===========================================

function PlatformStatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (err) {
        console.error('Failed to fetch platform stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-navy-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  const platformStats = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Active Users', value: stats?.active_users || 0, icon: Activity, color: 'text-green-500' },
    { label: 'Properties Saved', value: stats?.total_properties_saved || 0, icon: Building2, color: 'text-purple-500' },
    { label: 'New Users (30d)', value: stats?.new_users_30d || 0, icon: TrendingUp, color: 'text-orange-500' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {platformStats.map((stat, index) => (
        <div key={index} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-navy-700 rounded-lg">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ===========================================
// User Management Section (Admin)
// ===========================================

interface AdminUser {
  id: string
  email: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
}

function UserManagementSection() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/users?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setUsers(data.items || data || [])
        }
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/toggle-active`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        ))
      }
    } catch (err) {
      console.error('Failed to toggle user:', err)
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-navy-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <UserCog className="w-5 h-5 text-amber-500" />
          User Management
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-navy-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-navy-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{u.full_name || 'No name'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      u.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      u.is_superuser
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-navy-700 dark:text-slate-300'
                    }`}>
                      {u.is_superuser ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`text-xs font-medium ${
                        u.is_active
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-green-500 hover:text-green-600'
                      }`}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
