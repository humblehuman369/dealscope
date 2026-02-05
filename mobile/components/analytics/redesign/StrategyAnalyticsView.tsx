/**
 * StrategyAnalyticsView - Main container for the redesigned analytics
 * Integrates all new components into a cohesive view
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  StrategyId,
  SubTabId,
  SUB_TABS,
  PropertyData,
  TargetAssumptions,
  CompareView,
  BenchmarkConfig,
  TuneGroup,
  IQTargetResult,
} from './types';

// Import the real data hook and context
import { StrategyGrades } from '../../../hooks/usePropertyAnalysis';
import { useAnalysis } from './AnalysisContext';

import { IQTargetHero } from './IQTargetHero';
import { PriceLadder, generatePriceLadder } from './PriceLadder';
import { PerformanceBenchmarks } from './SpectrumBar';
import { NegotiationPlan, generateNegotiationPlan, LEVERAGE_POINTS } from './NegotiationPlan';
import { StrategySelectorNew, SubTabNav } from './StrategySelectorNew';
import { TuneSectionNew } from './TuneSectionNew';
import { DealScoreDisplayNew } from './DealScoreDisplayNew';
import { InsightCard, createIQInsight } from './InsightCard';
import { CompareToggle } from './CompareToggle';
import { ReturnsGrid, createLTRReturns, createSTRReturns, createBRRRRReturns } from './ReturnsGrid';
import { PropertyMiniCardNew } from './PropertyMiniCardNew';
import { FundingTabContent } from './FundingTabContent';
import { TenYearTabContent } from './TenYearTabContent';
import { GrowthTabContent } from './GrowthTabContent';
import { WelcomeSection } from './WelcomeSection';
import { StrategyGrid, StrategyPrompt } from './StrategyGrid';
import { ProfitZoneDashboard, ProfitZoneMetrics, ProfitZoneTip } from './ProfitZoneDashboard';

interface StrategyAnalyticsViewProps {
  property: PropertyData;
  isDark?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onGenerateLOI?: () => void;
  onShare?: () => void;
  initialStrategyId?: StrategyId | null;
}

export function StrategyAnalyticsView({
  property,
  isDark = true,
  onBack,
  onSave,
  onGenerateLOI,
  onShare,
  initialStrategyId = null,
}: StrategyAnalyticsViewProps) {
  // Use Context
  const {
    activeStrategy,
    setActiveStrategy,
    assumptions,
    updateAssumption,
    growthAssumptions,
    updateGrowthAssumption,
    analysis: {
      strategyGrades: apiStrategyGrades,
      targetPrice: apiTargetPrice,
      breakevenPrice: apiBreakevenPrice,
      discountPercent: apiDiscountPercent,
      dealScore: apiDealScore,
      strategies: apiStrategies,
      projections: apiProjections,
      isLoading: isAnalysisLoading,
      error: analysisError,
      refetch: refetchAnalysis,
    }
  } = useAnalysis();

  // Local UI state
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('metrics');
  const [compareView, setCompareView] = useState<CompareView>('target');
  const [isWelcomeCollapsed, setIsWelcomeCollapsed] = useState(false);

  // Sync initialStrategyId if provided
  useEffect(() => {
    if (initialStrategyId && activeStrategy !== initialStrategyId) {
      setActiveStrategy(initialStrategyId);
      setActiveSubTab('metrics');
      setCompareView('target');
      setIsWelcomeCollapsed(true);
    }
  }, [initialStrategyId]);

  // ============================================
  // Calculate IQ Target - Now uses backend data
  // ============================================
  const iqTarget = useMemo((): IQTargetResult => {
    // USE BACKEND DATA: targetPrice and breakeven come from API
    const targetPrice = apiTargetPrice || Math.round(assumptions.listPrice * 0.80);
    const breakeven = apiBreakevenPrice || Math.round(assumptions.listPrice * 0.88);
    const discountPercent = apiDiscountPercent ? apiDiscountPercent / 100 : 0.20;
    
    const downPayment = targetPrice * assumptions.downPaymentPct;
    const closingCosts = targetPrice * assumptions.closingCostsPct;
    const loanAmount = targetPrice - downPayment;
    const totalCash = downPayment + closingCosts;
    
    // Monthly calculations
    const monthlyRate = assumptions.interestRate / 12;
    const numPayments = assumptions.loanTermYears * 12;
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const monthlyTaxes = assumptions.propertyTaxes / 12;
    const monthlyInsurance = assumptions.insurance / 12;
    const effectiveRent = assumptions.monthlyRent * (1 - assumptions.vacancyRate);
    const management = effectiveRent * assumptions.managementPct;
    const maintenance = effectiveRent * assumptions.maintenancePct;
    
    const totalExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + management + maintenance;
    const monthlyCashFlow = effectiveRent - totalExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    const cashOnCash = annualCashFlow / totalCash;
    const noi = (effectiveRent - monthlyTaxes - monthlyInsurance - management - maintenance) * 12;
    const capRate = noi / targetPrice;
    const dscr = noi / (monthlyPI * 12);

    // Get strategy-specific metrics from API if available
    const activeApiStrategy = apiStrategies.find(s => s.id === activeStrategy);
    const apiMonthlyCashFlow = activeApiStrategy?.monthlyCashFlow;
    const apiCashOnCash = activeApiStrategy?.cashOnCash;
    const apiCapRate = activeApiStrategy?.capRate;
    const apiDscr = activeApiStrategy?.dscr;

    // Use API values if available, otherwise fall back to calculated
    const finalMonthlyCashFlow = apiMonthlyCashFlow ?? monthlyCashFlow;
    const finalCashOnCash = apiCashOnCash ? apiCashOnCash / 100 : cashOnCash;
    const finalCapRate = apiCapRate ? apiCapRate / 100 : capRate;
    const finalDscr = apiDscr ?? dscr;

    return {
      targetPrice,
      discountFromList: assumptions.listPrice - targetPrice,
      discountPercent,
      breakeven,
      breakevenPercent: breakeven / assumptions.listPrice,
      rationale: `At this price you achieve positive $${Math.round(finalMonthlyCashFlow)}/mo cash flow with ${(finalCashOnCash * 100).toFixed(1)}% return`,
      highlightedMetric: `$${Math.round(finalMonthlyCashFlow)}/mo cash flow`,
      secondaryMetric: `${(finalCashOnCash * 100).toFixed(1)}% CoC`,
      monthlyCashFlow: finalMonthlyCashFlow,
      cashOnCash: finalCashOnCash,
      capRate: finalCapRate,
      dscr: finalDscr,
      // BRRRR-specific
      cashRecoveryPercent: activeStrategy === 'brrrr' ? 100 : undefined,
      cashLeftInDeal: activeStrategy === 'brrrr' ? 0 : undefined,
      equityCreated: activeStrategy === 'brrrr' ? 85000 : undefined,
      // Flip-specific
      netProfit: activeStrategy === 'flip' ? 65000 : undefined,
      roi: activeStrategy === 'flip' ? 0.35 : undefined,
      // Wholesale-specific
      assignmentFee: activeStrategy === 'wholesale' ? 15000 : undefined,
      mao: activeStrategy === 'wholesale' ? targetPrice - 15000 : undefined,
    };
  }, [assumptions, activeStrategy, apiTargetPrice, apiBreakevenPrice, apiDiscountPercent, apiStrategies]);

  // ============================================
  // Strategy Grades - USE BACKEND DATA
  // ============================================
  // OLD MOCK DATA (commented out for Phase 3 cleanup):
  // const strategyGradesMock = useMemo(() => ({
  //   ltr: { grade: 'B+', score: 72 },
  //   str: { grade: 'A-', score: 84 },
  //   brrrr: { grade: 'A', score: 88 },
  //   flip: { grade: 'B', score: 68 },
  //   house_hack: { grade: 'A-', score: 82 },
  //   wholesale: { grade: 'C+', score: 55 },
  // }), []);
  
  // USE REAL DATA from API
  const strategyGrades = useMemo((): StrategyGrades => {
    // Use API data if available, otherwise provide loading state
    if (apiStrategyGrades) {
      return apiStrategyGrades;
    }
    // Fallback while loading
    return {
      ltr: { grade: '-', score: 0 },
      str: { grade: '-', score: 0 },
      brrrr: { grade: '-', score: 0 },
      flip: { grade: '-', score: 0 },
      house_hack: { grade: '-', score: 0 },
      wholesale: { grade: '-', score: 0 },
    };
  }, [apiStrategyGrades]);

  // Generate benchmarks
  const benchmarks = useMemo((): BenchmarkConfig[] => {
    if (!activeStrategy) return [];
    
    return [
      {
        id: 'coc',
        label: 'Cash-on-Cash Return',
        value: iqTarget.cashOnCash,
        formattedValue: `${(iqTarget.cashOnCash * 100).toFixed(1)}%`,
        status: iqTarget.cashOnCash >= 0.10 ? 'high' : iqTarget.cashOnCash >= 0.06 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, iqTarget.cashOnCash * 500)),
        zones: {
          low: { label: 'Low', range: '<5%' },
          average: { label: 'Avg', range: '6-10%' },
          high: { label: 'High', range: '12%+' },
        },
      },
      {
        id: 'cap',
        label: 'Cap Rate',
        value: iqTarget.capRate,
        formattedValue: `${(iqTarget.capRate * 100).toFixed(1)}%`,
        status: iqTarget.capRate >= 0.07 ? 'high' : iqTarget.capRate >= 0.05 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, iqTarget.capRate * 1000)),
        zones: {
          low: { label: 'Low', range: '<4%' },
          average: { label: 'Avg', range: '5-7%' },
          high: { label: 'High', range: '8%+' },
        },
      },
      {
        id: 'dscr',
        label: 'Debt Service Coverage',
        value: iqTarget.dscr,
        formattedValue: iqTarget.dscr.toFixed(2),
        status: iqTarget.dscr >= 1.25 ? 'high' : iqTarget.dscr >= 1.0 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, (iqTarget.dscr - 0.5) * 50)),
        zones: {
          low: { label: 'Low', range: '<1.0' },
          average: { label: 'Avg', range: '1.0-1.25' },
          high: { label: 'High', range: '1.3+' },
        },
      },
    ];
  }, [activeStrategy, iqTarget]);

  // Returns data
  const returnsData = useMemo(() => {
    if (!activeStrategy) return null;
    
    switch (activeStrategy) {
      case 'ltr':
        return createLTRReturns(iqTarget.monthlyCashFlow, iqTarget.cashOnCash, iqTarget.capRate, iqTarget.dscr);
      case 'str':
        return createSTRReturns(iqTarget.monthlyCashFlow * 1.5, iqTarget.cashOnCash * 1.3, assumptions.monthlyRent * 12 * 1.8, assumptions.occupancyRate);
      case 'brrrr':
        return createBRRRRReturns(100, 85000, 0, iqTarget.monthlyCashFlow);
      default:
        return createLTRReturns(iqTarget.monthlyCashFlow, iqTarget.cashOnCash, iqTarget.capRate, iqTarget.dscr);
    }
  }, [activeStrategy, iqTarget, assumptions]);

  // Negotiation plan
  const negotiationPlan = useMemo(() => {
    return generateNegotiationPlan(
      assumptions.listPrice,
      iqTarget.targetPrice,
      0.70,
      undefined,
      [
        LEVERAGE_POINTS.daysOnMarket(45, 28),
        LEVERAGE_POINTS.priceReduced(2),
        LEVERAGE_POINTS.cashOffer(),
      ]
    );
  }, [assumptions.listPrice, iqTarget.targetPrice]);

  // Price ladder
  const priceLadder = useMemo(() => {
    return generatePriceLadder(
      assumptions.listPrice,
      iqTarget.targetPrice,
      'IQ Target',
      iqTarget.highlightedMetric,
      iqTarget.breakeven,
      'Breakeven',
      '$0 monthly cash flow'
    );
  }, [assumptions.listPrice, iqTarget]);

  // ============================================
  // Deal Score - USE BACKEND DATA
  // ============================================
  // OLD MOCK DATA (commented out for Phase 3 cleanup):
  // const dealScoreMock = useMemo(() => {
  //   const breakevenPrice = iqTarget.breakeven || iqTarget.targetPrice;
  //   const listPrice = assumptions.listPrice;
  //   return calculateDealScoreData(breakevenPrice, listPrice);
  // }, [iqTarget, assumptions]);
  
  // USE REAL DATA from API
  const dealScore = useMemo(() => {
    // If API data is available, use it directly
    if (apiDealScore && apiDealScore.score > 0) {
      // Build breakdown from opportunity factors if available
      const breakdown = [
        { 
          id: 'discount', 
          label: 'Discount Required', 
          points: Math.round(100 - (apiDiscountPercent || 0)), 
          maxPoints: 100 
        }
      ];
      
      return {
        score: apiDealScore.score,
        grade: apiDealScore.grade,
        label: apiDealScore.label,
        color: apiDealScore.color,
        breakdown,
        discountPercent: apiDiscountPercent || 0,
        breakevenPrice: apiBreakevenPrice || iqTarget.breakeven,
        listPrice: assumptions.listPrice,
      };
    }
    
    // Fallback to local calculation if API not available
    const breakevenPrice = iqTarget.breakeven || iqTarget.targetPrice;
    const listPrice = assumptions.listPrice;
    return calculateDealScoreData(breakevenPrice, listPrice);
  }, [apiDealScore, apiDiscountPercent, apiBreakevenPrice, iqTarget, assumptions]);

  // Insight
  const insight = useMemo(() => {
    if (iqTarget.monthlyCashFlow > 300) {
      return createIQInsight('success', 'Strong Cash Flow', `This property generates $${Math.round(iqTarget.monthlyCashFlow)}/mo positive cash flow at the target price, exceeding the $300/mo benchmark.`);
    } else if (iqTarget.monthlyCashFlow > 0) {
      return createIQInsight('tip', 'Positive Cash Flow', `At ${(iqTarget.cashOnCash * 100).toFixed(1)}% cash-on-cash return, this deal meets basic investment criteria.`);
    }
    return createIQInsight('warning', 'Thin Margins', 'Consider negotiating a lower price or finding ways to increase rental income.');
  }, [iqTarget]);

  // Profit Zone Dashboard data
  const profitZoneMetrics = useMemo((): ProfitZoneMetrics => {
    const downPayment = iqTarget.targetPrice * assumptions.downPaymentPct;
    const closingCosts = iqTarget.targetPrice * assumptions.closingCostsPct;
    const totalCashNeeded = downPayment + closingCosts;
    
    return {
      buyPrice: iqTarget.targetPrice,
      cashNeeded: totalCashNeeded,
      monthlyCashFlow: iqTarget.monthlyCashFlow,
      cashOnCash: iqTarget.cashOnCash * 100, // Convert to percentage
      capRate: iqTarget.capRate * 100, // Convert to percentage
      dealScore: dealScore.score,
    };
  }, [iqTarget, assumptions, dealScore]);

  const profitZoneTips = useMemo(() => {
    // Calculate projected profit (10-year equity gain estimate)
    const projectedProfit = iqTarget.monthlyCashFlow * 12 * 10 + (assumptions.arv - iqTarget.targetPrice);
    return generateProfitZoneTips(profitZoneMetrics, projectedProfit);
  }, [profitZoneMetrics, iqTarget, assumptions]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#07172e' : '#f8fafc' }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Property Mini Card */}
        <PropertyMiniCardNew property={property} isDark={isDark} onExpand={onBack} />

        {/* Landing State - No Strategy Selected */}
        {!activeStrategy && (
          <View style={styles.section}>
            {/* Welcome Section */}
            <WelcomeSection
              isCollapsed={isWelcomeCollapsed}
              onToggle={() => setIsWelcomeCollapsed(!isWelcomeCollapsed)}
              isDark={isDark}
            />

            {/* Strategy Prompt */}
            <StrategyPrompt isDark={isDark} />

            {/* Strategy Grid */}
            <StrategyGrid
              activeStrategy={activeStrategy}
              onSelectStrategy={(id) => {
                setActiveStrategy(id);
                setActiveSubTab('metrics');
                setCompareView('target');
                setIsWelcomeCollapsed(true);
              }}
              isDark={isDark}
            />
          </View>
        )}

        {/* Strategy Selected - Show Horizontal Selector + Content */}
        {activeStrategy && (
          <View style={styles.section}>
            <StrategySelectorNew
              onStrategyChange={(id) => {
                setActiveSubTab('metrics');
                setCompareView('target');
              }}
              isDark={isDark}
              showCTABanner={false}
            />
          </View>
        )}

        {/* Content when strategy is selected */}
        {activeStrategy && (
          <>
            {/* Sub-Tab Navigation */}
            <View style={styles.section}>
              <SubTabNav
                activeTab={activeSubTab}
                onTabChange={(tab) => setActiveSubTab(tab as SubTabId)}
                tabs={SUB_TABS.map(t => ({ id: t.id, label: t.label }))}
                isDark={isDark}
              />
            </View>

            {/* Compare Toggle */}
            <View style={styles.section}>
              <CompareToggle
                view={compareView}
                onViewChange={setCompareView}
                isDark={isDark}
              />
            </View>

            {/* Tab Content */}
            {activeSubTab === 'metrics' && (
              <>
                <IQTargetHero iqTarget={iqTarget} strategy={activeStrategy} isDark={isDark} />
                
                {/* NEW: Profit Zone Dashboard */}
                <View style={styles.section}>
                  <ProfitZoneDashboard
                    metrics={profitZoneMetrics}
                    projectedProfit={iqTarget.monthlyCashFlow * 12 * 10 + (assumptions.arv - iqTarget.targetPrice)}
                    breakevenPrice={iqTarget.breakeven}
                    listPrice={assumptions.listPrice}
                    tips={profitZoneTips}
                    isDark={isDark}
                  />
                </View>
                
                <View style={styles.section}>
                  <PriceLadder rungs={priceLadder} isDark={isDark} />
                </View>

                {returnsData && (
                  <View style={styles.section}>
                    <ReturnsGrid 
                      metrics={returnsData} 
                      badge={iqTarget.monthlyCashFlow > 0 ? 'POSITIVE' : undefined}
                      isDark={isDark} 
                    />
                  </View>
                )}

                <View style={styles.section}>
                  <PerformanceBenchmarks benchmarks={benchmarks} isDark={isDark} />
                </View>

                <View style={styles.section}>
                  <NegotiationPlan plan={negotiationPlan} isDark={isDark} />
                </View>

                <View style={styles.section}>
                  <TuneSectionNew
                    isDark={isDark}
                  />
                </View>

                <View style={styles.section}>
                  <InsightCard insight={insight} isDark={isDark} />
                </View>
              </>
            )}

            {activeSubTab === 'score' && (
              <View style={styles.section}>
                <DealScoreDisplayNew
                  data={dealScore}
                  strengths={
                    (dealScore.discountPercent || 0) <= 5 
                      ? ['Profitable near list price'] 
                      : (dealScore.discountPercent || 0) <= 10 
                        ? ['Achievable with typical negotiation'] 
                        : []
                  }
                  weaknesses={
                    (dealScore.discountPercent || 0) > 25 
                      ? [`Requires ${(dealScore.discountPercent || 0).toFixed(0)}% discount`] 
                      : (dealScore.discountPercent || 0) > 15 
                        ? [`Needs ${(dealScore.discountPercent || 0).toFixed(0)}% off list`] 
                        : []
                  }
                  isDark={isDark}
                />
              </View>
            )}

            {activeSubTab === 'funding' && (
              <View style={styles.section}>
                <FundingTabContent
                  assumptions={assumptions}
                  onAssumptionChange={updateAssumption}
                  isDark={isDark}
                  apiProjections={apiProjections}
                  isLoading={isAnalysisLoading}
                  targetPrice={apiTargetPrice}
                />
              </View>
            )}

            {activeSubTab === 'ten_year' && (
              <View style={styles.section}>
                <TenYearTabContent
                  assumptions={assumptions}
                  iqTarget={iqTarget}
                  strategy={activeStrategy}
                  isDark={isDark}
                  apiProjections={apiProjections}
                  isLoading={isAnalysisLoading}
                />
              </View>
            )}

            {activeSubTab === 'growth' && (
              <View style={styles.section}>
                <GrowthTabContent
                  assumptions={assumptions}
                  isDark={isDark}
                  growthAssumptions={growthAssumptions}
                  onGrowthAssumptionChange={updateGrowthAssumption}
                  apiProjections={apiProjections}
                  isLoading={isAnalysisLoading}
                  targetPrice={apiTargetPrice}
                />
              </View>
            )}

            {activeSubTab === 'what_if' && (
              <View style={styles.section}>
                <TuneSectionNew
                  isDark={isDark}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[
        styles.bottomBar,
        { 
          backgroundColor: isDark ? 'rgba(7, 23, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
        }
      ]}>
        <TouchableOpacity style={styles.bottomBtn} onPress={onSave}>
          <Text style={styles.bottomBtnIcon}>🔖</Text>
          <Text style={[styles.bottomBtnText, { color: isDark ? '#fff' : '#07172e' }]}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomBtnPrimary}
          onPress={onGenerateLOI}
        >
          <LinearGradient
            colors={isDark ? ['#0097a7', '#4dd0e1'] : ['#007ea7', '#0097a7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bottomBtnGradient}
          >
            <Text style={styles.bottomBtnPrimaryIcon}>📝</Text>
            <Text style={styles.bottomBtnPrimaryText}>Generate LOI</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomBtn} onPress={onShare}>
          <Text style={styles.bottomBtnIcon}>📤</Text>
          <Text style={[styles.bottomBtnText, { color: isDark ? '#fff' : '#07172e' }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  section: {
    marginTop: 14,
  },
  placeholder: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  bottomBtn: {
    alignItems: 'center',
    padding: 8,
  },
  bottomBtnIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  bottomBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bottomBtnPrimary: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  bottomBtnPrimaryIcon: {
    fontSize: 14,
  },
  bottomBtnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
