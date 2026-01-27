'use client';

/**
 * Verdict IQ Page
 * 
 * IQ Verdict page with CompactHeader showing ranked strategy recommendations.
 * All links point to the Analysis IQ page.
 */

import React, { useState, useCallback } from 'react';
import { CompactHeader, PropertyData, NavItemId } from '../layout/CompactHeader';

// Types
interface IQStrategy {
  id: string;
  name: string;
  type?: string;
  metric: string;
  metricValue: number;
  score: number;
  badge: string | null;
}

// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#0891B2';
  if (score >= 30) return '#f59e0b';
  return '#ef4444';
};

const getGradeFromScore = (score: number): { label: string; grade: string } => {
  if (score >= 85) return { label: 'STRONG', grade: 'A+' };
  if (score >= 70) return { label: 'GOOD', grade: 'A' };
  if (score >= 55) return { label: 'MODERATE', grade: 'B' };
  if (score >= 40) return { label: 'POTENTIAL', grade: 'C' };
  if (score >= 25) return { label: 'WEAK', grade: 'D' };
  return { label: 'POOR', grade: 'F' };
};

const getGradeColor = (grade: string): string => {
  if (grade.includes('A')) return '#22c55e';
  if (grade.includes('B')) return '#0891B2';
  if (grade.includes('C')) return '#f59e0b';
  return '#ef4444';
};

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString();
};

// Mock data
const MOCK_PROPERTY: PropertyData = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  rent: 3200,
  status: 'OFF-MARKET',
  image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
};

const MOCK_STRATEGIES: IQStrategy[] = [
  { id: 'long-term-rental', name: 'Long-Term Rental', type: 'Annual', metric: '8.2%', metricValue: 8.2, score: 78, badge: 'Best Match' },
  { id: 'short-term-rental', name: 'Short-Term Rental', type: 'Vacation', metric: '12.5%', metricValue: 12.5, score: 72, badge: 'Strong' },
  { id: 'brrrr', name: 'BRRRR', metric: '15.8%', metricValue: 15.8, score: 68, badge: null },
  { id: 'fix-and-flip', name: 'Fix & Flip', metric: '$52K', metricValue: 52000, score: 55, badge: null },
  { id: 'house-hack', name: 'House Hack', metric: '65%', metricValue: 65, score: 48, badge: null },
  { id: 'wholesale', name: 'Wholesale', metric: '$18K', metricValue: 18000, score: 35, badge: null },
];

interface VerdictIQPageProps {
  address?: string;
  isDark?: boolean;
  showPhoneFrame?: boolean;
  onNavigateToAnalysis?: (strategyId?: string) => void;
}

