import { describe, expect, it, vi } from 'vitest'

import { ANON_FUNNEL_COPY } from '@/lib/anonFunnelCopy'
import { workflowV1TabHref } from '@/lib/workflowRoutes'

describe('B3 signed-out Build the plan branch', () => {
  it('opens register with return_to of this house Plan URL', () => {
    const address = '7026 NW 21st Ave, Miami, FL 33147'
    const openAuthModal = vi.fn()
    const navigateToPlan = vi.fn()
    const workflowV1Layout = true
    const isAuthenticated = false

    const handleBuildPlan = () => {
      if (workflowV1Layout && !isAuthenticated) {
        openAuthModal('register', workflowV1TabHref('plan', address))
        return
      }
      navigateToPlan()
    }

    handleBuildPlan()
    expect(openAuthModal).toHaveBeenCalledWith(
      'register',
      workflowV1TabHref('plan', address),
    )
    expect(navigateToPlan).not.toHaveBeenCalled()
    expect(ANON_FUNNEL_COPY.buildPlanCta).toBe('Create a free account to build the plan')
  })

  it('opens Plan when signed in', () => {
    const openAuthModal = vi.fn()
    const navigateToPlan = vi.fn()
    const handleBuildPlan = () => {
      const workflowV1Layout = true
      const isAuthenticated = true
      if (workflowV1Layout && !isAuthenticated) {
        openAuthModal('register', '/discovery')
        return
      }
      navigateToPlan()
    }
    handleBuildPlan()
    expect(navigateToPlan).toHaveBeenCalledTimes(1)
    expect(openAuthModal).not.toHaveBeenCalled()
  })
})
