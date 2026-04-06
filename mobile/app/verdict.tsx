/**
 * Mobile Verdict Page — mirrors web frontend/src/app/verdict/page.tsx
 *
 * Section order is defined by VERDICT_SECTIONS in @dealscope/shared.
 * Do NOT add ScoreGauge, deal_score display, or strategy grids here —
 * those belong on the Strategy and DealMaker pages.
 *
 * See: .cursor/rules/mobile-web-parity.mdc
 */
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { InvestmentOverview } from '@/components/verdict/InvestmentOverview';
import { PriceScaleBar } from '@/components/verdict/PriceScaleBar';
import { DealGapPanel } from '@/components/verdict/DealGapPanel';
import { KeyInsights } from '@/components/verdict/KeyInsights';
import { useVerdict } from '@/hooks/useVerdict';
import { usePropertyData } from '@/hooks/usePropertyData';
import { errorToUserMessage } from '@/utils/errorMessages';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

function fmtShort(v: number): string {
  return '$' + Math.round(v).toLocaleString();
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading verdict...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !analysis) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Analysis Unavailable</Text>
          <Text style={styles.errorSubtitle}>
            {errorToUserMessage(error, 'Unable to analyze this property. Please try again.')}
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

  // Derived values — same logic as web verdict/page.tsx
  const purchasePrice = analysis.purchase_price ?? Math.round((property?.listing?.list_price ?? 0) * 0.95);
  const incomeValue = analysis.income_value ?? property?.listing?.list_price ?? 0;
  const marketPrice = property?.listing?.list_price
    ?? property?.valuations?.value_iq_estimate
    ?? property?.valuations?.zestimate
    ?? property?.valuations?.market_price
    ?? analysis.list_price
    ?? 0;
  const dealGapPercent = analysis.deal_gap_percent ?? 0;

  const isListed = property?.listing?.listing_status
    ? ['FOR_SALE', 'PENDING', 'FOR_RENT'].includes(property.listing.listing_status)
    : true;
  const isOffMarket = !isListed;

  const effectiveDisplayPct = -dealGapPercent;
  const dealGapDisplay = `${effectiveDisplayPct >= 0 ? '+' : ''}${effectiveDisplayPct.toFixed(1)}%`;

  const dealGapPct = dealGapPercent;
  const ctaTagline = dealGapPct <= 10
    ? 'This deal passed the screen'
    : dealGapPct <= 20
      ? 'This deal needs a closer look'
      : `The numbers don't work at ${isListed ? 'asking price' : 'this estimate'}`;
  const ctaHeadline = dealGapPct <= 10
    ? 'Now Prove It.'
    : dealGapPct <= 20
      ? 'Find the Angle.'
      : 'See What Would Work.';
  const ctaBody = dealGapPct <= 10
    ? "Get a full financial breakdown across 6 investment strategies \u2014 what you'd pay, what you'd earn, and whether the numbers actually work."
    : dealGapPct <= 20
      ? 'The Deal Gap is larger than a typical negotiated discount, but the right strategy and terms could make it work.'
      : 'See how far the numbers are off \u2014 and what would fix them. Strategy walks through each scenario.';

  const navigateToStrategy = () => {
    router.push({ pathname: '/strategy', params: { address } });
  };

  const navigateToDealMaker = () => {
    router.push({ pathname: '/deal-maker', params: { address } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>IQ Verdict</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* 1. Photo (property image) */}
        {property?.listing?.image_url ? (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: property.listing.image_url }}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Main verdict card — matches web's single-card container */}
        <Card glow="lg" style={styles.mainCard}>
          {/* Property address (inside card, like web) */}
          {property && (
            <View style={styles.addressBlock}>
              <Text style={styles.addressText} numberOfLines={2}>
                {property.address?.full_address ?? address}
              </Text>
              {property.details && (
                <Text style={styles.addressMeta}>
                  {[
                    property.details.bedrooms && `${property.details.bedrooms} bd`,
                    property.details.bathrooms && `${property.details.bathrooms} ba`,
                    property.details.square_footage && `${property.details.square_footage.toLocaleString()} sqft`,
                    marketPrice > 0 && fmtShort(marketPrice),
                  ]
                    .filter(Boolean)
                    .join(' \u00B7 ')}
                </Text>
              )}
            </View>
          )}

          {/* 2. Investment Overview */}
          <InvestmentOverview
            purchasePrice={purchasePrice}
            incomeValue={incomeValue}
            marketPrice={marketPrice}
          />

          {/* 3. Price Scale Bar */}
          <PriceScaleBar
            purchasePrice={purchasePrice}
            incomeValue={incomeValue}
            marketPrice={marketPrice}
            dealGapPercent={dealGapPercent}
          />

          {/* 4. Market Anchor Note */}
          <Text style={styles.marketNote}>
            {isOffMarket
              ? 'Off-market: Market Price is the estimated value based on comparable sales and automated valuations.'
              : 'Market Price reflects the current list price. Rent or value look off? Use Change Terms for full control.'}
          </Text>
        </Card>

        {/* 6. Deal Gap Explanation */}
        <DealGapPanel
          dealGapPercent={dealGapPercent}
          isListed={isListed}
          onContinueToStrategy={navigateToStrategy}
        />

        {/* 7. Key Insights */}
        <KeyInsights
          isOffMarket={isOffMarket}
          purchasePrice={purchasePrice}
          marketPrice={marketPrice}
          dealGapDisplay={dealGapDisplay}
        />

        {/* 8. Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable onPress={navigateToDealMaker} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Change Terms</Text>
          </Pressable>
        </View>

        {/* Decorative divider */}
        <View style={styles.divider} />

        {/* 9. CTA — "Show Me the Numbers" */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTagline}>{ctaTagline}</Text>
          <Text style={styles.ctaHeadline}>{ctaHeadline}</Text>
          <Text style={styles.ctaBody}>{ctaBody}</Text>

          <Pressable onPress={navigateToStrategy} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Show Me the Numbers</Text>
          </Pressable>

          <View style={styles.trustChecks}>
            {['Try it Free', 'No signup needed', '60 seconds'].map((label) => (
              <View key={label} style={styles.trustItem}>
                <Text style={styles.checkmark}>{'\u2713'}</Text>
                <Text style={styles.trustLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 10. Trust Strip */}
        <View style={styles.trustStrip}>
          <Text style={styles.trustText}>
            DealGap IQ analyzes{' '}
            <Text style={styles.trustAccent}>rental income, expenses, market conditions</Text>
            {' '}and{' '}
            <Text style={styles.trustAccent}>comparable sales</Text>
            {' '}to calculate every Deal Gap. No guesswork {'\u2014'} just data.
          </Text>
        </View>
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
  centered: {
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
  photoContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  photo: {
    width: '100%',
    height: 200,
  },
  mainCard: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  addressBlock: {
    gap: 4,
  },
  addressText: {
    ...typography.h4,
    color: colors.textHeading,
  },
  addressMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  marketNote: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: fontFamilies.heading,
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  ctaSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  ctaTagline: {
    ...typography.label,
    color: colors.primary,
  },
  ctaHeadline: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
  },
  ctaBody: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: spacing.sm,
  },
  ctaButtonText: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  trustChecks: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkmark: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  trustLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textBody,
  },
  trustStrip: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  trustText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 18,
  },
  trustAccent: {
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: '600',
    color: colors.primary,
  },
});
