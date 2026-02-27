import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

interface PriceCardProps {
  label: string;
  value: number | null;
  description: string;
  isRecommended?: boolean;
}

function PriceCard({ label, value, description, isRecommended }: PriceCardProps) {
  return (
    <View
      style={[
        styles.card,
        isRecommended && styles.cardRecommended,
      ]}
    >
      <Text
        style={[
          styles.cardLabel,
          isRecommended && { color: colors.accent },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.cardValue,
          isRecommended && { color: colors.accent },
        ]}
      >
        {formatCurrency(value)}
      </Text>
      <Text style={styles.cardDesc}>{description}</Text>
      {isRecommended && (
        <View style={styles.recommendedBadge}>
          <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}
    </View>
  );
}

interface PriceCardsProps {
  incomeValue: number | null;
  targetBuy: number | null;
  wholesalePrice: number | null;
}

export function PriceCards({ incomeValue, targetBuy, wholesalePrice }: PriceCardsProps) {
  return (
    <GlowCard style={styles.container}>
      <Text style={styles.sectionLabel}>Your Investment Analysis</Text>
      <Text style={styles.sectionSub}>Three ways to approach this deal</Text>

      <View style={styles.cardsRow}>
        <PriceCard
          label="Income Value"
          value={incomeValue}
          description="Max price for $0 cashflow"
        />
        <PriceCard
          label="Target Buy"
          value={targetBuy}
          description="Max for positive cashflow"
          isRecommended
        />
        <PriceCard
          label="Wholesale"
          value={wholesalePrice}
          description="30% discount for assignment"
        />
      </View>
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.heading,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  sectionSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRecommended: {
    borderColor: colors.borderAccent,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
  },
  cardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 12,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  recommendedText: {
    fontFamily: fontFamily.medium,
    fontSize: 9,
    color: colors.accent,
  },
});
