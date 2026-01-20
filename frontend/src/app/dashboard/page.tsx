'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Building2, 
  MapPin, 
  DollarSign,
  TrendingUp,
  Trash2,
  ExternalLink,
  Star,
  Clock,
  ChevronRight,
  Users,
  Activity,
  BarChart3,
  Settings,
  UserCog,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  MoreHorizontal,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  History,
  Wallet,
  Home,
  Target,
  Zap,
  Sparkles,
  Eye,
  Download
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
}

interface PropertyStats {
  total: number
  by_status: Record<string, number>
}

interface PortfolioSummary {
  total_properties: number
  total_estimated_value: number
  total_monthly_cash_flow: number
  average_coc_return: number
  best_performer?: SavedProperty
  properties_by_strategy: Record<string, number>
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

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

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

const getStrategyLabel = (strategy: string): string => {
  const labels: Record<string, string> = {
    ltr: 'Long-Term Rental',
    str: 'Short-Term Rental',
    brrrr: 'BRRRR',
    flip: 'Fix & Flip',
    house_hack: 'House Hack',
    wholesale: 'Wholesale'
  }
  return labels[strategy] || strategy
}

const getStrategyColor = (strategy: string): string => {
  const colors: Record<string, string> = {
    ltr: 'bg-blue-500',
    str: 'bg-purple-500',
    brrrr: 'bg-orange-500',
    flip: 'bg-pink-500',
    house_hack: 'bg-green-500',
    wholesale: 'bg-cyan-500'
  }
  return colors[strategy] || 'bg-gray-500'
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, needsOnboarding } = useAuth()
  const router = useRouter()
  
