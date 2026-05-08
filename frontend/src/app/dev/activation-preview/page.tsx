'use client'

/**
 * Dev preview for the Activation Arc — Phase 0 (Sprints 1 + 3).
 *
 * SCRATCH ROUTE — visual + behavioral verification only. Renders all four
 * new components with realistic mock data so the changes can be reviewed
 * without needing a real verdict page (which requires a property with a
 * negative gap and seeded property data).
 *
 * Components shown:
 *   1. HeadlineStructureCard (Sprint 1 / E4) — with full blend
 *   2. Personalization line (Sprint 3 / A2) — both states
 *   3. BuildYourDealSandbox (Sprint 3 / B1) — wired to live backend
 *   4. Four Paths header reframe (Sprint 1 / A1) — old vs. new copy
 *
 * Delete or guard behind an env flag before any production deploy.
 */

import { useState } from 'react'
import { HeadlineStructureCard } from '@/components/iq-verdict/HeadlineStructureCard'
import {
  BuildYourDealSandbox,
  type SandboxAdjustments,
  type SandboxBaseInputs,
} from '@/components/iq-verdict/BuildYourDealSandbox'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import { AskIQ } from '@/components/iq-verdict/AskIQ'
import { PitchScriptModal } from '@/components/iq-verdict/PitchScriptModal'
import { IQIcon } from '@/lib/iq/iqIcon'

const HEADLINE_MOCK: DealStructure = {
  id: 'headline-conventional-blend',
  family: 'conventional_headline',
  familyLabel: 'Conventional headline',
  realismLabel: 'Most likely seller-acceptable',
  headline: 'Conventional terms — 4% off, 20% down, $2,870/mo rent',
  summary:
    'Cashflows by combining a 4% price negotiation, the standard 20% down, and verified market rent at $2,870/mo.',
  levers: [
    {
      label: 'Price',
      beforeLabel: '$410K',
      afterLabel: '$394K',
      deltaLabel: '−4.0%',
    },
    {
      label: 'Monthly rent',
      beforeLabel: '$2,400',
      afterLabel: '$2,870',
      deltaLabel: '+19.6%',
    },
  ],
  monthlySavings: 482.0,
  cashRequired: 90620,
  rankingScore: 92.0,
  pitchScript: 'mock pitch — irrelevant for layout audit',
  caveat:
    'Headline assumes the seller accepts a price negotiation within 8% of list; rent assumption is unverified — confirm comps before pitching.',
  selectionReason:
    'Smallest set of conventional moves that makes this property cashflow on this listing',
  preLoadedRecord: {
    custom_purchase_price: 393600,
    custom_rent_estimate: 2870,
    pending_extras: {
      headline_structure_id: 'headline-conventional-blend',
      price_ceiling_used: 0.08,
    },
  },
}

const SANDBOX_BASE: SandboxBaseInputs = {
  listPrice: 410000,
  monthlyRent: 2400,
  propertyTaxesAnnual: 4800,
  insuranceAnnual: 1500,
  downPaymentPct: 0.20,
  interestRate: 0.065,
  loanTermYears: 30,
  closingCostsPct: 0.03,
  vacancyRate: 0.05,
  maintenancePct: 0.05,
  managementPct: 0.08,
  capexPct: 0.05,
  buyDiscountPct: 0.05,
  isListed: true,
}

