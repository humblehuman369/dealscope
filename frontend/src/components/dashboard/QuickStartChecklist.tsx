'use client'

import { 
  Search, 
  User, 
  Sparkles, 
  Check, 
  Circle,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface QuickStartStep {
  id: string
  title: string
  description: string
  duration: string
  href: string
  icon: React.ElementType
  completed: boolean
}

interface QuickStartChecklistProps {
  hasAnalyzedProperty?: boolean
  hasCompletedProfile?: boolean
  hasViewedSample?: boolean
  onViewSample?: () => void
}

export function QuickStartChecklist({ 
  hasAnalyzedProperty = false, 
  hasCompletedProfile = false,
  hasViewedSample = false,
  onViewSample
}: QuickStartChecklistProps) {
  const steps: QuickStartStep[] = [
    {
      id: 'analyze',
      title: 'Analyze a property',
      description: 'Search any address for instant investment analysis',
      duration: '2 min',
      href: '/property',
      icon: Search,
      completed: hasAnalyzedProperty,
    },
    {
      id: 'profile',
      title: 'Set your investor profile',
      description: 'Get personalized strategy recommendations',
      duration: '1 min',
      href: '/profile',
      icon: User,
      completed: hasCompletedProfile,
    },
    {
      id: 'sample',
      title: 'Explore a sample deal',
      description: 'See how InvestIQ breaks down a real property',
      duration: '30 sec',
      href: '#',
      icon: Sparkles,
      completed: hasViewedSample,
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const isAllComplete = completedCount === steps.length

  if (isAllComplete) {
    return null // Hide when all steps are complete
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Sparkles size={16} className="text-teal-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Quick Start</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Get started in minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full ${
                step.completed 
                  ? 'bg-teal-500' 
                  : 'bg-slate-200 dark:bg-navy-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon
          const isClickable = step.id === 'sample' ? !!onViewSample : true

          const content = (
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                step.completed 
                  ? 'bg-teal-50/50 dark:bg-teal-900/10' 
                  : 'bg-slate-50 dark:bg-navy-700/50 hover:bg-slate-100 dark:hover:bg-navy-700'
              } ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={step.id === 'sample' && onViewSample ? onViewSample : undefined}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                step.completed 
                  ? 'bg-teal-500/20' 
                  : 'bg-white dark:bg-navy-600'
              }`}>
                {step.completed ? (
                  <Check size={16} className="text-teal-600 dark:text-teal-400" />
                ) : (
                  <Icon size={16} className="text-slate-500 dark:text-slate-400" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    step.completed 
                      ? 'text-teal-700 dark:text-teal-400' 
                      : 'text-slate-800 dark:text-white'
                  }`}>
                    {step.title}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    step.completed 
                      ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' 
                      : 'bg-slate-200 dark:bg-navy-600 text-slate-500 dark:text-slate-400'
                  }`}>
                    {step.completed ? 'Done' : step.duration}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              )}
            </div>
          )

          // For sample step, just render the div (onClick handles it)
          if (step.id === 'sample') {
            return <div key={step.id}>{content}</div>
          }

          // For other steps, wrap in Link
          return (
            <Link key={step.id} href={step.href}>
              {content}
            </Link>
          )
        })}
      </div>

      {/* Progress text */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-700">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          {completedCount} of {steps.length} completed
        </p>
      </div>
    </div>
  )
}
