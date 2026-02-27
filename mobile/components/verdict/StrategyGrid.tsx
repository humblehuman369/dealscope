import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StrategyDef {
  id: string;
  number: number;
  name: string;
  tagline: string;
  defaultStat: string;
  defaultLabel: string;
  color: string;
  icon: IoniconsName;
}

const STRATEGIES: StrategyDef[] = [
  {
    id: 'ltr',
    number: 1,
    name: 'Long-Term Rental',
    tagline: 'Steady income & build equity',
    defaultStat: '8-12%',
    defaultLabel: 'Cash-on-Cash',
    color: '#0465F2',
    icon: 'home-outline',
  },
  {
    id: 'str',
    number: 2,
    name: 'Short-Term Rental',
    tagline: 'Vacation & business rental income',
    defaultStat: '15-25%',
    defaultLabel: 'Cash-on-Cash',
    color: '#8B5CF6',
    icon: 'sunny-outline',
  },
  {
    id: 'brrrr',
    number: 3,
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    defaultStat: '∞',
    defaultLabel: 'Scale',
    color: '#F97316',
    icon: 'refresh-outline',
  },
  {
    id: 'flip',
    number: 4,
    name: 'Fix & Flip',
    tagline: 'Buy low, fix up, sell high',
    defaultStat: '$50K+',
    defaultLabel: 'Profit',
    color: '#EC4899',
    icon: 'hammer-outline',
  },
  {
    id: 'house_hack',
    number: 5,
    name: 'House Hack',
    tagline: 'Cut housing costs up to 100%',
    defaultStat: '75%',
    defaultLabel: 'Cost Savings',
    color: '#0EA5E9',
    icon: 'people-outline',
  },
  {
    id: 'wholesale',
    number: 6,
    name: 'Wholesale',
    tagline: 'Find deals, assign contracts',
    defaultStat: '$10K+',
    defaultLabel: 'Per Deal',
    color: '#84CC16',
    icon: 'document-text-outline',
  },
];

interface StrategyGradeData {
  strategy: string;
  grade: string;
  score: number;
  key_metric_label: string;
  key_metric_value: string;
  viable: boolean;
}

interface StrategyGridProps {
  grades?: StrategyGradeData[];
  activeStrategy?: string | null;
  onSelectStrategy: (id: string) => void;
}

export function StrategyGrid({
  grades,
  activeStrategy,
  onSelectStrategy,
}: StrategyGridProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>6 Strategies Analyzed</Text>
        </View>
        <Text style={styles.title}>One Property, Multiple Opportunities</Text>
        <Text style={styles.subtitle}>
          Each strategy shows a different way to profit from this deal.
        </Text>
      </View>

      <View style={styles.grid}>
        {STRATEGIES.map((s) => {
          const grade = grades?.find(
            (g) => g.strategy === s.id || g.strategy === s.name,
          );
          const isActive = activeStrategy === s.id;
          const stat = grade?.key_metric_value ?? s.defaultStat;
          const statLabel = grade?.key_metric_label ?? s.defaultLabel;

          return (
            <Pressable
              key={s.id}
              style={[
                styles.card,
                { borderColor: isActive ? `${s.color}66` : colors.border },
                isActive && { backgroundColor: `${s.color}08` },
              ]}
              onPress={() => onSelectStrategy(s.id)}
            >
              {/* Number badge */}
              <View style={[styles.numberBadge, { backgroundColor: `${s.color}20` }]}>
                <Text style={[styles.numberText, { color: s.color }]}>
                  {s.number}
                </Text>
              </View>

              {/* Stat */}
              <Text style={[styles.statValue, { color: s.color }]}>{stat}</Text>
              <Text style={styles.statLabel}>{statLabel}</Text>

              {/* Name + icon */}
              <View style={styles.nameRow}>
                <Text style={[styles.strategyName, { color: s.color }]} numberOfLines={1}>
                  {s.name}
                </Text>
                <View style={[styles.iconCircle, { backgroundColor: `${s.color}20` }]}>
                  <Ionicons name={s.icon} size={14} color={s.color} />
                </View>
              </View>

              <Text style={styles.tagline} numberOfLines={1}>{s.tagline}</Text>

              {/* Grade badge */}
              {grade && (
                <View style={[styles.gradeBadge, { backgroundColor: `${s.color}15` }]}>
                  <Text style={[styles.gradeText, { color: s.color }]}>
                    {grade.grade}
                  </Text>
                </View>
              )}

              {/* Accent bar */}
              <View style={[styles.accentBar, { backgroundColor: s.color }]} />
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
  header: {
    alignItems: 'center',
    gap: spacing.xs,
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
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm + 2,
    gap: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  numberBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  strategyName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    flex: 1,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
  },
  gradeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 2,
  },
  gradeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
