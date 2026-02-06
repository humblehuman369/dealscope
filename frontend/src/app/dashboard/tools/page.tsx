'use client'

import Link from 'next/link'
import {
  BarChart3, Calculator, TrendingUp, MapPin,
  Wrench, ChevronRight, Hammer, SlidersHorizontal
} from 'lucide-react'

const tools = [
  {
    title: 'Compare Properties',
    description: 'Side-by-side comparison of saved properties across all investment strategies',
    icon: BarChart3,
    color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600',
    href: '/dashboard/tools/compare',
  },
  {
    title: 'Rehab Estimator',
    description: 'Estimate renovation costs by room and scope of work for accurate deal analysis',
    icon: Hammer,
    color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600',
    href: '/rehab',
  },
  {
    title: 'Rental Comps',
    description: 'Find comparable rental properties in any market to validate rent estimates',
    icon: MapPin,
    color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600',
    href: '/rental-comps',
  },
  {
    title: 'Strategy Worksheets',
    description: 'Detailed financial worksheets for LTR, STR, BRRRR, Flip, House Hack, and Wholesale',
    icon: Calculator,
    color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600',
    href: '/strategies/long-term-rental',
  },
  {
    title: 'Market Data',
    description: 'Local market rental data, vacancy rates, and price trends by ZIP code',
    icon: TrendingUp,
    color: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600',
    href: '/national-averages',
  },
  {
    title: 'Investment Defaults',
    description: 'Configure your default assumptions for financing, operating costs, and strategy parameters',
    icon: SlidersHorizontal,
    color: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400',
    href: '/dashboard/settings',
  },
]

export default function ToolsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Wrench size={20} className="text-teal-500" />
          Investor Tools
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Analysis tools to help you evaluate and compare investment opportunities
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className="flex flex-col p-5 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg hover:shadow-teal-500/5 transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
              <tool.icon size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors mb-1">
              {tool.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
              {tool.description}
            </p>
            <div className="flex items-center gap-1 mt-4 text-xs font-medium text-teal-600">
              Open <ChevronRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
