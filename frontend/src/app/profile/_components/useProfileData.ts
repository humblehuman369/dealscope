'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useRefreshUser } from '@/hooks/useSession'
import { apiRequest } from '@/lib/api-client'
import type {
  UserProfile,
  UserData,
  AccountFormData,
  BusinessFormData,
  InvestorFormData,
  PhoneNumber,
} from './types'

// ===========================================
// useProfileData — owns all Profile page state
// ===========================================

export function useProfileData() {
  const { user, isAuthenticated, isLoading } = useSession()
  const refreshUser = useRefreshUser()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullUserData, setFullUserData] = useState<UserData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ── Form states ──────────────────────────────

  const [accountForm, setAccountForm] = useState<AccountFormData>({
    full_name: '',
    avatar_url: '',
  })

  const [businessForm, setBusinessForm] = useState<BusinessFormData>({
    business_name: '',
    business_type: '',
    business_address_street: '',
    business_address_city: '',
    business_address_state: '',
    business_address_zip: '',
    phone_numbers: [],
    additional_emails: [],
    social_links: {},
    license_number: '',
    license_state: '',
    bio: '',
  })

  const [investorForm, setInvestorForm] = useState<InvestorFormData>({
    investment_experience: '',
    preferred_strategies: [],
    target_markets: [],
    investment_budget_min: 0,
    investment_budget_max: 0,
    target_cash_on_cash: 0,
    target_cap_rate: 0,
    risk_tolerance: '',
  })

  // ── Auth redirect ────────────────────────────

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // ── Data fetching (uses apiRequest — cookie auth) ──

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      // Fetch full user data with business profile
      const userData = await apiRequest<UserData>('/api/v1/users/me')
      setFullUserData(userData)

      setAccountForm({
        full_name: userData.full_name || '',
        avatar_url: userData.avatar_url || '',
      })

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

      // Fetch investor profile
      const profileData = await apiRequest<UserProfile>('/api/v1/users/me/profile')
      setProfile(profileData)

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

  // ── Save handlers ────────────────────────────

  const saveAccountInfo = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/v1/users/me', {
        method: 'PATCH',
        body: accountForm,
      })
      await refreshUser()
      setSuccess('Account information saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account info')
    } finally {
      setIsSaving(false)
    }
  }

  const saveBusinessProfile = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/v1/users/me', {
        method: 'PATCH',
        body: businessForm,
      })
      await refreshUser()
      setSuccess('Business profile saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save business profile')
    } finally {
      setIsSaving(false)
    }
  }

  const saveInvestorProfile = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/v1/users/me/profile', {
        method: 'PATCH',
        body: investorForm,
      })
      setSuccess('Investor profile saved successfully!')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save investor profile')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Phone number management ──────────────────

  const addPhoneNumber = () => {
    setBusinessForm(prev => ({
      ...prev,
      phone_numbers: [
        ...prev.phone_numbers,
        { type: 'mobile', number: '', primary: prev.phone_numbers.length === 0 },
      ],
    }))
  }

  const removePhoneNumber = (index: number) => {
    setBusinessForm(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.filter((_, i) => i !== index),
    }))
  }

  const updatePhoneNumber = (index: number, field: keyof PhoneNumber, value: string | boolean) => {
    setBusinessForm(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.map((phone, i) =>
        i === index ? { ...phone, [field]: value } : phone,
      ),
    }))
  }

  // ── Strategy & market toggles ────────────────

  const toggleStrategy = (strategyId: string) => {
    setInvestorForm(prev => ({
      ...prev,
      preferred_strategies: prev.preferred_strategies.includes(strategyId)
        ? prev.preferred_strategies.filter(s => s !== strategyId)
        : [...prev.preferred_strategies, strategyId],
    }))
  }

  const toggleMarket = (state: string) => {
    setInvestorForm(prev => ({
      ...prev,
      target_markets: prev.target_markets.includes(state)
        ? prev.target_markets.filter(s => s !== state)
        : [...prev.target_markets, state],
    }))
  }

  return {
    // Auth & loading
    user,
    isAuthenticated,
    isLoading,
    isLoadingProfile,

    // Data
    profile,
    fullUserData,

    // Forms
    accountForm,
    setAccountForm,
    businessForm,
    setBusinessForm,
    investorForm,
    setInvestorForm,

    // Status
    isSaving,
    error,
    success,

    // Save actions
    saveAccountInfo,
    saveBusinessProfile,
    saveInvestorProfile,

    // Phone management
    addPhoneNumber,
    removePhoneNumber,
    updatePhoneNumber,

    // Toggle helpers
    toggleStrategy,
    toggleMarket,
  }
}
