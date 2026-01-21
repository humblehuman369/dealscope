'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

/**
 * Search Page
 * 
 * This page automatically opens the search modal.
 * Used for direct navigation to /search or when linked from external sources.
 */
export default function SearchPage() {
  const [showModal, setShowModal] = useState(true)
  const router = useRouter()

  const handleClose = () => {
    setShowModal(false)
    // Navigate back or to home when modal is closed
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a12] transition-colors">
      <SearchPropertyModal isOpen={showModal} onClose={handleClose} />
    </div>
  )
}
