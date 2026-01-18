/**
 * Wholesale Strategy Screen
 * Contract assignment analysis
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
  analyzeWholesale,
  DEFAULT_WHOLESALE_INPUTS,
  WholesaleInputs,
} from '@/components/analytics/strategies';
import {
  StrategyHeader,
  MetricCard,
  InsightsSection,
} from '@/components/analytics/strategies/components';

export default function WholesaleStrategyScreen() {
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

  const [inputs, setInputs] = useState<WholesaleInputs>(DEFAULT_WHOLESALE_INPUTS);

  const analysis = useMemo(() => analyzeWholesale(inputs), [inputs]);
  const { metrics, score, grade, color, insights } = analysis;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Wholesale Analysis</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {address ? decodeURIComponent(address) : 'Contract Assignment'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Strategy Header */}
        <StrategyHeader
          strategyType="wholesale"
          score={score}
          grade={grade}
          gradeColor={color}
          primaryMetric={{
            label: 'Assignment Fee',
            value: formatCurrency(inputs.assignmentFee),
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
              ? statusColors.success 
              : statusColors.error,
          }
        ]}>
          <View style={styles.ruleHeader}>
            <Text style={styles.ruleIcon}>
              {metrics.meetsSeventyPercentRule ? '✅' : '⚠️'}
            </Text>
            <Text style={[
              styles.ruleTitle, 
              { color: metrics.meetsSeventyPercentRule ? statusColors.success : statusColors.error }
            ]}>
              End Buyer 70% Rule {metrics.meetsSeventyPercentRule ? 'Met' : 'Not Met'}
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
              <Text style={[styles.ruleLabel, { color: theme.textSecondary }]}>Buyer All-In</Text>
              <Text style={[
                styles.ruleValue, 
                { color: metrics.meetsSeventyPercentRule ? statusColors.success : statusColors.error }
              ]}>
                {formatCurrency(metrics.endBuyerAllInPrice)}
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
            highlighted
          />
          <MetricCard
            label="ROI"
            value={formatPercent(metrics.roi)}
            icon="%"
            subLabel="On earnest + costs"
          />
          <MetricCard
            label="Cash at Risk"
            value={formatCurrency(metrics.totalCashRequired)}
            icon="⚠️"
          />
          <MetricCard
            label="Buyer Profit"
            value={formatCurrency(metrics.endBuyerMaxProfit)}
            icon="👤"
            trend={metrics.endBuyerMaxProfit >= 30000 ? 'up' : 'neutral'}
          />
        </View>

        {/* Deal Flow Visualization */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📝 Deal Flow</Text>
          
          <View style={styles.dealFlow}>
            {/* Step 1: Contract */}
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Text style={styles.flowEmoji}>📋</Text>
              </View>
              <View style={styles.flowStepContent}>
                <Text style={[styles.flowStepTitle, { color: theme.text }]}>
                  1. Get Under Contract
                </Text>
                <Text style={[styles.flowStepValue, { color: statusColors.primary }]}>
                  {formatCurrency(inputs.contractPrice)}
                </Text>
                <Text style={[styles.flowStepSub, { color: theme.textSecondary }]}>
                  {formatCurrency(inputs.earnestMoney)} earnest money
                </Text>
              </View>
            </View>

            <View style={[styles.flowConnector, { backgroundColor: theme.border }]} />

            {/* Step 2: Find Buyer */}
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                <Text style={styles.flowEmoji}>🔍</Text>
              </View>
              <View style={styles.flowStepContent}>
                <Text style={[styles.flowStepTitle, { color: theme.text }]}>
                  2. Find Cash Buyer
                </Text>
                <Text style={[styles.flowStepValue, { color: '#8b5cf6' }]}>
                  {inputs.inspectionPeriodDays} days
                </Text>
                <Text style={[styles.flowStepSub, { color: theme.textSecondary }]}>
                  Inspection period
                </Text>
              </View>
            </View>

            <View style={[styles.flowConnector, { backgroundColor: theme.border }]} />

            {/* Step 3: Assign */}
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Text style={styles.flowEmoji}>🤝</Text>
              </View>
              <View style={styles.flowStepContent}>
                <Text style={[styles.flowStepTitle, { color: theme.text }]}>
                  3. Assign Contract
                </Text>
                <Text style={[styles.flowStepValue, { color: statusColors.success }]}>
                  +{formatCurrency(inputs.assignmentFee)}
                </Text>
                <Text style={[styles.flowStepSub, { color: theme.textSecondary }]}>
                  Assignment fee
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Numbers Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📊 Numbers Breakdown</Text>
          
          <View style={styles.numbersFlow}>
            <View style={styles.numbersRow}>
              <Text style={[styles.numbersLabel, { color: theme.textSecondary }]}>
                ARV (After Repair Value)
              </Text>
              <Text style={[styles.numbersValue, { color: theme.text }]}>
                {formatCurrency(inputs.arv)}
              </Text>
            </View>

            <View style={styles.numbersRow}>
              <Text style={[styles.numbersLabel, { color: theme.textSecondary }]}>
                × 70% (Max Offer Rule)
              </Text>
              <Text style={[styles.numbersValue, { color: theme.text }]}>
                {formatCurrency(inputs.arv * 0.70)}
              </Text>
            </View>

            <View style={styles.numbersRow}>
              <Text style={[styles.numbersLabel, { color: theme.textSecondary }]}>
                − Estimated Repairs
              </Text>
              <Text style={[styles.numbersValue, { color: statusColors.error }]}>
                -{formatCurrency(inputs.estimatedRepairs)}
              </Text>
            </View>

            <View style={[styles.numbersTotal, { borderTopColor: theme.border }]}>
              <Text style={[styles.numbersLabel, { color: theme.text, fontWeight: '600' }]}>
                = Max Allowable Offer
              </Text>
              <Text style={[styles.numbersTotalValue, { color: statusColors.primary }]}>
                {formatCurrency(metrics.maxAllowableOffer)}
              </Text>
            </View>

            <View style={styles.contractComparison}>
              <View style={[
                styles.comparisonBadge,
                { 
                  backgroundColor: metrics.meetsSeventyPercentRule 
                    ? 'rgba(34,197,94,0.1)' 
                    : 'rgba(249,115,22,0.1)',
                }
              ]}>
                <Text style={[
                  styles.comparisonText,
                  { color: metrics.meetsSeventyPercentRule ? statusColors.success : statusColors.warning }
                ]}>
                  Your contract: {formatCurrency(inputs.contractPrice)}
                  {' '}({metrics.meetsSeventyPercentRule 
                    ? `${formatCurrency(metrics.maxAllowableOffer - inputs.contractPrice)} under MAO` 
                    : `${formatCurrency(inputs.contractPrice - metrics.maxAllowableOffer)} over MAO`})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* End Buyer Analysis */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>👤 End Buyer Analysis</Text>
          
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            What your buyer sees when they purchase from you
          </Text>

          <View style={styles.buyerGrid}>
            <View style={styles.buyerItem}>
              <Text style={[styles.buyerLabel, { color: theme.textSecondary }]}>
                All-In Purchase
              </Text>
              <Text style={[styles.buyerValue, { color: theme.text }]}>
                {formatCurrency(metrics.endBuyerAllInPrice)}
              </Text>
            </View>
            <View style={styles.buyerItem}>
              <Text style={[styles.buyerLabel, { color: theme.textSecondary }]}>
                + Repairs
              </Text>
              <Text style={[styles.buyerValue, { color: theme.text }]}>
                {formatCurrency(inputs.estimatedRepairs)}
              </Text>
            </View>
            <View style={styles.buyerItem}>
              <Text style={[styles.buyerLabel, { color: theme.textSecondary }]}>
                ARV
              </Text>
              <Text style={[styles.buyerValue, { color: theme.text }]}>
                {formatCurrency(inputs.arv)}
              </Text>
            </View>
            <View style={[styles.buyerItem, { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10 }]}>
              <Text style={[styles.buyerLabel, { color: statusColors.success }]}>
                Buyer Profit
              </Text>
              <Text style={[styles.buyerValue, { color: statusColors.success }]}>
                {formatCurrency(metrics.endBuyerMaxProfit)}
              </Text>
            </View>
          </View>

          <View style={[
            styles.attractivenessBadge,
            { 
              backgroundColor: metrics.endBuyerMaxProfit >= 30000 
                ? 'rgba(34,197,94,0.1)' 
                : 'rgba(249,115,22,0.1)',
            }
          ]}>
            <Text style={[
              styles.attractivenessText,
              { color: metrics.endBuyerMaxProfit >= 30000 ? statusColors.success : statusColors.warning }
            ]}>
              {metrics.endBuyerMaxProfit >= 40000 
                ? '🔥 Very attractive to cash buyers!'
                : metrics.endBuyerMaxProfit >= 25000 
                  ? '👍 Decent spread for buyers'
                  : '⚠️ Thin margins may limit buyer interest'}
            </Text>
          </View>
        </View>

        {/* Your Numbers */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>💵 Your Numbers</Text>
          
          <View style={styles.yourNumbers}>
            <View style={styles.yourNumberRow}>
              <Text style={[styles.yourNumberLabel, { color: theme.textSecondary }]}>
                Earnest Money
              </Text>
              <Text style={[styles.yourNumberValue, { color: statusColors.error }]}>
                -{formatCurrency(inputs.earnestMoney)}
              </Text>
            </View>
            <View style={styles.yourNumberRow}>
              <Text style={[styles.yourNumberLabel, { color: theme.textSecondary }]}>
                Marketing Costs
              </Text>
              <Text style={[styles.yourNumberValue, { color: statusColors.error }]}>
                -{formatCurrency(inputs.marketingCosts)}
              </Text>
            </View>
            <View style={styles.yourNumberRow}>
              <Text style={[styles.yourNumberLabel, { color: theme.textSecondary }]}>
                Closing Costs
              </Text>
              <Text style={[styles.yourNumberValue, { color: statusColors.error }]}>
                -{formatCurrency(inputs.closingCosts)}
              </Text>
            </View>
            <View style={styles.yourNumberRow}>
              <Text style={[styles.yourNumberLabel, { color: theme.textSecondary }]}>
                Assignment Fee
              </Text>
              <Text style={[styles.yourNumberValue, { color: statusColors.success }]}>
                +{formatCurrency(inputs.assignmentFee)}
              </Text>
            </View>

            <View style={[styles.profitRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.profitLabel, { color: theme.text }]}>
                Net Profit
              </Text>
              <Text style={[styles.profitValue, { color: statusColors.success }]}>
                {formatCurrency(metrics.netProfit)}
              </Text>
            </View>
          </View>

          <View style={[styles.roiBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <Text style={[styles.roiText, { color: statusColors.success }]}>
              🚀 {formatPercent(metrics.roi)} ROI on {formatCurrency(metrics.totalCashRequired)} at risk
            </Text>
          </View>
        </View>

        {/* Insights */}
        <InsightsSection insights={insights} title="🎯 Wholesale Insights" />

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
    fontSize: 14,
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
  dealFlow: {
    gap: 0,
  },
  flowStep: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  flowStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowEmoji: {
    fontSize: 20,
  },
  flowStepContent: {
    flex: 1,
    paddingVertical: 4,
  },
  flowStepTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  flowStepValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  flowStepSub: {
    fontSize: 11,
    marginTop: 2,
  },
  flowConnector: {
    width: 2,
    height: 20,
    marginLeft: 21,
  },
  numbersFlow: {
    gap: 10,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numbersLabel: {
    fontSize: 13,
  },
  numbersValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  numbersTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  numbersTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  contractComparison: {
    marginTop: 12,
  },
  comparisonBadge: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 12,
    marginTop: -8,
  },
  buyerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  buyerItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  buyerLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  buyerValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  attractivenessBadge: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  attractivenessText: {
    fontSize: 13,
    fontWeight: '600',
  },
  yourNumbers: {
    gap: 10,
  },
  yourNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yourNumberLabel: {
    fontSize: 13,
  },
  yourNumberValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  profitLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  profitValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  roiBadge: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  roiText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

