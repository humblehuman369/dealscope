'use client'

import { Bell, Palette, Shield } from 'lucide-react'

// ===========================================
// Preferences Tab — Dark Fintech Theme
// ===========================================

export function PreferencesTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <Bell className="w-5 h-5 text-sky-400" />
        Preferences
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.07] hover:border-white/[0.12] transition-colors group">
          <Bell className="w-6 h-6 text-sky-400 mb-3" />
          <p className="font-semibold text-slate-100">Notifications</p>
          <p className="text-sm text-slate-500 mt-1">Coming soon</p>
        </div>

        <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.07] hover:border-white/[0.12] transition-colors group">
          <Palette className="w-6 h-6 text-teal-400 mb-3" />
          <p className="font-semibold text-slate-100">Appearance</p>
          <p className="text-sm text-slate-500 mt-1">Coming soon</p>
        </div>

        <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.07] hover:border-white/[0.12] transition-colors group">
          <Shield className="w-6 h-6 text-amber-400 mb-3" />
          <p className="font-semibold text-slate-100">Security</p>
          <p className="text-sm text-slate-500 mt-1">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
