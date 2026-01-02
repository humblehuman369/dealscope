'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
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
    <div className="min-h-screen bg-[#f5f7fa] p-2">
      <div className="max-w-[800px] mx-auto">
        {/* Main Container */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-500 to-sky-600 px-4 py-3 rounded-t-xl flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white mb-0.5">Rehab Estimator</h1>
              <p className="text-xs text-white/90">
                {address ? address : 'Build your renovation budget item by item'}
              </p>
            </div>
            <a 
              href={address ? `/property?address=${encodeURIComponent(address)}` : '/'}
              className="bg-white text-brand-500 border-none px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all"
            >
              ← Back
            </a>
          </div>

          {/* Content */}
          <div className="p-3">
            <RehabEstimator initialBudget={initialBudget} propertyAddress={address} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RehabPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <RehabPageContent />
    </Suspense>
  )
}
