'use client'

/**
 * useProgressiveProfiling Hook
 * 
 * Manages progressive profiling state and determines when to show profile prompts.
 * Shows one question after each analysis until profile is complete.
 */

import { useState, useEffect, useCallback } from 'react'
import { ProfileQuestion } from '../components/profile/ProgressiveProfilingPrompt'
import { api } from '@/lib/api-client'

const STORAGE_KEY = 'dealgapiq-progressive-profile'

interface ProgressiveProfileState {
  analysisCount: number
  completedQuestions: ProfileQuestion[]
  experience?: string
  strategies?: string[]
  budgetMin?: number
  budgetMax?: number
  skippedAt?: number // Timestamp of last skip (to not ask again immediately)
}

const DEFAULT_STATE: ProgressiveProfileState = {
  analysisCount: 0,
  completedQuestions: [],
}

// Question order for progressive profiling
const QUESTION_ORDER: ProfileQuestion[] = ['experience', 'strategies', 'budget']

export function useProgressiveProfiling() {
  const [state, setState] = useState<ProgressiveProfileState>(DEFAULT_STATE)
  const [showPrompt, setShowPrompt] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<ProfileQuestion | null>(null)

  // Load state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ProgressiveProfileState
        setState(parsed)
      }
    } catch (e) {
      console.error('Error loading progressive profile state:', e)
    }
  }, [])

  // Save state to localStorage
  const saveState = useCallback((newState: ProgressiveProfileState) => {
    setState(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    }
  }, [])

  // Determine next question to ask
  const getNextQuestion = useCallback((): ProfileQuestion | null => {
    for (const question of QUESTION_ORDER) {
      if (!state.completedQuestions.includes(question)) {
        return question
      }
    }
    return null
  }, [state.completedQuestions])

  // Check if profile is complete
  const isProfileComplete = useCallback(() => {
    return QUESTION_ORDER.every(q => state.completedQuestions.includes(q))
  }, [state.completedQuestions])

  // Track that an analysis was completed
  const trackAnalysis = useCallback(() => {
    const newState = {
      ...state,
      analysisCount: state.analysisCount + 1,
    }
    saveState(newState)

    // Determine if we should show a prompt
    // Show after 1st analysis, then after 2nd, then after 3rd
    const nextQuestion = getNextQuestion()
    
    // Don't show if profile is complete
    if (!nextQuestion) return

    // Don't show if user skipped recently (within 5 minutes)
    if (state.skippedAt && Date.now() - state.skippedAt < 5 * 60 * 1000) return

    // Show prompt after each analysis (up to 3 questions)
    const questionIndex = QUESTION_ORDER.indexOf(nextQuestion)
    if (newState.analysisCount >= questionIndex + 1) {
      setCurrentQuestion(nextQuestion)
      setShowPrompt(true)
    }
  }, [state, saveState, getNextQuestion])

  // Handle answer
  const handleAnswer = useCallback((answer: any) => {
    if (!currentQuestion) return

    const newState = {
      ...state,
      completedQuestions: [...state.completedQuestions, currentQuestion],
      ...(answer.investment_experience && { experience: answer.investment_experience }),
      ...(answer.preferred_strategies && { strategies: answer.preferred_strategies }),
      ...(answer.investment_budget_min !== undefined && { budgetMin: answer.investment_budget_min }),
      ...(answer.investment_budget_max !== undefined && { budgetMax: answer.investment_budget_max }),
    }
    saveState(newState)
    setShowPrompt(false)
    setCurrentQuestion(null)

    // Sync with backend if user is logged in
    syncWithBackend(answer)
  }, [state, currentQuestion, saveState])

  // Handle skip
  const handleSkip = useCallback(() => {
    const newState = {
      ...state,
      skippedAt: Date.now(),
    }
    saveState(newState)
    setShowPrompt(false)
    setCurrentQuestion(null)
  }, [state, saveState])

  // Handle close
  const handleClose = useCallback(() => {
    setShowPrompt(false)
    setCurrentQuestion(null)
  }, [])

  // Sync answer with backend
  const syncWithBackend = async (answer: any) => {
    try {
      await api.patch('/api/v1/users/me/profile', answer)
    } catch (e) {
      // Silent fail - profile is saved locally regardless
      console.warn('Failed to sync profile with backend:', e)
    }
  }

  return {
    // State
    analysisCount: state.analysisCount,
    showPrompt,
    currentQuestion,
    isProfileComplete: isProfileComplete(),
    
    // Profile data
    experience: state.experience,
    strategies: state.strategies,
    budgetMin: state.budgetMin,
    budgetMax: state.budgetMax,
    
    // Actions
    trackAnalysis,
    handleAnswer,
    handleSkip,
    handleClose,
  }
}

export default useProgressiveProfiling
