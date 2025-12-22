'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Loader2, Home } from 'lucide-react'
import dynamic from 'next/dynamic'

const RehabEstimator = dynamic(() => import('@/components/RehabEstimator'), { 
  loading: () => (
    <div className="animate-pulse bg-gray-100 rounded-2xl h-96" />
  )
})

function RehabPageContent() {
  const searchParams = useSearchParams()
  const address = searchParams.get('address') || ''
  const initialBudget = parseInt(searchParams.get('budget') || '25000', 10)

  return (
    <div className="min-h-screen bg-[#e8eeef]">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <a 
              href={address ? `/property?address=${encodeURIComponent(address)}` : '/'}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
            </a>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Rehab Estimator</h1>
              {address && (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Home className="w-3.5 h-3.5" />
                  <span className="truncate max-w-md">{address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top gradient line */}
        <div className="h-0.5 bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 rounded-t-lg" />
        
        {/* Main Content */}
        <div className="bg-white rounded-b-lg border border-t-0 border-gray-100 p-6">
          <RehabEstimator initialBudget={initialBudget} />
        </div>

        {/* Back to Property Link */}
        {address && (
          <div className="mt-6 text-center">
            <a 
              href={`/property?address=${encodeURIComponent(address)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-gray-600 font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Property Analysis
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RehabPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e8eeef] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <RehabPageContent />
    </Suspense>
  )
}