// Mock structure with a pitch script — used in the PitchScriptModal demo.
const PITCH_MOCK: DealStructure = {
  id: 'mock-financing-pitch',
  family: 'financing',
  familyLabel: 'Take over the loan',
  realismLabel: 'Lowest cost of capital',
  headline: "Take over the seller's ~3.1% loan",
  summary: 'Sub2 with a small cash payment for the equity gap.',
  levers: [
    { label: 'Interest rate', beforeLabel: '6.5%', afterLabel: '~3.1%', deltaLabel: '−3.4%' },
    { label: 'Cash to close', beforeLabel: '$90K', afterLabel: '$58K', deltaLabel: '−$32K' },
  ],
  monthlySavings: 760,
  cashRequired: 58000,
  rankingScore: 88,
  pitchScript:
    "WHO TO CALL\nListing agent first.\n\nOPEN — discover before you ask\n\"Thanks for taking the call. Before I send a number over, can you walk me through what's driving the sale and where the seller would ideally land?\"\n\nANCHOR — lead with math, not opinion\n\"Based on the comps and condition, my offer is structured around taking over the existing loan and bringing cash for the equity.\"\n\nTRIAL CLOSE\n\"How does that sit with you as a starting point for the conversation?\"",
  caveat:
    'Numbers assume the seller likely has a sub-4% existing loan from 2021. Real balance may differ — confirm before pitching. The bank can technically call the loan due (due-on-sale clause); rare in practice but real.',
  selectionReason: "Shown because the seller likely bought in 2021 when rates were ~3.1%",
  preLoadedRecord: {},
}

