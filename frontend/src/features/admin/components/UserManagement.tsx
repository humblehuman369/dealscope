'use client'

import { useState, useEffect } from 'react'
import { UserCog, Search, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api-client'

// ===========================================
// User Management — Dark Fintech Theme
// ===========================================
// Emerald=active, red=disabled, amber=admin, slate=user
// Table rows use white/2% hover, white/7% dividers
// ===========================================

interface AdminUser {
  id: string
  email: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function UserManagementSection() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get<AdminUser[]>('/api/v1/admin/users?limit=20')
        setUsers(data || [])
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/v1/admin/users/${userId}`, { is_active: !currentStatus })
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_active: !currentStatus } : u
      ))
    } catch (err) {
      console.error('Failed to toggle user:', err)
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-[#0C1220] rounded-xl border border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-amber-400" />
          User Management
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{u.full_name || 'No name'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      u.is_active
                        ? 'bg-emerald-400/10 text-emerald-400'
                        : 'bg-red-400/10 text-red-400'
                    }`}>
                      {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      u.is_superuser
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'bg-white/[0.06] text-slate-300'
                    }`}>
                      {u.is_superuser ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`text-xs font-semibold transition-colors ${
                        u.is_active
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
