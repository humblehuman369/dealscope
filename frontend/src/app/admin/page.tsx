'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  SlidersHorizontal,
  BookOpen,
  Users,
  ShieldCheck,
} from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { PlatformStatsSection } from '@/features/admin/components/PlatformStats'
import { AdminAssumptionsSection } from '@/features/admin/components/AdminAssumptions'
import { MetricsGlossarySection } from '@/features/admin/components/MetricsGlossary'
import { UserManagementSection } from '@/features/admin/components/UserManagement'

// ===========================================
// Admin Dashboard — Thin Orchestrator
// ===========================================

type AdminTab = 'overview' | 'assumptions' | 'glossary' | 'users'

const tabs: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'assumptions', label: 'Assumptions', icon: SlidersHorizontal },
  { id: 'glossary', label: 'Formula Glossary', icon: BookOpen },
  { id: 'users', label: 'Users', icon: Users },
]

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const { isAdmin, isLoading, isAuthenticated } = useSession()
  const router = useRouter()

  // ── Auth guard ──────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    router.replace('/search')
    return null
  }

  // ── Render ──────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-navy-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Platform configuration, default assumptions, and formula reference
              </p>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
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
