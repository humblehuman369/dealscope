'use client'

import { Clock, TrendingDown, Star, CheckCircle, Flame, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Activity {
  id: string
  type: 'price_drop' | 'new_match' | 'analysis' | 'market' | 'alert'
  property: string
  detail: string
  time: string
}

interface ActivityFeedProps {
  activities: Activity[]
  isLoading?: boolean
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 dark:bg-navy-700 rounded w-28"></div>
          <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-14"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-navy-700"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded w-40"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'price_drop': return TrendingDown
      case 'new_match': return Star
      case 'analysis': return CheckCircle
      case 'market': return Flame
      case 'alert': return AlertCircle
      default: return Clock
    }
  }

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'price_drop': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
      case 'new_match': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      case 'analysis': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'market': return 'bg-red-500/10 text-red-500'
      case 'alert': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      default: return 'bg-slate-100 text-slate-500 dark:bg-navy-700 dark:text-slate-400'
    }
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Recent Activity</h3>
        </div>
        <Link 
          href="/search-history"
          className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300"
        >
          View all
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="py-6 text-center">
          <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            return (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {activity.property}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {activity.detail}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                  {activity.time}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
