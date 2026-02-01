'use client';

/**
 * Verdict IQ Page
 * 
 * IQ Verdict page featuring:
 * - Verdict Hero with score circle and verdict details
 * - Investment Analysis section with price cards
 * - Deal Gap analysis with seller motivation
 * - Additional Opportunity Factors (collapsible)
 * - Fixed bottom CTA actions
 */

import React, { useState, useCallback, useMemo } from 'react';
import { CompactHeader, PropertyData, NavItemId } from '../layout/CompactHeader';

// Types
interface VerdictData {
  score: number;
  label: string;
  subtitle: string;
  dealGap: string;
  dealGapPercent: number;
  motivation: string;
  motivationScore: number;
}

interface PricingData {
  breakeven: number;
  targetBuy: number;
  wholesale: number;
  marketEstimate: number;
  discountNeeded: number;
}

interface SellerMotivation {
  level: string;
  score: string;
  maxDiscount: string;
  suggestedOffer: string;
}

interface OpportunityFactor {
  icon: 'clock' | 'alert' | 'check' | 'x';
  label: string;
  value: string;
  positive: boolean;
}

// Helper functions
const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
  rent: 5555,
  status: 'OFF-MARKET',
  image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
};

interface VerdictIQPageProps {
  address?: string;
  property?: PropertyData;
  isDark?: boolean;
  showPhoneFrame?: boolean;
  onNavigateToAnalysis?: (strategyId?: string) => void;
  onBack?: () => void;
}

