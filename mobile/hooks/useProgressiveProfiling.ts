/**
 * Progressive Profiling Hook
 *
 * Manages user profile completion state and prompts across analysis sessions.
 * State persisted to AsyncStorage under dealgapiq-progressive-profile.
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/apiClient';

const STORAGE_KEY = 'dealgapiq-progressive-profile';
const SKIP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const QUESTION_ORDER: ('experience' | 'strategies' | 'budget')[] = [
  'experience',
  'strategies',
  'budget',
];

interface StoredProfile {
  analysisCount: number;
  completedQuestions: string[];
  skippedAt: number | null;
}

const DEFAULT: StoredProfile = {
  analysisCount: 0,
  completedQuestions: [],
  skippedAt: null,
};

function getNextQuestion(completed: string[]): 'experience' | 'strategies' | 'budget' | null {
  for (const q of QUESTION_ORDER) {
    if (!completed.includes(q)) return q;
  }
  return null;
}

export function useProgressiveProfiling() {
  const [analysisCount, setAnalysisCount] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);
  const [skippedAt, setSkippedAt] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredProfile>;
        setAnalysisCount(parsed.analysisCount ?? 0);
        setCompletedQuestions(parsed.completedQuestions ?? []);
        setSkippedAt(parsed.skippedAt ?? null);
      }
    } catch {
      // Ignore parse errors
    } finally {
      setLoaded(true);
    }
  }, []);

  const persistToStorage = useCallback(
    async (updates: Partial<StoredProfile>) => {
      const next = {
        analysisCount: updates.analysisCount ?? analysisCount,
        completedQuestions: updates.completedQuestions ?? completedQuestions,
        skippedAt: updates.skippedAt ?? skippedAt,
      };
      setAnalysisCount(next.analysisCount);
      setCompletedQuestions(next.completedQuestions);
      setSkippedAt(next.skippedAt);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
    },
    [analysisCount, completedQuestions, skippedAt]
  );

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const currentQuestion = getNextQuestion(completedQuestions);
  const isProfileComplete = currentQuestion === null;

  const trackAnalysis = useCallback(() => {
    const nextCount = analysisCount + 1;
    persistToStorage({ analysisCount: nextCount });

    if (!loaded) return;

    const next = getNextQuestion(completedQuestions);
    if (next === null) return;

    const now = Date.now();
    const skipCooldownPassed = skippedAt === null || now - skippedAt > SKIP_COOLDOWN_MS;

    if (skipCooldownPassed) {
      setShowPrompt(true);
    }
  }, [analysisCount, completedQuestions, skippedAt, loaded, persistToStorage]);

  const handleAnswer = useCallback(
    async (questionId: string, answer: unknown) => {
      const nextCompleted = [...completedQuestions, questionId];
      persistToStorage({ completedQuestions: nextCompleted });
      setShowPrompt(false);

      try {
        // Payload keys match frontend convention (useProgressiveProfiling.ts)
        const payload: Record<string, unknown> = {};
        if (questionId === 'experience') payload.investment_experience = answer;
        if (questionId === 'strategies') payload.preferred_strategies = answer;
        if (questionId === 'budget') {
          // Frontend sends min/max separately
          if (typeof answer === 'object' && answer !== null) {
            const budgetAnswer = answer as { min?: number; max?: number };
            payload.investment_budget_min = budgetAnswer.min;
            payload.investment_budget_max = budgetAnswer.max;
          } else {
            payload.investment_budget_min = answer;
            payload.investment_budget_max = answer;
          }
        }

        await api.patch('/api/v1/users/me/profile', payload);
      } catch {
        // Ignore API errors; local state is persisted
      }
    },
    [completedQuestions, persistToStorage]
  );

  const handleSkip = useCallback(() => {
    const now = Date.now();
    persistToStorage({ skippedAt: now });
    setShowPrompt(false);
  }, [persistToStorage]);

  const handleClose = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return {
    showPrompt,
    currentQuestion,
    trackAnalysis,
    handleAnswer,
    handleSkip,
    handleClose,
    isProfileComplete,
    analysisCount,
  };
}
