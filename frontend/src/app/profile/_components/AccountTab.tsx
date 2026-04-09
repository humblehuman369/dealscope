'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Save, Trash2, AlertTriangle } from 'lucide-react'
import { apiRequest } from '@/lib/api-client'
import type { AccountFormData } from './types'
import { formatDate } from './types'

interface AccountTabProps {
  user: { email: string; created_at?: string; last_login?: string | null; is_active?: boolean; is_verified?: boolean; full_name?: string | null } | null
  accountForm: AccountFormData
  setAccountForm: React.Dispatch<React.SetStateAction<AccountFormData>>
  isSaving: boolean
  onSave: () => void
}

export function AccountTab({ user, accountForm, setAccountForm, isSaving, onSave }: AccountTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--text-heading)] flex items-center gap-2">
        <User className="w-5 h-5 text-[var(--accent-sky)]" />
        Account Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={accountForm.full_name}
            onChange={(e) => setAccountForm(prev => ({ ...prev, full_name: e.target.value }))}
            className="w-full px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)] transition-colors"
            placeholder="Your full name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-label)] cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-[var(--text-label)]">Contact support to change email</p>
        </div>
      </div>

      {/* Account Stats */}
      <div className="relative isolate">
        <div
          className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl blur-xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 20%, rgba(56, 189, 248, 0.2), rgba(56, 189, 248, 0) 72%)',
          }}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)]">
          <div>
            <p className="text-xs text-[var(--text-label)] font-medium">Member since</p>
            <p className="text-sm font-semibold text-[var(--text-heading)] mt-1 tabular-nums">
              {user?.created_at ? formatDate(user.created_at) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-label)] font-medium">Last login</p>
            <p className="text-sm font-semibold text-[var(--text-heading)] mt-1 tabular-nums">
              {user?.last_login ? formatDate(user.last_login) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-label)] font-medium">Status</p>
            <p className="text-sm font-semibold text-[var(--text-heading)] mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-[var(--status-positive)]' : 'bg-[var(--status-negative)]'}`} />
              {user?.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-label)] font-medium">Email verified</p>
            <p className="text-sm font-semibold text-[var(--text-heading)] mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${user?.is_verified ? 'bg-[var(--status-positive)]' : 'bg-[var(--status-warning)]'}`} />
              {user?.is_verified ? 'Verified' : 'Pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-[var(--accent-sky)]"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-[var(--text-inverse)] border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <DeleteAccountSection />
    </div>
  )
}


function DeleteAccountSection() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return
    setIsDeleting(true)
    setError(null)
    try {
      await apiRequest('/api/v1/users/me', { method: 'DELETE' })
      router.replace('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-[var(--border-subtle)]">
      <h3 className="text-lg font-semibold text-[var(--status-negative)] flex items-center gap-2 mb-2">
        <Trash2 className="w-5 h-5" />
        Delete Account
      </h3>
      <p className="text-sm text-[var(--text-label)] mb-4">
        Permanently delete your account and all associated data including saved properties,
        search history, and profile information. This action cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
          style={{
            color: 'var(--status-negative)',
            borderColor: 'var(--status-negative)',
            background: 'transparent',
          }}
        >
          Delete My Account
        </button>
      ) : (
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--status-negative)', background: 'rgba(239,68,68,0.05)' }}>
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--status-negative)' }} />
            <div>
              <p className="text-sm font-semibold text-[var(--text-heading)] mb-1">
                Are you sure? This is permanent.
              </p>
              <p className="text-sm text-[var(--text-label)]">
                Type <strong className="text-[var(--text-heading)]">DELETE</strong> below to confirm.
              </p>
            </div>
          </div>

          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="w-full px-4 py-2.5 mb-3 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50"
          />

          {error && (
            <p className="text-sm mb-3" style={{ color: 'var(--status-negative)' }}>{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: 'var(--status-negative)' }}
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
              className="px-4 py-2 text-sm font-medium text-[var(--text-label)] hover:text-[var(--text-heading)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
