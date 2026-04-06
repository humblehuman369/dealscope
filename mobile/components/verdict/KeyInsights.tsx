import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { fontFamilies, typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface KeyInsightsProps {
  isOffMarket: boolean;
  purchasePrice: number;
  marketPrice: number;
  dealGapDisplay: string;
}

function fmtShort(v: number): string {
  return '$' + Math.round(v).toLocaleString();
}

function InsightItem({
  num,
  title,
  detail,
}: {
  num: string;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.numCircle}>
        <Text style={styles.numText}>{num}</Text>
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{title}</Text>
        {detail ? (
          <Text style={styles.insightDetail}>{detail}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function KeyInsights({
  isOffMarket,
  purchasePrice,
  marketPrice,
  dealGapDisplay,
}: KeyInsightsProps) {
  const [expanded, setExpanded] = useState(false);

  const discountAmount = Math.max(0, marketPrice - purchasePrice);
  const dealGapPct =
    marketPrice > 0 && purchasePrice > 0
      ? ((marketPrice - purchasePrice) / marketPrice) * 100
      : 0;
  const probability = Math.max(
    5,
    Math.min(95, Math.round(95 - dealGapPct * 3)),
  );
  const probabilityTail =
    probability > 50
      ? 'This is well within reach.'
      : probability >= 20
        ? 'Achievable with the right approach.'
        : "You'll need leverage, timing, or a motivated seller.";

  return (
    <Card glow="none" style={styles.container}>
      <Text style={styles.heading}>KEY INSIGHTS</Text>

      <View style={styles.items}>
        <InsightItem
          num="1"
          title={
            isOffMarket
              ? 'Off-market \u2014 not listed for sale'
              : 'Actively listed \u2014 competing buyers'
          }
          detail={
            isOffMarket
              ? "You'd need to make an off-market offer. Confirm the owner's interest first."
              : 'Speed and terms matter when competing with other buyers.'
          }
        />
        <InsightItem
          num="2"
          title={`Target buy: ${fmtShort(purchasePrice)} (${dealGapDisplay} gap)`}
          detail={`A ${fmtShort(discountAmount)} discount below market value for positive cash flow.`}
        />
        <InsightItem
          num="3"
          title={`${probability}% of investors land this discount`}
          detail={probabilityTail}
        />

        {expanded && (
          <>
            <InsightItem
              num="4"
              title="Repairs not included in initial analysis"
              detail="Use DealMaker to add a rehab budget and see the impact on returns."
            />
            <InsightItem
              num="5"
              title="Assumes 20% down \u00B7 6.0% \u00B7 30yr"
              detail="Edit financing terms in DealMaker to match your actual loan scenario."
            />
          </>
        )}
      </View>

      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        hitSlop={8}
      >
        <Text style={styles.expandLink}>
          {expanded ? 'Show less' : 'Show all insights'}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    ...typography.label,
    color: colors.textHeading,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  items: {
    gap: 14,
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  numCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  insightContent: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHeading,
    lineHeight: 20,
  },
  insightDetail: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  expandLink: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
