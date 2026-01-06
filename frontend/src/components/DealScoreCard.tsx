'use client'

import { useMemo } from 'react'
import {
  Award, TrendingUp, TrendingDown, CheckCircle, AlertTriangle,
  DollarSign, Percent, Target, Shield, Zap
} from 'lucide-react'
import { calculateDealScore, DealScoreBreakdown, DealMetrics } from '@/lib/analytics'

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

// ============================================
// SCORE RING
// ============================================

function ScoreRing({ score, grade, size = 180 }: { score: number; grade: string; size?: number }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  
  // Color based on score
  const getColor = () => {
    if (score >= 80) return { stroke: '#10b981', bg: 'from-emerald-400 to-green-500', text: 'text-emerald-600' }
    if (score >= 60) return { stroke: '#3b82f6', bg: 'from-blue-400 to-indigo-500', text: 'text-blue-600' }
    if (score >= 40) return { stroke: '#f59e0b', bg: 'from-amber-400 to-orange-500', text: 'text-amber-600' }
    return { stroke: '#ef4444', bg: 'from-red-400 to-rose-500', text: 'text-red-600' }
  }
  
  const colors = getColor()
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200 dark:stroke-navy-600"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-3xl font-bold ${colors.text}`}>{score}</div>
        <div className={`text-lg font-semibold bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}>
          {grade}
        </div>
      </div>
    </div>
  )
}

// ============================================
// SCORE BAR
// ============================================

function ScoreBar({ 
  label, 
  score, 
  maxScore, 
  icon: Icon 
}: { 
  label: string
  score: number
  maxScore: number
  icon: any
}) {
  const percentage = (score / maxScore) * 100
  
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-600 dark:text-gray-300">{label}</span>
        </div>
        <span className="font-medium text-gray-700 dark:text-white">{score}/{maxScore}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-navy-600 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            percentage >= 80 ? 'bg-emerald-500' :
            percentage >= 60 ? 'bg-blue-500' :
            percentage >= 40 ? 'bg-amber-500' :
            'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// MAIN DEAL SCORE COMPONENT
// ============================================

interface DealScoreCardProps {
  metrics: DealMetrics
  compact?: boolean
}

export default function DealScoreCard({ metrics, compact = false }: DealScoreCardProps) {
  const score = useMemo(() => calculateDealScore(metrics), [metrics])
  
  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={score.overall} grade={score.grade} size={80} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">{score.verdict}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {score.strengths.slice(0, 2).map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-emerald-400">Deal Score</h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400">Comprehensive deal analysis</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Score Ring */}
        <div className="flex flex-col items-center">
          <ScoreRing score={score.overall} grade={score.grade} size={140} />
          
          <div className={`mt-3 px-4 py-2 rounded-lg text-center ${
            score.overall >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700' :
            score.overall >= 50 ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' :
            score.overall >= 30 ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700' :
            'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
          }`}>
            <div className="text-[14px] font-medium text-gray-900 dark:text-white">{score.verdict}</div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-2">Score Breakdown</h3>
          
          <ScoreBar label="Cash Flow" score={score.cashFlow} maxScore={20} icon={DollarSign} />
          <ScoreBar label="Cash-on-Cash" score={score.cashOnCash} maxScore={20} icon={Percent} />
          <ScoreBar label="Cap Rate" score={score.capRate} maxScore={15} icon={TrendingUp} />
          <ScoreBar label="1% Rule" score={score.onePercentRule} maxScore={15} icon={Target} />
          <ScoreBar label="Debt Service Coverage Ratio" score={score.dscr} maxScore={15} icon={Shield} />
          <ScoreBar label="Equity Potential" score={score.equityPotential} maxScore={10} icon={Zap} />
          <ScoreBar label="Risk Buffer" score={score.riskLevel} maxScore={5} icon={Shield} />
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Strengths */}
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <h4 className="text-xs font-medium text-emerald-800">Strengths</h4>
          </div>
          <div className="space-y-1">
            {score.strengths.length > 0 ? (
              score.strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  {s}
                </div>
              ))
            ) : (
              <div className="text-xs text-emerald-600 opacity-70">No notable strengths</div>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <h4 className="text-xs font-medium text-amber-800">Areas of Concern</h4>
          </div>
          <div className="space-y-1">
            {score.weaknesses.length > 0 ? (
              score.weaknesses.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  {w}
                </div>
              ))
            ) : (
              <div className="text-xs text-amber-600 opacity-70">No major concerns</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gray-50 dark:bg-navy-700/50 rounded-lg p-2.5 text-center">
          <div className="text-[14px] font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.monthlyCashFlow)}</div>
          <div className="text-[13px] font-bold text-gray-600 dark:text-white uppercase tracking-wide">Monthly CF</div>
        </div>
        <div className="bg-gray-50 dark:bg-navy-700/50 rounded-lg p-2.5 text-center">
          <div className="text-[14px] font-bold text-gray-900 dark:text-white">{(metrics.cashOnCash * 100).toFixed(1)}%</div>
          <div className="text-[13px] font-bold text-gray-600 dark:text-white uppercase tracking-wide">CoC Return</div>
        </div>
        <div className="bg-gray-50 dark:bg-navy-700/50 rounded-lg p-2.5 text-center">
          <div className="text-[14px] font-bold text-gray-900 dark:text-white">{(metrics.capRate * 100).toFixed(1)}%</div>
          <div className="text-[13px] font-bold text-gray-600 dark:text-white uppercase tracking-wide">Cap Rate</div>
        </div>
        <div className="bg-gray-50 dark:bg-navy-700/50 rounded-lg p-2.5 text-center">
          <div className="text-[14px] font-bold text-gray-900 dark:text-white">{metrics.dscr.toFixed(2)}</div>
          <div className="text-[13px] font-bold text-gray-600 dark:text-white uppercase tracking-wide">Debt Service Coverage Ratio</div>
        </div>
      </div>
    </div>
  )
}
