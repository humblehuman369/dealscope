'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { TasksSlideOver } from '@/components/tasks/TasksSlideOver'
import { markDashboardVisited } from '@/lib/dashboardLanding'
import type { PropertyStatus } from '@/types/savedProperty'

import { DashboardHeader } from './_components/DashboardHeader'
import { PipelineStats } from './_components/PipelineStats'
import { PipelineKanban } from './_components/PipelineKanban'
import { RecentSearches } from './_components/RecentSearches'
import { AccountSnapshot } from './_components/AccountSnapshot'
import { UpcomingTasks } from './_components/UpcomingTasks'

/** Slide-over target shared by the kanban and "Due this week" widget. */
export interface SlideOverTarget {
  id: string
  title: string
  stageLabel: string | null
}

function DashboardContent() {
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [highlightStage, setHighlightStage] = useState<PropertyStatus | null>(null)
  // Slide-over lives at the page level so the kanban card task badges and the
  // "Due this week" widget can both open it. ``null`` = closed.
  const [slideOverTarget, setSlideOverTarget] = useState<SlideOverTarget | null>(null)

  // Stamp today's visit so the once-per-day landing redirect won't fire again.
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
        <PipelineStats
          activeStage={highlightStage}
          onSelectStage={setHighlightStage}
        />

        {/* What needs attention this week, across every property. */}
        <UpcomingTasks onOpen={setSlideOverTarget} />

        {/* The centerpiece — Saved Properties Kanban (pre-purchase lead funnel) */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-3">
            Lead Pipeline
          </h2>
          <PipelineKanban
            highlightStage={highlightStage}
            onEmptyAction={() => setShowSearchModal(true)}
            onOpenTasks={setSlideOverTarget}
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

      <TasksSlideOver
        propertyId={slideOverTarget?.id ?? null}
        propertyTitle={slideOverTarget?.title ?? ''}
        stageLabel={slideOverTarget?.stageLabel ?? null}
        open={slideOverTarget !== null}
        onClose={() => setSlideOverTarget(null)}
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
