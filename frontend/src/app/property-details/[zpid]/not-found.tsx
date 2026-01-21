'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Home, Search, ArrowLeft } from 'lucide-react'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

/**
 * Property Not Found Page
 * 
 * Shown when a property with the given ZPID cannot be found.
 * Opens search modal instead of linking to old search page.
 */
export default function PropertyNotFound() {
  const [showSearchModal, setShowSearchModal] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1426] flex flex-col items-center justify-center p-6 transition-colors">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
          <Home size={40} className="text-slate-400 dark:text-slate-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
          Property Not Found
        </h1>

        {/* Description */}
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          We couldn&apos;t find the property you&apos;re looking for. 
          It may have been removed or the ID may be incorrect.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
          >
            <Search size={18} />
            Search Properties
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
            Go Home
          </Link>
        </div>
      </div>

      {/* Search Modal */}
      <SearchPropertyModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </div>
  )
}
