import { useEffect, useState } from 'react'
import { WORKFLOW_V1_ENV_ENABLED } from '@/lib/env'
import { initPostHog } from '@/lib/posthog'

export const WORKFLOW_V1_FLAG = 'workflow-v1'

export type WorkflowLayout = 'v1' | 'legacy'

/** Env is the deploy kill switch. PostHog `false` is the runtime kill switch. */
export function resolveWorkflowV1(
  envEnabled: boolean,
  posthogFlag: unknown,
): boolean {
  if (!envEnabled) return false
  if (posthogFlag === false) return false
  return true
}

/** What the user actually saw. */
export function layoutFromRender(renderedV1: boolean): WorkflowLayout {
  return renderedV1 ? 'v1' : 'legacy'
}

/** card_opened only: v1 when the flag is loaded and true, else legacy. */
export function layoutFromFlag(enabled: boolean, ready: boolean): WorkflowLayout {
  return ready && enabled ? 'v1' : 'legacy'
}

function readFlagValue(getFeatureFlag: (flag: string) => unknown): unknown {
  try {
    return getFeatureFlag(WORKFLOW_V1_FLAG)
  } catch {
    return undefined
  }
}

/**
 * True when NEXT_PUBLIC_WORKFLOW_V1=true unless PostHog `workflow-v1` is
 * explicitly false. Missing PostHog, a load error, or a non-false value
 * keeps V1 on so Free/Pro users are not stuck on legacy.
 * Subscribes via onFeatureFlags so an explicit kill switch is picked up
 * without a remount.
 */
export function useWorkflowV1(): { enabled: boolean; ready: boolean } {
  const [enabled, setEnabled] = useState(WORKFLOW_V1_ENV_ENABLED)
  const [ready, setReady] = useState(true)

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
        setEnabled(resolveWorkflowV1(true, undefined))
        setReady(true)
        return
      }
      const apply = (errorsLoading?: boolean) => {
        if (cancelled) return
        const flag = errorsLoading ? undefined : readFlagValue((name) => ph.getFeatureFlag(name))
        setEnabled(resolveWorkflowV1(true, flag))
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
