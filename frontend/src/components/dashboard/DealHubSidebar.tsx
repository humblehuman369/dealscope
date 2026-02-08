'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Settings, Shield, ChevronLeft, ChevronRight, X, LogOut
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { useSession, useLogout } from '@/hooks/useSession'

interface SidebarProps {
  isAdmin?: boolean
  userName?: string | null
  userEmail?: string
}

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Profile & preferences' },
]

const adminItem = { label: 'Admin', href: '/dashboard/admin', icon: Shield, description: 'User & system management', permission: 'admin:users' }

export function DealHubSidebar({ isAdmin, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const logoutMutation = useLogout()
  const { hasPermission } = useSession()

  const isActive = useCallback((href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }, [pathname])

  const items = [...navItems]
  if (isAdmin || hasPermission('admin:users')) {
    items.push(adminItem)
  }

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / brand */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-navy-700">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-bold text-slate-800 dark:text-white">
            DealHub<span className="text-teal-500">IQ</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Dashboard navigation">
        {items.map((item) => {
          const active = isActive(item.href, 'exact' in item ? item.exact : false)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-slate-200 dark:border-navy-700 p-3">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{userName || 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 transition-all ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-navy-900 rounded-lg shadow-lg border border-slate-200 dark:border-navy-700"
        aria-label="Open menu"
      >
        <LayoutDashboard className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-72 h-full bg-white dark:bg-navy-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
