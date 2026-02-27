import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUsage, type UsageState } from '@/hooks/useUsage';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

const STATE_COLORS: Record<UsageState, { fill: string; text: string; border: string }> = {
  normal: { fill: colors.accent, text: colors.accent, border: colors.borderAccent },
  warning: { fill: colors.gold, text: colors.gold, border: 'rgba(251, 191, 36, 0.3)' },
  critical: { fill: colors.red, text: colors.red, border: 'rgba(248, 113, 113, 0.3)' },
};

interface UsageBarProps {
  compact?: boolean;
}

export function UsageBar({ compact = false }: UsageBarProps) {
  const router = useRouter();
  const { searches, state, isPro, isLoading, daysUntilReset } = useUsage();

  if (isLoading || isPro) return null;

  const c = STATE_COLORS[state];

  if (compact) {
    return (
      <Pressable
        style={[styles.compactContainer, { borderColor: c.border }]}
        onPress={() => router.push('/(protected)/billing')}
      >
        <Text style={[styles.compactText, { color: c.text }]}>
          {searches.remaining}/{searches.limit} left
        </Text>
        <View style={styles.compactBar}>
          <View
            style={[
              styles.compactFill,
              { width: `${searches.progressPct}%`, backgroundColor: c.fill },
            ]}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.container, { borderColor: c.border }]}
      onPress={() => router.push('/(protected)/billing')}
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.label}>
            <Text style={[styles.count, { color: c.text }]}>
              {searches.remaining}
            </Text>
            {' '}of {searches.limit} analyses remaining
          </Text>
          {daysUntilReset != null && (
            <Text style={styles.reset}>
              Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {state === 'critical' ? (
          <View style={styles.upgradeChip}>
            <Text style={styles.upgradeChipText}>Upgrade</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={c.text} />
        )}
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            { width: `${searches.progressPct}%`, backgroundColor: c.fill },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: { flex: 1 },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  count: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
  },
  reset: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  upgradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  upgradeChipText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: colors.black,
  },

  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  compactText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  compactBar: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  compactFill: {
    height: 3,
    borderRadius: 1.5,
  },
});
