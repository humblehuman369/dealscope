'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { api } from '@/lib/api-client'
import { trackEvent } from '@/lib/eventTracking'
import { mapDealStructuresFromApi } from '@/lib/dealStructures/mapDealStructures'
import { requestPlanNarrative, type PlanNarrative } from '@/lib/api/plans'
import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'
import type { FourWayFamily } from '@/components/iq-verdict/make-it-work/fourWays'
import {
  EMPTY_ANSWERS,
  answersToVerdictOverrides,
  pickRecommended,
  stepSequence,
  type CashBucket,
  type Priority,
  type TermsOpenness,
  type WizardAnswers,
  type WizardStepId,
} from '@/components/iq-verdict/make-it-work/wizardMapping'

export type WizardPhase = 'questions' | 'computing' | 'result' | 'error'

export interface PlanNumbers {
  listPrice: number | null
  targetBuyPrice: number | null
  incomeValue: number | null
}

export interface UseMakeItWorkArgs {
  open: boolean
  /** The exact body last sent to `/api/v1/analysis/verdict` for this property. */
  baseInputs: Record<string, unknown> | null
  address: string
  listPrice: number
  targetBuyPrice: number | null
  incomeValue: number | null
  unitCount: number | null
  /** Tile the user tapped to open the wizard, if any. */
  focusFamily: FourWayFamily | null
  /** Deal already works at asking — skip questions, go straight to save. */
  saveOnly: boolean
}

export interface UseMakeItWorkResult {
  phase: WizardPhase
  steps: WizardStepId[]
  stepIndex: number
  currentStep: WizardStepId | null
  answers: WizardAnswers
  paths: DealStructure[]
  recommended: DealStructure | null
  numbers: PlanNumbers
  narrative: PlanNarrative | null
  narrativeLoading: boolean
  errorMessage: string | null
  answerCash: (v: CashBucket) => void
  answerPriority: (v: Priority) => void
  answerTerms: (v: TermsOpenness) => void
  answerOccupancy: (v: boolean) => void
  back: () => void
  retry: () => void
  restart: () => void
  selectAlternative: (structure: DealStructure) => void
}

function templateNarrative(structure: DealStructure): PlanNarrative {
  return {
    summary: structure.summary,
    pitch: structure.pitchScript ?? '',
    source: 'template',
  }
}

