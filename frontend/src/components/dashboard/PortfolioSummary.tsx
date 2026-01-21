'use client'

import { 
  Building2, 
  Wallet, 
  TrendingUp, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase 
} from 'lucide-react'

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

export function PortfolioSummary({ data, isLoading }: PortfolioSummaryProps) {
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
          <h2 className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-1">
            Portfolio Value
          </h2>
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
          <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-navy-700/50">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
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
