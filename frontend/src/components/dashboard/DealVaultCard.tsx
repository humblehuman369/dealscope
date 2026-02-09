'use client'

import type { LucideIcon } from 'lucide-react'

interface DealVaultCardProps {
  icon: LucideIcon
  title: string
  description: string
  color: 'teal' | 'blue' | 'purple' | 'amber'
}

const colorMap = {
  teal:   { bg: 'bg-teal-100 dark:bg-teal-900/30',   text: 'text-teal-600 dark:text-teal-400',   border: 'border-teal-200 dark:border-teal-800' },
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-200 dark:border-blue-800' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  amber:  { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
}

export function DealVaultCard({ icon: Icon, title, description, color }: DealVaultCardProps) {
  const c = colorMap[color]

  return (
    <div className={`relative bg-white dark:bg-navy-900 rounded-xl border ${c.border} p-5 overflow-hidden`}>
      {/* Coming Soon badge */}
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Coming Soon
        </span>
      </div>

      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg} mb-3`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}
