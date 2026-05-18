import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'
import './worksheet.css'

export const metadata: Metadata = {
  title: 'Worksheet — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function WorksheetLayout({ children }: { children: React.ReactNode }) {
  return <div className="worksheet-container">{children}</div>
}
