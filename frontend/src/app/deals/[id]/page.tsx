'use client'

/**
 * Deal Workflow page — the all-inclusive surface for a single saved property.
 *
 * Layout:
 *   Hero header (name · status · strategy · 4-stat strip · quick actions)
 *   Tab nav (?tab=...) — Overview | Tasks | Budget | Documents | Contacts | Activity
 *   Active panel
 *
 * Replaces the slide-over for deep work — kanban card click lands here.
 * Tabs persist via the ``tab`` query param so deep-links (e.g. notifications,
 * "Due this week" widget) can drop the user straight into the right pane.
 */

import { use, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  ListChecks,
  Receipt,
  StickyNote,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { api } from '@/lib/api-client'
import { ActivityPanel } from '@/components/deal/ActivityPanel'
import { BudgetPanel } from '@/components/deal/BudgetPanel'
import { ContactsPanel } from '@/components/deal/ContactsPanel'
import { DocumentsPanel } from '@/components/deal/DocumentsPanel'
import { TasksPanel } from '@/components/deal/TasksPanel'
import { useTasks } from '@/hooks/useTasks'
import { useTimeline } from '@/hooks/useTimeline'
import { useRehabBudgetSummary } from '@/hooks/useSavedProperties'
import { STATUS_CONFIG, STRATEGY_LABELS } from '@/lib/savedPropertyStatus'
import { STAGE_LABELS } from '@/lib/lifecycleStages'
import type { FlipStage, PropertyStatus } from '@/types/savedProperty'

type Tab = 'overview' | 'tasks' | 'budget' | 'documents' | 'contacts' | 'activity'
const TABS: Tab[] = ['overview', 'tasks', 'budget', 'documents', 'contacts', 'activity']

interface DealDetail {
  id: string
  nickname: string | null
  address_street: string
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  full_address: string | null
  status: PropertyStatus
  flip_stage: FlipStage | null
  flip_stage_entered_at: string | null
  status_changed_at: string | null
  best_strategy: string | null
  best_cash_flow: number | null
  best_coc_return: number | null
  saved_at: string
  updated_at: string
}

function useDeal(id: string) {
  return useQuery({
    queryKey: ['saved-properties', 'detail', id],
    queryFn: () => api.get<DealDetail>(`/api/v1/properties/saved/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  })
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

function buildVerdictAddress(deal: DealDetail): string {
  if (deal.full_address) return deal.full_address
  const parts = [deal.address_street, deal.address_city, deal.address_state, deal.address_zip]
    .filter(Boolean)
    .join(', ')
  return parts || deal.address_street
}

export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[var(--surface-base)] grid-fade" />
        }
      >
        <DealPageContent propertyId={id} />
      </Suspense>
    </AuthGuard>
  )
}

function DealPageContent({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') ?? 'overview') as Tab
  const tab: Tab = TABS.includes(tabParam) ? tabParam : 'overview'

  const deal = useDeal(propertyId)

  function setTab(next: Tab) {
    const sp = new URLSearchParams(searchParams.toString())
    if (next === 'overview') sp.delete('tab')
    else sp.set('tab', next)
    const qs = sp.toString()
    router.replace(`/deals/${propertyId}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-6 px-4 sm:px-6 lg:px-8 grid-fade">
      <div className="max-w-6xl mx-auto">
        <DataBoundary
          isLoading={deal.isLoading}
          error={deal.isError ? 'Could not load this property' : null}
          onRetry={() => deal.refetch()}
          isEmpty={!deal.isLoading && !deal.data}
          emptyTitle="Property not found"
          emptyDescription="This property may have been removed."
        >
          {deal.data && (
            <>
              <DealHeader deal={deal.data} />
              <TabNav active={tab} onChange={setTab} />
              <main className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] mt-3 min-h-[420px] flex flex-col">
                {tab === 'overview' && <OverviewTab deal={deal.data} onJumpTab={setTab} />}
                {tab === 'tasks' && (
                  <TasksPanel
                    propertyId={propertyId}
                    stageLabel={
                      deal.data.flip_stage
                        ? STAGE_LABELS[deal.data.flip_stage]
                        : STATUS_CONFIG[deal.data.status].label
                    }
                  />
                )}
                {tab === 'budget' && (
                  <div className="p-5">
                    <BudgetPanel propertyId={propertyId} />
                  </div>
                )}
                {tab === 'documents' && <DocumentsPanel propertyId={propertyId} />}
                {tab === 'contacts' && <ContactsPanel propertyId={propertyId} />}
                {tab === 'activity' && <ActivityPanel propertyId={propertyId} />}
              </main>
            </>
          )}
        </DataBoundary>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────
// Hero header

function DealHeader({ deal }: { deal: DealDetail }) {
  const title = deal.nickname || deal.address_street
  const subtitle = [deal.address_city, deal.address_state].filter(Boolean).join(', ')
  const strategyLabel = deal.best_strategy
    ? STRATEGY_LABELS[deal.best_strategy] ?? deal.best_strategy
    : null

  // Stage label: combine status + flip_stage so the user always knows where
  // the deal is in the cycle without scanning the kanban.
  const stageBits: string[] = []
  stageBits.push(STATUS_CONFIG[deal.status].label)
  if (deal.flip_stage) stageBits.push(STAGE_LABELS[deal.flip_stage])
  const stageLine = stageBits.join(' · ')

  // For Owned cards, days-in-stage from flip_stage_entered_at; else from
  // status_changed_at.
  const daysInStage =
    deal.status === 'owned'
      ? daysSince(deal.flip_stage_entered_at ?? deal.status_changed_at)
      : daysSince(deal.status_changed_at)

  const summary = useRehabBudgetSummary(deal.id)
  const budgetData = summary.data
  const analysis = budgetData ? parseFloat(budgetData.baseline_total) : null
  const projected = budgetData
    ? parseFloat(budgetData.projected_total ?? budgetData.actual_total)
    : null
  const toDate = budgetData ? parseFloat(budgetData.actual_total) : null
  const variance = budgetData ? parseFloat(budgetData.variance) : null

  return (
    <header className="rounded-3xl p-5 sm:p-6 border border-[var(--border-subtle)] soft-panel">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-label)] hover:text-[var(--accent-sky)] mb-2 no-underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-heading)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-label)] mt-0.5">{subtitle}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-sky-dim)] text-[var(--accent-sky)]">
              {stageLine}
            </span>
            {strategyLabel && (
              <span className="inline-flex text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] ring-1 ring-[var(--border-default)]">
                {strategyLabel}
              </span>
            )}
            {daysInStage !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-label)]">
                <Clock className="w-3 h-3" />
                {daysInStage}d in stage
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            href={`/deals/${deal.id}/report`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors no-underline"
          >
            <FileText className="w-4 h-4" />
            Deal Report
          </Link>
          <Link
            href={`/strategy?address=${encodeURIComponent(buildVerdictAddress(deal))}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors no-underline"
          >
            <BarChart3 className="w-4 h-4" />
            View Analysis
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 4-stat strip — populated when a budget exists; shows placeholder copy
          otherwise so the user knows the slot is real, not a render bug. */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <HeaderStat label="Analysis" value={analysis !== null ? fmtCurrency(analysis) : '—'} />
        <HeaderStat
          label="Projected"
          value={projected !== null ? fmtCurrency(projected) : '—'}
        />
        <HeaderStat
          label="To Date"
          value={toDate !== null ? fmtCurrency(toDate) : '—'}
          accent="sky"
        />
        <HeaderStat
          label="Variance"
          value={variance !== null ? fmtCurrency(variance) : '—'}
          accent={variance !== null && variance > 0 ? 'negative' : variance !== null && variance < 0 ? 'positive' : undefined}
        />
      </div>
    </header>
  )
}

function HeaderStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'sky' | 'negative' | 'positive'
}) {
  const valueColor =
    accent === 'sky'
      ? 'text-[var(--accent-sky)]'
      : accent === 'negative'
      ? 'text-[var(--status-negative)]'
      : accent === 'positive'
      ? 'text-[var(--status-positive)]'
      : 'text-[var(--text-heading)]'
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
        {label}
      </p>
      <p className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  )
}

// ───────────────────────────────────────────────────────
// Tabs

const TAB_ICONS: Record<Tab, React.ComponentType<{ className?: string }>> = {
  overview: BarChart3,
  tasks: ListChecks,
  budget: Receipt,
  documents: FolderOpen,
  contacts: Users,
  activity: Activity,
}

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  tasks: 'Tasks',
  budget: 'Budget',
  documents: 'Documents',
  contacts: 'Contacts',
  activity: 'Activity',
}

function TabNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--border-default)]"
      aria-label="Deal tabs"
    >
      {TABS.map((t) => {
        const Icon = TAB_ICONS[t]
        const on = active === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-current={on ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              on
                ? 'text-[var(--accent-sky)] border-[var(--accent-sky)]'
                : 'text-[var(--text-label)] border-transparent hover:text-[var(--text-body)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {TAB_LABELS[t]}
          </button>
        )
      })}
    </nav>
  )
}

// ───────────────────────────────────────────────────────
// Overview tab — 2x2 grid of summary cards

function OverviewTab({
  deal,
  onJumpTab,
}: {
  deal: DealDetail
  onJumpTab: (t: Tab) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
      <StatusReportCard deal={deal} onSeeTasks={() => onJumpTab('tasks')} />
      <FinancialsCard deal={deal} onSeeBudget={() => onJumpTab('budget')} />
      <TopTasksCard propertyId={deal.id} onSeeAll={() => onJumpTab('tasks')} />
      <RecentActivityCard propertyId={deal.id} onSeeAll={() => onJumpTab('activity')} />
    </div>
  )
}

function OverviewCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 flex flex-col">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-heading)] inline-flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-[var(--accent-sky)]" />
          {title}
        </h3>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  )
}

function StatusReportCard({ deal, onSeeTasks }: { deal: DealDetail; onSeeTasks: () => void }) {
  const stageLine = [
    STATUS_CONFIG[deal.status].label,
    deal.flip_stage ? STAGE_LABELS[deal.flip_stage] : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const days =
    deal.status === 'owned'
      ? daysSince(deal.flip_stage_entered_at ?? deal.status_changed_at)
      : daysSince(deal.status_changed_at)

  // Pull the user's open tasks so we can surface the next deadline on the
  // status card — fastest "what should I do next?" answer at a glance.
  const tasksQuery = useTasks(deal.id)
  const upcoming = (tasksQuery.data ?? [])
    .filter((t) => t.completed_at === null && t.due_date)
    .sort((a, b) => new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime())
  const nextDue = upcoming[0]
  const overdueCount = upcoming.filter((t) => new Date(t.due_date as string) < new Date()).length

  return (
    <OverviewCard title="Status" icon={Clock}>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">Current</dt>
          <dd className="text-base font-semibold text-[var(--text-heading)] mt-0.5">
            {stageLine}
          </dd>
          {days !== null && (
            <dd className="text-[11px] text-[var(--text-label)] mt-0.5">
              {days}d in stage
            </dd>
          )}
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
            Next deadline
          </dt>
          {nextDue ? (
            <dd className="mt-0.5">
              <button
                type="button"
                onClick={onSeeTasks}
                className="text-sm text-[var(--text-heading)] hover:text-[var(--accent-sky)] text-left underline-offset-2 hover:underline"
              >
                {nextDue.title}
              </button>
              <p className="text-[11px] text-[var(--text-label)] mt-0.5">
                Due {new Date(nextDue.due_date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {overdueCount > 0 && (
                  <span className="ml-2 text-[var(--status-negative)] font-semibold">
                    {overdueCount} overdue
                  </span>
                )}
              </p>
            </dd>
          ) : (
            <dd className="text-[11px] text-[var(--text-label)] mt-0.5">No deadlines set</dd>
          )}
        </div>
      </dl>
    </OverviewCard>
  )
}

function FinancialsCard({
  deal,
  onSeeBudget,
}: {
  deal: DealDetail
  onSeeBudget: () => void
}) {
  const summary = useRehabBudgetSummary(deal.id)
  const data = summary.data

  return (
    <OverviewCard
      title="Financials"
      icon={BarChart3}
      action={
        <button
          type="button"
          onClick={onSeeBudget}
          className="text-[10px] uppercase tracking-wide text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          Open budget →
        </button>
      }
    >
      {summary.isLoading ? (
        <p className="text-sm text-[var(--text-label)]">Loading…</p>
      ) : !data ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-label)]">
            No budget yet — seed one to track variance and projections.
          </p>
          <Link
            href={`/strategy?address=${encodeURIComponent(buildVerdictAddress(deal))}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-sky)] hover:underline"
          >
            <Receipt className="w-3.5 h-3.5" />
            Seed a budget
          </Link>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
              Analysis
            </dt>
            <dd className="text-base font-semibold tabular-nums text-[var(--text-heading)]">
              {fmtCurrency(parseFloat(data.baseline_total))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
              Projected
            </dt>
            <dd className="text-base font-semibold tabular-nums text-[var(--text-heading)]">
              {fmtCurrency(parseFloat(data.projected_total ?? data.actual_total))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
              To Date
            </dt>
            <dd className="text-base font-semibold tabular-nums text-[var(--accent-sky)]">
              {fmtCurrency(parseFloat(data.actual_total))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
              Variance
            </dt>
            <dd
              className={`text-base font-semibold tabular-nums ${
                parseFloat(data.variance) > 0
                  ? 'text-[var(--status-negative)]'
                  : parseFloat(data.variance) < 0
                  ? 'text-[var(--status-positive)]'
                  : 'text-[var(--text-heading)]'
              }`}
            >
              {parseFloat(data.variance) > 0 ? '+' : ''}
              {fmtCurrency(parseFloat(data.variance))}
            </dd>
          </div>
        </dl>
      )}
    </OverviewCard>
  )
}

