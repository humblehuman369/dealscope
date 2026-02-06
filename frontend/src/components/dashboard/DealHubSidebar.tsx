'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Building2, Wrench, FileBarChart, 
  Settings, Shield, ChevronLeft, ChevronRight, Search,
  X
} from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  isAdmin?: boolean
  userName?: string
  userEmail?: string
}

const navItems = [
  { 
    label: 'Overview', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    label: 'Properties', 
    href: '/dashboard/properties', 
    icon: Building2,
    description: 'Search history & saved deals'
  },
  { 
    label: 'Tools', 
    href: '/dashboard/tools', 
    icon: Wrench,
    description: 'Compare, analyze & estimate'
  },
  { 
    label: 'Reports', 
    href: '/dashboard/reports', 
    icon: FileBarChart,
    description: 'Exports & generated reports'
  },
  { 
    label: 'Settings', 
    href: '/dashboard/settings', 
    icon: Settings,
    description: 'Profile & assumptions'
  },
]

export function DealHubSidebar({ isAdmin, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-200 dark:border-navy-700">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Building2 size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                DealHub<span className="text-teal-500">IQ</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Investor Workspace</p>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2">
          <Link 
            href="/dashboard/properties"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-400 dark:text-slate-500 text-sm hover:bg-slate-200 dark:hover:bg-navy-700 transition-colors"
          >
            <Search size={14} />
            <span>Search properties...</span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${active 
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className={active ? 'text-teal-500' : ''} />
              {!collapsed && (
                <span>{item.label}</span>
              )}
            </Link>
          )
        })}

        {/* Admin link */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-200 dark:border-navy-700" />
            <Link
              href="/dashboard/admin"
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive('/dashboard/admin')
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white'
                }
              `}
              title={collapsed ? 'Admin' : undefined}
            >
              <Shield size={18} className={isActive('/dashboard/admin') ? 'text-amber-500' : ''} />
              {!collapsed && <span>Admin</span>}
            </Link>
          </>
        )}
      </nav>

      {/* User info & collapse toggle */}
      <div className="border-t border-slate-200 dark:border-navy-700 p-3">
        {!collapsed && userName && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{userName}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-teal-600 text-white shadow-lg shadow-teal-500/30 flex items-center justify-center hover:bg-teal-700 transition-colors"
      >
        <Building2 size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`
        lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-700 
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <button 
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`
        hidden lg:flex flex-col flex-shrink-0 bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-700
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
        {sidebarContent}
      </aside>
    </>
  )
}
