'use client'

import { CheckCircle2, Lock, Sparkles } from 'lucide-react'

import { directoryBaseStyles, directoryTokens } from './directoryStyles'

export interface DirectoryGateSpec {
  /** Plural records noun used in the headlines, e.g. "verified cash buyers". */
  records: string
  /** Prose name of the directory, e.g. "buyer directory". */
  directoryName: string
  /** Singular entity, used in "…{entity} contact details…". */
  entity: string
  /** Value bullets — deliberately per-directory. */
  bullets: readonly string[]
}

/**
 * The paid-only overlay both directories render over a blurred result grid.
 *
 * Three audiences, three asks: an anonymous visitor needs to sign in; a
 * trialing user already chose Pro and needs billing to start, so "upgrade"
 * would only confuse them; a free user needs the upgrade.
 */
export function DirectoryGate({
  spec,
  totalLabel,
  isAuthenticated,
  isTrialing,
  onSignIn,
  onStartPaid,
}: {
  spec: DirectoryGateSpec
  totalLabel: string
  isAuthenticated: boolean
  isTrialing: boolean
  onSignIn: () => void
  onStartPaid: () => void
}) {
  const copy = !isAuthenticated
    ? {
        eyebrow: 'Sign In Required',
        title: `Sign in to browse ${spec.records}`,
        description: `Create an account or sign in to search and view the ${spec.directoryName}.`,
        cta: 'Sign in to continue',
        onClick: onSignIn,
        footnote: 'The directory requires a paid subscription.',
      }
    : isTrialing
      ? {
          eyebrow: 'Paid Feature',
          title: `Unlock ${totalLabel} ${spec.records}`,
          description: `The ${spec.directoryName} is not included in the free trial. Start billing now to get full search, filters, contact details, and exports.`,
          cta: 'Start paid Pro',
          onClick: onStartPaid,
          footnote: 'Billing starts today. Cancel anytime.',
        }
      : {
          eyebrow: 'Paid Pro Required',
          title: `Unlock ${totalLabel} ${spec.records}`,
          description: `Full search, filters, ${spec.entity} contact details, and exports come with a paid Pro subscription.`,
          cta: 'Start paid Pro',
          onClick: onStartPaid,
          footnote: 'Billing starts today. Cancel anytime.',
        }

  return (
    <div style={directoryBaseStyles.gateWrap}>
      <div style={directoryBaseStyles.gateCard}>
        <div style={directoryBaseStyles.gateIcon}>
          <Lock size={24} color={directoryTokens.accentOnAccent} />
        </div>
        <div style={directoryBaseStyles.gateEyebrow}>{copy.eyebrow}</div>
        <h2 style={directoryBaseStyles.gateTitle}>{copy.title}</h2>
        <p style={directoryBaseStyles.gateDesc}>{copy.description}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
          {spec.bullets.map((item) => (
            <div key={item} style={directoryBaseStyles.gateFeatureRow}>
              <CheckCircle2 size={16} style={{ color: directoryTokens.accent, flexShrink: 0 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={copy.onClick}
          className="dgiq-btn-press"
          style={{ ...directoryBaseStyles.gateBtn, marginBottom: 10 }}
        >
          <Sparkles size={16} /> {copy.cta}
        </button>
        <div style={directoryBaseStyles.footnoteText}>{copy.footnote}</div>
      </div>
    </div>
  )
}
