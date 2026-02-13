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
// Profile Page — Dark Fintech Theme
// ===========================================
// Typography: Inter 700 headlines, 400 body, 600 financial data
// Text hierarchy: slate-100 > slate-300 > slate-400 > slate-500
// Accents: sky-400 (primary), teal-400 (positive), amber-400 (caution),
//          red-400 (negative), emerald-400 (success/income)
// Theme: true black base, #0C1220 cards, 7% white borders
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    )
  }

  // ── Render ───────────────────────────────────

  return (
    <div
      className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ───────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
            Your Profile
          </h1>
          <p className="mt-2 text-slate-400">
            Manage your account, business information, and investment preferences
          </p>
        </div>

        {/* ── Profile Card with Avatar ──────────── */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] overflow-hidden mb-6">
          {/* Subtle radial gradient banner — depth, not decoration */}
          <div
            className="h-24"
            style={{
              background:
                'radial-gradient(ellipse at 50% 100%, rgba(56, 189, 248, 0.12), rgba(45, 212, 191, 0.06) 50%, transparent 80%)',
            }}
          />
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center text-white text-4xl font-bold border-4 border-[#0C1220] shadow-lg shadow-sky-500/10">
                  {user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-[#0C1220] rounded-full shadow-lg border border-white/[0.07] hover:border-sky-400/30 transition-colors">
                  <Camera className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              {/* Name & Email */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-100">
                  {user?.full_name || 'Add your name'}
                </h2>
                <p className="text-slate-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Alerts ─────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 flex items-center gap-2 text-sm">
            <X className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-400/10 border border-emerald-400/20 rounded-xl text-emerald-400 flex items-center gap-2 text-sm">
            <Check className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* ── Tab Navigation ────────────────────── */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                  : 'bg-[#0C1220] text-slate-400 border border-white/[0.07] hover:text-slate-300 hover:border-white/[0.14]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────── */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] p-6 sm:p-8">
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
