'use client'

import { Bell, Palette, Shield } from 'lucide-react'

export function PreferencesTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
        <Bell className="w-5 h-5 text-brand-500" />
        Preferences
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
          <Bell className="w-6 h-6 text-brand-500 mb-2" />
          <p className="font-medium text-navy-900 dark:text-white">Notifications</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
          <Palette className="w-6 h-6 text-brand-500 mb-2" />
          <p className="font-medium text-navy-900 dark:text-white">Appearance</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-navy-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
          <Shield className="w-6 h-6 text-brand-500 mb-2" />
          <p className="font-medium text-navy-900 dark:text-white">Security</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
