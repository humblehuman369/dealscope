'use client'

import React from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ContinueWorkflowBannerProps {
  /** Most recent property address or deal name */
  lastProperty?: string
  /** Route to resume (e.g. /deal-maker/123-Main-St or /worksheet/abc) */
  resumeHref?: string
  /** Optional label override */
  label?: string
}

/**
 * ContinueWorkflowBanner
 *
 * Shows a prominent, dismissible banner encouraging the user to resume
 * their last in-progress analysis. Placed on Dashboard and Saved Properties.
 */
export function ContinueWorkflowBanner({
  lastProperty = 'your last property',
  resumeHref = '/saved-properties',
  label = 'Resume analysis',
}: ContinueWorkflowBannerProps) {
  const router = useRouter()

  return (
    <div className="mb-6 rounded-2xl border border-[var(--accent-sky)]/30 bg-[var(--surface-elevated)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-sky)]/10">
          <Clock className="h-4 w-4 text-[var(--accent-sky)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-heading)]">
            Continue where you left off
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {lastProperty}
          </p>
        </div>
      </div>

      <button
        onClick={() => router.push(resumeHref)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-sky)] px-5 py-2 text-sm font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--accent-sky)]/90"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
