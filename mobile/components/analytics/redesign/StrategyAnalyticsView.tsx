/**
 * StrategyAnalyticsView - Main container for the redesigned analytics
 * Integrates all new components into a cohesive view
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
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

import { IQTargetHero } from './IQTargetHero';
import { PriceLadder, generatePriceLadder } from './PriceLadder';
import { PerformanceBenchmarks } from './SpectrumBar';
import { NegotiationPlan, generateNegotiationPlan, LEVERAGE_POINTS } from './NegotiationPlan';
import { StrategySelectorNew, SubTabNav } from './StrategySelectorNew';
import { TuneSectionNew, createSliderConfig, formatCurrency, formatPercent } from './TuneSectionNew';
import { DealScoreDisplayNew, calculateDealScoreData } from './DealScoreDisplayNew';
import { InsightCard, createIQInsight } from './InsightCard';
import { CompareToggle } from './CompareToggle';
import { ReturnsGrid, createLTRReturns, createSTRReturns, createBRRRRReturns } from './ReturnsGrid';
import { PropertyMiniCardNew } from './PropertyMiniCardNew';

interface StrategyAnalyticsViewProps {
  property: PropertyData;
  isDark?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onGenerateLOI?: () => void;
  onShare?: () => void;
}

export function StrategyAnalyticsView({
  property,
  isDark = true,
  onBack,
  onSave,
  onGenerateLOI,
  onShare,
}: StrategyAnalyticsViewProps) {
  // State
  const [activeStrategy, setActiveStrategy] = useState<StrategyId | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('metrics');
  const [compareView, setCompareView] = useState<CompareView>('target');
  
  // Assumptions state
  const [assumptions, setAssumptions] = useState<TargetAssumptions>({
    listPrice: property.listPrice,
    downPaymentPct: 0.20,
    interestRate: 0.073,
    loanTermYears: 30,
    closingCostsPct: 0.03,
    monthlyRent: property.monthlyRent,
    averageDailyRate: property.averageDailyRate || 195,
    occupancyRate: property.occupancyRate || 0.72,
    vacancyRate: 0.05,
    propertyTaxes: property.propertyTaxes,
    insurance: property.insurance,
    managementPct: 0.08,
    maintenancePct: 0.05,
    rehabCost: 25000,
    arv: property.arv || property.listPrice * 1.2,
    holdingPeriodMonths: 6,
    sellingCostsPct: 0.08,
    roomsRented: 2,
    totalBedrooms: property.bedrooms,
    wholesaleFeePct: 0.10,
  });

  const updateAssumption = useCallback((key: keyof TargetAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Calculate IQ Target (simplified calculation)
  const iqTarget = useMemo((): IQTargetResult => {
    const targetPrice = Math.round(assumptions.listPrice * 0.80); // 20% below list
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

    return {
      targetPrice,
      discountFromList: assumptions.listPrice - targetPrice,
      discountPercent: 0.20,
      breakeven: Math.round(assumptions.listPrice * 0.88),
      breakevenPercent: 0.88,
      rationale: `At this price you achieve positive $${Math.round(monthlyCashFlow)}/mo cash flow with ${(cashOnCash * 100).toFixed(1)}% return`,
      highlightedMetric: `$${Math.round(monthlyCashFlow)}/mo cash flow`,
      secondaryMetric: `${(cashOnCash * 100).toFixed(1)}% CoC`,
      monthlyCashFlow,
      cashOnCash,
      capRate,
      dscr,
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
  }, [assumptions, activeStrategy]);

  // Generate strategy grades (simplified)
  const strategyGrades = useMemo(() => ({
    ltr: { grade: 'B+', score: 72 },
    str: { grade: 'A-', score: 84 },
    brrrr: { grade: 'A', score: 88 },
    flip: { grade: 'B', score: 68 },
    house_hack: { grade: 'A-', score: 82 },
    wholesale: { grade: 'C+', score: 55 },
  }), []);

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

  // Generate tune groups
  const tuneGroups = useMemo((): TuneGroup[] => {
    const baseGroups: TuneGroup[] = [
      {
        id: 'purchase',
        title: 'Purchase Price',
        sliders: [
          createSliderConfig('listPrice', 'Purchase Price', assumptions.listPrice, 100000, 1000000, 5000, formatCurrency),
        ],
      },
      {
        id: 'financing',
        title: 'Financing',
        sliders: [
          createSliderConfig('downPaymentPct', 'Down Payment', assumptions.downPaymentPct, 0.05, 0.30, 0.01, (v) => formatPercent(v, 0)),
          createSliderConfig('interestRate', 'Interest Rate', assumptions.interestRate, 0.05, 0.10, 0.00125, (v) => formatPercent(v, 2)),
        ],
      },
      {
        id: 'rental',
        title: 'Rental Income',
        sliders: [
          createSliderConfig('monthlyRent', 'Monthly Rent', assumptions.monthlyRent, 1000, 8000, 50, formatCurrency),
          createSliderConfig('vacancyRate', 'Vacancy', assumptions.vacancyRate, 0, 0.15, 0.01, (v) => formatPercent(v, 0)),
        ],
      },
    ];

    return baseGroups;
  }, [assumptions]);

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

  // Deal score
  const dealScore = useMemo(() => {
    return calculateDealScoreData({
      cashFlow: iqTarget.monthlyCashFlow,
      cashOnCash: iqTarget.cashOnCash,
      capRate: iqTarget.capRate,
      onePercentRule: assumptions.monthlyRent / assumptions.listPrice,
      dscr: iqTarget.dscr,
      equityPotential: 0.15,
      riskBuffer: 0.8,
    });
  }, [iqTarget, assumptions]);

  // Insight
  const insight = useMemo(() => {
    if (iqTarget.monthlyCashFlow > 300) {
      return createIQInsight('success', 'Strong Cash Flow', `This property generates $${Math.round(iqTarget.monthlyCashFlow)}/mo positive cash flow at the target price, exceeding the $300/mo benchmark.`);
    } else if (iqTarget.monthlyCashFlow > 0) {
      return createIQInsight('tip', 'Positive Cash Flow', `At ${(iqTarget.cashOnCash * 100).toFixed(1)}% cash-on-cash return, this deal meets basic investment criteria.`);
    }
    return createIQInsight('warning', 'Thin Margins', 'Consider negotiating a lower price or finding ways to increase rental income.');
  }, [iqTarget]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#07172e' : '#f8fafc' }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Property Mini Card */}
        <PropertyMiniCardNew property={property} isDark={isDark} onExpand={onBack} />

        {/* Strategy Selector */}
        <View style={styles.section}>
          <StrategySelectorNew
            activeStrategy={activeStrategy}
            onStrategyChange={setActiveStrategy}
            strategyGrades={strategyGrades}
            isDark={isDark}
            showCTABanner={!activeStrategy}
          />
        </View>

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
                    groups={tuneGroups}
                    onSliderChange={updateAssumption}
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
                  strengths={iqTarget.monthlyCashFlow > 300 ? ['Strong cash flow'] : []}
                  weaknesses={iqTarget.dscr < 1.25 ? ['DSCR below 1.25'] : []}
                  isDark={isDark}
                />
              </View>
            )}

            {activeSubTab === 'funding' && (
              <View style={styles.section}>
                <Text style={[styles.placeholder, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
                  Funding tab content coming soon...
                </Text>
              </View>
            )}

            {activeSubTab === 'ten_year' && (
              <View style={styles.section}>
                <Text style={[styles.placeholder, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
                  10-Year projections coming soon...
                </Text>
              </View>
            )}

            {activeSubTab === 'growth' && (
              <View style={styles.section}>
                <Text style={[styles.placeholder, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
                  Growth analysis coming soon...
                </Text>
              </View>
            )}

            {activeSubTab === 'what_if' && (
              <View style={styles.section}>
                <TuneSectionNew
                  groups={tuneGroups}
                  onSliderChange={updateAssumption}
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
