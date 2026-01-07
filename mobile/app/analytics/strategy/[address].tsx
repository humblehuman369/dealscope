/**
 * StrategyDetailScreen - Detailed analysis for a specific investment strategy
 * Route: /analytics/strategy/[address]?strategy=xxx
 */

import React, { useState, useMemo } from 'react';
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

import { useTheme } from '../../../context/ThemeContext';
import {
  AnalyticsInputs,
  DEFAULT_INPUTS,
  StrategyType,
  Insight,
  formatCurrency,
  formatPercent,
} from '../../../components/analytics';

import { PropertyMiniCard } from '../../../components/analytics/PropertyMiniCard';
import { DealScoreCard } from '../../../components/analytics/DealScoreCard';
import {
  StrategyHeader,
  MetricCard,
  CostBreakdownChart,
  TimelineCard,
  InsightsSection,
} from '../../../components/analytics/strategies/components';

import { useAllStrategies } from '../../../components/analytics/hooks/useAllStrategies';
import { STRATEGY_LIST } from '../../../components/analytics/StrategySelector';

// Strategy-specific slider configurations
import {
  DEFAULT_STR_INPUTS,
  DEFAULT_BRRRR_INPUTS,
  DEFAULT_FLIP_INPUTS,
  DEFAULT_HOUSE_HACK_INPUTS,
  DEFAULT_WHOLESALE_INPUTS,
} from '../../../components/analytics/strategies';

