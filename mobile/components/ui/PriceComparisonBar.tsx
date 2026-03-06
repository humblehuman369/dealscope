import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface PriceComparisonBarProps {
  listPrice: number | null;
  incomeValue: number | null;
  wholesalePrice: number | null;
}

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}

export function PriceComparisonBar({
  listPrice,
  incomeValue,
  wholesalePrice,
}: PriceComparisonBarProps) {
  const prices = [listPrice, incomeValue, wholesalePrice].filter(
    (p): p is number => p != null && p > 0,
  );
  if (prices.length === 0) return null;

  const max = Math.max(...prices);
  const pct = (v: number | null) => (v != null && max > 0 ? (v / max) * 100 : 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PRICE COMPARISON</Text>

      {listPrice != null && listPrice > 0 && (
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>List Price</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.barList, { width: `${pct(listPrice)}%` }]} />
          </View>
          <Text style={styles.barValue}>{money(listPrice)}</Text>
        </View>
      )}

      {incomeValue != null && incomeValue > 0 && (
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Income Value</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, styles.barIncome, { width: `${pct(incomeValue)}%` }]}
            />
          </View>
          <Text style={[styles.barValue, { color: colors.incomeValue }]}>
            {money(incomeValue)}
          </Text>
        </View>
      )}

      {wholesalePrice != null && wholesalePrice > 0 && (
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Wholesale</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, styles.barWholesale, { width: `${pct(wholesalePrice)}%` }]}
            />
          </View>
          <Text style={[styles.barValue, { color: colors.wholesale }]}>
            {money(wholesalePrice)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  title: {
    fontFamily: fontFamilies.heading,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textSecondary,
    width: 85,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barList: { backgroundColor: colors.textSecondary },
  barIncome: { backgroundColor: colors.incomeValue },
  barWholesale: { backgroundColor: colors.wholesale },
  barValue: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textHeading,
    width: 75,
    textAlign: 'right',
  },
});
