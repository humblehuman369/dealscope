/**
 * House Hack Strategy Screen
 * Owner-occupied multi-unit analysis
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
  analyzeHouseHack,
  DEFAULT_HOUSE_HACK_INPUTS,
  HouseHackInputs,
} from '@/components/analytics/strategies';
import {
  StrategyHeader,
  MetricCard,
  CostBreakdownChart,
  InsightsSection,
} from '@/components/analytics/strategies/components';

export default function HouseHackStrategyScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  const [inputs, setInputs] = useState<HouseHackInputs>(DEFAULT_HOUSE_HACK_INPUTS);

  const analysis = useMemo(() => analyzeHouseHack(inputs), [inputs]);
  const { metrics, score, grade, color, insights } = analysis;

  // Calculate total rental income
  const totalRentalIncome = inputs.rentPerUnit.reduce((sum, rent) => sum + rent, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>House Hack Analysis</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {address ? decodeURIComponent(address) : 'Live & Invest'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Strategy Header */}
        <StrategyHeader
          strategyType="houseHack"
          score={score}
          grade={grade}
          gradeColor={color}
          primaryMetric={{
            label: 'Housing Cost',
            value: metrics.effectiveHousingCost <= 0 
              ? 'FREE!' 
              : formatCurrency(metrics.effectiveHousingCost),
            subValue: metrics.effectiveHousingCost <= 0 
              ? 'Tenants cover everything' 
              : `Saving ${formatCurrency(metrics.housingCostSavings)}/mo`,
          }}
        />

        {/* Housing Comparison Banner */}
        <View style={[
          styles.comparisonBanner, 
          { 
            backgroundColor: metrics.effectiveHousingCost <= 0 
              ? 'rgba(34,197,94,0.15)' 
              : 'rgba(139,92,246,0.15)',
            borderColor: metrics.effectiveHousingCost <= 0 
              ? colors.success 
              : '#8b5cf6',
          }
        ]}>
          <Text style={styles.comparisonEmoji}>
            {metrics.effectiveHousingCost <= 0 ? '🎉' : '🏡'}
          </Text>
          <View style={styles.comparisonContent}>
            <Text style={[styles.comparisonTitle, { color: theme.text }]}>
              {metrics.effectiveHousingCost <= 0 
                ? 'Living for FREE!' 
                : `${formatPercent(metrics.housingCostReductionPercent)} Housing Reduction`}
            </Text>
            <Text style={[styles.comparisonText, { color: theme.textSecondary }]}>
              {metrics.effectiveHousingCost <= 0 
                ? 'Your tenants cover 100% of your housing costs'
                : `vs ${formatCurrency(inputs.currentHousingPayment)}/mo current rent`}
            </Text>
          </View>
        </View>

        {/* Housing Cost Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🏠 Housing Cost Breakdown</Text>
          
          <View style={styles.costBreakdown}>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.textSecondary }]}>
                Your Mortgage Payment
              </Text>
              <Text style={[styles.costValue, { color: theme.text }]}>
                {formatCurrency(metrics.mortgagePayment)}
              </Text>
            </View>
            
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.textSecondary }]}>
                Rental Income from {inputs.rentedUnits} unit(s)
              </Text>
              <Text style={[styles.costValue, { color: colors.success }]}>
                -{formatCurrency(totalRentalIncome)}
              </Text>
            </View>

            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.textSecondary }]}>
                Operating Expenses
              </Text>
              <Text style={[styles.costValue, { color: colors.error }]}>
                +{formatCurrency(metrics.totalMonthlyExpenses - metrics.mortgagePayment)}
              </Text>
            </View>

            <View style={[styles.totalCostRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>
                Your Effective Housing Cost
              </Text>
              <Text style={[
                styles.totalValue, 
                { color: metrics.effectiveHousingCost <= 0 ? colors.success : theme.text }
              ]}>
                {metrics.effectiveHousingCost <= 0 
                  ? '$0' 
                  : formatCurrency(metrics.effectiveHousingCost)}
              </Text>
            </View>
          </View>
        </View>

        {/* Units Visualization */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🏢 Unit Breakdown</Text>
          
          <View style={styles.unitsGrid}>
            {/* Owner Unit */}
            <View style={[styles.unitCard, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: '#8b5cf6' }]}>
              <Text style={styles.unitIcon}>🏠</Text>
              <Text style={[styles.unitLabel, { color: '#8b5cf6' }]}>Your Unit</Text>
              <Text style={[styles.unitValue, { color: theme.text }]}>
                {metrics.effectiveHousingCost <= 0 ? 'FREE' : formatCurrency(metrics.effectiveHousingCost)}
              </Text>
            </View>

            {/* Rental Units */}
            {inputs.rentPerUnit.map((rent, index) => (
              <View 
                key={index} 
                style={[styles.unitCard, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: colors.success }]}
              >
                <Text style={styles.unitIcon}>💰</Text>
                <Text style={[styles.unitLabel, { color: colors.success }]}>Unit {index + 2}</Text>
                <Text style={[styles.unitValue, { color: theme.text }]}>
                  {formatCurrency(rent)}/mo
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Monthly Savings"
            value={formatCurrency(metrics.housingCostSavings)}
            icon="💵"
            trend={metrics.housingCostSavings > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Cash Flow"
            value={formatCurrency(metrics.monthlyCashFlow)}
            icon="📈"
            subLabel="After all expenses"
          />
          <MetricCard
            label="Down Payment"
            value={formatPercent(inputs.downPaymentPercent * 100)}
            icon="🏦"
            subLabel={formatCurrency(inputs.purchasePrice * inputs.downPaymentPercent)}
          />
          <MetricCard
            label="CF Per Unit"
            value={formatCurrency(metrics.cashFlowPerRentedUnit)}
            icon="🚪"
            benchmark={{ target: 200, current: metrics.cashFlowPerRentedUnit }}
          />
        </View>

        {/* Investment Summary */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>💰 Investment Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Purchase Price
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatCurrency(inputs.purchasePrice)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Total Cash Required
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {formatCurrency(metrics.totalCashRequired)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Cash-on-Cash
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatPercent(metrics.cashOnCash)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Annual Cash Flow
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatCurrency(metrics.annualCashFlow)}
              </Text>
            </View>
          </View>
        </View>

        {/* Rent vs Buy Comparison */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>⚖️ Rent vs House Hack</Text>
          
          <View style={styles.comparisonGrid}>
            <View style={[styles.comparisonCard, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Text style={styles.comparisonCardIcon}>🏢</Text>
              <Text style={[styles.comparisonCardLabel, { color: theme.textSecondary }]}>
                Continue Renting
              </Text>
              <Text style={[styles.comparisonCardValue, { color: colors.error }]}>
                -{formatCurrency(inputs.currentHousingPayment)}/mo
              </Text>
              <Text style={[styles.comparisonCardSub, { color: theme.textSecondary }]}>
                No equity building
              </Text>
            </View>

            <View style={[styles.comparisonCard, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
              <Text style={styles.comparisonCardIcon}>🏡</Text>
              <Text style={[styles.comparisonCardLabel, { color: theme.textSecondary }]}>
                House Hack
              </Text>
              <Text style={[styles.comparisonCardValue, { color: colors.success }]}>
                {metrics.effectiveHousingCost <= 0 
                  ? 'FREE' 
                  : `-${formatCurrency(metrics.effectiveHousingCost)}/mo`}
              </Text>
              <Text style={[styles.comparisonCardSub, { color: theme.textSecondary }]}>
                +{formatCurrency(metrics.yearOneEquityGrowth / 12)}/mo equity
              </Text>
            </View>
          </View>

          <View style={[styles.benefitBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <Text style={[styles.benefitText, { color: colors.success }]}>
              ✅ {formatCurrency(metrics.rentVsBuyBenefit)}/mo better than renting
            </Text>
          </View>
        </View>

        {/* Exit Strategy */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🚀 Future Strategy</Text>
          
          <View style={styles.exitOptions}>
            <View style={styles.exitOption}>
              <Text style={styles.exitIcon}>📅</Text>
              <View style={styles.exitContent}>
                <Text style={[styles.exitTitle, { color: theme.text }]}>After 1 Year</Text>
                <Text style={[styles.exitDesc, { color: theme.textSecondary }]}>
                  Move out, rent your unit for {formatCurrency(inputs.rentPerUnit[0] || 1500)}/mo
                </Text>
                <Text style={[styles.exitResult, { color: colors.success }]}>
                  Full rental with {formatCurrency(metrics.monthlyCashFlow + (inputs.rentPerUnit[0] || 1500))}/mo cash flow
                </Text>
              </View>
            </View>

            <View style={styles.exitOption}>
              <Text style={styles.exitIcon}>♻️</Text>
              <View style={styles.exitContent}>
                <Text style={[styles.exitTitle, { color: theme.text }]}>Repeat</Text>
                <Text style={[styles.exitDesc, { color: theme.textSecondary }]}>
                  Buy another property with low down payment
                </Text>
                <Text style={[styles.exitResult, { color: colors.primary }]}>
                  Scale your portfolio faster
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Insights */}
        <InsightsSection insights={insights} title="🎯 House Hack Insights" />

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
  comparisonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  comparisonEmoji: {
    fontSize: 32,
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  comparisonText: {
    fontSize: 12,
    marginTop: 2,
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
  costBreakdown: {
    gap: 10,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 13,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  unitCard: {
    flex: 1,
    minWidth: 80,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  unitLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  unitValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  comparisonCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  comparisonCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  comparisonCardLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  comparisonCardValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  comparisonCardSub: {
    fontSize: 10,
    marginTop: 4,
  },
  benefitBadge: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exitOptions: {
    gap: 12,
  },
  exitOption: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
  },
  exitIcon: {
    fontSize: 24,
  },
  exitContent: {
    flex: 1,
  },
  exitTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  exitDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  exitResult: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

