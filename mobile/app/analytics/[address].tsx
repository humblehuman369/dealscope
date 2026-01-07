/**
 * PropertyAnalyticsScreen - Main analytics page with Deal Score and Strategy Selector
 * Route: /analytics/[address]
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';

// Analytics components
import {
  AnalyticsInputs,
  DEFAULT_INPUTS,
  SLIDER_GROUPS,
  StrategyType,
  calculateMetrics,
  calculateDealScore,
  generateInsights,
} from '../../components/analytics';

import { DealScoreCard } from '../../components/analytics/DealScoreCard';
import { MetricsGrid } from '../../components/analytics/MetricsGrid';
import { SmartInsights } from '../../components/analytics/SmartInsights';
import { TuneSliders } from '../../components/analytics/TuneSliders';
import { BestStrategyCard, STRATEGIES } from '../../components/analytics/BestStrategyCard';
import { PropertyMiniCard } from '../../components/analytics/PropertyMiniCard';
import { StrategySelector, STRATEGY_LIST } from '../../components/analytics/StrategySelector';
import { useAllStrategies, getStrategyScores } from '../../components/analytics/hooks/useAllStrategies';

export default function PropertyAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  const decodedAddress = decodeURIComponent(address || '');

  // Mock property data - in real app, fetch from API
  const property = useMemo(() => ({
    address: decodedAddress || '3742 Old Lighthouse Cir',
    city: 'Jupiter',
    state: 'FL',
    price: 617670,
  }), [decodedAddress]);

  // Analytics inputs state
  const [inputs, setInputs] = useState<AnalyticsInputs>({
    ...DEFAULT_INPUTS,
    purchasePrice: property.price,
    monthlyRent: Math.round(property.price * 0.006), // Rough rent estimate
  });

  // Active strategy state
  const [activeStrategy, setActiveStrategy] = useState<StrategyType>('longTermRental');

  // Analyze all strategies
  const allStrategies = useAllStrategies(inputs);
  const strategyScores = getStrategyScores(allStrategies);

  // Get current strategy data
  const currentStrategyData = allStrategies.strategies[activeStrategy];
  const currentScore = useMemo(() => ({
    score: currentStrategyData.score,
    grade: currentStrategyData.grade,
    label: getScoreLabel(currentStrategyData.score),
    color: currentStrategyData.color,
    breakdown: [], // Would be populated by strategy-specific breakdown
  }), [currentStrategyData]);

  // Calculate LTR metrics for display (when LTR is selected)
  const ltrMetrics = useMemo(() => calculateMetrics(inputs), [inputs]);
  const ltrInsights = useMemo(() => generateInsights(ltrMetrics, inputs), [ltrMetrics, inputs]);

  // Handle input changes
  const handleInputChange = useCallback((key: keyof AnalyticsInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle strategy change
  const handleStrategyChange = useCallback((strategy: StrategyType) => {
    setActiveStrategy(strategy);
  }, []);

  // Navigate to breakdown
  const handleViewBreakdown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/analytics/breakdown/[address]',
      params: { 
        address: encodeURIComponent(decodedAddress),
        strategy: activeStrategy,
      },
    });
  }, [router, decodedAddress, activeStrategy]);

  // Navigate to strategy details
  const handleViewStrategy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/analytics/strategy/[address]',
      params: { 
        address: encodeURIComponent(decodedAddress),
        strategy: activeStrategy,
      },
    });
  }, [router, decodedAddress, activeStrategy]);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#f8fafc';
  const textColor = isDark ? '#fff' : '#07172e';

  // Get strategy info for best strategy card
  const strategyInfo = STRATEGY_LIST.find(s => s.id === allStrategies.bestStrategy);
  const bestStrategyForCard = {
    name: strategyInfo?.name || 'Long-Term Rental',
    icon: strategyInfo?.icon || '🏠',
    color: allStrategies.strategies[allStrategies.bestStrategy]?.color || '#22c55e',
    roi: getEstimatedROI(allStrategies.bestStrategy, allStrategies),
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}>
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}>
              <Text style={{ fontSize: 16 }}>🔖</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Property Mini Card */}
          <View style={styles.section}>
            <PropertyMiniCard property={property} isDark={isDark} />
          </View>

          {/* Strategy Selector */}
          <View style={styles.section}>
            <StrategySelector
              activeStrategy={activeStrategy}
              onStrategyChange={handleStrategyChange}
              strategyScores={strategyScores}
              isDark={isDark}
            />
          </View>

          {/* Deal Score Card */}
          <View style={styles.section}>
            <DealScoreCard 
              score={currentScore} 
              isDark={isDark}
              strategyName={STRATEGY_LIST.find(s => s.id === activeStrategy)?.name}
            />
          </View>

          {/* Strategy-specific content */}
          {activeStrategy === 'longTermRental' ? (
            <>
              {/* LTR Metrics Grid */}
              <View style={styles.section}>
                <MetricsGrid metrics={ltrMetrics} isDark={isDark} />
              </View>

              {/* Smart Insights */}
              <View style={styles.section}>
                <SmartInsights insights={ltrInsights} isDark={isDark} />
              </View>
            </>
          ) : (
            /* Other strategy summary */
            <View style={styles.section}>
              <StrategySummaryCard
                strategy={activeStrategy}
                data={currentStrategyData}
                isDark={isDark}
                onViewDetails={handleViewStrategy}
              />
            </View>
          )}

          {/* Best Strategy */}
          <View style={styles.section}>
            <BestStrategyCard
              strategy={bestStrategyForCard}
              onPress={() => {
                setActiveStrategy(allStrategies.bestStrategy);
              }}
              isDark={isDark}
            />
          </View>

          {/* Tune Sliders - Only for LTR */}
          {activeStrategy === 'longTermRental' && (
            <View style={styles.section}>
              <TuneSliders
                groups={SLIDER_GROUPS}
                inputs={inputs}
                onInputChange={handleInputChange}
                isDark={isDark}
              />
            </View>
          )}

          {/* CTA Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleViewBreakdown}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark ? ['#0097a7', '#4dd0e1'] : ['#007ea7', '#0097a7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaIcon}>📊</Text>
                <Text style={styles.ctaText}>View Full Breakdown</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// Helper components and functions

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Deal';
  if (score >= 70) return 'Great Deal';
  if (score >= 60) return 'Good Deal';
  if (score >= 50) return 'Fair Deal';
  if (score >= 40) return 'Below Average';
  return 'Poor Deal';
}

function getEstimatedROI(strategy: StrategyType, data: ReturnType<typeof useAllStrategies>): number {
  const strategyData = data.strategies[strategy];
  if (!strategyData?.analysis?.metrics) return 0;
  
  const metrics = strategyData.analysis.metrics as any;
  
  // Return appropriate ROI based on strategy
  switch (strategy) {
    case 'longTermRental':
    case 'shortTermRental':
    case 'houseHack':
      return metrics.cashOnCash || 0;
    case 'brrrr':
      return metrics.cashOnCash || (metrics.infiniteReturn ? 999 : 0);
    case 'fixAndFlip':
      return metrics.roi || 0;
    case 'wholesale':
      return metrics.roi || 0;
    default:
      return 0;
  }
}

interface StrategySummaryCardProps {
  strategy: StrategyType;
  data: ReturnType<typeof useAllStrategies>['strategies'][StrategyType];
  isDark: boolean;
  onViewDetails: () => void;
}

function StrategySummaryCard({ strategy, data, isDark, onViewDetails }: StrategySummaryCardProps) {
  const strategyInfo = STRATEGY_LIST.find(s => s.id === strategy);
  const metrics = data.analysis.metrics as any;

  // Get key metrics based on strategy
  const keyMetrics = getStrategyKeyMetrics(strategy, metrics);

  return (
    <View style={[
      summaryStyles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <View style={summaryStyles.header}>
        <View style={summaryStyles.headerLeft}>
          <Text style={summaryStyles.icon}>{strategyInfo?.icon}</Text>
          <Text style={[summaryStyles.title, { color: isDark ? '#fff' : '#07172e' }]}>
            {strategyInfo?.name} Analysis
          </Text>
        </View>
        <View style={[
          summaryStyles.gradeBadge,
          { backgroundColor: data.color }
        ]}>
          <Text style={summaryStyles.gradeText}>{data.grade}</Text>
        </View>
      </View>

      <View style={summaryStyles.metricsGrid}>
        {keyMetrics.map((metric, index) => (
          <View key={index} style={[
            summaryStyles.metricBox,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)' }
          ]}>
            <Text style={[summaryStyles.metricValue, { color: metric.color || (isDark ? '#fff' : '#07172e') }]}>
              {metric.value}
            </Text>
            <Text style={[summaryStyles.metricLabel, { color: '#6b7280' }]}>
              {metric.label}
            </Text>
          </View>
        ))}
      </View>

      {!data.viable && (
        <View style={summaryStyles.warningBanner}>
          <Text style={summaryStyles.warningText}>
            ⚠️ This strategy may not be viable for this property
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={summaryStyles.detailsBtn}
        onPress={onViewDetails}
      >
        <Text style={[summaryStyles.detailsBtnText, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          View Detailed Analysis →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getStrategyKeyMetrics(strategy: StrategyType, metrics: any): { label: string; value: string; color?: string }[] {
  const formatCurrency = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const formatPercent = (n: number) => `${n.toFixed(1)}%`;

  switch (strategy) {
    case 'shortTermRental':
      return [
        { label: 'Monthly Revenue', value: formatCurrency(metrics.monthlyGrossRevenue || 0) },
        { label: 'Cash Flow', value: formatCurrency(metrics.monthlyCashFlow || 0), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
        { label: 'RevPAR', value: formatCurrency(metrics.revPAR || 0) },
        { label: 'Cash-on-Cash', value: formatPercent(metrics.cashOnCash || 0), color: metrics.cashOnCash > 12 ? '#22c55e' : undefined },
      ];
    case 'brrrr':
      return [
        { label: 'Cash Left in Deal', value: formatCurrency(metrics.cashLeftInDeal || 0) },
        { label: 'Equity Created', value: formatCurrency(metrics.equityCreated || 0), color: '#22c55e' },
        { label: 'Cash Recoup', value: formatPercent(metrics.cashRecoupPercent || 0), color: metrics.cashRecoupPercent >= 100 ? '#22c55e' : undefined },
        { label: 'Monthly CF', value: formatCurrency(metrics.monthlyCashFlow || 0), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
      ];
    case 'fixAndFlip':
      return [
        { label: 'Net Profit', value: formatCurrency(metrics.netProfit || 0), color: metrics.netProfit > 0 ? '#22c55e' : '#ef4444' },
        { label: 'ROI', value: formatPercent(metrics.roi || 0), color: metrics.roi > 20 ? '#22c55e' : undefined },
        { label: 'Cash Required', value: formatCurrency(metrics.cashRequired || 0) },
        { label: 'Project Time', value: `${metrics.totalProjectTime || 0} mo` },
      ];
    case 'houseHack':
      return [
        { label: 'Housing Cost', value: formatCurrency(metrics.effectiveHousingCost || 0) },
        { label: 'Monthly Savings', value: formatCurrency(metrics.housingCostSavings || 0), color: '#22c55e' },
        { label: 'Cash Flow', value: formatCurrency(metrics.monthlyCashFlow || 0), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
        { label: 'Rent vs Buy', value: formatCurrency(metrics.rentVsBuyBenefit || 0) },
      ];
    case 'wholesale':
      return [
        { label: 'Assignment Fee', value: formatCurrency(metrics.netProfit || 0), color: '#22c55e' },
        { label: 'ROI', value: formatPercent(metrics.roi || 0), color: metrics.roi > 100 ? '#22c55e' : undefined },
        { label: 'Cash Required', value: formatCurrency(metrics.totalCashRequired || 0) },
        { label: 'Buyer Spread', value: formatCurrency(metrics.endBuyerSpread || 0) },
      ];
    default:
      return [
        { label: 'Cash Flow', value: formatCurrency(metrics.monthlyCashFlow || 0) },
        { label: 'CoC Return', value: formatPercent(metrics.cashOnCash || 0) },
        { label: 'Cap Rate', value: formatPercent(metrics.capRate || 0) },
        { label: 'DSCR', value: (metrics.dscr || 0).toFixed(2) },
      ];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 14,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ctaIcon: {
    fontSize: 16,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

const summaryStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  warningBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
  detailsBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