export default function ActivationPreviewPage() {
  const [adjustments, setAdjustments] = useState<SandboxAdjustments>({})
  const [pitchOpen, setPitchOpen] = useState(false)

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 720,
        margin: '0 auto',
        background: 'var(--surface-base, #fff)',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginTop: 0,
          marginBottom: 8,
          color: 'var(--text-heading)',
        }}
      >
        Activation Arc — dev preview
      </h1>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          margin: '0 0 8px',
        }}
      >
        Renders the four new pieces with realistic mock data. The sandbox is
        wired to the live backend at <code>/api/v1/analysis/sandbox</code>.
      </p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          margin: '0 0 24px',
        }}
      >
        On a real verdict page, all four pieces only appear when the deal has
        a negative Deal Gap (i.e., needs structuring). Properties that already
        cashflow at standard terms render the unchanged{' '}
        <code>VerdictPositiveGuidance</code> instead.
      </p>

      {/* 1. Headline structure card */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>
        1. HeadlineStructureCard <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 1 / E4)</span>
      </h2>
      <HeadlineStructureCard
        structure={HEADLINE_MOCK}
        marketTemperature="cold"
        hasCashShortfall
        onShowPitch={(s) => alert('Show pitch: ' + s.id)}
        onOpenInStrategy={(s) => alert('Open in Strategy: ' + s.id)}
      />

      {/* 2. Personalization line — both states */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: '32px 0 8px' }}>
        2. Personalization line <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 3 / A2)</span>
      </h2>
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'var(--surface-elevated, var(--surface-card))',
          border: '2px solid var(--border-default)',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          Default state
        </p>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Showing paths based on standard 20% down, 6.5% rate, 30-yr assumptions.{' '}
          <span style={{ color: 'var(--accent-sky)', fontWeight: 600 }}>Customize</span>
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '14px 0 6px' }}>
          Customized state
        </p>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Showing paths that fit <strong style={{ color: 'var(--text-heading)' }}>your</strong> 25% down, 6.85% rate, 30-yr assumptions.{' '}
          <span style={{ color: 'var(--accent-sky)', fontWeight: 600 }}>Adjust</span>
        </p>
      </div>

      {/* 3. Build Your Deal sandbox — live backend */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: '32px 0 8px' }}>
        3. Build Your Deal sandbox <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 3 / B1) — wired to live backend</span>
      </h2>
      <BuildYourDealSandbox
        baseInputs={SANDBOX_BASE}
        headlineStructure={HEADLINE_MOCK}
        initialAdjustments={null}
        onAdjustmentsChanged={setAdjustments}
        onApplyInStrategy={(adj) =>
          alert('Apply in Strategy:\n' + JSON.stringify(adj, null, 2))
        }
      />
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0 0', fontStyle: 'italic' }}>
        Current adjustments: {JSON.stringify(adjustments)}
      </p>

      {/* 4. Four Paths header reframe — old vs new */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: '32px 0 8px' }}>
        4. Four Paths header reframe <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 1 / A1)</span>
      </h2>
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'var(--surface-elevated, var(--surface-card))',
          border: '2px solid var(--border-default)',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          Before (no headline above)
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-heading)',
          }}
        >
          <span style={{ color: 'var(--accent-sky-light, var(--accent-sky))' }}>Four paths</span>{' '}
          to make this work
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '14px 0 6px' }}>
          After (with headline above)
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-heading)',
          }}
        >
          <span style={{ color: 'var(--accent-sky-light, var(--accent-sky))' }}>Other ways</span>{' '}
          to close this gap
        </p>
      </div>

      {/* 5. Ask IQ chip + modal — Sprint 4 */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: '32px 0 8px' }}>
        5. Ask IQ chip + modal <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 4 / C1+C2+C3)</span>
      </h2>
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'var(--surface-elevated, var(--surface-card))',
          border: '2px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Click <em>Ask IQ</em> to open the negotiation knowledge base. v1 ships
          with 12 curated Q&A across 4 categories — no freeform LLM, every
          answer is sourced. Renders below the Four Paths panel in production.
        </p>
        <AskIQ fromPanel="dev_preview" />
      </div>

      {/* 6. Pitch Script modal — Sprint 6 / N1+N5 */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: '32px 0 8px' }}>
        6. PitchScriptModal — pre-call checklist + outcome capture <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 6 / N1+N5+N6)</span>
      </h2>
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'var(--surface-elevated, var(--surface-card))',
          border: '2px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Existing pitch-script modal now includes a <strong>Pre-call checklist</strong> at
          the top (walk-away price + diagnosis questions + attorney-review reminder for
          creative-finance families) and an <strong>After-the-call outcome capture</strong>{' '}
          at the bottom. Choosing <em>In play</em> reveals a 24-hour recap-email draft.
        </p>
        <button
          type="button"
          onClick={() => setPitchOpen(true)}
          className="rounded-md px-4 py-2 text-[13px] font-semibold transition-colors"
          style={{
            background: 'var(--accent-sky)',
            color: 'var(--surface-base, #fff)',
            border: 'none',
          }}
        >
          Open mock pitch modal (creative-finance family)
        </button>
        {pitchOpen && (
          <PitchScriptModal
            structure={PITCH_MOCK}
            onClose={() => setPitchOpen(false)}
            propertyAddress="123 Main St, Austin, TX 78701"
          />
        )}
      </div>

      {/* 7. IQ as through-line — Sprint 5 */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: '32px 0 8px' }}>
        7. IQ as through-line <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(Sprint 5 / D1+D2+D3)</span>
      </h2>
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'var(--surface-elevated, var(--surface-card))',
          border: '2px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          IQ now appears as a labeled voice across the activation arc — not a mascot, just
          continuity. Already visible above:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
          <li>
            <strong>D1</strong> — <em>Why this?</em> chip on section 1 (HeadlineStructureCard).
            Click it to see the 3-bullet explanation derived from the structure's data.
          </li>
          <li>
            <strong>D2</strong> — IQ nudge in section 3 (sandbox), state-triggered. Move sliders
            to see it adapt as the gap closes.
          </li>
          <li>
            <strong>D3</strong> — IQ icon in the "Other ways to close this gap" header
            (right-hand side of section 4 above), creating continuity with the headline.
          </li>
        </ul>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          Per the plan, D1–D3 ship behind a feature flag in production until the IQ engagement
          gate (≥15% chip-open rate) passes.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--surface-card)',
            border: '1px solid var(--accent-sky)',
            borderRadius: 8,
            width: 'fit-content',
          }}
        >
          <IQIcon size={20} />
          <span style={{ fontSize: 12.5, color: 'var(--text-body)' }}>
            <strong style={{ color: 'var(--text-heading)' }}>IQ</strong> = the labeled voice.
            No face, no body, no first-person feelings — just continuity.
          </span>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '32px 0 0', textAlign: 'center' }}>
        Scratch route — delete before merge.
      </p>
    </div>
  )
}