export default function StrategyDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { address, strategy } = useLocalSearchParams<{ address: string; strategy: string }>();
  
  const decodedAddress = decodeURIComponent(address || '');
  const activeStrategy = (strategy as StrategyType) || 'longTermRental';

  // Mock property data
  const property = useMemo(() => ({
    address: decodedAddress || '3742 Old Lighthouse Cir',
    city: 'Jupiter',
    state: 'FL',
    price: 617670,
  }), [decodedAddress]);

  // Base inputs
  const baseInputs = useMemo((): AnalyticsInputs => ({
    ...DEFAULT_INPUTS,
    purchasePrice: property.price,
    monthlyRent: Math.round(property.price * 0.006),
  }), [property.price]);

  // Analyze all strategies
  const allStrategies = useAllStrategies(baseInputs);
  const strategyData = allStrategies.strategies[activeStrategy];
  const strategyInfo = STRATEGY_LIST.find(s => s.id === activeStrategy);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#f8fafc';
  const textColor = isDark ? '#fff' : '#07172e';

  // Get strategy-specific content
  const metrics = strategyData.analysis.metrics as any;
  const insights = strategyData.analysis.insights;

  // Build score object for DealScoreCard
  const scoreObj = {
    score: strategyData.score,
    grade: strategyData.grade,
    label: getScoreLabel(strategyData.score),
    color: strategyData.color,
    breakdown: [],
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
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>{strategyInfo?.icon}</Text>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {strategyInfo?.name}
            </Text>
          </View>
          
          <View style={{ width: 36 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Property Mini Card */}
          <View style={styles.section}>
            <PropertyMiniCard property={property} isDark={isDark} />
          </View>

          {/* Deal Score */}
          <View style={styles.section}>
            <DealScoreCard 
              score={scoreObj} 
              strategyName={strategyInfo?.name}
              isDark={isDark} 
            />
          </View>

          {/* Viability Banner */}
          {!strategyData.viable && (
            <View style={styles.section}>
              <View style={[styles.warningBanner, { 
                backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                borderColor: 'rgba(239,68,68,0.3)',
              }]}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={[styles.warningTitle, { color: '#ef4444' }]}>
                    Strategy May Not Be Viable
                  </Text>
                  <Text style={[styles.warningText, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
                    {getViabilityMessage(activeStrategy, metrics)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Strategy-Specific Metrics */}
          <View style={styles.section}>
            <StrategyMetrics 
              strategy={activeStrategy} 
              metrics={metrics} 
              isDark={isDark} 
            />
          </View>

          {/* Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <InsightCards insights={insights} isDark={isDark} />
            </View>
          )}

          {/* Cost/Revenue Breakdown */}
          <View style={styles.section}>
            <StrategyBreakdown
              strategy={activeStrategy}
              metrics={metrics}
              isDark={isDark}
            />
          </View>

          {/* Compare Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.compareBtn, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/analytics/breakdown/[address]',
                  params: { address, strategy: activeStrategy },
                });
              }}
            >
              <Text style={[styles.compareBtnText, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
                📊 View Full Breakdown & Comparisons
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// Helper functions
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Deal';
  if (score >= 70) return 'Great Deal';
  if (score >= 60) return 'Good Deal';
  if (score >= 50) return 'Fair Deal';
  if (score >= 40) return 'Below Average';
  return 'Poor Deal';
}

function getViabilityMessage(strategy: StrategyType, metrics: any): string {
  switch (strategy) {
    case 'shortTermRental':
      return 'Low occupancy or negative cash flow makes this strategy risky.';
    case 'brrrr':
      return 'Insufficient equity or negative cash flow after refinance.';
    case 'fixAndFlip':
      return 'Does not meet 70% rule or insufficient profit margin.';
    case 'houseHack':
      return 'Rental income does not adequately offset housing costs.';
    case 'wholesale':
      return 'Spread is too thin for end buyers.';
    default:
      return 'Cash flow is negative or DSCR is below 1.0.';
  }
}

// Strategy Metrics Component
function StrategyMetrics({ strategy, metrics, isDark }: { 
  strategy: StrategyType; 
  metrics: any; 
  isDark: boolean;
}) {
  const metricsConfig = getStrategyMetricsConfig(strategy, metrics);

  return (
    <View style={[
      metricsStyles.container,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[metricsStyles.title, { color: isDark ? '#fff' : '#07172e' }]}>
        📈 Key Metrics
      </Text>
      <View style={metricsStyles.grid}>
        {metricsConfig.map((metric, index) => (
          <View 
            key={index} 
            style={[
              metricsStyles.metricBox,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)' }
            ]}
          >
            <Text style={[metricsStyles.metricValue, { color: metric.color || (isDark ? '#fff' : '#07172e') }]}>
              {metric.value}
            </Text>
            <Text style={[metricsStyles.metricLabel, { color: '#6b7280' }]}>
              {metric.label}
            </Text>
            {metric.benchmark && (
              <Text style={[metricsStyles.benchmark, { color: metric.benchmarkColor || '#22c55e' }]}>
                {metric.benchmark}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function getStrategyMetricsConfig(strategy: StrategyType, metrics: any) {
  const fmt = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;
  const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

  switch (strategy) {
    case 'shortTermRental':
      return [
        { label: 'Monthly Revenue', value: fmt(metrics.monthlyGrossRevenue) },
        { label: 'Monthly Cash Flow', value: fmt(metrics.monthlyCashFlow), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
        { label: 'RevPAR', value: fmt(metrics.revPAR), benchmark: '≥$150', benchmarkColor: metrics.revPAR >= 150 ? '#22c55e' : '#f97316' },
        { label: 'Cash-on-Cash', value: pct(metrics.cashOnCash), color: metrics.cashOnCash > 15 ? '#22c55e' : undefined, benchmark: '≥15%', benchmarkColor: metrics.cashOnCash >= 15 ? '#22c55e' : '#f97316' },
        { label: 'Cap Rate', value: pct(metrics.capRate), benchmark: '≥8%', benchmarkColor: metrics.capRate >= 8 ? '#22c55e' : '#f97316' },
        { label: 'Total Investment', value: fmt(metrics.totalCashRequired) },
      ];
    case 'brrrr':
      return [
        { label: 'Total Investment', value: fmt(metrics.totalInitialInvestment) },
        { label: 'Refinance Amount', value: fmt(metrics.refinanceLoanAmount) },
        { label: 'Cash Out', value: fmt(metrics.cashOutAmount), color: '#22c55e' },
        { label: 'Cash Left in Deal', value: fmt(metrics.cashLeftInDeal), color: metrics.cashLeftInDeal <= 0 ? '#22c55e' : undefined },
        { label: 'Cash Recoup', value: pct(metrics.cashRecoupPercent), color: metrics.cashRecoupPercent >= 100 ? '#22c55e' : undefined, benchmark: '≥100%' },
        { label: 'Equity Created', value: fmt(metrics.equityCreated), color: '#22c55e' },
        { label: 'Monthly Cash Flow', value: fmt(metrics.monthlyCashFlow), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
        { label: 'CoC Return', value: metrics.infiniteReturn ? '∞%' : pct(metrics.cashOnCash), color: metrics.infiniteReturn ? '#22c55e' : undefined },
      ];
    case 'fixAndFlip':
      return [
        { label: 'Purchase + Rehab', value: fmt(metrics.purchaseCosts + metrics.rehabCosts) },
        { label: 'Holding Costs', value: fmt(metrics.holdingCosts) },
        { label: 'Total Costs', value: fmt(metrics.totalCost) },
        { label: 'Net Profit', value: fmt(metrics.netProfit), color: metrics.netProfit > 0 ? '#22c55e' : '#ef4444' },
        { label: 'ROI', value: pct(metrics.roi), color: metrics.roi > 20 ? '#22c55e' : undefined, benchmark: '≥20%' },
        { label: 'Annualized ROI', value: pct(metrics.annualizedROI), color: metrics.annualizedROI > 30 ? '#22c55e' : undefined },
        { label: 'Cash Required', value: fmt(metrics.cashRequired) },
        { label: '70% Rule', value: metrics.meetsSeventyPercentRule ? '✓ Pass' : '✗ Fail', color: metrics.meetsSeventyPercentRule ? '#22c55e' : '#ef4444' },
      ];
    case 'houseHack':
      return [
        { label: 'Monthly Mortgage', value: fmt(metrics.mortgagePayment) },
        { label: 'Rental Income', value: fmt(metrics.grossMonthlyIncome), color: '#22c55e' },
        { label: 'Effective Housing Cost', value: fmt(metrics.effectiveHousingCost) },
        { label: 'Monthly Savings', value: fmt(metrics.housingCostSavings), color: '#22c55e' },
        { label: 'Cost Reduction', value: pct(metrics.housingCostReductionPercent), color: '#22c55e' },
        { label: 'Net Cash Flow', value: fmt(metrics.monthlyCashFlow), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
      ];
    case 'wholesale':
      return [
        { label: 'Contract Price', value: fmt(metrics.totalCashRequired - (metrics.netProfit || 0) - (metrics.marketingCosts || 500)) },
        { label: 'Assignment Fee', value: fmt(metrics.netProfit), color: '#22c55e' },
        { label: 'Net Profit', value: fmt(metrics.netProfit), color: metrics.netProfit > 0 ? '#22c55e' : '#ef4444' },
        { label: 'ROI', value: pct(metrics.roi), color: metrics.roi > 100 ? '#22c55e' : undefined },
        { label: 'End Buyer All-In', value: fmt(metrics.endBuyerAllInPrice) },
        { label: 'Buyer Max Profit', value: fmt(metrics.endBuyerMaxProfit), color: '#22c55e' },
        { label: '70% Rule', value: metrics.meetsSeventyPercentRule ? '✓ Pass' : '✗ Fail', color: metrics.meetsSeventyPercentRule ? '#22c55e' : '#ef4444' },
        { label: 'Cash Required', value: fmt(metrics.totalCashRequired) },
      ];
    default: // LTR
      return [
        { label: 'Monthly Cash Flow', value: fmt(metrics.monthlyCashFlow), color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444' },
        { label: 'Cash-on-Cash', value: pct(metrics.cashOnCash), benchmark: '≥12%', benchmarkColor: metrics.cashOnCash >= 12 ? '#22c55e' : '#f97316' },
        { label: 'Cap Rate', value: pct(metrics.capRate), benchmark: '≥8%', benchmarkColor: metrics.capRate >= 8 ? '#22c55e' : '#f97316' },
        { label: 'DSCR', value: (metrics.dscr || 0).toFixed(2), benchmark: '≥1.25', benchmarkColor: metrics.dscr >= 1.25 ? '#22c55e' : '#f97316' },
        { label: 'Total Investment', value: fmt(metrics.totalCashRequired) },
        { label: 'Annual Cash Flow', value: fmt(metrics.annualCashFlow), color: metrics.annualCashFlow > 0 ? '#22c55e' : '#ef4444' },
      ];
  }
}

// Insight Cards
function InsightCards({ insights, isDark }: { insights: Insight[]; isDark: boolean }) {
  const getInsightStyle = (type: Insight['type']) => {
    switch (type) {
      case 'strength':
        return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', icon: '✅' };
      case 'concern':
        return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: '⚠️' };
      case 'tip':
        return { bg: 'rgba(77,208,225,0.1)', border: 'rgba(77,208,225,0.2)', icon: '💡' };
      default:
        return { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', icon: 'ℹ️' };
    }
  };

  return (
    <View style={insightStyles.container}>
      <Text style={[insightStyles.title, { color: isDark ? '#fff' : '#07172e' }]}>
        💡 Insights
      </Text>
      {insights.map((insight, index) => {
        const style = getInsightStyle(insight.type);
        return (
          <View 
            key={index}
            style={[
              insightStyles.card,
              { backgroundColor: style.bg, borderColor: style.border }
            ]}
          >
            <Text style={insightStyles.icon}>{insight.icon || style.icon}</Text>
            <Text style={[insightStyles.text, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              {insight.text}
              {insight.highlight && (
                <Text style={insightStyles.highlight}> {insight.highlight}</Text>
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Strategy Breakdown
function StrategyBreakdown({ strategy, metrics, isDark }: {
  strategy: StrategyType;
  metrics: any;
  isDark: boolean;
}) {
  const breakdownData = getBreakdownData(strategy, metrics);
  
  return (
    <View style={[
      breakdownStyles.container,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[breakdownStyles.title, { color: isDark ? '#fff' : '#07172e' }]}>
        {breakdownData.title}
      </Text>
      {breakdownData.items.map((item, index) => (
        <View key={index} style={breakdownStyles.row}>
          <View style={breakdownStyles.rowLeft}>
            <View style={[breakdownStyles.dot, { backgroundColor: item.color }]} />
            <Text style={[breakdownStyles.label, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
              {item.label}
            </Text>
          </View>
          <Text style={[breakdownStyles.value, { color: item.valueColor || (isDark ? '#fff' : '#07172e') }]}>
            {item.value}
          </Text>
        </View>
      ))}
      {breakdownData.total && (
        <View style={[breakdownStyles.totalRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)' }]}>
          <Text style={[breakdownStyles.totalLabel, { color: isDark ? '#fff' : '#07172e' }]}>
            {breakdownData.total.label}
          </Text>
          <Text style={[breakdownStyles.totalValue, { color: breakdownData.total.color }]}>
            {breakdownData.total.value}
          </Text>
        </View>
      )}
    </View>
  );
}

function getBreakdownData(strategy: StrategyType, metrics: any) {
  const fmt = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;

  switch (strategy) {
    case 'shortTermRental':
      const strExp = metrics.monthlyExpenses || {};
      return {
        title: '💰 Monthly Expenses',
        items: [
          { label: 'Mortgage', value: fmt(strExp.mortgage), color: '#3b82f6' },
          { label: 'Taxes & Insurance', value: fmt((strExp.taxes || 0) + (strExp.insurance || 0)), color: '#f97316' },
          { label: 'Utilities', value: fmt(strExp.utilities), color: '#eab308' },
          { label: 'Maintenance', value: fmt(strExp.maintenance), color: '#22c55e' },
          { label: 'Management', value: fmt(strExp.management), color: '#9333ea' },
          { label: 'Platform Fees', value: fmt(strExp.platformFees), color: '#ec4899' },
          { label: 'Cleaning', value: fmt(strExp.cleaning), color: '#14b8a6' },
        ],
        total: {
          label: 'Net Cash Flow',
          value: fmt(metrics.monthlyCashFlow),
          color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444',
        },
      };
    case 'brrrr':
      return {
        title: '🏗️ Investment Breakdown',
        items: [
          { label: 'Purchase Price', value: fmt(metrics.purchaseCosts), color: '#3b82f6' },
          { label: 'Rehab Costs', value: fmt(metrics.rehabCosts), color: '#f97316' },
          { label: 'Holding Costs', value: fmt(metrics.holdingCosts), color: '#eab308' },
          { label: 'Refinance Proceeds', value: fmt(metrics.cashOutAmount), color: '#22c55e', valueColor: '#22c55e' },
        ],
        total: {
          label: 'Cash Left in Deal',
          value: fmt(metrics.cashLeftInDeal),
          color: metrics.cashLeftInDeal <= 0 ? '#22c55e' : '#f97316',
        },
      };
    case 'fixAndFlip':
      return {
        title: '🔨 Project Costs',
        items: [
          { label: 'Purchase', value: fmt(metrics.purchaseCosts), color: '#3b82f6' },
          { label: 'Rehab', value: fmt(metrics.rehabCosts), color: '#f97316' },
          { label: 'Holding', value: fmt(metrics.holdingCosts), color: '#eab308' },
          { label: 'Financing', value: fmt(metrics.financingCosts), color: '#9333ea' },
          { label: 'Selling Costs', value: fmt(metrics.sellingCosts), color: '#ec4899' },
        ],
        total: {
          label: 'Net Profit',
          value: fmt(metrics.netProfit),
          color: metrics.netProfit > 0 ? '#22c55e' : '#ef4444',
        },
      };
    default:
      return {
        title: '💵 Monthly Breakdown',
        items: [
          { label: 'Gross Income', value: fmt(metrics.grossMonthlyIncome), color: '#22c55e' },
          { label: 'Mortgage', value: fmt(metrics.mortgagePayment), color: '#3b82f6' },
          { label: 'Operating Expenses', value: fmt(metrics.totalMonthlyExpenses - metrics.mortgagePayment), color: '#f97316' },
        ],
        total: {
          label: 'Net Cash Flow',
          value: fmt(metrics.monthlyCashFlow),
          color: metrics.monthlyCashFlow > 0 ? '#22c55e' : '#ef4444',
        },
      };
  }
}

// Styles
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 14,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  compareBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  compareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const metricsStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  benchmark: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
});

const insightStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '600',
    color: '#4dd0e1',
  },
});

const breakdownStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 13,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
});

