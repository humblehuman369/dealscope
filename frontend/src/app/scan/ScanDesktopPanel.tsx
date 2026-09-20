import type { ReactNode } from 'react'
import Link from 'next/link'
import { SPEED_CLAIM } from '@/lib/claims'

export function ScanDesktopPanel({ qr }: { qr: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-base)] px-6 py-16">
      <Link
        href="/"
        className="mb-8 text-xl font-bold text-[var(--text-heading)] font-display"
      >
        DealGap<span className="text-[var(--accent-sky)]">IQ</span>
      </Link>
      <h1 className="text-center text-2xl font-bold text-[var(--text-heading)]">
        Scan a house
      </h1>
      <p className="mt-3 max-w-md text-center text-[15px] text-[var(--text-secondary)]">
        On your phone? Point it at any house and get the verdict.
      </p>
      <div className="mt-6">{qr}</div>
      <p className="mt-4 max-w-sm text-center text-sm text-[var(--text-muted)]">
        Scan the code to open the camera. Score any property {SPEED_CLAIM}.
      </p>
    </main>
  )
}
