'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/lib/api-client'

/* ── Design tokens ───────────────────────────────────────────── */

const FONT_DM = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const FONT_MONO = "var(--font-space-mono), 'Space Mono', monospace"

/* ── Types ────────────────────────────────────────────────────── */

interface UsageData {
  tier: string
  searches_used: number
  searches_limit: number
  searches_remaining: number
  properties_saved: number
  properties_limit: number
  properties_remaining: number
  days_until_reset?: number
}

type BarState = 'normal' | 'warning' | 'critical'

/* ── State-dependent visual styles ───────────────────────────── */

const STATE_STYLES: Record<BarState, {
  border: string
  glow: string
  fill: string
  ctaBg: string
  ctaBorder: string
  ctaColor: string
}> = {
  normal: {
    border: 'rgba(14,165,233,0.25)',
    glow: '0 0 30px rgba(14,165,233,0.08), 0 0 60px rgba(14,165,233,0.04)',
    fill: '#0EA5E9',
    ctaBg: 'rgba(14,165,233,0.1)',
    ctaBorder: 'rgba(14,165,233,0.25)',
    ctaColor: '#0EA5E9',
  },
  warning: {
    border: 'rgba(251,191,36,0.3)',
    glow: '0 0 30px rgba(251,191,36,0.06), 0 0 60px rgba(251,191,36,0.03)',
    fill: '#FBBF24',
    ctaBg: 'rgba(251,191,36,0.1)',
    ctaBorder: 'rgba(251,191,36,0.25)',
    ctaColor: '#FBBF24',
  },
  critical: {
    border: 'rgba(249,112,102,0.3)',
    glow: '0 0 30px rgba(249,112,102,0.08), 0 0 60px rgba(249,112,102,0.04)',
    fill: '#F97066',
    ctaBg: '#F97066',
    ctaBorder: '#F97066',
    ctaColor: '#000',
  },
}

const HIDDEN_ON = [
  '/verdict', '/strategy',
  '/pricing', '/register', '/what-is-dealgapiq',
  '/billing',
]

/* ── UsageBar ────────────────────────────────────────────────── */

export function UsageBar() {
  const pathname = usePathname()
  const { isAuthenticated, isLoading: authLoading } = useSession()
  const { isPro } = useSubscription()

  const { data: usage } = useQuery<UsageData>({
    queryKey: ['billing', 'usage'],
    queryFn: () => api.get<UsageData>('/api/v1/billing/usage'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: isAuthenticated && !isPro,
    retry: 1,
  })

  if (authLoading || !isAuthenticated || isPro) return null
  if (HIDDEN_ON.some(r => pathname?.startsWith(r))) return null
  if (!usage || usage.searches_limit <= 0) return null

  const analysesPct = Math.min(100, (usage.searches_used / usage.searches_limit) * 100)
  const savedPct = usage.properties_limit > 0
    ? Math.min(100, (usage.properties_saved / usage.properties_limit) * 100)
    : 0

  const state: BarState =
    analysesPct > 80 ? 'critical' : analysesPct > 60 ? 'warning' : 'normal'
  const s = STATE_STYLES[state]

  const remaining = usage.searches_remaining
  const ctaText =
    state === 'critical'
      ? 'Limit reached — Upgrade now'
      : state === 'warning'
        ? `${remaining} analysis${remaining !== 1 ? 'es' : ''} left — Upgrade →`
        : 'Upgrade for unlimited →'

  return (
    <div
      className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-7 mx-4 md:mx-6 mt-3 py-4 px-5 md:py-3.5 md:px-6"
      style={{
        fontFamily: FONT_DM,
        background: '#000',
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        boxShadow: s.glow,
      }}
    >
      {/* Plan badge */}
      <div className="flex items-center gap-2 w-full md:w-auto pr-0 md:pr-7 flex-shrink-0 border-r-0 md:border-r border-white/10">
        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Starter</span>
        <span
          style={{
            fontSize: '0.55rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0.15rem 0.45rem',
            borderRadius: 3,
            color: '#FBBF24',
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          Free
        </span>
      </div>

      {/* Meters */}
      <div className="flex gap-6 flex-1 w-full md:w-auto">
        <Meter
          label="Analyses"
          used={usage.searches_used}
          limit={usage.searches_limit}
          pct={analysesPct}
          color={s.fill}
        />
        {usage.properties_limit > 0 && (
          <Meter
            label="Saved"
            used={usage.properties_saved}
            limit={usage.properties_limit}
            pct={savedPct}
            color={s.fill}
          />
        )}
      </div>

      {/* Upgrade CTA */}
      <Link
        href="/billing"
        className="flex items-center justify-center gap-1.5 w-full md:w-auto flex-shrink-0 md:ml-auto whitespace-nowrap transition-opacity hover:opacity-90"
        style={{
          padding: '0.45rem 1rem',
          background: s.ctaBg,
          border: `1px solid ${s.ctaBorder}`,
          borderRadius: 8,
          fontSize: '0.72rem',
          fontWeight: state === 'critical' ? 700 : 600,
          color: s.ctaColor,
          textDecoration: 'none',
        }}
      >
        {ctaText}
      </Link>
    </div>
  )
}

/* ── Meter sub-component ─────────────────────────────────────── */

function Meter({
  label,
  used,
  limit,
  pct,
  color,
}: {
  label: string
  used: number
  limit: number
  pct: number
  color: string
}) {
  return (
    <div className="flex items-center" style={{ gap: '0.6rem' }}>
      <span style={{ fontSize: '0.72rem', color: '#71717A', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div
        style={{
          width: 80,
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            background: color,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.72rem',
          fontWeight: 700,
          color,
          whiteSpace: 'nowrap',
        }}
      >
        {used}
        <span style={{ color: '#71717A', fontWeight: 400 }}>/{limit}</span>
      </span>
    </div>
  )
}
