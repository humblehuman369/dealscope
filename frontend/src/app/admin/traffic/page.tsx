import type { Metadata } from 'next'
import { TrafficBoardPage } from '@/features/admin/components/traffic'

export const metadata: Metadata = { title: 'Traffic — Admin' }

// Client-rendered against /api/v1/admin/traffic; nothing here is public.
export default function AdminTrafficPage() {
  return <TrafficBoardPage />
}
