'use client'

import { useState, Suspense } from 'react'
import {
  BarChart3,
  SlidersHorizontal,
  BookOpen,
  Users,
  ShieldCheck,
} from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { PlatformStatsSection } from '@/features/admin/components/PlatformStats'
import { AdminAssumptionsSection } from '@/features/admin/components/AdminAssumptions'
import { MetricsGlossarySection } from '@/features/admin/components/MetricsGlossary'
import { UserManagementSection } from '@/features/admin/components/UserManagement'

// ===========================================
// Admin Dashboard — Dark Fintech Theme
// ===========================================
// Amber accent for admin shield — signals authority/caution
// Sky-400 active tabs, white/7% borders, true black base
// ===========================================

type AdminTab = 'overview' | 'assumptions' | 'glossary' | 'users'

const tabs: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'assumptions', label: 'Assumptions', icon: SlidersHorizontal },
  { id: 'glossary', label: 'Formula Glossary', icon: BookOpen },
  { id: 'users', label: 'Users', icon: Users },
]

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  return (
    <div
      className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-400/10 rounded-lg border border-amber-400/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 text-sm">
                Platform configuration, default assumptions, and formula reference
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────── */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
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
        <div className="space-y-6">
          {activeTab === 'overview' && <PlatformStatsSection />}
          {activeTab === 'assumptions' && <AdminAssumptionsSection />}
          {activeTab === 'glossary' && <MetricsGlossarySection />}
          {activeTab === 'users' && <UserManagementSection />}
        </div>
      </div>
    </div>
  )
}

// ===========================================
// Page export — AuthGuard with requireAdmin
// ===========================================

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    }>
      <AuthGuard requireAdmin>
        <AdminDashboardContent />
      </AuthGuard>
    </Suspense>
  )
}
