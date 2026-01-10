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
      <div className="relative bg-gradient-to-br from-[#0d1f35] to-[#091525] border border-[#4dd0e1]/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-[#4dd0e1]/10">
        {/* IQ Brain Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-[#4dd0e1]/10 flex items-center justify-center">
            <IQBrainIcon size={32} mode="dark" />
          </div>
        </div>
        
        {/* Content */}
        <div className="text-center space-y-4">
          <h3 className="text-lg font-bold text-white">
            Hey, I'm IQ — your real estate analyst.
          </h3>
          
          <p className="text-[15px] text-white/80 leading-relaxed">
            I've analyzed your property against local market data and built 6 investment strategies, each showing a different way to profit.
          </p>
          
          <p className="text-sm text-white/60 italic">
            Explore them all, and ask me anything along the way.
          </p>
        </div>
        
        {/* OK Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-[#4dd0e1] hover:bg-[#5dd8e8] text-[#07172e] font-bold rounded-xl transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  )
}
