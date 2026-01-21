'use client'

import { useState } from 'react'
import { Heart, FileText, Share2, ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

interface ActionBarProps {
  zpid: string
  address: string
  onSave?: () => void
  onShare?: () => void
  onGenerateLOI?: () => void
  isSaved?: boolean
  isSaving?: boolean
}

/**
 * ActionBar Component
 * 
 * Fixed bottom action bar with Save, Generate LOI, and Share buttons.
 * Also includes navigation back to analysis.
 */
export function ActionBar({ 
  zpid, 
  address,
  onSave, 
  onShare, 
  onGenerateLOI,
  isSaved = false,
  isSaving = false
}: ActionBarProps) {
  const [showSearchModal, setShowSearchModal] = useState(false)

  const handleShare = async () => {
    if (onShare) {
      onShare()
      return
    }
    
    // Default share behavior
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Property Details - InvestIQ',
          url: window.location.href
        })
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 z-50 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
        {/* Search New Property */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Search size={18} />
          <span className="text-sm font-medium hidden sm:inline">Search</span>
        </button>

        {/* Save Button */}
        <button 
          onClick={onSave}
          disabled={isSaving || isSaved}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg border transition-colors ${
            isSaved 
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' 
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Heart 
            size={18} 
            className={isSaved ? 'fill-current' : ''} 
          />
          <span className="text-sm font-medium hidden sm:inline">
            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
          </span>
        </button>

        {/* Analyze Property Button - Primary CTA */}
        <Link
          href={`/property?address=${encodeURIComponent(address)}`}
          className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors shadow-sm"
        >
          <FileText size={18} />
          <span className="text-sm font-semibold">Analyze Property</span>
        </Link>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Share2 size={18} />
          <span className="text-sm font-medium hidden sm:inline">Share</span>
        </button>
      </div>
    </div>
    
    {/* Search Modal */}
    <SearchPropertyModal 
      isOpen={showSearchModal} 
      onClose={() => setShowSearchModal(false)} 
    />
    </>
  )
}
