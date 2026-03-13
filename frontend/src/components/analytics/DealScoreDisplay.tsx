'use client'

import React from 'react'
import { Award, CheckCircle, AlertTriangle } from 'lucide-react'
import { DealScoreData, OpportunityGrade } from './types'
import { formatCurrency } from '@/utils/formatters'

/**
 * DealScoreDisplay Component
 * 
 * Displays a comprehensive deal score based on Investment Opportunity.
 * The score shows how much discount from list price is needed to reach Income Value.
 * 
 * Features:
 * - Animated score ring (0-100)
 * - Opportunity grade (A+ to F)
 * - Discount percentage required
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
        <ScoreRing score={data.overall} grade={data.grade} />
        
        {/* Label (Strong Opportunity, etc.) */}
        <div className={`mt-3 px-4 py-2 rounded-lg text-center ${getVerdictClasses(data.overall)}`}>
          <div className="text-[0.78rem] font-semibold text-[var(--text-heading)]">{data.label}</div>
        </div>
        
        {/* Discount Info */}
        {data.discountPercent !== undefined && (
          <div className="mt-2 text-center">
            <div className="text-[0.72rem] text-[var(--text-secondary)]">
              {data.discountPercent <= 5 
                ? 'Profitable near list price'
                : `${data.discountPercent.toFixed(1)}% discount needed`
              }
            </div>
            {data.incomeValue > 0 && (
              <div className="text-[0.65rem] text-[var(--text-label)] mt-1">
                Income Value: {formatCurrency(data.incomeValue)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verdict */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3.5">
        <h4 className="text-[0.68rem] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          Assessment
        </h4>
        <div className="text-[0.78rem] text-[var(--text-heading)]">
          {data.verdict}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Strengths */}
          <div className="bg-[var(--color-green-dim)] border border-[var(--status-positive)] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-[var(--status-positive)]" />
              <h4 className="text-[0.65rem] font-bold text-[var(--status-positive)] uppercase">Strengths</h4>
            </div>
            <div className="space-y-1.5">
              {strengths.length > 0 ? (
                strengths.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[0.68rem] text-[var(--status-positive)]">
                    <span className="text-[var(--status-positive)] mt-0.5">✓</span>
                    {s}
                  </div>
                ))
              ) : (
                <span className="text-[0.65rem] text-[var(--status-positive)]">No notable strengths</span>
              )}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-[var(--color-gold-dim)] border border-[var(--status-warning)] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-warning)]" />
              <h4 className="text-[0.65rem] font-bold text-[var(--status-warning)] uppercase">Concerns</h4>
            </div>
            <div className="space-y-1.5">
              {weaknesses.length > 0 ? (
                weaknesses.slice(0, 3).map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[0.68rem] text-[var(--status-warning)]">
                    <span className="text-[var(--status-warning)] mt-0.5">!</span>
                    {w}
                  </div>
                ))
              ) : (
                <span className="text-[0.65rem] text-[var(--status-warning)]">No major concerns</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getVerdictClasses(score: number): string {
  if (score >= 80) return 'bg-[var(--color-green-dim)] border border-[var(--status-positive)]'
  if (score >= 60) return 'bg-[var(--color-sky-dim)] border border-[var(--status-info)]'
  if (score >= 40) return 'bg-[var(--color-gold-dim)] border border-[var(--status-warning)]'
  return 'bg-[var(--color-red-dim)] border border-[var(--status-negative)]'
}

interface ScoreRingProps {
  score: number
  grade: OpportunityGrade
  size?: number
}

function ScoreRing({ score, grade, size = 140 }: ScoreRingProps) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  const getColors = () => {
    // Keep glow colors as RGBA so drop-shadow preserves intended translucency.
    if (score >= 80) return { stroke: 'var(--status-positive)', text: 'text-[var(--status-positive)]', glow: 'rgba(34, 211, 153, 0.3)' }
    if (score >= 60) return { stroke: 'var(--status-info)', text: 'text-[var(--status-info)]', glow: 'rgba(14, 165, 233, 0.3)' }
    if (score >= 40) return { stroke: 'var(--status-warning)', text: 'text-[var(--status-warning)]', glow: 'rgba(251, 191, 36, 0.3)' }
    return { stroke: 'var(--status-negative)', text: 'text-[var(--status-negative)]', glow: 'rgba(248, 113, 113, 0.3)' }
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
          className="stroke-[var(--border-subtle)]"
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

interface _ScoreBarProps {
  item: { label: string; score: number; maxScore: number; fillPercent: number }
}

function _ScoreBar({ item }: _ScoreBarProps) {
  const percentage = (item.score / item.maxScore) * 100
  
  const getBarColor = () => {
    if (percentage >= 80) return 'bg-[var(--status-positive)]'
    if (percentage >= 60) return 'bg-[var(--status-info)]'
    if (percentage >= 40) return 'bg-[var(--status-warning)]'
    return 'bg-[var(--status-negative)]'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[0.72rem] text-[var(--text-secondary)]">{item.label}</span>
        <span className="text-[0.72rem] font-semibold text-[var(--text-heading)]">
          {item.score}/{item.maxScore}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${item.fillPercent}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Helper function to create deal score data from Income Value and list price
 * 
 * Uses opportunity-based scoring:
 * - 0-5% discount needed = Strong Opportunity (A+)
 * - 5-10% = Good Opportunity (A)
 * - 10-15% = Moderate Opportunity (B)
 * - 15-25% = Marginal Opportunity (C)
 * - 25-35% = Unlikely Opportunity (D)
 * - 35%+ = Pass (F)
 */
/**
 * Build DealScoreData from backend API result. Use this when deal score comes from POST /api/v1/worksheet/deal-score or verdict so all values are backend-derived.
 */
export function dealScoreDataFromApi(api: {
  dealScore: number
  dealVerdict: string
  discountPercent: number
  incomeValue: number
  purchasePrice: number
  listPrice: number
  grade?: string
}): DealScoreData {
  const grade = (api.grade ?? 'C') as OpportunityGrade
  const label = api.dealVerdict || 'Opportunity'
  return {
    overall: Math.max(0, Math.min(100, Math.round(api.dealScore))),
    grade,
    label,
    verdict: api.dealVerdict,
    discountPercent: api.discountPercent,
    incomeValue: api.incomeValue,
    listPrice: api.listPrice,
    items: [
      {
        label: 'Discount Required',
        score: Math.round(100 - api.discountPercent),
        maxScore: 100,
        fillPercent: Math.max(0, 100 - api.discountPercent),
      },
    ],
  }
}

/**
 * @deprecated Prefer dealScoreDataFromApi when backend deal-score or verdict API result is available. Only use when API is not used.
 */
export function calculateDealScoreData(
  incomeValue: number,
  listPrice: number
): DealScoreData {
  const discountPercent = listPrice > 0
    ? Math.max(0, ((listPrice - incomeValue) / listPrice) * 100)
    : 0
  const overall = Math.max(0, Math.min(100, Math.round(100 - (discountPercent * 100 / 45))))
  const getGradeInfo = (dp: number): { grade: OpportunityGrade; label: string; verdict: string } => {
    if (dp <= 5) return { grade: 'A+', label: 'Strong Opportunity', verdict: 'Excellent deal - minimal negotiation needed' }
    if (dp <= 10) return { grade: 'A', label: 'Good Opportunity', verdict: 'Very good deal - reasonable negotiation required' }
    if (dp <= 15) return { grade: 'B', label: 'Moderate Opportunity', verdict: 'Good potential - negotiate firmly' }
    if (dp <= 25) return { grade: 'C', label: 'Marginal Opportunity', verdict: 'Possible deal - significant discount needed' }
    if (dp <= 35) return { grade: 'D', label: 'Unlikely Opportunity', verdict: 'Challenging deal - major price reduction required' }
    return { grade: 'F', label: 'Pass', verdict: 'Not recommended - unrealistic discount needed' }
  }
  const { grade, label, verdict } = getGradeInfo(discountPercent)
  return {
    overall,
    grade,
    label,
    verdict,
    discountPercent,
    incomeValue,
    listPrice,
    items: [
      { label: 'Discount Required', score: Math.round(100 - discountPercent), maxScore: 100, fillPercent: Math.max(0, 100 - discountPercent) },
    ],
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
    if (score >= 80) return 'text-[var(--status-positive)] bg-[var(--color-green-dim)] border-[var(--status-positive)]'
    if (score >= 60) return 'text-[var(--status-info)] bg-[var(--color-sky-dim)] border-[var(--status-info)]'
    if (score >= 40) return 'text-[var(--status-warning)] bg-[var(--color-gold-dim)] border-[var(--status-warning)]'
    return 'text-[var(--status-negative)] bg-[var(--color-red-dim)] border-[var(--status-negative)]'
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
