import { useEffect, useState } from 'react'
import { WORKFLOW_V1_ENV_ENABLED } from '@/lib/env'
import { isPostHogFeatureEnabled } from '@/lib/posthog'

export const WORKFLOW_V1_FLAG = 'workflow-v1'

/** Env is the deploy kill switch. A missing or false PostHog flag is off. */
export function resolveWorkflowV1(
  envEnabled: boolean,
  posthogFlag: boolean | null,
): boolean {
  if (!envEnabled) return false
  return posthogFlag === true
}

/**
 * True when NEXT_PUBLIC_WORKFLOW_V1=true and PostHog `workflow-v1` is true.
 * Missing PostHog, an explicit false, or env off keeps the old layout.
 * `ready` is true once the env miss or the PostHog read has settled.
 */
export function useWorkflowV1(): { enabled: boolean; ready: boolean } {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(!WORKFLOW_V1_ENV_ENABLED)

  useEffect(() => {
    if (!WORKFLOW_V1_ENV_ENABLED) {
      setEnabled(false)
      setReady(true)
      return
    }
    let cancelled = false
    void isPostHogFeatureEnabled(WORKFLOW_V1_FLAG).then((flag) => {
      if (cancelled) return
      setEnabled(resolveWorkflowV1(true, flag))
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { enabled, ready }
}
