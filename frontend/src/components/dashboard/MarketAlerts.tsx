'use client'

import { Activity, Flame, Sun, Snowflake } from 'lucide-react'

interface MarketAlert {
  market: string
  temp: 'Hot' | 'Warm' | 'Neutral' | 'Cold'
  change: string
  trend: 'up' | 'down'
}

interface MarketAlertsProps {
  alerts: MarketAlert[]
  isLoading?: boolean
}

export function MarketAlerts({ alerts, isLoading }: MarketAlertsProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-navy-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-navy-700">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-navy-600"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-navy-600 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-navy-600 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getTempIcon = (temp: string) => {
    switch (temp) {
      case 'Hot': return Flame
      case 'Warm': return Sun
      case 'Neutral': return Sun
      default: return Snowflake
    }
  }

  const getTempColor = (temp: string) => {
    switch (temp) {
      case 'Hot': return 'text-red-500 bg-red-500/10'
      case 'Warm': return 'text-amber-500 bg-amber-500/10'
      case 'Neutral': return 'text-slate-500 bg-slate-100 dark:bg-navy-700'
      default: return 'text-blue-500 bg-blue-500/10'
    }
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Market Pulse</h3>
        </div>
        <button className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300">
          View all
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, i) => {
          const TempIcon = getTempIcon(alert.temp)
          return (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-navy-700/50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTempColor(alert.temp)}`}>
                  <TempIcon size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white">{alert.market}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">{alert.temp} Market</div>
                </div>
              </div>
              <div className={`text-sm font-bold tabular-nums ${
                alert.trend === 'up' ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'
              }`}>
                {alert.change}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