function TopTasksCard({
  propertyId,
  onSeeAll,
}: {
  propertyId: string
  onSeeAll: () => void
}) {
  const tasks = useTasks(propertyId)
  const open = (tasks.data ?? []).filter((t) => t.completed_at === null)
  const next = open
    .slice()
    .sort((a, b) => {
      // Tasks with due dates first (sorted by date), then by sort_order.
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY
      if (aDue !== bDue) return aDue - bDue
      return a.sort_order - b.sort_order
    })
    .slice(0, 4)

  return (
    <OverviewCard
      title={`Open tasks · ${open.length}`}
      icon={ListChecks}
      action={
        <button
          type="button"
          onClick={onSeeAll}
          className="text-[10px] uppercase tracking-wide text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          See all →
        </button>
      }
    >
      {tasks.isLoading ? (
        <p className="text-sm text-[var(--text-label)]">Loading…</p>
      ) : next.length === 0 ? (
        <p className="text-sm text-[var(--text-label)]">No open tasks.</p>
      ) : (
        <ul className="space-y-1.5">
          {next.map((t) => {
            const overdue = t.due_date && new Date(t.due_date) < new Date()
            return (
              <li key={t.id} className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-[var(--text-label)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-heading)] leading-snug">{t.title}</p>
                  {t.due_date && (
                    <p
                      className={`text-[11px] ${
                        overdue
                          ? 'text-[var(--status-negative)] font-semibold'
                          : 'text-[var(--text-label)]'
                      }`}
                    >
                      {overdue ? 'Overdue · ' : ''}
                      {new Date(t.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </OverviewCard>
  )
}

function RecentActivityCard({
  propertyId,
  onSeeAll,
}: {
  propertyId: string
  onSeeAll: () => void
}) {
  const events = useTimeline(propertyId)
  const recent = (events.data ?? []).slice(0, 5)

  return (
    <OverviewCard
      title="Recent activity"
      icon={StickyNote}
      action={
        <button
          type="button"
          onClick={onSeeAll}
          className="text-[10px] uppercase tracking-wide text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          See all →
        </button>
      }
    >
      {events.isLoading ? (
        <p className="text-sm text-[var(--text-label)]">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="text-sm text-[var(--text-label)]">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((e) => (
            <li key={e.id} className="flex items-start gap-2">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent-sky)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-heading)] leading-snug truncate">{e.title}</p>
                <p className="text-[11px] text-[var(--text-label)]">
                  {new Date(e.occurred_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
