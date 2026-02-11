'use client'

import { useState, useEffect } from 'react'
import { Users, Activity, Building2, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api-client'

// ===========================================
// Platform Stats — Dark Fintech Theme
// ===========================================
// Semantic stat colors: sky=total, emerald=active, teal=saved, amber=growth
// ===========================================

interface PlatformStats {
  total_users: number
  active_users: number
  total_properties_saved: number
  new_users_30d: number
}

export function PlatformStatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<PlatformStats>('/api/v1/admin/stats')
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch platform stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['bg-sky-400/5', 'bg-emerald-400/5', 'bg-teal-400/5', 'bg-amber-400/5'].map((tint, i) => (
          <div key={i} className="bg-[#0C1220] rounded-xl border border-white/[0.07] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${tint} rounded-lg animate-pulse`} />
              <div>
                <div className="h-7 w-12 bg-white/[0.05] rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-white/[0.03] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const platformStats = [
    { label: 'Total Users',       value: stats?.total_users || 0,             icon: Users,     iconBg: 'bg-sky-400/10',     iconColor: 'text-sky-400'     },
    { label: 'Active Users',      value: stats?.active_users || 0,            icon: Activity,  iconBg: 'bg-emerald-400/10', iconColor: 'text-emerald-400' },
    { label: 'Properties Saved',  value: stats?.total_properties_saved || 0,  icon: Building2, iconBg: 'bg-teal-400/10',    iconColor: 'text-teal-400'    },
    { label: 'New Users (30d)',   value: stats?.new_users_30d || 0,           icon: TrendingUp,iconBg: 'bg-amber-400/10',   iconColor: 'text-amber-400'   },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {platformStats.map((stat, index) => (
        <div key={index} className="bg-[#0C1220] rounded-xl border border-white/[0.07] p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${stat.iconBg} rounded-lg`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100 tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