export function useMakeItWork({
  open,
  baseInputs,
  address,
  listPrice,
  targetBuyPrice,
  incomeValue,
  unitCount,
  focusFamily,
  saveOnly,
}: UseMakeItWorkArgs): UseMakeItWorkResult {
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS)
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<WizardPhase>(saveOnly ? 'result' : 'questions')
  const [paths, setPaths] = useState<DealStructure[]>([])
  const [recommended, setRecommended] = useState<DealStructure | null>(null)
  const [numbers, setNumbers] = useState<PlanNumbers>({ listPrice, targetBuyPrice, incomeValue })
  const [narrative, setNarrative] = useState<PlanNarrative | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const narrativeCache = useRef<Map<string, PlanNarrative>>(new Map())
  const computeGeneration = useRef(0)

  const steps = useMemo(() => stepSequence(answers, unitCount), [answers, unitCount])
  const currentStep = phase === 'questions' ? (steps[stepIndex] ?? null) : null

  const restart = useCallback(() => {
    computeGeneration.current += 1
    setAnswers(EMPTY_ANSWERS)
    setStepIndex(0)
    setPhase(saveOnly ? 'result' : 'questions')
    setPaths([])
    setRecommended(null)
    setNarrative(null)
    setNarrativeLoading(false)
    setErrorMessage(null)
  }, [saveOnly])

  // Reset every time the sheet opens so a second run starts clean.
  useEffect(() => {
    if (open) restart()
  }, [open, restart])

  const loadNarrative = useCallback(
    async (structure: DealStructure, current: WizardAnswers, generation: number) => {
      const cached = narrativeCache.current.get(structure.id)
      if (cached) {
        setNarrative(cached)
        return
      }
      setNarrativeLoading(true)
      try {
        const result = await requestPlanNarrative({
          address,
          family: structure.family,
          family_label: structure.familyLabel,
          headline: structure.headline,
          bullets: structure.bullets ?? [],
          levers: structure.levers.map((l) => ({
            label: l.label,
            before_label: l.beforeLabel,
            after_label: l.afterLabel,
          })),
          monthly_savings: structure.monthlySavings,
          cash_required: structure.cashRequired,
          list_price: listPrice,
          target_buy_price: targetBuyPrice,
          wizard_answers: current,
        })
        if (computeGeneration.current !== generation) return
        narrativeCache.current.set(structure.id, result)
        setNarrative(result)
      } catch {
        if (computeGeneration.current !== generation) return
        const fallback = templateNarrative(structure)
        narrativeCache.current.set(structure.id, fallback)
        setNarrative(fallback)
      } finally {
        if (computeGeneration.current === generation) setNarrativeLoading(false)
      }
    },
    [address, listPrice, targetBuyPrice],
  )

  const compute = useCallback(
    async (finalAnswers: WizardAnswers) => {
      if (!baseInputs) {
        setErrorMessage('We lost the property inputs. Close this and reopen it to try again.')
        setPhase('error')
        return
      }
      const generation = ++computeGeneration.current
      setPhase('computing')
      setErrorMessage(null)
      try {
        // Drop the stale Target Buy so the engine re-derives it from the new down payment,
        // and drop any localStorage dismissals — the wizard's own answers decide here.
        const {
          purchase_price: _purchase,
          dismissed_families: _dismissed,
          ...body
        } = baseInputs as Record<string, unknown>
        const request = { ...body, ...answersToVerdictOverrides(finalAnswers, listPrice) }
        const result = await api.post<Record<string, unknown>>('/api/v1/analysis/verdict', request, {
          softAuth: true,
        })
        if (computeGeneration.current !== generation) return

        const mapped = mapDealStructuresFromApi(
          (result.deal_structures ?? result.dealStructures) as Record<string, unknown> | undefined,
        )
        const nextPaths = mapped?.paths ?? []
        const pick = pickRecommended(nextPaths, finalAnswers, focusFamily)
        const num = (v: unknown): number | null =>
          typeof v === 'number' && Number.isFinite(v) ? v : null

        setPaths(nextPaths)
        setRecommended(pick)
        setNumbers({
          listPrice: num(result.list_price ?? result.listPrice) ?? listPrice,
          targetBuyPrice: num(result.purchase_price ?? result.purchasePrice) ?? targetBuyPrice,
          incomeValue: num(result.income_value ?? result.incomeValue) ?? incomeValue,
        })
        setPhase('result')
        trackEvent('make_it_work_plan_viewed', {
          recommended_family: pick?.family ?? 'none',
          recommended_id: pick?.id ?? 'none',
          path_count: nextPaths.length,
          cash: finalAnswers.cash ?? undefined,
          priority: finalAnswers.priority ?? undefined,
          terms: finalAnswers.terms ?? undefined,
        })
        if (pick) void loadNarrative(pick, finalAnswers, generation)
      } catch {
        if (computeGeneration.current !== generation) return
        setErrorMessage("We couldn't run the numbers just now. Try again in a moment.")
        setPhase('error')
      }
    },
    [baseInputs, listPrice, targetBuyPrice, incomeValue, focusFamily, loadNarrative],
  )

  const advance = useCallback(
    (next: WizardAnswers, answeredStep: WizardStepId, value: string) => {
      trackEvent('make_it_work_step', { step: answeredStep, answer: value })
      const sequence = stepSequence(next, unitCount)
      const nextIndex = sequence.indexOf(answeredStep) + 1
      if (nextIndex >= sequence.length) {
        void compute(next)
      } else {
        setStepIndex(nextIndex)
      }
    },
    [compute, unitCount],
  )

  const answerCash = useCallback(
    (v: CashBucket) => {
      const next = { ...answers, cash: v }
      setAnswers(next)
      advance(next, 'cash', v)
    },
    [answers, advance],
  )
  const answerPriority = useCallback(
    (v: Priority) => {
      const next = { ...answers, priority: v }
      setAnswers(next)
      advance(next, 'priority', v)
    },
    [answers, advance],
  )
  const answerTerms = useCallback(
    (v: TermsOpenness) => {
      const next = { ...answers, terms: v }
      setAnswers(next)
      advance(next, 'terms', v)
    },
    [answers, advance],
  )
  const answerOccupancy = useCallback(
    (v: boolean) => {
      const next = { ...answers, ownerOccupy: v }
      setAnswers(next)
      advance(next, 'occupancy', v ? 'yes' : 'no')
    },
    [answers, advance],
  )

  const back = useCallback(() => {
    if (phase !== 'questions') {
      computeGeneration.current += 1
      setPhase('questions')
      setStepIndex(Math.max(0, steps.length - 1))
      return
    }
    setStepIndex((i) => Math.max(0, i - 1))
  }, [phase, steps.length])

  const retry = useCallback(() => {
    void compute(answers)
  }, [compute, answers])

  const selectAlternative = useCallback(
    (structure: DealStructure) => {
      setRecommended(structure)
      trackEvent('make_it_work_alternative_selected', {
        family: structure.family,
        structure_id: structure.id,
      })
      void loadNarrative(structure, answers, computeGeneration.current)
    },
    [answers, loadNarrative],
  )

  return {
    phase,
    steps,
    stepIndex,
    currentStep,
    answers,
    paths,
    recommended,
    numbers,
    narrative,
    narrativeLoading,
    errorMessage,
    answerCash,
    answerPriority,
    answerTerms,
    answerOccupancy,
    back,
    retry,
    restart,
    selectAlternative,
  }
}
