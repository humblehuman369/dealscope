'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { trackEvent } from '@/lib/eventTracking'
import { claimPlan } from '@/lib/api/plans'
import { buildScenarioPayload } from '@/lib/dealStructures/loadScenario'
import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'
import type { FourWayFamily } from '@/components/iq-verdict/make-it-work/fourWays'
import { ChoiceStep } from '@/components/iq-verdict/make-it-work/ChoiceStep'
import { PlanResult } from '@/components/iq-verdict/make-it-work/PlanResult'
import { SavePlanForm } from '@/components/iq-verdict/make-it-work/SavePlanForm'
import { useMakeItWork } from '@/components/iq-verdict/make-it-work/useMakeItWork'
import {
  CASH_OPTIONS,
  OCCUPANCY_OPTIONS,
  PRIORITY_OPTIONS,
  TERMS_OPTIONS,
  describeCashChoice,
} from '@/components/iq-verdict/make-it-work/wizardMapping'

export interface MakeItWorkAddressParts {
  street: string
  city?: string
  state?: string
  zip?: string
}

export interface MakeItWorkWizardProps {
  open: boolean
  onClose: () => void
  /** Where the wizard was opened from — analytics only. */
  source: 'tile' | 'cta' | 'save_tile'
  baseInputs: Record<string, unknown> | null
  address: string
  addressParts: MakeItWorkAddressParts
  zpid?: string | null
  latitude?: number | null
  longitude?: number | null
  listPrice: number
  targetBuyPrice: number | null
  incomeValue: number | null
  unitCount: number | null
  focusFamily: FourWayFamily | null
  /** Deal already works at asking: skip the questions and offer the save. */
  saveOnly: boolean
  isAuthenticated: boolean
  /** Snapshot persisted with the saved property (same shape `useSaveProperty` sends). */
  propertySnapshot: Record<string, unknown>
  /** Signed-in save: caller persists the property and applies the scenario. */
  onSaveAuthenticated: (structure: DealStructure | null) => Promise<void>
  onOpenInStrategy: (structure: DealStructure, index: number) => void
}

function ProgressDots({ total, current }: { total: number; current: number }): ReactNode {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 999,
            background: i <= current ? 'var(--accent-sky)' : 'var(--border-default)',
            transition: 'width 160ms ease',
          }}
        />
      ))}
    </div>
  )
}

