'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BillingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Billing error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[var(--surface-card)] rounded-2xl shadow-lg border border-[var(--border-default)] p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[rgba(248,113,113,0.10)] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[var(--status-negative)]" />
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-heading)] mb-2">
            Billing Error
          </h1>

          <p className="text-[var(--text-secondary)] mb-6">
            We couldn&apos;t load your billing information. Your subscription is not affected.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-3 bg-[var(--surface-elevated)] rounded-lg text-left">
              <p className="text-xs font-mono text-[var(--text-secondary)] break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono text-[var(--text-label)] mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card-hover)] text-[var(--text-body)] font-medium rounded-lg transition-colors border border-[var(--border-default)]"
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
