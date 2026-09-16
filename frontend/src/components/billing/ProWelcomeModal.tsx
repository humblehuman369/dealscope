'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppPathname, useAppSearchParams } from '@/hooks/useAppNavigation'
import { Modal } from '@/components/ui/Modal'
import { consumeProWelcome, markProWelcomeSeen } from '@/lib/checkoutReturn'
import { useSession } from '@/hooks/useSession'

const STEPS = [
  { label: 'Discovery', body: 'The verdict — should you pursue this deal?' },
  { label: 'Plan', body: 'Make the numbers work before you offer.' },
  { label: 'Math', body: 'Every assumption, editable, with comps behind it.' },
  { label: 'Work', body: 'The pipeline card for this property.' },
] as const

export function ProWelcomeModal() {
  const { isAuthenticated } = useSession()
  const router = useRouter()
  const pathname = useAppPathname()
  const searchParams = useAppSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    const fromQuery = searchParams.get('welcome') === 'pro'
    const fromStorage = consumeProWelcome()
    if (!fromQuery && !fromStorage) return
    setOpen(true)
    if (fromQuery) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('welcome')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [isAuthenticated, pathname, router, searchParams])

  const close = () => {
    markProWelcomeSeen()
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={close} size="md" title="Welcome to Pro">
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Your 7-day trial is on. This is the workflow — start on a property, then
        move Discovery → Plan → Math → Work.
      </p>
      <ol className="space-y-2 mb-5">
        {STEPS.map((step, i) => (
          <li key={step.label} className="flex gap-3 text-sm">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center"
              style={{
                background: 'rgba(15,164,233,0.12)',
                color: 'var(--accent-sky)',
              }}
            >
              {i + 1}
            </span>
            <span>
              <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                {step.label}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}> — {step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          href="/profile?tab=investor"
          onClick={close}
          className="flex-1 text-center py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background: 'var(--surface-elevated)',
            color: 'var(--text-heading)',
            border: '1px solid var(--border-default)',
          }}
        >
          Set up investor profile
        </Link>
        <Link
          href="/dashboard"
          onClick={close}
          className="flex-1 text-center py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background: 'var(--surface-elevated)',
            color: 'var(--text-heading)',
            border: '1px solid var(--border-default)',
          }}
        >
          View pipeline
        </Link>
      </div>
      <button
        type="button"
        onClick={close}
        className="w-full mt-3 py-2 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        Continue
      </button>
    </Modal>
  )
}
