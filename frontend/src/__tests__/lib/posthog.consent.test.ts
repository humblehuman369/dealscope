import { beforeEach, describe, expect, it, vi } from 'vitest'

const hasAnalyticsConsent = vi.hoisted(() => vi.fn(() => false))
const subscribeConsent = vi.hoisted(() => vi.fn((_cb?: unknown) => () => undefined))

const capture = vi.fn()
const identify = vi.fn()
const optOut = vi.fn()
const optIn = vi.fn()
const setConfig = vi.fn()
const getFeatureFlag = vi.fn(() => true)
const init = vi.fn()

vi.mock('@/lib/cookieConsent', () => ({
  hasAnalyticsConsent: () => hasAnalyticsConsent(),
  subscribeConsent: (cb: (c: unknown) => void) => subscribeConsent(cb),
}))

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => init(...args),
    capture,
    identify,
    opt_out_capturing: optOut,
    opt_in_capturing: optIn,
    set_config: setConfig,
    getFeatureFlag,
  },
}))

describe('PostHog consent split', () => {
  beforeEach(() => {
    vi.resetModules()
    capture.mockClear()
    identify.mockClear()
    optOut.mockClear()
    optIn.mockClear()
    setConfig.mockClear()
    init.mockClear()
    hasAnalyticsConsent.mockReturnValue(false)
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
  })

  it('inits flags-only when consent is essential and never captures', async () => {
    hasAnalyticsConsent.mockReturnValue(false)
    const { initPostHog, capturePostHog, identifyPostHog, isPostHogFeatureEnabled } =
      await import('@/lib/posthog')
    const ph = await initPostHog()
    expect(ph).not.toBeNull()
    expect(init).toHaveBeenCalled()
    const initOpts = init.mock.calls[0][1] as {
      persistence: string
      opt_out_capturing_by_default: boolean
      autocapture: boolean
    }
    expect(initOpts.persistence).toBe('memory')
    expect(initOpts.opt_out_capturing_by_default).toBe(true)
    expect(initOpts.autocapture).toBe(false)
    expect(optOut).toHaveBeenCalled()

    capturePostHog('verdict_viewed', { listed: true })
    identifyPostHog('user-1', { email: 'a@b.com' })
    expect(capture).not.toHaveBeenCalled()
    expect(identify).not.toHaveBeenCalled()
    await expect(isPostHogFeatureEnabled('workflow-v1')).resolves.toBe(true)
  })

  it('captures after consent is all', async () => {
    hasAnalyticsConsent.mockReturnValue(true)
    const { initPostHog, capturePostHog } = await import('@/lib/posthog')
    await initPostHog()
    const initOpts = init.mock.calls[0][1] as { persistence: string }
    expect(initOpts.persistence).toBe('localStorage+cookie')
    capturePostHog('verdict_viewed', { listed: true })
    await Promise.resolve()
    expect(capture).toHaveBeenCalledWith('verdict_viewed', { listed: true })
  })
})
