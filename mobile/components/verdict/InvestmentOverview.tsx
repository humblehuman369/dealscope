import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface InvestmentOverviewProps {
  purchasePrice: number;
  incomeValue: number;
  marketPrice: number;
}

function fmtShort(v: number): string {
  return '$' + Math.round(v).toLocaleString();
}

const CARDS = [
  {
    key: 'targetBuy',
    title: 'TARGET BUY',
    subtitle: 'Profit Zone',
    color: colors.primary,
    field: 'purchasePrice' as const,
  },
  {
    key: 'incomeValue',
    title: 'INCOME VALUE',
    subtitle: 'Break-Even',
    color: colors.gold,
    field: 'incomeValue' as const,
  },
  {
    key: 'marketPrice',
    title: 'MARKET PRICE',
    subtitle: 'Market Reality',
    color: colors.error,
    field: 'marketPrice' as const,
  },
] as const;

export function InvestmentOverview({
  purchasePrice,
  incomeValue,
  marketPrice,
}: InvestmentOverviewProps) {
  const values = { purchasePrice, incomeValue, marketPrice };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Investment Overview</Text>
      <View style={styles.grid}>
        {CARDS.map((card) => (
          <View
            key={card.key}
            style={[styles.card, { borderColor: card.color }]}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={[styles.cardValue, { color: card.color }]}>
              {fmtShort(values[card.field])}
            </Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  heading: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textHeading,
  },
  grid: {
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.tag,
    color: colors.textHeading,
    marginBottom: 4,
  },
  cardValue: {
    ...typography.financialLarge,
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
