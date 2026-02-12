'use client'

/**
 * IQ Analyzing Page
 * Route: /analyzing?address=...
 * 
 * Loading screen shown while IQ analyzes all 6 strategies.
 * Shows progressive profiling prompt (if applicable) during the animation.
 * Only navigates to the verdict page once BOTH the animation is complete
 * AND the profiling prompt has been dismissed.
 */

import { useCallback, useMemo, useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { IQAnalyzingScreen, IQProperty } from '@/components/iq-verdict'
import { useProgressiveProfiling } from '@/hooks/useProgressiveProfiling'
import { ProgressiveProfilingPrompt } from '@/components/profile/ProgressiveProfilingPrompt'

function AnalyzingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const address = searchParams.get('address') || ''
  const price = searchParams.get('price')
  const beds = searchParams.get('beds')
  const baths = searchParams.get('baths')
  const sqft = searchParams.get('sqft')
  const condition = searchParams.get('condition')
  const location = searchParams.get('location')

  // Build property object from query params
  const property = useMemo((): IQProperty => ({
    address: address || 'Unknown Address',
    price: price ? parseInt(price, 10) : 350000,
    beds: beds ? parseInt(beds, 10) : 3,
    baths: baths ? parseFloat(baths) : 2,
    sqft: sqft ? parseInt(sqft, 10) : 1500,
  }), [address, price, beds, baths, sqft])

  // Progressive profiling
  const {
    showPrompt,
    currentQuestion,
    trackAnalysis,
    handleAnswer: rawHandleAnswer,
    handleSkip: rawHandleSkip,
    handleClose: rawHandleClose,
  } = useProgressiveProfiling()

  // Track whether the animation has finished and whether the prompt has been resolved
  const [animationDone, setAnimationDone] = useState(false)
  const [promptResolved, setPromptResolved] = useState(false)
  const hasTracked = useRef(false)

  // Fire trackAnalysis once on mount (each search = one analysis)
  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true
      // Small delay so the animation starts before the prompt appears
      const timer = setTimeout(() => {
        trackAnalysis()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [trackAnalysis])

  // If the hook decided not to show a prompt, mark it resolved immediately
  useEffect(() => {
    if (hasTracked.current && !showPrompt) {
      setPromptResolved(true)
    }
  }, [showPrompt])

  // Wrap answer/skip/close to also mark the prompt as resolved
  const handleAnswer = useCallback((answer: any) => {
    rawHandleAnswer(answer)
    setPromptResolved(true)
  }, [rawHandleAnswer])

  const handleSkip = useCallback(() => {
    rawHandleSkip()
    setPromptResolved(true)
  }, [rawHandleSkip])

  const handleClose = useCallback(() => {
    rawHandleClose()
    setPromptResolved(true)
  }, [rawHandleClose])

  // Build the verdict URL (thread condition/location through)
  const verdictUrl = useMemo(() => {
    const queryParams = new URLSearchParams({
      address: encodeURIComponent(property.address),
      price: property.price.toString(),
      beds: property.beds.toString(),
      baths: property.baths.toString(),
      sqft: (property.sqft || 0).toString(),
    })
    if (condition) queryParams.set('condition', condition)
    if (location) queryParams.set('location', location)
    return `/verdict?${queryParams.toString()}`
  }, [property, condition, location])

  // Navigate to verdict only when BOTH conditions are met
  useEffect(() => {
    if (animationDone && promptResolved) {
      router.replace(verdictUrl)
    }
  }, [animationDone, promptResolved, verdictUrl, router])

  // Called when the analyzing animation finishes
  const handleAnalysisComplete = useCallback(() => {
    setAnimationDone(true)
  }, [])

  return (
    <>
      <IQAnalyzingScreen
        property={property}
        onAnalysisComplete={handleAnalysisComplete}
        minimumDisplayTime={2800}
      />

      {/* Progressive profiling prompt — overlays on the animation */}
      {showPrompt && currentQuestion && (
        <ProgressiveProfilingPrompt
          question={currentQuestion}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          onClose={handleClose}
        />
      )}
    </>
  )
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AnalyzingContent />
    </Suspense>
  )
}
