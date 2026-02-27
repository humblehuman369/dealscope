import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type DealZone = 'Loss Zone' | 'High Risk' | 'Negotiate' | 'Profit Zone' | 'Deep Value';

function getDealZone(gapPct: number): { zone: DealZone; color: string } {
  if (gapPct < 0) return { zone: 'Loss Zone', color: colors.red };
  if (gapPct < 2) return { zone: 'High Risk', color: colors.orange };
  if (gapPct < 5) return { zone: 'Negotiate', color: colors.gold };
  if (gapPct < 12) return { zone: 'Profit Zone', color: colors.green };
  return { zone: 'Deep Value', color: colors.accentLight };
}

function markerPosition(gapPct: number): number {
  // Map deal gap % to bar position (0-100%)
  // -10% -> 10%, 0% -> 25%, 5% -> 50%, 12% -> 75%, 20% -> 90%
  const clamped = Math.max(-15, Math.min(25, gapPct));
  return Math.max(5, Math.min(95, ((clamped + 15) / 40) * 100));
}

interface DealGapBarProps {
  dealGapPercent: number;
  listPrice: number | null;
  targetBuy: number | null;
}

export function DealGapBar({ dealGapPercent, listPrice, targetBuy }: DealGapBarProps) {
  const { zone, color } = getDealZone(dealGapPercent);
  const pos = markerPosition(dealGapPercent);

  return (
    <GlowCard style={styles.container} glowColor={color}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Deal Gap</Text>
        <View style={[styles.zoneBadge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
          <Text style={[styles.zoneText, { color }]}>{zone}</Text>
        </View>
      </View>

      {/* Gap value */}
      <Text style={[styles.gapValue, { color }]}>
        {dealGapPercent >= 0 ? '-' : '+'}
        {Math.abs(dealGapPercent).toFixed(1)}%
      </Text>
      <Text style={styles.gapSub}>
        discount from list to target buy
      </Text>

      {/* Gradient bar */}
      <View style={styles.barContainer}>
        <LinearGradient
          colors={['#EF4444', '#F59E0B', '#FDD835', '#22C55E', '#38BDF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBar}
        />
        {/* Marker */}
        <View style={[styles.marker, { left: `${pos}%` }]}>
          <View style={[styles.markerDot, { backgroundColor: color, borderColor: colors.white }]} />
        </View>
      </View>

      {/* Zone labels */}
      <View style={styles.zoneLabels}>
        <Text style={[styles.zoneLabel, { color: colors.red }]}>Loss</Text>
        <Text style={[styles.zoneLabel, { color: colors.gold }]}>Negotiate</Text>
        <Text style={[styles.zoneLabel, { color: colors.green }]}>Profit</Text>
        <Text style={[styles.zoneLabel, { color: colors.accentLight }]}>Deep Value</Text>
      </View>

      {/* Price comparison */}
      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>List Price</Text>
          <Text style={styles.priceValue}>{formatCurrency(listPrice)}</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>Target Buy</Text>
          <Text style={[styles.priceValue, { color: colors.accent }]}>
            {formatCurrency(targetBuy)}
          </Text>
        </View>
      </View>
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.heading,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  zoneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  zoneText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  gapValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginBottom: 2,
  },
  gapSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  barContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'visible',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  gradientBar: {
    height: 12,
    borderRadius: 6,
  },
  marker: {
    position: 'absolute',
    top: -4,
    marginLeft: -10,
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
  zoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  zoneLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  priceCol: {
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    fontVariant: ['tabular-nums'],
  },
  arrow: {
    paddingHorizontal: spacing.xs,
  },
  arrowText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.muted,
  },
});
