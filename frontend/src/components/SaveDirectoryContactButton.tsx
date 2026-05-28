'use client'

import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import { useAppPathname, useAppSearchParams } from '@/hooks/useAppNavigation'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useSaveDirectoryContact } from '@/hooks/useSaveDirectoryContact'
import type {
  DirectoryContactSnapshot,
  DirectoryEntityType,
} from '@/types/savedDirectoryContact'

const colors = {
  brand: { tealBright: 'var(--accent-sky)' },
  text: { tertiary: '#64748B' },
}

export interface SaveDirectoryContactButtonProps {
  entityType: DirectoryEntityType
  entityId: number
  snapshot: DirectoryContactSnapshot
  compact?: boolean
  className?: string
  /** Called when click is blocked because user lacks Paid Pro */
  onUpgradeRequired?: () => void
}

export function SaveDirectoryContactButton({
  entityType,
  entityId,
  snapshot,
  compact = true,
  className = '',
  onUpgradeRequired,
}: SaveDirectoryContactButtonProps) {
  const pathname = useAppPathname()
  const searchParams = useAppSearchParams()
  const { isAuthenticated } = useSession()
  const { isPaidPro } = useSubscription()
  const { isSaved, isSaving, toggle } = useSaveDirectoryContact({
    entityType,
    entityId,
    snapshot,
  })

  if (!entityId) return null

  const signInUrl = (() => {
    const p = new URLSearchParams(searchParams?.toString() ?? '')
    p.set('auth', 'required')
    const fullPath = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname || '/'
    p.set('redirect', fullPath)
    return `${pathname || '/'}?${p.toString()}`
  })()

  const label = entityType === 'lender' ? 'lender' : 'buyer'

  if (!isAuthenticated) {
    return (
      <Link
        href={signInUrl}
        className={`inline-flex items-center gap-1.5 rounded transition-colors hover:opacity-90 ${className}`}
        title={`Sign in to save ${label}`}
        aria-label={`Sign in to save ${label}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Bookmark className="w-4 h-4" style={{ color: colors.text.tertiary }} />
        {!compact && (
          <span className="text-xs font-medium" style={{ color: colors.text.tertiary }}>
            Save
          </span>
        )}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!isPaidPro) {
          onUpgradeRequired?.()
          return
        }
        toggle().catch(() => {})
      }}
      disabled={isSaving}
      className={`inline-flex items-center gap-1.5 rounded transition-all p-1.5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isSaved ? `Saved — click to remove ${label}` : `Save ${label}`}
      aria-label={isSaved ? `Unsave ${label}` : `Save ${label}`}
      aria-pressed={isSaved}
    >
      <Bookmark
        className={`w-4 h-4 transition-colors ${isSaved ? 'fill-current' : ''}`}
        style={{ color: isSaved ? colors.brand.tealBright : colors.text.tertiary }}
      />
      {!compact && (
        <span
          className="text-xs font-medium"
          style={{ color: isSaved ? colors.brand.tealBright : colors.text.tertiary }}
        >
          {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  )
}
