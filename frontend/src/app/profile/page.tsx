'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getAccessToken } from '@/lib/api'
import { 
  User, Mail, Calendar, Shield, Camera, Edit2, Save, X, 
  TrendingUp, Target, DollarSign, MapPin, Bell, Palette,
  Building2, Phone, Globe, Linkedin, Instagram, Twitter,
  Plus, Trash2, Check, ChevronDown, Briefcase, FileText
} from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

// Use relative URLs to go through Next.js API routes (which proxy to backend)

// ===========================================
// Types
// ===========================================

interface PhoneNumber {
  type: 'mobile' | 'home' | 'work' | 'fax' | 'other'
  number: string
  primary: boolean
}

interface SocialLinks {
  linkedin?: string
  facebook?: string
  instagram?: string
  twitter?: string
  youtube?: string
  tiktok?: string
  website?: string
}

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
  default_assumptions?: Record<string, any>
  notification_preferences?: Record<string, boolean>
  preferred_theme?: string
  onboarding_completed: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

interface UserData {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  business_name?: string
  business_type?: string
  business_address_street?: string
  business_address_city?: string
  business_address_state?: string
  business_address_zip?: string
  business_address_country?: string
  phone_numbers?: PhoneNumber[]
  additional_emails?: string[]
  social_links?: SocialLinks
  license_number?: string
  license_state?: string
  bio?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
  last_login?: string
}

type TabType = 'account' | 'business' | 'investor' | 'preferences'

const STRATEGIES = [
  { id: 'ltr', label: 'Long-Term Rental', color: 'bg-blue-500' },
  { id: 'str', label: 'Short-Term Rental', color: 'bg-purple-500' },
  { id: 'brrrr', label: 'BRRRR', color: 'bg-orange-500' },
  { id: 'flip', label: 'Fix & Flip', color: 'bg-pink-500' },
  { id: 'house_hack', label: 'House Hack', color: 'bg-green-500' },
  { id: 'wholesale', label: 'Wholesale', color: 'bg-cyan-500' },
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to real estate investing' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-5 deals completed' },
  { value: 'advanced', label: 'Advanced', desc: '5-20 deals completed' },
  { value: 'expert', label: 'Expert', desc: '20+ deals, full-time investor' },
]

