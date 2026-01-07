/**
 * Fix & Flip Strategy Screen
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { formatCurrency, formatPercent } from '@/components/analytics/formatters';
import {
  analyzeFlip,
  DEFAULT_FLIP_INPUTS,
  FlipInputs,
} from '@/components/analytics/strategies';
import {
  StrategyHeader,
  MetricCard,
  CostBreakdownChart,
  TimelineCard,
  InsightsSection,
} from '@/components/analytics/strategies/components';

export default function FlipStrategyScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  const [inputs, setInputs] = useState<FlipInputs>(DEFAULT_FLIP_INPUTS);

  const analysis = useMemo(() => analyzeFlip(inputs), [inputs]);
  const { metrics, score, grade, color, insights } = analysis;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Fix & Flip Analysis</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {address ? decodeURIComponent(address) : 'Renovation Project'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Strategy Header */}
        <StrategyHeader
          strategyType="fixAndFlip"
          score={score}
          grade={grade}
          gradeColor={color}
          primaryMetric={{
            label: 'Net Profit',
            value: formatCurrency(metrics.netProfit),
            subValue: `${formatPercent(metrics.roi)} ROI`,
          }}
        />

        {/* 70% Rule Check */}
        <View style={[
          styles.ruleCard, 
          { 
            backgroundColor: metrics.meetsSeventyPercentRule 
              ? 'rgba(34,197,94,0.1)' 
              : 'rgba(239,68,68,0.1)',
            borderColor: metrics.meetsSeventyPercentRule 
              ? colors.success 
              : colors.error,
          }
        ]}>
          <View style={styles.ruleHeader}>
            <Text style={styles.ruleIcon}>
              {metrics.meetsSeventyPercentRule ? '✅' : '⚠️'}
            </Text>
            <Text style={[
              styles.ruleTitle, 
              { color: metrics.meetsSeventyPercentRule ? colors.success : colors.error }
            ]}>
              70% Rule {metrics.meetsSeventyPercentRule ? 'Met' : 'Not Met'}
            </Text>
          </View>
          <View style={styles.ruleDetails}>
            <View style={styles.ruleItem}>
              <Text style={[styles.ruleLabel, { color: theme.textSecondary }]}>MAO</Text>
              <Text style={[styles.ruleValue, { color: theme.text }]}>
                {formatCurrency(metrics.maxAllowableOffer)}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={[styles.ruleLabel, { color: theme.textSecondary }]}>Your Price</Text>
              <Text style={[
                styles.ruleValue, 
                { color: metrics.meetsSeventyPercentRule ? colors.success : colors.error }
              ]}>
                {formatCurrency(inputs.purchasePrice)}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={[styles.ruleLabel, { color: theme.textSecondary }]}>Difference</Text>
              <Text style={[
                styles.ruleValue, 
                { color: metrics.meetsSeventyPercentRule ? colors.success : colors.error }
              ]}>
                {formatCurrency(metrics.maxAllowableOffer - inputs.purchasePrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Net Profit"
            value={formatCurrency(metrics.netProfit)}
            icon="💰"
            trend={metrics.netProfit >= 25000 ? 'up' : metrics.netProfit < 15000 ? 'down' : 'neutral'}
            highlighted={metrics.netProfit >= 50000}
          />
          <MetricCard
            label="ROI"
            value={formatPercent(metrics.roi)}
            icon="%"
            benchmark={{ target: 20, current: metrics.roi, format: 'percentage' }}
          />
          <MetricCard
            label="Annualized ROI"
            value={formatPercent(metrics.annualizedROI)}
            icon="📈"
            subLabel={`${metrics.totalProjectTime.toFixed(1)} mo project`}
          />
          <MetricCard
            label="Cash Required"
            value={formatCurrency(metrics.cashRequired)}
            icon="💵"
          />
        </View>

        {/* Timeline */}
        <TimelineCard
          title="📅 Project Timeline"
          phases={[
            {
              label: 'Acquisition',
              duration: '2-3 weeks',
              icon: '🏠',
              color: '#3b82f6',
              description: 'Close on property',
            },
            {
              label: 'Renovation',
              duration: `${inputs.rehabTimeMonths} months`,
              icon: '🔨',
              color: '#f59e0b',
              description: `${formatCurrency(inputs.rehabBudget)} budget`,
            },
            {
              label: 'Marketing',
              duration: `${inputs.daysOnMarket} days`,
              icon: '📸',
              color: '#8b5cf6',
              description: 'List and show property',
            },
            {
              label: 'Closing',
              duration: '30-45 days',
              icon: '🤝',
              color: '#22c55e',
              description: `Sell at ${formatCurrency(inputs.arv)}`,
            },
          ]}
          totalDuration={`~${Math.ceil(metrics.totalProjectTime)} months`}
        />

        {/* Deal Analysis */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📊 Deal Analysis</Text>
          
          <View style={styles.analysisFlow}>
            {/* ARV */}
            <View style={styles.analysisItem}>
              <Text style={[styles.analysisLabel, { color: colors.success }]}>
                After Repair Value
              </Text>
              <Text style={[styles.analysisValue, { color: colors.success }]}>
                {formatCurrency(inputs.arv)}
              </Text>
            </View>

            {/* Minus Total Costs */}
            <View style={styles.minusRow}>
              <Text style={[styles.minusSign, { color: theme.textSecondary }]}>−</Text>
            </View>

            <View style={styles.analysisItem}>
              <Text style={[styles.analysisLabel, { color: colors.error }]}>
                Total Costs
              </Text>
              <Text style={[styles.analysisValue, { color: colors.error }]}>
                {formatCurrency(metrics.totalCost)}
              </Text>
            </View>

            {/* Equals Profit */}
            <View style={styles.equalsRow}>
              <View style={[styles.equalsDivider, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.analysisItem}>
              <Text style={[styles.analysisLabel, { color: theme.text }]}>
                Net Profit
              </Text>
              <Text style={[
                styles.profitValue, 
                { color: metrics.netProfit >= 0 ? colors.success : colors.error }
              ]}>
                {formatCurrency(metrics.netProfit)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cost Breakdown */}
        <CostBreakdownChart
          title="💸 Total Costs Breakdown"
          items={[
            { label: 'Purchase & Closing', value: metrics.purchaseCosts, color: '#3b82f6' },
            { label: 'Rehab', value: metrics.rehabCosts, color: '#f59e0b' },
            { label: 'Holding Costs', value: metrics.holdingCosts, color: '#ef4444' },
            { label: 'Financing Costs', value: metrics.financingCosts, color: '#8b5cf6' },
            { label: 'Selling Costs', value: metrics.sellingCosts, color: '#06b6d4' },
          ]}
        />

        {/* Profit Scenarios */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🎯 What-If Scenarios</Text>
          
          <View style={styles.scenariosGrid}>
            {/* Best Case */}
            <View style={[styles.scenarioCard, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
              <Text style={styles.scenarioIcon}>📈</Text>
              <Text style={[styles.scenarioLabel, { color: theme.textSecondary }]}>
                ARV +10%
              </Text>
              <Text style={[styles.scenarioValue, { color: colors.success }]}>
                {formatCurrency(metrics.netProfit + inputs.arv * 0.10)}
              </Text>
            </View>

            {/* Base Case */}
            <View style={[styles.scenarioCard, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Text style={styles.scenarioIcon}>📋</Text>
              <Text style={[styles.scenarioLabel, { color: theme.textSecondary }]}>
                Base Case
              </Text>
              <Text style={[styles.scenarioValue, { color: colors.primary }]}>
                {formatCurrency(metrics.netProfit)}
              </Text>
            </View>

            {/* Worst Case */}
            <View style={[styles.scenarioCard, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Text style={styles.scenarioIcon}>📉</Text>
              <Text style={[styles.scenarioLabel, { color: theme.textSecondary }]}>
                ARV -10%
              </Text>
              <Text style={[
                styles.scenarioValue, 
                { color: metrics.netProfit - inputs.arv * 0.10 >= 0 ? colors.warning : colors.error }
              ]}>
                {formatCurrency(metrics.netProfit - inputs.arv * 0.10)}
              </Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <InsightsSection insights={insights} title="🎯 Flip Insights" />

        {/* Bottom Spacer */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  ruleCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ruleIcon: {
    fontSize: 20,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  ruleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ruleItem: {
    alignItems: 'center',
  },
  ruleLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  ruleValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  analysisFlow: {
    alignItems: 'center',
  },
  analysisItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  analysisLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  analysisValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  minusRow: {
    paddingVertical: 4,
  },
  minusSign: {
    fontSize: 24,
    fontWeight: '300',
  },
  equalsRow: {
    width: '100%',
    paddingVertical: 8,
  },
  equalsDivider: {
    height: 2,
    borderRadius: 1,
  },
  profitValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  scenariosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  scenarioCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scenarioIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  scenarioLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  scenarioValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});

