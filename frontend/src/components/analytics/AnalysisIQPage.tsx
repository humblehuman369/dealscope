'use client';

/**
 * Analysis IQ Page
 * 
 * New analysis page with CompactHeader, Profit Quality, and Metrics Accordions.
 * Features a phone frame preview for desktop viewing.
 */

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompactHeader, PropertyData, NavItemId } from '../layout/CompactHeader';
import { ProfitQualityCard, ProfitQualityData } from './ProfitQualityCard';
import { MetricsAccordion, MetricItem } from './MetricsAccordion';

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

const MOCK_PROFIT_QUALITY: ProfitQualityData = {
  score: 78,
  strategyFit: 'Good Fit',
  riskLevel: 'Low',
  protection: 'Fair',
  insight: 'This deal shows strong fundamentals with healthy returns.',
  factors: [
    { label: 'Cap Rate vs Market', value: '+0.8%', isPositive: true },
    { label: 'Cash Flow Margin', value: '$285/mo', isPositive: true },
    { label: 'DSCR Threshold', value: '1.05x', isPositive: false },
    { label: 'Price vs Comps', value: '-4%', isPositive: true },
  ],
};

const MOCK_RETURN_METRICS: MetricItem[] = [
  { label: 'Cap Rate', sublabel: 'Acceptable', value: '6.1%', grade: 'B', gradeLabel: 'MODERATE' },
  { label: 'Cash-on-Cash', sublabel: 'Weak', value: '1.1%', grade: 'D', gradeLabel: 'WEAK' },
  { label: 'Equity Capture', sublabel: 'Fair Value', value: '6%', grade: 'C', gradeLabel: 'POTENTIAL' },
];

const MOCK_CASH_FLOW_RISK: MetricItem[] = [
  { label: 'Cash Flow Yield', sublabel: 'Weak', value: '1.1%', grade: 'D', gradeLabel: 'WEAK' },
  { label: 'DSCR', sublabel: 'Tight', value: '1.05', grade: 'C', gradeLabel: 'POTENTIAL' },
  { label: 'Expense Ratio', sublabel: 'Efficient', value: '27%', grade: 'A', gradeLabel: 'STRONG' },
  { label: 'Breakeven Occ.', sublabel: 'Tight', value: '95%', grade: 'C', gradeLabel: 'POTENTIAL' },
];

const MOCK_AT_A_GLANCE: MetricItem[] = [
  { label: 'Monthly Cash Flow', sublabel: 'Net Operating', value: '$285', grade: 'B', gradeLabel: 'MODERATE' },
  { label: 'Annual ROI', sublabel: 'Year 1', value: '8.2%', grade: 'B', gradeLabel: 'MODERATE' },
  { label: '5-Year Equity', sublabel: 'Projected', value: '$124K', grade: 'A', gradeLabel: 'STRONG' },
];

// Icon components for MetricsAccordion
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

interface AnalysisIQPageProps {
  address?: string;
  isDark?: boolean;
  showPhoneFrame?: boolean;
}

export function AnalysisIQPage({ 
  address, 
  isDark = false,
  showPhoneFrame = true 
}: AnalysisIQPageProps) {
  const router = useRouter();
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState<NavItemId>('analysis');

  // Update property with provided address if available
  const property: PropertyData = {
    ...MOCK_PROPERTY,
    ...(address && { address }),
  };

  const encodedAddress = encodeURIComponent(property.address);

  // Handlers
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleStrategyChange = useCallback((strategy: string) => {
    setCurrentStrategy(strategy);
  }, []);

  const handleNavChange = useCallback((navId: NavItemId) => {
    setActiveNav(navId);
    switch (navId) {
      case 'search':
        router.push('/search');
        break;
      case 'home':
        router.push(`/property/unknown?address=${encodedAddress}`);
        break;
      case 'analysis':
        // Already on analysis page
        break;
      case 'deals':
        router.push(`/deal-maker?address=${encodedAddress}`);
        break;
      default:
        break;
    }
  }, [router, encodedAddress]);

  const handleContinueToAnalysis = useCallback(() => {
    console.log('Continue to Analysis');
  }, []);

  const handleExportPDF = useCallback(() => {
    console.log('Export PDF');
  }, []);

  // Content component
  const AnalysisContent = () => (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#07172e]' : 'bg-slate-100'}`}>
      {/* Compact Header */}
      <CompactHeader
        property={property}
        pageTitle="ANALYSIS"
        pageTitleAccent="IQ"
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        onBack={handleBack}
        activeNav={activeNav}
        onNavChange={handleNavChange}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {/* Profit Quality Card */}
        <ProfitQualityCard data={MOCK_PROFIT_QUALITY} isDark={isDark} />

        {/* Return Metrics Accordion */}
        <MetricsAccordion
          title="Return Metrics"
          icon={<TrendingUpIcon />}
          metrics={MOCK_RETURN_METRICS}
          defaultExpanded={true}
          isDark={isDark}
        />

        {/* Cash Flow & Risk Accordion */}
        <MetricsAccordion
          title="Cash Flow & Risk"
          icon={<CashIcon />}
          metrics={MOCK_CASH_FLOW_RISK}
          defaultExpanded={true}
          isDark={isDark}
        />

        {/* At-a-Glance Accordion */}
        <MetricsAccordion
          title="At-a-Glance"
          icon={<GridIcon />}
          metrics={MOCK_AT_A_GLANCE}
          defaultExpanded={false}
          isDark={isDark}
          subtitle="Performance breakdown"
        />
      </div>

      {/* Bottom CTAs */}
      <div className="absolute bottom-0 left-0 right-0 bg-white px-4 pt-4 pb-6 border-t border-slate-200">
        {/* Primary CTA */}
        <button 
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0891B2] to-[#0e7490] text-white py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity mb-3"
          onClick={handleContinueToAnalysis}
        >
          <span>Continue to Analysis</span>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
          </svg>
        </button>

        {/* Secondary CTA */}
        <button 
          className="w-full flex items-center justify-center gap-1.5 text-slate-500 py-3 font-medium text-sm hover:text-slate-700 transition-colors"
          onClick={handleExportPDF}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          <span>Export PDF Report</span>
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
          <AnalysisContent />
        </div>
      </div>
    );
  }

  return <AnalysisContent />;
}

export default AnalysisIQPage;
