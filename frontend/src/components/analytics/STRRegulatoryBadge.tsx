'use client'

import React, { useState } from 'react'
import { Shield, ShieldAlert, ShieldCheck, ShieldX, ExternalLink } from 'lucide-react'
import type { STRRegulatory } from '@dealscope/shared/types'

interface STRRegulatoryBadgeProps {
  regulatory: STRRegulatory
  className?: string
}

const RATING_CONFIG: Record<string, {
  label: string
  bg: string
  text: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = {
  Positive: {
    label: 'STR Legal',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    icon: ShieldCheck,
    description: 'Short-term rentals are generally permitted in this area.',
  },
  Neutral: {
    label: 'STR Restrictions',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: Shield,
    description: 'Short-term rentals are allowed with some restrictions.',
  },
  Negative: {
    label: 'STR Limited',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    icon: ShieldAlert,
    description: 'Short-term rentals face significant limitations in this area.',
  },
  Restricted: {
    label: 'STR Restricted',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    icon: ShieldX,
    description: 'Short-term rentals are heavily restricted or banned.',
  },
}

export function STRRegulatoryBadge({ regulatory, className = '' }: STRRegulatoryBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const rating = regulatory.rating || 'Neutral'
  const config = RATING_CONFIG[rating] || RATING_CONFIG.Neutral
  const Icon = config.icon

  return (
    <div className={className}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${config.bg} ${config.text}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
        {regulatory.day_limit && (
          <span className="opacity-75">({regulatory.day_limit} days/yr)</span>
        )}
      </button>

      {expanded && (
        <div className={`mt-2 p-3 rounded-lg text-xs space-y-1.5 ${config.bg}`}>
          <p className={`font-medium ${config.text}`}>{config.description}</p>

          {regulatory.rules_summary && (
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {regulatory.rules_summary}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 dark:text-gray-400">
            {regulatory.permit_fee && (
              <span>Permit: {regulatory.permit_fee}</span>
            )}
            {regulatory.legal_for_occupied && (
              <span>Primary residence: {regulatory.legal_for_occupied}</span>
            )}
          </div>

          {regulatory.rules_source && (
            <a
              href={regulatory.rules_source}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 font-medium ${config.text} hover:underline`}
            >
              <ExternalLink className="w-3 h-3" />
              Official rules
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default STRRegulatoryBadge