  // Redirect if not authenticated or needs onboarding
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/')
      } else if (needsOnboarding) {
        router.push('/onboarding')
      }
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const isAdmin = user.is_superuser
  const firstName = user.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 transition-colors">
      {/* py-8 for content spacing - header offset handled globally in layout.tsx */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 dark:text-white">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              {isAdmin ? 'Manage your investments and platform administration' : 'Here\'s what\'s happening with your portfolio'}
            </p>
          </div>
          <Link
            href="/profile"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-navy-800 border border-neutral-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Portfolio Stats */}
        <PortfolioStatsSection />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Saved Properties - 2 columns */}
          <div className="lg:col-span-2">
            <SavedPropertiesSection />
          </div>
          
          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <RecentActivitySection />
            <QuickLinksSection />
          </div>
        </div>

        {/* Admin Sections */}
        {isAdmin && (
          <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-navy-900 dark:text-white">Administration</h2>
            </div>
            <div className="space-y-8">
              <PlatformStatsSection />
              <UserManagementSection />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===========================================
// Quick Actions Section
// ===========================================

function QuickActionsSection() {
  const [showSearchModal, setShowSearchModal] = useState(false)
  
  const linkActions = [
    { label: 'Compare Deals', href: '/compare', icon: BarChart3, color: 'bg-purple-500', description: 'Side-by-side comparison' },
    { label: 'View Strategies', href: '/strategies', icon: Target, color: 'bg-orange-500', description: 'Explore investment types' },
    { label: 'Search History', href: '/search-history', icon: History, color: 'bg-green-500', description: 'Past searches' },
  ]

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Search Property - Opens Modal */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="group bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg transition-all text-left"
        >
          <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-navy-900 dark:text-white text-sm">Search Property</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Find and analyze properties</p>
        </button>

        {/* Other Actions - Links */}
        {linkActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg transition-all"
          >
            <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-navy-900 dark:text-white text-sm">{action.label}</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Search Property Modal */}
      <SearchPropertyModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </>
  )
}

// ===========================================
// Portfolio Stats Section
// ===========================================

function PortfolioStatsSection() {
  const [stats, setStats] = useState<PortfolioSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        // Fetch saved properties stats
        const response = await fetch(`${API_BASE_URL}/api/v1/properties/saved/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          // Calculate portfolio summary from stats
          setStats({
            total_properties: data.total || 0,
            total_estimated_value: data.total_estimated_value || 0,
            total_monthly_cash_flow: data.total_monthly_cash_flow || 0,
            average_coc_return: data.average_coc_return || 0,
            properties_by_strategy: data.by_strategy || {},
          })
        }
      } catch (err) {
        console.error('Failed to fetch portfolio stats:', err)
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
          <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-20 mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-navy-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    { 
      label: 'Properties Tracked', 
      value: stats?.total_properties || 0,
      format: 'number',
      icon: Building2,
      color: 'text-brand-500',
      bgColor: 'bg-brand-100 dark:bg-brand-900/30'
    },
    { 
      label: 'Est. Portfolio Value', 
      value: stats?.total_estimated_value || 0,
      format: 'currency',
      icon: Wallet,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    { 
      label: 'Monthly Cash Flow', 
      value: stats?.total_monthly_cash_flow || 0,
      format: 'currency',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      trend: (stats?.total_monthly_cash_flow || 0) >= 0 ? 'up' : 'down'
    },
    { 
      label: 'Avg. CoC Return', 
      value: stats?.average_coc_return || 0,
      format: 'percent',
      icon: Target,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</span>
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-navy-900 dark:text-white">
              {stat.format === 'currency' ? formatCurrency(stat.value) : 
               stat.format === 'percent' ? formatPercent(stat.value) : 
               stat.value.toLocaleString()}
            </span>
            {stat.trend && (
              <span className={`flex items-center text-xs ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ===========================================
// Recent Activity Section
// ===========================================

function RecentActivitySection() {
  const [activity, setActivity] = useState<SearchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSearchModal, setShowSearchModal] = useState(false)

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/v1/search-history/recent?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setActivity(data || [])
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivity()
  }, [])

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          Recent Searches
        </h3>
        <Link href="/search-history" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          View all
        </Link>
      </div>
      
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-navy-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-200 dark:bg-navy-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activity.length === 0 ? (
        <>
          <div className="p-6 text-center">
            <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No recent searches</p>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 inline-block"
            >
              Search a property
            </button>
          </div>
          <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
        </>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {activity.map((item) => (
            <Link
              key={item.id}
              href={`/property?address=${encodeURIComponent(item.search_query)}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-navy-700/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${item.was_successful ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <MapPin className={`w-4 h-4 ${item.was_successful ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-900 dark:text-white truncate">
                  {item.search_query.split(',')[0]}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {item.address_city && item.address_state ? `${item.address_city}, ${item.address_state}` : formatRelativeTime(item.searched_at)}
                </p>
              </div>
              {item.was_saved && (
                <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================
// Quick Links Section
// ===========================================

function QuickLinksSection() {
  const links = [
    { label: 'Edit Profile', href: '/profile', icon: User },
    { label: 'View Strategies', href: '/strategies', icon: Target },
    { label: 'My Documents', href: '/documents', icon: FileText },
    { label: 'Help Center', href: '/help', icon: Sparkles },
  ]

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-500" />
          Quick Links
        </h3>
      </div>
      <div className="p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
          >
            <link.icon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-navy-900 dark:text-white">{link.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ===========================================
// Saved Properties Section (Enhanced)
// ===========================================

function SavedPropertiesSection() {
  const [properties, setProperties] = useState<SavedProperty[]>([])
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const [propertiesRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/v1/properties/saved/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        ])

        if (propertiesRes.ok) {
          const data = await propertiesRes.json()
          setProperties(data.items || data || [])
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (err) {
        console.error('Failed to fetch properties:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [])

  const handleRemoveProperty = async (propertyId: string) => {
    if (!confirm('Remove this property from your saved list?')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/v1/properties/saved/${propertyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        setProperties(prev => prev.filter(p => p.id !== propertyId))
      }
    } catch (err) {
      console.error('Failed to remove property:', err)
    }
  }

  const filteredProperties = properties.filter(p => {
    const matchesSearch = !searchQuery || 
      p.address_street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusColors: Record<string, string> = {
    watching: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    analyzing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    under_contract: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    owned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    passed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
  }

  return (
    <>
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" />
            Saved Properties
            {stats && <span className="text-sm font-normal text-neutral-500">({stats.total})</span>}
          </h3>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties..."
                className="w-full sm:w-48 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-navy-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
              title="Add property"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filters */}
        {stats && stats.by_status && Object.keys(stats.by_status).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                !statusFilter
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-navy-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-navy-600'
              }`}
            >
              All
            </button>
            {Object.entries(stats.by_status).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-navy-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-navy-600'
                }`}
              >
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Properties List */}
      {isLoading ? (
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-navy-900 dark:text-white mb-1">
            {searchQuery || statusFilter ? 'No matching properties' : 'No saved properties yet'}
          </h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Search for properties and save them to track here'}
          </p>
          {!searchQuery && !statusFilter && (
            <button
              onClick={() => setShowSearchModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              Search Properties
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-navy-700/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Strategy Color Bar */}
                <div className={`w-1.5 h-16 rounded-full ${getStrategyColor(property.best_strategy || 'ltr')} flex-shrink-0`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-navy-900 dark:text-white text-sm">
                        {property.nickname || property.address_street}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[property.address_city, property.address_state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[property.status] || 'bg-gray-100 text-gray-700'}`}>
                      {property.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    {property.best_strategy && (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        <span className={`inline-block w-2 h-2 rounded-full ${getStrategyColor(property.best_strategy)} mr-1`}></span>
                        {getStrategyLabel(property.best_strategy)}
                      </span>
                    )}
                    {property.best_cash_flow !== undefined && (
                      <span className={`text-xs font-medium ${property.best_cash_flow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(property.best_cash_flow)}/mo
                      </span>
                    )}
                    {property.best_coc_return !== undefined && (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {formatPercent(property.best_coc_return)} CoC
                      </span>
                    )}
                    {property.priority && property.priority > 0 && (
                      <span className="flex items-center text-yellow-500">
                        {Array.from({ length: Math.min(property.priority, 3) }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Link
                      href={`/worksheet/${property.id}`}
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Worksheet
                    </Link>
                    <span className="text-neutral-300 dark:text-neutral-600">|</span>
                    <Link
                      href={`/property?address=${encodeURIComponent(property.address_street + ', ' + (property.address_city || '') + ', ' + (property.address_state || ''))}`}
                      className="text-xs text-gray-500 hover:text-brand-500 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Quick View
                    </Link>
                    <span className="text-neutral-300 dark:text-neutral-600">|</span>
                    <button
                      onClick={() => handleRemoveProperty(property.id)}
                      className="text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {properties.length > 0 && (
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-700 bg-gray-50 dark:bg-navy-700/30 flex justify-center">
          <Link
            href="/saved-properties"
            className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
          >
            View all saved properties
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
    <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </>
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
          <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 animate-pulse">
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
        <div key={index} className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gray-100 dark:bg-navy-700 rounded-lg`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900 dark:text-white">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
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

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
          <UserCog className="w-5 h-5 text-amber-500" />
          User Management
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-navy-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-navy-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-navy-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-navy-900 dark:text-white">{u.full_name || 'No name'}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.email}</p>
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
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {u.is_superuser ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
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
