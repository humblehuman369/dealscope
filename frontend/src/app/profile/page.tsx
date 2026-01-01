'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { 
  User, Mail, Calendar, Shield, Camera, Edit2, Save, X, 
  TrendingUp, Target, DollarSign, MapPin, Bell, Palette
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface UserProfile {
  id: string
  user_id: string
  investment_experience?: string
  preferred_strategies?: string[]
  target_markets?: string[]
  investment_budget_min?: number
  investment_budget_max?: number
  target_cash_on_cash?: number
  target_cap_rate?: number
  risk_tolerance?: string
  notification_preferences?: Record<string, boolean>
  preferred_theme?: string
  onboarding_completed: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [fullName, setFullName] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) return
      
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/v1/users/me/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (user) {
      setFullName(user.full_name || '')
      fetchProfile()
    }
  }, [isAuthenticated, user])

  const handleSave = async () => {
    if (!user) return
    
    setIsSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      // Update user info
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: fullName }),
      })

      if (response.ok) {
        await refreshUser()
        setIsEditing(false)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to save changes')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white">Your Profile</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Manage your account settings and investment preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-brand-500"></div>
          
          {/* Avatar & Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-16">
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-4xl sm:text-5xl font-bold border-4 border-white dark:border-navy-800 shadow-lg">
                    {user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-navy-700 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                {/* Name & Email */}
                <div className="mb-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-2xl font-bold bg-transparent border-b-2 border-brand-500 text-navy-900 dark:text-white focus:outline-none"
                      placeholder="Your name"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-navy-900 dark:text-white">{user?.full_name || 'Add your name'}</h2>
                  )}
                  <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {/* Edit Button */}
              <div className="mt-4 sm:mt-0 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setFullName(user?.full_name || '')
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-500" />
            Account Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Member since</p>
              <p className="text-navy-900 dark:text-white font-medium flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                {user?.created_at ? formatDate(user.created_at) : 'N/A'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Last login</p>
              <p className="text-navy-900 dark:text-white font-medium flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                {user?.last_login ? formatDate(user.last_login) : 'N/A'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Account status</p>
              <p className="text-navy-900 dark:text-white font-medium flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {user?.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Email verified</p>
              <p className="text-navy-900 dark:text-white font-medium flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${user?.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                {user?.is_verified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>
        </div>

        {/* Investment Preferences */}
        {isLoadingProfile ? (
          <div className="mt-6 bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          </div>
        ) : profile ? (
          <div className="mt-6 bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              Investment Preferences
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Experience Level
                </p>
                <p className="text-navy-900 dark:text-white font-medium mt-1 capitalize">
                  {profile.investment_experience || 'Not set'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Budget Range
                </p>
                <p className="text-navy-900 dark:text-white font-medium mt-1">
                  {profile.investment_budget_min || profile.investment_budget_max
                    ? `$${(profile.investment_budget_min || 0).toLocaleString()} - $${(profile.investment_budget_max || 0).toLocaleString()}`
                    : 'Not set'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Target Markets
                </p>
                <p className="text-navy-900 dark:text-white font-medium mt-1">
                  {profile.target_markets?.length ? profile.target_markets.join(', ') : 'Not set'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Preferred Strategies
                </p>
                <p className="text-navy-900 dark:text-white font-medium mt-1">
                  {profile.preferred_strategies?.length ? profile.preferred_strategies.join(', ') : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Settings Quick Links */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="p-4 bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
            <Bell className="w-6 h-6 text-brand-500 mb-2" />
            <p className="font-medium text-navy-900 dark:text-white">Notifications</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage alerts & emails</p>
          </button>
          
          <button className="p-4 bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
            <Palette className="w-6 h-6 text-brand-500 mb-2" />
            <p className="font-medium text-navy-900 dark:text-white">Appearance</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Theme & display settings</p>
          </button>
          
          <button className="p-4 bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
            <Shield className="w-6 h-6 text-brand-500 mb-2" />
            <p className="font-medium text-navy-900 dark:text-white">Security</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Password & 2FA</p>
          </button>
        </div>
      </div>
    </div>
  )
}

