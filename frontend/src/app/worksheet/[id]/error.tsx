'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function WorksheetError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Worksheet error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--ws-bg,#f8fafc)] dark:bg-navy-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-lg border border-slate-200 dark:border-navy-700 p-8 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Worksheet Error
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Something went wrong loading or calculating this worksheet. Your saved data is not affected.
          </p>

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-3 bg-slate-100 dark:bg-navy-700 rounded-lg text-left">
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recalculate
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </a>
          </div>

          <button
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
