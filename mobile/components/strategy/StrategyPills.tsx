import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';
import type { StrategyId } from '@dealscope/shared';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StrategyDef {
  id: StrategyId;
  name: string;
  shortName: string;
  color: string;
  icon: IoniconsName;
}

export const STRATEGIES: StrategyDef[] = [
  { id: 'ltr', name: 'Long-Term Rental', shortName: 'Long Rental', color: '#0465F2', icon: 'home-outline' },
  { id: 'str', name: 'Short-Term Rental', shortName: 'Short Rental', color: '#8B5CF6', icon: 'sunny-outline' },
  { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', color: '#F97316', icon: 'refresh-outline' },
  { id: 'flip', name: 'Fix & Flip', shortName: 'Fix & Flip', color: '#EC4899', icon: 'hammer-outline' },
  { id: 'house_hack', name: 'House Hack', shortName: 'House Hack', color: '#0EA5E9', icon: 'people-outline' },
  { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale', color: '#84CC16', icon: 'document-text-outline' },
];

interface StrategyPillsProps {
  active: StrategyId;
  onChange: (id: StrategyId) => void;
  grades?: Record<string, string>;
}

export function StrategyPills({ active, onChange, grades }: StrategyPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {STRATEGIES.map((s) => {
        const isActive = active === s.id;
        const grade = grades?.[s.id];
        return (
          <Pressable
            key={s.id}
            style={[
              styles.pill,
              isActive && { backgroundColor: `${s.color}18`, borderColor: `${s.color}50` },
            ]}
            onPress={() => onChange(s.id)}
          >
            <Ionicons
              name={s.icon}
              size={16}
              color={isActive ? s.color : colors.muted}
            />
            <Text
              style={[
                styles.pillText,
                isActive && { color: s.color, fontFamily: fontFamily.semiBold },
              ]}
            >
              {s.shortName}
            </Text>
            {grade && (
              <View style={[styles.gradeBadge, { backgroundColor: `${s.color}25` }]}>
                <Text style={[styles.gradeText, { color: s.color }]}>{grade}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function getStrategyDef(id: StrategyId): StrategyDef {
  return STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  gradeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gradeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
  },
});
