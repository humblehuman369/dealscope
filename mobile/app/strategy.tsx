import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { StrategySelector } from '@/components/strategy/StrategySelector';
import { FinancialBreakdown } from '@/components/strategy/FinancialBreakdown';
import { useWorksheet } from '@/hooks/useWorksheet';
import { useVerdict } from '@/hooks/useVerdict';
import { usePropertyData } from '@/hooks/usePropertyData';
import { errorToUserMessage } from '@/utils/errorMessages';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { getScoreColor } from '@/constants/theme';

function fmtC(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  const abs = Math.round(Math.abs(v));
  return (v < 0 ? '-$' : '$') + abs.toLocaleString();
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(2) + '%';
}

function fmtRatio(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(2) + 'x';
}

export default function StrategyScreen() {
  const { address, strategyId: initialStrategy } = useLocalSearchParams<{
    address: string;
    strategyId?: string;
  }>();
  const router = useRouter();
  const [strategyId, setStrategyId] = useState(initialStrategy ?? 'ltr');

  const { data: verdict } = useVerdict(address);
  const { data: worksheet, isLoading, error } = useWorksheet(address, strategyId);
  const { getCached } = usePropertyData();
  const property = address ? getCached(address) : undefined;

  const BACKEND_TO_MOBILE_ID: Record<string, string> = {
    'long-term-rental': 'ltr',
    'short-term-rental': 'str',
    'brrrr': 'brrrr',
    'fix-and-flip': 'flip',
    'house-hack': 'house_hack',
    'wholesale': 'wholesale',
  };

  const scores = verdict?.strategies
    ? Object.fromEntries(
        (Array.isArray(verdict.strategies) ? verdict.strategies : []).map(
          (s: any) => [BACKEND_TO_MOBILE_ID[s.id] ?? s.id, s.score],
        ),
      )
    : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>StrategyIQ</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Strategy Selector */}
      <StrategySelector
        selectedId={strategyId}
        onSelect={setStrategyId}
        scores={scores}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Property address */}
        {property && (
          <Card glow="none" style={styles.addressCard}>
            <Text style={styles.addressText} numberOfLines={2}>
              {property.address?.full_address ?? address}
            </Text>
          </Card>
        )}

        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Calculating strategy...</Text>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.loading}>
            <Text style={styles.errorText}>
              {errorToUserMessage(error, 'Unable to calculate strategy. Please try again.')}
            </Text>
          </View>
        )}

        {worksheet && !isLoading && (
          <>
            {/* Score + Verdict */}
            <Card glow="lg" style={styles.scoreRow}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreLabel}>DEAL SCORE</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(worksheet.deal_score) }]}>
                  {Math.round(worksheet.deal_score)}
                </Text>
                <Text style={[styles.verdictText, { color: getScoreColor(worksheet.deal_score) }]}>
                  {worksheet.verdict}
                </Text>
              </View>
              <View style={styles.scoreRight}>
                <View style={styles.miniMetric}>
                  <Text style={styles.miniLabel}>Cash Flow</Text>
                  <Text style={[styles.miniValue, { color: (worksheet.monthly_cash_flow ?? 0) >= 0 ? colors.success : colors.error }]}>
                    {fmtC(worksheet.monthly_cash_flow)}/mo
                  </Text>
                </View>
                <View style={styles.miniMetric}>
                  <Text style={styles.miniLabel}>CoC</Text>
                  <Text style={styles.miniValue}>{fmtPct(worksheet.cash_on_cash)}</Text>
                </View>
                <View style={styles.miniMetric}>
                  <Text style={styles.miniLabel}>Cap Rate</Text>
                  <Text style={styles.miniValue}>{fmtPct(worksheet.cap_rate)}</Text>
                </View>
              </View>
            </Card>

            {/* Key Metrics Grid */}
            <Card glow="sm" style={styles.metricsCard}>
              <Text style={styles.metricsTitle}>KEY METRICS</Text>
              <View style={styles.metricsGrid}>
                <MetricItem label="DSCR" value={fmtRatio(worksheet.dscr)} />
                <MetricItem label="Cash Needed" value={fmtC(worksheet.cash_needed)} />
                <MetricItem label="NOI" value={fmtC(worksheet.noi)} />
                <MetricItem label="Expense Ratio" value={fmtPct(worksheet.expense_ratio)} />
                <MetricItem label="Breakeven Occ." value={fmtPct(worksheet.breakeven_occupancy)} />
                {worksheet.total_roi_5yr != null && (
                  <MetricItem label="5yr ROI" value={fmtPct(worksheet.total_roi_5yr)} />
                )}
              </View>
            </Card>

            {/* Financial Breakdown */}
            <FinancialBreakdown worksheet={worksheet} strategyId={strategyId} />

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title="Adjust Assumptions"
                variant="secondary"
                onPress={() => router.push({ pathname: '/deal-maker', params: { address } })}
              />
              <Button
                title="Back to Verdict"
                variant="ghost"
                onPress={() => router.push({ pathname: '/verdict', params: { address } })}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricStyles.box}>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={metricStyles.value}>{value}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  box: {
    width: '48%',
    gap: 4,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.tag,
    color: colors.textLabel,
  },
  value: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHeading,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backArrow: { fontSize: 22, color: colors.textBody },
  headerTitle: { ...typography.h3, color: colors.textHeading },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] + 40,
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  addressCard: {
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
  },
  addressText: { ...typography.h4, color: colors.textHeading },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  loadingText: { ...typography.bodySmall, color: colors.textSecondary },
  errorText: { ...typography.bodySmall, color: colors.error, textAlign: 'center' },
  scoreRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  scoreLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  scoreLabel: { ...typography.label, color: colors.textLabel },
  scoreValue: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 42,
    marginVertical: 4,
  },
  verdictText: {
    fontFamily: fontFamilies.heading,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRight: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  miniMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniLabel: { ...typography.caption, color: colors.textSecondary },
  miniValue: {
    fontFamily: fontFamilies.mono,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHeading,
  },
  metricsCard: { padding: spacing.md },
  metricsTitle: { ...typography.label, color: colors.textLabel, marginBottom: spacing.md },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
