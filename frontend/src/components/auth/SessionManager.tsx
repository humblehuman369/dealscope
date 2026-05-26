'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Monitor, Smartphone, Trash2, Loader2, Shield } from 'lucide-react'
import { authApi, type SessionInfo } from '@/lib/api-client'

function getSessionDevice(session: SessionInfo): { icon: typeof Monitor; label: string } {
  if (session.client_type === 'mobile') {
    return { icon: Smartphone, label: 'Mobile app' }
  }
  return { icon: Monitor, label: 'Desktop / web' }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SessionManager() {
  const queryClient = useQueryClient()

  const { data: sessions, isLoading } = useQuery<SessionInfo[]>({
    queryKey: ['sessions'],
    queryFn: authApi.listSessions,
    staleTime: 30_000,
  })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Your membership includes one mobile app session and one desktop/web session. Signing in on a
        new device replaces the previous session in that same slot.
      </p>

      <div className="space-y-3">
        {sessions?.map((session: SessionInfo) => {
          const { icon: DeviceIcon, label: deviceLabel } = getSessionDevice(session)
          return (
            <div
              key={session.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                session.is_current
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <DeviceIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.device_name || deviceLabel}
                    </span>
                    {session.is_current && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 rounded-full">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.ip_address || 'Unknown IP'} &middot; Last active{' '}
                    {timeAgo(session.last_active_at)}
                  </p>
                </div>
              </div>

              {!session.is_current && (
                <button
                  onClick={() => revokeMutation.mutate(session.id)}
                  disabled={revokeMutation.isPending}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  aria-label="Revoke session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
