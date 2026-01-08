'use client'

import React from 'react'
import { InsightType, InsightData } from './types'

/**
 * InsightCard Component
 * 
 * Displays contextual insights, tips, warnings, and success messages.
 * Used throughout the analytics to provide AI-powered recommendations.
 * 
 * Types:
 * - success: Green - positive insights
 * - warning: Yellow - cautions to consider
 * - danger: Red - serious concerns
 * - tip: Blue - helpful suggestions
 * - info: Teal - general information
 */

interface InsightCardProps {
  data: InsightData
}

export function InsightCard({ data }: InsightCardProps) {
  const getColorClasses = () => {
    switch (data.type) {
      case 'success':
        return {
          bg: 'bg-green-500/[0.08]',
          border: 'border-green-500/15',
          iconBg: 'bg-green-500/20',
          highlight: 'text-green-500'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-500/[0.08]',
          border: 'border-yellow-500/15',
          iconBg: 'bg-yellow-500/20',
          highlight: 'text-yellow-500'
        }
      case 'danger':
        return {
          bg: 'bg-red-500/[0.08]',
          border: 'border-red-500/15',
          iconBg: 'bg-red-500/20',
          highlight: 'text-red-500'
        }
      case 'tip':
        return {
          bg: 'bg-blue-500/[0.08]',
          border: 'border-blue-500/15',
          iconBg: 'bg-blue-500/20',
          highlight: 'text-blue-400'
        }
      case 'info':
      default:
        return {
          bg: 'bg-teal/[0.08]',
          border: 'border-teal/15',
          iconBg: 'bg-teal/20',
          highlight: 'text-teal'
        }
    }
  }

  const colors = getColorClasses()

  // Parse content to find highlighted text (wrapped in <strong> or **text**)
  const renderContent = () => {
    if (data.highlightText) {
      const parts = data.content.split(data.highlightText)
      return (
        <>
          {parts[0]}
          <strong className={colors.highlight}>{data.highlightText}</strong>
          {parts[1] || ''}
        </>
      )
    }
    
    // Handle markdown-style bold
    const boldRegex = /\*\*(.*?)\*\*/g
    const parts = data.content.split(boldRegex)
    
    return parts.map((part, index) => {
      // Odd indices are the captured groups (bold text)
      if (index % 2 === 1) {
        return <strong key={index} className={colors.highlight}>{part}</strong>
      }
      return part
    })
  }

  return (
    <div className={`flex gap-2.5 p-3 ${colors.bg} border ${colors.border} rounded-xl mb-2.5`}>
      {/* Icon */}
      <div className={`w-5 h-5 ${colors.iconBg} rounded-full flex items-center justify-center flex-shrink-0 text-[0.65rem]`}>
        {data.icon}
      </div>

      {/* Content */}
      <p className="text-[0.75rem] text-white/80 leading-relaxed">
        {renderContent()}
      </p>
    </div>
  )
}

/**
 * Helper function to create IQ Insight
 */
export function createIQInsight(
  content: string,
  type: InsightType = 'success',
  highlightText?: string
): InsightData {
  const icons: Record<InsightType, string> = {
    success: '💡',
    warning: '⚠️',
    danger: '🚫',
    tip: '🎯',
    info: '💡'
  }

  return {
    type,
    icon: icons[type],
    content: `**IQ Insight:** ${content}`,
    highlightText
  }
}

/**
 * Helper function to create payoff date insight
 */
export function createPayoffInsight(payoffDate: string, payments: number): InsightData {
  return {
    type: 'tip',
    icon: '🎯',
    content: `**Payoff Date:** ${payoffDate} (${payments} payments)`
  }
}

/**
 * Helper function to create exit strategy insight
 */
export function createExitInsight(
  yearsToConvert: number,
  cashFlowAfter: number
): InsightData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return {
    type: 'success',
    icon: '🎉',
    content: `After ${yearsToConvert} year${yearsToConvert > 1 ? 's' : ''}, move out and cash flow **${formatCurrency(cashFlowAfter)}/mo** as a rental`
  }
}

/**
 * Helper function to create risk warning
 */
export function createRiskWarning(content: string): InsightData {
  return {
    type: 'warning',
    icon: '⚠️',
    content
  }
}

/**
 * InsightCardInline Component
 * 
 * A more compact inline version for tight spaces.
 */

interface InsightCardInlineProps {
  icon: string
  content: string
  type?: InsightType
}

export function InsightCardInline({ icon, content, type = 'info' }: InsightCardInlineProps) {
  const getTextColor = () => {
    switch (type) {
      case 'success': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'danger': return 'text-red-500'
      case 'tip': return 'text-blue-400'
      default: return 'text-teal'
    }
  }

  return (
    <div className="flex items-center gap-2 text-[0.7rem]">
      <span>{icon}</span>
      <span className={`${getTextColor()} font-medium`}>{content}</span>
    </div>
  )
}

export default InsightCard
