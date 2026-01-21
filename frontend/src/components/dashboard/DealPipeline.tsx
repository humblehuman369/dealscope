'use client'

import { Layers } from 'lucide-react'

interface PipelineData {
  watching: number
  analyzing: number
  negotiating: number
  underContract: number
}

interface DealPipelineProps {
  pipeline: PipelineData
  isLoading?: boolean
}

export function DealPipeline({ pipeline, isLoading }: DealPipelineProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-navy-700 rounded w-1/3 mb-4"></div>
        <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded-full mb-4"></div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center">
              <div className="h-6 bg-gray-200 dark:bg-navy-700 rounded mb-1 mx-auto w-8"></div>
              <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded w-14 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stages = [
    { label: 'Watching', count: pipeline.watching, color: 'bg-slate-400' },
    { label: 'Analyzing', count: pipeline.analyzing, color: 'bg-blue-500' },
    { label: 'Negotiating', count: pipeline.negotiating, color: 'bg-amber-500' },
    { label: 'Under Contract', count: pipeline.underContract, color: 'bg-teal-500' },
  ]

  const total = Object.values(pipeline).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Deal Pipeline</h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">{total} total deals</span>
      </div>

      {/* Pipeline Bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-slate-100 dark:bg-navy-700">
        {stages.map((stage, i) => (
          <div
            key={i}
            className={`${stage.color} transition-all`}
            style={{ width: total > 0 ? `${(stage.count / total) * 100}%` : '0%' }}
          />
        ))}
      </div>

      {/* Stage Labels */}
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage, i) => (
          <div key={i} className="text-center">
            <div className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{stage.count}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">{stage.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
