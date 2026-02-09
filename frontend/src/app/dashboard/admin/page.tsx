'use client'

import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Shield } from 'lucide-react'
import {
  PlatformStatsSection,
  UserManagementSection,
  AdminAssumptionsSection,
  MetricsGlossarySection
} from '@/features/admin'

export default function AdminPage() {
  const { user, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || !user.is_superuser)) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading || !user?.is_superuser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Shield size={20} className="text-amber-500" />
          Administration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Platform management and configuration
        </p>
      </div>

      <div className="space-y-8">
        <PlatformStatsSection />
        <UserManagementSection />
        <AdminAssumptionsSection />
        <MetricsGlossarySection />
      </div>
    </div>
  )
}
