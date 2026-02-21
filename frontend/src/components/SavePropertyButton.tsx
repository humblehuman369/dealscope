'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useSaveProperty, type PropertySnapshot } from '@/hooks/useSaveProperty'

const colors = {
  brand: { tealBright: '#0891B2' },
  text: { tertiary: '#64748B' },
}

export interface SavePropertyButtonProps {
  /** Full display address */
  displayAddress: string
  /** Optional snapshot for save payload */
  propertySnapshot?: PropertySnapshot | null
  /** Optional: compact icon-only style (default true for nav) */
  compact?: boolean
  /** Optional: class name for the button/link wrapper */
  className?: string
}

export function SavePropertyButton({
  displayAddress,
  propertySnapshot,
  compact = true,
  className = '',
}: SavePropertyButtonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useSession()
  const { isSaved, isSaving, toggle } = useSaveProperty({
    displayAddress,
    propertySnapshot,
  })

  if (!displayAddress) return null

  const signInUrl = (() => {
    const p = new URLSearchParams(searchParams?.toString() ?? '')
    p.set('auth', 'required')
    const fullPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname || '/'
    p.set('redirect', fullPath)
    return `${pathname || '/'}?${p.toString()}`
  })()

  if (!isAuthenticated) {
    return (
      <Link
        href={signInUrl}
        className={`inline-flex items-center gap-1.5 rounded transition-colors hover:opacity-90 ${className}`}
        title="Sign in to save property"
        aria-label="Sign in to save property"
      >
        <Bookmark className="w-4 h-4" style={{ color: colors.text.tertiary }} />
        {!compact && <span className="text-xs font-medium" style={{ color: colors.text.tertiary }}>Save</span>}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => toggle()}
      disabled={isSaving}
      className={`inline-flex items-center gap-1.5 rounded transition-all p-1.5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isSaved ? 'Saved — click to remove' : 'Save property'}
      aria-label={isSaved ? 'Unsave property' : 'Save property'}
    >
      <Bookmark
        className={`w-4 h-4 transition-colors ${isSaved ? 'fill-current' : ''}`}
        style={{ color: isSaved ? colors.brand.tealBright : colors.text.tertiary }}
      />
      {!compact && (
        <span className="text-xs font-medium" style={{ color: isSaved ? colors.brand.tealBright : colors.text.tertiary }}>
          {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  )
}