export function MakeItWorkWizard({
  open,
  onClose,
  source,
  baseInputs,
  address,
  addressParts,
  zpid,
  latitude,
  longitude,
  listPrice,
  targetBuyPrice,
  incomeValue,
  unitCount,
  focusFamily,
  saveOnly,
  isAuthenticated,
  propertySnapshot,
  onSaveAuthenticated,
  onOpenInStrategy,
}: MakeItWorkWizardProps): ReactNode {
  const wizard = useMakeItWork({
    open,
    baseInputs,
    address,
    listPrice,
    targetBuyPrice,
    incomeValue,
    unitCount,
    focusFamily,
    saveOnly,
  })

  useEffect(() => {
    if (!open) return
    trackEvent('make_it_work_opened', {
      source,
      focus_family: focusFamily ?? undefined,
      save_only: saveOnly,
    })
  }, [open, source, focusFamily, saveOnly])

  const handleClaim = useCallback(
    async (email: string) => {
      const structure = wizard.recommended
      const index = structure ? Math.max(0, wizard.paths.findIndex((p) => p.id === structure.id)) : 0
      await claimPlan({
        email,
        address,
        address_parts: addressParts,
        zpid: zpid ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        property_snapshot: propertySnapshot,
        scenario: structure ? buildScenarioPayload(structure, index) : null,
        wizard_answers: wizard.answers,
        narrative: wizard.narrative,
      })
    },
    [wizard.recommended, wizard.paths, wizard.answers, wizard.narrative, address, addressParts, zpid, latitude, longitude, propertySnapshot],
  )

  const handleOpenInStrategy = useCallback(
    (structure: DealStructure) => {
      const index = Math.max(0, wizard.paths.findIndex((p) => p.id === structure.id))
      onClose()
      onOpenInStrategy(structure, index)
    },
    [wizard.paths, onClose, onOpenInStrategy],
  )

  const showBack = wizard.phase === 'questions' ? wizard.stepIndex > 0 : wizard.phase === 'result' && !saveOnly

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      aria-label="Make this deal work for you"
      panelClassName="max-h-[92vh] flex flex-col"
    >
      <div className="flex items-center justify-between gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={wizard.back}
            className="inline-flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: 0 }}
          >
            <ChevronLeft size={16} aria-hidden="true" /> Back
          </button>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Make it work
          </span>
        )}
        {wizard.phase === 'questions' && (
          <ProgressDots total={wizard.steps.length} current={wizard.stepIndex} />
        )}
      </div>

      <div
        className="mt-4 overflow-y-auto"
        style={{ maxHeight: 'calc(92vh - 120px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {wizard.phase === 'questions' && wizard.currentStep === 'cash' && (
          <ChoiceStep
            eyebrow="Question 1"
            question="How much cash can you put into this deal?"
            whyWeAsk="Down payment plus closing costs. This sets the loan size the plan is built around."
            options={CASH_OPTIONS}
            selected={wizard.answers.cash}
            onSelect={wizard.answerCash}
            preview={(id) => describeCashChoice(id, listPrice)}
          />
        )}
        {wizard.phase === 'questions' && wizard.currentStep === 'priority' && (
          <ChoiceStep
            eyebrow="Question 2"
            question="What matters most to you on this one?"
            whyWeAsk="Every gap can be closed a few ways. This decides which one we lead with."
            options={PRIORITY_OPTIONS}
            selected={wizard.answers.priority}
            onSelect={wizard.answerPriority}
          />
        )}
        {wizard.phase === 'questions' && wizard.currentStep === 'terms' && (
          <ChoiceStep
            eyebrow="Question 3"
            question="How open are you to creative terms?"
            whyWeAsk="Seller financing can close a gap a price cut can't, but it adds a conversation. Your call."
            options={TERMS_OPTIONS}
            selected={wizard.answers.terms}
            onSelect={wizard.answerTerms}
          />
        )}
        {wizard.phase === 'questions' && wizard.currentStep === 'occupancy' && (
          <ChoiceStep
            eyebrow="One more"
            question="Would you live in this property?"
            whyWeAsk="Owner-occupants qualify for low-down loans that investors don't. It can change the whole plan."
            options={OCCUPANCY_OPTIONS}
            selected={
              wizard.answers.ownerOccupy == null ? null : wizard.answers.ownerOccupy ? 'yes' : 'no'
            }
            onSelect={(v) => wizard.answerOccupancy(v === 'yes')}
          />
        )}

        {wizard.phase === 'computing' && (
          <div className="flex flex-col items-center gap-3 py-10 text-center" aria-busy="true">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent-sky)' }}
            />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
              Building your plan…
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Re-running the numbers with your answers.
            </p>
          </div>
        )}

        {wizard.phase === 'error' && (
          <div className="flex flex-col items-start gap-3 py-6">
            <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--text-heading)' }}>
              {wizard.errorMessage}
            </p>
            <button
              type="button"
              onClick={wizard.retry}
              className="rounded-full px-5 py-2.5 text-sm font-bold"
              style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
            >
              Try again
            </button>
          </div>
        )}

        {wizard.phase === 'result' && (
          <>
            {wizard.recommended == null && !saveOnly ? (
              <div className="flex flex-col gap-3 py-2">
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-heading)' }}>
                  No plan clears the gap on your terms
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-body)' }}>
                  With those answers, none of the four ways gets this property to positive cash flow.
                  That is a real answer, not a failure. Loosen one constraint and we will re-run it.
                </p>
                <button
                  type="button"
                  onClick={wizard.restart}
                  className="self-start rounded-full px-5 py-2.5 text-sm font-bold"
                  style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
                >
                  Change my answers
                </button>
              </div>
            ) : (
              <PlanResult
                structure={wizard.recommended}
                alternatives={wizard.paths}
                numbers={wizard.numbers}
                narrative={wizard.narrative}
                narrativeLoading={wizard.narrativeLoading}
                onSelectAlternative={wizard.selectAlternative}
                onOpenInStrategy={handleOpenInStrategy}
              >
                <SavePlanForm
                  isAuthenticated={isAuthenticated}
                  onSaveAuthenticated={() => onSaveAuthenticated(wizard.recommended)}
                  onClaim={handleClaim}
                  family={wizard.recommended?.family ?? null}
                />
              </PlanResult>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
