import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { getScoreColor } from '@/constants/theme';

const STRATEGIES = [
  { id: 'ltr', label: 'Long-Term Rental', icon: '🏠' },
  { id: 'str', label: 'Short-Term Rental', icon: '🏨' },
  { id: 'brrrr', label: 'BRRRR', icon: '🔄' },
  { id: 'flip', label: 'Fix & Flip', icon: '🔨' },
  { id: 'house_hack', label: 'House Hack', icon: '🏡' },
  { id: 'wholesale', label: 'Wholesale', icon: '📋' },
] as const;

interface StrategySelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  scores?: Record<string, number>;
}

export function StrategySelector({ selectedId, onSelect, scores }: StrategySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {STRATEGIES.map((s) => {
        const active = s.id === selectedId;
        const score = scores?.[s.id];
        return (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s.id)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={styles.icon}>{s.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>
              {s.label}
            </Text>
            {score != null && (
              <View style={[styles.scoreDot, { backgroundColor: getScoreColor(score) }]}>
                <Text style={styles.scoreText}>{Math.round(score)}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.panel,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  icon: { fontSize: 14 },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
  },
  scoreDot: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  scoreText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
});
