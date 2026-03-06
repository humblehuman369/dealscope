import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface PriceCardsProps {
  incomeValue: number | null;
  targetBuy: number | null;
  wholesalePrice: number | null;
  listPrice: number | null;
  dealGapPercent: number | null;
}

function fmt(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return '$' + Math.round(value).toLocaleString();
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return value.toFixed(1) + '%';
}

function PriceCard({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  color: string;
  sublabel?: string;
}) {
  return (
    <Card glow="sm" style={styles.priceCard}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, { color }]}>{value}</Text>
      {sublabel && <Text style={styles.priceSublabel}>{sublabel}</Text>}
    </Card>
  );
}

export function PriceCards({
  incomeValue,
  targetBuy,
  wholesalePrice,
  listPrice,
  dealGapPercent,
}: PriceCardsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>WHAT SHOULD YOU PAY?</Text>
      <Text style={styles.sectionSubtitle}>Three ways to approach this deal</Text>

      <View style={styles.grid}>
        <PriceCard
          label="Income Value"
          value={fmt(incomeValue)}
          color={colors.gold}
          sublabel="Max price where cash flow = $0"
        />
        <PriceCard
          label="Target Buy"
          value={fmt(targetBuy)}
          color={colors.success}
          sublabel="Recommended purchase price"
        />
        <PriceCard
          label="Wholesale"
          value={fmt(wholesalePrice)}
          color="#C4B5FD"
          sublabel="Quick assignment opportunity"
        />
      </View>

      <Card glow="sm" style={styles.scaleCard}>
        <View style={styles.scaleRow}>
          <View style={styles.scaleItem}>
            <Text style={styles.scaleLabel}>Target Buy</Text>
            <Text style={[styles.scaleValue, { color: colors.success }]}>{fmt(targetBuy)}</Text>
          </View>
          <View style={styles.scaleDivider} />
          <View style={styles.scaleItem}>
            <Text style={styles.scaleLabel}>Income Value</Text>
            <Text style={[styles.scaleValue, { color: colors.gold }]}>{fmt(incomeValue)}</Text>
          </View>
          <View style={styles.scaleDivider} />
          <View style={styles.scaleItem}>
            <Text style={styles.scaleLabel}>Market / Asking</Text>
            <Text style={[styles.scaleValue, { color: colors.error }]}>{fmt(listPrice)}</Text>
          </View>
        </View>
        {dealGapPercent != null && (
          <View style={styles.dealGapRow}>
            <Text style={styles.dealGapLabel}>Deal Gap</Text>
            <Text style={[styles.dealGapValue, { color: dealGapPercent > 0 ? colors.success : colors.error }]}>
              {fmtPct(dealGapPercent)}
            </Text>
          </View>
        )}
      </Card>

      <Text style={styles.footnote}>
        Based on 20% down · 6.0% rate · 30-year term at the Target Buy price
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textLabel,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  grid: {
    gap: spacing.sm,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  priceValue: {
    ...typography.financialLarge,
  },
  priceSublabel: {
    display: 'none',
  },
  scaleCard: {
    padding: spacing.md,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scaleItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scaleLabel: {
    ...typography.tag,
    color: colors.textLabel,
  },
  scaleValue: {
    ...typography.financial,
    fontWeight: '700',
  },
  scaleDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  dealGapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dealGapLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dealGapValue: {
    ...typography.financialLarge,
    fontWeight: '700',
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
