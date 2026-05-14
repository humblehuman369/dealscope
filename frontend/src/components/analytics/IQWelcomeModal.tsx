'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { IQBrainIcon } from '@/components/icons'

interface IQWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * IQWelcomeModal — pop-up introducing IQ when property analytics loads.
 *
 * Built on the shared <Modal> primitive (P2.4) so focus trap, escape,
 * backdrop click, return-focus and body-scroll-lock are inherited rather
 * than reimplemented. The panel keeps its bespoke gradient + accent border
 * via `panelStyle` so the visual is unchanged from the pre-migration version.
 */
export function IQWelcomeModal({ isOpen, onClose }: IQWelcomeModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      aria-label="Welcome from IQ"
      hideCloseButton
      fullBleed
      panelStyle={{
        background: 'linear-gradient(135deg, #0d1f35 0%, #091525 100%)',
        border: '1px solid rgba(15, 164, 233, 0.30)',
        boxShadow: '0 24px 60px rgba(15, 164, 233, 0.10)',
      }}
    >
      <div className="p-8">
        {/* IQ Brain icon */}
        <div className="flex justify-start mb-6">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-sky)]/10 flex items-center justify-center">
            <IQBrainIcon size={28} mode="dark" />
          </div>
        </div>

        {/* Content */}
        <div className="text-left space-y-5">
          <h3 className="text-lg font-bold text-white">
            Hey, I&apos;m IQ — your real estate analyst.
          </h3>

          <p className="text-[15px] font-medium text-white/90 leading-relaxed">
            I&apos;ve analyzed your property against local market data and built 6 investment
            strategies, each showing a different way to profit.
          </p>

          <p className="text-[15px] font-medium text-white/70 italic">
            Explore them all, I&apos;ll be here to guide you.
          </p>
        </div>

        {/* OK button */}
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-[var(--accent-sky)] hover:bg-[#5dd8e8] text-[#07172e] font-bold rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  )
}
