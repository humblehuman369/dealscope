'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  Settings, User, CreditCard, SlidersHorizontal,
  Bell, Palette, ChevronRight, ExternalLink
} from 'lucide-react'

const settingsLinks = [
  {
    title: 'Profile & Account',
    description: 'Update your name, email, business info, and investor profile',
    icon: User,
    color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600',
    href: '/profile',
  },
  {
    title: 'Investment Defaults',
    description: 'Configure your default financing, operating cost, and strategy assumptions',
    icon: SlidersHorizontal,
    color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600',
    href: '/profile#assumptions',
  },
  {
    title: 'Billing & Subscription',
    description: 'Manage your subscription plan, payment methods, and usage',
    icon: CreditCard,
    color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600',
    href: '/billing',
  },
]

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Settings size={20} className="text-teal-500" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account, preferences, and investment defaults
        </p>
      </div>

      {/* User card */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">{user?.full_name || 'Investor'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Settings Links */}
      <div className="space-y-3">
        {settingsLinks.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="flex items-center justify-between px-5 py-4 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center flex-shrink-0`}>
                <link.icon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">{link.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{link.description}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
