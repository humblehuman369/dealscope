import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { getScoreColor, getScoreLabel } from '@/constants/theme';
import type { StrategyResult } from '@/hooks/useVerdict';

const STRATEGY_ORDER = ['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale'] as const;

const STRATEGY_META: Record<string, { icon: string; label: string; color: string }> = {
  ltr: { icon: '🏠', label: 'Long-Term Rental', color: colors.strategies.ltr.primary },
  str: { icon: '🏨', label: 'Short-Term Rental', color: colors.strategies.str.primary },
  brrrr: { icon: '🔄', label: 'BRRRR', color: colors.strategies.brrrr.primary },
  flip: { icon: '🔨', label: 'Fix & Flip', color: colors.strategies.flip.primary },
  house_hack: { icon: '🏡', label: 'House Hack', color: colors.strategies.houseHack.primary },
  wholesale: { icon: '📋', label: 'Wholesale', color: colors.strategies.wholesale.primary },
};

function fmtCurrency(v: number): string {
  if (v >= 0) return '$' + Math.round(v).toLocaleString();
  return '-$' + Math.round(Math.abs(v)).toLocaleString();
}

function fmtPct(v: number): string {
  return v.toFixed(1) + '%';
}

interface StrategyGridProps {
  strategies: Record<string, StrategyResult>;
  onSelect?: (strategyId: string) => void;
}

export function StrategyGrid({ strategies, onSelect }: StrategyGridProps) {
  const entries = STRATEGY_ORDER
    .filter((id) => strategies[id])
    .map((id) => ({ id, ...strategies[id], meta: STRATEGY_META[id] }));

  if (entries.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>STRATEGY RANKINGS</Text>
      <Text style={styles.sectionSubtitle}>
        How this deal performs across 6 investment strategies
      </Text>

      <View style={styles.grid}>
        {entries.map((s) => {
          const scoreColor = getScoreColor(s.deal_score);
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelect?.(s.id)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card glow="sm" style={styles.stratCard}>
                <View style={styles.stratHeader}>
                  <View style={styles.stratNameRow}>
                    <Text style={styles.stratIcon}>{s.meta?.icon}</Text>
                    <Text style={styles.stratName}>{s.meta?.label ?? s.strategy_name}</Text>
                  </View>
                  <View style={[styles.scorePill, { backgroundColor: scoreColor + '20' }]}>
                    <Text style={[styles.scoreText, { color: scoreColor }]}>
                      {Math.round(s.deal_score)}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Cash Flow</Text>
                    <Text style={[styles.metricValue, { color: s.monthly_cash_flow >= 0 ? colors.success : colors.error }]}>
                      {fmtCurrency(s.monthly_cash_flow)}/mo
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>CoC</Text>
                    <Text style={styles.metricValue}>{fmtPct(s.cash_on_cash)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Cap Rate</Text>
                    <Text style={styles.metricValue}>{fmtPct(s.cap_rate)}</Text>
                  </View>
                </View>

                <View style={styles.verdictRow}>
                  <Text style={[styles.verdict, { color: scoreColor }]}>
                    {s.verdict}
                  </Text>
                  <Text style={styles.seeMore}>See Details ›</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  stratCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  stratHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stratNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stratIcon: { fontSize: 18 },
  stratName: {
    ...typography.h4,
    color: colors.textHeading,
  },
  scorePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scoreText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 16,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    ...typography.tag,
    color: colors.textLabel,
  },
  metricValue: {
    ...typography.financial,
    color: colors.textHeading,
  },
  verdictRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  verdict: {
    ...typography.caption,
    fontWeight: '600',
  },
  seeMore: {
    ...typography.caption,
    color: colors.primary,
  },
});
