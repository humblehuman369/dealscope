/**
 * BRRRR Strategy Screen
 * Buy, Rehab, Rent, Refinance, Repeat
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

// Convenience color aliases
const statusColors = {
  success: colors.profit.main,
  error: colors.loss.main,
  warning: colors.warning.main,
  primary: colors.primary[500],
};
import {
  analyzeBRRRR,
  DEFAULT_BRRRR_INPUTS,
  BRRRRInputs,
} from '@/components/analytics/strategies';
import {
  StrategyHeader,
  MetricCard,
  CostBreakdownChart,
  TimelineCard,
  InsightsSection,
} from '@/components/analytics/strategies/components';

export default function BRRRRStrategyScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  
  // Build theme object from colors
  const theme = {
    background: isDark ? colors.background.dark : colors.background.primary,
    surface: isDark ? colors.background.darkAlt : colors.background.secondary,
    text: isDark ? colors.text.inverse : colors.text.primary,
    textSecondary: isDark ? colors.text.inverseMuted : colors.text.secondary,
    border: isDark ? colors.navy[700] : colors.border.light,
  };

  const [inputs, setInputs] = useState<BRRRRInputs>(DEFAULT_BRRRR_INPUTS);

  const analysis = useMemo(() => analyzeBRRRR(inputs), [inputs]);
  const { metrics, score, grade, color, insights } = analysis;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>BRRRR Analysis</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {address ? decodeURIComponent(address) : 'Buy, Rehab, Rent, Refinance, Repeat'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Strategy Header */}
        <StrategyHeader
          strategyType="brrrr"
          score={score}
          grade={grade}
          gradeColor={color}
          primaryMetric={{
            label: 'Cash Recouped',
            value: formatPercent(metrics.cashRecoupPercent),
            subValue: metrics.infiniteReturn ? '♾️ Infinite Return!' : undefined,
          }}
        />

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Cash Left In"
            value={formatCurrency(metrics.cashLeftInDeal)}
            icon="💵"
            highlighted={metrics.cashLeftInDeal <= 0}
          />
          <MetricCard
            label="Equity Created"
            value={formatCurrency(metrics.equityCreated)}
            icon="📈"
            subLabel={`${formatPercent(metrics.equityPercent)} of ARV`}
          />
          <MetricCard
            label="Cash Flow"
            value={formatCurrency(metrics.monthlyCashFlow)}
            icon="💰"
            subLabel="Post-Refinance"
            trend={metrics.monthlyCashFlow > 200 ? 'up' : metrics.monthlyCashFlow < 0 ? 'down' : 'neutral'}
          />
          <MetricCard
            label="Cash-on-Cash"
            value={metrics.infiniteReturn ? '♾️' : formatPercent(metrics.cashOnCash)}
            icon="%"
            highlighted={metrics.infiniteReturn}
          />
        </View>

        {/* BRRRR Flow Visualization */}
        <View style={[styles.brrrrFlow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>♻️ BRRRR Breakdown</Text>
          
          <View style={styles.flowRow}>
            {/* Buy */}
            <View style={styles.flowStep}>
              <View style={[styles.flowIcon, { backgroundColor: '#3b82f615' }]}>
                <Text style={styles.flowEmoji}>🏠</Text>
              </View>
              <Text style={[styles.flowLabel, { color: theme.textSecondary }]}>Buy</Text>
              <Text style={[styles.flowValue, { color: theme.text }]}>
                {formatCurrency(inputs.purchasePrice)}
              </Text>
            </View>

            <Text style={styles.flowArrow}>→</Text>

            {/* Rehab */}
            <View style={styles.flowStep}>
              <View style={[styles.flowIcon, { backgroundColor: '#f59e0b15' }]}>
                <Text style={styles.flowEmoji}>🔨</Text>
              </View>
              <Text style={[styles.flowLabel, { color: theme.textSecondary }]}>Rehab</Text>
              <Text style={[styles.flowValue, { color: theme.text }]}>
                {formatCurrency(inputs.rehabBudget)}
              </Text>
            </View>

            <Text style={styles.flowArrow}>→</Text>

            {/* ARV */}
            <View style={styles.flowStep}>
              <View style={[styles.flowIcon, { backgroundColor: '#22c55e15' }]}>
                <Text style={styles.flowEmoji}>💎</Text>
              </View>
              <Text style={[styles.flowLabel, { color: theme.textSecondary }]}>ARV</Text>
              <Text style={[styles.flowValue, { color: statusColors.success }]}>
                {formatCurrency(inputs.arv)}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <TimelineCard
          title="📅 Project Timeline"
          phases={[
            {
              label: 'Acquisition',
              duration: '2-4 weeks',
              icon: '🏠',
              color: '#3b82f6',
              description: 'Close on property at discounted price',
            },
            {
              label: 'Renovation',
              duration: `${inputs.rehabTimeMonths} months`,
              icon: '🔨',
              color: '#f59e0b',
              description: 'Complete rehab to increase value',
            },
            {
              label: 'Rent',
              duration: '2-4 weeks',
              icon: '👥',
              color: '#8b5cf6',
              description: 'Find quality tenant at market rent',
            },
            {
              label: 'Refinance',
              duration: '4-6 weeks',
              icon: '🏦',
              color: '#22c55e',
              description: 'Cash-out refinance at new ARV',
            },
          ]}
          totalDuration={`~${metrics.totalTimeMonths + 2} months`}
        />

        {/* Initial Investment */}
        <CostBreakdownChart
          title="💵 Initial Investment"
          items={[
            { label: 'Purchase + Closing', value: metrics.purchaseCosts, color: '#3b82f6' },
            { label: 'Rehab Budget', value: metrics.rehabCosts, color: '#f59e0b' },
            { label: 'Holding Costs', value: metrics.holdingCosts, color: '#ef4444' },
          ]}
        />

        {/* Refinance Results */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🏦 Refinance Results</Text>
          
          <View style={styles.refinanceRow}>
            <View style={styles.refinanceItem}>
              <Text style={[styles.refinanceLabel, { color: theme.textSecondary }]}>
                New Loan ({formatPercent(inputs.refinanceLTV * 100)} LTV)
              </Text>
              <Text style={[styles.refinanceValue, { color: theme.text }]}>
                {formatCurrency(metrics.refinanceLoanAmount)}
              </Text>
            </View>
            <View style={styles.refinanceItem}>
              <Text style={[styles.refinanceLabel, { color: theme.textSecondary }]}>
                Cash Out
              </Text>
              <Text style={[styles.refinanceValue, { color: statusColors.success }]}>
                {formatCurrency(metrics.cashOutAmount)}
              </Text>
            </View>
          </View>

          {/* Visual comparison */}
          <View style={styles.comparisonBar}>
            <View style={styles.comparisonLabels}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
                Invested
              </Text>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
                Recovered
              </Text>
            </View>
            <View style={[styles.barContainer, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.investedBar,
                  { width: '100%', backgroundColor: '#ef4444' }
                ]} 
              />
              <View 
                style={[
                  styles.recoveredBar,
                  { 
                    width: `${Math.min(100, metrics.cashRecoupPercent)}%`, 
                    backgroundColor: statusColors.success 
                  }
                ]} 
              />
            </View>
            <View style={styles.comparisonValues}>
              <Text style={[styles.comparisonValue, { color: '#ef4444' }]}>
                {formatCurrency(metrics.totalInitialInvestment)}
              </Text>
              <Text style={[styles.comparisonValue, { color: statusColors.success }]}>
                {formatCurrency(metrics.cashOutAmount)}
              </Text>
            </View>
          </View>

          {/* Result */}
          <View style={[
            styles.resultBadge, 
            { 
              backgroundColor: metrics.infiniteReturn ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
              borderColor: metrics.infiniteReturn ? statusColors.success : statusColors.warning,
            }
          ]}>
            <Text style={[
              styles.resultText, 
              { color: metrics.infiniteReturn ? statusColors.success : statusColors.warning }
            ]}>
              {metrics.infiniteReturn 
                ? '🎯 All cash recovered — Infinite ROI achieved!'
                : `${formatCurrency(metrics.cashLeftInDeal)} left in deal`}
            </Text>
          </View>
        </View>

        {/* Post-Refinance Rental */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🏠 Post-Refinance Rental</Text>
          
          <View style={styles.rentalGrid}>
            <View style={styles.rentalItem}>
              <Text style={[styles.rentalLabel, { color: theme.textSecondary }]}>Monthly Rent</Text>
              <Text style={[styles.rentalValue, { color: theme.text }]}>
                {formatCurrency(inputs.monthlyRent)}
              </Text>
            </View>
            <View style={styles.rentalItem}>
              <Text style={[styles.rentalLabel, { color: theme.textSecondary }]}>Mortgage</Text>
              <Text style={[styles.rentalValue, { color: theme.text }]}>
                -{formatCurrency(metrics.newMortgagePayment)}
              </Text>
            </View>
            <View style={styles.rentalItem}>
              <Text style={[styles.rentalLabel, { color: theme.textSecondary }]}>Cash Flow</Text>
              <Text style={[
                styles.rentalValue, 
                { color: metrics.monthlyCashFlow >= 0 ? statusColors.success : statusColors.error }
              ]}>
                {formatCurrency(metrics.monthlyCashFlow)}/mo
              </Text>
            </View>
            <View style={styles.rentalItem}>
              <Text style={[styles.rentalLabel, { color: theme.textSecondary }]}>Annual</Text>
              <Text style={[
                styles.rentalValue, 
                { color: metrics.annualCashFlow >= 0 ? statusColors.success : statusColors.error }
              ]}>
                {formatCurrency(metrics.annualCashFlow)}/yr
              </Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <InsightsSection insights={insights} title="🎯 BRRRR Insights" />

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
  brrrrFlow: {
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
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  flowStep: {
    alignItems: 'center',
  },
  flowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  flowEmoji: {
    fontSize: 22,
  },
  flowLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  flowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  flowArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  refinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  refinanceItem: {
    alignItems: 'center',
  },
  refinanceLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  refinanceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  comparisonBar: {
    marginVertical: 12,
  },
  comparisonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 10,
  },
  barContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  investedBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: 6,
  },
  recoveredBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: 6,
  },
  comparisonValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  comparisonValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultBadge: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rentalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rentalItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
  },
  rentalLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  rentalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});

