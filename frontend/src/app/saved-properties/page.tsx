'use client'

/**
 * Recent Searches & Saved Properties — unified two-tab page.
 *
 * Phase 15 collapses what used to be /search-history and /saved-properties
 * (and the dashboard's RecentSearches widget) into a single page with
 * tab persistence via ``?tab=``. ``saved`` is the default; ``recent``
 * shows the search-history view.
 */

import { Suspense, useState } from 'react'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { useRouter } from 'next/navigation'
import { Bookmark, History, Search } from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { SavedPropertiesPanel } from './_components/SavedPropertiesPanel'
import { RecentSearchesPanel } from './_components/RecentSearchesPanel'

type Tab = 'saved' | 'recent'

function PageContent() {
  const router = useRouter()
  const searchParams = useAppSearchParams()
  const tabParam = (searchParams.get('tab') ?? 'saved') as Tab
  const tab: Tab = tabParam === 'recent' ? 'recent' : 'saved'
  const [showSearchModal, setShowSearchModal] = useState(false)

  function setTab(next: Tab) {
    const sp = new URLSearchParams(searchParams.toString())
    if (next === 'saved') sp.delete('tab')
    else sp.set('tab', next)
    const qs = sp.toString()
    router.replace(`/saved-properties${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-heading)] tracking-tight flex items-center gap-3">
              <Bookmark className="w-7 h-7 text-[var(--accent-sky)]" />
              Recent Searches &amp; Saved Properties
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Everything you&apos;ve looked at and everything you&apos;ve kept, in one place.
            </p>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] rounded-lg font-semibold text-sm transition-all"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <Search className="w-4 h-4" />
            Search New Property
          </button>
        </div>

        {/* Tab nav */}
        <nav
          className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border-default)]"
          aria-label="Recent Searches & Saved Properties tabs"
        >
          <TabButton
            active={tab === 'saved'}
            onClick={() => setTab('saved')}
            icon={<Bookmark className="w-3.5 h-3.5" />}
          >
            Saved Properties
          </TabButton>
          <TabButton
            active={tab === 'recent'}
            onClick={() => setTab('recent')}
            icon={<History className="w-3.5 h-3.5" />}
          >
            Recent Searches
          </TabButton>
        </nav>

        {tab === 'saved' ? (
          <SavedPropertiesPanel onOpenSearchModal={() => setShowSearchModal(true)} />
        ) : (
          <RecentSearchesPanel onOpenSearchModal={() => setShowSearchModal(true)} />
        )}
      </div>

      <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'text-[var(--accent-sky)] border-[var(--accent-sky)]'
          : 'text-[var(--text-label)] border-transparent hover:text-[var(--text-body)]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

export default function SavedPropertiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-sky)]" />
        </div>
      }
    >
      <AuthGuard>
        <PageContent />
      </AuthGuard>
    </Suspense>
  )
}
