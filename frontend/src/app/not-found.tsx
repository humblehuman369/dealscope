'use client'

import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-lg border border-slate-200 dark:border-navy-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-navy-700 flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-slate-500 dark:text-slate-400" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Page not found
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  )
}
