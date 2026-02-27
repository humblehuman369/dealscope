import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlowCard } from '@/components/ui/GlowCard';
import { STRATEGIES } from '@/components/strategy/StrategyPills';
import type { StrategyGrade } from '@/hooks/useVerdictData';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';
import type { StrategyId } from '@dealscope/shared';

type IoniconsName = keyof typeof Ionicons.glyphMap;

function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return colors.green;
  if (grade === 'B') return colors.accent;
  if (grade === 'C') return colors.gold;
  if (grade === 'D') return colors.orange;
  return colors.red;
}

function scoreToBgOpacity(score: number): number {
  return Math.max(0.04, Math.min(0.15, score / 700));
}

interface MultiStrategyComparisonProps {
  grades: StrategyGrade[];
  onSelectStrategy: (id: StrategyId) => void;
}

export function MultiStrategyComparison({
  grades,
  onSelectStrategy,
}: MultiStrategyComparisonProps) {
  // Sort by score descending to find best
  const sorted = [...grades].sort((a, b) => b.score - a.score);
  const bestId = sorted[0]?.strategy;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Multi-Strategy Analysis</Text>
        </View>
        <Text style={styles.title}>Strategy Comparison</Text>
        <Text style={styles.subtitle}>
          All 6 strategies ranked by performance for this property
        </Text>
      </View>

      {sorted.map((grade, i) => {
        const def = STRATEGIES.find(
          (s) => s.id === grade.strategy || s.name === grade.strategy,
        );
        if (!def) return null;
        const isBest = grade.strategy === bestId;
        const clr = def.color;
        const gClr = gradeColor(grade.grade);

        return (
          <Pressable
            key={grade.strategy}
            style={[
              styles.row,
              isBest && { borderColor: `${clr}55` },
            ]}
            onPress={() => onSelectStrategy(def.id)}
          >
            {/* Rank */}
            <View style={[styles.rank, { backgroundColor: `${clr}20` }]}>
              <Text style={[styles.rankText, { color: clr }]}>
                {i + 1}
              </Text>
            </View>

            {/* Strategy info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Ionicons name={def.icon} size={16} color={clr} />
                <Text style={[styles.name, { color: clr }]}>
                  {def.name}
                </Text>
                {isBest && (
                  <View style={styles.bestBadge}>
                    <Ionicons name="trophy" size={10} color={colors.gold} />
                    <Text style={styles.bestText}>Best</Text>
                  </View>
                )}
              </View>
              <Text style={styles.metric}>
                {grade.key_metric_label}: {grade.key_metric_value}
              </Text>
            </View>

            {/* Grade */}
            <View style={[styles.gradePill, { backgroundColor: `${gClr}20` }]}>
              <Text style={[styles.gradeText, { color: gClr }]}>
                {grade.grade}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  bestText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.gold,
  },
  metric: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  gradePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  gradeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
  },
});
