'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
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
  MoreHorizontal
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// ===========================================
// Main Dashboard Component
// ===========================================

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            {isAdmin ? 'Manage your account and platform administration' : 'Manage your profile and saved properties'}
          </p>
        </div>

        {/* Standard User Sections */}
        <div className="space-y-8">
          <ProfileSection user={user} />
          <SavedPropertiesSection />
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
// Profile Section
// ===========================================

interface ProfileSectionProps {
  user: {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    is_active: boolean
    is_verified: boolean
    is_superuser: boolean
    created_at: string
    last_login?: string
  }
}

function ProfileSection({ user }: ProfileSectionProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Banner */}
      <div className="h-24 bg-brand-500"></div>
      
      <div className="relative px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-10">
          {/* Avatar & Info */}
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl bg-brand-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-navy-800 shadow-lg">
              {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="mb-1">
              <h2 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
                {user.full_name || 'User'}
                {user.is_superuser && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                    Admin
                  </span>
                )}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 text-sm">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
            </div>
          </div>
          
          {/* Edit Profile Link */}
          <Link
            href="/profile"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Member since</p>
            <p className="text-sm font-medium text-navy-900 dark:text-white mt-1">
              {formatDate(user.created_at)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Last login</p>
            <p className="text-sm font-medium text-navy-900 dark:text-white mt-1">
              {user.last_login ? formatDate(user.last_login) : 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Status</p>
            <p className="text-sm font-medium text-navy-900 dark:text-white mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {user.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Email</p>
            <p className="text-sm font-medium text-navy-900 dark:text-white mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${user.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              {user.is_verified ? 'Verified' : 'Pending'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===========================================
// Saved Properties Section
// ===========================================

function SavedPropertiesSection() {
  const [properties, setProperties] = useState<SavedProperty[]>([])
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchProperties = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const [propsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=50`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/v1/properties/saved/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ])

      if (propsResponse.ok) {
        const data = await propsResponse.json()
        setProperties(data)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to fetch saved properties:', err)
      setError('Failed to load saved properties')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const handleRemoveProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to remove this property?')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/v1/properties/saved/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setProperties(prev => prev.filter(p => p.id !== propertyId))
      }
    } catch (err) {
      console.error('Failed to remove property:', err)
    }
  }

  const filteredProperties = properties.filter(p => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      p.address_street.toLowerCase().includes(search) ||
      p.nickname?.toLowerCase().includes(search) ||
      p.address_city?.toLowerCase().includes(search)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value?: number) => {
    if (!value) return 'N/A'
    return `${(value * 100).toFixed(1)}%`
  }

  const getStrategyLabel = (strategy?: string) => {
    const labels: Record<string, string> = {
      'ltr': 'Long-Term Rental',
      'str': 'Short-Term Rental',
      'brrrr': 'BRRRR',
      'flip': 'Fix & Flip',
      'house_hack': 'House Hack',
      'wholesale': 'Wholesale'
    }
    return strategy ? labels[strategy] || strategy : 'Not analyzed'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'watching': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'analyzing': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'contacted': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'under_contract': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'owned': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'passed': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      'archived': 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500'
    }
    return colors[status] || colors['watching']
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-500" />
              Saved Properties
              {stats && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-navy-700 text-neutral-600 dark:text-neutral-400 rounded-full">
                  {stats.total}
                </span>
              )}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Properties you've saved for analysis
            </p>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-navy-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
        </div>

        {/* Status Filters */}
        {stats && stats.by_status && Object.keys(stats.by_status).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(stats.by_status).map(([status, count]) => (
              <span
                key={status}
                className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
              >
                {status.replace('_', ' ')}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h4 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
              {searchQuery ? 'No matching properties' : 'No saved properties yet'}
            </h4>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Start scanning or searching for properties to save them for later analysis'}
            </p>
            {!searchQuery && (
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Search Properties
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-navy-900 dark:text-white truncate">
                          {property.nickname || property.address_street}
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {property.address_street}
                            {property.address_city && `, ${property.address_city}`}
                            {property.address_state && `, ${property.address_state}`}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Tags & Status */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                        {property.status.replace('_', ' ')}
                      </span>
                      {property.best_strategy && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-full">
                          {getStrategyLabel(property.best_strategy)}
                        </span>
                      )}
                      {property.priority && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(property.priority)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-sm">
                    {property.best_cash_flow && (
                      <div className="text-center">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Cash Flow</p>
                        <p className={`font-medium ${property.best_cash_flow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(property.best_cash_flow)}/mo
                        </p>
                      </div>
                    )}
                    {property.best_coc_return && (
                      <div className="text-center">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">CoC Return</p>
                        <p className="font-medium text-navy-900 dark:text-white">
                          {formatPercent(property.best_coc_return)}
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Saved</p>
                      <p className="font-medium text-navy-900 dark:text-white">
                        {formatDate(property.saved_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/property?address=${encodeURIComponent(property.address_street + (property.address_city ? ', ' + property.address_city : '') + (property.address_state ? ', ' + property.address_state : ''))}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Analyze
                    </Link>
                    <button
                      onClick={() => handleRemoveProperty(property.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove property"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===========================================
// Platform Stats Section (Admin Only)
// ===========================================

function PlatformStatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
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
      <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-blue-500' },
    { label: 'Active Users (30d)', value: stats.active_users, icon: Activity, color: 'text-green-500' },
    { label: 'Properties Saved', value: stats.total_properties_saved, icon: Building2, color: 'text-purple-500' },
    { label: 'New Users (30d)', value: stats.new_users_30d, icon: TrendingUp, color: 'text-brand-500' },
  ]

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-brand-500" />
        Platform Overview
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white dark:bg-navy-800 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy-900 dark:text-white">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===========================================
// User Management Section (Admin Only)
// ===========================================

function UserManagementSection() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else if (response.status === 403) {
        setError('Access denied. Admin privileges required.')
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        ))
      }
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'remove admin privileges from' : 'grant admin privileges to'} this user?`)) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_superuser: !currentStatus }),
      })

      if (response.ok) {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, is_superuser: !currentStatus } : u
        ))
      }
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      u.email.toLowerCase().includes(search) ||
      u.full_name?.toLowerCase().includes(search)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
              <UserCog className="w-5 h-5 text-brand-500" />
              User Management
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-navy-700 text-neutral-600 dark:text-neutral-400 rounded-full">
                {users.length}
              </span>
            </h3>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-navy-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-navy-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy-900 dark:text-white">
                          {user.full_name || 'No name'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      user.is_superuser 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {user.is_superuser ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_superuser)}
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          user.is_superuser
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:hover:bg-gray-800'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                        }`}
                      >
                        {user.is_superuser ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

