import { useEffect, useState } from 'react'
import { WORKFLOW_V1_ENV_ENABLED } from '@/lib/env'
import { initPostHog } from '@/lib/posthog'

export const WORKFLOW_V1_FLAG = 'workflow-v1'

export type WorkflowLayout = 'v1' | 'legacy'

/** Env is the deploy kill switch. Only an explicit PostHog `true` is on. */
export function resolveWorkflowV1(
  envEnabled: boolean,
  posthogFlag: unknown,
): boolean {
  if (!envEnabled) return false
  return posthogFlag === true
}

/** What the user actually saw. */
export function layoutFromRender(renderedV1: boolean): WorkflowLayout {
  return renderedV1 ? 'v1' : 'legacy'
}

/** card_opened only: v1 when the flag is loaded and true, else legacy. */
export function layoutFromFlag(enabled: boolean, ready: boolean): WorkflowLayout {
  return ready && enabled ? 'v1' : 'legacy'
}

function readFlagValue(getFeatureFlag: (flag: string) => unknown): boolean {
  try {
    return getFeatureFlag(WORKFLOW_V1_FLAG) === true
  } catch {
    return false
  }
}

/**
 * True when NEXT_PUBLIC_WORKFLOW_V1=true and PostHog `workflow-v1` is true.
 * Missing PostHog, an explicit false, a string, a load error, or env off
 * keeps the old layout.
 * Subscribes via onFeatureFlags so a person-targeted flag that matches
 * after identify is picked up without a remount.
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
    // Local screenshot / Lighthouse bootstrap only. Production builds never
    // see NODE_ENV === 'development', so this cannot bypass the live flag.
    if (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      (window as Window & { __WORKFLOW_V1_OVERRIDE__?: boolean }).__WORKFLOW_V1_OVERRIDE__ ===
        true
    ) {
      setEnabled(true)
      setReady(true)
      return
    }
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void initPostHog().then((ph) => {
      if (cancelled) return
      if (!ph) {
        setEnabled(false)
        setReady(true)
        return
      }
      const apply = (errorsLoading?: boolean) => {
        if (cancelled) return
        setEnabled(!errorsLoading && readFlagValue((flag) => ph.getFeatureFlag(flag)))
        setReady(true)
      }
      apply()
      const maybeUnsub = ph.onFeatureFlags(
        (
          _flags: string[],
          _variants?: Record<string, string | boolean>,
          extra?: { errorsLoading?: boolean },
        ) => {
          apply(Boolean(extra?.errorsLoading))
        },
      )
      if (typeof maybeUnsub === 'function') unsubscribe = maybeUnsub
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return { enabled, ready }
}
