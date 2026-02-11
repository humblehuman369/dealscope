'use client'

import { User, Save } from 'lucide-react'
import type { AccountFormData } from './types'
import { formatDate } from './types'

// ===========================================
// Account Tab — Dark Fintech Theme
// ===========================================
// Hierarchy: slate-100 headings, slate-300 labels, slate-400 secondary, slate-500 micro
// Inputs: white/4% bg, white/7% border, sky-400 focus ring
// ===========================================

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
      <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <User className="w-5 h-5 text-sky-400" />
        Account Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={accountForm.full_name}
            onChange={(e) => setAccountForm(prev => ({ ...prev, full_name: e.target.value }))}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
            placeholder="Your full name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 bg-black/40 border border-white/[0.05] rounded-lg text-slate-500 cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-slate-500">Contact support to change email</p>
        </div>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
        <div>
          <p className="text-xs text-slate-500 font-medium">Member since</p>
          <p className="text-sm font-semibold text-slate-100 mt-1 tabular-nums">
            {user?.created_at ? formatDate(user.created_at) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Last login</p>
          <p className="text-sm font-semibold text-slate-100 mt-1 tabular-nums">
            {user?.last_login ? formatDate(user.last_login) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Status</p>
          <p className="text-sm font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {user?.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Email verified</p>
          <p className="text-sm font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${user?.is_verified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {user?.is_verified ? 'Verified' : 'Pending'}
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-sky-500 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  )
}
