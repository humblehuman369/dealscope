'use client'

import { useState } from 'react'
import { User, Building2, TrendingUp, Bell, Mail, Camera, X, Check } from 'lucide-react'
import { useProfileData } from './_components/useProfileData'
import { AccountTab } from './_components/AccountTab'
import { BusinessTab } from './_components/BusinessTab'
import { InvestorTab } from './_components/InvestorTab'
import { PreferencesTab } from './_components/PreferencesTab'
import type { TabType } from './_components/types'

// ===========================================
// Profile Page — Thin Orchestrator
// ===========================================

const tabs = [
  { id: 'account' as TabType, label: 'Account', icon: User },
  { id: 'business' as TabType, label: 'Business Profile', icon: Building2 },
  { id: 'investor' as TabType, label: 'Investor Profile', icon: TrendingUp },
  { id: 'preferences' as TabType, label: 'Preferences', icon: Bell },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>('account')

  const {
    user,
    isAuthenticated,
    isLoading,

    accountForm,
    setAccountForm,
    businessForm,
    setBusinessForm,
    investorForm,
    setInvestorForm,

    isSaving,
    error,
    success,

    saveAccountInfo,
    saveBusinessProfile,
    saveInvestorProfile,

    addPhoneNumber,
    removePhoneNumber,
    updatePhoneNumber,

    toggleStrategy,
    toggleMarket,
  } = useProfileData()

  // ── Loading state ────────────────────────────

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────

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
          {activeTab === 'account' && (
            <AccountTab
              user={user}
              accountForm={accountForm}
              setAccountForm={setAccountForm}
              isSaving={isSaving}
              onSave={saveAccountInfo}
            />
          )}

          {activeTab === 'business' && (
            <BusinessTab
              businessForm={businessForm}
              setBusinessForm={setBusinessForm}
              isSaving={isSaving}
              onSave={saveBusinessProfile}
              onAddPhone={addPhoneNumber}
              onRemovePhone={removePhoneNumber}
              onUpdatePhone={updatePhoneNumber}
            />
          )}

          {activeTab === 'investor' && (
            <InvestorTab
              investorForm={investorForm}
              setInvestorForm={setInvestorForm}
              isSaving={isSaving}
              onSave={saveInvestorProfile}
              onToggleStrategy={toggleStrategy}
              onToggleMarket={toggleMarket}
            />
          )}

          {activeTab === 'preferences' && (
            <PreferencesTab />
          )}
        </div>
      </div>
    </div>
  )
}
