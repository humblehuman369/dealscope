'use client'

import { useRef, useState, Suspense, type ChangeEvent } from 'react'
import { User, Building2, TrendingUp, Bell, Mail, Camera, X, Check } from 'lucide-react'
import { useProfileData } from './_components/useProfileData'
import { AccountTab } from './_components/AccountTab'
import { BusinessTab } from './_components/BusinessTab'
import { InvestorTab } from './_components/InvestorTab'
import { PreferencesTab } from './_components/PreferencesTab'
import { AuthGuard } from '@/components/auth/AuthGuard'
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

function ProfileContent() {
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
    isUploadingAvatar,
    error,
    success,

    saveAccountInfo,
    uploadAvatar,
    saveBusinessProfile,
    saveInvestorProfile,

    addPhoneNumber,
    removePhoneNumber,
    updatePhoneNumber,

    toggleStrategy,
    toggleMarket,
  } = useProfileData()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    await uploadAvatar(selectedFile)
    event.target.value = ''
  }

  const avatarSrc = accountForm.avatar_url || user?.avatar_url || ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-sky)]" />
      </div>
    )
  }

  // ── Render ───────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ───────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-heading)] tracking-tight">
            Your Profile
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your account, business information, and investment preferences
          </p>
        </div>

        {/* ── Profile Card with Avatar ──────────── */}
        <div className="relative isolate mb-6">
          <div
            className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl blur-xl"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, rgba(56, 189, 248, 0.28), rgba(56, 189, 248, 0) 70%)',
            }}
          />
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
            {/* Subtle radial gradient banner — depth, not decoration */}
            <div
              className="h-24"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 100%, var(--color-sky-dim), transparent 80%)',
              }}
            />
            <div className="relative px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                {/* Avatar */}
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-[var(--text-inverse)] text-4xl font-bold border-4 border-[var(--surface-card)] shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))', boxShadow: 'var(--shadow-card)' }}
                  >
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt="Profile avatar"
                        className="w-full h-full object-cover rounded-[12px]"
                      />
                    ) : (
                      user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 p-2 bg-[var(--surface-card)] rounded-full shadow-lg border border-[var(--border-default)] hover:border-[var(--border-focus)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Upload profile image"
                  >
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </button>
                </div>
                {/* Name & Email */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[var(--text-heading)]">
                    {user?.full_name || 'Add your name'}
                  </h2>
                  <p className="text-[var(--text-secondary)] flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Alerts ─────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-[rgba(248,113,113,0.10)] border border-[rgba(248,113,113,0.25)] rounded-xl text-[var(--status-negative)] flex items-center gap-2 text-sm">
            <X className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-[rgba(52,211,153,0.10)] border border-[rgba(52,211,153,0.25)] rounded-xl text-[var(--status-positive)] flex items-center gap-2 text-sm">
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
                  ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]'
              }`}
              style={activeTab === tab.id ? { boxShadow: 'var(--shadow-card)' } : undefined}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────── */}
        <div className="relative isolate">
          <div
            className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl blur-xl"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, rgba(56, 189, 248, 0.24), rgba(56, 189, 248, 0) 72%)',
            }}
          />
          <div
            className="relative rounded-2xl border border-[var(--border-default)] p-6 sm:p-8 overflow-hidden"
            style={{
              background: 'var(--surface-card)',
              boxShadow: activeTab === 'investor'
                ? 'var(--shadow-card)'
                : undefined,
            }}
          >
            {activeTab === 'investor' && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, var(--color-sky-dim), transparent 72%)',
                }}
              />
            )}
            <div className="relative z-10">
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
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-sky)]" />
      </div>
    }>
      <AuthGuard>
        <ProfileContent />
      </AuthGuard>
    </Suspense>
  )
}
