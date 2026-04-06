import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface DealGapTier {
  label: string;
  color: string;
  headline: string;
  subHeadline: string;
}

interface DealGapPanelProps {
  dealGapPercent: number;
  isListed: boolean;
  onContinueToStrategy: () => void;
}

function getDealGapTier(dealGapPercent: number, isListed: boolean): DealGapTier {
  const absGap = `${Math.abs(dealGapPercent).toFixed(1)}%`;
  const positivePriceLabel = isListed ? 'List Price' : 'Estimated Market Value';
  const negativePriceLabel = isListed ? 'List Price' : 'Estimated Value';

  const SUB_HEADLINE_POSITIVE =
    'A positive DealGap indicates the asking price is below supported market value, creating measurable investor opportunity.';
  const SUB_HEADLINE_NEUTRAL =
    'A neutral DealGap means price and value are in balance \u2014 the deal may still work, but advantage must come from execution, financing, or future upside.';
  const SUB_HEADLINE_NEGATIVE =
    'A negative DealGap indicates the asking price is above supported market value, where stronger negotiation or revised assumptions may be required.';

  if (dealGapPercent < -10)
    return { label: 'Positive Gap', color: '#22c55e', headline: `The INCOME VALUE is +${absGap} above ${positivePriceLabel}.`, subHeadline: SUB_HEADLINE_POSITIVE };
  if (dealGapPercent < 0)
    return { label: 'Minimal Positive Gap', color: '#b7cc3a', headline: `The INCOME VALUE is +${absGap} above ${positivePriceLabel}.`, subHeadline: SUB_HEADLINE_POSITIVE };
  if (dealGapPercent <= 0)
    return { label: 'No Gap', color: colors.success, headline: `The TARGET BUY works at ${negativePriceLabel}.`, subHeadline: SUB_HEADLINE_NEUTRAL };
  if (dealGapPercent <= 5)
    return { label: 'Minimal Negative Gap', color: '#b7cc3a', headline: `The TARGET BUY is ${absGap} below ${negativePriceLabel}.`, subHeadline: SUB_HEADLINE_NEGATIVE };
  if (dealGapPercent <= 10)
    return { label: 'Mild Negative Gap', color: '#c7c95b', headline: `The TARGET BUY is ${absGap} below ${negativePriceLabel}.`, subHeadline: SUB_HEADLINE_NEGATIVE };
  if (dealGapPercent <= 20)
    return { label: 'Moderate Negative Gap', color: '#d9a657', headline: `The TARGET BUY is ${absGap} below ${negativePriceLabel}.`, subHeadline: SUB_HEADLINE_NEGATIVE };
  if (dealGapPercent <= 30)
    return { label: 'Wide Negative Gap', color: '#e48657', headline: `The TARGET BUY is ${absGap} below ${negativePriceLabel}.`, subHeadline: SUB_HEADLINE_NEGATIVE };
  return { label: 'Extreme Negative Gap', color: colors.error, headline: `The TARGET BUY is ${absGap} below ${negativePriceLabel}.`, subHeadline: SUB_HEADLINE_NEGATIVE };
}

export function DealGapPanel({
  dealGapPercent,
  isListed,
  onContinueToStrategy,
}: DealGapPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const effectiveDisplayPct = -dealGapPercent;
  const dealGapDisplay = `${effectiveDisplayPct >= 0 ? '+' : ''}${effectiveDisplayPct.toFixed(1)}%`;
  const tier = getDealGapTier(dealGapPercent, isListed);

  return (
    <View style={styles.container}>
      <View style={styles.headlineRow}>
        <View style={styles.brandRow}>
          <Text style={styles.brandThe}>The</Text>
          <Text style={styles.brandName}> DealGap</Text>
          <Text style={styles.brandPct}> {dealGapDisplay}</Text>
        </View>
        <View style={[styles.tierBadge, { borderColor: tier.color }]}>
          <Text style={[styles.tierLabel, { color: tier.color }]}>
            {tier.label}
          </Text>
        </View>
      </View>

      <Text style={styles.headline}>{tier.headline}</Text>

      <Text style={styles.guidance}>
        {effectiveDisplayPct > 0
          ? 'Your Target Buy is below the asking price \u2014 this deal cash flows at current terms. Confirm your numbers in Strategy before you move.'
          : 'The Market Price is higher than Income Value needed for positive cash flow. Use Strategy and DealMaker to find the terms that close the gap.'}
      </Text>

      <Pressable
        onPress={() => setShowDetails((prev) => !prev)}
        hitSlop={8}
      >
        <Text style={styles.detailsLink}>
          {showDetails ? 'Hide details' : 'How this was calculated'}
        </Text>
      </Pressable>

      {showDetails && (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailsText}>{tier.subHeadline}</Text>
        </View>
      )}

      <Pressable onPress={onContinueToStrategy} style={styles.ctaButton}>
        <Text style={styles.ctaText}>Continue to Strategy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandThe: {
    fontFamily: fontFamilies.body,
    fontSize: 26,
    fontWeight: '600',
    color: colors.primary,
  },
  brandName: {
    fontFamily: fontFamilies.body,
    fontSize: 26,
    fontWeight: '600',
    color: colors.textHeading,
  },
  brandPct: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  tierBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
  },
  tierLabel: {
    fontFamily: fontFamilies.heading,
    fontSize: 12,
    fontWeight: '700',
  },
  headline: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: colors.textBody,
    lineHeight: 20,
  },
  guidance: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  detailsLink: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  detailsPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  detailsText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fontFamilies.heading,
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});
