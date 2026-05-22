'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bookmark,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
} from 'lucide-react'
import { useSession, useLogout } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'

interface MarketingUserMenuProps {
  onNavigate?: () => void
  className?: string
}

export function MarketingUserMenu({ onNavigate, className = '' }: MarketingUserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, isAdmin } = useSession()
  const { isPro } = useSubscription()
  const logoutMutation = useLogout()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const close = () => {
    setOpen(false)
    onNavigate?.()
  }

  const navigate = (path: string) => {
    close()
    router.push(path)
  }

  const handleLogout = () => {
    close()
    logoutMutation.mutate()
  }

  const menuItemClass =
    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-body)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-heading)]'

  return (
    <div className={`relative ${className}`.trim()} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-default)] text-[var(--text-heading)] transition-colors hover:bg-[var(--surface-elevated)]"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] py-1 shadow-[var(--shadow-card)]"
        >
          {user && (
            <div className="border-b border-[var(--border-default)] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-[var(--text-heading)]">
                  {user.full_name || 'User'}
                </p>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background: isPro
                      ? 'color-mix(in srgb, var(--accent-sky) 18%, transparent)'
                      : 'color-mix(in srgb, var(--text-secondary) 20%, transparent)',
                    color: isPro ? 'var(--accent-sky)' : 'var(--text-secondary)',
                  }}
                >
                  {isPro ? 'Pro' : 'Starter'}
                </span>
              </div>
              <p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
            </div>
          )}
          <button type="button" role="menuitem" className={menuItemClass} onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
          <button type="button" role="menuitem" className={menuItemClass} onClick={() => navigate('/profile')}>
            <UserCircle className="h-4 w-4" />
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => navigate('/search-history')}
          >
            <History className="h-4 w-4" />
            Search History
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => navigate('/saved-properties')}
          >
            <Bookmark className="h-4 w-4" />
            Saved Properties
          </button>
          <button type="button" role="menuitem" className={menuItemClass} onClick={() => navigate('/billing')}>
            <CreditCard className="h-4 w-4" />
            Billing
          </button>
          {isAdmin && (
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => navigate('/admin')}>
              <ShieldCheck className="h-4 w-4 text-[var(--status-warning)]" />
              Admin Dashboard
            </button>
          )}
          <div className="mt-1 border-t border-[var(--border-default)] pt-1">
            <button
              type="button"
              role="menuitem"
              className={`${menuItemClass} text-[var(--status-negative)] hover:text-[var(--status-negative)]`}
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Inline links for the mobile marketing nav drawer */
export function MarketingUserMenuMobileLinks({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter()
  const { user, isAdmin } = useSession()
  const { isPro } = useSubscription()
  const logoutMutation = useLogout()

  const linkClass =
    'rounded-xl px-3 py-2 text-left font-semibold text-[var(--text-body)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-heading)]'

  const go = (path: string) => {
    onNavigate?.()
    router.push(path)
  }

  return (
    <>
      {user && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-[var(--text-heading)]">
              {user.full_name || 'User'}
            </p>
            <span className="shrink-0 text-[10px] font-bold uppercase text-[var(--accent-sky)]">
              {isPro ? 'Pro' : 'Starter'}
            </span>
          </div>
          <p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
        </div>
      )}
      <button type="button" className={linkClass} onClick={() => go('/dashboard')}>
        Dashboard
      </button>
      <button type="button" className={linkClass} onClick={() => go('/profile')}>
        Profile
      </button>
      <button type="button" className={linkClass} onClick={() => go('/search-history')}>
        Search History
      </button>
      <button type="button" className={linkClass} onClick={() => go('/saved-properties')}>
        Saved Properties
      </button>
      <button type="button" className={linkClass} onClick={() => go('/billing')}>
        Billing
      </button>
      {isAdmin && (
        <button type="button" className={linkClass} onClick={() => go('/admin')}>
          Admin Dashboard
        </button>
      )}
      <button
        type="button"
        className={`${linkClass} text-[var(--status-negative)]`}
        onClick={() => {
          onNavigate?.()
          logoutMutation.mutate()
        }}
        disabled={logoutMutation.isPending}
      >
        Sign Out
      </button>
    </>
  )
}
