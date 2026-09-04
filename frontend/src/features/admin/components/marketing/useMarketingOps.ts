'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

// ===========================================
// Marketing Ops Hub — data layer
// ===========================================
// Mirrors backend/app/schemas/marketing.py + schemas/linkedin.py.
// All reads are React Query; every write invalidates the affected keys.
// ===========================================

export type MetricSource = 'posthog' | 'gsc' | 'linkedin_api' | 'x_api' | 'bot_capture'

export interface ScorecardCell {
  channel: string
  metric: string
  current: number | null
  previous: number | null
  sources: MetricSource[]
  last_captured_at: string | null
}

export interface Scorecard {
  days: number
  window_start: string
  window_end: string
  cells: ScorecardCell[]
}

export type LinkedInStatus = 'draft' | 'approved' | 'publishing' | 'published' | 'failed' | 'cancelled'

export interface LinkedInPost {
  id: string
  batch: string
  key: string
  account: 'founder' | 'company'
  scheduled_at: string
  body: string
  media_type: 'none' | 'image' | 'document'
  media_path: string | null
  media_alt_text: string | null
  document_title: string | null
  first_comment: string | null
  reshare_of_key: string | null
  status: LinkedInStatus
  approved_by: string | null
  approved_at: string | null
  linkedin_post_urn: string | null
  linkedin_comment_urn: string | null
  published_at: string | null
  error: string | null
  attempts: number
  created_by: string
  created_at: string
  updated_at: string
}

export type XStatus = LinkedInStatus

export interface XPost {
  id: string
  batch: string
  key: string
  scheduled_at: string
  thread_json: string[]
  status: XStatus
  approved_by: string | null
  approved_at: string | null
  x_post_id: string | null
  published_ids: string[]
  published_at: string | null
  error: string | null
  attempts: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface MarketingQueue {
  linkedin: LinkedInPost[]
  x: XPost[]
}

export interface Brief {
  id: string
  date: string
  kind: 'daily' | 'weekly'
  body_md: string
  highlights: Record<string, unknown>
  status: 'draft' | 'reviewed'
  created_by: string
  reviewed_by: string | null
  reviewed_at: string | null
  run_id: string | null
  created_at: string
  updated_at: string
}

export interface BotRun {
  id: string
  bot_name: string
  routine: string
  status: 'running' | 'succeeded' | 'failed'
  started_at: string
  finished_at: string | null
  summary: string | null
  error: string | null
}

export interface JobHealth {
  status: 'ok' | 'overdue' | 'pending_first_run' | 'unknown'
  last_success: string | null
  last_error: string | null
  last_error_at: string | null
  max_stale_seconds: number
}

export interface MarketingHealth {
  linkedin_publish_enabled: boolean
  linkedin_token_warnings: string[]
  x_publish_enabled: boolean
  x_api_configured: boolean
  bot_api_configured: boolean
  posthog_pull_configured: boolean
  gsc_pull_configured: boolean
  sources: { source: MetricSource; last_captured_at: string | null; rows_7d: number }[]
  bots: { bot_name: string; last_run: BotRun | null }[]
  jobs: Record<string, JobHealth>
}

export interface BlogPullRequest {
  number: number
  title: string
  url: string
  branch: string
  slug: string
  draft: boolean
  author: string | null
  preview_url: string | null
  updated_at: string | null
}

export const marketingKeys = {
  scorecard: (days: number) => ['admin', 'marketing', 'scorecard', days] as const,
  queue: ['admin', 'marketing', 'queue'] as const,
  briefs: ['admin', 'marketing', 'briefs'] as const,
  botRuns: ['admin', 'marketing', 'bot-runs'] as const,
  health: ['admin', 'marketing', 'health'] as const,
  blogPrs: ['admin', 'marketing', 'blog-prs'] as const,
}

export function useBlogPrs() {
  return useQuery({
    queryKey: marketingKeys.blogPrs,
    queryFn: () => api.get<BlogPullRequest[]>('/api/v1/admin/marketing/blog-prs'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useScorecard(days: number) {
  return useQuery({
    queryKey: marketingKeys.scorecard(days),
    queryFn: () => api.get<Scorecard>(`/api/v1/admin/marketing/scorecard?days=${days}`),
  })
}

export function useMarketingQueue() {
  return useQuery({
    queryKey: marketingKeys.queue,
    queryFn: () => api.get<MarketingQueue>('/api/v1/admin/marketing/queue'),
  })
}

export function useBriefs(limit = 14) {
  return useQuery({
    queryKey: marketingKeys.briefs,
    queryFn: () => api.get<Brief[]>(`/api/v1/admin/marketing/briefs?limit=${limit}`),
  })
}

export function useBotRuns(limit = 30) {
  return useQuery({
    queryKey: marketingKeys.botRuns,
    queryFn: () => api.get<BotRun[]>(`/api/v1/admin/marketing/bot-runs?limit=${limit}`),
  })
}

export function useMarketingHealth() {
  return useQuery({
    queryKey: marketingKeys.health,
    queryFn: () => api.get<MarketingHealth>('/api/v1/admin/marketing/health'),
  })
}

export interface LinkedInEdit {
  body?: string
  first_comment?: string
  scheduled_at?: string
}

export function useLinkedInActions() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: marketingKeys.queue })

  const approve = useMutation({
    mutationFn: (id: string) => api.post<LinkedInPost>(`/api/v1/admin/linkedin/posts/${id}/approve`),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: (id: string) => api.post<LinkedInPost>(`/api/v1/admin/linkedin/posts/${id}/cancel`),
    onSuccess: invalidate,
  })
  const edit = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LinkedInEdit }) =>
      api.patch<LinkedInPost>(`/api/v1/admin/linkedin/posts/${id}`, patch),
    onSuccess: invalidate,
  })
  return { approve, cancel, edit }
}

export interface XEdit {
  thread?: string[]
  scheduled_at?: string
}

export function useXActions() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: marketingKeys.queue })

  const approve = useMutation({
    mutationFn: (id: string) => api.post<XPost>(`/api/v1/admin/x/posts/${id}/approve`),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: (id: string) => api.post<XPost>(`/api/v1/admin/x/posts/${id}/cancel`),
    onSuccess: invalidate,
  })
  const edit = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: XEdit }) => api.patch<XPost>(`/api/v1/admin/x/posts/${id}`, patch),
    onSuccess: invalidate,
  })
  return { approve, cancel, edit }
}

// X counts every URL as 23 chars (t.co wrapping); mirrors x_batch.weighted_length.
export const X_POST_MAX = 280
export function xWeightedLength(text: string): number {
  const urls = text.match(/https?:\/\/\S+/g) ?? []
  return text.replace(/https?:\/\/\S+/g, '').length + 23 * urls.length
}

export function useReviewBrief() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Brief>(`/api/v1/admin/marketing/briefs/${id}/review`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: marketingKeys.briefs }),
  })
}
