'use client';

/**
 * MetricsAccordion Component
 * 
 * A reusable collapsible accordion for displaying metrics with grades.
 * Used for Return Metrics, Cash Flow & Risk, and At-a-Glance sections.
 */

import React, { useState } from 'react';

// Types
export type MetricGrade = 'A' | 'B' | 'C' | 'D';
export type MetricGradeLabel = 'STRONG' | 'MODERATE' | 'POTENTIAL' | 'WEAK';

export interface MetricItem {
  label: string;
  sublabel?: string;
  value: string;
  grade: MetricGrade;
  gradeLabel: MetricGradeLabel;
}

export interface MetricsAccordionProps {
  title: string;
  icon: React.ReactNode;
  metrics: MetricItem[];
  defaultExpanded?: boolean;
  isDark?: boolean;
  subtitle?: string;
}

// Grade badge styling
const GRADE_STYLES: Record<MetricGrade, { light: string; dark: string }> = {
  A: { 
    light: 'bg-green-100 text-green-600', 
    dark: 'bg-green-500/20 text-green-400' 
  },
  B: { 
    light: 'bg-blue-100 text-blue-600', 
    dark: 'bg-blue-500/20 text-blue-400' 
  },
  C: { 
    light: 'bg-amber-100 text-amber-600', 
    dark: 'bg-amber-500/20 text-amber-400' 
  },
  D: { 
    light: 'bg-red-100 text-red-600', 
    dark: 'bg-red-500/20 text-red-400' 
  },
};

// Default icons as inline SVGs
const TrendingUpIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#0891B2" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
  </svg>
);

const CashIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#0891B2" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#0891B2" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
  </svg>
);

export function MetricsAccordion({
  title,
  icon,
  metrics,
  defaultExpanded = true,
  isDark = false,
  subtitle,
}: MetricsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getGradeStyle = (grade: MetricGrade) => {
    return isDark ? GRADE_STYLES[grade].dark : GRADE_STYLES[grade].light;
  };

  return (
    <div className={`rounded-xl mb-3 overflow-hidden ${isDark ? 'bg-[#0F1D32]' : 'bg-white'}`}>
      {/* Header */}
      <button 
        className="w-full flex items-center justify-between px-4 py-3.5 hover:opacity-90 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#0891B2]/15' : 'bg-[#0891B2]/10'}`}>
            {icon}
          </div>
          <div className="text-left">
            <span className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-[#0A1628]'}`}>
              {title}
            </span>
            {subtitle && (
              <span className={`block text-[11px] mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <svg 
          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-white/50' : 'text-slate-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
        </svg>
      </button>

      {/* Content */}
      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-2">
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between py-3 ${
                index !== metrics.length - 1 
                  ? `border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}` 
                  : ''
              }`}
            >
              <div className="flex-1">
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#0A1628]'}`}>
                  {metric.label}
                </span>
                {metric.sublabel && (
                  <span className={`block text-[11px] mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                    {metric.sublabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0A1628]'}`}>
                  {metric.value}
                </span>
                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide ${getGradeStyle(metric.grade)}`}>
                  {metric.gradeLabel} {metric.grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Pre-built icon components for common use cases
export const MetricsAccordionIcons = {
  TrendingUp: TrendingUpIcon,
  Cash: CashIcon,
  Grid: GridIcon,
};

export default MetricsAccordion;
