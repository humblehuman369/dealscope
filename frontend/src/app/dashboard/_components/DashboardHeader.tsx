'use client'

import { Search } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'

interface DashboardHeaderProps {
  onSearchClick: () => void
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'there'
  return fullName.trim().split(/\s+/)[0]
}

export function DashboardHeader({ onSearchClick }: DashboardHeaderProps) {
  const { user } = useSession()
  const { isPro } = useSubscription()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-[var(--text-heading)] tracking-tight">
          {getGreeting()},{' '}
          <span className="brand-text-gradient font-bold">{getFirstName(user?.full_name)}</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[var(--text-secondary)]">
          <span>Welcome back to your deal pipeline.</span>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
            style={{
              background: isPro ? 'rgba(15,164,233,0.15)' : 'rgba(148,163,184,0.15)',
              color: isPro ? 'var(--accent-sky)' : 'var(--text-label)',
            }}
          >
            {isPro ? 'Pro' : 'Starter'}
          </span>
        </div>
      </div>
      <button
        onClick={onSearchClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] rounded-lg font-semibold text-sm transition-all"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <Search className="w-4 h-4" />
        Search a Property
      </button>
    </div>
  )
}
