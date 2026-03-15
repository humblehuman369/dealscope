'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react'

// ===========================================
// Saved Properties Error — Semantic Theme
// ===========================================

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SavedPropertiesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Saved properties error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-md w-full">
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] p-8 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[rgba(248,113,113,0.10)] border border-[rgba(248,113,113,0.25)] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[var(--status-negative)]" />
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-heading)] mb-2">
            Unable to Load Properties
          </h1>

          <p className="text-[var(--text-secondary)] mb-6">
            We couldn&apos;t load your saved properties. Your data is not affected.
          </p>

          {/* Dev Error Details */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-3 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-lg text-left">
              <p className="text-xs text-[var(--text-secondary)] break-all" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-[var(--text-label)] mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] font-semibold rounded-lg transition-all"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-body)] font-semibold rounded-lg transition-all"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </a>
          </div>

          <button
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-1 text-sm text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
