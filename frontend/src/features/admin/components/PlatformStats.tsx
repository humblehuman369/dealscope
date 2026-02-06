'use client'

import { useState, useEffect } from 'react'
import { Users, Activity, Building2, TrendingUp } from 'lucide-react'
import { getAccessToken } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

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
        const token = getAccessToken()
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
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
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-navy-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  const platformStats = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Active Users', value: stats?.active_users || 0, icon: Activity, color: 'text-green-500' },
    { label: 'Properties Saved', value: stats?.total_properties_saved || 0, icon: Building2, color: 'text-purple-500' },
    { label: 'New Users (30d)', value: stats?.new_users_30d || 0, icon: TrendingUp, color: 'text-orange-500' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {platformStats.map((stat, index) => (
        <div key={index} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-navy-700 rounded-lg">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
