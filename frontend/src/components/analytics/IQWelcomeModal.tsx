'use client'

import React from 'react'
import { IQBrainIcon } from '@/components/icons'

interface IQWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * IQWelcomeModal - Pop-up modal introducing IQ when property analytics loads
 */
export function IQWelcomeModal({ isOpen, onClose }: IQWelcomeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-[#0d1f35] to-[#091525] border border-[#4dd0e1]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-[#4dd0e1]/10">
        {/* IQ Brain Icon */}
        <div className="flex justify-start mb-6">
          <div className="w-12 h-12 rounded-full bg-[#4dd0e1]/10 flex items-center justify-center">
            <IQBrainIcon size={28} mode="dark" />
          </div>
        </div>
        
        {/* Content */}
        <div className="text-left space-y-5">
          <h3 className="text-lg font-bold text-white">
            Hey, I'm IQ — your real estate analyst.
          </h3>
          
          <p className="text-[15px] font-medium text-white/90 leading-relaxed">
            I've analyzed your property against local market data and built 6 investment strategies, each showing a different way to profit.
          </p>
          
          <p className="text-[15px] font-medium text-white/70 italic">
            Explore them all, and ask me anything along the way.
          </p>
        </div>
        
        {/* OK Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-[#4dd0e1] hover:bg-[#5dd8e8] text-[#07172e] font-bold rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
