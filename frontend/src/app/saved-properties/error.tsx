'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react'

// ===========================================
// Saved Properties Error — Dark Fintech Theme
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
      className="min-h-screen bg-black flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-md w-full">
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] p-8 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            Unable to Load Properties
          </h1>

          <p className="text-slate-400 mb-6">
            We couldn&apos;t load your saved properties. Your data is not affected.
          </p>

          {/* Dev Error Details */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-3 bg-white/[0.04] border border-white/[0.07] rounded-lg text-left">
              <p className="text-xs text-slate-400 break-all" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-slate-500 mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-all hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] text-slate-300 font-semibold rounded-lg transition-all"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </a>
          </div>

          <button
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
