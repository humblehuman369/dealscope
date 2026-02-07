'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function OnboardingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Onboarding error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-lg border border-slate-200 dark:border-navy-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Setup Error
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Something went wrong during setup. You can try again or skip to the dashboard.
          </p>

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

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Skip to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
