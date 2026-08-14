import type { IntelligenceStatus } from '@/lib/investor-intelligence'

const LABELS: Record<IntelligenceStatus, string> = {
  updating: 'Updating',
  'coming-soon': 'Coming Soon',
  'in-development': 'In Development',
  'in-progress': 'Analysis in Progress',
  published: 'Published',
}

const MODIFIERS: Partial<Record<IntelligenceStatus, string>> = {
  'coming-soon': 'ii-status--soon',
  'in-development': 'ii-status--dev',
  'in-progress': 'ii-status--progress',
}

export function StatusBadge({
  status,
  label,
  large,
}: {
  status: IntelligenceStatus
  label?: string
  large?: boolean
}) {
  if (status === 'published') return null
  const mod = MODIFIERS[status] ?? ''
  return (
    <span className={`ii-status ${mod} ${large ? 'ii-status--lg' : ''}`.trim()}>
      {label ?? LABELS[status]}
    </span>
  )
}
