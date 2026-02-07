'use client'

import { User, Save } from 'lucide-react'
import type { AccountFormData } from './types'
import { formatDate } from './types'

interface AccountTabProps {
  user: { email: string; created_at?: string; last_login?: string | null; is_active?: boolean; is_verified?: boolean; full_name?: string } | null
  accountForm: AccountFormData
  setAccountForm: React.Dispatch<React.SetStateAction<AccountFormData>>
  isSaving: boolean
  onSave: () => void
}

export function AccountTab({ user, accountForm, setAccountForm, isSaving, onSave }: AccountTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
        <User className="w-5 h-5 text-brand-500" />
        Account Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={accountForm.full_name}
            onChange={(e) => setAccountForm(prev => ({ ...prev, full_name: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-navy-900 border border-neutral-200 dark:border-neutral-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Contact support to change email</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Member since</p>
          <p className="text-sm font-medium text-navy-900 dark:text-white mt-1">
            {user?.created_at ? formatDate(user.created_at) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Last login</p>
          <p className="text-sm font-medium text-navy-900 dark:text-white mt-1">
            {user?.last_login ? formatDate(user.last_login) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Status</p>
          <p className="text-sm font-medium text-navy-900 dark:text-white mt-1 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {user?.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Email verified</p>
          <p className="text-sm font-medium text-navy-900 dark:text-white mt-1 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${user?.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            {user?.is_verified ? 'Verified' : 'Pending'}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  )
}
