/**
 * useOnboarding — manages the 5-step onboarding flow.
 *
 * Saves progress per step via POST /api/v1/users/me/onboarding,
 * and marks complete via POST /api/v1/users/me/onboarding/complete.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { SESSION_QUERY_KEY } from './useSession';

export interface OnboardingData {
  investment_experience: string;
  preferred_strategies: string[];
  financing_type: string;
  down_payment_pct: number;
  investment_budget_min: number;
  investment_budget_max: number;
  target_cash_on_cash: number;
  target_cap_rate: number;
  risk_tolerance: string;
  target_markets: string[];
}

export const ONBOARDING_DEFAULTS: OnboardingData = {
  investment_experience: 'beginner',
  preferred_strategies: [],
  financing_type: 'conventional',
  down_payment_pct: 20,
  investment_budget_min: 100000,
  investment_budget_max: 500000,
  target_cash_on_cash: 8,
  target_cap_rate: 6,
  risk_tolerance: 'moderate',
  target_markets: [],
};

export const TOTAL_STEPS = 5;

export function useOnboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ ...ONBOARDING_DEFAULTS });
  const qc = useQueryClient();

  const saveStepMutation = useMutation({
    mutationFn: (payload: { step: number; data: Partial<OnboardingData> }) =>
      api.post('/api/v1/users/me/onboarding', payload),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post('/api/v1/users/me/onboarding/complete'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  const updateField = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const nextStep = useCallback(() => {
    saveStepMutation.mutate({ step, data });
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }, [step, data, saveStepMutation]);

  const prevStep = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const complete = useCallback(() => {
    saveStepMutation.mutate({ step, data });
    completeMutation.mutate();
  }, [step, data, saveStepMutation, completeMutation]);

  return {
    step,
    data,
    updateField,
    nextStep,
    prevStep,
    complete,
    isSaving: saveStepMutation.isPending || completeMutation.isPending,
    isComplete: completeMutation.isSuccess,
    totalSteps: TOTAL_STEPS,
  };
}
