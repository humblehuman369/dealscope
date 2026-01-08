'use client'

import React from 'react'
import { Target, Award, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react'
import { ScoreItem, DealScoreData, GradeLevel } from './types'

/**
 * DealScoreDisplay Component
 * 
 * Displays a comprehensive deal score with visual ring, breakdown bars,
 * and strengths/weaknesses analysis.
 * 
 * Features:
 * - Animated score ring (0-100)
 * - Letter grade (A-F)
 * - Score breakdown by category
 * - Strengths and areas of concern
 */

interface DealScoreDisplayProps {
  data: DealScoreData
  strengths?: string[]
  weaknesses?: string[]
}

export function DealScoreDisplay({ data, strengths = [], weaknesses = [] }: DealScoreDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Score Ring */}
      <div className="flex flex-col items-center">
        <ScoreRing score={data.overall} grade={data.grade as GradeLevel} />
        
        {/* Verdict */}
        <div className={`mt-3 px-4 py-2 rounded-lg text-center ${getVerdictClasses(data.overall)}`}>
          <div className="text-[0.78rem] font-semibold text-white">{data.verdict}</div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
        <h4 className="text-[0.68rem] font-bold text-white/60 uppercase tracking-wide mb-3">
          Score Breakdown
        </h4>
        <div className="space-y-2.5">
          {data.items.map((item, index) => (
            <ScoreBar key={index} item={item} />
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Strengths */}
          <div className="bg-green-500/[0.08] border border-green-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <h4 className="text-[0.65rem] font-bold text-green-500 uppercase">Strengths</h4>
            </div>
            <div className="space-y-1.5">
              {strengths.length > 0 ? (
                strengths.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[0.68rem] text-green-500/80">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {s}
                  </div>
                ))
              ) : (
                <span className="text-[0.65rem] text-green-500/50">No notable strengths</span>
              )}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-yellow-500/[0.08] border border-yellow-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              <h4 className="text-[0.65rem] font-bold text-yellow-500 uppercase">Concerns</h4>
            </div>
            <div className="space-y-1.5">
              {weaknesses.length > 0 ? (
                weaknesses.slice(0, 3).map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[0.68rem] text-yellow-500/80">
                    <span className="text-yellow-500 mt-0.5">!</span>
                    {w}
                  </div>
                ))
              ) : (
                <span className="text-[0.65rem] text-yellow-500/50">No major concerns</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getVerdictClasses(score: number): string {
  if (score >= 80) return 'bg-green-500/20 border border-green-500/30'
  if (score >= 60) return 'bg-blue-500/20 border border-blue-500/30'
  if (score >= 40) return 'bg-yellow-500/20 border border-yellow-500/30'
  return 'bg-red-500/20 border border-red-500/30'
}

interface ScoreRingProps {
  score: number
  grade: GradeLevel
  size?: number
}

function ScoreRing({ score, grade, size = 140 }: ScoreRingProps) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  const getColors = () => {
    if (score >= 80) return { stroke: '#22c55e', text: 'text-green-500', glow: 'rgba(34,197,94,0.3)' }
    if (score >= 60) return { stroke: '#3b82f6', text: 'text-blue-500', glow: 'rgba(59,130,246,0.3)' }
    if (score >= 40) return { stroke: '#eab308', text: 'text-yellow-500', glow: 'rgba(234,179,8,0.3)' }
    return { stroke: '#ef4444', text: 'text-red-500', glow: 'rgba(239,68,68,0.3)' }
  }

  const colors = getColors()

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-white/10"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ 
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
            transition: 'stroke-dashoffset 1s ease-out'
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-3xl font-extrabold ${colors.text}`}>{score}</div>
        <div className={`text-lg font-bold ${colors.text}`}>{grade}</div>
      </div>
    </div>
  )
}

interface ScoreBarProps {
  item: ScoreItem
}

function ScoreBar({ item }: ScoreBarProps) {
  const percentage = (item.score / item.maxScore) * 100
  
  const getBarColor = () => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-blue-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[0.72rem] text-white/70">{item.label}</span>
        <span className="text-[0.72rem] font-semibold text-white">
          {item.score}/{item.maxScore}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${item.fillPercent}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Helper function to create deal score data from metrics
 */
export function calculateDealScoreData(
  metrics: {
    cashFlow: number
    cashOnCash: number
    capRate: number
    onePercentRule: number
    dscr: number
    equityPotential: number
    riskBuffer: number
  }
): DealScoreData {
  // Score calculations (each out of its max)
  const cashFlowScore = Math.min(20, Math.max(0, (metrics.cashFlow / 500) * 20))
  const cocScore = Math.min(20, Math.max(0, (metrics.cashOnCash / 0.12) * 20))
  const capScore = Math.min(15, Math.max(0, (metrics.capRate / 0.06) * 15))
  const onePercentScore = Math.min(15, Math.max(0, metrics.onePercentRule * 15))
  const dscrScore = Math.min(15, Math.max(0, ((metrics.dscr - 0.5) / 1.0) * 15))
  const equityScore = Math.min(10, Math.max(0, (metrics.equityPotential / 0.2) * 10))
  const riskScore = Math.min(5, Math.max(0, metrics.riskBuffer * 5))

  const overall = Math.round(cashFlowScore + cocScore + capScore + onePercentScore + dscrScore + equityScore + riskScore)

  const getGrade = (score: number): string => {
    if (score >= 85) return 'A'
    if (score >= 70) return 'B'
    if (score >= 55) return 'C'
    if (score >= 40) return 'D'
    return 'F'
  }

  const getVerdict = (score: number): string => {
    if (score >= 85) return 'Excellent Investment!'
    if (score >= 70) return 'Strong Deal'
    if (score >= 55) return 'Decent Opportunity'
    if (score >= 40) return 'Needs Negotiation'
    return 'Not Recommended'
  }

  return {
    overall,
    grade: getGrade(overall),
    verdict: getVerdict(overall),
    items: [
      { label: 'Cash Flow', score: Math.round(cashFlowScore), maxScore: 20, fillPercent: (cashFlowScore / 20) * 100 },
      { label: 'Cash-on-Cash', score: Math.round(cocScore), maxScore: 20, fillPercent: (cocScore / 20) * 100 },
      { label: 'Cap Rate', score: Math.round(capScore), maxScore: 15, fillPercent: (capScore / 15) * 100 },
      { label: '1% Rule', score: Math.round(onePercentScore), maxScore: 15, fillPercent: (onePercentScore / 15) * 100 },
      { label: 'DSCR', score: Math.round(dscrScore), maxScore: 15, fillPercent: (dscrScore / 15) * 100 },
      { label: 'Equity Potential', score: Math.round(equityScore), maxScore: 10, fillPercent: (equityScore / 10) * 100 },
      { label: 'Risk Buffer', score: Math.round(riskScore), maxScore: 5, fillPercent: (riskScore / 5) * 100 }
    ]
  }
}

/**
 * DealScoreCompact Component
 * 
 * A compact version showing just score and grade.
 */

interface DealScoreCompactProps {
  score: number
  grade: string
}

export function DealScoreCompact({ score, grade }: DealScoreCompactProps) {
  const getColorClasses = () => {
    if (score >= 80) return 'text-green-500 bg-green-500/20 border-green-500/30'
    if (score >= 60) return 'text-blue-500 bg-blue-500/20 border-blue-500/30'
    if (score >= 40) return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30'
    return 'text-red-500 bg-red-500/20 border-red-500/30'
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getColorClasses()}`}>
      <Award className="w-4 h-4" />
      <span className="font-bold">{score}</span>
      <span className="font-semibold">{grade}</span>
    </div>
  )
}

export default DealScoreDisplay
