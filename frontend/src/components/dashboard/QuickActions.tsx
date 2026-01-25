'use client'

import { Search, Calculator, BarChart3, LineChart, TrendingDown } from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  label: string
  description: string
  icon: React.ElementType
  href?: string
  onClick?: () => void
  shortcut?: string
}

interface QuickActionsProps {
  onSearchClick?: () => void
}

export function QuickActions({ onSearchClick }: QuickActionsProps) {
  const actions: QuickAction[] = [
    { 
      label: 'Search Properties', 
      description: 'Find investment opportunities', 
      icon: Search, 
      onClick: onSearchClick,
      shortcut: '⌘S' 
    },
    { 
      label: 'Analyze Deal', 
      description: 'Run numbers on a property', 
      icon: Calculator, 
      href: '/property',
      shortcut: '⌘A' 
    },
    { 
      label: 'Compare Deals', 
      description: 'Side-by-side comparison', 
      icon: BarChart3, 
      href: '/compare',
      shortcut: '⌘C' 
    },
    { 
      label: 'Market Data', 
      description: 'View market intelligence', 
      icon: LineChart, 
      href: '/strategies',
      shortcut: '⌘M' 
    },
    { 
      label: 'Deal Gap', 
      description: 'Buy price vs breakeven', 
      icon: TrendingDown, 
      href: '/deal-gap',
      shortcut: '⌘G' 
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {actions.map((action, i) => {
        const content = (
          <>
            {/* Subtle gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity dark:from-teal-400/[0.05]" />
            
            {/* Icon with ring */}
            <div className="relative mb-4 flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center transition-colors">
                <action.icon size={20} className="text-teal-600 dark:text-teal-400" />
              </div>
              {action.shortcut && (
                <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 group-hover:text-teal-400 transition-colors hidden sm:block">
                  {action.shortcut}
                </span>
              )}
            </div>
            
            {/* Text */}
            <div className="relative">
              <div className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {action.label}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{action.description}</div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 dark:bg-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </>
        )

        if (action.href) {
          return (
            <Link
              key={i}
              href={action.href}
              className="group relative bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-5 text-left overflow-hidden transition-all duration-300 hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/10"
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={i}
            onClick={action.onClick}
            className="group relative bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-5 text-left overflow-hidden transition-all duration-300 hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/10"
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
