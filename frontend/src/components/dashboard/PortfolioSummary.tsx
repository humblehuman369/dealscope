'use client'

import { 
  Building2, 
  Wallet, 
  TrendingUp, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
  Search,
  Sparkles,
  CheckCircle,
  Database
} from 'lucide-react'
import Link from 'next/link'

interface PortfolioData {
  portfolioValue: number
  portfolioChange: number
  propertiesTracked: number
  totalEquity: number
  monthlyCashFlow: number
  avgCoC: number
}

interface PortfolioSummaryProps {
  data: PortfolioData
  isLoading?: boolean
  onViewSample?: () => void
}

const formatCurrency = (value: number): string => {
  if (!value && value !== 0) return '$0'
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function PortfolioSummary({ data, isLoading, onViewSample }: PortfolioSummaryProps) {
  // Check if portfolio is empty (all values are 0)
  const isEmpty = data.portfolioValue === 0 && data.propertiesTracked === 0 && data.monthlyCashFlow === 0

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-navy-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-navy-700">
              <div className="h-4 bg-gray-200 dark:bg-navy-600 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-navy-600 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state with aspirational content
  if (isEmpty) {
    return (
      <div className="bg-gradient-to-br from-teal-500/5 to-cyan-500/5 dark:from-navy-800 dark:to-navy-900 rounded-xl shadow-sm border border-teal-200/50 dark:border-navy-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-teal-500" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Your Portfolio Starts Here</h3>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Analyze properties to build your investment portfolio and track your real estate wealth.
        </p>

        {/* Value Propositions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-navy-700/50">
            <CheckCircle size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-white">Track Equity</div>
              <div className="text-[10px] text-slate-500">Monitor property value growth</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-navy-700/50">
            <CheckCircle size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-white">Cash Flow Analysis</div>
              <div className="text-[10px] text-slate-500">See monthly income potential</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-navy-700/50">
            <CheckCircle size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-white">Return Metrics</div>
              <div className="text-[10px] text-slate-500">Compare CoC across deals</div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/property"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors"
          >
            <Search size={16} />
            Analyze a Property
          </Link>
          {onViewSample && (
            <button 
              onClick={onViewSample}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-teal-500/30 text-teal-600 dark:text-teal-400 text-sm font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-400/20 text-amber-600 dark:text-amber-400 rounded">Demo</span>
              View Sample Dashboard
            </button>
          )}
        </div>

        {/* Data Sources */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/50 dark:border-navy-600">
          <Database size={12} className="text-slate-400" />
          <span className="text-[10px] text-slate-400">
            Powered by Zillow API, county records & rental market data
          </span>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Properties', value: String(data.propertiesTracked), icon: Building2, color: 'text-slate-700 dark:text-slate-300' },
    { label: 'Total Equity', value: formatCurrency(data.totalEquity), icon: Wallet, color: 'text-teal-600 dark:text-teal-400' },
    { label: 'Monthly Cash Flow', value: formatCurrency(data.monthlyCashFlow), icon: TrendingUp, color: 'text-teal-600 dark:text-teal-400' },
    { label: 'Avg. CoC Return', value: `${data.avgCoC}%`, icon: Percent, color: 'text-teal-600 dark:text-teal-400' },
  ]

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={16} className="text-teal-500 dark:text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Portfolio Value</h3>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums">
              {formatCurrency(data.portfolioValue)}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              data.portfolioChange >= 0 
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {data.portfolioChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {data.portfolioChange >= 0 ? '+' : ''}{data.portfolioChange}% YTD
            </div>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
          <Briefcase size={24} className="text-teal-600 dark:text-teal-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-navy-700/50 border border-slate-100 dark:border-navy-600">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className="text-teal-500 dark:text-teal-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {stat.label}
              </span>
            </div>
            <div className={`text-lg font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
