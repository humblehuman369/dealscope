'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Palette, Shield, Mail, Smartphone, TrendingUp, Megaphone } from 'lucide-react'
import { api } from '@/lib/api-client'

// ===========================================
// Preferences Tab — Notifications, Appearance, Security
// ===========================================

interface NotificationPrefs {
  email_deal_alerts: boolean
  email_weekly_digest: boolean
  push_new_analysis: boolean
  push_price_changes: boolean
  marketing_emails: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_deal_alerts: true,
  email_weekly_digest: true,
  push_new_analysis: true,
  push_price_changes: false,
  marketing_emails: false,
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5.5 rounded-full transition-colors shrink-0"
        style={{
          width: 40,
          height: 22,
          background: checked ? '#0ea5e9' : '#334155',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform"
          style={{
            width: 18,
            height: 18,
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  )
}

export function PreferencesTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load preferences from profile
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const profile = await api.get<{
          notification_preferences?: Partial<NotificationPrefs>
          preferred_theme?: string
        }>('/api/v1/users/me/profile')
        if (profile.notification_preferences) {
          setPrefs(prev => ({ ...prev, ...profile.notification_preferences }))
        }
        if (profile.preferred_theme) {
          setTheme(profile.preferred_theme as 'light' | 'dark' | 'system')
        }
      } catch {
        // Use defaults
      }
    }
    loadPrefs()
  }, [])

  // Save preferences
  const savePrefs = useCallback(async (newPrefs: NotificationPrefs, newTheme?: string) => {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch('/api/v1/users/me/profile', {
        notification_preferences: newPrefs,
        ...(newTheme ? { preferred_theme: newTheme } : {}),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Ignore
    } finally {
      setSaving(false)
    }
  }, [])

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    savePrefs(updated)
  }

  const updateTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    savePrefs(prefs, newTheme)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-sky-400" />
          Preferences
        </h3>
        {saving && <span className="text-xs text-slate-500">Saving...</span>}
        {saved && <span className="text-xs text-teal-400">Saved</span>}
      </div>

      {/* Notifications */}
      <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.07]">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-sky-400" />
          <p className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Notifications</p>
        </div>

        <div className="divide-y divide-white/[0.05]">
          <Toggle
            checked={prefs.email_deal_alerts}
            onChange={(v) => updatePref('email_deal_alerts', v)}
            label="Deal Alerts"
            description="Get notified when properties matching your criteria are found"
          />
          <Toggle
            checked={prefs.email_weekly_digest}
            onChange={(v) => updatePref('email_weekly_digest', v)}
            label="Weekly Digest"
            description="Weekly summary of your portfolio performance and new opportunities"
          />
          <Toggle
            checked={prefs.push_new_analysis}
            onChange={(v) => updatePref('push_new_analysis', v)}
            label="Analysis Complete"
            description="Push notification when a property analysis finishes"
          />
          <Toggle
            checked={prefs.push_price_changes}
            onChange={(v) => updatePref('push_price_changes', v)}
            label="Price Change Alerts"
            description="Get notified when saved properties have price changes"
          />
          <Toggle
            checked={prefs.marketing_emails}
            onChange={(v) => updatePref('marketing_emails', v)}
            label="Product Updates"
            description="New features, tips, and RealVestIQ news"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.07]">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-teal-400" />
          <p className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Appearance</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['system', 'dark', 'light'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => updateTheme(opt)}
              className="py-3 px-4 rounded-lg text-sm font-medium transition-all text-center capitalize"
              style={{
                background: theme === opt ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${theme === opt ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.07)'}`,
                color: theme === opt ? '#38bdf8' : '#94a3b8',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.07]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Security</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-200">Password</p>
              <p className="text-xs text-slate-500">Last changed: Never</p>
            </div>
            <a
              href="mailto:support@realvestiq.com?subject=Password%20Reset%20Request"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Request Change
            </a>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-200">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">Add an extra layer of security</p>
            </div>
            <span className="text-xs font-semibold text-slate-600">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}
