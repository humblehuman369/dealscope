'use client'

import Link from 'next/link'
import { Megaphone, ArrowLeft } from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  ApprovalQueueSection,
  BotsHealthSection,
  ContentCalendarSection,
  DailyBriefSection,
  ScorecardSection,
  type BlogCalendarItem,
} from '@/features/admin/components/marketing'

// ===========================================
// Marketing Ops Hub — /admin/marketing
// ===========================================
// Deep-linkable so a bot's morning message can land a human directly on
// the approval queue. Priority order on mobile: queue, brief, scorecard,
// calendar, health. On desktop the queue + brief take the wide column.
// ===========================================

export function MarketingOpsDashboard({ blog }: { blog: BlogCalendarItem[] }) {
  return (
    <AuthGuard requireAdmin>
      <div
        className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Admin
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-400/10 rounded-lg border border-sky-400/20">
                <Megaphone className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Marketing Ops</h1>
                <p className="text-slate-400 text-sm">
                  Approve what the bots drafted, read the brief, watch the funnel. Nothing publishes without you.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <ApprovalQueueSection />
              <DailyBriefSection />
              <ScorecardSection />
            </div>
            <div className="min-w-0 space-y-6">
              <ContentCalendarSection blog={blog} />
              <BotsHealthSection />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
