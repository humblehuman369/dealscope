'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowLeft, Search } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function VerdictError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Verdict error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="max-w-md w-full">
        <div
          className="rounded-2xl shadow-lg p-8 text-center"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-red-dim)' }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: 'var(--status-negative)' }} />
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
            We couldn&apos;t finish this analysis
          </h1>

          <p className="mb-4 text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-body)' }}>
            The verdict step didn&apos;t complete. That&apos;s usually temporary—a busy server, a network blip, or a
            hiccup with the property lookup.
          </p>

          <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-heading)' }}>What to try:</strong> Retry once or twice. If it keeps
            failing, search again with the full street address (including unit if any), or check your connection. Your
            work isn&apos;t lost until you leave this flow.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div
              className="mb-6 p-3 rounded-lg text-left"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="text-xs font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-colors"
              style={{
                background: 'var(--accent-sky)',
                color: 'var(--text-inverse)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Retry analysis
            </button>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-colors"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-heading)',
              }}
            >
              <Search className="w-4 h-4" />
              New search
            </Link>
          </div>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
