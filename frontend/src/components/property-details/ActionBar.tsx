'use client'

import { useState } from 'react'
import { Heart, FileText, Share2, ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

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
 * Fixed bottom action bar. CTA uses deep sky blue with glow shadow.
 * Secondary actions use 7% white border pills.
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

  const secondaryButtonStyle = {
    border: `1px solid ${colors.ui.border}`,
    color: colors.text.body,
  }

  return (
    <>
    <div
      className="fixed bottom-0 left-0 right-0 py-4 px-6 z-50 backdrop-blur-xl"
      style={{
        backgroundColor: 'rgba(12,18,32,0.95)',
        borderTop: `1px solid ${colors.ui.border}`,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
        {/* Search New Property */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors hover:bg-white/5"
          style={secondaryButtonStyle}
        >
          <Search size={18} />
          <span className="text-sm font-medium hidden sm:inline">Search</span>
        </button>

        {/* Save Button */}
        <button 
          onClick={onSave}
          disabled={isSaving || isSaved}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors hover:bg-white/5 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={
            isSaved
              ? { border: `1px solid ${colors.brand.blue}`, backgroundColor: colors.accentBg.blue, color: colors.brand.blue }
              : secondaryButtonStyle
          }
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
          className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full text-white font-bold transition-all hover:brightness-110"
          style={{
            backgroundColor: colors.brand.blueDeep,
            boxShadow: colors.shadow.ctaBtn,
          }}
        >
          <FileText size={18} />
          <span className="text-sm font-bold">Analyze Property</span>
        </Link>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors hover:bg-white/5"
          style={secondaryButtonStyle}
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
