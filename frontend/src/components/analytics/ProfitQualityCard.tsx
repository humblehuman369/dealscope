'use client';

/**
 * ProfitQualityCard Component
 * 
 * Displays the profit quality score with a circular gauge and key metrics:
 * - Strategy Fit
 * - Risk Level  
 * - Protection
 * 
 * Also includes expandable factors and insight text.
 */

import React, { useState } from 'react';

// Types
export interface ProfitQualityData {
  score: number; // 0-100
  strategyFit: 'Poor' | 'Fair' | 'Good Fit' | 'Great';
  riskLevel: 'High' | 'Moderate' | 'Low';
  protection: 'Poor' | 'Fair' | 'Good';
  insight: string;
  factors?: ProfitFactor[];
}

export interface ProfitFactor {
  label: string;
  value: string;
  isPositive: boolean;
}

interface ProfitQualityCardProps {
  data: ProfitQualityData;
  isDark?: boolean;
}

// Circular Progress Component
function CircularProgress({ 
  score, 
  size = 100, 
  strokeWidth = 8,
  isDark = false,
}: { 
  score: number; 
  size?: number; 
  strokeWidth?: number;
  isDark?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  // Score color based on value
  const getScoreColor = () => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#0891B2'; // teal
    if (score >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getScoreColor()}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[28px] font-extrabold ${isDark ? 'text-white' : 'text-[#0A1628]'}`}>
          {score}
        </span>
        <span className={`text-xs font-medium -mt-1 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
          /100
        </span>
      </div>
    </div>
  );
}

export function ProfitQualityCard({ data, isDark = false }: ProfitQualityCardProps) {
  const [showFactors, setShowFactors] = useState(false);

  // Color for strategy fit
  const getStrategyFitColor = () => {
    switch (data.strategyFit) {
      case 'Great': return 'text-green-500';
      case 'Good Fit': return 'text-green-500';
      case 'Fair': return 'text-amber-500';
      case 'Poor': return 'text-red-500';
      default: return isDark ? 'text-white' : 'text-[#0A1628]';
    }
  };

  // Color for risk level
  const getRiskLevelColor = () => {
    switch (data.riskLevel) {
      case 'Low': return 'text-green-500';
      case 'Moderate': return 'text-amber-500';
      case 'High': return 'text-red-500';
      default: return isDark ? 'text-white' : 'text-[#0A1628]';
    }
  };

  // Color for protection
  const getProtectionColor = () => {
    switch (data.protection) {
      case 'Good': return 'text-green-500';
      case 'Fair': return 'text-[#0891B2]';
      case 'Poor': return 'text-red-500';
      default: return isDark ? 'text-white' : 'text-[#0A1628]';
    }
  };

  return (
    <div className={`rounded-xl p-4 mb-3 ${isDark ? 'bg-[#0F1D32]' : 'bg-white'}`}>
      {/* Header */}
      <h3 className="text-[11px] font-bold tracking-wide text-[#0891B2] mb-4">
        PROFIT QUALITY
      </h3>

      {/* Main content */}
      <div className="flex items-center gap-5">
        {/* Circular gauge */}
        <CircularProgress score={data.score} isDark={isDark} />

        {/* Metrics column */}
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className={`text-[13px] font-medium ${isDark ? 'text-white/70' : 'text-slate-500'}`}>
              Strategy Fit
            </span>
            <span className={`text-[13px] font-semibold ${getStrategyFitColor()}`}>
              {data.strategyFit}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-[13px] font-medium ${isDark ? 'text-white/70' : 'text-slate-500'}`}>
              Risk Level
            </span>
            <span className={`text-[13px] font-semibold ${getRiskLevelColor()}`}>
              {data.riskLevel}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-[13px] font-medium ${isDark ? 'text-white/70' : 'text-slate-500'}`}>
              Protection
            </span>
            <span className={`text-[13px] font-semibold ${getProtectionColor()}`}>
              {data.protection}
            </span>
          </div>
        </div>
      </div>

      {/* View Factors */}
      <button 
        className={`flex items-center gap-1 mt-4 py-1 ${isDark ? 'text-white/60' : 'text-slate-500'} hover:opacity-80 transition-opacity`}
        onClick={() => setShowFactors(!showFactors)}
      >
        <span className="text-xs font-medium">View Factors</span>
        <svg 
          className={`w-3.5 h-3.5 transition-transform duration-200 ${showFactors ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Factors list (expandable) */}
      {showFactors && data.factors && (
        <div className="mt-3 space-y-2">
          {data.factors.map((factor, index) => (
            <div key={index} className="flex items-center gap-2">
              {factor.isPositive ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              )}
              <span className={`flex-1 text-xs ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                {factor.label}
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#0A1628]'}`}>
                {factor.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Insight */}
      <div className="mt-4 pl-3 border-l-[3px] border-[#0891B2]">
        <p className={`text-[13px] leading-[18px] ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
          {data.insight}
        </p>
      </div>
    </div>
  );
}

export default ProfitQualityCard;
