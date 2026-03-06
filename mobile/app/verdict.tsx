import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { ScoreGauge } from '@/components/verdict/ScoreGauge';
import { PriceCards } from '@/components/verdict/PriceCards';
import { InvestmentMetrics } from '@/components/verdict/InvestmentMetrics';
import { StrategyGrid } from '@/components/verdict/StrategyGrid';
import { useVerdict } from '@/hooks/useVerdict';
import { usePropertyData } from '@/hooks/usePropertyData';
import { colors, cardGlow } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { getScoreColor } from '@/constants/theme';

function fmt(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return '$' + Math.round(value).toLocaleString();
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return value.toFixed(1) + '%';
}

export default function VerdictScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const { getCached } = usePropertyData();
  const { data: analysis, isLoading, error } = useVerdict(address);

  const property = address ? getCached(address) : undefined;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading verdict...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !analysis) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.errorTitle}>Analysis Unavailable</Text>
          <Text style={styles.errorSubtitle}>
            {(error as any)?.message ?? 'Unable to analyze this property'}
          </Text>
          <Button
            title="Try Again"
            onPress={() => router.back()}
            style={styles.retryBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  const score = analysis.deal_score;
  const scoreColor = getScoreColor(score);

  const ltrStrategy = analysis.strategies?.ltr;
  const primaryCashOnCash = ltrStrategy?.cash_on_cash ?? null;
  const primaryCapRate = ltrStrategy?.cap_rate ?? null;
  const primaryDscr = ltrStrategy?.dscr ?? null;
  const primaryCashFlow = ltrStrategy?.monthly_cash_flow ?? null;
  const primaryNoi = ltrStrategy?.annual_noi ?? null;
  const primaryCashNeeded = ltrStrategy?.cash_needed ?? null;

  const ctaText = score >= 65
    ? 'This deal passed the screen — see the numbers'
    : score >= 40
      ? 'This deal needs a closer look'
      : 'The numbers don\'t work at asking price';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>IQ Verdict</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Property address */}
        {property && (
          <Card glow="none" style={styles.addressCard}>
            <Text style={styles.addressText} numberOfLines={2}>
              {property.address?.full_address ?? address}
            </Text>
            {property.details && (
              <Text style={styles.addressMeta}>
                {[
                  property.details.bedrooms && `${property.details.bedrooms} bd`,
                  property.details.bathrooms && `${property.details.bathrooms} ba`,
                  property.details.square_footage && `${property.details.square_footage.toLocaleString()} sqft`,
                  property.listing?.list_price && fmt(property.listing.list_price),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
          </Card>
        )}

        {/* Score Card */}
        <Card glow="lg" style={styles.scoreCard}>
          <Text style={styles.verdictLabel}>THE VERDICT</Text>
          <ScoreGauge score={score} />

          <View style={styles.scoreDetails}>
            <View style={styles.scoreDetailItem}>
              <Text style={styles.scoreDetailLabel}>Deal Gap</Text>
              <Text style={[styles.scoreDetailValue, {
                color: (analysis.deal_gap_percent ?? 0) > 0 ? colors.success : colors.error,
              }]}>
                {fmtPct(analysis.deal_gap_percent)}
              </Text>
            </View>
            <View style={styles.scoreDetailDivider} />
            <View style={styles.scoreDetailItem}>
              <Text style={styles.scoreDetailLabel}>Target Buy</Text>
              <Text style={[styles.scoreDetailValue, { color: colors.success }]}>
                {fmt(analysis.purchase_price)}
              </Text>
            </View>
          </View>

          <View style={[styles.verdictBadge, { backgroundColor: scoreColor + '20' }]}>
            <Text style={[styles.verdictBadgeText, { color: scoreColor }]}>
              {analysis.deal_verdict}
            </Text>
          </View>
        </Card>

        {/* Narrative */}
        {analysis.deal_narrative && (
          <Card glow="sm" style={styles.narrativeCard}>
            <Text style={styles.narrativeTitle}>
              Worth Your Time? Here's What It Takes.
            </Text>
            <Text style={styles.narrativeText}>{analysis.deal_narrative}</Text>
          </Card>
        )}

        {/* Deal Factors */}
        {analysis.deal_factors && analysis.deal_factors.length > 0 && (
          <Card glow="sm" style={styles.factorsCard}>
            <Text style={styles.factorsTitle}>DEAL SIGNALS</Text>
            {analysis.deal_factors.map((f, i) => (
              <View key={i} style={styles.factorRow}>
                <Text style={styles.factorDot}>
                  {f.sentiment === 'positive' ? '✓' : f.sentiment === 'negative' ? '✗' : '–'}
                </Text>
                <View style={styles.factorContent}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={styles.factorValue}>{f.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Price Cards */}
        <PriceCards
          incomeValue={analysis.income_value}
          targetBuy={analysis.purchase_price}
          wholesalePrice={analysis.wholesale_price ?? null}
          listPrice={analysis.list_price}
          dealGapPercent={analysis.deal_gap_percent}
        />

        {/* Investment Metrics */}
        <InvestmentMetrics
          capRate={primaryCapRate}
          cashOnCash={primaryCashOnCash}
          dscr={primaryDscr}
          monthlyCashFlow={primaryCashFlow}
          annualNoi={primaryNoi}
          cashNeeded={primaryCashNeeded}
        />

        {/* Strategy Grid */}
        {analysis.strategies && (
          <StrategyGrid
            strategies={analysis.strategies}
            onSelect={(strategyId) => {
              router.push({
                pathname: '/strategy',
                params: { address, strategyId },
              });
            }}
          />
        )}

        {/* CTA */}
        <Card glow="active" style={styles.ctaCard}>
          <Text style={styles.ctaText}>{ctaText}</Text>
          <Button
            title="Show Me the Numbers"
            onPress={() => router.push({ pathname: '/strategy', params: { address } })}
            style={styles.ctaBtn}
          />
          <Pressable
            onPress={() => router.push({ pathname: '/deal-maker', params: { address } })}
          >
            <Text style={styles.ctaLink}>Change Terms</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] + 40,
    gap: spacing.lg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.textHeading,
  },
  errorSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryBtn: { marginTop: spacing.md, width: 160 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backArrow: {
    fontSize: 22,
    color: colors.textBody,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textHeading,
  },
  addressCard: {
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
  },
  addressText: {
    ...typography.h4,
    color: colors.textHeading,
  },
  addressMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scoreCard: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  verdictLabel: {
    ...typography.label,
    color: colors.primary,
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  scoreDetailItem: {
    alignItems: 'center',
    gap: 4,
  },
  scoreDetailLabel: {
    ...typography.tag,
    color: colors.textLabel,
  },
  scoreDetailValue: {
    ...typography.financialLarge,
  },
  scoreDetailDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  verdictBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  verdictBadgeText: {
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  narrativeCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  narrativeTitle: {
    ...typography.h4,
    color: colors.textHeading,
  },
  narrativeText: {
    ...typography.bodySmall,
    color: colors.textBody,
    lineHeight: 22,
  },
  factorsCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  factorsTitle: {
    ...typography.label,
    color: colors.textLabel,
  },
  factorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  factorDot: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 14,
    color: colors.primary,
    width: 20,
    textAlign: 'center',
    marginTop: 2,
  },
  factorContent: {
    flex: 1,
  },
  factorLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  factorValue: {
    ...typography.bodySmall,
    color: colors.textBody,
  },
  ctaCard: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  ctaText: {
    ...typography.body,
    color: colors.textBody,
    textAlign: 'center',
  },
  ctaBtn: {
    width: '100%',
  },
  ctaLink: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
