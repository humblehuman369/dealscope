'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Search } from 'lucide-react'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { Modal } from '@/components/ui/Modal'
import { canonicalizeAddressForIdentity, isLikelyFullAddress } from '@/utils/addressIdentity'

interface TryItNowModalProps {
  isOpen: boolean
  onClose: () => void
  onScanProperty: () => void
}

/**
 * TryItNowModal — landing-page CTA modal that lets visitors choose between
 * camera scan and address entry. Migrated to the shared <Modal> primitive
 * (P2.4); the inner content keeps its existing `.try-modal-*` CSS classes
 * (defined in landing styles) so the visual is unchanged.
 */
export function TryItNowModal({ isOpen, onClose, onScanProperty }: TryItNowModalProps) {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [showAddressInput, setShowAddressInput] = useState(false)
  const hasValidAddress = isLikelyFullAddress(address)

  // Reset internal state on close so reopening starts fresh.
  const handleClose = useCallback(() => {
    onClose()
    setShowAddressInput(false)
    setAddress('')
  }, [onClose])

  const handleScanProperty = () => {
    handleClose()
    onScanProperty()
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasValidAddress) return
    handleClose()
    const canonicalAddress = canonicalizeAddressForIdentity(address)
    router.push(`/discovery?address=${encodeURIComponent(canonicalAddress)}`)
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="md"
      aria-label="How would you like to analyze a property?"
      hideCloseButton
      fullBleed
      panelClassName="try-modal-panel"
    >
      <div className="try-modal">
        {/* Header — IQ icon on left, text on right */}
        <div className="try-modal-header">
          <div className="flex items-center gap-4">
            <div className="try-modal-icon flex-shrink-0">
              {/* Decorative — text label is on the dialog itself via aria-label */}
              <img src="/images/iq-brain-dark.png" alt="" className="try-modal-iq-icon" />
            </div>
            <div>
              <h2 className="try-modal-title leading-tight">
                How would you like to
                <br />
                analyze a property?
              </h2>
              <p className="try-modal-subtitle mt-1">Choose your preferred method to get started</p>
            </div>
          </div>
        </div>

        {/* Options */}
        {!showAddressInput ? (
          <div className="try-modal-options">
            <button type="button" className="try-modal-option" onClick={handleScanProperty}>
              <div className="try-modal-option-icon">
                <Camera size={32} />
              </div>
              <div className="try-modal-option-content">
                <h3 className="try-modal-option-title">Scan Property</h3>
                <p className="try-modal-option-desc">
                  Point your phone camera to scan any property for quick lookup
                </p>
              </div>
            </button>

            <button
              type="button"
              className="try-modal-option"
              onClick={() => setShowAddressInput(true)}
            >
              <div className="try-modal-option-icon">
                <Search size={32} />
              </div>
              <div className="try-modal-option-content">
                <h3 className="try-modal-option-title">Enter Address</h3>
                <p className="try-modal-option-desc">
                  Type or paste any residential address to start
                </p>
              </div>
            </button>
          </div>
        ) : (
          <form className="try-modal-address-form" onSubmit={handleAddressSubmit}>
            <div className="try-modal-input-wrapper">
              <Search size={20} className="try-modal-input-icon" />
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onPlaceSelect={(value) => setAddress(canonicalizeAddressForIdentity(value))}
                placeholder="Enter property address..."
                className="try-modal-input"
                autoFocus
              />
            </div>
            <div className="try-modal-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddressInput(false)
                  setAddress('')
                }}
              >
                Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={!hasValidAddress}>
                Analyze Property
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
