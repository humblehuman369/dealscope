'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { markDashboardVisited } from '@/lib/dashboardLanding'
import type { PropertyStatus } from '@/types/savedProperty'

import { DashboardHeader } from './_components/DashboardHeader'
import { PipelineStats } from './_components/PipelineStats'
import { PipelineKanban } from './_components/PipelineKanban'
import { RecentSearches } from './_components/RecentSearches'
import { AccountSnapshot } from './_components/AccountSnapshot'
import { UpcomingTasks } from './_components/UpcomingTasks'

function DashboardContent() {
  const router = useRouter()
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [highlightStage, setHighlightStage] = useState<PropertyStatus | null>(null)

  useEffect(() => {
    markDashboardVisited()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8 grid-fade">
      <div className="max-w-6xl mx-auto">
        <div className="soft-panel rounded-3xl p-6 sm:p-8 mb-8 border border-[var(--border-subtle)]">
          <DashboardHeader onSearchClick={() => setShowSearchModal(true)} />
        </div>

        {/* Pipeline stats — clickable filters that highlight the kanban column */}
        <PipelineStats activeStage={highlightStage} onSelectStage={setHighlightStage} />

        {/* "Due this week" cross-property roll-up — clicking a row jumps to the
            Tasks tab on the deal workflow page. */}
        <UpcomingTasks
          onOpen={(target) => router.push(`/deals/${target.id}?tab=tasks`)}
        />

        {/* The centerpiece — Saved Properties Kanban (pre-purchase + post-purchase). */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-3">
            Pipeline
          </h2>
          <PipelineKanban
            highlightStage={highlightStage}
            onEmptyAction={() => setShowSearchModal(true)}
          />
        </section>

        {/* Two-column lower section: Recent Searches + Account */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentSearches />
          <AccountSnapshot />
        </div>
      </div>

      <SearchPropertyModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