const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', desc: 'Prefer stable, lower returns' },
  { value: 'moderate', label: 'Moderate', desc: 'Balance of risk and reward' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk for higher returns' },
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// ===========================================
// Main Component
// ===========================================

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullUserData, setFullUserData] = useState<UserData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('account')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states for each section
  const [accountForm, setAccountForm] = useState({
    full_name: '',
    avatar_url: '',
  })

  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    business_type: '',
    business_address_street: '',
    business_address_city: '',
    business_address_state: '',
    business_address_zip: '',
    phone_numbers: [] as PhoneNumber[],
    additional_emails: [] as string[],
    social_links: {} as SocialLinks,
    license_number: '',
    license_state: '',
    bio: '',
  })

  const [investorForm, setInvestorForm] = useState({
    investment_experience: '',
    preferred_strategies: [] as string[],
    target_markets: [] as string[],
    investment_budget_min: 0,
    investment_budget_max: 0,
    target_cash_on_cash: 0,
    target_cap_rate: 0,
    risk_tolerance: '',
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch profile and user data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return
    
    try {
      const token = getAccessToken()
      if (!token) return

      // Fetch full user data with business profile
      const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (userResponse.ok) {
        const userData: UserData = await userResponse.json()
        setFullUserData(userData)
        
        // Initialize account form
        setAccountForm({
          full_name: userData.full_name || '',
          avatar_url: userData.avatar_url || '',
        })

        // Initialize business form
        setBusinessForm({
          business_name: userData.business_name || '',
          business_type: userData.business_type || '',
          business_address_street: userData.business_address_street || '',
          business_address_city: userData.business_address_city || '',
          business_address_state: userData.business_address_state || '',
          business_address_zip: userData.business_address_zip || '',
          phone_numbers: userData.phone_numbers || [],
          additional_emails: userData.additional_emails || [],
          social_links: userData.social_links || {},
          license_number: userData.license_number || '',
          license_state: userData.license_state || '',
          bio: userData.bio || '',
        })
      }

      // Fetch investor profile
      const profileResponse = await fetch(`${API_BASE_URL}/api/v1/users/me/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (profileResponse.ok) {
        const profileData: UserProfile = await profileResponse.json()
        setProfile(profileData)
        
        // Initialize investor form
        setInvestorForm({
          investment_experience: profileData.investment_experience || '',
          preferred_strategies: profileData.preferred_strategies || [],
          target_markets: profileData.target_markets || [],
          investment_budget_min: profileData.investment_budget_min || 0,
          investment_budget_max: profileData.investment_budget_max || 0,
          target_cash_on_cash: profileData.target_cash_on_cash || 0,
          target_cap_rate: profileData.target_cap_rate || 0,
          risk_tolerance: profileData.risk_tolerance || '',
        })
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('Failed to load profile data')
    } finally {
      setIsLoadingProfile(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])

  // Save handlers
  const saveAccountInfo = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountForm),
      })

      if (response.ok) {
        await refreshUser()
        setSuccess('Account information saved successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to save account info')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveBusinessProfile = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessForm),
      })

      if (response.ok) {
        await refreshUser()
        setSuccess('Business profile saved successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to save business profile')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveInvestorProfile = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(investorForm),
      })

      if (response.ok) {
        setSuccess('Investor profile saved successfully!')
        await fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to save investor profile')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Phone number management
  const addPhoneNumber = () => {
    setBusinessForm(prev => ({
      ...prev,
      phone_numbers: [...prev.phone_numbers, { type: 'mobile', number: '', primary: prev.phone_numbers.length === 0 }]
    }))
  }

  const removePhoneNumber = (index: number) => {
    setBusinessForm(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.filter((_, i) => i !== index)
    }))
  }

  const updatePhoneNumber = (index: number, field: keyof PhoneNumber, value: any) => {
    setBusinessForm(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.map((phone, i) => 
        i === index ? { ...phone, [field]: value } : phone
      )
    }))
  }

  // Strategy toggle
  const toggleStrategy = (strategyId: string) => {
    setInvestorForm(prev => ({
      ...prev,
      preferred_strategies: prev.preferred_strategies.includes(strategyId)
        ? prev.preferred_strategies.filter(s => s !== strategyId)
        : [...prev.preferred_strategies, strategyId]
    }))
  }

  // Market toggle
  const toggleMarket = (state: string) => {
    setInvestorForm(prev => ({
      ...prev,
      target_markets: prev.target_markets.includes(state)
        ? prev.target_markets.filter(s => s !== state)
        : [...prev.target_markets, state]
    }))
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

  const tabs = [
    { id: 'account' as TabType, label: 'Account', icon: User },
    { id: 'business' as TabType, label: 'Business Profile', icon: Building2 },
    { id: 'investor' as TabType, label: 'Investor Profile', icon: TrendingUp },
    { id: 'preferences' as TabType, label: 'Preferences', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white">Your Profile</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Manage your account, business information, and investment preferences
          </p>
        </div>

        {/* Profile Card with Avatar */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-6">
          <div className="h-24 bg-brand-500"></div>
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white dark:border-navy-800 shadow-lg">
                  {user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-navy-700 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white">
                  {user?.full_name || 'Add your name'}
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700 border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-500" />
                Account Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={accountForm.full_name}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-navy-900 border border-neutral-200 dark:border-neutral-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Contact support to change email</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Member since</p>
                  <p className="text-sm font-medium text-navy-900 dark:text-white mt-1">
                    {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Last login</p>
                  <p className="text-sm font-medium text-navy-900 dark:text-white mt-1">
                    {user?.last_login ? formatDate(user.last_login) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Status</p>
                  <p className="text-sm font-medium text-navy-900 dark:text-white mt-1 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Email verified</p>
                  <p className="text-sm font-medium text-navy-900 dark:text-white mt-1 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${user?.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    {user?.is_verified ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveAccountInfo}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Business Profile Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" />
                Business Profile
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This information will be used for LOIs, contracts, and professional networking.
              </p>

              {/* Business Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessForm.business_name}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, business_name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., ABC Investments LLC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Type
                  </label>
                  <select
                    value={businessForm.business_type}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, business_type: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select type...</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="sole_proprietor">Sole Proprietor</option>
                    <option value="partnership">Partnership</option>
                    <option value="trust">Trust</option>
                  </select>
                </div>
              </div>

              {/* Business Address */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Business Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={businessForm.business_address_street}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_street: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Street Address"
                    />
                  </div>
                  <input
                    type="text"
                    value={businessForm.business_address_city}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_city: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="City"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={businessForm.business_address_state}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_state: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">State</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={businessForm.business_address_zip}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address_zip: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="ZIP"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Numbers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Numbers
                  </h4>
                  <button
                    onClick={addPhoneNumber}
                    className="text-brand-500 hover:text-brand-600 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Phone
                  </button>
                </div>
                <div className="space-y-3">
                  {businessForm.phone_numbers.map((phone, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <select
                        value={phone.type}
                        onChange={(e) => updatePhoneNumber(index, 'type', e.target.value)}
                        className="w-28 px-3 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-navy-900 dark:text-white"
                      >
                        <option value="mobile">Mobile</option>
                        <option value="work">Work</option>
                        <option value="home">Home</option>
                        <option value="fax">Fax</option>
                      </select>
                      <input
                        type="tel"
                        value={phone.number}
                        onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="(555) 555-5555"
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={phone.primary}
                          onChange={(e) => updatePhoneNumber(index, 'primary', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-500"
                        />
                        Primary
                      </label>
                      <button
                        onClick={() => removePhoneNumber(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {businessForm.phone_numbers.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No phone numbers added</p>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Social & Marketing Links
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={businessForm.social_links.website || ''}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, website: e.target.value } }))}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-5 h-5 text-[#0077b5]" />
                    <input
                      type="url"
                      value={businessForm.social_links.linkedin || ''}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, linkedin: e.target.value } }))}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="LinkedIn URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-[#e4405f]" />
                    <input
                      type="url"
                      value={businessForm.social_links.instagram || ''}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Instagram URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="w-5 h-5 text-[#1da1f2]" />
                    <input
                      type="url"
                      value={businessForm.social_links.twitter || ''}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, social_links: { ...prev.social_links, twitter: e.target.value } }))}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Twitter/X URL"
                    />
                  </div>
                </div>
              </div>

              {/* License Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Real Estate License # (optional)
                  </label>
                  <input
                    type="text"
                    value={businessForm.license_number}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, license_number: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="License number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License State
                  </label>
                  <select
                    value={businessForm.license_state}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, license_state: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select state...</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Professional Bio
                </label>
                <textarea
                  value={businessForm.bio}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Tell others about your investment experience and expertise..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveBusinessProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Business Profile
                </button>
              </div>
            </div>
          )}

          {/* Investor Profile Tab */}
          {activeTab === 'investor' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                Investor Profile
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                These preferences will customize your property analytics and recommendations.
              </p>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Investment Experience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {EXPERIENCE_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setInvestorForm(prev => ({ ...prev, investment_experience: level.value }))}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        investorForm.investment_experience === level.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
                      }`}
                    >
                      <p className="font-medium text-navy-900 dark:text-white">{level.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Strategies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preferred Investment Strategies
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STRATEGIES.map(strategy => (
                    <button
                      key={strategy.id}
                      onClick={() => toggleStrategy(strategy.id)}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        investorForm.preferred_strategies.includes(strategy.id)
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${strategy.color}`}></div>
                      <span className="text-sm font-medium text-navy-900 dark:text-white">{strategy.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Investment Budget Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={investorForm.investment_budget_min || ''}
                        onChange={(e) => setInvestorForm(prev => ({ ...prev, investment_budget_min: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="100,000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={investorForm.investment_budget_max || ''}
                        onChange={(e) => setInvestorForm(prev => ({ ...prev, investment_budget_max: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="500,000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Returns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Target Returns
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Target Cash-on-Cash Return</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={investorForm.target_cash_on_cash ? (investorForm.target_cash_on_cash * 100).toFixed(1) : ''}
                        onChange={(e) => setInvestorForm(prev => ({ ...prev, target_cash_on_cash: parseFloat(e.target.value) / 100 || 0 }))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Target Cap Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={investorForm.target_cap_rate ? (investorForm.target_cap_rate * 100).toFixed(1) : ''}
                        onChange={(e) => setInvestorForm(prev => ({ ...prev, target_cap_rate: parseFloat(e.target.value) / 100 || 0 }))}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Tolerance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Risk Tolerance
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RISK_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setInvestorForm(prev => ({ ...prev, risk_tolerance: level.value }))}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        investorForm.risk_tolerance === level.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
                      }`}
                    >
                      <p className="font-medium text-navy-900 dark:text-white">{level.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Markets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Target Markets (States)
                </label>
                <div className="flex flex-wrap gap-2">
                  {US_STATES.map(state => (
                    <button
                      key={state}
                      onClick={() => toggleMarket(state)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        investorForm.target_markets.includes(state)
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-gray-50 dark:bg-navy-700 text-gray-600 dark:text-gray-400 border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveInvestorProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Investor Profile
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-500" />
                Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
                  <Bell className="w-6 h-6 text-brand-500 mb-2" />
                  <p className="font-medium text-navy-900 dark:text-white">Notifications</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
                  <Palette className="w-6 h-6 text-brand-500 mb-2" />
                  <p className="font-medium text-navy-900 dark:text-white">Appearance</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
                  <Shield className="w-6 h-6 text-brand-500 mb-2" />
                  <p className="font-medium text-navy-900 dark:text-white">Security</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
