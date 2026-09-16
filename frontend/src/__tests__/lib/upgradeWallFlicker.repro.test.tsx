import { render, screen } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { UpgradeWall } from '@/components/discovery/UpgradeWall'
import { deriveQuotaExceeded } from '@/lib/analysisQuota'
import { discoveryQueriesNeedAuthRefetch } from '@/lib/invalidateDiscoveryAfterAuth'

const ADDRESS = '1014 N J St, Lake Worth Beach, FL 33460'

function QuotaGatedDiscovery({ fetchProperty }: { fetchProperty: () => void }) {
  const plan = 'starter'
  const used = 3
  const limit = 3
  const quotaExceeded = deriveQuotaExceeded({ plan, used, limit })

  useEffect(() => {
    if (quotaExceeded) return
    fetchProperty()
  }, [quotaExceeded, fetchProperty])

  if (quotaExceeded) {
    return (
      <UpgradeWall
        resetsAt="2026-10-01T00:00:00.000Z"
        limit={limit}
        used={used}
        plan={plan}
        onStartTrial={() => undefined}
        onDismiss={() => undefined}
      />
    )
  }
  return <div>loading</div>
}

describe('UpgradeWall flicker', () => {
  it('does not treat Starter quota as an auth-stale refetch', () => {
    const queryClient = new QueryClient()
    expect(discoveryQueriesNeedAuthRefetch(queryClient, ADDRESS, 'free')).toBe(false)
    expect(discoveryQueriesNeedAuthRefetch(queryClient, ADDRESS, 'anonymous')).toBe(true)
  })

  it('mounts the wall once and never calls fetchProperty when quotaExceeded', () => {
    const fetchProperty = vi.fn()
    render(<QuotaGatedDiscovery fetchProperty={fetchProperty} />)

    expect(fetchProperty).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'See the Deal Gap on every property.' })).toBeInTheDocument()
  })
})