export function VerdictIQPage({
  address,
  isDark = false,
  showPhoneFrame = true,
  onNavigateToAnalysis,
}: VerdictIQPageProps) {
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState<NavItemId>('analysis');
  const [showFactors, setShowFactors] = useState(false);

  // Property data
  const property: PropertyData = {
    ...MOCK_PROPERTY,
    ...(address && { address }),
  };

  // Calculate prices
  const dealScore = 78;
  const breakevenPrice = property.price * 1.1;
  const buyPrice = breakevenPrice * 0.95;
  const wholesalePrice = breakevenPrice * 0.70;

  const topStrategy = MOCK_STRATEGIES[0];

  // Handlers
  const handleBack = useCallback(() => {
    console.log('Back pressed');
  }, []);

  const handleStrategyChange = useCallback((strategy: string) => {
    setCurrentStrategy(strategy);
  }, []);

  const handleNavChange = useCallback((navId: NavItemId) => {
    setActiveNav(navId);
    if (navId === 'analysis') {
      onNavigateToAnalysis?.();
    }
  }, [onNavigateToAnalysis]);

  const handleContinueToAnalysis = useCallback(() => {
    onNavigateToAnalysis?.();
  }, [onNavigateToAnalysis]);

  const handleViewStrategy = useCallback((strategy: IQStrategy) => {
    onNavigateToAnalysis?.(strategy.id);
  }, [onNavigateToAnalysis]);

  const handleExportPDF = useCallback(() => {
    console.log('Export PDF');
  }, []);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#F1F5F9';
  const cardBg = isDark ? '#0F1D32' : 'white';
  const textColor = isDark ? 'text-white' : 'text-[#0A1628]';
  const mutedColor = isDark ? 'text-white/60' : 'text-slate-500';

  // Content component
  const VerdictContent = () => (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#07172e]' : 'bg-slate-100'}`}>
      {/* Compact Header */}
      <CompactHeader
        property={property}
        pageTitle="VERDICT"
        pageTitleAccent="IQ"
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        onBack={handleBack}
        activeNav={activeNav}
        onNavChange={handleNavChange}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        {/* IQ Verdict Card */}
        <div className={`rounded-2xl p-5 mb-4 ${isDark ? 'bg-[#0F1D32]' : 'bg-white'}`}>
          {/* Header Row: Score + Prices */}
          <div className="flex gap-4 mb-4">
            {/* Score Container */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold tracking-widest text-[#0891B2] mb-2">
                IQ VERDICT
              </span>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-2"
                style={{
                  borderWidth: 4,
                  borderStyle: 'solid',
                  borderColor: getScoreColor(dealScore),
                  backgroundColor: `${getScoreColor(dealScore)}14`,
                }}
              >
                <span
                  className="text-[28px] font-extrabold"
                  style={{ color: getScoreColor(dealScore) }}
                >
                  {dealScore}
                </span>
              </div>
              <button
                className={`flex items-center gap-1 ${mutedColor}`}
                onClick={() => setShowFactors(!showFactors)}
              >
                <span className="text-xs">View Factors</span>
                <svg
                  className={`w-3 h-3 transition-transform ${showFactors ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Prices Column */}
            <div className="flex-[1.5] flex flex-col justify-center gap-2.5">
              <div className="flex justify-between items-center">
                <span className={`text-[13px] ${mutedColor}`}>Breakeven</span>
                <span className={`text-base font-bold ${textColor}`}>
                  {formatPrice(Math.round(breakevenPrice))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-semibold text-[#0891B2]">Buy Price</span>
                <span className="text-base font-bold text-[#0891B2]">
                  {formatPrice(Math.round(buyPrice))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-[13px] ${mutedColor}`}>Wholesale</span>
                <span className={`text-base font-bold ${textColor}`}>
                  {formatPrice(Math.round(wholesalePrice))}
                </span>
              </div>
            </div>
          </div>

          {/* Verdict Description */}
          <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <p className={`text-sm text-center leading-5 ${mutedColor}`}>
              Excellent potential across multiple strategies. {topStrategy.name} shows best returns.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mb-5">
          <button
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0891B2] to-[#0e7490] text-white py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity mb-3"
            onClick={handleContinueToAnalysis}
          >
            <span>Continue to Analysis</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <p className={`text-[13px] text-center italic ${mutedColor}`}>or</p>
          <p className={`text-[15px] font-semibold text-center mt-1 ${textColor}`}>Select a Strategy</p>
        </div>

        {/* Strategy List */}
        <div className="space-y-2 mb-4">
          {MOCK_STRATEGIES.map((strategy, index) => {
            const gradeDisplay = getGradeFromScore(strategy.score);
            const isTopPick = index === 0 && strategy.score >= 70;

            return (
              <button
                key={strategy.id}
                className={`w-full rounded-xl overflow-hidden text-left transition-all hover:scale-[1.01] ${isDark ? 'bg-[#0F1D32]' : 'bg-white'
                  } ${isTopPick ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => handleViewStrategy(strategy)}
              >
                <div className="flex items-center p-3.5 px-4 gap-3">
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <span className={`text-[15px] font-semibold ${textColor}`}>
                      {strategy.name}
                    </span>
                    {strategy.type && (
                      <span className={`text-xs ${mutedColor}`}>{strategy.type}</span>
                    )}
                    {strategy.badge && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: strategy.badge === 'Best Match' ? '#22c55e20' : '#0891B220',
                          color: strategy.badge === 'Best Match' ? '#22c55e' : '#0891B2',
                        }}
                      >
                        {strategy.badge}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className="text-base font-bold block"
                      style={{ color: getScoreColor(strategy.score) }}
                    >
                      {strategy.metric}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: getGradeColor(gradeDisplay.grade) }}
                    >
                      {gradeDisplay.label} {gradeDisplay.grade}
                    </span>
                  </div>

                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Export Link */}
        <button
          className={`flex items-center justify-center gap-2 py-3 w-full ${mutedColor} hover:opacity-80 transition-opacity`}
          onClick={handleExportPDF}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="text-sm">Export PDF Report</span>
        </button>
      </div>
    </div>
  );

  // Render with or without phone frame
  if (showPhoneFrame) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-start justify-center p-5">
        {/* Phone Frame */}
        <div className="w-[390px] h-[844px] bg-slate-100 rounded-[40px] overflow-hidden shadow-2xl relative font-sans">
          <VerdictContent />
        </div>
      </div>
    );
  }

  return <VerdictContent />;
}

export default VerdictIQPage;
