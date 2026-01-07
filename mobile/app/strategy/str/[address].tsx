/**
 * Short-Term Rental (STR) Strategy Screen
 * Airbnb/VRBO analysis
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
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';
import { formatCurrency, formatPercent } from '@/components/analytics/formatters';
import {
  analyzeSTR,
  DEFAULT_STR_INPUTS,
  STRInputs,
} from '@/components/analytics/strategies';
import {
  StrategyHeader,
  MetricCard,
  CostBreakdownChart,
  InsightsSection,
} from '@/components/analytics/strategies/components';

export default function STRStrategyScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  // State for inputs (would come from property data in real app)
  const [inputs, setInputs] = useState<STRInputs>(DEFAULT_STR_INPUTS);

  // Calculate analysis
  const analysis = useMemo(() => analyzeSTR(inputs), [inputs]);
  const { metrics, score, grade, color, insights } = analysis;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>STR Analysis</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {address ? decodeURIComponent(address) : 'Short-Term Rental'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Strategy Header */}
        <StrategyHeader
          strategyType="shortTermRental"
          score={score}
          grade={grade}
          gradeColor={color}
          primaryMetric={{
            label: 'Monthly Cash Flow',
            value: formatCurrency(metrics.monthlyCashFlow),
            subValue: `${formatPercent(metrics.cashOnCash)} CoC`,
          }}
        />

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            label="ADR"
            value={formatCurrency(inputs.averageDailyRate)}
            icon="🌙"
            subLabel="Average Daily Rate"
          />
          <MetricCard
            label="Occupancy"
            value={formatPercent(inputs.occupancyRate * 100)}
            icon="📅"
            benchmark={{ target: 70, current: inputs.occupancyRate * 100, format: 'percentage' }}
          />
          <MetricCard
            label="RevPAR"
            value={formatCurrency(metrics.revPAR)}
            icon="📈"
            subLabel="Revenue Per Available Room"
          />
          <MetricCard
            label="Gross Revenue"
            value={formatCurrency(metrics.monthlyGrossRevenue)}
            icon="💰"
            subLabel="Monthly"
          />
        </View>

        {/* Revenue vs Expenses */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📊 Monthly Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                Gross Revenue
              </Text>
              <Text style={[styles.breakdownValue, { color: colors.success }]}>
                {formatCurrency(metrics.monthlyGrossRevenue)}
              </Text>
            </View>
            <Text style={[styles.breakdownOperator, { color: theme.textSecondary }]}>−</Text>
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                Total Expenses
              </Text>
              <Text style={[styles.breakdownValue, { color: colors.error }]}>
                {formatCurrency(
                  Object.values(metrics.monthlyExpenses).reduce((a, b) => a + b, 0)
                )}
              </Text>
            </View>
            <Text style={[styles.breakdownOperator, { color: theme.textSecondary }]}>=</Text>
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                Cash Flow
              </Text>
              <Text style={[
                styles.breakdownValue, 
                { color: metrics.monthlyCashFlow >= 0 ? colors.success : colors.error }
              ]}>
                {formatCurrency(metrics.monthlyCashFlow)}
              </Text>
            </View>
          </View>
        </View>

        {/* Expense Breakdown */}
        <CostBreakdownChart
          title="💸 Monthly Expenses"
          items={[
            { label: 'Mortgage', value: metrics.monthlyExpenses.mortgage, color: '#3b82f6' },
            { label: 'Management', value: metrics.monthlyExpenses.management, color: '#8b5cf6' },
            { label: 'Platform Fees', value: metrics.monthlyExpenses.platformFees, color: '#f59e0b' },
            { label: 'Cleaning', value: metrics.monthlyExpenses.cleaning, color: '#06b6d4' },
            { label: 'Utilities', value: metrics.monthlyExpenses.utilities, color: '#ec4899' },
            { label: 'Taxes & Insurance', value: metrics.monthlyExpenses.taxes + metrics.monthlyExpenses.insurance, color: '#10b981' },
            { label: 'Maintenance', value: metrics.monthlyExpenses.maintenance, color: '#ef4444' },
          ]}
        />

        {/* Investment Summary */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>💵 Investment Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Purchase Price
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatCurrency(inputs.purchasePrice)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Down Payment ({formatPercent(inputs.downPaymentPercent * 100)})
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatCurrency(inputs.purchasePrice * inputs.downPaymentPercent)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Furnishing Budget
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatCurrency(inputs.furnishingBudget)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>
                Total Cash Required
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                {formatCurrency(metrics.totalCashRequired)}
              </Text>
            </View>
          </View>
        </View>

        {/* Returns */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📈 Returns</Text>
          
          <View style={styles.returnsGrid}>
            <View style={[styles.returnCard, { backgroundColor: `${colors.success}15` }]}>
              <Text style={[styles.returnValue, { color: colors.success }]}>
                {formatPercent(metrics.cashOnCash)}
              </Text>
              <Text style={[styles.returnLabel, { color: theme.textSecondary }]}>
                Cash-on-Cash
              </Text>
            </View>
            <View style={[styles.returnCard, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.returnValue, { color: colors.primary }]}>
                {formatPercent(metrics.capRate)}
              </Text>
              <Text style={[styles.returnLabel, { color: theme.textSecondary }]}>
                Cap Rate
              </Text>
            </View>
            <View style={[styles.returnCard, { backgroundColor: `${colors.warning}15` }]}>
              <Text style={[styles.returnValue, { color: colors.warning }]}>
                {formatCurrency(metrics.annualCashFlow)}
              </Text>
              <Text style={[styles.returnLabel, { color: theme.textSecondary }]}>
                Annual Cash Flow
              </Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <InsightsSection insights={insights} title="🎯 Strategy Insights" />

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
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownOperator: {
    fontSize: 20,
    fontWeight: '300',
  },
  summaryGrid: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  returnsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  returnCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  returnValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  returnLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});