export function VerdictIQPage({
  address,
  property: propProperty,
  isDark = false,
  showPhoneFrame = true,
  onNavigateToAnalysis,
  onBack,
}: VerdictIQPageProps) {
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav] = useState<NavItemId>('analysis');
  const [showFactors, setShowFactors] = useState(true);
  const [showCalculation, setShowCalculation] = useState(false);

  // Property data
  const property: PropertyData = propProperty || {
    ...MOCK_PROPERTY,
    ...(address && { address }),
  };

  // Calculate pricing based on property
  const pricing = useMemo<PricingData>(() => {
    const marketEstimate = property.price;
    const annualRent = (property.rent || 5555) * 12;
    const noi = annualRent * 0.65; // After expenses
    const targetCapRate = 0.085; // 8.5% target
    
    const breakeven = Math.round(noi / 0.07); // 7% cap rate breakeven
    const targetBuy = Math.round(breakeven * 0.95); // 5% profit margin
    const wholesale = Math.round(marketEstimate * 0.66); // 34% discount
    const discountNeeded = marketEstimate - breakeven;
    
    return {
      breakeven,
      targetBuy,
      wholesale,
      marketEstimate,
      discountNeeded,
    };
  }, [property]);

  // Calculate verdict data
  const verdict = useMemo<VerdictData>(() => {
    const dealGapPercent = ((pricing.breakeven - pricing.marketEstimate) / pricing.marketEstimate) * 100;
    const score = dealGapPercent >= -10 ? 89 : dealGapPercent >= -20 ? 65 : 45;
    
    return {
      score,
      label: score >= 80 ? 'Good Buy' : score >= 60 ? 'Fair Deal' : 'Needs Work',
      subtitle: score >= 80 ? 'Deal Gap likely achievable' : score >= 60 ? 'Moderate negotiation needed' : 'Significant discount required',
      dealGap: `${dealGapPercent.toFixed(1)}%`,
      dealGapPercent,
      motivation: 'Medium',
      motivationScore: 50,
    };
  }, [pricing]);

  // Seller motivation
  const sellerMotivation = useMemo<SellerMotivation>(() => ({
    level: 'Medium',
    score: '50/100',
    maxDiscount: 'Up to 13%',
    suggestedOffer: '10% - 18% below asking',
  }), []);

  // Opportunity factors
  const factors = useMemo<OpportunityFactor[]>(() => [
    { icon: 'clock', label: 'Long Listing Duration', value: 'No', positive: false },
    { icon: 'alert', label: 'Distressed Sale', value: 'No', positive: false },
  ], []);

  // Handlers
  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleStrategyChange = useCallback((strategy: string) => {
    setCurrentStrategy(strategy);
  }, []);

  const handleContinueToAnalysis = useCallback(() => {
    onNavigateToAnalysis?.();
  }, [onNavigateToAnalysis]);

  const handleExportPDF = useCallback(() => {
    console.log('Export PDF');
  }, []);

  // Sub-components
  const StatItem = ({ value, label, cyan = false }: { value: string | number; label: string; cyan?: boolean }) => (
    <div className="flex flex-col">
      <div className={`text-sm font-bold ${cyan ? 'text-[#00D4FF]' : 'text-white'}`}>{value}</div>
      <div className="text-[9px] text-[#64748B] uppercase tracking-wide">{label}</div>
    </div>
  );

  const PriceCard = ({ label, value, desc, recommended = false }: { label: string; value: number; desc: string; recommended?: boolean }) => (
    <div className={`rounded-lg p-3 text-center border ${
      recommended 
        ? 'bg-white border-2 border-[#0891B2]' 
        : 'bg-[#F8FAFC] border-[#E2E8F0]'
    }`}>
      <div className={`text-[9px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${
        recommended ? 'text-[#0891B2]' : 'text-[#64748B]'
      }`}>
        {label}
        <svg className="w-3 h-3 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
        </svg>
      </div>
      <div className={`text-base font-bold mb-1 ${recommended ? 'text-[#0891B2]' : 'text-[#0A1628]'}`}>
        {formatPrice(value)}
      </div>
      <div className="text-[9px] text-[#94A3B8] leading-tight">{desc}</div>
    </div>
  );

  const FactorRow = ({ icon, label, value, positive }: OpportunityFactor) => {
    const iconPaths: Record<string, React.ReactNode> = {
      clock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>,
      alert: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>,
      check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
      x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    };

    return (
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
          <svg className="w-4 h-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {iconPaths[icon]}
          </svg>
          {label}
        </div>
        <span className={`text-[13px] font-semibold ${positive ? 'text-[#0891B2]' : 'text-[#94A3B8]'}`}>
          {value}
        </span>
      </div>
    );
  };

  const isOffMarket = property.status?.toLowerCase().includes('off-market');

  // Content component
  const VerdictContent = () => (
    <div className="flex flex-col h-full bg-[#E8ECF0] font-['Inter',sans-serif]">
      {/* Compact Header */}
      <CompactHeader
        property={property}
        pageTitle="VERDICT"
        pageTitleAccent="IQ"
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        onBack={handleBack}
        activeNav={activeNav}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-36">
        
        {/* VERDICT HERO */}
        <div className="bg-white p-5 px-6 border-b border-[#E2E8F0] flex items-center gap-4">
          <div 
            className="w-[72px] h-[72px] rounded-full border-4 border-[#0891B2] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' }}
          >
            <span className="text-[28px] font-extrabold text-[#0891B2]">{verdict.score}</span>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-[#0891B2] mb-0.5">{verdict.label}</div>
            <div className="text-[13px] text-[#64748B] mb-2">{verdict.subtitle}</div>
            <div className="flex gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                <svg className="w-3 h-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
                </svg>
                Gap: <span className="font-semibold text-[#0891B2]">{verdict.dealGap}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                <svg className="w-3 h-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Motivation: <span className="font-semibold text-[#0891B2]">{verdict.motivation}</span>
              </span>
            </div>
            <button className="flex items-center gap-1 text-[#0891B2] text-xs font-medium mt-1 bg-transparent border-none cursor-pointer p-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
              </svg>
              How Verdict IQ Works
            </button>
          </div>
        </div>

        {/* Your Investment Analysis */}
        <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-[15px] font-bold text-[#0A1628]">YOUR INVESTMENT ANALYSIS</div>
              <div className="text-xs text-[#64748B]">Based on YOUR financing terms (20% down, 6.0%)</div>
            </div>
            <button className="text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer">
              Change terms
            </button>
          </div>

          <div className="text-xs font-semibold text-[#0891B2] mt-2 mb-3">
            WHAT PRICE MAKES THIS DEAL WORK?
          </div>

          {/* Info Banner for Off-Market */}
          {isOffMarket && (
            <div className="flex items-start gap-2.5 p-3 bg-[#F1F5F9] rounded-lg mb-4 border-l-[3px] border-l-[#0891B2]">
              <svg className="w-[18px] h-[18px] text-[#0891B2] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
              <div className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#0891B2]">Off-Market Property:</strong> No asking price available. Using Market Estimate of {formatPrice(pricing.marketEstimate)} for Deal Gap calculation.
              </div>
            </div>
          )}

          {/* Price Cards */}
          <div className="text-[13px] text-[#64748B] mb-3">Three ways to approach this deal:</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <PriceCard 
              label="Breakeven" 
              value={pricing.breakeven} 
              desc="Max price for $0 cashflow (LTR model)" 
            />
            <PriceCard 
              label="Target Buy" 
              value={pricing.targetBuy} 
              desc="5% discount for profit" 
              recommended 
            />
            <PriceCard 
              label="Wholesale" 
              value={pricing.wholesale} 
              desc="30% discount for assignment" 
            />
          </div>

          <button 
            className="flex items-center justify-center gap-1.5 w-full py-2 text-[#0891B2] text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowCalculation(!showCalculation)}
          >
            <svg 
              className="w-3.5 h-3.5 transition-transform" 
              style={{ transform: showCalculation ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
            See how we calculated this
          </button>
        </div>

        {/* How Likely Section */}
        <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
          <div className="text-xs font-semibold text-[#0891B2] mb-3">
            HOW LIKELY CAN YOU GET THIS PRICE?
          </div>

          {/* Deal Gap */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0A1628]">
              <svg className="w-[18px] h-[18px] text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
              </svg>
              Deal Gap
            </div>
            <div className="text-lg font-bold text-[#0891B2]">{verdict.dealGap}</div>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[#64748B]">Market Estimate</span>
              <span className="text-[13px] font-semibold text-[#0A1628]">{formatPrice(pricing.marketEstimate)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[#64748B]">Your Target</span>
              <span className="text-[13px] font-semibold text-[#0891B2]">{formatPrice(pricing.breakeven)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[#64748B]">Discount needed</span>
              <span className="text-[13px] font-semibold text-[#0891B2]">{formatPrice(pricing.discountNeeded)}</span>
            </div>
          </div>

          {/* Seller Motivation */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0A1628]">
              <svg className="w-[18px] h-[18px] text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Seller Motivation
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-[#0891B2]">{sellerMotivation.level}</span>
              <span className="text-xs text-[#94A3B8]">{sellerMotivation.score}</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-[13px] text-[#64748B]">Max achievable discount</span>
            <span className="text-[13px] font-semibold text-[#0A1628]">{sellerMotivation.maxDiscount}</span>
          </div>

          {/* Suggested Offer */}
          <div 
            className="relative rounded-[10px] p-4 mt-3 border border-[#0891B2]"
            style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #E0F7FA 100%)' }}
          >
            <span className="absolute -top-2 left-4 bg-[#0891B2] text-white text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
              Recommended
            </span>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#0A1628] font-medium">Suggested opening offer</span>
              <span className="text-base font-bold text-[#0891B2]">{sellerMotivation.suggestedOffer}</span>
            </div>
          </div>
        </div>

        {/* Additional Opportunity Factors */}
        <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
              </svg>
              Additional Opportunity Factors
            </span>
            <button 
              className="flex items-center gap-1 text-[#0891B2] text-xs font-medium bg-transparent border-none cursor-pointer"
              onClick={() => setShowFactors(!showFactors)}
            >
              {showFactors ? 'Hide' : 'Show'}
              <svg 
                className="w-3.5 h-3.5 transition-transform" 
                style={{ transform: showFactors ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>

          {showFactors && (
            <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
              {factors.map((factor, index) => (
                <FactorRow key={index} {...factor} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-[#E2E8F0] p-4 px-6">
        <button 
          className="w-full flex items-center justify-center gap-2 bg-[#0891B2] text-white py-4 rounded-xl text-[15px] font-semibold cursor-pointer border-none mb-3 hover:bg-[#0E7490] transition-colors"
          onClick={handleContinueToAnalysis}
        >
          Continue to Analysis
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </button>
        <button 
          className="w-full flex items-center justify-center gap-2 bg-transparent text-[#64748B] py-3 text-[13px] font-medium cursor-pointer border-none hover:text-[#475569] transition-colors"
          onClick={handleExportPDF}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          Export PDF Report
        </button>
      </div>
    </div>
  );

  // Render with or without phone frame
  if (showPhoneFrame) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-start justify-center p-5">
        {/* Phone Frame */}
        <div className="w-[390px] h-[844px] bg-[#E8ECF0] rounded-[40px] overflow-hidden shadow-2xl relative font-sans">
          <VerdictContent />
        </div>
      </div>
    );
  }

  return <VerdictContent />;
}

export default VerdictIQPage;
