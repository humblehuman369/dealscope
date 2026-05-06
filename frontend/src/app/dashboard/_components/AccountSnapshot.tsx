'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  UserCircle,
  Bookmark,
  CreditCard,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Trophy,
} from 'lucide-react'
import { useSession, useLogout } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface AccountCardProps {
  href?: string
  onClick?: () => void
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  destructive?: boolean
}

function AccountCard({ href, onClick, icon, title, description, badge, destructive }: AccountCardProps) {
  const inner = (
    <div className="h-full flex items-start gap-3 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--border-focus)] transition-all">
      <div
        className="p-2 rounded-lg flex-shrink-0"
        style={{
          background: destructive ? 'rgba(248,113,113,0.10)' : 'var(--color-sky-dim)',
          color: destructive ? 'var(--status-negative)' : 'var(--accent-sky)',
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-bold ${destructive ? 'text-[var(--status-negative)]' : 'text-[var(--text-heading)]'}`}>
            {title}
          </h3>
          {badge && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: 'rgba(15,164,233,0.15)',
                color: 'var(--accent-sky)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-label)] flex-shrink-0 mt-1" />
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="no-underline">
        {inner}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className="text-left w-full">
      {inner}
    </button>
  )
}

export function AccountSnapshot() {
  const { user, isAdmin } = useSession()
  const { isPro } = useSubscription()
  const logoutMutation = useLogout()
  const [confirmLogout, setConfirmLogout] = useState(false)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)]">
          Account
        </h2>
        {user && (
          <p className="text-xs text-[var(--text-label)] truncate">
            Signed in as <span className="text-[var(--text-secondary)]">{user.email}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AccountCard
          href="/profile"
          icon={<UserCircle className="w-5 h-5" />}
          title="Profile"
          description="Account, business, investor preferences"
        />
        <AccountCard
          href="/saved-properties"
          icon={<Bookmark className="w-5 h-5" />}
          title="Recent Searches & Saved Properties"
          description="Everything you've analyzed plus your tracked deals"
        />
        <AccountCard
          href="/portfolio"
          icon={<Trophy className="w-5 h-5" />}
          title="Portfolio"
          description="Closed deals and your track record"
        />
        <AccountCard
          href="/billing"
          icon={<CreditCard className="w-5 h-5" />}
          title="Billing"
          description="Manage subscription and invoices"
          badge={isPro ? 'Pro' : 'Starter'}
        />
        {isAdmin && (
          <AccountCard
            href="/admin"
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Admin Dashboard"
            description="Platform stats, users, assumptions"
          />
        )}
        <AccountCard
          onClick={() => setConfirmLogout(true)}
          icon={<LogOut className="w-5 h-5" />}
          title="Sign Out"
          description="End your session on this device"
          destructive
        />
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You'll need to sign in again to access your saved properties and analyses."
        confirmLabel={logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}
        cancelLabel="Cancel"
        variant="info"
        onConfirm={() => {
          setConfirmLogout(false)
          logoutMutation.mutate()
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
